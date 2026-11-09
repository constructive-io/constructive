/**
 * Integration tests — `uploadFile`'s optional `databaseId`, over HTTP with signed-in users.
 *
 * A database-scope plane can be shared: one buckets/files pair hosted by the
 * storage host's database (the request's database claim) holds the rows of
 * many databases, keyed by `database_id`. `databaseId` on the input selects
 * which database's row the upload lands in; identity stays on the session.
 * Membership — the plane's RLS, under the request role — decides whether the
 * caller may write there:
 *
 *   - a member of A uploads into A's default bucket, and the file row is A's;
 *   - the same member naming B is refused;
 *   - an anonymous caller naming A is refused.
 *
 *   pnpm test -- --testPathPattern=upload-database-selector
 */

import { hashContent } from '@constructive-io/upload-client';
import path from 'path';
import type { PgTestClient } from 'pgsql-test';
import type supertest from 'supertest';

import { getConnections, seed } from '../src';

jest.setTimeout(120000);

const localSeedRoot = path.join(__dirname, '..', '__fixtures__', 'seed');
const sharedSeedRoot = path.join(__dirname, '..', '..', '..', '__fixtures__', 'seed');
const pgpmWorkspace = path.join(sharedSeedRoot, '..', '..');
const sql = (file: string) => path.join(localSeedRoot, 'shared-db-scope-storage', file);

const hostDatabaseId = '5a4ed000-0000-4000-8000-000000000001';
const databaseA = '5a4ed000-0000-4000-8000-00000000000a';
const databaseB = '5a4ed000-0000-4000-8000-00000000000b';
const schema = 'shared-storage-public';

const UPLOAD_FILE = `
  mutation UploadFile($input: UploadFileInput!) {
    uploadFile(input: $input) {
      uploadUrl
      fileId
      deduplicated
    }
  }
`;

describe('uploadFile databaseId selector', () => {
  let request: supertest.Agent;
  let pg: PgTestClient;
  let teardown: () => Promise<void>;
  let contentHash: string;

  const upload = (token: string | null, databaseId: string, filename: string) => {
    const req = request
      .post('/graphql')
      .set('X-Database-Id', hostDatabaseId)
      .set('X-Api-Name', 'shared-storage');
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req.send({
      query: UPLOAD_FILE,
      variables: {
        input: { databaseId, isPublic: true, contentHash, contentType: 'image/png', size: 4, filename }
      }
    });
  };

  beforeAll(async () => {
    ({ request, pg, teardown } = await getConnections(
      {
        schemas: [schema],
        authRole: 'anonymous',
        server: { useRouting: true, api: { isPublic: false, metaSchemas: ['catalog_private', 'routing_public', 'apps_public', 'metaschema_public', 'metaschema_modules_public'] } }
      },
      [seed.pgpm(pgpmWorkspace), seed.sqlfile([sql('schema.sql'), sql('test-data.sql')])]
    ));
    contentHash = await hashContent('logo');
  });

  afterAll(async () => {
    if (teardown) await teardown();
  });

  it('lets a member of A upload into A', async () => {
    const res = await upload('alice-token', databaseA, 'logo.png');
    expect(res.body.errors).toBeUndefined();
    const payload = res.body.data.uploadFile;
    expect(payload.uploadUrl).toBeTruthy();
    expect(payload.deduplicated).toBe(false);

    const row = await pg.one<{ database_id: string; bucket_id: string; status: string }>(
      `SELECT database_id, bucket_id, status FROM "${schema}".files WHERE id = $1`,
      [payload.fileId]
    );
    expect(row).toEqual({
      database_id: databaseA,
      bucket_id: '5a4ed900-0000-4000-8000-0000000000a2',
      status: 'requested'
    });
  });

  it('refuses a member of A who names B', async () => {
    const res = await upload('alice-token', databaseB, 'foreign.png');
    expect(res.body.data?.uploadFile ?? null).toBeNull();
    expect(res.body.errors?.[0]?.message).toBe('DATABASE_ACCESS_DENIED');
    const rows = await pg.any(`SELECT id FROM "${schema}".files WHERE database_id = $1`, [databaseB]);
    expect(rows).toEqual([]);
  });

  it('refuses an anonymous caller', async () => {
    const res = await upload(null, databaseA, 'anonymous.png');
    expect(res.body.data?.uploadFile ?? null).toBeNull();
    expect(res.body.errors?.[0]?.message).toBe('DATABASE_ACCESS_DENIED');
    const rows = await pg.any(`SELECT id FROM "${schema}".files WHERE filename = 'anonymous.png'`);
    expect(rows).toEqual([]);
  });
});
