/**
 * Round-trip tests over the committed __fixtures__/generated output: the
 * generated decoders, converters, serializers and enum checkers, exercised
 * against literal values and against real rows read back from PostgreSQL.
 */
import { CoerceError } from '@constructive-io/coerce';
import { join } from 'path';
import { getConnections, seed } from 'pgsql-test';
import type { PgTestClient } from 'pgsql-test/test-client';

import type { AgentRuns } from '../__fixtures__/generated/codegen_test/agent-runs';
import {
  AGENT_RUNS_FIELDS,
  AGENT_RUNS_TABLE,
  agentRunsFromRow,
  decodeAgentRuns,
  decodeAgentRunsFromRow,
  decodeAgentRunsRow,
  serializeAgentRuns
} from '../__fixtures__/generated/codegen_test/agent-runs';
import {
  asRunStatus,
  requireRunStatus,
  RUN_STATUS
} from '../__fixtures__/generated/codegen_test/enums';
import { decodeUsersFromRow } from '../__fixtures__/generated/codegen_test/users';

const sql = (f: string) => join(__dirname, '/../sql', f);

const RUN_ID = 'f4b8c67a-58d3-4b3a-9c2e-8f1d2a3b4c5d';
const THREAD_ID = '0b9f8e7d-6c5b-4a39-8271-6f5e4d3c2b1a';

const validCamel: AgentRuns = {
  id: RUN_ID,
  threadId: THREAD_ID,
  status: 'running',
  tags: ['alpha', 'beta'],
  retrySeconds: [5, 30],
  metadata: { attempt: 1 },
  settings: null,
  lastEventSeq: 42,
  score: 0.75,
  startedAt: '2026-01-01T00:00:00.000Z',
  finishedAt: null
};

const validRow: Record<string, unknown> = {
  id: RUN_ID,
  thread_id: THREAD_ID,
  status: 'queued',
  tags: [],
  retry_seconds: null,
  metadata: {},
  settings: { theme: 'dark' },
  last_event_seq: '9007199254740', // bigint arrives as text from pg
  score: '0.7500',
  started_at: null,
  finished_at: null
};

describe('decodeAgentRuns (camelCase envelope)', () => {
  it('decodes a valid envelope', () => {
    expect(decodeAgentRuns(validCamel)).toEqual(validCamel);
  });

  it('throws a CoerceError naming the missing field', () => {
    const withoutThread: Record<string, unknown> = { ...validCamel };
    delete withoutThread.threadId;
    expect(() => decodeAgentRuns(withoutThread)).toThrow(CoerceError);
    expect(() => decodeAgentRuns(withoutThread)).toThrow(
      'codegen_test.agent_runs.threadId is required'
    );
  });

  it('uses the caller label in errors', () => {
    expect(() => decodeAgentRuns({}, 'POST /runs answered')).toThrow(
      'POST /runs answered.id is required'
    );
  });

  it('rejects a wrong-typed field', () => {
    expect(() => decodeAgentRuns({ ...validCamel, lastEventSeq: 'not-a-number' })).toThrow(
      CoerceError
    );
    expect(() => decodeAgentRuns({ ...validCamel, id: 'not-a-uuid' })).toThrow(
      'codegen_test.agent_runs.id is required (expected a UUID)'
    );
  });

  it('rejects a value outside the enum', () => {
    expect(() => decodeAgentRuns({ ...validCamel, status: 'exploded' })).toThrow(
      'expected one of queued, running, succeeded, failed'
    );
  });

  it('rejects an array with a malformed entry', () => {
    expect(() => decodeAgentRuns({ ...validCamel, tags: ['ok', 5] })).toThrow(
      'codegen_test.agent_runs.tags is required (expected an array of non-empty strings)'
    );
  });

  it('passes nullable columns through as null when absent', () => {
    const decoded = decodeAgentRuns({ ...validCamel, retrySeconds: undefined, score: undefined });
    expect(decoded.retrySeconds).toBeNull();
    expect(decoded.score).toBeNull();
  });

  it('rejects a non-object', () => {
    expect(() => decodeAgentRuns('nope')).toThrow(CoerceError);
    expect(() => decodeAgentRuns(null)).toThrow(CoerceError);
  });
});

describe('decodeAgentRunsRow / agentRunsFromRow', () => {
  it('decodes a snake_case row, parsing the text forms pg returns', () => {
    const row = decodeAgentRunsRow(validRow);
    expect(row.last_event_seq).toBe(9007199254740);
    expect(row.score).toBe(0.75);
  });

  it('converts a row to the camelCase shape', () => {
    const run = agentRunsFromRow(decodeAgentRunsRow(validRow));
    expect(run.threadId).toBe(THREAD_ID);
    expect(run.lastEventSeq).toBe(9007199254740);
    expect(run.settings).toEqual({ theme: 'dark' });
  });

  it('decodeAgentRunsFromRow composes both', () => {
    expect(decodeAgentRunsFromRow(validRow)).toEqual(agentRunsFromRow(decodeAgentRunsRow(validRow)));
  });
});

describe('serializeAgentRuns', () => {
  it('maps camelCase fields onto snake_case columns', () => {
    expect(serializeAgentRuns({ threadId: THREAD_ID, lastEventSeq: 7 })).toEqual({
      thread_id: THREAD_ID,
      last_event_seq: 7
    });
  });

  it('keeps absent fields absent and null fields null', () => {
    expect(serializeAgentRuns({})).toEqual({});
    expect(serializeAgentRuns({ finishedAt: null })).toEqual({ finished_at: null });
  });
});

describe('table metadata', () => {
  it('carries columns, primary key and the field mapping', () => {
    expect(AGENT_RUNS_TABLE.qualifiedName).toBe('codegen_test.agent_runs');
    expect(AGENT_RUNS_TABLE.primaryKey).toEqual(['id']);
    expect(AGENT_RUNS_TABLE.columns).toContain('last_event_seq');
    expect(AGENT_RUNS_TABLE.columnByField.lastEventSeq).toBe('last_event_seq');
  });
});

describe('per-column field decoders', () => {
  it('decodes one column of a projection a record decoder could not describe', () => {
    const joined = { run_id: RUN_ID, status: 'running', thread_name: 'main' };
    expect(AGENT_RUNS_FIELDS.id(joined.run_id)).toBe(RUN_ID);
    expect(AGENT_RUNS_FIELDS.status(joined.status)).toBe('running');
  });

  it('parses the text forms pg returns, as the row decoder does', () => {
    expect(AGENT_RUNS_FIELDS.lastEventSeq('9007199254740')).toBe(9007199254740);
    expect(AGENT_RUNS_FIELDS.score('0.7500')).toBe(0.75);
  });

  it('throws naming the column when a NOT NULL column is absent', () => {
    expect(() => AGENT_RUNS_FIELDS.id(undefined)).toThrow(
      'agent_runs.id is required (expected a UUID)'
    );
    expect(() => AGENT_RUNS_FIELDS.status('exploded')).toThrow(CoerceError);
  });

  it('takes an overridden label so a projection can name its own alias', () => {
    expect(() => AGENT_RUNS_FIELDS.id(null, 'thread_run.run_id')).toThrow(
      'thread_run.run_id is required (expected a UUID)'
    );
  });

  it('answers null for a nullable column rather than throwing', () => {
    expect(AGENT_RUNS_FIELDS.finishedAt(null)).toBeNull();
    expect(AGENT_RUNS_FIELDS.settings(undefined)).toBeNull();
  });

  it('agrees with the row decoder on every column of a whole row', () => {
    const row: Record<string, unknown> = { ...decodeAgentRunsRow(validRow) };
    for (const [field, column] of Object.entries(AGENT_RUNS_TABLE.columnByField)) {
      const decode = AGENT_RUNS_FIELDS[field as keyof typeof AGENT_RUNS_FIELDS];
      expect(decode(validRow[column])).toEqual(row[column]);
    }
  });
});

describe('enum checkers', () => {
  it('narrows valid members and rejects others', () => {
    expect(RUN_STATUS).toEqual(['queued', 'running', 'succeeded', 'failed']);
    expect(asRunStatus('failed')).toBe('failed');
    expect(asRunStatus('nope')).toBeNull();
    expect(requireRunStatus('queued', 'run.status')).toBe('queued');
    expect(() => requireRunStatus('nope', 'run.status')).toThrow(CoerceError);
  });
});

describe('against real database rows', () => {
  let teardown: () => Promise<void>;
  let pg: PgTestClient;

  beforeAll(async () => {
    ({ pg, teardown } = await getConnections({}, [seed.sqlfile([sql('test.sql')])]));
  });

  afterAll(() => teardown());

  it('round-trips an inserted agent_runs row through the generated decoder', async () => {
    const inserted = serializeAgentRuns({
      id: RUN_ID,
      threadId: THREAD_ID,
      status: 'running',
      tags: ['alpha', 'beta'],
      retrySeconds: [5, 30],
      metadata: { attempt: 1 },
      lastEventSeq: 42,
      score: 0.75,
      startedAt: '2026-01-01T00:00:00.000Z'
    });
    const columns = Object.keys(inserted);
    const placeholders = columns.map((_, index) => `$${index + 1}`);
    await pg.query(
      `INSERT INTO codegen_test.agent_runs (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
      columns.map(column => {
        const value = (inserted as Record<string, unknown>)[column];
        return value !== null && typeof value === 'object' && !Array.isArray(value)
          ? JSON.stringify(value)
          : value;
      })
    );

    const { rows } = await pg.query('SELECT * FROM codegen_test.agent_runs WHERE id = $1', [RUN_ID]);
    const run = decodeAgentRunsFromRow(rows[0]);

    expect(run.id).toBe(RUN_ID);
    expect(run.threadId).toBe(THREAD_ID);
    expect(run.status).toBe('running');
    expect(run.tags).toEqual(['alpha', 'beta']);
    expect(run.retrySeconds).toEqual([5, 30]);
    expect(run.metadata).toEqual({ attempt: 1 });
    expect(run.settings).toBeNull();
    expect(run.lastEventSeq).toBe(42);
    expect(run.score).toBe(0.75);
    expect(run.startedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(run.finishedAt).toBeNull();
  });

  it('decodes a users row with serial, citext and a domain column', async () => {
    await pg.query(
      "INSERT INTO codegen_test.users (username, email) VALUES ('alice', 'alice@example.com')"
    );
    const { rows } = await pg.query("SELECT * FROM codegen_test.users WHERE username = 'alice'");
    const user = decodeUsersFromRow(rows[0]);
    expect(user.id).toEqual(expect.any(Number));
    expect(user.username).toBe('alice');
    expect(user.email).toBe('alice@example.com');
    expect(new Date(user.createdAt).getTime()).not.toBeNaN();
  });
});
