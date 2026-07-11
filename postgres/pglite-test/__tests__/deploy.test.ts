import { join } from 'path';

import { getConnections, PgTestClient, seed } from '../src';

const MODULE = join(__dirname, 'fixtures', 'workspace', 'packages', 'app');

describe('pglite-test: pgsql-test getConnections backed by in-process PGlite', () => {
  let pg: PgTestClient;
  let db: PgTestClient;
  let teardown: () => Promise<void>;

  beforeAll(async () => {
    ({ pg, db, teardown } = await getConnections({}, [seed.pgpm(MODULE)]));
  });

  afterAll(async () => {
    await teardown();
  });

  beforeEach(async () => {
    await pg.beforeEach();
    await db.beforeEach();
  });

  afterEach(async () => {
    await db.afterEach();
    await pg.afterEach();
  });

  it('deployed the pgpm module into PGlite (schema + table exist)', async () => {
    const { rows } = await pg.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'app' AND table_name = 'posts'"
    );
    expect(rows[0].n).toBe(1);
  });

  it('isolates writes between tests (part 1: insert one row as superuser)', async () => {
    await pg.query("INSERT INTO app.posts(owner_id, title) VALUES ('1', 'first')");
    const { rows } = await pg.query<{ n: number }>('SELECT count(*)::int AS n FROM app.posts');
    expect(rows[0].n).toBe(1);
  });

  it('isolates writes between tests (part 2: previous insert was rolled back)', async () => {
    const { rows } = await pg.query<{ n: number }>('SELECT count(*)::int AS n FROM app.posts');
    expect(rows[0].n).toBe(0);
  });

  it('enforces RLS via role + jwt claim on the shared session', async () => {
    // Superuser seeds rows for two owners (bypasses RLS).
    await pg.query(
      "INSERT INTO app.posts(owner_id, title) VALUES ('1', 'mine'), ('2', 'theirs')"
    );

    // App user 1 sees only their row.
    db.setContext({ role: 'authenticated', 'jwt.claims.user_id': '1' });
    const asUser1 = await db.query<{ title: string }>('SELECT title FROM app.posts ORDER BY title');
    expect(asUser1.rows.map((r) => r.title)).toEqual(['mine']);

    // App user 2 sees only theirs.
    db.setContext({ role: 'authenticated', 'jwt.claims.user_id': '2' });
    const asUser2 = await db.query<{ title: string }>('SELECT title FROM app.posts ORDER BY title');
    expect(asUser2.rows.map((r) => r.title)).toEqual(['theirs']);
  });

  it('lets the app user insert only rows they own (RLS WITH CHECK)', async () => {
    db.setContext({ role: 'authenticated', 'jwt.claims.user_id': '7' });
    await db.query("INSERT INTO app.posts(owner_id, title) VALUES ('7', 'ok')");

    await expect(
      db.query("INSERT INTO app.posts(owner_id, title) VALUES ('8', 'nope')")
    ).rejects.toThrow();
  });
});
