import { checkUntrustedColumnGrants } from '../src/checks/column-grants';
import {
  checkDeadPolicies,
  checkDeadSchemaUsage,
  computeRoleAccess,
  effectiveColumnGrants,
  type RoleGraph
} from '../src/checks/lattice';
import type { RoleAttributes, SchemaAclInfo } from '../src/pg/acl';
import type { ColumnGrantInfo, GrantInfo, PolicyInfo, TableSnapshot } from '../src/pg/introspect';

function table(partial: Partial<TableSnapshot> = {}): TableSnapshot {
  return {
    schema: 'app',
    name: 'people',
    oid: 1,
    rlsEnabled: false,
    rlsForced: false,
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

function colGrant(
  role: string,
  column: string,
  privilege: GrantInfo['privilege'] = 'SELECT'
): ColumnGrantInfo {
  return { role, column, privilege, grantable: false, bypassRls: false };
}

function policy(partial: Partial<PolicyInfo> = {}): PolicyInfo {
  return {
    name: 'p',
    cmd: 'ALL',
    permissive: true,
    roles: ['anonymous'],
    using: 'true',
    withCheck: 'true',
    ...partial
  };
}

function role(name: string, partial: Partial<RoleAttributes> = {}): [string, RoleAttributes] {
  return [name, { name, bypassRls: false, isSuper: false, inheritsFrom: [], canSetRole: [], ...partial }];
}

const GRAPH: RoleGraph = new Map([
  role('anonymous'),
  role('authenticated'),
  role('app_owner'),
  role('app_admin', { inheritsFrom: ['authenticated'] }),
  role('superrole', { bypassRls: true, isSuper: true })
]);

const ANON = { roles: ['anonymous'] };

describe('effectiveColumnGrants', () => {
  it('groups columns per privilege with direct provenance', () => {
    const t = table({
      columnGrants: [
        colGrant('anonymous', 'name'),
        colGrant('anonymous', 'avatar_url'),
        colGrant('anonymous', 'bio', 'UPDATE')
      ]
    });
    expect(effectiveColumnGrants(t, 'anonymous', GRAPH)).toEqual([
      { privilege: 'SELECT', via: 'direct', columns: ['avatar_url', 'name'] },
      { privilege: 'UPDATE', via: 'direct', columns: ['bio'] }
    ]);
  });

  it('expands PUBLIC and inherited column grants', () => {
    const t = table({
      columnGrants: [colGrant('PUBLIC', 'name'), colGrant('authenticated', 'email')]
    });
    expect(effectiveColumnGrants(t, 'app_admin', GRAPH)).toEqual([
      { privilege: 'SELECT', via: 'PUBLIC', columns: ['email', 'name'] }
    ]);
  });

  it('drops privileges the role already holds on the whole relation', () => {
    const t = table({
      grants: [grant('anonymous', 'SELECT')],
      columnGrants: [colGrant('anonymous', 'name'), colGrant('anonymous', 'bio', 'UPDATE')]
    });
    expect(effectiveColumnGrants(t, 'anonymous', GRAPH)).toEqual([
      { privilege: 'UPDATE', via: 'direct', columns: ['bio'] }
    ]);
  });

  it('ignores column grants to unrelated roles', () => {
    const t = table({ columnGrants: [colGrant('authenticated', 'email')] });
    expect(effectiveColumnGrants(t, 'anonymous', GRAPH)).toEqual([]);
  });
});

describe('L13 — untrusted column-level grants', () => {
  it('fires on a column grant no relation ACL shows, and says RLS is not mediating it', () => {
    const t = table({ columnGrants: [colGrant('anonymous', 'email')] });
    const findings = checkUntrustedColumnGrants(t, GRAPH, ANON);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      code: 'L13',
      severity: 'info',
      schema: 'app',
      table: 'people',
      role: 'anonymous',
      privilege: 'SELECT'
    });
    expect(findings[0].message).toContain('(email)');
    expect(findings[0].message).toContain('no RLS to mediate it');
    expect(findings[0].context).toMatchObject({ columns: ['email'], rlsMediated: false });
  });

  it('reports the access as mediated when RLS applies to the role', () => {
    const t = table({
      rlsEnabled: true,
      policies: [policy()],
      columnGrants: [colGrant('anonymous', 'email')]
    });
    const findings = checkUntrustedColumnGrants(t, GRAPH, ANON);
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('mediated by RLS');
    expect(findings[0].context).toMatchObject({ rlsMediated: true });
  });

  it('treats a BYPASSRLS role as unmediated even with RLS on', () => {
    const t = table({ rlsEnabled: true, columnGrants: [colGrant('superrole', 'email')] });
    const findings = checkUntrustedColumnGrants(t, GRAPH, { roles: ['superrole'] });
    expect(findings[0].context).toMatchObject({ rlsMediated: false, rlsEnabled: true });
  });

  it('stays silent when the role already holds the privilege on the whole relation', () => {
    const t = table({
      grants: [grant('anonymous', 'SELECT')],
      columnGrants: [colGrant('anonymous', 'email')]
    });
    expect(checkUntrustedColumnGrants(t, GRAPH, ANON)).toEqual([]);
  });

  it('stays silent for roles that are not configured as untrusted', () => {
    const t = table({ columnGrants: [colGrant('authenticated', 'email')] });
    expect(checkUntrustedColumnGrants(t, GRAPH, ANON)).toEqual([]);
    expect(checkUntrustedColumnGrants(t, GRAPH)).toEqual([]);
  });

  it('ignores REFERENCES, which grants no read of the data', () => {
    const t = table({ columnGrants: [colGrant('anonymous', 'id', 'REFERENCES')] });
    expect(checkUntrustedColumnGrants(t, GRAPH, ANON)).toEqual([]);
  });

  it('never recommends revoking the grant', () => {
    const t = table({ columnGrants: [colGrant('anonymous', 'email')] });
    const [finding] = checkUntrustedColumnGrants(t, GRAPH, ANON);
    expect(finding.hint).toContain('Do not revoke the grant');
    expect(finding.hint).toContain('nothing here proves it unused');
  });
});

describe('column grants as reach', () => {
  const usageAcl: SchemaAclInfo = {
    schema: 'app',
    owner: 'app_owner',
    grants: [{ role: 'anonymous', privilege: 'USAGE' }],
    executeRoles: []
  };

  it('L4 does not call schema USAGE dead when the only reach is column-scoped', () => {
    const t = table({ columnGrants: [colGrant('anonymous', 'email')] });
    expect(checkDeadSchemaUsage([usageAcl], [t], GRAPH)).toEqual([]);
  });

  it('L4 still fires when nothing at all is reachable', () => {
    const findings = checkDeadSchemaUsage([usageAcl], [table()], GRAPH);
    expect(findings.map((f) => f.code)).toEqual(['L4']);
  });

  it('L2 does not call a policy dead when the grant it mediates is column-scoped', () => {
    const t = table({
      rlsEnabled: true,
      policies: [policy({ cmd: 'SELECT' })],
      columnGrants: [colGrant('anonymous', 'email')]
    });
    expect(checkDeadPolicies(t, GRAPH)).toEqual([]);
  });

  it('L2 still fires when the role holds no grant of any kind', () => {
    const t = table({ rlsEnabled: true, policies: [policy({ cmd: 'SELECT' })] });
    expect(checkDeadPolicies(t, GRAPH).map((f) => f.code)).toEqual(['L2']);
  });

  it('the role access report counts a column-only relation and names the columns', () => {
    const t = table({ columnGrants: [colGrant('anonymous', 'email'), colGrant('anonymous', 'name')] });
    const [entry] = computeRoleAccess([t], GRAPH, ['anonymous']);
    expect(entry.accessibleTables).toBe(1);
    expect(entry.unmediated).toEqual([
      {
        schema: 'app',
        table: 'people',
        privileges: ['SELECT'],
        via: 'direct',
        columns: ['email', 'name'],
        access: 'unmediated'
      }
    ]);
  });

  it('does not report columns when the whole relation is reachable anyway', () => {
    const t = table({
      grants: [grant('anonymous', 'SELECT')],
      columnGrants: [colGrant('anonymous', 'email')]
    });
    const [entry] = computeRoleAccess([t], GRAPH, ['anonymous']);
    expect(entry.unmediated[0].columns).toBeUndefined();
  });
});
