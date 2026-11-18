/**
 * Integration tests: `downloadUrl` is handed out only for a file whose bytes a
 * reader can GET.
 *
 * A files row is written before its presigned PUT runs, and the confirm-upload
 * job settles its `status` after inspecting the object. A `requested` row may
 * name an object that never arrives, and a `rejected` row is a settled
 * failure, so neither may carry a download URL.
 *
 *   pnpm test -- --testPathPattern=download-url-status
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

const metaSchemas = [
  'catalog_private',
  'routing_public',
  'apps_public',
  'metaschema_public',
  'metaschema_modules_public'
];

const STATUSES = ['requested', 'uploaded', 'processed', 'rejected'];

const APP_FILES = `
  query AppFiles {
    appFiles {
      nodes {
        key
        downloadUrl
      }
    }
  }
`;

describe('downloadUrl by file status', () => {
  let request: supertest.Agent;
  let pg: PgTestClient;
  let teardown: () => Promise<void>;
  let urlByKey: Record<string, string | null>;

  beforeAll(async () => {
    ({ request, pg, teardown } = await getConnections(
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

    const res = await request
      .post('/graphql')
      .set('X-Database-Id', aliceDatabaseId)
      .set('X-Schemata', aliceSchema)
      .send({ query: APP_FILES });
    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    urlByKey = Object.fromEntries(
      res.body.data.appFiles.nodes.map((n: { key: string; downloadUrl: string | null }) => [
        n.key,
        n.downloadUrl
      ])
    );
  });

  afterAll(async () => {
    if (teardown) await teardown();
  });

  it.each(['uploaded', 'processed'])('signs a download URL for a %s file', (status) => {
    const url = urlByKey[`status-${status}`];
    expect(url).toEqual(expect.any(String));
    expect(new URL(url).pathname).toContain(`/status-${status}`);
  });

  it.each(['requested', 'rejected'])('returns no download URL for a %s file', (status) => {
    expect(urlByKey).toHaveProperty(`status-${status}`);
    expect(urlByKey[`status-${status}`]).toBeNull();
  });
});
