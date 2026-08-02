import { type RoleGraph } from '../src/checks/lattice';
import { computeViewWriteReach } from '../src/checks/role-reach';
import {
  analyzeViewWrites,
  checkDefinerViewWrite,
  checkUncheckedViewWrite,
  checkViewRuleBypass
} from '../src/checks/view-writes';
import type { RoleAttributes } from '../src/pg/acl';
import type { ViewRule, ViewSnapshot } from '../src/pg/indexes';
import type { GrantInfo, TableSnapshot } from '../src/pg/introspect';

function table(partial: Partial<TableSnapshot> = {}): TableSnapshot {
  return {
    schema: 'app',
    name: 'submissions',
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
    definition: 'SELECT id, body FROM app.submissions',
    writable: ['INSERT', 'UPDATE', 'DELETE'],
    checkOption: 'none',
    insteadOfTriggers: false,
    insteadOf: [],
    rules: [],
    ...partial
  };
}

function rule(partial: Partial<ViewRule> = {}): ViewRule {
  return {
    name: 'inbox_insert',
    event: 'INSERT',
    instead: true,
    definition:
      'CREATE RULE inbox_insert AS ON INSERT TO app.inbox '
      + 'DO INSTEAD INSERT INTO app.audit_log (note) VALUES (new.body);',
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

const GRAPH = graph(role('anon'), role('app_owner'), role('member'));
const AUDIT = table({ name: 'audit_log', oid: 2, rlsEnabled: false, rlsForced: false });

describe('analyzeViewWrites — auto-updatable views', () => {
  it('resolves the base relation a definer view rewrites writes onto', async () => {
    const { autoUpdatable } = await analyzeViewWrites([view()], [table()]);
    expect(autoUpdatable).toHaveLength(1);
    expect(autoUpdatable[0].writeEdges).toEqual([
      {
        schema: 'app',
        table: 'submissions',
        via: 'INSERT',
        privilege: 'INSERT',
        hops: [{ view: 'app.inbox', owner: 'app_owner' }]
      },
      {
        schema: 'app',
        table: 'submissions',
        via: 'UPDATE',
        privilege: 'UPDATE',
        hops: [{ view: 'app.inbox', owner: 'app_owner' }]
      },
      {
        schema: 'app',
        table: 'submissions',
        via: 'DELETE',
        privilege: 'DELETE',
        hops: [{ view: 'app.inbox', owner: 'app_owner' }]
      }
    ]);
  });

  it('ignores an invoker view: the rewritten write is checked against the caller', async () => {
    const { autoUpdatable } = await analyzeViewWrites([view({ securityInvoker: true })], [table()]);
    expect(autoUpdatable).toEqual([]);
  });

  it('ignores a view Postgres will not accept writes on', async () => {
    const { autoUpdatable } = await analyzeViewWrites([view({ writable: [] })], [table()]);
    expect(autoUpdatable).toEqual([]);
  });

  it('suppresses a view whose INSTEAD OF triggers decide where the write lands', async () => {
    const { autoUpdatable, suppressed } = await analyzeViewWrites(
      [view({ insteadOfTriggers: true })],
      [table()]
    );
    expect(autoUpdatable).toEqual([]);
    expect(suppressed[0].reason).toContain('INSTEAD OF');
  });

  it('places no write on a join view: auto-update needs exactly one target', async () => {
    const joined = view({
      definition: 'SELECT s.id FROM app.submissions s JOIN app.audit_log a ON a.id = s.id'
    });
    const { autoUpdatable } = await analyzeViewWrites([joined], [table(), AUDIT]);
    expect(autoUpdatable).toEqual([]);
  });

  it('suppresses a view whose body it cannot read', async () => {
    const { autoUpdatable, suppressed } = await analyzeViewWrites(
      [view({ definition: 'SELECT ((( FROM nowhere' })],
      [table()]
    );
    expect(autoUpdatable).toEqual([]);
    expect(suppressed).toEqual([{ view: 'app.inbox', reason: 'SQL fragment failed to parse' }]);
  });

  it('follows a view on a view, re-owning the write at each definer hop', async () => {
    const inner = view({ name: 'inner', owner: 'inner_owner' });
    const outer = view({
      name: 'outer',
      owner: 'outer_owner',
      writable: ['INSERT'],
      definition: 'SELECT id FROM app.inner'
    });
    const { autoUpdatable } = await analyzeViewWrites([outer, inner], [table()]);
    const edges = autoUpdatable.find((v) => v.name === 'outer')!.writeEdges;
    expect(edges[0].hops).toEqual([
      { view: 'app.outer', owner: 'outer_owner' },
      { view: 'app.inner', owner: 'inner_owner' }
    ]);
  });
});

describe('analyzeViewWrites — rewrite rules', () => {
  it('resolves the relation a rule action writes, which the body never names', async () => {
    const { ruleDriven } = await analyzeViewWrites([view({ rules: [rule()] })], [table(), AUDIT]);
    expect(ruleDriven).toHaveLength(1);
    expect(ruleDriven[0].writeEdges).toEqual([
      {
        schema: 'app',
        table: 'audit_log',
        via: 'INSERT',
        privilege: 'INSERT',
        hops: [{ view: 'app.inbox', owner: 'app_owner' }],
        rule: 'inbox_insert'
      }
    ]);
  });

  it('reads rules on invoker views too: security_invoker does not govern a rule action', async () => {
    const { ruleDriven } = await analyzeViewWrites(
      [view({ securityInvoker: true, rules: [rule()] })],
      [table(), AUDIT]
    );
    expect(ruleDriven[0].writeEdges[0].table).toBe('audit_log');
  });

  it('keeps the privilege the action exercises, not the one that fired the rule', async () => {
    const updating = rule({
      name: 'inbox_delete',
      event: 'DELETE',
      definition:
        'CREATE RULE inbox_delete AS ON DELETE TO app.inbox '
        + "DO INSTEAD UPDATE app.audit_log SET note = 'deleted' WHERE id = old.id;"
    });
    const { ruleDriven } = await analyzeViewWrites([view({ rules: [updating] })], [table(), AUDIT]);
    expect(ruleDriven[0].writeEdges[0]).toMatchObject({ via: 'DELETE', privilege: 'UPDATE' });
  });

  it('reaches nothing through DO INSTEAD NOTHING — a read-only view confers no write', async () => {
    const nothing = rule({
      name: 'inbox_no_insert',
      definition: 'CREATE RULE inbox_no_insert AS ON INSERT TO app.inbox DO INSTEAD NOTHING;'
    });
    const { ruleDriven } = await analyzeViewWrites([view({ rules: [nothing] })], [table(), AUDIT]);
    expect(ruleDriven).toEqual([]);
  });

  it('ignores the view its own rule is on: that reference is the trigger, not a target', async () => {
    const selfWrite = rule({
      definition:
        'CREATE RULE inbox_insert AS ON INSERT TO app.inbox '
        + 'DO INSTEAD INSERT INTO app.inbox (body) VALUES (new.body);'
    });
    const { ruleDriven } = await analyzeViewWrites([view({ rules: [selfWrite] })], [table(), AUDIT]);
    expect(ruleDriven).toEqual([]);
  });

  it('suppresses a rule action it cannot read', async () => {
    const broken = rule({ definition: 'CREATE RULE ((( AS ON INSERT' });
    const { ruleDriven, suppressed } = await analyzeViewWrites(
      [view({ rules: [broken] })],
      [table(), AUDIT]
    );
    expect(ruleDriven).toEqual([]);
    expect(suppressed[0].reason).toContain('cannot follow');
  });
});

describe('computeViewWriteReach', () => {
  it('projects the target under the view owner, proven by AST', async () => {
    const { autoUpdatable } = await analyzeViewWrites([view({ writable: ['INSERT'] })], [table()]);
    const [reach] = computeViewWriteReach(autoUpdatable, GRAPH, ['anon']);
    expect(reach.cells).toHaveLength(1);
    expect(reach.cells[0]).toMatchObject({
      schema: 'app',
      table: 'submissions',
      privileges: ['INSERT'],
      effectiveRole: 'app_owner',
      proof: 'ast'
    });
  });

  it('needs the triggering command on the view: SELECT on it reaches no write', async () => {
    const readOnly = view({ writable: ['INSERT'], grants: [grant('anon', 'SELECT')] });
    const { autoUpdatable } = await analyzeViewWrites([readOnly], [table()]);
    const [reach] = computeViewWriteReach(autoUpdatable, GRAPH, ['anon']);
    expect(reach.cells).toEqual([]);
  });

  it('carries the rule edge on the path', async () => {
    const { ruleDriven } = await analyzeViewWrites([view({ rules: [rule()] })], [table(), AUDIT]);
    const [reach] = computeViewWriteReach(ruleDriven, GRAPH, ['anon']);
    expect(reach.cells[0].path).toEqual([
      { kind: 'grant', via: 'direct', privilege: 'INSERT' },
      { kind: 'view', view: 'app.inbox', owner: 'app_owner' },
      { kind: 'rule', view: 'app.inbox', rule: 'inbox_insert', owner: 'app_owner' }
    ]);
  });
});

describe('checkDefinerViewWrite (L9)', () => {
  async function check(views: ViewSnapshot[], tables: TableSnapshot[], roles: string[]) {
    const { autoUpdatable } = await analyzeViewWrites(views, tables);
    return checkDefinerViewWrite(autoUpdatable, tables, GRAPH, { roles });
  }

  it('is a no-op with no untrusted roles configured', async () => {
    expect(await check([view()], [table()], [])).toEqual([]);
  });

  it('flags a base relation the role writes only as the view owner', async () => {
    const findings = await check([view({ writable: ['INSERT'] })], [table()], ['anon']);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      code: 'L9',
      severity: 'info',
      schema: 'app',
      table: 'submissions',
      role: 'anon',
      privilege: 'INSERT'
    });
    expect(findings[0].context).toMatchObject({
      view: 'app.inbox',
      effectiveRole: 'app_owner',
      proof: 'ast'
    });
  });

  it('never recommends revoking a grant', async () => {
    const [finding] = await check([view({ writable: ['INSERT'] })], [table()], ['anon']);
    expect(finding.hint).toContain('security_invoker');
    expect(finding.hint).toContain('Do not revoke');
  });

  it('stays silent when the role can write the base relation anyway', async () => {
    const base = table({ grants: [grant('anon', 'INSERT')] });
    expect(await check([view({ writable: ['INSERT'] })], [base], ['anon'])).toEqual([]);
  });

  it('stays silent for a security_invoker view over the same shape', async () => {
    const invoker = view({ securityInvoker: true, writable: ['INSERT'] });
    expect(await check([invoker], [table()], ['anon'])).toEqual([]);
  });

  it('says so when the owner is also exempt from the base table policies', async () => {
    const base = table({ rlsForced: false, owner: 'app_owner' });
    const [finding] = await check([view({ writable: ['INSERT'] })], [base], ['anon']);
    expect(finding.context).toMatchObject({ rlsBypassed: true });
    expect(finding.message).toContain('not subject to its RLS policies');
  });
});

describe('checkUncheckedViewWrite (L18)', () => {
  const FILTERED = "SELECT id, body FROM app.submissions WHERE tenant_id = current_setting('app.tenant')";

  async function check(views: ViewSnapshot[], tables: TableSnapshot[], roles: string[]) {
    const { unchecked } = await analyzeViewWrites(views, tables);
    return checkUncheckedViewWrite(unchecked, tables, GRAPH, { roles });
  }

  it('flags a filtering view a role writes through without WITH CHECK OPTION', async () => {
    const writable = view({
      definition: FILTERED,
      grants: [grant('anon', 'INSERT'), grant('anon', 'UPDATE')]
    });
    const findings = await check([writable], [table()], ['anon']);
    expect(findings.map((f) => f.privilege).sort()).toEqual(['INSERT', 'UPDATE']);
    expect(findings[0]).toMatchObject({ code: 'L18', severity: 'info', table: 'submissions' });
    expect(findings[0].message).toContain('no WITH CHECK OPTION');
  });

  it('stays silent once the view carries a check option', async () => {
    const checked = view({ definition: FILTERED, checkOption: 'cascaded' });
    expect(await check([checked], [table()], ['anon'])).toEqual([]);
  });

  it('stays silent for a writable view with no row filter to escape', async () => {
    expect(await check([view()], [table()], ['anon'])).toEqual([]);
  });

  it('suppresses a view whose body cannot be read rather than clearing it', async () => {
    const { unchecked, suppressed } = await analyzeViewWrites(
      [view({ definition: 'SELECT ((( FROM app.submissions' })],
      [table()]
    );
    expect(unchecked).toEqual([]);
    expect(suppressed).not.toEqual([]);
  });

  it('never recommends revoking a grant', async () => {
    const [finding] = await check([view({ definition: FILTERED })], [table()], ['anon']);
    expect(finding.hint).toContain('CHECK OPTION');
    expect(finding.hint).toContain('Do not revoke');
  });
});

describe('checkViewRuleBypass (L10)', () => {
  async function check(views: ViewSnapshot[], tables: TableSnapshot[], roles: string[]) {
    const { ruleDriven } = await analyzeViewWrites(views, tables);
    return checkViewRuleBypass(ruleDriven, tables, GRAPH, { roles });
  }

  it('flags the relation a rule writes as the view owner', async () => {
    const findings = await check([view({ rules: [rule()] })], [table(), AUDIT], ['anon']);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      code: 'L10',
      severity: 'info',
      schema: 'app',
      table: 'audit_log',
      role: 'anon',
      privilege: 'INSERT'
    });
    expect(findings[0].context).toMatchObject({ rule: 'inbox_insert', viewPrivilege: 'INSERT' });
  });

  it('fires on an invoker view: security_invoker does not govern the rule action', async () => {
    const invoker = view({ securityInvoker: true, rules: [rule()] });
    const findings = await check([invoker], [table(), AUDIT], ['anon']);
    expect(findings).toHaveLength(1);
  });

  it('stays silent when the role can write the target anyway', async () => {
    const audit = table({ ...AUDIT, grants: [grant('anon', 'INSERT')] });
    expect(await check([view({ rules: [rule()] })], [table(), audit], ['anon'])).toEqual([]);
  });

  it('never recommends revoking a grant', async () => {
    const [finding] = await check([view({ rules: [rule()] })], [table(), AUDIT], ['anon']);
    expect(finding.hint).toContain('Do not revoke');
  });
});
