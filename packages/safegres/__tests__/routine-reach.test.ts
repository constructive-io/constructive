import type { RoleGraph } from '../src/checks/lattice';
import { resolveRoutineReach } from '../src/exposure/routines';
import type { RoleAttributes, SchemaAclInfo } from '../src/pg/acl';
import type { FunctionSnapshot } from '../src/pg/functions';

function role(name: string, extra: Partial<RoleAttributes> = {}): RoleAttributes {
  return { name, bypassRls: false, isSuper: false, inheritsFrom: [], canSetRole: [], ...extra };
}

function fn(partial: Partial<FunctionSnapshot> & { schema: string; name: string }): FunctionSnapshot {
  return {
    oid: 1,
    args: '',
    owner: 'app_owner',
    ownerBypassesRls: false,
    isSecurityDefiner: true,
    searchPathPinned: false,
    returnsTrigger: false,
    language: 'plpgsql',
    source: null,
    definition: null,
    grants: [],
    defaultAcl: false,
    ...partial
  };
}

function acl(schema: string, usage: string[]): SchemaAclInfo {
  return {
    schema,
    owner: 'app_owner',
    grants: usage.map((r) => ({ role: r, privilege: 'USAGE' as const })),
    executeRoles: []
  };
}

const graph: RoleGraph = new Map([
  ['anonymous', role('anonymous')],
  ['authenticated', role('authenticated', { inheritsFrom: ['app_reader'] })]
]);

const schemaAcls = new Map([
  ['app_private', acl('app_private', ['anonymous', 'authenticated'])],
  ['app_locked', acl('app_locked', [])],
  ['app_public', acl('app_public', ['anonymous'])]
]);

const options = {
  roles: ['anonymous'],
  graph,
  schemaAcls,
  exposedSchemas: new Set(['app_public'])
};

describe('resolveRoutineReach', () => {
  it('reaches a function in an unexposed schema the role can execute', () => {
    // The whole point: `app_private` is off the API surface, so relation
    // reach says no — but anonymous holds USAGE and EXECUTE, so it can call
    // the definer function and get its owner's privileges.
    const reach = resolveRoutineReach(
      [fn({ schema: 'app_private', name: 'perm_check', grants: [{ role: 'anonymous', grantable: false }] })],
      options
    );
    expect([...reach]).toEqual(['app_private.perm_check']);
  });

  it('counts the default EXECUTE-to-PUBLIC ACL as reach', () => {
    const reach = resolveRoutineReach(
      [fn({
        schema: 'app_private',
        name: 'helper',
        grants: [{ role: 'PUBLIC', grantable: false }],
        defaultAcl: true
      })],
      options
    );
    expect(reach.has('app_private.helper')).toBe(true);
  });

  it('does not reach past a schema the role has no USAGE on', () => {
    // EXECUTE without USAGE names nothing — the same gate L3 applies to a
    // table grant. Without it, Postgres's default ACL would make every
    // function in every internal schema look reachable by everyone.
    const reach = resolveRoutineReach(
      [fn({ schema: 'app_locked', name: 'helper', grants: [{ role: 'PUBLIC', grantable: false }] })],
      options
    );
    expect(reach.size).toBe(0);
  });

  it('does not reach a function the role holds no EXECUTE on', () => {
    const reach = resolveRoutineReach(
      [fn({ schema: 'app_private', name: 'admin_only', grants: [{ role: 'administrator', grantable: false }] })],
      options
    );
    expect(reach.size).toBe(0);
  });

  it('follows role inheritance', () => {
    const reach = resolveRoutineReach(
      [fn({ schema: 'app_private', name: 'reader', grants: [{ role: 'app_reader', grantable: false }] })],
      { ...options, roles: ['authenticated'] }
    );
    expect(reach.has('app_private.reader')).toBe(true);
  });

  it('judges a trigger function by its schema, not its ACL', () => {
    // Postgres refuses a direct call however wide the ACL is, so EXECUTE on
    // one confers nothing. What reaches the body is a write that fires it.
    const reach = resolveRoutineReach(
      [
        fn({
          schema: 'app_private',
          name: 'on_write',
          returnsTrigger: true,
          grants: [{ role: 'PUBLIC', grantable: false }]
        }),
        fn({ schema: 'app_public', name: 'on_write', returnsTrigger: true, grants: [] })
      ],
      options
    );
    expect([...reach]).toEqual(['app_public.on_write']);
  });

  it('reaches nothing when no untrusted role is resolved', () => {
    const reach = resolveRoutineReach(
      [fn({ schema: 'app_private', name: 'helper', grants: [{ role: 'PUBLIC', grantable: false }] })],
      { ...options, roles: [] }
    );
    expect(reach.size).toBe(0);
  });
});
