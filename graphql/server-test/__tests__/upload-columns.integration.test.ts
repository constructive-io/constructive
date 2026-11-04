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

import path from 'path';
import type supertest from 'supertest';

import { getConnections, seed } from '../src';

jest.setTimeout(120000);

const sharedSeedRoot = path.join(__dirname, '..', '..', '..', '__fixtures__', 'seed');
const localSeedRoot = path.join(__dirname, '..', '__fixtures__', 'seed');
const pgpmWorkspace = path.join(sharedSeedRoot, '..', '..');

const databaseId = '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9';
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
  let teardown: () => Promise<void>;

  const post = () =>
    request.post('/graphql').set('X-Database-Id', databaseId).set('X-Schemata', schema);

  beforeAll(async () => {
    ({ request, teardown } = await getConnections(
      {
        schemas: [schema],
        authRole: 'anonymous',
        server: { useRouting: true, api: { isPublic: false, metaSchemas } }
      },
      [
        seed.pgpm(pgpmWorkspace),
        seed.sqlfile([
          path.join(sharedSeedRoot, 'scoped', 'test-data.sql'),
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

  it('writes the projection document through the ordinary update', async () => {
    const photo = {
      id: '0f0f0f0f-0000-4000-8000-000000000001',
      key: 'a'.repeat(64),
      bucket_id: '0f0f0f0f-0000-4000-8000-000000000002',
      mime: 'image/png',
      size: 16
    };
    const res = await post().send({
      query: UPDATE_PRODUCT,
      variables: { input: { id: 1, productPatch: { photo } } }
    });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.updateProduct.product.photo).toEqual(photo);
  });

  it('refuses a multipart body on /graphql', async () => {
    const operations = JSON.stringify({
      query: UPDATE_PRODUCT,
      variables: { input: { id: 1, productPatch: { photo: null } } }
    });
    const res = await post()
      .field('operations', operations)
      .field('map', JSON.stringify({ '0': ['variables.input.productPatch.photo'] }))
      .attach('0', Buffer.from('not a png'), { filename: 'kettle.png', contentType: 'image/png' });

    expect(res.status).toBe(415);
  });
});
