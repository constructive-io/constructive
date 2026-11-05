/**
 * Integration tests — `image` / `upload` / `attachment` columns through the
 * routed server.
 *
 * A file reaches a column through the presigned path: the upload mutation
 * creates the files row, the client PUTs the bytes, and an ordinary update
 * writes the projection document. The mutation inputs therefore carry only the
 * column itself; there is no second, streaming input on the mutation and no
 * multipart body on /graphql.
 *
 *   pnpm test -- --testPathPattern=upload-columns
 */

import { createS3Bucket, createS3Client } from '@constructive-io/s3-utils';
import { hashContent, putToPresignedUrl } from '@constructive-io/upload-client';
import path from 'path';
import type supertest from 'supertest';

import { getConnections, seed } from '../src';

jest.setTimeout(120000);

const sharedSeedRoot = path.join(__dirname, '..', '..', '..', '__fixtures__', 'seed');
const localSeedRoot = path.join(__dirname, '..', '__fixtures__', 'seed');
const pgpmWorkspace = path.join(sharedSeedRoot, '..', '..');

// Alice's database: `simple-seed-storage` gives it a storage module and buckets.
const databaseId = '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9';
const storageSchema = 'simple-storage-public';
const schema = 'upload_columns';
const metaSchemas = [
  'catalog_private',
  'routing_public',
  'apps_public',
  'metaschema_public',
  'metaschema_modules_public'
];

const INPUT_FIELDS = `
  query InputFields($name: String!) {
    __type(name: $name) {
      inputFields {
        name
        type { name ofType { name } }
      }
    }
  }
`;

const UPLOAD_APP_FILE = `
  mutation UploadAppFile($input: UploadAppFileInput!) {
    uploadAppFile(input: $input) {
      fileId
      key
      uploadUrl
    }
  }
`;

const UPDATE_PRODUCT = `
  mutation UpdateProduct($input: UpdateProductInput!) {
    updateProduct(input: $input) {
      product { id title photo manual brochure }
    }
  }
`;

const fieldNames = (res: supertest.Response): string[] =>
  res.body.data.__type.inputFields.map((f: { name: string }) => f.name);

describe('image / upload / attachment columns', () => {
  let request: supertest.Agent;
  let pg: { query: (text: string, values?: unknown[]) => Promise<{ rows: any[] }> };
  let teardown: () => Promise<void>;

  const post = () =>
    request
      .post('/graphql')
      .set('X-Database-Id', databaseId)
      .set('X-Schemata', [storageSchema, schema].join(','));

  beforeAll(async () => {
    ({ request, pg, teardown } = await getConnections(
      {
        schemas: [storageSchema, schema],
        authRole: 'anonymous',
        server: { useRouting: true, api: { isPublic: false, metaSchemas } }
      },
      [
        seed.pgpm(pgpmWorkspace),
        seed.sqlfile([
          path.join(localSeedRoot, 'simple-seed-storage', 'schema.sql'),
          path.join(localSeedRoot, 'simple-seed-storage', 'test-data.sql'),
          path.join(localSeedRoot, 'upload-columns', 'schema.sql')
        ])
      ]
    ));
  });

  afterAll(async () => {
    if (teardown) await teardown();
  });

  it('builds a schema for a table whose columns use every storage document type', async () => {
    const res = await post().send({ query: INPUT_FIELDS, variables: { name: 'ProductPatch' } });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(fieldNames(res)).toEqual(['id', 'title', 'photo', 'manual', 'brochure']);
  });

  it('emits only the column on the create input, with no streaming companion', async () => {
    const res = await post().send({ query: INPUT_FIELDS, variables: { name: 'ProductInput' } });

    expect(res.body.errors).toBeUndefined();
    expect(fieldNames(res)).toEqual(['id', 'title', 'photo', 'manual', 'brochure']);
  });

  it('does not register an Upload scalar', async () => {
    const res = await post().send({ query: `{ __type(name: "Upload") { name } }` });

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.__type).toBeNull();
  });

  it('writes the projection of a presigned files row through the ordinary update', async () => {
    const content = 'kettle manual, plain text';
    const contentHash = await hashContent(content);
    const { rows: buckets } = await pg.query(
      `SELECT physical_name FROM "${storageSchema}".app_buckets WHERE key = 'public'`
    );
    const s3 = createS3Client({
      provider: 'minio',
      region: 'us-east-1',
      endpoint: 'http://localhost:9000',
      accessKeyId: 'constructive',
      secretAccessKey: 'constructive-dev-secret'
    });
    expect((await createS3Bucket(s3, buckets[0].physical_name, { provider: 'minio' })).success).toBe(true);

    const uploaded = await post().send({
      query: UPLOAD_APP_FILE,
      variables: {
        input: {
          bucketKey: 'public',
          contentHash,
          contentType: 'text/plain',
          size: Buffer.byteLength(content),
          filename: 'kettle.txt'
        }
      }
    });
    expect(uploaded.body.errors).toBeUndefined();
    const { fileId, key, uploadUrl } = uploaded.body.data.uploadAppFile;
    expect((await putToPresignedUrl(uploadUrl, content, 'text/plain')).ok).toBe(true);
    // The confirm worker is not part of this fixture; it is what moves a row
    // from `requested` to `uploaded` once it has inspected the object.
    await pg.query(`UPDATE "${storageSchema}".app_files SET status = 'uploaded' WHERE id = $1`, [fileId]);

    const { rows } = await pg.query(
      `SELECT bucket_id, mime_type, size, status FROM "${storageSchema}".app_files WHERE id = $1`,
      [fileId]
    );
    expect(rows[0].status).toBe('uploaded');
    const projection = { id: fileId, key, bucket_id: rows[0].bucket_id, mime: rows[0].mime_type, size: Number(rows[0].size) };

    const res = await post().send({
      query: UPDATE_PRODUCT,
      variables: { input: { id: 1, productPatch: { photo: { ...projection, caption: 'mine' } } } }
    });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.updateProduct.product.photo).toMatchObject({ ...projection, caption: 'mine' });
  });

  it('refuses a multipart body on /graphql', async () => {
    const operations = JSON.stringify({
      query: UPDATE_PRODUCT,
      variables: { input: { id: 1, productPatch: { photo: null } } }
    });
    const res = await post()
      .field('operations', operations)
      .field('map', JSON.stringify({ 0: ['variables.input.productPatch.photo'] }))
      .attach('0', Buffer.from('not a png'), { filename: 'kettle.png', contentType: 'image/png' });

    expect(res.status).toBe(415);
  });
});
