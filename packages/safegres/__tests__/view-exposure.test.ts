import { type RoleGraph } from '../src/checks/lattice';
import {
  analyzeViewExposure,
  checkLeakyFilterView,
  checkMatviewSnapshot
} from '../src/checks/view-exposure';
import type { RoleAttributes } from '../src/pg/acl';
import type { ViewSnapshot } from '../src/pg/indexes';
import type { GrantInfo, TableSnapshot } from '../src/pg/introspect';

function table(partial: Partial<TableSnapshot> = {}): TableSnapshot {
  return {
    schema: 'app',
    name: 'secrets',
    oid: 1,
    rlsEnabled: true,
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
    name: 'secrets_mv',
    owner: 'app_owner',
    materialized: true,
    securityInvoker: false,
    securityBarrier: false,
    ownerBypassesRls: false,
    grants: [grant('anon', 'SELECT')],
    definition: 'SELECT id, body FROM app.secrets',
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

/** A plain view over one table, filtered, definer, no barrier — the L12 shape. */
function filterView(partial: Partial<ViewSnapshot> = {}): ViewSnapshot {
  return view({
    name: 'my_secrets',
    materialized: false,
    definition: 'SELECT id, body FROM app.secrets WHERE owner_name = CURRENT_USER',
    ...partial
  });
}

describe('analyzeViewExposure — materialized views', () => {
  it('resolves the relations a matview refresh copied from', async () => {
    const { matviews } = await analyzeViewExposure([view()], [table()]);
    expect(matviews).toHaveLength(1);
    expect(matviews[0].materialized).toBe(true);
    expect(matviews[0].baseRelations).toEqual([
      { schema: 'app', table: 'secrets', hops: [{ view: 'app.secrets_mv', owner: 'app_owner' }] }
    ]);
  });

  it('reads a matview body regardless of security_invoker, which matviews cannot carry', async () => {
    const { matviews } = await analyzeViewExposure([view({ securityInvoker: true })], [table()]);
    expect(matviews).toHaveLength(1);
  });

  it('suppresses a matview whose body cannot be parsed', async () => {
    const { matviews, suppressed } = await analyzeViewExposure(
      [view({ definition: 'SELECT FROM WHERE ((' })],
      [table()]
    );
    expect(matviews).toEqual([]);
    expect(suppressed).toHaveLength(1);
  });

  it('does not follow a matview as a nested relation of another view', async () => {
    // `app.secrets_mv` stores rows; a view over it reads the snapshot, not the
    // table the snapshot came from.
    const outer = view({
      name: 'wrapper',
      materialized: false,
      definition: 'SELECT id FROM app.secrets_mv'
    });
    const { leaky, matviews } = await analyzeViewExposure([view(), outer], [table()]);
    expect(matviews).toHaveLength(1);
    expect(leaky).toEqual([]);
  });
});

describe('analyzeViewExposure — non-barrier filtering views', () => {
  it('collects a filtering definer view with no barrier', async () => {
    const { leaky } = await analyzeViewExposure([filterView()], [table()]);
    expect(leaky).toHaveLength(1);
    expect(leaky[0].name).toBe('my_secrets');
  });

  it('ignores the same view once it is a barrier', async () => {
    const { leaky } = await analyzeViewExposure([filterView({ securityBarrier: true })], [table()]);
    expect(leaky).toEqual([]);
  });

  it('ignores an invoker view: the caller needs its own grant, so nothing is hidden by the view', async () => {
    const { leaky } = await analyzeViewExposure([filterView({ securityInvoker: true })], [table()]);
    expect(leaky).toEqual([]);
  });

  it('ignores a view with no row filter — there are no excluded rows to reach', async () => {
    const { leaky } = await analyzeViewExposure(
      [filterView({ definition: 'SELECT id, body FROM app.secrets' })],
      [table()]
    );
    expect(leaky).toEqual([]);
  });

  it('counts a HAVING clause as a row filter', async () => {
    const { leaky } = await analyzeViewExposure(
      [filterView({
        definition: 'SELECT owner_name, count(*) FROM app.secrets GROUP BY owner_name HAVING count(*) > 1'
      })],
      [table()]
    );
    expect(leaky).toHaveLength(1);
  });

  it('suppresses a filtering view whose body cannot be parsed', async () => {
    const { leaky, suppressed } = await analyzeViewExposure(
      [filterView({ definition: 'SELECT ) WHERE (' })],
      [table()]
    );
    expect(leaky).toEqual([]);
    expect(suppressed).toHaveLength(1);
  });
});

describe('checkMatviewSnapshot (L11)', () => {
  async function check(views: ViewSnapshot[], tables: TableSnapshot[], roles: string[]) {
    const { matviews } = await analyzeViewExposure(views, tables);
    return checkMatviewSnapshot(matviews, tables, GRAPH, { roles });
  }

  it('reports a matview handing an untrusted role a table it holds nothing on', async () => {
    const findings = await check([view()], [table()], ['anon']);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      code: 'L11',
      severity: 'info',
      schema: 'app',
      table: 'secrets',
      role: 'anon',
      privilege: 'SELECT'
    });
    expect(findings[0].context).toMatchObject({
      matview: 'app.secrets_mv',
      effectiveRole: 'app_owner',
      holdsBaseSelect: false,
      proof: 'ast'
    });
  });

  it('still reports when the role can read the table, because RLS filtered rows the snapshot did not', async () => {
    const base = table({ grants: [grant('anon', 'SELECT')] });
    const findings = await check([view()], [base], ['anon']);
    expect(findings).toHaveLength(1);
    expect(findings[0].context).toMatchObject({ holdsBaseSelect: true, rlsBypassed: true });
    expect(findings[0].message).toContain('without the row filter its policies apply');
  });

  it('stays silent when the role reads the table directly and no policy filters it', async () => {
    const base = table({ rlsEnabled: false, grants: [grant('anon', 'SELECT')] });
    expect(await check([view()], [base], ['anon'])).toEqual([]);
  });

  it('stays silent for a role that bypasses RLS and holds the grant', async () => {
    const base = table({ grants: [grant('member', 'SELECT')] });
    const findings = checkMatviewSnapshot(
      (await analyzeViewExposure([view({ grants: [grant('member', 'SELECT')] })], [base])).matviews,
      [base],
      graph(role('member', { bypassRls: true })),
      { roles: ['member'] }
    );
    expect(findings).toEqual([]);
  });

  it('needs a grant on the matview itself', async () => {
    const findings = await check([view({ grants: [] })], [table()], ['anon']);
    expect(findings).toEqual([]);
  });

  it('follows a PUBLIC grant on the matview', async () => {
    const findings = await check([view({ grants: [grant('PUBLIC', 'SELECT')] })], [table()], ['anon']);
    expect(findings).toHaveLength(1);
  });

  it('reports nothing without configured roles', async () => {
    expect(await check([view()], [table()], [])).toEqual([]);
  });

  it('never recommends revoking the grant', async () => {
    const findings = await check([view()], [table()], ['anon']);
    expect(findings[0].hint).toContain('Do not revoke');
    expect(findings[0].hint).not.toMatch(/\bREVOKE\b/);
  });
});

describe('checkLeakyFilterView (L12)', () => {
  async function check(views: ViewSnapshot[], tables: TableSnapshot[], roles: string[]) {
    const { leaky } = await analyzeViewExposure(views, tables);
    return checkLeakyFilterView(leaky, tables, GRAPH, { roles });
  }

  it('reports a filtering view that is an untrusted role\'s only path to the relation', async () => {
    const findings = await check([filterView()], [table()], ['anon']);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      code: 'L12',
      severity: 'info',
      schema: 'app',
      table: 'secrets',
      role: 'anon'
    });
    expect(findings[0].context).toMatchObject({ view: 'app.my_secrets', proof: 'ast' });
  });

  it('stays silent once the view is a barrier', async () => {
    expect(await check([filterView({ securityBarrier: true })], [table()], ['anon'])).toEqual([]);
  });

  it('stays silent when the role can read the base relation directly', async () => {
    const base = table({ grants: [grant('anon', 'SELECT')] });
    expect(await check([filterView()], [base], ['anon'])).toEqual([]);
  });

  it('stays silent when the caller cannot read the view at all', async () => {
    expect(await check([filterView({ grants: [] })], [table()], ['anon'])).toEqual([]);
  });

  it('recommends the barrier, and never a revoke', async () => {
    const findings = await check([filterView()], [table()], ['anon']);
    expect(findings[0].hint).toContain('security_barrier = true');
    expect(findings[0].hint).toContain('Do not revoke');
  });
});
