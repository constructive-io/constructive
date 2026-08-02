import {
  checkDeadPolicies,
  checkDeadSchemaUsage,
  checkIndirectCoverageGaps,
  checkUnreachableGrants,
  checkUntrustedIndirectAccess,
  computeRoleAccess,
  effectiveGrants,
  type RoleGraph
} from '../src/checks/lattice';
import type { RoleAttributes, SchemaAclInfo } from '../src/pg/acl';
import type { GrantInfo, PolicyInfo, TableSnapshot } from '../src/pg/introspect';

function table(partial: Partial<TableSnapshot> = {}): TableSnapshot {
  return {
    schema: 'app',
    name: 'docs',
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
    withCheck: 'true',
    ...partial
  };
}

function role(name: string, partial: Partial<RoleAttributes> = {}): [string, RoleAttributes] {
  return [name, { name, bypassRls: false, isSuper: false, inheritsFrom: [], canSetRole: [], ...partial }];
}

function graph(...entries: Array<[string, RoleAttributes]>): RoleGraph {
  return new Map(entries);
}

const BASE_GRAPH = graph(
  role('anonymous'),
  role('authenticated'),
  role('app_owner'),
  role('app_admin', { inheritsFrom: ['authenticated'] }),
  role('superrole', { bypassRls: true, isSuper: true })
);

function schemaAcl(partial: Partial<SchemaAclInfo> = {}): SchemaAclInfo {
  return {
    schema: 'app',
    owner: 'app_owner',
    grants: [],
    executeRoles: [],
    ...partial
  };
}

describe('effectiveGrants', () => {
  it('collects direct, PUBLIC, and inherited grants with most-direct provenance', () => {
    const t = table({
      grants: [
        grant('app_admin', 'SELECT'),
        grant('PUBLIC', 'SELECT'),
        grant('PUBLIC', 'INSERT'),
        grant('authenticated', 'UPDATE'),
        grant('authenticated', 'INSERT')
      ]
    });
    const eff = effectiveGrants(t, 'app_admin', BASE_GRAPH);
    expect(eff).toEqual([
      { privilege: 'INSERT', via: 'PUBLIC' },
      { privilege: 'SELECT', via: 'direct' },
      { privilege: 'UPDATE', via: 'member of authenticated' }
    ]);
  });

  it('sees nothing for a role with no path to any grant', () => {
    const t = table({ grants: [grant('authenticated', 'SELECT')] });
    expect(effectiveGrants(t, 'anonymous', BASE_GRAPH)).toEqual([]);
  });
});

describe('L1 checkIndirectCoverageGaps', () => {
  it('flags a PUBLIC grant no policy can admit', () => {
    const t = table({ grants: [grant('PUBLIC', 'SELECT')] });
    const out = checkIndirectCoverageGaps(t, BASE_GRAPH);
    expect(out).toHaveLength(1);
    expect(out[0].code).toBe('L1');
    expect(out[0].role).toBe('PUBLIC');
    expect(out[0].privilege).toBe('SELECT');
  });

  it('does not flag a PUBLIC grant a permissive policy covers', () => {
    const t = table({
      grants: [grant('PUBLIC', 'SELECT')],
      policies: [policy({ cmd: 'SELECT', roles: ['PUBLIC'] })]
    });
    expect(checkIndirectCoverageGaps(t, BASE_GRAPH)).toEqual([]);
  });

  it('flags an inherited grant with no applicable policy', () => {
    const t = table({
      grants: [grant('authenticated', 'SELECT')],
      policies: [policy({ cmd: 'SELECT', roles: ['some_other_role'] })]
    });
    const out = checkIndirectCoverageGaps(t, BASE_GRAPH);
    expect(out).toHaveLength(1);
    expect(out[0].role).toBe('app_admin');
    expect(out[0].message).toContain('member of authenticated');
  });

  it('accepts coverage through a policy on the granted (parent) role', () => {
    const t = table({
      grants: [grant('authenticated', 'SELECT')],
      policies: [policy({ cmd: 'SELECT', roles: ['authenticated'] })]
    });
    expect(checkIndirectCoverageGaps(t, BASE_GRAPH)).toEqual([]);
  });

  it('is silent when RLS is disabled', () => {
    const t = table({ rlsEnabled: false, grants: [grant('PUBLIC', 'SELECT')] });
    expect(checkIndirectCoverageGaps(t, BASE_GRAPH)).toEqual([]);
  });
});

describe('L2 checkDeadPolicies', () => {
  it('flags a policy naming a role with no grant on the table', () => {
    const t = table({
      grants: [grant('authenticated', 'SELECT')],
      policies: [policy({ name: 'anon_read', cmd: 'SELECT', roles: ['anonymous'] })]
    });
    const out = checkDeadPolicies(t, BASE_GRAPH);
    expect(out).toHaveLength(1);
    expect(out[0].code).toBe('L2');
    expect(out[0].policy).toBe('anon_read');
    expect(out[0].role).toBe('anonymous');
  });

  it('accepts a grant arriving by inheritance', () => {
    const t = table({
      grants: [grant('authenticated', 'SELECT')],
      policies: [policy({ cmd: 'SELECT', roles: ['app_admin'] })]
    });
    expect(checkDeadPolicies(t, BASE_GRAPH)).toEqual([]);
  });

  it('flags a PUBLIC policy on a table nobody is granted', () => {
    const t = table({
      grants: [],
      policies: [policy({ name: 'open', roles: ['PUBLIC'] })]
    });
    const out = checkDeadPolicies(t, BASE_GRAPH);
    expect(out).toHaveLength(1);
    expect(out[0].role).toBe('PUBLIC');
  });

  it('accepts a PUBLIC policy when any non-owner grant exists', () => {
    const t = table({
      grants: [grant('authenticated', 'SELECT')],
      policies: [policy({ roles: ['PUBLIC'] })]
    });
    expect(checkDeadPolicies(t, BASE_GRAPH)).toEqual([]);
  });
});

describe('L3 checkUnreachableGrants', () => {
  it('flags an object grant when the grantee lacks schema USAGE', () => {
    const t = table({ grants: [grant('authenticated', 'SELECT'), grant('authenticated', 'UPDATE')] });
    const acls = new Map([['app', schemaAcl({ grants: [{ role: 'app_admin', privilege: 'USAGE' }] })]]);
    const out = checkUnreachableGrants(t, acls, BASE_GRAPH);
    expect(out).toHaveLength(1);
    expect(out[0].code).toBe('L3');
    expect(out[0].role).toBe('authenticated');
    expect(out[0].privilege).toBe('SELECT, UPDATE');
  });

  it('accepts USAGE via PUBLIC, inheritance, or schema ownership', () => {
    const t = table({
      grants: [grant('authenticated', 'SELECT'), grant('app_admin', 'SELECT'), grant('app_owner', 'SELECT')]
    });
    const acls = new Map([
      ['app', schemaAcl({ grants: [{ role: 'PUBLIC', privilege: 'USAGE' }] })]
    ]);
    expect(checkUnreachableGrants(t, acls, BASE_GRAPH)).toEqual([]);

    const inherited = new Map([
      ['app', schemaAcl({ grants: [{ role: 'authenticated', privilege: 'USAGE' }] })]
    ]);
    const out = checkUnreachableGrants(t, inherited, BASE_GRAPH);
    // app_admin inherits authenticated's USAGE; app_owner owns the schema.
    expect(out).toEqual([]);
  });

  it('skips schemas outside the introspected ACL set', () => {
    const t = table({ schema: 'not_introspected', grants: [grant('authenticated', 'SELECT')] });
    expect(checkUnreachableGrants(t, new Map(), BASE_GRAPH)).toEqual([]);
  });
});

describe('L4 checkDeadSchemaUsage', () => {
  it('flags USAGE that reaches no relation and no function', () => {
    const acl = schemaAcl({ grants: [{ role: 'anonymous', privilege: 'USAGE' }] });
    const out = checkDeadSchemaUsage([acl], [table()], BASE_GRAPH);
    expect(out).toHaveLength(1);
    expect(out[0].code).toBe('L4');
    expect(out[0].role).toBe('anonymous');
  });

  it('accepts USAGE when the role reaches a relation or a function', () => {
    const aclFn = schemaAcl({
      grants: [{ role: 'anonymous', privilege: 'USAGE' }],
      executeRoles: ['PUBLIC']
    });
    expect(checkDeadSchemaUsage([aclFn], [table()], BASE_GRAPH)).toEqual([]);

    const aclRel = schemaAcl({ grants: [{ role: 'anonymous', privilege: 'USAGE' }] });
    const t = table({ grants: [grant('PUBLIC', 'SELECT')] });
    expect(checkDeadSchemaUsage([aclRel], [t], BASE_GRAPH)).toEqual([]);
  });
});

describe('L5 checkUntrustedIndirectAccess', () => {
  it('flags an untrusted role reaching an RLS-off table via PUBLIC', () => {
    const t = table({ rlsEnabled: false, grants: [grant('PUBLIC', 'SELECT')] });
    const out = checkUntrustedIndirectAccess(t, BASE_GRAPH, { roles: ['anonymous'] });
    expect(out).toHaveLength(1);
    expect(out[0].code).toBe('L5');
    expect(out[0].role).toBe('anonymous');
    expect(out[0].message).toContain('via PUBLIC');
  });

  it('ignores direct grants (A2/R1 territory) and RLS-on tables', () => {
    const direct = table({ rlsEnabled: false, grants: [grant('anonymous', 'SELECT')] });
    expect(checkUntrustedIndirectAccess(direct, BASE_GRAPH, { roles: ['anonymous'] })).toEqual([]);

    const rlsOn = table({ grants: [grant('PUBLIC', 'SELECT')] });
    expect(checkUntrustedIndirectAccess(rlsOn, BASE_GRAPH, { roles: ['anonymous'] })).toEqual([]);
  });

  it('is a no-op with no roles configured', () => {
    const t = table({ rlsEnabled: false, grants: [grant('PUBLIC', 'SELECT')] });
    expect(checkUntrustedIndirectAccess(t, BASE_GRAPH)).toEqual([]);
  });
});

describe('computeRoleAccess', () => {
  it('classifies unmediated, mediated, and dead access per role', () => {
    const tables = [
      // RLS off + PUBLIC SELECT → unmediated (the SPRT shape).
      table({ name: 'sprt', rlsEnabled: false, grants: [grant('PUBLIC', 'SELECT')] }),
      // RLS on + covered grant → mediated.
      table({
        name: 'covered',
        grants: [grant('anonymous', 'SELECT')],
        policies: [policy({ cmd: 'SELECT', roles: ['anonymous'] })]
      }),
      // RLS on + uncovered grant → dead.
      table({ name: 'dead', grants: [grant('anonymous', 'SELECT')] }),
      // No path at all → not counted.
      table({ name: 'unreachable', grants: [grant('authenticated', 'SELECT')] })
    ];

    const [entry] = computeRoleAccess(tables, BASE_GRAPH, ['anonymous']);
    expect(entry.role).toBe('anonymous');
    expect(entry.accessibleTables).toBe(2);
    expect(entry.mediated).toBe(1);
    expect(entry.dead).toBe(1);
    expect(entry.unmediated).toEqual([
      {
        schema: 'app',
        table: 'sprt',
        privileges: ['SELECT'],
        via: 'PUBLIC',
        access: 'unmediated'
      }
    ]);
  });
});
