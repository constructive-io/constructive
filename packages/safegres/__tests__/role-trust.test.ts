import {
  checkPublicGrants,
  checkUntrustedRolePolicies,
  checkUntrustedRoleWrites
} from '../src/checks/role-trust';
import type { GrantInfo, PolicyInfo, TableSnapshot } from '../src/pg/introspect';

function table(partial: Partial<TableSnapshot> = {}): TableSnapshot {
  return {
    schema: 'public',
    name: 'users',
    oid: 1,
    rlsEnabled: true,
    rlsForced: true,
    isPartitioned: false,
    owner: 'app_owner',
    grants: [],
    policies: [],
    ...partial
  };
}

function grant(role: string, privilege: GrantInfo['privilege']): GrantInfo {
  return { role, privilege, grantable: false, bypassRls: false };
}

function policy(partial: Partial<PolicyInfo> = {}): PolicyInfo {
  return {
    name: 'p',
    cmd: 'ALL',
    permissive: true,
    roles: ['authenticated'],
    using: 'true',
    withCheck: null,
    ...partial
  };
}

describe('R1 checkUntrustedRoleWrites', () => {
  it('is a no-op with no roles configured', () => {
    const t = table({ grants: [grant('anonymous', 'INSERT')] });
    expect(checkUntrustedRoleWrites(t)).toEqual([]);
    expect(checkUntrustedRoleWrites(t, { roles: [] })).toEqual([]);
  });

  it('flags write grants to untrusted roles, not reads', () => {
    const t = table({
      grants: [
        grant('anonymous', 'SELECT'),
        grant('anonymous', 'INSERT'),
        grant('anonymous', 'DELETE'),
        grant('authenticated', 'INSERT')
      ]
    });
    const out = checkUntrustedRoleWrites(t, { roles: ['anonymous'] });
    expect(out).toHaveLength(2);
    expect(out.map((f) => f.privilege).sort()).toEqual(['DELETE', 'INSERT']);
    expect(out[0].code).toBe('R1');
    expect(out[0].severity).toBe('critical');
    expect(out[0].role).toBe('anonymous');
  });
});

describe('R2 checkUntrustedRolePolicies', () => {
  it('flags permissive write policies applying to untrusted roles', () => {
    const t = table({
      policies: [
        policy({ name: 'anon_insert', cmd: 'INSERT', roles: ['anonymous'] }),
        policy({ name: 'anon_select', cmd: 'SELECT', roles: ['anonymous'] }),
        policy({ name: 'auth_all', cmd: 'ALL', roles: ['authenticated'] })
      ]
    });
    const out = checkUntrustedRolePolicies(t, { roles: ['anonymous'] });
    expect(out).toHaveLength(1);
    expect(out[0].code).toBe('R2');
    expect(out[0].policy).toBe('anon_insert');
  });

  it('flags PUBLIC policies (they include untrusted roles)', () => {
    const t = table({ policies: [policy({ name: 'open_all', roles: ['PUBLIC'] })] });
    const out = checkUntrustedRolePolicies(t, { roles: ['anonymous'] });
    expect(out).toHaveLength(1);
    expect(out[0].message).toContain('PUBLIC (all roles)');
  });

  it('ignores restrictive policies and RLS-disabled tables', () => {
    const restrictive = table({
      policies: [policy({ roles: ['anonymous'], permissive: false })]
    });
    expect(checkUntrustedRolePolicies(restrictive, { roles: ['anonymous'] })).toEqual([]);

    const noRls = table({ rlsEnabled: false, policies: [policy({ roles: ['anonymous'] })] });
    expect(checkUntrustedRolePolicies(noRls, { roles: ['anonymous'] })).toEqual([]);
  });
});

describe('R3 checkPublicGrants', () => {
  it('flags PUBLIC grants on RLS tables', () => {
    const t = table({ grants: [grant('PUBLIC', 'SELECT'), grant('PUBLIC', 'INSERT')] });
    const out = checkPublicGrants(t);
    expect(out).toHaveLength(1);
    expect(out[0].code).toBe('R3');
    expect(out[0].message).toContain('SELECT, INSERT');
  });

  it('ignores tables without RLS or without PUBLIC grants', () => {
    expect(checkPublicGrants(table({ rlsEnabled: false, grants: [grant('PUBLIC', 'SELECT')] }))).toEqual([]);
    expect(checkPublicGrants(table({ grants: [grant('authenticated', 'SELECT')] }))).toEqual([]);
  });
});
