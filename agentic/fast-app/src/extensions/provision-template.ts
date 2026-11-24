// Applies a curated blueprint to the project database. The backend calls come
// in through `BlueprintPort`, so this file has no SDK import and the pipeline
// can call `provisionTemplate` directly.
//
// constructBlueprint queues the build and returns at once. A worker builds one
// blueprint at a time, and the construction row goes from pending through
// constructing to constructed, or to failed with the coded error the port
// reads back. A backend from before the queue builds inside the mutation and
// answers with the build's error, rolling the construction back with it.

import type { CuratedBlueprint } from '../blueprints/curated';

export type { CuratedBlueprint };

export type Construction = { id: string; status: string };

export type EntityTypeRow = {
  prefix: string;
  membershipType: unknown;
  entityTableName: unknown;
};

export interface BlueprintPort {
  findBlueprintId(name: string): Promise<string | undefined>;
  createBlueprint(bp: CuratedBlueprint): Promise<string>;
  constructions(blueprintId: string): Promise<Construction[]>;
  construct(blueprintId: string): Promise<void>;
  /** Why a failed construction failed, in the backend's words. */
  failureReason(constructionId: string): Promise<string>;
  entityTypes(): Promise<EntityTypeRow[]>;
}

export type ProvisionTemplateStatus = 'constructed' | 'already' | 'failed';

export type ProvisionTemplateResult = {
  status: ProvisionTemplateStatus;
  text: string;
  error: string | null;
};

export type ProvisionTemplateOptions = {
  signal?: AbortSignal;
  onProgress?: (text: string) => void;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  now?: () => number;
  pollMs?: number;
  deadlineMs?: number;
  maxConstructs?: number;
  lockRetryMs?: number;
};

// Thrown by `BlueprintPort.construct` when the backend answered with an error:
// it refused to queue the build, or an older backend's build failed. Either
// way no construction row will show up.
export class ConstructionRejected extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConstructionRejected';
  }
}

// The SDK throws a GraphQLRequestError both for an error the backend answered
// with and for an HTTP failure. A gateway status (502, 503, 504) or a network
// error can be a proxy that dropped a construct the backend is still running;
// anything else is the backend's answer, and the construct is over.
const GATEWAY_RE = /^HTTP (408|502|503|504|524)\b/;

export function constructionRejection(err: unknown): ConstructionRejected | null {
  const { name, errors } = (err ?? {}) as { name?: string; errors?: Array<{ message?: string }> };
  if (name !== 'GraphQLRequestError' || !Array.isArray(errors)) return null;
  const messages = errors.map((e) => e.message ?? '').filter(Boolean);
  if (messages.length === 0 || messages.some((m) => GATEWAY_RE.test(m))) return null;
  return new ConstructionRejected(messages.join('; '));
}

const POLL_MS = 5_000;
const DEADLINE_MS = 240_000;
const MAX_CONSTRUCTS = 3;
const LOCK_RETRY_MS = 30_000;
// Contention and load, not the definition: another construct holds the schema,
// or a big blueprint ran past the statement timeout of a busy backend.
const RETRYABLE_RE = /lock timeout|could not obtain lock|deadlock detected|statement timeout/i;
const STATE_TEXT: Record<string, string> = {
  pending: "waiting in the backend's build queue",
  constructing: 'building',
};

export function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error('Cancelled.'));
    const timer = setTimeout(done, ms);
    function done() {
      signal?.removeEventListener('abort', abort);
      resolve();
    }
    function abort() {
      clearTimeout(timer);
      reject(new Error('Cancelled.'));
    }
    signal?.addEventListener('abort', abort, { once: true });
  });
}

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

// The membership type of each entity type, for policies on tables added beside
// the blueprint. A failed lookup is reported, never dropped: without it the
// agent cannot write an entity-scoped policy.
async function entityTypesNote(port: BlueprintPort, prefixes: string[]): Promise<string> {
  if (prefixes.length === 0) return '';
  try {
    const rows = (await port.entityTypes()).filter((row) => prefixes.includes(row.prefix));
    if (rows.length === 0) return ' No entity type rows were found for this blueprint yet.';
    const list = rows.map(
      (row) =>
        `${String(row.entityTableName)} (prefix ${row.prefix}, membership_type ${String(row.membershipType)})`,
    );
    return ` Entity tables: ${list.join(', ')}.`;
  } catch (err) {
    return ` The entity tables' membership types could not be read: ${message(err)}.`;
  }
}

export async function provisionTemplate(
  port: BlueprintPort,
  bp: CuratedBlueprint,
  options: ProvisionTemplateOptions = {},
): Promise<ProvisionTemplateResult> {
  const {
    signal,
    onProgress,
    sleep = abortableSleep,
    now = Date.now,
    pollMs = POLL_MS,
    deadlineMs = DEADLINE_MS,
    maxConstructs = MAX_CONSTRUCTS,
    lockRetryMs = LOCK_RETRY_MS,
  } = options;
  const prefixes = (bp.entity_types ?? []).map((e) => e.prefix);
  const scope = prefixes.length ? `entity types ${prefixes.join(', ')}` : 'tables only';

  // One blueprint row per slug and database: a retry reuses it.
  let blueprintId = await port.findBlueprintId(bp.name);
  if (
    blueprintId &&
    (await port.constructions(blueprintId)).some((c) => c.status === 'constructed')
  ) {
    return {
      status: 'already',
      text: `"${bp.name}" is already provisioned in this database.${await entityTypesNote(port, prefixes)} Call describe_live_schema to see its tables.`,
      error: null,
    };
  }
  blueprintId ??= await port.createBlueprint(bp);

  // The build runs after the construct returns, or, on an older backend,
  // inside a request that a gateway may drop while the backend keeps working,
  // so either way the construction status is polled. An error the backend
  // itself answered with means there is nothing to wait for. Every failure
  // along the way is kept for the final report.
  const failures: string[] = [];
  let pollError: { count: number; last: string } | null = null;
  let timedOut = false;
  const deadline = now() + deadlineMs;

  const countPollError = (err: unknown) => {
    pollError = { count: (pollError?.count ?? 0) + 1, last: message(err) };
  };
  // The constructions there before this attempt's, by id, read twice at most.
  // Without them an older failed one would read as this attempt's failure.
  const readBefore = async (id: string): Promise<Set<string> | null> => {
    for (let read = 1; ; read++) {
      try {
        return new Set((await port.constructions(id)).map((c) => c.id));
      } catch (err) {
        countPollError(err);
        if (read === 2) return null;
        await sleep(pollMs, signal);
      }
    }
  };

  for (let attempt = 1; attempt <= maxConstructs && now() < deadline; attempt++) {
    if (signal?.aborted) throw new Error('Cancelled.');
    onProgress?.(`Constructing ${bp.display_name} (attempt ${attempt})…`);
    const before = await readBefore(blueprintId);
    if (!before) continue;
    let failed: string | null = null;
    let requestError: string | null = null;
    try {
      await port.construct(blueprintId);
    } catch (err) {
      if (err instanceof ConstructionRejected) failed = err.message;
      else requestError = message(err);
    }

    let shown = '';
    while (!failed) {
      if (now() >= deadline) {
        timedOut = true;
        break;
      }
      if (signal?.aborted) throw new Error('Cancelled.');
      let rows: Construction[] | null = null;
      try {
        rows = await port.constructions(blueprintId);
      } catch (err) {
        countPollError(err);
      }
      if (rows?.some((c) => c.status === 'constructed')) {
        return {
          status: 'constructed',
          text: `Provisioned "${bp.display_name}" (${scope}).${await entityTypesNote(port, prefixes)} Its tables span the app, admin and storage APIs; call describe_live_schema next.`,
          error: null,
        };
      }
      const fresh = rows?.filter((c) => !before.has(c.id)) ?? [];
      const failedRow = fresh.find((c) => c.status === 'failed');
      if (failedRow) {
        // A reason that can't be read, or an empty one, still ends this attempt.
        failed =
          (await port.failureReason(failedRow.id).catch((err: unknown) => message(err))) ||
          'the backend gave no reason';
        break;
      }
      // Builds queue behind each other, so say whether this one has started.
      const state = fresh.at(-1)?.status;
      if (state && state !== shown && STATE_TEXT[state]) {
        shown = state;
        onProgress?.(`Constructing ${bp.display_name} (attempt ${attempt}): ${STATE_TEXT[state]}…`);
      }
      await sleep(pollMs, signal);
    }

    if (failed) failures.push(`attempt ${attempt}: ${failed}`);
    else if (requestError)
      failures.push(`attempt ${attempt}: the construct request failed: ${requestError}`);
    // Only contention or load is worth another construct (RETRYABLE_RE). Any
    // other failure would repeat.
    if (!failed || !RETRYABLE_RE.test(failed)) break;
    if (attempt < maxConstructs && now() < deadline) await sleep(lockRetryMs, signal);
  }

  const reasons = [...failures];
  // With every attempt skipped, the failed reads are the reason.
  if (timedOut || (reasons.length === 0 && !pollError))
    reasons.push('timed out waiting for the backend');
  if (pollError) {
    reasons.push(`the status check failed ${pollError.count} time(s), last: ${pollError.last}`);
  }
  const error = reasons.join('; ');
  return {
    status: 'failed',
    text: `Could not provision "${bp.display_name}": ${error}.`,
    error,
  };
}
