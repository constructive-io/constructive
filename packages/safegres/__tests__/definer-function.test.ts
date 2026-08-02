import {
  analyzeFunctionBodies,
  checkDefinerFunctionReach,
  checkInsteadOfTriggerWrite,
  checkUnreadableFunctionReach
} from '../src/checks/definer-function';
import type { RoleGraph } from '../src/checks/lattice';
import type { RoleAttributes, SchemaAclInfo } from '../src/pg/acl';
import type { FunctionSnapshot } from '../src/pg/functions';
import type { InsteadOfTrigger, ViewSnapshot } from '../src/pg/indexes';
import type { GrantInfo, TableSnapshot } from '../src/pg/introspect';

function table(partial: Partial<TableSnapshot> = {}): TableSnapshot {
  return {
    schema: 'app',
    name: 'secrets',
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

function fn(partial: Partial<FunctionSnapshot> = {}): FunctionSnapshot {
  const name = partial.name ?? 'read_secrets';
  const source = partial.source ?? ' SELECT id, body FROM app.secrets ';
  return {
    oid: 100,
    schema: 'app',
    name,
    args: '',
    owner: 'app_owner',
    ownerBypassesRls: false,
    isSecurityDefiner: true,
    searchPathPinned: true,
    language: 'sql',
    source,
    definition: `CREATE FUNCTION app.${name}() RETURNS SETOF app.secrets LANGUAGE sql AS $$${source}$$`,
    grants: [{ role: 'anon', grantable: false }],
    defaultAcl: false,
    returnsTrigger: false,
    ...partial
  };
}

function plpgsql(name: string, body: string, partial: Partial<FunctionSnapshot> = {}): FunctionSnapshot {
  return fn({
    name,
    language: 'plpgsql',
    source: body,
    definition:
      `CREATE FUNCTION app.${name}() RETURNS trigger LANGUAGE plpgsql AS $$${body}$$`,
    returnsTrigger: true,
    ...partial
  });
}

function view(partial: Partial<ViewSnapshot> = {}): ViewSnapshot {
  return {
    schema: 'app',
    name: 'inbox',
    owner: 'app_owner',
    materialized: false,
    securityInvoker: false,
    securityBarrier: false,
    ownerBypassesRls: false,
    grants: [grant('anon', 'INSERT')],
    definition: 'SELECT id, body FROM app.secrets',
    writable: ['INSERT'],
    insteadOfTriggers: false,
    insteadOf: [],
    rules: [],
    ...partial
  };
}

function trigger(partial: Partial<InsteadOfTrigger> = {}): InsteadOfTrigger {
  return {
    name: 'inbox_insert',
    events: ['INSERT'],
    functionSchema: 'app',
    functionName: 'tg_inbox',
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

const ACLS = new Map<string, SchemaAclInfo>([
  ['app', { schema: 'app', owner: 'app_owner', grants: [{ role: 'anon', privilege: 'USAGE' }], executeRoles: ['anon'] }]
]);

const GRAPH = graph(role('anon'), role('app_owner'), role('other_owner'));

describe('analyzeFunctionBodies — what a definer body reaches', () => {
  it('resolves the relations a SQL definer body touches, under the owner', async () => {
    const { functions } = await analyzeFunctionBodies([fn()], [], [table()]);
    expect(functions).toHaveLength(1);
    expect(functions[0].accesses).toEqual([
      {
        schema: 'app',
        table: 'secrets',
        privilege: 'SELECT',
        hops: [{ fn: 'app.read_secrets', owner: 'app_owner' }]
      }
    ]);
  });

  it('ignores an invoker function: its body runs as the caller', async () => {
    const { functions } = await analyzeFunctionBodies(
      [fn({ isSecurityDefiner: false })],
      [],
      [table()]
    );
    expect(functions).toEqual([]);
  });

  it('reads the privilege each reference exercises, not a read/write bit', async () => {
    const writer = fn({
      name: 'log',
      source: ' INSERT INTO app.secrets (body) VALUES (\'x\') ',
      oid: 101
    });
    const { functions } = await analyzeFunctionBodies([writer], [], [table()]);
    expect(functions[0].accesses.map((a) => a.privilege)).toEqual(['INSERT']);
  });

  it('follows a call into another definer, which re-owns the execution', async () => {
    const inner = fn({
      oid: 102,
      name: 'inner',
      owner: 'other_owner',
      source: ' SELECT id FROM app.secrets '
    });
    const outer = fn({
      oid: 103,
      name: 'outer',
      source: ' SELECT app.inner() '
    });
    const { functions } = await analyzeFunctionBodies([outer, inner], [], [table()]);
    const outerReach = functions.find((f) => f.name === 'outer')!;
    expect(outerReach.accesses).toEqual([
      {
        schema: 'app',
        table: 'secrets',
        privilege: 'SELECT',
        hops: [
          { fn: 'app.outer', owner: 'app_owner' },
          { fn: 'app.inner', owner: 'other_owner' }
        ]
      }
    ]);
  });

  it('keeps the definer owner in force through an invoker callee', async () => {
    const inner = fn({
      oid: 104,
      name: 'inner',
      owner: 'other_owner',
      isSecurityDefiner: false,
      source: ' SELECT id FROM app.secrets '
    });
    const outer = fn({ oid: 105, name: 'outer', source: ' SELECT app.inner() ' });
    const { functions } = await analyzeFunctionBodies([outer, inner], [], [table()]);
    const outerReach = functions.find((f) => f.name === 'outer')!;
    expect(outerReach.accesses[0].hops).toEqual([
      { fn: 'app.outer', owner: 'app_owner' },
      { fn: 'app.inner', owner: 'app_owner' }
    ]);
  });

  it('follows a definer body into a view, and on to the view\'s bases', async () => {
    const reader = fn({ oid: 106, name: 'via_view', source: ' SELECT id FROM app.inbox ' });
    const { functions } = await analyzeFunctionBodies([reader], [view()], [table()]);
    expect(functions[0].accesses[0]).toMatchObject({
      schema: 'app',
      table: 'secrets',
      privilege: 'SELECT',
      viewHops: [{ view: 'app.inbox', owner: 'app_owner' }]
    });
  });

  it('carries an unreadable body as a gap rather than an empty reach', async () => {
    const opaque = plpgsql('dyn', 'BEGIN EXECUTE \'SELECT 1\'; END', {
      oid: 107,
      returnsTrigger: false
    });
    const { functions, suppressed } = await analyzeFunctionBodies([opaque], [], [table()]);
    expect(functions[0].accesses).toEqual([]);
    expect(functions[0].unreadable).toContain('dynamic SQL');
    expect(suppressed[0].view).toBe('app.dyn()');
  });

  it('survives recursion without walking forever', async () => {
    const self = fn({ oid: 108, name: 'loop', source: ' SELECT app.loop() ' });
    const { functions } = await analyzeFunctionBodies([self], [], [table()]);
    expect(functions).toEqual([]);
  });
});

describe('L19 — definer-function reach', () => {
  it('fires when an untrusted role reaches a relation it holds nothing on', async () => {
    const { functions } = await analyzeFunctionBodies([fn()], [], [table()]);
    const findings = checkDefinerFunctionReach(functions, [table()], GRAPH, ACLS, { roles: ['anon'] });

    expect(findings).toHaveLength(1);
    expect(findings[0].code).toBe('L19');
    expect(findings[0].severity).toBe('info');
    expect(findings[0].message).toContain('app.read_secrets');
    expect(findings[0].message).toContain('runs as its owner app_owner');
    expect(findings[0].hint).toContain('Do not revoke EXECUTE');
    expect(findings[0].context).toMatchObject({ effectiveRole: 'app_owner', proof: 'ast' });
  });

  it('stays silent when the role already holds the privilege outright', async () => {
    const granted = table({ grants: [grant('anon', 'SELECT')] });
    const { functions } = await analyzeFunctionBodies([fn()], [], [granted]);
    expect(checkDefinerFunctionReach(functions, [granted], GRAPH, ACLS, { roles: ['anon'] })).toEqual([]);
  });

  it('reaches a role that holds EXECUTE only through PUBLIC', async () => {
    const wide = fn({ grants: [{ role: 'PUBLIC', grantable: false }], defaultAcl: true });
    const { functions } = await analyzeFunctionBodies([wide], [], [table()]);
    const findings = checkDefinerFunctionReach(functions, [table()], GRAPH, ACLS, { roles: ['anon'] });
    expect(findings).toHaveLength(1);
    expect(findings[0].context).toMatchObject({ defaultAcl: true });
    expect(findings[0].hint).toContain('default function ACL');
  });

  it('says so when the owner is not subject to the relation\'s policies', async () => {
    const rls = table({ rlsEnabled: true, owner: 'app_owner' });
    const { functions } = await analyzeFunctionBodies([fn()], [], [rls]);
    const findings = checkDefinerFunctionReach(functions, [rls], GRAPH, ACLS, { roles: ['anon'] });
    expect(findings[0].message).toContain('not subject to its RLS policies');
    expect(findings[0].context).toMatchObject({ rlsBypassed: true });
  });

  it('grades nothing from an unreadable body — L15 reports it instead', async () => {
    const opaque = plpgsql('dyn', 'BEGIN EXECUTE \'SELECT 1\'; END', {
      oid: 109,
      returnsTrigger: false
    });
    const { functions } = await analyzeFunctionBodies([opaque], [], [table()]);

    expect(checkDefinerFunctionReach(functions, [table()], GRAPH, ACLS, { roles: ['anon'] })).toEqual([]);

    const coverage = checkUnreadableFunctionReach(functions, GRAPH, ACLS, { roles: ['anon'] });
    expect(coverage).toHaveLength(1);
    expect(coverage[0].code).toBe('L15');
    expect(coverage[0].category).toBe('coverage');
    expect(coverage[0].hint).toContain('nothing here justifies a revoke');
  });
});

describe('L19 — what is not reach', () => {
  it('stays silent when the role cannot enter the function\'s schema', async () => {
    const { functions } = await analyzeFunctionBodies([fn()], [], [table()]);
    const noUsage = new Map<string, SchemaAclInfo>([
      ['app', { schema: 'app', owner: 'app_owner', grants: [], executeRoles: [] }]
    ]);
    expect(
      checkDefinerFunctionReach(functions, [table()], GRAPH, noUsage, { roles: ['anon'] })
    ).toEqual([]);
  });


  it('never grades a trigger function: Postgres refuses to call one directly', async () => {
    const tg = plpgsql('tg_inbox', 'BEGIN INSERT INTO app.secrets (body) VALUES (\'x\'); RETURN NEW; END', {
      oid: 115,
      grants: [{ role: 'PUBLIC', grantable: false }],
      defaultAcl: true
    });
    const { functions } = await analyzeFunctionBodies([tg], [], [table()]);
    expect(functions).toEqual([]);
  });
});

describe('L20 — INSTEAD OF trigger writes', () => {
  const body = 'BEGIN INSERT INTO app.secrets (body) VALUES (NEW.body); RETURN NEW; END';

  it('follows the write into a definer trigger function\'s body', async () => {
    const tg = plpgsql('tg_inbox', body, { oid: 110 });
    const target = view({ insteadOfTriggers: true, insteadOf: [trigger()] });
    const { triggers } = await analyzeFunctionBodies([tg], [target], [table()]);

    const findings = checkInsteadOfTriggerWrite(triggers, [table()], GRAPH, { roles: ['anon'] });
    expect(findings).toHaveLength(1);
    expect(findings[0].code).toBe('L20');
    expect(findings[0].privilege).toBe('INSERT');
    expect(findings[0].message).toContain('INSTEAD OF trigger inbox_insert');
    expect(findings[0].hint).toContain('Do not revoke the grant on the view');
    expect(findings[0].context).toMatchObject({
      view: 'app.inbox',
      trigger: 'inbox_insert',
      function: 'app.tg_inbox',
      effectiveRole: 'app_owner'
    });
  });

  it('stays silent for an invoker trigger function: the body runs as the caller', async () => {
    const tg = plpgsql('tg_inbox', body, { oid: 111, isSecurityDefiner: false });
    const target = view({ insteadOfTriggers: true, insteadOf: [trigger()] });
    const { triggers } = await analyzeFunctionBodies([tg], [target], [table()]);
    expect(triggers).toEqual([]);
  });

  it('stays silent when the role cannot issue the command the trigger fires on', async () => {
    const tg = plpgsql('tg_inbox', body, { oid: 112 });
    const readOnly = view({
      insteadOfTriggers: true,
      insteadOf: [trigger()],
      grants: [grant('anon', 'SELECT')]
    });
    const { triggers } = await analyzeFunctionBodies([tg], [readOnly], [table()]);
    expect(checkInsteadOfTriggerWrite(triggers, [table()], GRAPH, { roles: ['anon'] })).toEqual([]);
  });

  it('suppresses a trigger whose function body cannot be read', async () => {
    const tg = plpgsql('tg_inbox', 'BEGIN EXECUTE \'INSERT INTO app.secrets VALUES (1)\'; END', {
      oid: 113
    });
    const target = view({ insteadOfTriggers: true, insteadOf: [trigger()] });
    const { triggers, suppressed } = await analyzeFunctionBodies([tg], [target], [table()]);
    expect(triggers).toEqual([]);
    expect(suppressed.some((s) => s.reason.includes('trigger inbox_insert'))).toBe(true);
  });

  it('suppresses a trigger whose function is outside the audited schemas', async () => {
    const target = view({
      insteadOfTriggers: true,
      insteadOf: [trigger({ functionSchema: 'other', functionName: 'tg_elsewhere' })]
    });
    const { triggers, suppressed } = await analyzeFunctionBodies([], [target], [table()]);
    expect(triggers).toEqual([]);
    expect(suppressed[0].reason).toContain('outside the audited schemas');
  });

  it('stays silent when the role could already write the relation directly', async () => {
    const writable = table({ grants: [grant('anon', 'INSERT')] });
    const tg = plpgsql('tg_inbox', body, { oid: 114 });
    const target = view({ insteadOfTriggers: true, insteadOf: [trigger()] });
    const { triggers } = await analyzeFunctionBodies([tg], [target], [writable]);
    expect(checkInsteadOfTriggerWrite(triggers, [writable], GRAPH, { roles: ['anon'] })).toEqual([]);
  });
});
