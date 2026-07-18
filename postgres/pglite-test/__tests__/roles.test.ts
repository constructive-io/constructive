import { getConnections, PgTestClient } from '../src';

describe('pglite-test: default role bootstrap', () => {
  let pg: PgTestClient;
  let teardown: () => Promise<void>;

  beforeAll(async () => {
    ({ pg, teardown } = await getConnections({}, []));
  });

  afterAll(async () => {
    await teardown();
  });

  beforeEach(async () => {
    await pg.beforeEach();
  });

  afterEach(async () => {
    await pg.afterEach();
  });

  it('creates the standard app roles with no manual CREATE ROLE', async () => {
    const { rows } = await pg.query<{ rolname: string }>(
      "SELECT rolname FROM pg_roles WHERE rolname = ANY($1) ORDER BY rolname",
      [['administrator', 'anonymous', 'authenticated', 'authenticated_client']]
    );
    expect(rows.map((r) => r.rolname)).toEqual([
      'administrator',
      'anonymous',
      'authenticated',
      'authenticated_client'
    ]);
  });

  it('gives administrator BYPASSRLS and app roles NOLOGIN', async () => {
    const { rows } = await pg.query<{
      rolname: string;
      rolbypassrls: boolean;
      rolcanlogin: boolean;
    }>(
      "SELECT rolname, rolbypassrls, rolcanlogin FROM pg_roles WHERE rolname = ANY($1) ORDER BY rolname",
      [['administrator', 'authenticated']]
    );
    const admin = rows.find((r) => r.rolname === 'administrator');
    const auth = rows.find((r) => r.rolname === 'authenticated');
    expect(admin?.rolbypassrls).toBe(true);
    expect(auth?.rolbypassrls).toBe(false);
    expect(auth?.rolcanlogin).toBe(false);
  });
});

describe('pglite-test: role bootstrap escape hatch', () => {
  let pg: PgTestClient;
  let teardown: () => Promise<void>;

  beforeAll(async () => {
    ({ pg, teardown } = await getConnections({ pglite: { roles: false } }, []));
  });

  afterAll(async () => {
    await teardown();
  });

  beforeEach(async () => {
    await pg.beforeEach();
  });

  afterEach(async () => {
    await pg.afterEach();
  });

  it('does not create app roles when roles: false', async () => {
    const { rows } = await pg.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM pg_roles WHERE rolname = ANY($1)",
      [['anonymous', 'authenticated', 'administrator', 'authenticated_client']]
    );
    expect(rows[0].n).toBe(0);
  });
});
