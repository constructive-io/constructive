// Provision a database through the api endpoint's requestDatabase mutation —
// the pool-aware entry point. The mutation returns a ticket (a
// database_provision_module row) immediately: a warm-pool claim arrives
// 'completed' with the deferred owner bootstrap still pending; a cold request
// arrives 'pending' and is fulfilled asynchronously by the backend's jobs
// worker. The ticket is polled on the MODULES endpoint (the api endpoint has
// no ticket query) until BOTH status and bootstrapStatus are 'completed': pi
// hands credentials to the agent as soon as this resolves, and until owner
// bootstrap completes the new database has zero users, so its per-DB API
// would reject the owner token under RLS. requestDatabase owns the database
// to the JWT user — there is no owner input. The generated ORM's default
// adapter is plain fetch, so the SDK's FetchAdapter is injected to keep the
// routing of per-database subdomains working in Node.

import { api, modules } from '@constructive-io/sdk';

import { answersSignedOut, type GraphQLError, statusOf, thrownText } from '../graphql-http';
import type { ProvisionModule } from './presets';

/**
 * Exactly one of presetSlug or modules — requestDatabase rejects both/neither
 * (REQUEST_DATABASE_INVALID_INPUT). `selectProvisionRequest` (preset-match.ts)
 * builds this from the resolved module set.
 */
export type ProvisionRequest = { presetSlug: string } | { modules: ProvisionModule[] };

export type ProvisionTicket = {
  id?: string | null;
  status?: string | null;
  bootstrapStatus?: string | null;
  databaseId?: string | null;
  errorMessage?: string | null;
  bootstrapError?: string | null;
  databaseName?: string | null;
  createdAt?: string | null;
};

/**
 * Request, poll and lookup seam, injectable for tests. The default executor
 * drives the SDK clients.
 */
export type ProvisionRequestExecutor = {
  request(input: {
    databaseName: string;
    subdomain: string;
    domain: string;
    request: ProvisionRequest;
  }): Promise<ProvisionTicket>;
  poll(ticketId: string): Promise<ProvisionTicket | null>;
  /** The account's newest tickets for a database name, newest first. */
  listOwn(filter: { databaseName: string; ownerId: string }): Promise<ProvisionTicket[]>;
};

export const POLL_INTERVAL_MS = 2_000;
/** Stays under airpage's 5-minute per-tool timeout. */
export const POLL_DEADLINE_MS = 240_000;
/**
 * Consecutive unreadable polls tolerated before giving up. Provisioning keeps
 * running server-side, so a dropped request or a momentary 502 must not abort
 * a creation that is about to succeed.
 */
export const MAX_CONSECUTIVE_POLL_FAILURES = 3;

/**
 * The provision is still running server-side, but this call stopped waiting:
 * the deadline passed, or the backend couldn't be reached. A caller should keep
 * `ticketId` and pass it back as `resumeTicketId`, because requesting the same
 * name again starts a second provision rather than resuming this one.
 */
export class ProvisionPendingError extends Error {
  constructor(
    message: string,
    readonly ticketId: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'ProvisionPendingError';
  }
}

/**
 * The recorded ticket can't be read back: it is gone, or this account can't
 * see it. Nothing says the provision stopped, so a caller must not request
 * the same database again on this alone.
 */
/** A ticket read the backend refused because the sign-in has ended: the provision may still be running. */
export class ProvisionSignedOutError extends Error {
  constructor(
    message: string,
    readonly ticketId: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'ProvisionSignedOutError';
  }
}

export class ProvisionTicketLostError extends Error {
  constructor(
    message: string,
    readonly ticketId: string,
  ) {
    super(message);
    this.name = 'ProvisionTicketLostError';
  }
}

/**
 * The provision ticket failed. `ticketError` is the text the backend's job
 * stored on the ticket, a column rather than a GraphQL error, so it carries no
 * extensions: a refusal the job raised reads as its code ("[run]
 * BILLING_PLAN_REQUIRED", or "LIMIT_REACHED"), anything else as the job's own
 * text, which is for decisions only. The message names the ticket instead,
 * which the backend operator can look up.
 */
export class ProvisionJobError extends Error {
  constructor(
    readonly ticketError: string,
    step: 'provisioning' | 'owner bootstrap',
    ticketId: string,
  ) {
    super(`the backend's ${step} job failed (ticket ${ticketId})`);
    this.name = 'ProvisionJobError';
  }
}

const TICKET_SELECT = {
  id: true,
  status: true,
  bootstrapStatus: true,
  databaseId: true,
  errorMessage: true,
  bootstrapError: true,
} as const;

/** How many of an account's tickets for one name a lookup reads. */
const LIST_OWN_LIMIT = 5;

type RequestDatabaseInput = Parameters<
  ReturnType<typeof api.createClient>['mutation']['requestDatabase']
>[0]['input'];

export function createProvisionExecutor(args: {
  apiEndpoint: string;
  modulesEndpoint: string;
  bearer: string;
}): ProvisionRequestExecutor {
  const headers = { Authorization: `Bearer ${args.bearer}` };
  const apiClient = api.createClient({ adapter: new api.FetchAdapter(args.apiEndpoint, headers) });
  const modulesClient = modules.createClient({
    adapter: new api.FetchAdapter(args.modulesEndpoint, headers),
  });
  return {
    async request(input) {
      const requestInput: RequestDatabaseInput = {
        databaseName: input.databaseName,
        subdomain: input.subdomain,
        domain: input.domain,
        ...('presetSlug' in input.request
          ? { presetSlug: input.request.presetSlug }
          : { modules: input.request.modules as unknown as RequestDatabaseInput['modules'] }),
      };
      const result = await apiClient.mutation
        .requestDatabase({ input: requestInput }, { select: { result: { select: TICKET_SELECT } } })
        .unwrap();
      const ticket = result.requestDatabase?.result;
      if (!ticket) throw new Error('requestDatabase returned no provision ticket.');
      return ticket;
    },
    async poll(ticketId) {
      const result = await modulesClient.databaseProvisionModule
        .findOne({ id: ticketId, select: TICKET_SELECT })
        .unwrap();
      return result.databaseProvisionModule ?? null;
    },
    async listOwn({ databaseName, ownerId }) {
      const result = await modulesClient.databaseProvisionModule
        .findMany({
          select: { ...TICKET_SELECT, databaseName: true, createdAt: true },
          where: { databaseName: { equalTo: databaseName }, ownerId: { equalTo: ownerId } },
          orderBy: ['CREATED_AT_DESC'],
          first: LIST_OWN_LIMIT,
        })
        .unwrap();
      return (result.databaseProvisionModules?.nodes ?? []).filter((ticket) => Boolean(ticket));
    },
  };
}

/** A ticket whose provision or owner bootstrap is still running. */
export function isTicketInFlight(ticket: ProvisionTicket): boolean {
  if (ticket.status === 'pending' || ticket.status === 'in_progress') return true;
  return ticket.status === 'completed' && (ticket.bootstrapStatus === 'pending' || ticket.bootstrapStatus === 'in_progress');
}

const NETWORK_ERROR_RE =
  /fetch failed|network|socket hang up|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|aborted|timed? ?out/i;

/**
 * Whether an error reading or requesting a ticket says only that the backend
 * couldn't be reached or failed: a network error thrown before any response,
 * or errors that all carry an HTTP 5xx or 429 (inside the error, or from the
 * adapter). Any other GraphQL error (validation, permission, an expired or
 * rejected token) is an answer, so the ticket can't be followed any further.
 */
export function isTransientProvisionError(err: unknown): boolean {
  const errors = (err as { errors?: GraphQLError[] } | null)?.errors;
  if (Array.isArray(errors)) {
    return (
      errors.length > 0 &&
      errors.every((e) => {
        const status = statusOf(e);
        return status !== undefined && (status >= 500 || status === 429);
      })
    );
  }
  if (!(err instanceof Error)) return false;
  const code = (err.cause as { code?: unknown } | undefined)?.code;
  return NETWORK_ERROR_RE.test(`${err.message} ${typeof code === 'string' ? code : ''}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Request a database and resolve only when it is fully usable: ticket
 * `status` AND `bootstrapStatus` both 'completed'. The ticket the mutation
 * returns is checked before the first sleep, so a warm claim with bootstrap
 * already done never waits. `status: 'failed'` surfaces `errorMessage`;
 * `bootstrapStatus: 'failed'` surfaces `bootstrapError`. Stopping short of
 * either outcome throws `ProvisionPendingError`.
 *
 * With `resumeTicketId` the ticket of an earlier call is polled instead of
 * requesting again, and `resumed` is true. A ticket that reads back empty
 * throws `ProvisionTicketLostError`, never a new request: the provision may
 * still be running where this account can't see it.
 */
export async function requestDatabaseProvision(args: {
  apiEndpoint: string;
  modulesEndpoint: string;
  bearer: string;
  databaseName: string;
  domain: string;
  request: ProvisionRequest;
  executor?: ProvisionRequestExecutor;
  pollIntervalMs?: number;
  pollDeadlineMs?: number;
  resumeTicketId?: string;
}): Promise<{ databaseId: string; ticketId: string; resumed?: true }> {
  const executor =
    args.executor ??
    createProvisionExecutor({
      apiEndpoint: args.apiEndpoint,
      modulesEndpoint: args.modulesEndpoint,
      bearer: args.bearer,
    });
  const intervalMs = args.pollIntervalMs ?? POLL_INTERVAL_MS;
  const deadlineMs = args.pollDeadlineMs ?? POLL_DEADLINE_MS;

  // A backend that can't be reached leaves the old ticket pending rather than
  // falling back to a new request, which would start a duplicate provision.
  // Any other error is final for that ticket.
  let resumedTicket: ProvisionTicket | null = null;
  if (args.resumeTicketId) {
    try {
      resumedTicket = await executor.poll(args.resumeTicketId);
    } catch (err) {
      if (isTransientProvisionError(err)) {
        throw new ProvisionPendingError(thrownText(err), args.resumeTicketId, { cause: err });
      }
      if (answersSignedOut(err)) throw new ProvisionSignedOutError(thrownText(err), args.resumeTicketId, { cause: err });
      throw new Error(`provision ticket ${args.resumeTicketId} could not be read: ${thrownText(err)}`, {
        cause: err,
      });
    }
    if (!resumedTicket) {
      throw new ProvisionTicketLostError(
        `provision ticket ${args.resumeTicketId} could not be found on this backend.`,
        args.resumeTicketId,
      );
    }
  }
  let ticket =
    resumedTicket ??
    (await executor.request({
      databaseName: args.databaseName,
      subdomain: args.databaseName,
      domain: args.domain,
      request: args.request,
    }));
  const ticketId = resumedTicket ? (ticket.id ?? args.resumeTicketId!) : ticket.id;
  if (!ticketId) throw new Error('requestDatabase returned a provision ticket without an id.');
  const resumed = resumedTicket ? ({ resumed: true } as const) : {};

  const deadline = Date.now() + deadlineMs;
  let failures = 0;
  for (;;) {
    if (ticket.status === 'failed') {
      throw new ProvisionJobError(ticket.errorMessage ?? '', 'provisioning', ticketId);
    }
    if (ticket.bootstrapStatus === 'failed') {
      throw new ProvisionJobError(ticket.bootstrapError ?? '', 'owner bootstrap', ticketId);
    }
    if (ticket.status === 'completed' && ticket.bootstrapStatus === 'completed') {
      if (!ticket.databaseId) throw new Error('provisioning completed but returned no databaseId.');
      return { databaseId: ticket.databaseId, ticketId, ...resumed };
    }
    if (Date.now() >= deadline) {
      throw new ProvisionPendingError(
        `provisioning timed out after ${Math.round(deadlineMs / 1000)}s (status: ${
          ticket.status ?? 'unknown'
        }, bootstrapStatus: ${ticket.bootstrapStatus ?? 'unknown'})`,
        ticketId,
      );
    }

    await sleep(intervalMs);

    // A poll that can't reach the backend (network blip, 502) or comes back
    // empty is retried a few times rather than failing a provision that is
    // still running. Past that, an unreachable backend leaves the ticket
    // pending; an empty answer, or any error that is an answer, is final.
    let polled: ProvisionTicket | null;
    try {
      polled = await executor.poll(ticketId);
    } catch (err) {
      if (answersSignedOut(err)) throw new ProvisionSignedOutError(thrownText(err), ticketId, { cause: err });
      if (!isTransientProvisionError(err)) {
        throw new Error(`provision ticket ${ticketId} could not be read: ${thrownText(err)}`, {
          cause: err,
        });
      }
      if (++failures > MAX_CONSECUTIVE_POLL_FAILURES) {
        throw new ProvisionPendingError(thrownText(err), ticketId, { cause: err });
      }
      continue;
    }
    if (!polled) {
      if (++failures > MAX_CONSECUTIVE_POLL_FAILURES) {
        throw new ProvisionTicketLostError(`provision ticket ${ticketId} could not be read back.`, ticketId);
      }
      continue;
    }
    failures = 0;
    ticket = polled;
  }
}
