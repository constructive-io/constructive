/**
 * Integration tests — URLs for a file-reference column (`image`, `upload`, or
 * an array of one): `<column>Url(width:)` and `<column>Versions`.
 *
 * The document in the column is written by the client, its `versions` list
 * included, so it is never the authority for a URL. The files row is read by
 * the document's `id` as the reader; the source key comes from that row; and a
 * version is signed only when its key is a direct child of that row's own
 * `derived/<key>/`.
 *
 *   pnpm test -- --testPathPattern=file-ref-urls
 */

import path from 'path';
import pgModule from 'pg';
import type supertest from 'supertest';

import { getConnections, seed } from '../src';

jest.setTimeout(120000);

const sharedSeedRoot = path.join(__dirname, '..', '..', '..', '__fixtures__', 'seed');
const localSeedRoot = path.join(__dirname, '..', '__fixtures__', 'seed');
const pgpmWorkspace = path.join(sharedSeedRoot, '..', '..');

// Alice: no RLS on her files. Bob: anonymous reads only files in a public bucket.
const alice = { databaseId: '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', storageSchema: 'simple-storage-public' };
const bob = { databaseId: 'a1a1a1a1-b2b2-4c3c-d4d4-e5e5e5e5e5e5', storageSchema: 'bob-storage-public' };
const alicePublicBucketId = 'd0000001-0000-0000-0000-000000000001';
const alicePrivateBucketId = 'd0000001-0000-0000-0000-000000000002';
const alicePrivateBucket = 'app-80a2eaaf-private-cc079c527e7d';
const secondBucketId = '5ec0d000-0000-4000-8000-000000000006';
const cdn = 'https://cdn.files.test';
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

describe('file-reference column URLs', () => {
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

  const addFile = async (key: string, status = 'uploaded', bucketId = alicePrivateBucketId, isPublic = false) =>
    (
      await pg.query(
        `INSERT INTO "${alice.storageSchema}".app_files (bucket_id, key, content_hash, mime_type, filename, status, is_public)
         VALUES ($1, $2, $2, 'image/png', $4, $3, $5) RETURNING id`,
        [bucketId, key, status, `${key.split('/').pop()}`, isPublic]
      )
    ).rows[0].id as string;

  const addProduct = async (photo: unknown, manual: unknown = null) =>
    (
      await pg.query(`INSERT INTO ${schema}.products (title, photo, manual) VALUES ('p', $1::jsonb, $2::jsonb) RETURNING id`, [
        photo === null ? null : JSON.stringify(photo),
        manual === null ? null : JSON.stringify(manual)
      ])
    ).rows[0].id as number;

  const ask = async (who: typeof alice, query: string, variables: Record<string, unknown> = {}) => {
    const res = await request
      .post('/graphql')
      .set('X-Database-Id', who.databaseId)
      .set('X-Schemata', [who.storageSchema, schema].join(','))
      .send({ query, variables });
    expect(res.body.errors).toBeUndefined();
    expect(res.status).toBe(200);
    return res.body.data;
  };

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
          path.join(localSeedRoot, 'upload-columns', 'schema.sql'),
          path.join(localSeedRoot, 'second-storage-module', 'schema.sql')
        ])
      ]
    ));
    // Before the first request reads the module: a public file is served from this prefix.
    await pg.query(`UPDATE metaschema_modules_public.storage_module SET public_url_prefix = $1 WHERE database_id = $2`, [
      cdn,
      alice.databaseId
    ]);
  });

  afterAll(async () => {
    if (teardown) await teardown();
  });

  it('gives the narrowest version covering the width, else the source', async () => {
    const id = await addFile('pick/photo.png');
    const small = version('derived/pick/photo.png/small-0a1b2c3d.webp', 'small', 320);
    const large = version('derived/pick/photo.png/large-4e5f6a7b.webp', 'large', 1280);
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
    const own = version('derived/forge/mine.png/small-0a1b2c3d.webp', 'small', 320);
    const forged = [
      version('forge/victim.png', 'other-file', 400),
      version('derived/forge/victim.png/small-0a1b2c3d.webp', 'other-files-version', 400),
      version('derived/forge/mine.png/../victim.png', 'traversal', 400),
      version('derived/forge/mine.png/nested/deep.webp', 'nested', 400),
      version('derived/forge/mine.png/', 'prefix-only', 400),
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
    const noId = await addProduct({ key: 'pick/photo.png', versions: [version('derived/pick/photo.png/small-0a1b2c3d.webp', 'small', 320)] });
    const notLive = await addProduct({ id: requested, key: 'dead/requested.png' });
    const unknown = await addProduct({ id: '00000000-0000-4000-8000-000000000000', key: 'pick/photo.png' });
    const empty = await addProduct(null);

    for (const row of [noId, notLive, unknown, empty]) {
      expect(await product(alice, row, 320)).toEqual({ photoUrl: null, source: null, photoVersions: null });
    }
  });

  it('reads the files row as the reader: a file RLS hides gives no URL', async () => {
    await pg.query(`UPDATE "${bob.storageSchema}".app_files SET status = 'superseded' WHERE id = ANY($1::uuid[])`, [
      [bobPrivateFileId, bobPublicFileId]
    ]);
    const hidden = await addProduct({
      id: bobPrivateFileId,
      key: 'seeded-private-hash',
      versions: [version('derived/seeded-private-hash/small-0a1b2c3d.webp', 'small', 320)]
    });
    const visibleVersion = version('derived/seeded-public-hash/small-0a1b2c3d.webp', 'small', 320);
    const visible = await addProduct({ id: bobPublicFileId, key: 'seeded-public-hash', versions: [visibleVersion] });

    expect(await product(bob, hidden, 320)).toEqual({ photoUrl: null, source: null, photoVersions: null });
    const got = await product(bob, visible, 320);
    expect(got.source).toContain('seeded-public-hash');
    expect(pathOf(got.photoUrl)).toContain(visibleVersion.key);
  });

  it('resolves each element of an image[] column on its own', async () => {
    const one = await addFile('list/one.png');
    await addFile('list/two.png');
    const mine = version('derived/list/one.png/small-0a1b2c3d.webp', 'small', 320);
    const theirs = version('derived/list/two.png/small-0a1b2c3d.webp', 'small', 320);
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

  describe('an upload column', () => {
    const MANUAL = `query Manual($id: Int!, $width: Int) {
      products(where: { id: { equalTo: $id } }) {
        nodes { manualUrl(width: $width) source: manualUrl manualVersions { name key width height format size url } }
      }
    }`;
    const manual = async (id: number, width?: number) => (await ask(alice, MANUAL, { id, width })).products.nodes[0];

    it('gives the source URL for a document without versions, whatever the width', async () => {
      const id = await addFile('docs/resume.pdf');
      const row = await addProduct(null, { id, key: 'docs/resume.pdf' });

      const got = await manual(row, 640);
      expect(pathOf(got.manualUrl)).toMatch(/\/docs\/resume\.pdf$/);
      expect(pathOf(got.source)).toMatch(/\/docs\/resume\.pdf$/);
      expect(got.manualVersions).toEqual([]);
    });

    it('falls back to the source when no version states a width', async () => {
      const id = await addFile('docs/deck.pdf');
      const preview = { name: 'preview', key: 'derived/docs/deck.pdf/preview-0a1b2c3d.png' };
      const row = await addProduct(null, { id, key: 'docs/deck.pdf', versions: [preview] });

      const got = await manual(row, 320);
      expect(pathOf(got.manualUrl)).toMatch(/\/docs\/deck\.pdf$/);
      expect(got.manualVersions).toEqual([
        { name: 'preview', key: preview.key, width: null, height: null, format: null, size: null, url: expect.stringContaining('preview-0a1b2c3d.png') }
      ]);
    });

    it('never signs a key the document names outside its own file', async () => {
      const id = await addFile('docs/mine.pdf');
      await addFile('docs/victim.pdf');
      const own = version('derived/docs/mine.pdf/page-0a1b2c3d.png', 'page', 320);
      const row = await addProduct(null, {
        id,
        key: 'docs/victim.pdf',
        versions: [
          version('docs/victim.pdf', 'other-file', 400),
          version('derived/docs/victim.pdf/page-0a1b2c3d.png', 'other-files-version', 400),
          version('derived/docs/mine.pdf/../victim.pdf', 'traversal', 400),
          own
        ]
      });

      const got = await manual(row, 400);
      expect(got.manualVersions.map((v: { key: string }) => v.key)).toEqual([own.key]);
      expect(pathOf(got.source)).toMatch(/\/docs\/mine\.pdf$/);
      expect(JSON.stringify(got)).not.toContain('victim');
    });

    it('reads the files row as the reader: a file RLS hides gives no URL', async () => {
      await pg.query(`UPDATE "${bob.storageSchema}".app_files SET status = 'uploaded' WHERE id = ANY($1::uuid[])`, [
        [bobPrivateFileId, bobPublicFileId]
      ]);
      const hidden = await addProduct(null, { id: bobPrivateFileId, key: 'seeded-private-hash' });
      const visible = await addProduct(null, { id: bobPublicFileId, key: 'seeded-public-hash' });
      const asBob = async (id: number) => (await ask(bob, MANUAL, { id })).products.nodes[0];

      expect(await asBob(hidden)).toEqual({ manualUrl: null, source: null, manualVersions: null });
      expect((await asBob(visible)).source).toContain('seeded-public-hash');
    });

    it('resolves each element of an upload[] column on its own', async () => {
      const one = await addFile('papers/one.pdf');
      await addFile('papers/two.pdf');
      const theirs = version('derived/papers/two.pdf/page-0a1b2c3d.png', 'page', 320);
      const { rows } = await pg.query(
        `INSERT INTO ${schema}.albums (papers)
         VALUES (ARRAY(SELECT jsonb_array_elements($1::jsonb))::public.upload[]) RETURNING id`,
        [JSON.stringify([{ id: one, key: 'papers/two.pdf', versions: [theirs] }, { key: 'papers/two.pdf' }])]
      );
      const album = (
        await ask(alice, `query Album($id: Int!) {
          albums(where: { id: { equalTo: $id } }) { nodes { papersUrl papersVersions { key url } } }
        }`, { id: rows[0].id })
      ).albums.nodes[0];

      expect(album.papersUrl).toHaveLength(2);
      expect(pathOf(album.papersUrl[0])).toMatch(/\/papers\/one\.pdf$/);
      expect(album.papersUrl[1]).toBeNull();
      expect(album.papersVersions).toEqual([[], null]);
    });
  });

  it('names no type or field after one file kind', async () => {
    const res = await request
      .post('/graphql')
      .set('X-Database-Id', alice.databaseId)
      .set('X-Schemata', [alice.storageSchema, schema].join(','))
      .send({ query: `{ __schema { types { name fields { name type { name ofType { name ofType { name ofType { name } } } } } } } }` });
    const types = res.body.data.__schema.types as Array<{ name: string; fields: Array<{ name: string }> | null }>;
    const fileVersion = types.find((t) => t.name === 'FileVersion');
    expect(fileVersion.fields.map((f) => f.name)).toEqual(['name', 'key', 'width', 'height', 'format', 'size', 'url']);
    expect(types.find((t) => t.name === 'ImageVersion')).toBeUndefined();
    const product = types.find((t) => t.name === 'Product').fields.map((f) => f.name);
    expect(product).toEqual(expect.arrayContaining(['photoUrl', 'photoVersions', 'manualUrl', 'manualVersions']));
    // `attachment` holds a link, not a file document.
    expect(product).not.toContain('brochureUrl');
  });

  describe('where the bytes live, as downloadUrl has it', () => {
    const FILE = `query File($id: UUID!) { appFiles(where: { id: { equalTo: $id } }) { nodes { downloadUrl } } }`;
    const urls = async (fileId: string, productId: number) => ({
      downloadUrl: (await ask(alice, FILE, { id: fileId })).appFiles.nodes[0].downloadUrl as string,
      ...(await product(alice, productId))
    });

    it('serves a public file from the public URL prefix, its versions too', async () => {
      const id = await addFile('open/logo.png', 'uploaded', alicePublicBucketId, true);
      const small = version('derived/open/logo.png/small-0a1b2c3d.webp', 'small', 320);
      const got = await urls(id, await addProduct({ id, key: 'open/logo.png', versions: [small] }));

      expect(got.source).toBe(`${cdn}/app-80a2eaaf-public-c7156cb19fe3/open/logo.png`);
      expect(got.source).toBe(got.downloadUrl);
      expect(got.photoVersions[0].url).toBe(`${cdn}/app-80a2eaaf-public-c7156cb19fe3/${small.key}`);
    });

    it('presigns a private file in its database\'s own bucket, under the name it was uploaded with', async () => {
      const id = await addFile('closed/photo.png');
      const got = await urls(id, await addProduct({ id, key: 'closed/photo.png' }));

      const source = new URL(got.source);
      const download = new URL(got.downloadUrl);
      expect(source.searchParams.get('X-Amz-Signature')).toEqual(expect.any(String));
      expect(source.host).toBe(download.host);
      expect(source.pathname).toBe(download.pathname);
      expect(decodeURIComponent(source.pathname)).toContain(`${alicePrivateBucket}/closed/photo.png`);
      expect(source.searchParams.get('response-content-disposition')).toContain('photo.png');
      expect(source.searchParams.get('response-content-disposition')).toBe(download.searchParams.get('response-content-disposition'));
    });

    it('signs in another database\'s bucket for that database', async () => {
      await pg.query(`UPDATE "${bob.storageSchema}".app_files SET status = 'uploaded' WHERE id = $1`, [bobPublicFileId]);
      const got = await product(bob, await addProduct({ id: bobPublicFileId, key: 'seeded-public-hash' }));
      expect(decodeURIComponent(got.source)).toContain('app-a1a1a1a1-public-4db6afbff1a2/seeded-public-hash');
      expect(got.source).not.toContain('app-80a2eaaf');
    });

    it('finds a file that lives in the database\'s second storage module', async () => {
      const { rows } = await pg.query(
        `INSERT INTO "second-storage-public".team_files (bucket_id, key, content_hash, mime_type, filename, status)
         VALUES ($1, 'team/plan.png', 'team/plan.png', 'image/png', 'plan.png', 'uploaded') RETURNING id`,
        [secondBucketId]
      );
      const small = version('derived/team/plan.png/small-0a1b2c3d.webp', 'small', 320);
      const got = await product(alice, await addProduct({ id: rows[0].id, key: 'team/plan.png', versions: [small] }), 300);

      expect(pathOf(got.source)).toContain('team-80a2eaaf-private-0123456789ab/team/plan.png');
      expect(pathOf(got.photoUrl)).toContain(`team-80a2eaaf-private-0123456789ab/${small.key}`);
    });

    it('gives no URL for a file whose bucket was never provisioned', async () => {
      const bucket = (
        await pg.query(`INSERT INTO "${alice.storageSchema}".app_buckets (key, type, physical_name) VALUES ('pending', 'private', NULL) RETURNING id`)
      ).rows[0].id as string;
      const id = await addFile('pending/photo.png', 'uploaded', bucket);
      const got = await urls(id, await addProduct({ id, key: 'pending/photo.png' }));

      expect(got.downloadUrl).toBeNull();
      expect(got).toMatchObject({ photoUrl: null, source: null, photoVersions: null });
    });
  });

  it('reads the files of a list once for the request, not once per row', async () => {
    const title = 'fifty';
    for (let i = 0; i < 50; i++) {
      const key = `fifty/${i}.png`;
      const id = await addFile(key);
      await pg.query(`INSERT INTO ${schema}.products (title, photo) VALUES ($1, $2::jsonb)`, [
        title,
        JSON.stringify({ id, key, versions: [version(`derived/${key}/small-0a1b2c3d.webp`, 'small', 320)] })
      ]);
    }

    const storage = /app_files|team_files|current_database_id|_physical_name|storage_modules/;
    const seen: string[] = [];
    const query = pgModule.Client.prototype.query;
    const spy = jest.spyOn(pgModule.Client.prototype, 'query').mockImplementation(function (this: any, ...args: any[]) {
      const text = typeof args[0] === 'string' ? args[0] : args[0]?.text;
      if (typeof text === 'string' && storage.test(text)) seen.push(text);
      return (query as any).apply(this, args);
    } as any);
    let nodes: Array<{ photoUrl: string; photoVersions: unknown[] }>;
    try {
      nodes = (
        await ask(alice, `{ products(where: { title: { equalTo: "${title}" } }) { nodes { photoUrl(width: 300) photoVersions { url } } } }`)
      ).products.nodes;
    } finally {
      spy.mockRestore();
    }

    expect(nodes).toHaveLength(50);
    for (const node of nodes) {
      expect(node.photoUrl).toContain('small-0a1b2c3d.webp');
      expect(node.photoVersions).toHaveLength(1);
    }
    // eslint-disable-next-line no-console
    console.log(`storage queries for a 50-row list: ${seen.length}`);
    // The claimed database, the files rows, the bucket coordinate; the module list may be read once more.
    expect(seen.length).toBeLessThanOrEqual(4);
  });
});
