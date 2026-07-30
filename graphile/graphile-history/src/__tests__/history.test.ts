/**
 * Integration tests for graphile-history v5 plugin.
 *
 * Uses graphile-test with a real PostgreSQL database to verify:
 * - @history smart tag discovery
 * - `history` connection ordered by recorded_at DESC
 * - `versionAt(at)` point-in-time reads
 * - `restore<Table>Version` mutation (update + reinsert), which is itself
 *   recorded by the source trigger.
 */

import type { GraphQLResponse } from 'graphile-test';
import { getConnections, seed } from 'graphile-test';
import { join } from 'path';

import { createHistoryPlugin } from '../plugin';

type QueryFn = <TResult = unknown>(
  query: string,
  variables?: Record<string, unknown>,
  commit?: boolean,
  reqOptions?: Record<string, unknown>
) => Promise<GraphQLResponse<TResult>>;

interface Version {
  title: string | null;
  body: string | null;
  recordedAt: string | null;
  historyOp: string | null;
}

describe('graphile-history plugin', () => {
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const historyPlugin = createHistoryPlugin();

    const connections = await (getConnections as any)(
      {
        schemas: ['history_test'],
        preset: { plugins: [historyPlugin] },
        useRoot: true,
        authRole: 'postgres'
      },
      [seed.sqlfile([join(__dirname, './setup.sql')])]
    );

    teardown = connections.teardown;
    query = connections.query;
  });

  afterAll(async () => {
    await teardown();
  });

  it('exposes the full version history newest-first', async () => {
    const result = await query<{ postByRowId: { title: string; history: Version[] } }>(
      `
        query ($id: Int!) {
          postByRowId(rowId: $id) {
            title
            history {
              title
              body
              recordedAt
              historyOp
            }
          }
        }
      `,
      { id: 1 }
    );

    expect(result.errors).toBeUndefined();
    const post = result.data!.postByRowId;
    expect(post.history).toHaveLength(3);
    // Newest first
    expect(post.history[0].title).toBe('Hello World v3');
    expect(post.history[0].historyOp).toBe('UPDATE');
    expect(post.history[2].title).toBe('Hello World');
    expect(post.history[2].historyOp).toBe('INSERT');
    // Descending recorded_at
    const times = post.history.map((h: Version) => new Date(h.recordedAt!).getTime());
    expect(times[0]).toBeGreaterThan(times[1]);
    expect(times[1]).toBeGreaterThan(times[2]);
  });

  it('resolves versionAt to the version current at a point in time', async () => {
    const result = await query<{ postByRowId: { versionAt: Version } }>(
      `
        query ($id: Int!, $at: Datetime!) {
          postByRowId(rowId: $id) {
            versionAt(at: $at) {
              title
              historyOp
              recordedAt
            }
          }
        }
      `,
      { id: 1, at: '2024-02-15T00:00:00Z' }
    );

    expect(result.errors).toBeUndefined();
    const v = result.data!.postByRowId.versionAt;
    // Between v2 (2024-02-01) and v3 (2024-03-01) → v2 is current
    expect(v.title).toBe('Hello World v2');
    expect(v.historyOp).toBe('UPDATE');
  });

  it('returns versions within a time window, newest-first', async () => {
    // Narrow window straddling only v2 (2024-02-01).
    const narrow = await query<{ postByRowId: { versionsBetween: Version[] } }>(
      `
        query ($id: Int!, $from: Datetime!, $to: Datetime!) {
          postByRowId(rowId: $id) {
            versionsBetween(from: $from, to: $to) {
              title
              historyOp
              recordedAt
            }
          }
        }
      `,
      { id: 1, from: '2024-01-15T00:00:00Z', to: '2024-02-15T00:00:00Z' }
    );
    expect(narrow.errors).toBeUndefined();
    const one = narrow.data!.postByRowId.versionsBetween;
    expect(one).toHaveLength(1);
    expect(one[0].title).toBe('Hello World v2');

    // Wider window covering all three versions, newest-first.
    const wide = await query<{ postByRowId: { versionsBetween: Version[] } }>(
      `
        query ($id: Int!, $from: Datetime!, $to: Datetime!) {
          postByRowId(rowId: $id) {
            versionsBetween(from: $from, to: $to) { title }
          }
        }
      `,
      { id: 1, from: '2024-01-01T00:00:00Z', to: '2024-03-01T00:00:00Z' }
    );
    expect(wide.errors).toBeUndefined();
    const all = wide.data!.postByRowId.versionsBetween;
    expect(all.map((v: Version) => v.title)).toEqual([
      'Hello World v3',
      'Hello World v2',
      'Hello World'
    ]);
  });

  it('restores a live row to an earlier version and records the restore', async () => {
    const result = await query<{
      restorePostVersion: { version: Version; restored: Version };
    }>(
      `
        mutation ($input: RestorePostVersionInput!) {
          restorePostVersion(input: $input) {
            version { title }
            restored { title body }
          }
        }
      `,
      { input: { id: 1, recordedAt: '2024-02-15T00:00:00Z' } },
      true
    );

    expect(result.errors).toBeUndefined();
    const payload = result.data!.restorePostVersion;
    expect(payload.version.title).toBe('Hello World v2');
    expect(payload.restored.title).toBe('Hello World v2');
    expect(payload.restored.body).toBe('Body v2');

    // The restore wrote through the source table, so the trigger appended a
    // new version — history now has 4 rows and the newest matches the restore.
    const after = await query<{ postByRowId: { title: string; history: Version[] } }>(
      `
        query {
          postByRowId(rowId: 1) {
            title
            history { title historyOp }
          }
        }
      `
    );
    expect(after.errors).toBeUndefined();
    const post = after.data!.postByRowId;
    expect(post.title).toBe('Hello World v2');
    expect(post.history).toHaveLength(4);
    expect(post.history[0].title).toBe('Hello World v2');
    expect(post.history[0].historyOp).toBe('UPDATE');
  });

  it('reinserts a deleted row when reinsert is requested', async () => {
    // Delete post 2 (trigger records a DELETE tombstone).
    const del = await query(
      `mutation { deletePostByRowId(input: { rowId: 2 }) { deletedPostId } }`,
      {},
      true
    );
    expect(del.errors).toBeUndefined();

    // Restore it from its INSERT version with reinsert: true.
    const result = await query<{ restorePostVersion: { restored: Version | null } }>(
      `
        mutation ($input: RestorePostVersionInput!) {
          restorePostVersion(input: $input) {
            restored { title body }
          }
        }
      `,
      { input: { id: 2, recordedAt: '2024-06-01T00:00:00Z', reinsert: true } },
      true
    );

    expect(result.errors).toBeUndefined();
    expect(result.data!.restorePostVersion.restored).not.toBeNull();
    expect(result.data!.restorePostVersion.restored!.title).toBe('Second Post');

    const check = await query<{ postByRowId: { title: string } | null }>(
      `query { postByRowId(rowId: 2) { title } }`
    );
    expect(check.errors).toBeUndefined();
    expect(check.data!.postByRowId).not.toBeNull();
    expect(check.data!.postByRowId!.title).toBe('Second Post');
  });
});
