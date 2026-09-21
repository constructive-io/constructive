/**
 * The run log, as a browser reads and writes it.
 *
 * A Job writes through the worker's callback lane because it holds no tenant
 * credential; a user's browser is the opposite case — it already authenticates
 * as the user against the tenant API, and RLS on `agent_run`/`agent_event` is
 * exactly the visibility rule a run surface should obey. So this store speaks
 * the tenant's own GraphQL and implements the same `RunLogStore` contract as
 * every other host, which is what lets one renderer draw a local run, a cloud
 * run and a replayed run without knowing which it has.
 */

import {
  type AppendOptions,
  type ApprovalResolutionInput,
  approvalResolutionMessage,
  assertRunEventRecord,
  PI_TRANSCRIPT_FORMAT,
  type PiMessage,
  type RunEventRecord,
  type RunLogCursor,
  type RunLogPage,
  type RunLogStore,
  START,
  SUPPORTED_PI_TRANSCRIPT_VERSION,
  type TranscriptEntry,
  transcriptReaders,
  type TranscriptReaderRegistry,
} from '@agentic-kit/run-log';

import {
  advanceRunDocument,
  appendDocument,
  createRunDocument,
  createThreadDocument,
  eventsDocument,
  runDocument,
  runsDocument,
} from './documents';
import { type RunLogNames, runLogNames } from './names';
import type { GraphqlRequest } from './transport';

export type RunStatus =
  | 'pending'
  | 'running'
  | 'waiting'
  | 'idle'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

/** A run holding, or able to hold, compute. */
export const ATTACHABLE_STATUSES: readonly RunStatus[] = [
  'pending',
  'running',
  'waiting',
  'idle',
];

/** A run that will never append again. */
export const TERMINAL_STATUSES: readonly RunStatus[] = [
  'succeeded',
  'failed',
  'cancelled',
];

export const isTerminalStatus = (status: string): boolean =>
  (TERMINAL_STATUSES as readonly string[]).includes(status);

/**
 * The run row as a surface reads it. `executionId` is the *currently attached*
 * execution and is null for an idle run — the attach/detach history lives in the
 * log, so a null here means "holds no compute right now", never "never ran".
 */
export interface RunSummary {
  id: string;
  threadId: string | null;
  /** Who invoked the run. */
  actorId: string | null;
  /** Who is billed for it — the actor themselves for a personal run. */
  entityId: string | null;
  status: string;
  placement: string | null;
  executionId: string | null;
  repoUrl: string | null;
  branch: string | null;
  baseCommit: string | null;
  headCommit: string | null;
  lastEventSeq: number;
  attempt: number | null;
  parentRunId: string | null;
  error: string | null;
  artifacts: unknown;
  deadlineAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string | null;
}

/**
 * What a host chooses when it opens a run.
 *
 * Deliberately holds no identity: `actor_id`, `principal_id` and `entity_id`
 * default from the claims of the transaction the tenant API opens for this
 * request, so who the run belongs to is the authenticated session and not
 * something a caller can name.
 */
export interface CreateRunInput {
  threadId: string;
  /**
   * `local` for a run executed by a host on the user's machine, `cloud` for a
   * Job. The column defaults to `cloud`, so a local host states it.
   */
  placement: 'cloud' | 'local';
  status?: RunStatus;
  repoUrl?: string;
  branch?: string;
}

/** The lifecycle columns a host that owns a run moves as it runs. */
export interface RunPatch {
  status?: RunStatus;
  error?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
}

export interface CreateThreadInput {
  title?: string;
  /** `agent` for a tool-enabled run, which is what a coding host opens. */
  mode?: 'ask' | 'agent';
}

export interface ThreadSummary {
  id: string;
  title: string | null;
  createdAt: string | null;
}

export interface ListRunsArgs {
  first?: number;
  threadId?: string;
  status?: string;
}

export interface RunLogClientOptions {
  request: GraphqlRequest;
  /** From the module loader; defaults to the app-scope names. */
  runTable?: string;
  eventTable?: string;
  threadTable?: string;
  /**
   * A browser has no row lock, so two writers can pick the same next `seq`;
   * `UNIQUE (run_id, seq)` rejects the loser and it re-reads and retries. Bounded
   * so a genuinely broken write surfaces as an error instead of spinning.
   */
  maxAppendAttempts?: number;
  newId?: () => string;
  now?: () => Date;
  /**
   * Readers that validate the entries this client writes and reads. Defaults to
   * the process registry, so a host that registered a second harness's reader
   * at startup reads that harness's runs without passing anything here.
   */
  readers?: TranscriptReaderRegistry;
}

const DEFAULT_MAX_APPEND_ATTEMPTS = 5;
const DEFAULT_READ_LIMIT = 200;
const DEFAULT_RUN_LIMIT = 50;

/**
 * A conflict on `(run_id, seq)` — the only error this store retries. Matched on
 * the message because the tenant API reports it as a GraphQL error string; any
 * other failure is rethrown untouched.
 */
export const isSeqConflict = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return /duplicate key|unique constraint|already exists/i.test(message);
};

const entryId = (entry: TranscriptEntry): string | undefined =>
  typeof entry.id === 'string' ? entry.id : undefined;

export class GraphqlRunLogClient implements RunLogStore {
  readonly names: RunLogNames;
  /**
   * Read by a follower so the view projects exactly the formats this client
   * accepts — one registry decides both what a run may store and what a surface
   * can draw.
   */
  readonly readers: TranscriptReaderRegistry;
  private readonly request: GraphqlRequest;
  private readonly maxAppendAttempts: number;
  private readonly newId: () => string;
  private readonly now: () => Date;

  constructor(options: RunLogClientOptions) {
    this.request = options.request;
    this.names = runLogNames(
      options.runTable,
      options.eventTable,
      options.threadTable
    );
    this.maxAppendAttempts =
      options.maxAppendAttempts ?? DEFAULT_MAX_APPEND_ATTEMPTS;
    this.newId = options.newId ?? (() => globalThis.crypto.randomUUID());
    this.now = options.now ?? (() => new Date());
    this.readers = options.readers ?? transcriptReaders;
  }

  async listRuns(args: ListRunsArgs = {}): Promise<RunSummary[]> {
    const where: Record<string, unknown> = {};
    if (args.threadId) where.threadId = { equalTo: args.threadId };
    if (args.status) where.status = { equalTo: args.status };
    const data = await this.request<Record<string, { nodes: RunSummary[] }>>(
      runsDocument(this.names),
      {
        first: args.first ?? DEFAULT_RUN_LIMIT,
        where: Object.keys(where).length > 0 ? where : undefined,
      }
    );
    return data[this.names.runs].nodes;
  }

  /**
   * Open a thread. A cloud run is opened against a thread the web UI already
   * created; a host on the user's machine is the first writer of its own
   * conversation, so it creates one and then hangs its runs off it.
   */
  async createThread(input: CreateThreadInput = {}): Promise<ThreadSummary> {
    const data = await this.request<
      Record<string, Record<string, ThreadSummary | undefined>>
    >(createThreadDocument(this.names), {
      input: {
        [this.names.thread]: {
          ...(input.title === undefined ? {} : { title: input.title }),
          mode: input.mode ?? 'agent',
        },
      },
    });
    const thread = data[this.names.createThread]?.[this.names.thread];
    if (!thread) {
      throw new Error(
        `${this.names.createThread} returned no thread; the run surface is not writable by this user`
      );
    }
    return thread;
  }

  /** Open a run. See {@link CreateRunInput} on why identity is not an argument. */
  async createRun(input: CreateRunInput): Promise<RunSummary> {
    const data = await this.request<
      Record<string, Record<string, RunSummary | undefined>>
    >(createRunDocument(this.names), {
      input: {
        [this.names.run]: {
          threadId: input.threadId,
          placement: input.placement,
          ...(input.status === undefined ? {} : { status: input.status }),
          ...(input.repoUrl === undefined ? {} : { repoUrl: input.repoUrl }),
          ...(input.branch === undefined ? {} : { branch: input.branch }),
        },
      },
    });
    const run = data[this.names.createRun]?.[this.names.run];
    if (!run) {
      throw new Error(
        `${this.names.createRun} returned no run; the run surface is not writable by this user`
      );
    }
    return run;
  }

  /**
   * Move a run's lifecycle columns. The transcript is the history; this row is
   * the current state a list view reads without replaying it.
   */
  async updateRun(runId: string, patch: RunPatch): Promise<RunSummary> {
    if (Object.keys(patch).length === 0) {
      throw new Error(`run ${runId}: updateRun called with an empty patch`);
    }
    const data = await this.request<
      Record<string, Record<string, RunSummary | undefined>>
    >(advanceRunDocument(this.names), {
      input: { id: runId, [this.names.runPatch]: patch },
    });
    const run = data[this.names.updateRun]?.[this.names.run];
    if (!run) {
      throw new Error(
        `run ${runId} was not updated; it is not visible or not writable by this user`
      );
    }
    return run;
  }

  async getRun(runId: string): Promise<RunSummary> {
    const data = await this.request<Record<string, { nodes: RunSummary[] }>>(
      runDocument(this.names),
      { where: { id: { equalTo: runId } } }
    );
    const run = data[this.names.runs].nodes[0];
    if (!run) {
      throw new Error(`run ${runId} not found, or not visible to this user`);
    }
    return run;
  }

  async read(
    runId: string,
    cursor: RunLogCursor = START,
    limit?: number
  ): Promise<RunLogPage> {
    const data = await this.request<Record<string, { nodes: unknown[] }>>(
      eventsDocument(this.names),
      {
        first: limit ?? DEFAULT_READ_LIMIT,
        where: {
          runId: { equalTo: runId },
          seq: { greaterThan: cursor.afterSeq },
        },
      }
    );
    const records = data[this.names.events].nodes.map((node) =>
      assertRunEventRecord(node, this.readers)
    );
    return {
      records,
      cursor: {
        afterSeq:
          records.length > 0
            ? records[records.length - 1].seq
            : cursor.afterSeq,
      },
    };
  }

  /**
   * Append entries, allocating `seq` from the run's cursor and advancing it.
   *
   * Two writers racing is normal here (a user sends a message while the Job
   * appends a result), so the sequence is not reserved up front: each insert is
   * attempted at the next free position and a rejected one re-reads the run.
   * Entries already present by entry id are skipped, so a retried call is a
   * no-op rather than a duplicated turn.
   */
  async append(
    runId: string,
    entries: readonly TranscriptEntry[],
    options?: AppendOptions
  ): Promise<RunEventRecord[]> {
    if (entries.length === 0) return [];
    const written: RunEventRecord[] = [];
    let pending = [...entries];

    for (let attempt = 0; attempt < this.maxAppendAttempts; attempt += 1) {
      const run = await this.getRun(runId);
      pending = await this.dropAlreadyWritten(runId, run, pending);
      if (pending.length === 0) break;

      let seq = run.lastEventSeq;
      try {
        while (pending.length > 0) {
          seq += 1;
          written.push(
            await this.insertEvent(runId, seq, pending[0], options)
          );
          pending = pending.slice(1);
        }
      } catch (error) {
        if (!isSeqConflict(error)) throw error;
        continue;
      }
      await this.advanceRun(runId, seq);
      return written;
    }

    if (pending.length > 0) {
      throw new Error(
        `run ${runId}: could not append ${pending.length} entr${
          pending.length === 1 ? 'y' : 'ies'
        } after ${this.maxAppendAttempts} attempts — the run's sequence is contended`
      );
    }
    return written;
  }

  /**
   * Append one pi message as an entry, chained to the run's current tail.
   *
   * The composer's own turn is the one place this store still writes a
   * transcript rather than relaying one, so it writes the format it declares in
   * `insertEvent`; a second harness contributes its own message builder beside
   * this one and appends through the neutral `append`.
   */
  async appendMessage(
    runId: string,
    message: PiMessage,
    options?: AppendOptions
  ): Promise<RunEventRecord[]> {
    const parentId = await this.tailEntryId(runId);
    const entry: TranscriptEntry = {
      id: this.newId(),
      parentId,
      timestamp: this.now().toISOString(),
      type: 'message',
      message,
    };
    return this.append(runId, [entry], options);
  }

  /** The user's turn: what a run surface's composer sends. */
  async prompt(runId: string, text: string): Promise<RunEventRecord[]> {
    if (!text.trim()) throw new Error('cannot append an empty prompt');
    return this.appendMessage(runId, {
      role: 'user',
      content: text,
      timestamp: this.now().getTime(),
    });
  }

  /**
   * Answer a pending approval. The decision is a log entry like any other, so
   * the Job sees it on its next cursor read and the history records who allowed
   * what — there is no side channel to reconcile.
   */
  async resolveApproval(
    runId: string,
    input: ApprovalResolutionInput
  ): Promise<RunEventRecord[]> {
    return this.appendMessage(runId, approvalResolutionMessage(input));
  }

  private async insertEvent(
    runId: string,
    seq: number,
    entry: TranscriptEntry,
    options?: AppendOptions
  ): Promise<RunEventRecord> {
    const data = await this.request<Record<string, Record<string, unknown>>>(
      appendDocument(this.names),
      {
        input: {
          [this.names.event]: {
            runId,
            seq,
            recordedAt: options?.recordedAt ?? this.now().toISOString(),
            // A caller that read its entries out of a harness names that
            // harness's format; only the composer path below leaves it unset,
            // which is why the fallback is pi's.
            transcriptFormat: options?.transcriptFormat ?? PI_TRANSCRIPT_FORMAT,
            transcriptVersion: options?.transcriptVersion ?? SUPPORTED_PI_TRANSCRIPT_VERSION,
            entry,
          },
        },
      }
    );
    return assertRunEventRecord(
      data[this.names.createEvent][this.names.event],
      this.readers
    );
  }

  private async advanceRun(runId: string, seq: number): Promise<void> {
    await this.request(advanceRunDocument(this.names), {
      input: { id: runId, [this.names.runPatch]: { lastEventSeq: seq } },
    });
  }

  /**
   * Skip entries a previous attempt already wrote. Only the tail is inspected —
   * as many records as the call is trying to append — because that is where a
   * partially applied attempt of *this* call can be, and scanning the whole run
   * to make a retry idempotent would make every append cost the run's length.
   */
  private async dropAlreadyWritten(
    runId: string,
    run: RunSummary,
    pending: readonly TranscriptEntry[]
  ): Promise<TranscriptEntry[]> {
    const ids = pending.map(entryId).filter((id): id is string => !!id);
    if (ids.length === 0 || run.lastEventSeq === 0) return [...pending];
    const window = Math.max(0, run.lastEventSeq - pending.length);
    const page = await this.read(runId, { afterSeq: window }, pending.length);
    const present = new Set(
      page.records.map((record) => entryId(record.entry)).filter(Boolean)
    );
    return pending.filter((entry) => {
      const id = entryId(entry);
      return !id || !present.has(id);
    });
  }

  private async tailEntryId(runId: string): Promise<string | null> {
    const run = await this.getRun(runId);
    if (run.lastEventSeq === 0) return null;
    const page = await this.read(runId, { afterSeq: run.lastEventSeq - 1 }, 1);
    const last = page.records[page.records.length - 1];
    return last ? (entryId(last.entry) ?? null) : null;
  }
}

export const createRunLogClient = (
  options: RunLogClientOptions
): GraphqlRunLogClient => new GraphqlRunLogClient(options);
