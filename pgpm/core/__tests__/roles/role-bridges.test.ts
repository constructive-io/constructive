import { getConnEnvOptions } from '@pgpmjs/env';
import { PgTestConnectionOptions, RoleMapping } from '@pgpmjs/types';

import { getConnections, PgTestClient } from '../../../../postgres/pgsql-test/src';
import { generateRoleBridgesSQL } from '../../src/roles';

describe('Role bridge configuration and SQL', () => {
  const roles: RoleMapping = {
    anonymous: 'custom_anon',
    authenticated: 'custom_auth',
    administrator: 'custom_admin'
  };

  it('defaults to no bridges and preserves sibling roles when bridges are configured', () => {
    expect(getConnEnvOptions().roleBridges).toBeUndefined();
    const options = getConnEnvOptions({
      roles: { anonymous: roles.anonymous },
      roleBridges: { anon: 'anonymous', service_role: 'authenticated' }
    });
    expect(options.roleBridges).toEqual({ anon: 'anonymous', service_role: 'authenticated' });
    expect(options.roles.anonymous).toBe(roles.anonymous);
    expect(options.roles.authenticated).toBe('authenticated');
  });

  it('generates no SQL when bridges are absent or empty', () => {
    expect(generateRoleBridgesSQL(roles)).toBe('');
    expect(generateRoleBridgesSQL(roles, {})).toBe('');
  });

  it('requires role configuration', () => {
    expect(() => generateRoleBridgesSQL(undefined, { anon: 'anonymous' }))
      .toThrow('roles parameter is undefined');
    expect(() => generateRoleBridgesSQL({}, { anon: 'anonymous' }))
      .toThrow('roles.anonymous is not configured');
  });

  it.each(['administrator', 'custom_admin', 'unknown'])('rejects target %s', (target) => {
    const bridges = { external: target } as PgTestConnectionOptions['roleBridges'];
    expect(() => generateRoleBridgesSQL(roles, bridges))
      .toThrow(`target must be anonymous or authenticated, not "${target}"`);
  });

  it.each(['custom_admin', 'administrator'])('rejects administrator aliased as a base role: %s', (anonymous) => {
    expect(() => generateRoleBridgesSQL({ ...roles, anonymous }, { external: 'anonymous' }))
      .toThrow('cannot target the administrator role');
  });

  it('escapes literals and uses identifier formatting without creating external roles', () => {
    const sql = generateRoleBridgesSQL({ ...roles, anonymous: "base'role" }, {
      "external'role": 'anonymous',
      service_role: 'authenticated'
    });
    expect(sql).toContain("v_external := 'external''role'");
    expect(sql).toContain("v_base := 'base''role'");
    expect(sql).toContain("v_base := 'custom_auth'");
    expect(sql).toContain("format('GRANT %I TO %I WITH INHERIT TRUE', v_base, v_external)");
    expect(sql).not.toContain('CREATE ROLE');
  });
});

describe('Role bridges on PostgreSQL', () => {
  let pg: PgTestClient;
  let teardown: () => Promise<void>;
  const roles: RoleMapping = {
    anonymous: "bridge_anon'quoted",
    authenticated: 'bridge_authenticated',
    administrator: 'bridge_administrator'
  };
  const external = "bridge_external'quoted";
  const bridges: PgTestConnectionOptions['roleBridges'] = { [external]: 'anonymous' };

  beforeAll(async () => {
    ({ pg, teardown } = await getConnections({}, []));
  });

  afterAll(async () => {
    await teardown?.();
  });

  beforeEach(async () => {
    pg.setContext({ role: null });
    await pg.beforeEach();
    await pg.query(`
      CREATE ROLE "${roles.anonymous}" NOLOGIN NOBYPASSRLS;
      CREATE ROLE "${roles.authenticated}" NOLOGIN NOBYPASSRLS;
      CREATE ROLE "${roles.administrator}" NOLOGIN BYPASSRLS;
      CREATE ROLE "${external}" NOLOGIN NOINHERIT NOBYPASSRLS;
      CREATE TABLE public.bridge_rows (id integer PRIMARY KEY);
      INSERT INTO public.bridge_rows VALUES (1), (2);
      ALTER TABLE public.bridge_rows ENABLE ROW LEVEL SECURITY;
      GRANT SELECT ON public.bridge_rows TO "${roles.anonymous}", "${roles.authenticated}";
      CREATE POLICY anonymous_rows ON public.bridge_rows TO "${roles.anonymous}" USING (id = 1);
      CREATE POLICY authenticated_rows ON public.bridge_rows TO "${roles.authenticated}" USING (id = 2);
    `);
  });

  afterEach(async () => {
    pg.setContext({ role: null });
    await pg.afterEach();
  });

  it('denies SELECT without a bridge', async () => {
    pg.setContext({ role: external });
    await pg.expectError(() => pg.query('SELECT * FROM public.bridge_rows'), { code: '42501' });
  });

  it('does not inherit table grants or policy applicability through a plain GRANT', async () => {
    await pg.query(`GRANT "${roles.anonymous}" TO "${external}"`);
    pg.setContext({ role: external });
    await pg.expectError(() => pg.query('SELECT * FROM public.bridge_rows'), { code: '42501' });
    pg.setContext({ role: null });
    await pg.query(`GRANT SELECT ON public.bridge_rows TO "${external}"`);
    pg.setContext({ role: external });
    expect((await pg.query('SELECT * FROM public.bridge_rows')).rows).toEqual([]);
  });

  it('inherits grants and the anonymous RLS policy while remaining NOINHERIT and NOBYPASSRLS', async () => {
    await pg.query(generateRoleBridgesSQL(roles, bridges));
    pg.setContext({ role: external });
    expect((await pg.query('SELECT current_user')).rows).toEqual([{ current_user: external }]);
    expect((await pg.query('SELECT * FROM public.bridge_rows')).rows).toEqual([{ id: 1 }]);
    const { rows } = await pg.query(`
      SELECT rolinherit, rolbypassrls, pg_has_role(current_user, $1, 'MEMBER') AS administrator
      FROM pg_roles WHERE rolname = current_user
    `, [roles.administrator]);
    expect(rows).toEqual([{ rolinherit: false, rolbypassrls: false, administrator: false }]);
  });

  it('resolves the authenticated target to its configured role name', async () => {
    await pg.query(generateRoleBridgesSQL(roles, { [external]: 'authenticated' }));
    pg.setContext({ role: external });
    expect((await pg.query('SELECT * FROM public.bridge_rows')).rows).toEqual([{ id: 2 }]);
  });

  it('upgrades an existing non-inheriting membership and is idempotent', async () => {
    await pg.query(`GRANT "${roles.anonymous}" TO "${external}" WITH INHERIT FALSE`);
    const sql = generateRoleBridgesSQL(roles, bridges);
    await pg.query(sql);
    await pg.query(sql);
    const { rows } = await pg.query(`
      SELECT m.inherit_option FROM pg_auth_members m
      JOIN pg_roles base ON base.oid = m.roleid
      JOIN pg_roles member ON member.oid = m.member
      WHERE base.rolname = $1 AND member.rolname = $2
    `, [roles.anonymous, external]);
    expect(rows).toEqual([{ inherit_option: true }]);
    pg.setContext({ role: external });
    expect((await pg.query('SELECT * FROM public.bridge_rows')).rows).toEqual([{ id: 1 }]);
  });

  it('errors clearly without creating a missing external role', async () => {
    await pg.expectError(
      () => pg.query(generateRoleBridgesSQL(roles, { missing_bridge_external: 'anonymous' })),
      { code: '42704', message: 'Role bridge external role "missing_bridge_external" does not exist' }
    );
    expect((await pg.query("SELECT 1 FROM pg_roles WHERE rolname = 'missing_bridge_external'")).rows).toEqual([]);
  });
});
