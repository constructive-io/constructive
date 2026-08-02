import { extractQuery } from '../src/callgraph/extract';
import { analyzeViewBodies, checkDefinerViewBypass, checkUnreadableViewReach } from '../src/checks/definer-view';
import { type RoleGraph } from '../src/checks/lattice';
import type { RoleAttributes } from '../src/pg/acl';
import type { ViewSnapshot } from '../src/pg/indexes';
import type { TableSnapshot } from '../src/pg/introspect';

function table(partial: Partial<TableSnapshot> = {}): TableSnapshot {
  return {
    schema: 'app',
    name: 'orders',
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

function view(partial: Partial<ViewSnapshot> = {}): ViewSnapshot {
  return {
    schema: 'app',
    name: 'order_totals',
    owner: 'app_owner',
    materialized: false,
    securityInvoker: false,
    securityBarrier: false,
    ownerBypassesRls: false,
    grants: [{ role: 'anon', privilege: 'SELECT', grantable: false, bypassRls: false }],
    definition: 'SELECT id FROM app.orders',
    writable: [],
    checkOption: 'none',
    insteadOfTriggers: false,
    rules: [],
    ...partial
  };
}

function role(name: string, partial: Partial<RoleAttributes> = {}): [string, RoleAttributes] {
  return [
    name,
    { name, bypassRls: false, isSuper: false, inheritsFrom: [], canSetRole: [], ...partial }
  ];
}

const GRAPH: RoleGraph = new Map([role('anon'), role('app_owner')]);

const UNPARSEABLE = 'SELECT ((( FROM nowhere';
const DBLINK = "SELECT * FROM dblink('dbname=other', 'SELECT * FROM secrets') AS t(id int)";

async function l15(v: ViewSnapshot, tables: TableSnapshot[] = [table()]) {
  const { views } = await analyzeViewBodies([v, ...[]], tables);
  return checkUnreadableViewReach(views, GRAPH, { roles: ['anon'] });
}

describe('per-reference taint', () => {
  it('keeps the references it read when the body also runs SQL of its own', async () => {
    const body = await extractQuery(
      "SELECT id FROM app.orders UNION ALL SELECT id FROM dblink('dbname=x', 'SELECT 1') AS t(id int)"
    );
    // The difference from `opaque`: the relation it *could* read survives, so
    // the rules that grade a base relation still grade it.
    expect(body.tables.map((t) => t.name)).toContain('orders');
    expect(body.opaque).toBe(false);
    expect(body.tainted).toMatch(/dblink/);
  });

  it('leaves an ordinary body untainted', async () => {
    const body = await extractQuery('SELECT id FROM app.orders WHERE total > 0');
    expect(body.tainted).toBeUndefined();
  });
});

describe('L15 — a view body the analysis could not follow', () => {
  it('reports the view an untrusted role reads through an unparseable body', async () => {
    const [f] = await l15(view({ definition: UNPARSEABLE }));
    expect(f.code).toBe('L15');
    expect(f.schema).toBe('app');
    expect(f.table).toBe('order_totals');
    expect(f.role).toBe('anon');
    expect(f.context).toMatchObject({ proof: 'opaque-tainted' });
  });

  it('reports a readable body that executes SQL of its own', async () => {
    const [f] = await l15(view({ definition: DBLINK }));
    expect(f?.code).toBe('L15');
    expect(f.message).toMatch(/dblink/);
  });

  it('still grades the relations a tainted body did name', async () => {
    const definition = `SELECT id FROM app.orders UNION ALL ${DBLINK}`;
    const { views } = await analyzeViewBodies([view({ definition })], [table()]);
    // The proven half is proven: taint suppresses nothing that was read.
    expect(views[0].baseRelations.map((b) => b.table)).toEqual(['orders']);
    expect(checkDefinerViewBypass(views, [table()], GRAPH, { roles: ['anon'] })).toHaveLength(1);
    expect(checkUnreadableViewReach(views, GRAPH, { roles: ['anon'] })).toHaveLength(1);
  });

  it('stays silent on a body it read completely', async () => {
    expect(await l15(view())).toEqual([]);
  });

  it('stays silent when the untrusted role cannot read the view at all', async () => {
    expect(await l15(view({ definition: UNPARSEABLE, grants: [] }))).toEqual([]);
  });

  it('stays silent on an invoker view: the caller reads with its own privileges', async () => {
    expect(await l15(view({ definition: UNPARSEABLE, securityInvoker: true }))).toEqual([]);
  });

  it('is a coverage report, and recommends no revoke', async () => {
    const [f] = await l15(view({ definition: UNPARSEABLE }));
    expect(f.category).toBe('coverage');
    expect(f.severity).toBe('info');
    expect(f.hint).toMatch(/nothing here justifies a revoke/i);
  });

  it('does nothing without a configured role list', async () => {
    const { views } = await analyzeViewBodies([view({ definition: UNPARSEABLE })], [table()]);
    expect(checkUnreadableViewReach(views, GRAPH)).toEqual([]);
  });
});
