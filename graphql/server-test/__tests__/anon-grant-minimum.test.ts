/**
 * Executable specification of the minimum PostgreSQL grants the anonymous role
 * needs for a Graphile API to work.
 *
 * This pins a contract that is easy to re-derive incorrectly:
 *
 *   1. Graphile needs *nothing* from the anonymous role in order to introspect.
 *      The schema is built on the pool connection, so the anon role's grants do
 *      not change the shape of the GraphQL schema at all — only whether a field
 *      resolves or returns `permission denied`.
 *   2. Executing an anon-callable function needs schema USAGE *and* per-function
 *      EXECUTE. Neither alone is sufficient.
 *   3. Anon needs no table grants for a login flow.
 *
 * (1) is the load-bearing one: because the schema does not shrink for anon, a
 * blanket `GRANT ALL ON FUNCTIONS TO anonymous` buys no Graphile functionality
 * whatsoever — it only widens what anon may execute.
 */
import { PgTestClient } from 'pgsql-test';

import { getConnections as getServerConnections } from '../src';

const SETUP = `
  CREATE SCHEMA app_public;

  CREATE TABLE app_public.todos (
    id serial PRIMARY KEY,
    owner_id integer NOT NULL DEFAULT 0,
    title text NOT NULL
  );
  INSERT INTO app_public.todos (owner_id, title) VALUES (1, 'first');
  ALTER TABLE app_public.todos ENABLE ROW LEVEL SECURITY;

  -- pre-login entry point: the only thing anon legitimately needs
  CREATE FUNCTION app_public.login(email text, password text)
    RETURNS text AS $$ SELECT 'token-for-' || email; $$ LANGUAGE sql VOLATILE;

  -- authenticated-only function: anon must not be able to call this
  CREATE FUNCTION app_public.my_secret()
    RETURNS text AS $$ SELECT 'secret'::text; $$ LANGUAGE sql STABLE;
`;

/** Strip anon to nothing, including PostgreSQL's implicit PUBLIC EXECUTE. */
const RESET_GRANTS = `
  REVOKE ALL ON SCHEMA app_public FROM anonymous, PUBLIC;
  REVOKE ALL ON ALL TABLES IN SCHEMA app_public FROM anonymous, PUBLIC;
  REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app_public FROM anonymous, PUBLIC;
`;

const LOGIN = `mutation { login(input: { email: "a@b.c", password: "x" }) { result } }`;
const MY_SECRET = `{ mySecret }`;

const isDenied = (res: { errors?: readonly unknown[] }): boolean => Boolean(res.errors?.length);

describe('minimum anonymous grants for Graphile', () => {
  let pg: PgTestClient;
  let query: (q: string) => Promise<any>;
  let teardown: () => Promise<void>;

  beforeAll(async () => {
    ({ pg, query, teardown } = await getServerConnections({
      schemas: ['app_public'],
      authRole: 'anonymous',
      server: { useRouting: false }
    }));

    await pg.query(SETUP);
    await pg.query(RESET_GRANTS);
  });

  afterAll(async () => {
    await teardown();
  });

  const introspect = async (): Promise<string[]> => {
    const res = await query(`
      { __schema { queryType { fields { name } } mutationType { fields { name } } } }
    `);
    const q = res.data.__schema.queryType?.fields ?? [];
    const m = res.data.__schema.mutationType?.fields ?? [];
    return [...q, ...m].map((f: { name: string }) => f.name).sort();
  };

  it('introspects with the anonymous role holding zero grants', async () => {
    const fields = await introspect();

    // The schema is built regardless of what anon can touch.
    expect(fields).toEqual(expect.arrayContaining(['login', 'mySecret', 'todos']));
  });

  it('exposes an identical schema with zero grants and with a blanket grant', async () => {
    const withNothing = await introspect();

    await pg.query(`
      GRANT USAGE ON SCHEMA app_public TO anonymous;
      GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app_public TO anonymous;
      GRANT SELECT ON ALL TABLES IN SCHEMA app_public TO anonymous;
    `);
    const withEverything = await introspect();

    // The blanket grant adds no Graphile surface — it only widens execution.
    expect(withEverything).toEqual(withNothing);

    await pg.query(RESET_GRANTS);
  });

  it('denies execution when anon has no grants', async () => {
    await pg.query(RESET_GRANTS);

    expect(isDenied(await query(LOGIN))).toBe(true);
    expect(isDenied(await query(MY_SECRET))).toBe(true);
  });

  it('requires schema USAGE in addition to EXECUTE', async () => {
    await pg.query(RESET_GRANTS);
    await pg.query(`GRANT EXECUTE ON FUNCTION app_public.login(text, text) TO anonymous;`);

    // EXECUTE alone is not enough: without USAGE the schema is unreachable.
    expect(isDenied(await query(LOGIN))).toBe(true);
  });

  it('allows exactly the declared function with USAGE + per-function EXECUTE', async () => {
    await pg.query(RESET_GRANTS);
    await pg.query(`
      GRANT USAGE ON SCHEMA app_public TO anonymous;
      GRANT EXECUTE ON FUNCTION app_public.login(text, text) TO anonymous;
    `);

    const login = await query(LOGIN);
    expect(login.errors).toBeUndefined();
    expect(login.data.login.result).toBe('token-for-a@b.c');

    // ...and nothing else in the schema became callable.
    expect(isDenied(await query(MY_SECRET))).toBe(true);
  });

  it('needs no table grants for the login flow', async () => {
    await pg.query(RESET_GRANTS);
    await pg.query(`
      GRANT USAGE ON SCHEMA app_public TO anonymous;
      GRANT EXECUTE ON FUNCTION app_public.login(text, text) TO anonymous;
    `);

    const res = await query(LOGIN);
    expect(res.errors).toBeUndefined();

    const [{ has }] = (
      await pg.query(
        `SELECT has_table_privilege('anonymous', 'app_public.todos', 'SELECT') AS has`
      )
    ).rows;
    expect(has).toBe(false);
  });
});
