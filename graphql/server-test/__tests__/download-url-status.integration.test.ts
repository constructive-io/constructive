/**
 * Integration tests: `downloadUrl` is handed out only for a file whose bytes a
 * reader can GET.
 *
 * A files row is written before its presigned PUT runs, and the confirm-upload
 * job settles its `status` after inspecting the object. A `requested` row may
 * name an object that never arrives, and a `rejected` row is a settled
 * failure, so neither may carry a download URL.
 *
 *   pnpm test --runInBand --runTestsByPath __tests__/download-url-status.integration.test.ts
 */

import path from 'path';
import type { PgTestClient } from 'pgsql-test';
import type supertest from 'supertest';

import { getConnections, seed } from '../src';

jest.setTimeout(120000);

const localSeedRoot = path.join(__dirname, '..', '__fixtures__', 'seed');
const sharedSeedRoot = path.join(__dirname, '..', '..', '..', '__fixtures__', 'seed');
const sql = (seedDir: string, file: string) => path.join(localSeedRoot, seedDir, file);
const pgpmWorkspace = path.join(sharedSeedRoot, '..', '..');

const aliceDatabaseId = '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9';
const aliceSchema = 'simple-storage-public';
const alicePrivateBucketId = 'd0000001-0000-0000-0000-000000000002';

const bobDatabaseId = 'a1a1a1a1-b2b2-4c3c-d4d4-e5e5e5e5e5e5';
const bobSchema = 'bob-storage-public';
const bobPublicBucketId = 'd2d2d2d2-0000-0000-0000-000000000001';
const cdn = 'https://cdn.files.test';

const metaSchemas = [
  'catalog_private',
  'routing_public',
  'apps_public',
  'metaschema_public',
  'metaschema_modules_public'
];

const STATUSES = ['requested', 'uploaded', 'processed', 'rejected', 'superseded'];

const APP_FILES = `
  query AppFiles($version: String) {
    appFiles {
      nodes {
        key
        downloadUrl
        selected: downloadUrl(version: $version)
      }
    }
  }
`;

const manifest = (key: string) => {
  const version = (name: string, leaf: string, width: number) => ({
    name, key: `derived/${key}/${leaf}`, width, height: width, format: 'webp', size: 100
  });
  return {
    source: { width: 1024, height: 1024, format: 'png' },
    generated_at: '2026-01-01T00:00:00Z',
    versions: [
      version('large', 'large-abcd1234.webp', 640),
      version('small', 'small-0123abcd.webp', 160),
      version('duplicate', 'first.webp', 320),
      version('duplicate', 'second.webp', 400),
      { name: 'foreign', key: 'derived/another-file/small.webp' }
    ]
  };
};

describe('storage file downloadUrl', () => {
  let request: supertest.Agent;
  let pg: PgTestClient;
  let db: PgTestClient;
  let teardown: () => Promise<void>;
  const files = async (databaseId: string, schema: string, version?: string | null) => {
    const res = await request
      .post('/graphql')
      .set('X-Database-Id', databaseId)
      .set('X-Schemata', schema)
      .send({ query: APP_FILES, variables: { version } });
    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    const nodes: { key: string; downloadUrl: string | null; selected: string | null }[] = res.body.data.appFiles.nodes;
    return new Map(nodes.map((node) => [node.key, node]));
  };

  beforeAll(async () => {
    ({ request, pg, db, teardown } = await getConnections(
      {
        schemas: [aliceSchema],
        authRole: 'anonymous',
        server: {
          useRouting: true,
          api: {
            isPublic: false,
            metaSchemas
          }
        }
      },
      [
        seed.pgpm(pgpmWorkspace),
        seed.sqlfile([
          sql('simple-seed-storage', 'schema.sql'),
          sql('simple-seed-storage', 'test-data.sql'),
          sql('simple-seed-storage', 'auth-provision.sql')
        ])
      ]
    ));

    for (const status of STATUSES) {
      await pg.query(
        `INSERT INTO "${aliceSchema}".app_files
           (bucket_id, key, content_hash, mime_type, filename, status)
         VALUES ($1, $2, $2, 'text/plain', $3, $4)`,
        [alicePrivateBucketId, `status-${status}`, `${status}.txt`, status]
      );
    }

    // Keep Alice's storage table on the legacy schema. Only Bob has the worker's side column.
    await pg.query(`ALTER TABLE "${bobSchema}".app_files ADD COLUMN image_versions jsonb`);
    await pg.query('UPDATE metaschema_modules_public.storage_module SET public_url_prefix = $1 WHERE database_id = $2', [
      cdn, bobDatabaseId
    ]);
    for (const status of STATUSES) {
      const key = `status-${status}`;
      await pg.query(
        `INSERT INTO "${bobSchema}".app_files
           (bucket_id, key, content_hash, mime_type, filename, status, image_versions)
         VALUES ($1, $2, $2, 'image/png', 'original.png', $3, $4)`,
        [bobPublicBucketId, key, status, manifest(key)]
      );
    }
    await pg.query(
      `INSERT INTO "${bobSchema}".app_files (bucket_id, key, content_hash, mime_type, status, image_versions)
       VALUES ($1, 'no-manifest', 'old', 'image/png', 'uploaded', NULL),
              ($1, 'malformed', 'bad', 'image/png', 'processed', '{"versions": {}}'::jsonb)`,
      [bobPublicBucketId]
    );
    for (const key of ['seeded-public-hash', 'seeded-private-hash']) {
      await pg.query(`UPDATE "${bobSchema}".app_files SET mime_type = 'image/png', status = 'processed', image_versions = $2 WHERE key = $1`, [
        key, manifest(key)
      ]);
    }
  });

  beforeEach(async () => {
    await pg.beforeEach();
    await db.beforeEach();
  });

  afterEach(async () => {
    await db.afterEach();
    await pg.afterEach();
  });

  afterAll(async () => {
    if (teardown) await teardown();
  });

  it('serves the original on a table without image_versions and returns null for a named version', async () => {
    const rows = await files(aliceDatabaseId, aliceSchema, 'small');
    for (const status of ['uploaded', 'processed']) {
      const row = rows.get(`status-${status}`);
      expect(new URL(row.downloadUrl).pathname).toBe(`/app-80a2eaaf-private-cc079c527e7d/status-${status}`);
      expect(row.selected).toBeNull();
    }
    for (const status of ['requested', 'rejected', 'superseded']) {
      expect(rows.get(`status-${status}`)).toMatchObject({ downloadUrl: null, selected: null });
    }
  });

  it.each([undefined, null])('serves the original for version %p', async (version) => {
    const row = (await files(bobDatabaseId, bobSchema, version)).get('status-uploaded');
    for (const value of [row.downloadUrl, row.selected]) {
      const url = new URL(value);
      expect(url.pathname).toMatch(/\/status-uploaded$/);
      expect(url.searchParams.get('response-content-disposition')).toContain('original.png');
    }
  });

  it('signs the named artifact for live files and withholds both URLs for unsettled or rejected files', async () => {
    const rows = await files(bobDatabaseId, bobSchema, 'small');
    for (const status of ['uploaded', 'processed']) {
      const url = new URL(rows.get(`status-${status}`).selected);
      expect(url.pathname).toBe(`/app-a1a1a1a1-public-4db6afbff1a2/derived/status-${status}/small-0123abcd.webp`);
      expect(url.searchParams.get('X-Amz-Signature')).toEqual(expect.any(String));
      expect(url.searchParams.get('response-content-disposition')).toBe('attachment; filename="small-0123abcd.webp"');
    }
    for (const status of ['requested', 'rejected', 'superseded']) {
      expect(rows.get(`status-${status}`)).toMatchObject({ downloadUrl: null, selected: null });
    }
  });

  it('returns the public artifact URL and respects the reader’s file visibility', async () => {
    const rows = await files(bobDatabaseId, bobSchema, 'large');
    expect(rows.get('seeded-public-hash').selected).toBe(
      `${cdn}/app-a1a1a1a1-public-4db6afbff1a2/derived/seeded-public-hash/large-abcd1234.webp`
    );
    expect(rows.has('seeded-private-hash')).toBe(false);
  });

  it('serves only the source when a live row lacks a usable versions array', async () => {
    const rows = await files(bobDatabaseId, bobSchema, 'small');
    for (const key of ['no-manifest', 'malformed']) {
      expect(rows.get(key)).toMatchObject({ downloadUrl: expect.any(String), selected: null });
    }
  });

  it.each(['missing', 'Small', '', 'duplicate', 'foreign'])('returns null for an unavailable version %p', async (version) => {
    const row = (await files(bobDatabaseId, bobSchema, version)).get('status-processed');
    expect(row).toMatchObject({ downloadUrl: expect.any(String), selected: null });
  });
});
