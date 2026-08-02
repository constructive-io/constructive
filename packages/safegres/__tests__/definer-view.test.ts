import { analyzeViewBodies, checkDefinerViewBypass } from '../src/checks/definer-view';
import { type RoleGraph } from '../src/checks/lattice';
import { computeViewReach } from '../src/checks/role-reach';
import type { RoleAttributes } from '../src/pg/acl';
import type { ViewSnapshot } from '../src/pg/indexes';
import type { GrantInfo, TableSnapshot } from '../src/pg/introspect';

function table(partial: Partial<TableSnapshot> = {}): TableSnapshot {
  return {
    schema: 'app',
    name: 'orders',
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
    name: 'order_totals',
    owner: 'app_owner',
    materialized: false,
    securityInvoker: false,
    securityBarrier: false,
    ownerBypassesRls: false,
    grants: [grant('anon', 'SELECT')],
    definition: 'SELECT id, total FROM app.orders',
    writable: [],
    insteadOfTriggers: false,
    insteadOf: [],
    rules: [],
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

describe('analyzeViewBodies', () => {
  it('resolves the base relations a definer view reads', async () => {
    const { views, suppressed } = await analyzeViewBodies([view()], [table()]);
    expect(suppressed).toEqual([]);
    expect(views).toHaveLength(1);
    expect(views[0].baseRelations).toEqual([
      { schema: 'app', table: 'orders', hops: [{ view: 'app.order_totals', owner: 'app_owner' }] }
    ]);
  });

  it('resolves an unqualified reference against the view own schema', async () => {
    const { views } = await analyzeViewBodies(
      [view({ definition: 'SELECT id FROM orders' })],
      [table()]
    );
    expect(views[0].baseRelations.map((b) => `${b.schema}.${b.table}`)).toEqual(['app.orders']);
  });

  it('ignores an invoker view: it executes as the caller, so it confers nothing', async () => {
    const { views } = await analyzeViewBodies([view({ securityInvoker: true })], [table()]);
    expect(views).toEqual([]);
  });

  it('ignores a materialized view: reading stored rows touches no base relation', async () => {
    const { views } = await analyzeViewBodies([view({ materialized: true })], [table()]);
    expect(views).toEqual([]);
  });

  it('follows a view on a view, re-owning the read at each definer hop', async () => {
    const inner = view({ name: 'orders_inner', owner: 'inner_owner' });
    const outer = view({
      name: 'orders_outer',
      owner: 'outer_owner',
      definition: 'SELECT id FROM app.orders_inner'
    });
    const { views } = await analyzeViewBodies([outer, inner], [table()]);
    const outerReach = views.find((v) => v.name === 'orders_outer')!;
    expect(outerReach.baseRelations).toEqual([
      {
        schema: 'app',
        table: 'orders',
        hops: [
          { view: 'app.orders_outer', owner: 'outer_owner' },
          { view: 'app.orders_inner', owner: 'inner_owner' }
        ]
      }
    ]);
  });

  it('keeps the outer owner in force through a nested invoker view', async () => {
    const inner = view({ name: 'orders_inner', owner: 'inner_owner', securityInvoker: true });
    const outer = view({
      name: 'orders_outer',
      owner: 'outer_owner',
      definition: 'SELECT id FROM app.orders_inner'
    });
    const { views } = await analyzeViewBodies([outer, inner], [table()]);
    const outerReach = views.find((v) => v.name === 'orders_outer')!;
    expect(outerReach.baseRelations[0].hops.map((h) => h.owner)).toEqual([
      'outer_owner',
      'outer_owner'
    ]);
  });

  it('grades nothing from a body it cannot read, and says so rather than reporting an empty one', async () => {
    const { views, suppressed } = await analyzeViewBodies(
      [view({ definition: 'SELECT ((( FROM nowhere' })],
      [table()]
    );
    // No relation is graded — a fragment of an unread body under-reports what
    // the view reaches — but the view itself stays in the model, carrying why,
    // so the gap is reportable (L15) instead of a silent clean bill.
    expect(views[0].baseRelations).toEqual([]);
    expect(views[0].unreadable).toBe('SQL fragment failed to parse');
    expect(suppressed).toEqual([
      { view: 'app.order_totals', reason: 'SQL fragment failed to parse' }
    ]);
  });

  it('does not pin an ambiguous unqualified name to a relation nobody named', async () => {
    const { views } = await analyzeViewBodies(
      [view({ schema: 'other', definition: 'SELECT id FROM orders' })],
      [table({ schema: 'app' }), table({ schema: 'archive', oid: 2 })]
    );
    expect(views).toEqual([]);
  });
});

describe('computeViewReach', () => {
  it('projects the base relation under the view owner, proven by AST', async () => {
    const { views } = await analyzeViewBodies([view()], [table()]);
    const [reach] = computeViewReach(views, GRAPH, ['anon']);
    expect(reach.cells).toHaveLength(1);
    expect(reach.cells[0]).toMatchObject({
      schema: 'app',
      table: 'orders',
      privileges: ['SELECT'],
      effectiveRole: 'app_owner',
      proof: 'ast'
    });
    expect(reach.cells[0].path).toEqual([
      { kind: 'grant', via: 'direct', privilege: 'SELECT' },
      { kind: 'view', view: 'app.order_totals', owner: 'app_owner' }
    ]);
  });

  it('needs SELECT on the view itself — an unreadable view reaches nothing', async () => {
    const { views } = await analyzeViewBodies([view({ grants: [] })], [table()]);
    const [reach] = computeViewReach(views, GRAPH, ['anon']);
    expect(reach.cells).toEqual([]);
  });

  it('follows a grant on the view that arrives via PUBLIC', async () => {
    const { views } = await analyzeViewBodies([view({ grants: [grant('PUBLIC', 'SELECT')] })], [table()]);
    const [reach] = computeViewReach(views, GRAPH, ['anon']);
    expect(reach.cells[0].path[0]).toEqual({ kind: 'grant', via: 'PUBLIC', privilege: 'SELECT' });
  });
});

describe('checkDefinerViewBypass (L8)', () => {
  async function check(views: ViewSnapshot[], tables: TableSnapshot[], roles: string[]) {
    const analyzed = await analyzeViewBodies(views, tables);
    return checkDefinerViewBypass(analyzed.views, tables, GRAPH, { roles });
  }

  it('is a no-op with no untrusted roles configured', async () => {
    expect(await check([view()], [table()], [])).toEqual([]);
  });

  it('flags a base relation the role reads only as the view owner', async () => {
    const findings = await check([view()], [table()], ['anon']);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      code: 'L8',
      severity: 'info',
      schema: 'app',
      table: 'orders',
      role: 'anon',
      privilege: 'SELECT'
    });
    expect(findings[0].context).toMatchObject({
      view: 'app.order_totals',
      effectiveRole: 'app_owner',
      proof: 'ast',
      rlsBypassed: false
    });
  });

  it('never recommends revoking a grant', async () => {
    const [finding] = await check([view()], [table()], ['anon']);
    expect(finding.hint).toContain('security_invoker');
    expect(finding.hint).toContain('Do not revoke');
  });

  it('stays silent when the role can read the base relation anyway', async () => {
    const base = table({ grants: [grant('anon', 'SELECT')] });
    expect(await check([view()], [base], ['anon'])).toEqual([]);
  });

  it('stays silent for a security_invoker view over the same shape', async () => {
    expect(await check([view({ securityInvoker: true })], [table()], ['anon'])).toEqual([]);
  });

  it('stays silent when the view owner is the untrusted role itself', async () => {
    const owned = view({ owner: 'anon' });
    expect(await check([owned], [table()], ['anon'])).toEqual([]);
  });

  it('says so when the owner is also exempt from the base table policies', async () => {
    const base = table({ rlsForced: false, owner: 'app_owner' });
    const [finding] = await check([view()], [base], ['anon']);
    expect(finding.context).toMatchObject({ rlsBypassed: true });
    expect(finding.message).toContain('not subject to its RLS policies');
  });

  it('reports nothing for a view whose body is opaque', async () => {
    const opaque = view({ definition: 'SELECT ((( FROM nowhere' });
    expect(await check([opaque], [table()], ['anon'])).toEqual([]);
  });

  it('sees a grant on the view the role holds by inheritance', async () => {
    const inheriting = graph(
      role('anon', { inheritsFrom: ['member'] }),
      role('member'),
      role('app_owner')
    );
    const analyzed = await analyzeViewBodies([view({ grants: [grant('member', 'SELECT')] })], [table()]);
    const findings = checkDefinerViewBypass(analyzed.views, [table()], inheriting, { roles: ['anon'] });
    expect(findings).toHaveLength(1);
  });
});
