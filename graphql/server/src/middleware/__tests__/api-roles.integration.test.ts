import { QuoteUtils } from '@pgsql/quotes';
import { randomUUID } from 'crypto';
import { getConnections, PgTestClient } from 'pgsql-test';

import { API_ROLE_VALIDATION_SQL } from '../api-roles';

describe('API role validation SQL', () => {
  let pg: PgTestClient;
  let db: PgTestClient;
  let teardown: () => Promise<void>;
  let role: string;
  let parent: string;
  let schema: string;
  let outsideSchema: string;
  const quote = QuoteUtils.quoteIdentifier;

  beforeAll(async () => {
    ({ pg, db, teardown } = await getConnections({}, []));
  });

  afterAll(async () => {
    await teardown();
  });

  beforeEach(async () => {
    await pg.beforeEach();
    await db.beforeEach();
    const prefix = `api_roles_${randomUUID().replaceAll('-', '')}`;
    role = `${prefix}_served`;
    parent = `${prefix}_parent`;
    schema = `${prefix}_schema`;
    outsideSchema = `${prefix}_outside`;
    await pg.query(`CREATE ROLE ${quote(role)} NOLOGIN NOSUPERUSER NOBYPASSRLS;
      CREATE ROLE ${quote(parent)} NOLOGIN NOSUPERUSER NOBYPASSRLS;
      CREATE SCHEMA ${quote(schema)};
      CREATE SCHEMA ${quote(outsideSchema)}`);
  });

  afterEach(async () => {
    await db.afterEach();
    await pg.afterEach();
  });

  const validate = async (schemas = [schema]) =>
    (await pg.query(API_ROLE_VALIDATION_SQL, [[role], schemas])).rows;

  it('accepts a plain role', async () => {
    expect(await validate()).toEqual([]);
  });

  it.each(['SUPERUSER', 'BYPASSRLS'])('rejects a %s role', async (attribute) => {
    await pg.query(`ALTER ROLE ${quote(role)} ${attribute}`);
    expect(await validate()).toEqual([{ rolname: role, reason: 'superuser or BYPASSRLS' }]);
  });

  it('rejects membership WITH SET in a privileged role, even without inheritance', async () => {
    await pg.query(`ALTER ROLE ${quote(parent)} BYPASSRLS;
      GRANT ${quote(parent)} TO ${quote(role)} WITH INHERIT FALSE, SET TRUE`);
    expect(await validate()).toEqual([{ rolname: role, reason: 'member of privileged role' }]);
  });

  it('accepts privileged membership without SET', async () => {
    await pg.query(`ALTER ROLE ${quote(parent)} BYPASSRLS;
      GRANT ${quote(parent)} TO ${quote(role)} WITH INHERIT TRUE, SET FALSE`);
    expect(await validate()).toEqual([]);
  });

  it('accepts membership in a non-privileged role', async () => {
    await pg.query(`GRANT ${quote(parent)} TO ${quote(role)} WITH SET TRUE`);
    expect(await validate()).toEqual([]);
  });

  const createOwnedTable = async (tableSchema: string, force = false, owner = role) => {
    const table = QuoteUtils.quoteQualifiedIdentifier(tableSchema, 'items');
    await pg.query(`CREATE TABLE ${table} (id integer);
      ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
      ${force ? `ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;` : ''}
      ALTER TABLE ${table} OWNER TO ${quote(owner)}`);
  };

  it('rejects the owner of a served RLS table', async () => {
    await createOwnedTable(schema);
    expect(await validate()).toEqual([{ rolname: role, reason: 'owner of served RLS table' }]);
  });

  it('rejects inherited ownership of a served RLS table', async () => {
    await createOwnedTable(schema, false, parent);
    await pg.query(`GRANT ${quote(parent)} TO ${quote(role)} WITH INHERIT TRUE, SET FALSE`);
    expect(await validate()).toEqual([{ rolname: role, reason: 'owner of served RLS table' }]);
  });

  it('rejects SET-accessible ownership without inheritance', async () => {
    await createOwnedTable(schema, false, parent);
    await pg.query(`GRANT ${quote(parent)} TO ${quote(role)} WITH INHERIT FALSE, SET TRUE`);
    expect(await validate()).toEqual([{ rolname: role, reason: 'owner of served RLS table' }]);
  });

  it('accepts owner membership without inheritance or SET', async () => {
    await createOwnedTable(schema, false, parent);
    await pg.query(`GRANT ${quote(parent)} TO ${quote(role)} WITH INHERIT FALSE, SET FALSE`);
    expect(await validate()).toEqual([]);
  });

  it.each([true, false])('checks inherited ownership after SET ROLE (bridge inherits owner: %s)', async (inherits) => {
    const bridge = `${role}_bridge`;
    await createOwnedTable(schema, false, parent);
    await pg.query(`CREATE ROLE ${quote(bridge)} NOLOGIN NOSUPERUSER NOBYPASSRLS;
      GRANT ${quote(bridge)} TO ${quote(role)} WITH INHERIT FALSE, SET TRUE;
      GRANT ${quote(parent)} TO ${quote(bridge)} WITH INHERIT ${inherits ? 'TRUE' : 'FALSE'}, SET FALSE`);
    const { rows } = await pg.query(
      `SELECT pg_has_role($1::name, $2::name, 'USAGE') AS inherited, pg_has_role($1::name, $2::name, 'SET') AS settable`,
      [role, parent]
    );
    expect(rows).toEqual([{ inherited: false, settable: false }]);
    expect(await validate()).toEqual(inherits
      ? [{ rolname: role, reason: 'owner of served RLS table' }]
      : []);
  });

  it('accepts the owner when FORCE RLS is enabled', async () => {
    await createOwnedTable(schema, true);
    expect(await validate()).toEqual([]);
  });

  it('accepts ownership outside served schemas', async () => {
    await createOwnedTable(outsideSchema);
    expect(await validate()).toEqual([]);
  });

  it('accepts an empty served schema list', async () => {
    await createOwnedTable(schema);
    expect(await validate([])).toEqual([]);
  });
});
