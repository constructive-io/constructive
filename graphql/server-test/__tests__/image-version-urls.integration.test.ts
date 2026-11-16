/**
 * Integration tests — URLs for an `image` column and the versions rendered
 * beside its file (`photoUrl(width:)`, `photoVersions`).
 *
 * The document in the column is written by the client, its `versions` list
 * included, so it is never the authority for a URL. The files row is read by
 * the document's `id` as the reader; the source key comes from that row; and a
 * version is signed only when its key is a direct child of that row's own
 * `<key>.versions/`.
 *
 *   pnpm test -- --testPathPattern=image-version-urls
 */

import path from 'path';
import type supertest from 'supertest';

import { getConnections, seed } from '../src';

jest.setTimeout(120000);

const sharedSeedRoot = path.join(__dirname, '..', '..', '..', '__fixtures__', 'seed');
const localSeedRoot = path.join(__dirname, '..', '__fixtures__', 'seed');
const pgpmWorkspace = path.join(sharedSeedRoot, '..', '..');

// Alice: no RLS on her files. Bob: anonymous reads only files in a public bucket.
const alice = { databaseId: '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', storageSchema: 'simple-storage-public' };
const bob = { databaseId: 'a1a1a1a1-b2b2-4c3c-d4d4-e5e5e5e5e5e5', storageSchema: 'bob-storage-public' };
const alicePrivateBucketId = 'd0000001-0000-0000-0000-000000000002';
const bobPrivateFileId = 'd3d3d3d3-0000-0000-0000-000000000001';
const bobPublicFileId = 'd3d3d3d3-0000-0000-0000-000000000002';
const schema = 'upload_columns';
const metaSchemas = [
  'catalog_private',
  'routing_public',
  'apps_public',
  'metaschema_public',
  'metaschema_modules_public'
];

const PRODUCT = `
  query Product($id: Int!, $width: Int) {
    products(where: { id: { equalTo: $id } }) {
      nodes {
        photoUrl(width: $width)
        source: photoUrl
        photoVersions { name key width height format size url }
      }
    }
  }
`;

const pathOf = (url: string) => decodeURIComponent(new URL(url).pathname);

describe('image column URLs', () => {
  let request: supertest.Agent;
  let pg: { query: (text: string, values?: unknown[]) => Promise<{ rows: any[] }> };
  let teardown: () => Promise<void>;

  const product = async (who: typeof alice, id: number, width?: number) => {
    const res = await request
      .post('/graphql')
      .set('X-Database-Id', who.databaseId)
      .set('X-Schemata', [who.storageSchema, schema].join(','))
      .send({ query: PRODUCT, variables: { id, width } });
    expect(res.body.errors).toBeUndefined();
    expect(res.status).toBe(200);
    return res.body.data.products.nodes[0] as {
      photoUrl: string | null;
      source: string | null;
      photoVersions: Array<{ name: string; key: string; width: number; url: string }> | null;
    };
  };

  const addFile = async (key: string, status = 'uploaded') =>
    (
      await pg.query(
        `INSERT INTO "${alice.storageSchema}".app_files (bucket_id, key, content_hash, mime_type, filename, status)
         VALUES ($1, $2, $2, 'image/png', $2, $3) RETURNING id`,
        [alicePrivateBucketId, key, status]
      )
    ).rows[0].id as string;

  const addProduct = async (photo: unknown) =>
    (
      await pg.query(`INSERT INTO ${schema}.products (title, photo) VALUES ('p', $1::jsonb) RETURNING id`, [
        photo === null ? null : JSON.stringify(photo)
      ])
    ).rows[0].id as number;

  const version = (key: string, name: string, width: number) => ({ name, key, width, height: width, format: 'webp', size: 10 });

  beforeAll(async () => {
    ({ request, pg, teardown } = await getConnections(
      {
        schemas: [alice.storageSchema, schema],
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

  it('gives the narrowest version covering the width, else the source', async () => {
    const id = await addFile('pick/photo.png');
    const small = version('pick/photo.png.versions/small-0a1b2c3d.webp', 'small', 320);
    const large = version('pick/photo.png.versions/large-4e5f6a7b.webp', 'large', 1280);
    const row = await addProduct({ id, key: 'pick/photo.png', versions: [large, small] });

    const at300 = await product(alice, row, 300);
    expect(pathOf(at300.photoUrl)).toMatch(new RegExp(`/${small.key}$`));
    expect(pathOf(at300.source)).toMatch(/\/pick\/photo\.png$/);
    expect(at300.photoVersions.map((v) => v.name)).toEqual(['small', 'large']);
    for (const v of at300.photoVersions) expect(pathOf(v.url)).toMatch(new RegExp(`/${v.key}$`));

    expect(pathOf((await product(alice, row, 640)).photoUrl)).toMatch(new RegExp(`/${large.key}$`));
    expect(pathOf((await product(alice, row, 2000)).photoUrl)).toMatch(/\/pick\/photo\.png$/);
  });

  it('never signs a key the document names outside its own file', async () => {
    const id = await addFile('forge/mine.png');
    await addFile('forge/victim.png');
    const own = version('forge/mine.png.versions/small-0a1b2c3d.webp', 'small', 320);
    const forged = [
      version('forge/victim.png', 'other-file', 400),
      version('forge/victim.png.versions/small-0a1b2c3d.webp', 'other-files-version', 400),
      version('forge/mine.png.versions/../victim.png', 'traversal', 400),
      version('forge/mine.png.versions/nested/deep.webp', 'nested', 400),
      version('forge/mine.png.versions/', 'prefix-only', 400),
      version('forge/mine.png', 'source-as-version', 400)
    ];
    // The document also lies about its own key: the row's key is what is signed.
    const row = await addProduct({ id, key: 'forge/victim.png', versions: [...forged, own] });

    const got = await product(alice, row, 400);
    expect(got.photoVersions.map((v) => v.key)).toEqual([own.key]);
    expect(pathOf(got.photoUrl)).toMatch(/\/forge\/mine\.png$/);
    expect(pathOf(got.source)).toMatch(/\/forge\/mine\.png$/);
    expect(JSON.stringify(got)).not.toContain('victim');
  });

  it('resolves nothing for a document without a files row the reader can fetch', async () => {
    const requested = await addFile('dead/requested.png', 'requested');
    const noId = await addProduct({ key: 'pick/photo.png', versions: [version('pick/photo.png.versions/small-0a1b2c3d.webp', 'small', 320)] });
    const notLive = await addProduct({ id: requested, key: 'dead/requested.png' });
    const unknown = await addProduct({ id: '00000000-0000-4000-8000-000000000000', key: 'pick/photo.png' });
    const empty = await addProduct(null);

    for (const row of [noId, notLive, unknown, empty]) {
      expect(await product(alice, row, 320)).toEqual({ photoUrl: null, source: null, photoVersions: null });
    }
  });

  it('reads the files row as the reader: a file RLS hides gives no URL', async () => {
    // The seed leaves Bob's rows `requested`; both must be live so that only RLS tells them apart.
    await pg.query(`UPDATE "${bob.storageSchema}".app_files SET status = 'uploaded' WHERE id = ANY($1::uuid[])`, [
      [bobPrivateFileId, bobPublicFileId]
    ]);
    const hidden = await addProduct({
      id: bobPrivateFileId,
      key: 'seeded-private-hash',
      versions: [version('seeded-private-hash.versions/small-0a1b2c3d.webp', 'small', 320)]
    });
    const visible = await addProduct({ id: bobPublicFileId, key: 'seeded-public-hash' });

    expect(await product(bob, hidden, 320)).toEqual({ photoUrl: null, source: null, photoVersions: null });
    expect((await product(bob, visible, 320)).source).toContain('seeded-public-hash');
  });

  it('resolves each element of an image[] column on its own', async () => {
    const one = await addFile('list/one.png');
    await addFile('list/two.png');
    const mine = version('list/one.png.versions/small-0a1b2c3d.webp', 'small', 320);
    const theirs = version('list/two.png.versions/small-0a1b2c3d.webp', 'small', 320);
    const { rows } = await pg.query(
      `INSERT INTO ${schema}.albums (shots)
       VALUES (ARRAY(SELECT jsonb_array_elements($1::jsonb))::public.image[]) RETURNING id`,
      [JSON.stringify([{ id: one, key: 'list/one.png', versions: [mine, theirs] }, { key: 'list/two.png' }])]
    );

    const res = await request
      .post('/graphql')
      .set('X-Database-Id', alice.databaseId)
      .set('X-Schemata', [alice.storageSchema, schema].join(','))
      .send({
        query: `query Album($id: Int!) {
          albums(where: { id: { equalTo: $id } }) { nodes { shotsUrl(width: 300) shotsVersions { key url } } }
        }`,
        variables: { id: rows[0].id }
      });
    expect(res.body.errors).toBeUndefined();
    const album = res.body.data.albums.nodes[0];

    expect(album.shotsUrl).toHaveLength(2);
    expect(pathOf(album.shotsUrl[0])).toMatch(new RegExp(`/${mine.key}$`));
    expect(album.shotsUrl[1]).toBeNull();
    expect(album.shotsVersions[0].map((v: { key: string }) => v.key)).toEqual([mine.key]);
    expect(album.shotsVersions[1]).toBeNull();
  });
});
