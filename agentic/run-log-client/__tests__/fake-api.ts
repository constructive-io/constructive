/**
 * A stand-in for the tenant API: the operations this package sends, over an
 * in-memory `agent_thread` + `agent_run` + `agent_event` set that enforces the
 * one constraint the append path depends on — `UNIQUE (run_id, seq)`.
 */

import type { TranscriptEntry } from '@agentic-kit/run-log';

import type { GraphqlRequest } from '../src/transport';

/** A stored row, in the columns the table has. */
export interface FakeEventRow {
  runId: string;
  seq: number;
  recordedAt: string;
  transcriptFormat: string;
  transcriptVersion: number;
  entry: TranscriptEntry;
}

/**
 * A row as the API selects it — the columns `EVENT_FIELDS` names, so the stand-in
 * projects the same way a server resolving that selection would.
 */
const selected = (row: FakeEventRow) => ({
  runId: row.runId,
  seq: row.seq,
  recordedAt: row.recordedAt,
  transcriptFormat: row.transcriptFormat,
  transcriptVersion: row.transcriptVersion,
  entry: row.entry,
});

export interface FakeRunRow {
  id: string;
  threadId: string | null;
  actorId: string | null;
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

export const RUN_ID = '11111111-1111-4111-8111-111111111111';

export const fakeRun = (overrides: Partial<FakeRunRow> = {}): FakeRunRow => ({
  id: RUN_ID,
  threadId: '22222222-2222-4222-8222-222222222222',
  actorId: '33333333-3333-4333-8333-333333333333',
  entityId: '33333333-3333-4333-8333-333333333333',
  status: 'running',
  placement: 'cloud',
  executionId: '44444444-4444-4444-8444-444444444444',
  repoUrl: 'https://git.example/db.git',
  branch: 'agent/run',
  baseCommit: 'abc123',
  headCommit: null,
  lastEventSeq: 0,
  attempt: 1,
  parentRunId: null,
  error: null,
  artifacts: null,
  deadlineAt: null,
  startedAt: '2026-01-01T00:00:00.000Z',
  finishedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

export const messageEntry = (
  id: string,
  text: string,
  parentId: string | null = null
): TranscriptEntry => ({
  id,
  parentId,
  timestamp: '2026-01-01T00:00:00.000Z',
  type: 'message',
  message: { role: 'user', content: text },
});

export interface FakeApi {
  request: GraphqlRequest;
  run: FakeRunRow;
  events: FakeEventRow[];
  /** Runs before an insert, so a test can let another writer win a race. */
  beforeInsert?: (row: FakeEventRow) => void;
  calls: string[];
  missing: boolean;
  /** Threads opened through `createThread`, in the order they were opened. */
  threads: { id: string; title: string | null; mode: string }[];
  /** Runs opened through `createRun`, keyed by the row the server returned. */
  created: FakeRunRow[];
}

export function fakeApi(run: FakeRunRow = fakeRun()): FakeApi {
  const api: FakeApi = {
    run,
    events: [],
    calls: [],
    missing: false,
    threads: [],
    created: [],
    request: undefined as unknown as GraphqlRequest,
  };

  api.request = (async <T>(
    query: string,
    variables: Record<string, unknown> = {}
  ): Promise<T> => {
    if (query.includes('query Run(')) {
      api.calls.push('run');
      return {
        agentRuns: { nodes: api.missing ? [] : [{ ...api.run }] },
      } as T;
    }
    if (query.includes('query Runs(')) {
      api.calls.push('runs');
      return { agentRuns: { nodes: [{ ...api.run }] } } as T;
    }
    if (query.includes('query RunEvents(')) {
      api.calls.push('events');
      const where = variables.where as {
        runId: { equalTo: string };
        seq: { greaterThan: number };
      };
      const afterSeq = where.seq.greaterThan;
      const first = variables.first as number;
      const nodes = api.events
        .filter(
          (row) => row.runId === where.runId.equalTo && row.seq > afterSeq
        )
        .sort((a, b) => a.seq - b.seq)
        .slice(0, first)
        .map(selected);
      return { agentEvents: { nodes } } as T;
    }
    if (query.includes('mutation AppendRunEvent(')) {
      api.calls.push('append');
      const input = variables.input as { agentEvent: FakeEventRow };
      const row = input.agentEvent;
      api.beforeInsert?.(row);
      if (api.events.some((e) => e.runId === row.runId && e.seq === row.seq)) {
        throw new Error(
          'duplicate key value violates unique constraint "agent_event_run_id_seq_key"'
        );
      }
      api.events.push(row);
      return { createAgentEvent: { agentEvent: selected(row) } } as T;
    }
    if (query.includes('mutation AdvanceRun(')) {
      api.calls.push('advance');
      const input = variables.input as {
        id: string;
        agentRunPatch: Partial<FakeRunRow>;
      };
      Object.assign(api.run, input.agentRunPatch);
      return { updateAgentRun: { agentRun: { ...api.run } } } as T;
    }
    if (query.includes('mutation CreateThread(')) {
      api.calls.push('createThread');
      const input = variables.input as {
        agentThread: { title?: string; mode: string };
      };
      const thread = {
        id: `thread-${api.threads.length + 1}`,
        title: input.agentThread.title ?? null,
        mode: input.agentThread.mode,
      };
      api.threads.push(thread);
      return {
        createAgentThread: {
          agentThread: { ...thread, createdAt: '2026-01-01T00:00:00.000Z' },
        },
      } as T;
    }
    if (query.includes('mutation CreateRun(')) {
      api.calls.push('createRun');
      const input = variables.input as { agentRun: Partial<FakeRunRow> };
      // The columns a host does not send are the table's defaults, which is why
      // a run that omits `placement` comes back as a cloud one.
      const row = fakeRun({
        id: `run-${api.created.length + 1}`,
        status: 'pending',
        placement: 'cloud',
        executionId: null,
        repoUrl: null,
        branch: null,
        baseCommit: null,
        startedAt: null,
        lastEventSeq: 0,
        ...input.agentRun,
      });
      api.created.push(row);
      api.run = row;
      return { createAgentRun: { agentRun: { ...row } } } as T;
    }
    throw new Error(`unexpected operation: ${query}`);
  }) as GraphqlRequest;

  return api;
}
