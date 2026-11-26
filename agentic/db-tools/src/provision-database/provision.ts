// Provisioning a project's database without ever creating a second one by
// accident. Every step runs under a per-project lock, and:
//  - a binding is DATABASE_ID alone: it is probed, then kept (and healed) or
//    refused, never provisioned over;
//  - replace mode swaps a binding only if it is still the one the caller saw,
//    and never one that is live (host path) or suspended;
//  - a recorded ticket that reads back empty, or a call that lost its ticket,
//    finds an in-flight provision of the same name before anything new is
//    requested, and a completed one is only reported (binding it is `adopt`);
//  - the host saves the binding before `.env` is written.

import { realpathSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { PlanAgent, PlanDatabase, PlanTarget, ToolFailure } from '@agentic-kit/harness';

import { prewarmAppWorkspace, run, type RunCommand } from '../app-workspace';
import { type DatabaseProbe, probeDatabase } from '../db-probe';
import { failureText, invalidBinding, noBackendFailure, type Result, suggest } from '../failure';
import { answersSignedOut, thrownText } from '../graphql-http';
import { getHost, type ProjectBinding, readAccount, readBackendConfig, replaceCall, reprovisionAdvice, type ToolsHost } from '../host';
import { selectProvisionCredential } from './credential';
import { archiveBindingKeys, ARCHIVED_BINDING_KEYS, type EnvVars, invalidBindingKeys, mergeEnv, provisionEnvVars, readEnv } from './env-file';
import { loadProvisionManifest } from './manifest';
import {
  abandonedTickets,
  archivePendingTicket,
  clearPendingTicket,
  MAX_PENDING_ATTEMPTS,
  type PendingTicket,
  recordAbandoned,
  recordedTicket,
  recordPendingTicket,
} from './pending-ticket';
import { selectProvisionRequest } from './preset-match';
import {
  createProvisionExecutor,
  isTicketInFlight,
  isTransientProvisionError,
  ProvisionJobError,
  ProvisionPendingError,
  type ProvisionRequestExecutor,
  ProvisionSignedOutError,
  type ProvisionTicket,
  ProvisionTicketLostError,
  requestDatabaseProvision,
} from './request-database';
import { type ProvisionOverlay, resolveProvisionModules } from './resolve';


export type ProvisionInput = {
  databaseName: string;
  /** `ensure` keeps a live binding; `replace` swaps the binding for a new database. */
  mode?: 'ensure' | 'replace';
  /**
   * Replace mode: the DATABASE_ID the caller expects bound (null: none). Any
   * other binding fails `binding-changed`. Undefined replaces whatever is bound.
   */
  replaces?: string | null;
  /** Host only: stop following an in-flight provision and request a new one. */
  abandonPending?: boolean;
  /**
   * Host only: bind this database, which the signed-in account owns and is
   * active, without requesting one (recovery after `name-taken`).
   */
  adopt?: string;
};

export type ProvisionFailureCode =
  | 'signed-out'
  | 'backend-unreachable'
  | 'db-missing'
  | 'db-suspended'
  | 'account-mismatch'
  | 'binding-live'
  | 'binding-changed'
  | 'pending-other'
  | 'ticket-lost'
  | 'provision-stuck'
  | 'name-taken'
  | 'binding-not-saved'
  | 'env-write-failed'
  | 'reprovision-not-allowed'
  | 'no-backend'
  | 'invalid-input'
  | 'missing-credentials'
  | 'plan-required'
  | 'limit-reached'
  | 'failed';

export type ProvisionDatabaseDetails = {
  success: boolean;
  message: string;
  /** Why it failed; absent on success and on a pending result. */
  code?: ProvisionFailureCode;
  databaseId?: string;
  databaseName?: string;
  ownerId?: string;
  /** True when an existing live binding was kept: nothing changed. */
  skipped?: boolean;
  /**
   * True when the call stopped waiting while the provision is still running.
   * Calling again with the same database_name resumes it.
   */
  pending?: boolean;
  /** The provision ticket, on a pending or stuck result. */
  ticketId?: string;
  /** True when this call finished a provision an earlier call had started. */
  resumed?: boolean;
  /** True when that provision was found on the backend by name, not in `.env`. */
  recovered?: boolean;
  /** The database the new binding replaced (replace mode). */
  replaced?: string;
  /** With `name-taken`: a database of this account holds the name. Never bound automatically. */
  heldBy?: { databaseId: string; yours: boolean; createdAt?: string };
  /**
   * On a failed call: true when the prewarm, which starts with the request,
   * prepared packages/app (scaffold and install) before the call ended.
   */
  appWorkspacePrepared?: boolean;
};

type Details = ProvisionDatabaseDetails;

// A result while it travels inside this module: the details, and on a failed
// or pending call its failure, which the entry points hand to the tool only,
// so `details` keeps its shape.
type Outcome = Details & { failure?: ToolFailure };

type Why = Omit<ToolFailure, 'code'>;

function refuse(code: ProvisionFailureCode, why: Why, extra: Partial<Details> = {}): Outcome {
  const failure: ToolFailure = { ...why, code };
  return { ...extra, success: false, message: failureText(failure), code, failure };
}

function withoutFailure({ failure: _failure, ...details }: Outcome): Details {
  return details;
}

// A probe the backend could not answer: a rejected account credential needs a
// sign-in, which the probe's detail already asks for; anything else, a retry.
function unanswered(
  probe: Extract<DatabaseProbe, { status: 'unreachable' }>,
  message: string,
  hint: string,
  extra: Partial<Details> = {},
): Outcome {
  return probe.cause === 'auth'
    ? refuse('signed-out', { message }, extra)
    : refuse('backend-unreachable', { message, hint, retryable: true }, extra);
}

const today = () => new Date().toISOString().slice(0, 10);
const noop = (): void => undefined;

async function readText(file: string): Promise<string> {
  try {
    return await readFile(file, 'utf8');
  } catch {
    return '';
  }
}

// Edit .env from its current content, read right before the write, so changes
// made while this call waited on the backend (by another tool or the user)
// aren't overwritten with what the file held when the call started.
async function updateEnvFile(envPath: string, edit: (content: string) => string): Promise<void> {
  await writeFile(envPath, edit(await readText(envPath)));
}

/** A project's `.env`, with each binding value checked: one that is not of its form is never used, sent or shown. */
async function readBinding(envPath: string): Promise<Result<EnvVars>> {
  const env = readEnv(await readText(envPath));
  const invalid = invalidBindingKeys(env);
  return invalid.length ? { kind: 'failed', failure: invalidBinding(invalid) } : { kind: 'ok', value: env };
}

/** The DATABASE_ID in a project's `.env`, if it has one of the form a database id takes. */
export async function boundDatabaseId(cwd: string): Promise<string | undefined> {
  const binding = await boundDatabase(cwd);
  return binding.kind === 'ok' ? binding.value?.id : undefined;
}

/** The database the `.env` of `cwd` binds, as a plan names it. */
async function boundDatabase(cwd: string): Promise<Result<PlanDatabase | undefined>> {
  const binding = await readBinding(path.join(cwd, '.env'));
  if (binding.kind === 'failed') return binding;
  const env = binding.value;
  return { kind: 'ok', value: env.DATABASE_ID ? { name: env.DATABASE_NAME ?? '', id: env.DATABASE_ID } : undefined };
}

type ProvisionAccess = { apiEndpoint: string; modulesEndpoint: string; credential: { ownerId: string; bearer: string }; email?: string; agent?: PlanAgent };

/**
 * The backend and the account a provision runs with, or why it cannot run.
 * The host's backend config is the only endpoint source: the account bearer
 * provisions with it, so an ambient env var or a guessed default must never
 * redirect it. Every project provisions UNDER the account (requestDatabase
 * owns the database to the JWT user).
 */
async function provisionAccess(host: ToolsHost): Promise<Result<ProvisionAccess>> {
  const backendRead = readBackendConfig(host);
  if (backendRead.kind === 'failed') return { kind: 'failed', failure: { ...backendRead.failure, code: 'no-backend' } };
  const apiEndpoint = backendRead.value?.apiEndpoint;
  const modulesEndpoint = backendRead.value?.modulesEndpoint;
  if (!apiEndpoint || !modulesEndpoint) {
    const noBackend = noBackendFailure(host.signInHint);
    return { kind: 'failed', failure: { ...noBackend, message: `Cannot provision a database: ${noBackend.message}` } };
  }
  const accountRead = await readAccount(host);
  if (accountRead.kind === 'failed') return { kind: 'failed', failure: { ...accountRead.failure, code: 'signed-out' } };
  const credential = selectProvisionCredential(accountRead.value, host.signInHint);
  if (credential.mode === 'error') {
    return { kind: 'failed', failure: { code: 'signed-out', message: `Cannot provision a database: ${credential.reason}` } };
  }
  const account = accountRead.value;
  return {
    kind: 'ok',
    value: { apiEndpoint, modulesEndpoint, credential, ...(account?.email ? { email: account.email } : {}), ...(account?.agent ? { agent: account.agent } : {}) },
  };
}

/**
 * What provision_database and replace_database check before they change
 * anything: a backend and an account to provision under, and a binding whose
 * values are of their form. They act on no bound database; a replace names
 * the one the directory leaves.
 */
export async function provisionDatabaseReady(replace: boolean, cwd: string): Promise<Result<PlanTarget>> {
  const access = await provisionAccess(getHost());
  if (access.kind === 'failed') return access;
  const bound = await boundDatabase(cwd);
  if (bound.kind === 'failed') return bound;
  const replaces = replace ? bound.value : undefined;
  return {
    kind: 'ok',
    value: {
      kind: 'account',
      apiEndpoint: access.value.apiEndpoint,
      account: {
        userId: access.value.credential.ownerId,
        ...(access.value.email ? { email: access.value.email } : {}),
        ...(access.value.agent ? { agent: access.value.agent } : {}),
      },
      ...(replaces ? { replaces } : {}),
    },
  };
}

// The per-DB endpoints are subdomain.<domain>; the provisioning domain is the api
// endpoint's host minus its first label (api.example.com -> example.com), so
// every backend provisions under its own domain.
function provisionDomain(apiEndpoint: string): string {
  try {
    const { hostname } = new URL(apiEndpoint);
    // A bare IP host has no domain hierarchy to strip: dropping its first label
    // ('192.168.1.10' -> '168.1.10') would yield a garbage domain. Use it verbatim.
    if (hostname.includes(':') || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return hostname;
    const parts = hostname.split('.');
    return parts.length > 1 ? parts.slice(1).join('.') : parts.join('.');
  } catch {
    return 'localhost';
  }
}

// The host's poll deadline when it's a positive number, else the default.
function pollDeadline(ms: number | undefined): number | undefined {
  return typeof ms === 'number' && Number.isFinite(ms) && ms > 0 ? ms : undefined;
}

// ---- per-project lock ----------------------------------------------------

const projectLocks = new Map<string, Promise<void>>();

// One provision per project at a time: a second call waits, then sees what
// the first one left (a binding, a recorded ticket) instead of racing it.
// The key is resolved synchronously, so a call takes its place in the queue
// before it yields and calls queue in call order.
function lockKey(cwd: string): string {
  try {
    return realpathSync(cwd);
  } catch {
    return path.resolve(cwd);
  }
}

async function withProjectLock<T>(cwd: string, fn: () => Promise<T>): Promise<T> {
  const key = lockKey(cwd);
  const previous = projectLocks.get(key) ?? Promise.resolve();
  let release: () => void = noop;
  const done = new Promise<void>((resolve) => (release = resolve));
  const tail = previous.then(() => done);
  projectLocks.set(key, tail);
  await previous;
  try {
    return await fn();
  } finally {
    release();
    if (projectLocks.get(key) === tail) projectLocks.delete(key);
  }
}

// ---- the run ---------------------------------------------------------------

type Run = {
  host: ToolsHost;
  cwd: string;
  envPath: string;
  name: string;
  mode: 'ensure' | 'replace';
  apiEndpoint: string;
  modulesEndpoint: string;
  bearer: string;
  ownerId: string;
  viaTool: boolean;
  executor: ProvisionRequestExecutor;
  probe(databaseId: string): Promise<DatabaseProbe>;
};

/**
 * Provision the project's database, or keep the one it is bound to. The host
 * entry point: replace mode refuses a live binding here, and `abandonPending`
 * and `adopt` are honoured.
 */
export async function provisionDatabase(
  input: ProvisionInput,
  ctx: { cwd: string; signal?: AbortSignal },
  exec: RunCommand = run,
): Promise<Details> {
  return withoutFailure(await withProjectLock(ctx.cwd, () => provision(input, ctx.cwd, exec, false)));
}

/**
 * The entry point of provision_database and replace_database: a replace may
 * replace a live binding (a clean rebuild), unless the host turned tool
 * reprovisioning off.
 */
export async function provisionFromTool(
  input: Pick<ProvisionInput, 'databaseName' | 'mode' | 'replaces'>,
  ctx: { cwd: string; signal?: AbortSignal },
  exec: RunCommand = run,
): Promise<{ details: Details; failure?: ToolFailure }> {
  const outcome = await withProjectLock(ctx.cwd, () => provision(input, ctx.cwd, exec, true));
  return { details: withoutFailure(outcome), ...(outcome.failure ? { failure: outcome.failure } : {}) };
}

async function provision(input: ProvisionInput, cwd: string, exec: RunCommand, viaTool: boolean): Promise<Outcome> {
  const name = input.databaseName?.trim();
  if (!name) return refuse('invalid-input', { message: 'The database needs a name.' });

  const host = getHost();
  const access = await provisionAccess(host);
  if (access.kind === 'failed') {
    const { code, ...why } = access.failure;
    return refuse(code as ProvisionFailureCode, why);
  }
  const { apiEndpoint, modulesEndpoint, credential } = access.value;

  const envPath = path.join(cwd, '.env');
  const binding = await readBinding(envPath);
  if (binding.kind === 'failed') return refuse('missing-credentials', binding.failure);
  const env = binding.value;
  const bound = env.DATABASE_ID || undefined;
  const r: Run = {
    host,
    cwd,
    envPath,
    name,
    mode: input.mode ?? 'ensure',
    apiEndpoint,
    modulesEndpoint,
    bearer: credential.bearer,
    ownerId: credential.ownerId,
    viaTool,
    executor: createProvisionExecutor({ apiEndpoint, modulesEndpoint, bearer: credential.bearer }),
    // The probe carries the account bearer, so it only ever targets the
    // app-configured backend, never a .env-pinned endpoint.
    probe: (databaseId) =>
      probeDatabase({ endpoint: apiEndpoint, bearer: credential.bearer, databaseId, signInHint: host.signInHint }),
  };

  let replaced: string | undefined;
  if (r.mode === 'replace') {
    const refusal = await checkReplace(r, input, bound);
    if (refusal) return refusal;
    replaced = bound;
  } else if (bound) {
    return keepBinding(r, env, bound, input.adopt);
  }

  if (input.adopt) {
    const prewarm = startPrewarm(r, exec);
    return afterPrewarm(await bindDatabase(r, { databaseId: input.adopt, replaced, adopted: true }, prewarm), prewarm);
  }
  return requestAndBind(r, input, env, replaced, exec);
}

// ---- ensure: keep the binding --------------------------------------------

async function keepBinding(r: Run, env: EnvVars, bound: string, adopt?: string): Promise<Outcome> {
  const probe = await r.probe(bound);
  if (probe.status === 'unreachable') {
    return unanswered(
      probe,
      `Cannot verify the existing database binding (DATABASE_ID=${bound}): ${probe.detail}.`,
      "Retry once the backend answers; don't reprovision on an unreachable backend.",
      { databaseId: bound },
    );
  }
  if (probe.status === 'missing') {
    return refuse(
      'db-missing',
      {
        message: `Project carries a binding (DATABASE_ID=${bound}) but that database no longer exists on this backend, or this account lost access to it.`,
        hint: reprovisionAdvice(r.host),
        ...replaceCall(r.host),
      },
      { databaseId: bound },
    );
  }
  if (probe.ownerId && probe.ownerId !== r.ownerId) {
    return refuse(
      'account-mismatch',
      {
        message: `Project carries a binding (DATABASE_ID=${bound}) but that database was provisioned under a different account than the one signed in.`,
        hint: reprovisionAdvice(r.host),
        ...replaceCall(r.host),
      },
      { databaseId: bound },
    );
  }
  if (probe.status === 'suspended') {
    return refuse('db-suspended', { message: suspendedText(bound, probe) }, { databaseId: bound });
  }
  if (adopt && adopt !== bound) {
    return refuse(
      'binding-live',
      {
        message: `The project is bound to a live database (DATABASE_ID=${bound}); adopt binds only an unbound project.`,
        hint: 'Use replace mode to swap it.',
      },
      { databaseId: bound },
    );
  }

  // Heal stale endpoint pins and missing binding keys on the skip path.
  const databaseName = env.DATABASE_NAME || probe.name || '';
  const ownerId = probe.ownerId ?? r.ownerId;
  const refresh: Record<string, string> = {};
  if (env.API_ENDPOINT !== r.apiEndpoint) refresh.API_ENDPOINT = r.apiEndpoint;
  if (env.MODULES_ENDPOINT !== r.modulesEndpoint) refresh.MODULES_ENDPOINT = r.modulesEndpoint;
  if (!env.DATABASE_NAME && databaseName) refresh.DATABASE_NAME = databaseName;
  if (!env.PGDATABASE && databaseName) refresh.PGDATABASE = databaseName;
  if (!env.OWNER_ID) refresh.OWNER_ID = ownerId;

  const saved = await saveBinding(r, {
    cwd: r.cwd,
    databaseId: bound,
    databaseName,
    ownerId,
    apiEndpoint: r.apiEndpoint,
    modulesEndpoint: r.modulesEndpoint,
    skipped: true,
  });
  if (saved) return saved;

  let note = '';
  if (Object.keys(refresh).length > 0) {
    const keys = Object.keys(refresh).join(', ');
    try {
      await updateEnvFile(r.envPath, (content) => mergeEnv(content, refresh));
      note = ` Refreshed in .env: ${keys}.`;
    } catch (err) {
      note = ` Could not refresh ${keys} in .env: ${thrownText(err)}.`;
    }
  }
  const advice = r.host.toolReprovision === false ? '' : ' Replacing it with a new database is a separate change, only for an explicit clean rebuild.';
  return {
    success: true,
    message: `Project already provisioned (DATABASE_ID=${bound}) and the database is live under this account. Skipping.${advice}${note}`,
    databaseId: bound,
    databaseName,
    ownerId,
    skipped: true,
  };
}

function suspendedText(databaseId: string, probe: Extract<DatabaseProbe, { status: 'suspended' }>): string {
  const why = probe.suspendedReason ? ` (${probe.suspendedReason})` : '';
  return `The bound database (DATABASE_ID=${databaseId}) is suspended${why} since ${probe.suspendedAt}. Its data is kept, so it isn't replaced; nothing can read or change it until the suspension is lifted.`;
}

// ---- replace: compare and swap -------------------------------------------

async function checkReplace(r: Run, input: ProvisionInput, bound: string | undefined): Promise<Outcome | null> {
  if (r.viaTool && r.host.toolReprovision === false) {
    return refuse('reprovision-not-allowed', {
      message: "This project's database is not replaced here: the app replaces a database only after the user approves it.",
      hint: reprovisionAdvice(r.host),
    });
  }
  const expected = input.replaces === undefined ? bound : input.replaces || undefined;
  if ((expected ?? '') !== (bound ?? '')) {
    return refuse(
      'binding-changed',
      {
        message: `The project's binding changed (DATABASE_ID is ${bound ?? 'unset'}, expected ${expected ?? 'unset'}), so nothing was replaced.`,
      },
      { databaseId: bound },
    );
  }
  if (!bound) return null;

  const probe = await r.probe(bound);
  if (probe.status === 'unreachable') {
    return unanswered(
      probe,
      `Cannot verify the binding being replaced (DATABASE_ID=${bound}): ${probe.detail}.`,
      'Retry once the backend answers.',
      { databaseId: bound },
    );
  }
  if (probe.status === 'suspended') {
    return refuse('db-suspended', { message: suspendedText(bound, probe) }, { databaseId: bound });
  }
  // A missing or foreign-owned binding is replaced; a live one of this account
  // only through the tool's explicit rebuild.
  if (probe.status === 'found' && (!probe.ownerId || probe.ownerId === r.ownerId) && !r.viaTool) {
    return refuse(
      'binding-live',
      { message: `The bound database (DATABASE_ID=${bound}) is live under this account, so it wasn't replaced.` },
      { databaseId: bound },
    );
  }
  return null;
}

// ---- request, resume, recover --------------------------------------------

type Lookup = { inFlight: ProvisionTicket[]; refusal?: Outcome; problem?: string };

// The account's in-flight provisions of this name, newest first. A lookup that
// can't reach the backend refuses (nothing may be requested blind); one that
// gets another error leaves the caller to decide.
async function findInFlight(r: Run, skip: ReadonlySet<string>): Promise<Lookup> {
  try {
    const tickets = await r.executor.listOwn({ databaseName: r.name, ownerId: r.ownerId });
    return { inFlight: tickets.filter((t) => t.id && !skip.has(t.id) && isTicketInFlight(t)) };
  } catch (err) {
    if (answersSignedOut(err)) {
      return {
        inFlight: [],
        refusal: refuse('signed-out', {
          message: `The backend did not accept the account credential while this call checked for a provision of "${r.name}" already in progress. Nothing was requested.`,
          hint: r.host.signInHint ?? 'Sign in again, then call again.',
        }),
      };
    }
    if (isTransientProvisionError(err)) {
      return {
        inFlight: [],
        refusal: refuse('backend-unreachable', {
          message: `Could not check the backend for a provision of "${r.name}" already in progress (${thrownText(err)}). Nothing was requested.`,
          hint: 'Retry once the backend answers.',
          retryable: true,
        }),
      };
    }
    return { inFlight: [], problem: thrownText(err) };
  }
}

const ticketOf = (r: Run, ticket: ProvisionTicket): PendingTicket => ({
  ticketId: ticket.id,
  databaseName: r.name,
  apiEndpoint: r.apiEndpoint,
  userId: r.ownerId,
  attempts: 0,
});

type Prewarm = Promise<{ ok: boolean; out: string }>;

// The packages/app scaffold + install don't need the database, so they run
// while the backend builds it. Best-effort: run_codegen re-runs the same
// idempotent steps. A pending call leaves it running; a retry joins that same
// run rather than starting a second install.
function startPrewarm(r: Run, exec: RunCommand): Prewarm {
  if (r.host.prewarmApp === false) return Promise.resolve({ ok: false, out: 'The host prepares packages/app itself.' });
  return prewarmAppWorkspace(r.cwd, exec).catch((err: unknown) => ({ ok: false, out: thrownText(err) }));
}

// The prewarm runs whether or not a database comes of the call, so a call that
// fails after it started waits for it and says what it left in packages/app.
async function afterPrewarm(outcome: Outcome, prewarm: Prewarm): Promise<Outcome> {
  if (outcome.success || outcome.pending || !outcome.failure || !(await prewarm).ok) return outcome;
  const failure: ToolFailure = {
    ...outcome.failure,
    message: `${outcome.failure.message.replace(/\.?$/, '.')} packages/app is ready for the next attempt.`,
  };
  return { ...outcome, failure, message: failureText(failure), appWorkspacePrepared: true };
}

async function requestAndBind(
  r: Run,
  input: ProvisionInput,
  env: EnvVars,
  replaced: string | undefined,
  exec: RunCommand,
): Promise<Outcome> {
  const abandoned = abandonedTickets(env);
  const abandon = async (ids: string[]) => {
    for (const id of ids) abandoned.add(id);
    await updateEnvFile(r.envPath, (content) => recordAbandoned(clearPendingTicket(content), ids)).catch(noop);
  };

  // A ticket an earlier call stopped waiting on.
  let current: PendingTicket | undefined;
  let recovered = false;
  const recorded = recordedTicket(env);
  if (recorded) {
    if (recorded.apiEndpoint !== r.apiEndpoint || recorded.userId !== r.ownerId) {
      // Requested on another backend or by another account: not ours to follow.
      await updateEnvFile(r.envPath, (content) => archivePendingTicket(content, today())).catch(noop);
    } else if (input.abandonPending) {
      await abandon([recorded.ticketId]);
    } else if (recorded.databaseName !== r.name) {
      return refuse(
        'pending-other',
        {
          message: `A provision of "${recorded.databaseName}" (ticket ${recorded.ticketId}) is still recorded for this project.`,
          hint: `Call again with the name "${recorded.databaseName}" to finish it; another name would start a second database.`,
          calls: [suggest(againTool(r), { database_name: recorded.databaseName }, 'Finish the provision recorded for this project')],
        },
        { ticketId: recorded.ticketId },
      );
    } else {
      current = recorded;
    }
  }

  // No ticket of ours is recorded, but an earlier call may have lost track of
  // one (its record failed to write, or the call was cut off): look it up by
  // name. Only an in-flight one is resumed.
  if (!current) {
    const lookup = await findInFlight(r, abandoned);
    if (lookup.refusal) return lookup.refusal;
    if (lookup.inFlight.length > 0 && input.abandonPending) {
      await abandon(lookup.inFlight.map((t) => t.id));
    } else if (lookup.inFlight.length > 0) {
      current = ticketOf(r, lookup.inFlight[0]);
      recovered = true;
    }
  }

  // Resolve the module set: pinned base preset from node-type-registry, then
  // ordered overlays (host default < project-local provision.json). A bad
  // preset/manifest fails the run rather than provisioning a wrong module set.
  let modules;
  try {
    const layers: ProvisionOverlay[] = [];
    const hostOverlay = await r.host.provisionOverlay?.();
    if (hostOverlay) layers.push(hostOverlay);
    const projectOverlay = await loadProvisionManifest(r.cwd);
    if (projectOverlay) layers.push(projectOverlay);
    modules = resolveProvisionModules(layers);
  } catch (err) {
    return refuse('failed', { message: `Cannot resolve provision modules: ${thrownText(err)}` });
  }

  const prewarm = startPrewarm(r, exec);
  return afterPrewarm(await sendRequest(r, { current, recovered, abandoned, modules, replaced }, prewarm), prewarm);
}

type Request = {
  current: PendingTicket | undefined;
  recovered: boolean;
  abandoned: Set<string>;
  modules: ReturnType<typeof resolveProvisionModules>;
  replaced: string | undefined;
};

async function sendRequest(r: Run, request: Request, prewarm: Prewarm): Promise<Outcome> {
  let { current, recovered } = request;
  const { abandoned, modules, replaced } = request;
  // requestDatabase claims a warm-pool database when the module set matches a
  // cataloged preset and cold-provisions otherwise; the ticket is polled on the
  // modules endpoint until the database AND its owner bootstrap complete. An
  // explicit subdomain (= name) keeps the per-DB endpoints deterministic.
  const ticketFor = (ticketId: string): PendingTicket => ({
    ticketId,
    databaseName: r.name,
    apiEndpoint: r.apiEndpoint,
    userId: r.ownerId,
    attempts: (current?.ticketId === ticketId ? current.attempts : 0) + 1,
  });
  const lost = new Set<string>();
  let provisioned: { databaseId: string; ticketId: string; resumed?: true };
  for (;;) {
    try {
      provisioned = await requestDatabaseProvision({
        apiEndpoint: r.apiEndpoint,
        modulesEndpoint: r.modulesEndpoint,
        bearer: r.bearer,
        databaseName: r.name,
        domain: provisionDomain(r.apiEndpoint),
        request: selectProvisionRequest(modules),
        executor: r.executor,
        // Past the attempt cap one read says whether it finished; no more waiting.
        pollDeadlineMs:
          current && current.attempts >= MAX_PENDING_ATTEMPTS ? 0 : pollDeadline(r.host.provisionPollDeadlineMs),
        resumeTicketId: current?.ticketId,
      });
      break;
    } catch (err) {
      if (err instanceof ProvisionPendingError) {
        return pendingResult(r, ticketFor(err.ticketId), err.message, recovered);
      }
      if (err instanceof ProvisionSignedOutError) return signedOutWaiting(r, ticketFor(err.ticketId), err.message);
      if (err instanceof ProvisionTicketLostError) {
        // The ticket can't be read back, which doesn't mean the provision
        // stopped. Follow another in-flight one of this name, or stop without
        // requesting anything.
        lost.add(err.ticketId);
        const lookup = await findInFlight(r, new Set([...abandoned, ...lost]));
        if (lookup.refusal) return lookup.refusal;
        if (lookup.inFlight.length > 0) {
          current = ticketOf(r, lookup.inFlight[0]);
          recovered = true;
          continue;
        }
        await updateEnvFile(r.envPath, clearPendingTicket).catch(noop);
        const checked = lookup.problem
          ? `the backend couldn't be asked for another one (${lookup.problem})`
          : 'no other provision of that name is in progress';
        return refuse(
          'ticket-lost',
          {
            message: `The provision of "${r.name}" (ticket ${err.ticketId}) can no longer be found on this backend, and ${checked}.`,
            hint: 'Nothing was created, and the record is cleared, so calling again requests a new database.',
            calls: [again(r, 'Request the database again')],
          },
          { ticketId: err.ticketId },
        );
      }
      // A definitive failure ends the recorded request, so forget it.
      if (current) await updateEnvFile(r.envPath, clearPendingTicket).catch(noop);
      return requestFailure(r, err);
    }
  }

  return bindDatabase(
    r,
    {
      databaseId: provisioned.databaseId,
      ticket: ticketFor(provisioned.ticketId),
      resumed: provisioned.resumed === true,
      recovered,
      replaced,
    },
    prewarm,
  );
}

// The provision is still running: record its ticket so the next call with the
// same name resumes it. Past MAX_PENDING_ATTEMPTS the ticket stays recorded
// and the call fails `provision-stuck`: nothing new is requested while it is
// in flight, until the host abandons it.
async function pendingResult(r: Run, ticket: PendingTicket, reason: string, recovered: boolean): Promise<Outcome> {
  const { ticketId } = ticket;
  let recordedOk = true;
  try {
    await updateEnvFile(r.envPath, (content) => recordPendingTicket(content, ticket));
  } catch {
    recordedOk = false;
  }
  if (ticket.attempts > MAX_PENDING_ATTEMPTS) {
    return refuse(
      'provision-stuck',
      {
        message: `Database "${r.name}" is still not ready after ${MAX_PENDING_ATTEMPTS} waits (${reason}). Its request (ticket ${ticketId}) stays recorded, and no other database is requested while it is in progress.`,
        hint: "Check the backend's provisioning jobs.",
      },
      { ticketId },
    );
  }
  const waiting = `call again with the same name, "${r.name}", to keep waiting on it`;
  const message = recordedOk
    ? `Database "${r.name}" is still provisioning (${reason}). The request is recorded in .env; ${waiting}. Don't change the name: that starts a second database.`
    : `Database "${r.name}" is still provisioning (${reason}). Recording its ticket in .env failed, but the backend still has it: ${waiting}. Don't change the name: that starts a second database.`;
  return {
    success: false,
    message,
    pending: true,
    ticketId,
    ...(recovered ? { recovered: true } : {}),
    // No details code: a pending call has not failed, it has not finished.
    failure: {
      code: 'provision-pending',
      message,
      retryable: true,
      calls: [again(r, 'Keep waiting on the recorded request')],
    },
  };
}

// A failed ticket stores the job's error text, not a GraphQL error, so the
// code a refusal raised and PostgreSQL's own unique-violation text are the
// only signals it has; the request's own GraphQL answer has a code.
const TICKET_CODE_RE = /^(?:\[[^\]]*\]\s*)?([A-Z][A-Z0-9_]+)\b/;
const TICKET_UNIQUE_RE = /duplicate key value violates unique constraint/;

/** The public code of a refusal: from the request's GraphQL answer, or from a failed ticket. */
function refusalCode(err: unknown): string | undefined {
  if (err instanceof ProvisionJobError) return TICKET_CODE_RE.exec(err.ticketError)?.[1];
  const errors = (err as { errors?: { extensions?: { code?: unknown; class?: unknown } }[] } | null)?.errors;
  if (!Array.isArray(errors)) return undefined;
  const code = errors.find((error) => error?.extensions?.class !== 'internal')?.extensions?.code;
  return typeof code === 'string' ? code : undefined;
}

const isNameTaken = (err: unknown): boolean =>
  refusalCode(err) === 'UNIQUE_VIOLATION' || (err instanceof ProvisionJobError && TICKET_UNIQUE_RE.test(err.ticketError));

const REFUSED = 'Database provisioning was refused';

// The tool of the same call again: a replace from the tool is its own tool.
const againTool = (r: Run): string => (r.mode === 'replace' && r.viaTool ? 'replace_database' : 'provision_database');

// The same call again, with the same name.
const again = (r: Run, why: string) => suggest(againTool(r), { database_name: r.name }, why);

const anotherName = (r: Run) => suggest(againTool(r), {}, 'Request the database under a name that is free', ['database_name']);

// The backend refused a read of the provision because the sign-in ended. The provision may still be running, so its
// ticket stays recorded, and the next call after a sign-in waits on it instead of requesting another database.
async function signedOutWaiting(r: Run, ticket: PendingTicket, reason: string): Promise<Outcome> {
  const recorded = await updateEnvFile(r.envPath, (content) => recordPendingTicket(content, ticket)).then(() => true, () => false);
  return refuse(
    'signed-out',
    {
      message:
        `The backend did not accept the account credential while it read the provision of "${r.name}" (ticket ${ticket.ticketId}): ${reason}. ` +
        `The database may still be on its way${recorded ? ', and the request stays recorded in .env' : ''}.`,
      hint: `${r.host.signInHint ?? 'Sign in again'}, then call again with the same name to keep waiting on it. Don't change the name: that starts a second database.`,
      calls: [again(r, 'Keep waiting on the recorded request once signed in')],
    },
    { ticketId: ticket.ticketId },
  );
}

async function requestFailure(r: Run, err: unknown): Promise<Outcome> {
  const detail = thrownText(err);
  if (answersSignedOut(err)) {
    return refuse('signed-out', {
      message: `${REFUSED}${refusalCode(err) ? ` (${refusalCode(err)})` : ''}: the backend did not accept the account credential.`,
      hint: r.host.signInHint ?? 'Sign in again, then call again.',
    });
  }
  switch (refusalCode(err)) {
  case 'BILLING_PLAN_REQUIRED':
    return refuse('plan-required', {
      message: `${REFUSED} (BILLING_PLAN_REQUIRED): this account has no active plan, and this backend requires one before it creates a database.`,
      hint: 'Choose a plan for this account under Billing → Plans in the Constructive dashboard, then call again.',
      calls: [again(r, 'Request the database again once the account has a plan')],
    });
  case 'LIMIT_REACHED':
    return refuse('limit-reached', {
      message: `${REFUSED} (LIMIT_REACHED): this account has as many databases as its plan allows.`,
      hint: 'Delete a database this account no longer needs, or choose a plan that allows more under Billing → Plans in the Constructive dashboard, then call again.',
      calls: [again(r, 'Request the database again once the account has room for it')],
    });
  case 'BILLING_QUOTA_EXCEEDED':
    return refuse('limit-reached', {
      message: `${REFUSED} (BILLING_QUOTA_EXCEEDED): this account has used up the allowance of its plan.`,
      hint: 'Choose a plan with a larger allowance under Billing → Plans in the Constructive dashboard, or wait for the allowance to renew, then call again.',
      calls: [again(r, 'Request the database again once the allowance allows it')],
    });
  default:
    break;
  }
  if (!isNameTaken(err)) return refuse('failed', { message: `Database provisioning failed: ${detail}.` });
  const heldBy = await ownHolder(r);
  if (heldBy) {
    const when = heldBy.createdAt ? `, requested ${heldBy.createdAt}` : '';
    return refuse(
      'name-taken',
      {
        message: `Database provisioning failed: ${detail}. The name "${r.name}" belongs to a database this account provisioned earlier (ID ${heldBy.databaseId}${when}) that this project isn't bound to, so it was not bound.`,
        hint: 'Call again with another database name.',
        calls: [anotherName(r)],
      },
      { heldBy },
    );
  }
  return refuse('name-taken', {
    message: `Database provisioning failed: ${detail}. The database name is already taken on the backend.`,
    hint: 'Call again with another database name.',
    calls: [anotherName(r)],
  });
}

// A completed provision of this name by this account whose database still
// exists under it: reported with name-taken so the host can adopt it.
async function ownHolder(r: Run): Promise<Details['heldBy'] | undefined> {
  let tickets: ProvisionTicket[];
  try {
    tickets = await r.executor.listOwn({ databaseName: r.name, ownerId: r.ownerId });
  } catch {
    return undefined;
  }
  const done = tickets.find((t) => t.status === 'completed' && t.databaseId && !isTicketInFlight(t));
  if (!done) return undefined;
  const probe = await r.probe(done.databaseId);
  if (probe.status !== 'found' && probe.status !== 'suspended') return undefined;
  if (probe.ownerId && probe.ownerId !== r.ownerId) return undefined;
  return { databaseId: done.databaseId, yours: true, ...(done.createdAt ? { createdAt: done.createdAt } : {}) };
}

// ---- binding ---------------------------------------------------------------

async function saveBinding(r: Run, binding: ProjectBinding, ticket?: PendingTicket): Promise<Outcome | null> {
  if (!r.host.persistBinding) return null;
  try {
    await r.host.persistBinding(binding);
    return null;
  } catch (err) {
    // Keep the ticket recorded, so the next call resumes it and binds it.
    if (ticket) await updateEnvFile(r.envPath, (content) => recordPendingTicket(content, ticket)).catch(noop);
    return refuse(
      'binding-not-saved',
      {
        message: `Database "${binding.databaseName}" (ID ${binding.databaseId}) is ready, but the app couldn't save the binding (${thrownText(err)}), so .env was left unchanged.`,
        ...(ticket
          ? {
            hint: 'Calling again with the same name binds it.',
            calls: [again(r, 'Bind the database that is ready')],
          }
          : {}),
      },
      { databaseId: binding.databaseId, ...(ticket ? { ticketId: ticket.ticketId } : {}) },
    );
  }
}

type Bind = {
  databaseId: string;
  ticket?: PendingTicket;
  resumed?: boolean;
  recovered?: boolean;
  replaced?: string;
  adopted?: boolean;
};

async function bindDatabase(r: Run, bind: Bind, prewarm: Prewarm): Promise<Outcome> {
  const { databaseId, ticket } = bind;

  // Bind only a database this account owns. An unreachable backend keeps the
  // ticket for the next call to check again.
  const owner = await r.probe(databaseId);
  if (owner.status === 'unreachable') {
    if (ticket) {
      return pendingResult(r, ticket, `provisioned, but its owner couldn't be confirmed: ${owner.detail}`, bind.recovered);
    }
    return unanswered(owner, `Cannot verify database ${databaseId}: ${owner.detail}.`, 'Retry once the backend answers.');
  }
  const visible = owner.status !== 'missing';
  if (!visible || owner.ownerId !== r.ownerId) {
    if (ticket) await updateEnvFile(r.envPath, clearPendingTicket).catch(noop);
    const why = visible ? "it isn't owned by" : "it isn't visible to";
    if (bind.adopted) {
      return refuse(visible ? 'account-mismatch' : 'db-missing', {
        message: `Database ${databaseId} was not bound: ${why} the signed-in account.`,
      });
    }
    return refuse('failed', {
      message: `Database provisioning returned database ${databaseId}, but ${why} the signed-in account, so it was not bound.`,
      hint: 'Call again to request a new database.',
      calls: [again(r, 'Request a new database')],
    });
  }
  if (bind.adopted && owner.status === 'suspended') {
    return refuse('db-suspended', { message: suspendedText(databaseId, owner) });
  }
  const saved = await saveBinding(
    r,
    {
      cwd: r.cwd,
      databaseId,
      databaseName: r.name,
      ownerId: r.ownerId,
      apiEndpoint: r.apiEndpoint,
      modulesEndpoint: r.modulesEndpoint,
      ...(bind.replaced ? { replaces: bind.replaced } : {}),
    },
    ticket,
  );
  if (saved) return saved;

  // Write the binding into .env (upsert, preserving other keys), dropping any
  // recorded pending request: the project is bound now.
  try {
    await updateEnvFile(r.envPath, (content) =>
      mergeEnv(
        clearPendingTicket(
          bind.replaced ? archiveBindingKeys(content, ARCHIVED_BINDING_KEYS, today()) : content,
        ),
        provisionEnvVars({
          databaseId,
          databaseName: r.name,
          ownerId: r.ownerId,
          apiEndpoint: r.apiEndpoint,
          modulesEndpoint: r.modulesEndpoint,
        }),
      ),
    );
  } catch (err) {
    return refuse(
      'env-write-failed',
      { message: `Database provisioned (ID: ${databaseId}) but writing .env failed: ${thrownText(err)}` },
      { databaseId },
    );
  }

  // Settle the concurrent prewarm so the scaffold + install are in place before
  // run_codegen runs. A failure here is non-fatal: run_codegen redoes the work.
  const prewarmed = (await prewarm).ok ? ' packages/app prewarmed.' : '';
  const notes = [
    bind.resumed ? ' Finished the provision an earlier call had started.' : '',
    bind.recovered ? ' Found it on the backend by name: its ticket was no longer recorded.' : '',
    prewarmed,
    bind.replaced
      ? ' Previous binding archived in .env (old database kept); build the schema again in the new one, then generate the SDK again.'
      : '',
  ].join('');
  const message = bind.adopted
    ? `Bound database "${r.name}" (ID: ${databaseId}), which this account provisioned earlier. Binding written to .env.${notes}`
    : `Provisioned database "${r.name}" (ID: ${databaseId}). Binding written to .env.${notes}`;
  return {
    success: true,
    message,
    databaseId,
    databaseName: r.name,
    ownerId: r.ownerId,
    ...(bind.resumed ? { resumed: true } : {}),
    ...(bind.recovered ? { recovered: true } : {}),
    ...(bind.replaced ? { replaced: bind.replaced } : {}),
  };
}
