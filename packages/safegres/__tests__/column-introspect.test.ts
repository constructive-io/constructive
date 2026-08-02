import { getConnections, PgTestClient } from 'pgsql-test';

import { introspectTables } from '../src/pg/introspect';

jest.setTimeout(120000);

let pg: PgTestClient;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ pg, teardown } = await getConnections());
  // A column grant writes `pg_attribute.attacl` and leaves `pg_class.relacl`
  // untouched, which is exactly why relacl-only introspection saw nothing.
  await pg.any(`
    CREATE SCHEMA fx_colacl;
    CREATE TABLE fx_colacl.people (id int, name text, email text, ssn text);
    CREATE TABLE fx_colacl.plain (id int, name text);
    CREATE ROLE fx_col_anon;
    CREATE ROLE fx_col_app;

    GRANT SELECT (name, email) ON fx_colacl.people TO fx_col_anon;
    GRANT UPDATE (email) ON fx_colacl.people TO fx_col_anon;
    GRANT SELECT (name) ON fx_colacl.people TO PUBLIC;
    GRANT SELECT ON fx_colacl.plain TO fx_col_app;
  `);
});

afterAll(async () => {
  await pg.any(`
    DROP SCHEMA fx_colacl CASCADE;
    DROP ROLE fx_col_anon;
    DROP ROLE fx_col_app;
  `);
  await teardown();
});

/** Owner ACL rows appear as soon as a relation has any explicit grant. */
const granted = <T extends { role: string }>(rows: T[] | undefined): T[] =>
  (rows ?? []).filter((r) => r.role.startsWith('fx_col_') || r.role === 'PUBLIC');

describe('column ACL introspection', () => {
  it('reads column grants per role, column and privilege', async () => {
    const tables = await introspectTables(pg as never, { schemas: ['fx_colacl'] });
    const people = tables.find((t) => t.name === 'people');

    expect(granted(people?.grants)).toEqual([]);
    expect(granted(people?.columnGrants)).toEqual([
      { role: 'PUBLIC', column: 'name', privilege: 'SELECT', grantable: false, bypassRls: false },
      { role: 'fx_col_anon', column: 'email', privilege: 'SELECT', grantable: false, bypassRls: false },
      { role: 'fx_col_anon', column: 'email', privilege: 'UPDATE', grantable: false, bypassRls: false },
      { role: 'fx_col_anon', column: 'name', privilege: 'SELECT', grantable: false, bypassRls: false }
    ]);
  });

  it('leaves a table-level grant out of the column list', async () => {
    const tables = await introspectTables(pg as never, { schemas: ['fx_colacl'] });
    const plain = tables.find((t) => t.name === 'plain');

    expect(granted(plain?.columnGrants)).toEqual([]);
    expect(granted(plain?.grants)).toEqual([
      { role: 'fx_col_app', privilege: 'SELECT', grantable: false, bypassRls: false }
    ]);
  });

  it('applies the role filter to column grants, but never to PUBLIC', async () => {
    const tables = await introspectTables(pg as never, {
      schemas: ['fx_colacl'],
      roles: ['fx_col_app']
    });
    const people = tables.find((t) => t.name === 'people');

    expect(granted(people?.columnGrants)).toEqual([
      { role: 'PUBLIC', column: 'name', privilege: 'SELECT', grantable: false, bypassRls: false }
    ]);
  });
});
