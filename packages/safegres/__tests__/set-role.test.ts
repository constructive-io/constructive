import { type RoleGraph } from '../src/checks/lattice';
import { computeRoleReach } from '../src/checks/role-reach';
import { checkSetRoleEscalation } from '../src/checks/set-role';
import type { RoleAttributes } from '../src/pg/acl';
import type { GrantInfo, TableSnapshot } from '../src/pg/introspect';

function table(partial: Partial<TableSnapshot> = {}): TableSnapshot {
  return {
    schema: 'app',
    name: 'secrets',
    oid: 1,
    rlsEnabled: true,
    rlsForced: true,
    isPartitioned: false,
    owner: 'app_owner',
    grants: [],
    columnGrants: [],
    policies: [],
    ...partial
  };
}

function grant(role: string, privilege: GrantInfo['privilege']): GrantInfo {
  return { role, privilege, grantable: false, bypassRls: false };
}

function role(name: string, partial: Partial<RoleAttributes> = {}): [string, RoleAttributes] {
  return [name, { name, bypassRls: false, isSuper: false, inheritsFrom: [], canSetRole: [], ...partial }];
}

function graph(...entries: Array<[string, RoleAttributes]>): RoleGraph {
  return new Map(entries);
}

describe('computeRoleReach', () => {
  it('projects passive grants as an effectiveRole === role cell', () => {
    const g = graph(role('anon'), role('priv'));
    const t = table({ grants: [grant('anon', 'SELECT')] });
    const [reach] = computeRoleReach([t], g, ['anon']);
    expect(reach.cells).toHaveLength(1);
    expect(reach.cells[0]).toMatchObject({
      effectiveRole: 'anon',
      privileges: ['SELECT'],
      proof: 'catalog'
    });
    expect(reach.cells[0].path[0]).toEqual({ kind: 'grant', via: 'direct', privilege: 'SELECT' });
  });

  it('adds a SET ROLE cell for a target the role can assume, under the target', () => {
    const g = graph(role('anon', { canSetRole: ['priv'] }), role('priv'));
    const t = table({ grants: [grant('priv', 'SELECT')] });
    const [reach] = computeRoleReach([t], g, ['anon']);
    // anon holds nothing passively; the only cell is the assumed one.
    expect(reach.cells).toHaveLength(1);
    expect(reach.cells[0]).toMatchObject({ effectiveRole: 'priv', privileges: ['SELECT'] });
    expect(reach.cells[0].path[0]).toEqual({ kind: 'setrole', to: 'priv' });
  });

  it('does not confuse SET ROLE with inheritance', () => {
    // inheritsFrom is empty; only canSetRole is populated — the passive closure
    // (effectiveGrants) must stay empty and the reach arrive solely via setrole.
    const g = graph(role('anon', { canSetRole: ['priv'] }), role('priv'));
    const t = table({ grants: [grant('priv', 'UPDATE')] });
    const [reach] = computeRoleReach([t], g, ['anon']);
    expect(reach.cells.every((c) => c.effectiveRole === 'priv')).toBe(true);
  });
});

describe('checkSetRoleEscalation (L7)', () => {
  it('is a no-op with no untrusted roles configured', () => {
    const g = graph(role('anon', { canSetRole: ['priv'] }), role('priv'));
    const t = table({ grants: [grant('priv', 'SELECT')] });
    expect(checkSetRoleEscalation(t, g, {})).toEqual([]);
  });

  it('flags a privilege gained only by assuming another role', () => {
    const g = graph(role('anon', { canSetRole: ['priv'] }), role('priv'));
    const t = table({ grants: [grant('priv', 'SELECT')] });
    const findings = checkSetRoleEscalation(t, g, { roles: ['anon'] });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      code: 'L7',
      schema: 'app',
      table: 'secrets',
      role: 'anon',
      privilege: 'SELECT'
    });
    expect(findings[0].context).toMatchObject({ effectiveRole: 'priv' });
  });

  it('does not fire when the assumed role adds nothing the role already holds', () => {
    const g = graph(role('anon', { canSetRole: ['priv'] }), role('priv'));
    // Both reach SELECT via a grant TO PUBLIC — assuming priv gains nothing.
    const t = table({ grants: [grant('PUBLIC', 'SELECT')] });
    expect(checkSetRoleEscalation(t, g, { roles: ['anon'] })).toEqual([]);
  });

  it('records when the assumed role bypasses RLS', () => {
    const g = graph(role('anon', { canSetRole: ['priv'] }), role('priv', { bypassRls: true }));
    const t = table({ grants: [grant('priv', 'SELECT')] });
    const findings = checkSetRoleEscalation(t, g, { roles: ['anon'] });
    expect(findings[0].context).toMatchObject({ targetBypassesRls: true });
    expect(findings[0].message).toContain('bypasses RLS');
  });
});
