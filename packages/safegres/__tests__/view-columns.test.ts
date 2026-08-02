import { analyzeViewBodies, checkDefinerViewBypass } from '../src/checks/definer-view';
import { type RoleGraph } from '../src/checks/lattice';
import type { RoleAttributes } from '../src/pg/acl';
import type { ViewSnapshot } from '../src/pg/indexes';
import type { ColumnGrantInfo, TableSnapshot } from '../src/pg/introspect';

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

function view(partial: Partial<ViewSnapshot> = {}): ViewSnapshot {
  return {
    schema: 'app',
    name: 'people_public',
    owner: 'app_owner',
    materialized: false,
    securityInvoker: false,
    securityBarrier: false,
    ownerBypassesRls: false,
    grants: [{ role: 'anon', privilege: 'SELECT', grantable: false, bypassRls: false }],
    definition: 'SELECT id, email FROM app.people',
    columnDeps: [{ schema: 'app', table: 'people', columns: ['email', 'id'] }],
    writable: [],
    insteadOfTriggers: false,
    rules: [],
    ...partial
  };
}

function columnGrants(role: string, columns: string[]): ColumnGrantInfo[] {
  return columns.map((column) => ({
    role,
    privilege: 'SELECT' as const,
    column,
    grantable: false,
    bypassRls: false
  }));
}

function role(name: string, partial: Partial<RoleAttributes> = {}): [string, RoleAttributes] {
  return [
    name,
    { name, bypassRls: false, isSuper: false, inheritsFrom: [], canSetRole: [], ...partial }
  ];
}

const GRAPH: RoleGraph = new Map([role('anon'), role('app_owner')]);

async function findings(v: ViewSnapshot, t: TableSnapshot) {
  const { views } = await analyzeViewBodies([v], [t]);
  return checkDefinerViewBypass(views, [t], GRAPH, { roles: ['anon'] });
}

describe('view column dependencies', () => {
  it('attaches the columns the catalog says the body reads to each base relation', async () => {
    const { views } = await analyzeViewBodies([view()], [table()]);
    expect(views[0].baseRelations).toEqual([
      {
        schema: 'app',
        table: 'people',
        hops: [{ view: 'app.people_public', owner: 'app_owner' }],
        columns: ['email', 'id']
      }
    ]);
  });

  it('leaves columns absent when the snapshot carries no dependency rows', async () => {
    const { views } = await analyzeViewBodies([view({ columnDeps: undefined })], [table()]);
    expect(views[0].baseRelations[0].columns).toBeUndefined();
  });

  it('names the escaping columns in the L8 finding, not just the relation', async () => {
    const [f] = await findings(view(), table());
    expect(f.code).toBe('L8');
    expect(f.message).toContain('app.people (email, id)');
    expect(f.context).toMatchObject({ columns: ['email', 'id'] });
  });
});

describe('L8 against a column-grant holder', () => {
  const granted = table({ columnGrants: columnGrants('anon', ['email', 'id', 'note']) });

  it('stays silent when the view exposes only columns the role could already read', async () => {
    expect(await findings(view(), granted)).toEqual([]);
  });

  it('fires when a single column escapes beyond the grant', async () => {
    const wide = view({
      definition: 'SELECT id, email, ssn FROM app.people',
      columnDeps: [{ schema: 'app', table: 'people', columns: ['email', 'id', 'ssn'] }]
    });
    const [f] = await findings(wide, granted);
    expect(f?.code).toBe('L8');
    expect(f.context).toMatchObject({ grantedColumns: ['email', 'id', 'note'] });
  });

  it('fires on the same projection when the base has RLS: the owner skips the policies', async () => {
    const rls = table({
      rlsEnabled: true,
      columnGrants: columnGrants('anon', ['email', 'id', 'note'])
    });
    const [f] = await findings(view(), rls);
    expect(f?.code).toBe('L8');
  });

  it('fires when the columns are unknown, rather than assuming the projection is narrow', async () => {
    expect(await findings(view({ columnDeps: undefined }), granted)).toHaveLength(1);
  });

  it('recommends fixing the view, never revoking the column grant', async () => {
    const [f] = await findings(
      view({
        definition: 'SELECT id, email, ssn FROM app.people',
        columnDeps: [{ schema: 'app', table: 'people', columns: ['email', 'id', 'ssn'] }]
      }),
      granted
    );
    expect(f.hint).toMatch(/security_invoker/);
    expect(f.hint).toMatch(/Do not revoke/i);
  });
});
