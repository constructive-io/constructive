import {
  analyzeViewBodies,
  checkUnauditedViewReach
} from '../src/checks/definer-view';
import { type RoleGraph } from '../src/checks/lattice';
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
    name: 'role_report',
    owner: 'app_owner',
    materialized: false,
    securityInvoker: false,
    securityBarrier: false,
    ownerBypassesRls: false,
    grants: [{ role: 'anon', privilege: 'SELECT', grantable: false, bypassRls: false }],
    definition: 'SELECT rolname FROM private.secrets',
    writable: [],
    insteadOfTriggers: false,
    rules: [],
    ...partial
  };
}

function role(name: string, partial: Partial<RoleAttributes> = {}): [string, RoleAttributes] {
  return [name, { name, bypassRls: false, isSuper: false, inheritsFrom: [], canSetRole: [], ...partial }];
}

const GRAPH: RoleGraph = new Map([role('anon'), role('app_owner')]);
const ANON = { roles: ['anon'] };

describe('base relations outside the audited schemas', () => {
  it('resolves a qualified reference into an unaudited schema as external', async () => {
    const { views } = await analyzeViewBodies([view()], [table()], ['app']);
    expect(views[0].baseRelations).toEqual([
      {
        schema: 'private',
        table: 'secrets',
        hops: [{ view: 'app.role_report', owner: 'app_owner' }],
        external: true
      }
    ]);
  });

  it('still drops an unqualified name it cannot pin down', async () => {
    const { views } = await analyzeViewBodies(
      [view({ definition: 'WITH secrets AS (SELECT 1 AS id) SELECT id FROM secrets' })],
      [table()],
      ['app']
    );
    expect(views).toEqual([]);
  });

  it('treats a reference into an audited schema as a miss, not as external', async () => {
    // `app.missing` is not in the snapshot but `app` was audited: the audit
    // read that schema and found no such relation, so the name is unresolved.
    const { views } = await analyzeViewBodies(
      [view({ definition: 'SELECT id FROM app.missing' })],
      [table()],
      ['app']
    );
    expect(views).toEqual([]);
  });

  it('defaults the audited set to the schemas of the snapshot', async () => {
    const { views } = await analyzeViewBodies([view()], [table()]);
    expect(views[0].baseRelations[0]).toMatchObject({ schema: 'private', external: true });
  });
});

describe('L14 — unaudited base relation', () => {
  it('reports the reach and names the schema that was never introspected', async () => {
    const { views } = await analyzeViewBodies([view()], [table()], ['app']);
    const findings = checkUnauditedViewReach(views, GRAPH, ANON);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      code: 'L14',
      severity: 'info',
      schema: 'private',
      table: 'secrets',
      role: 'anon'
    });
    expect(findings[0].message).toContain('outside the audited schemas');
    expect(findings[0].context).toMatchObject({
      view: 'app.role_report',
      effectiveRole: 'app_owner',
      unauditedSchema: 'private',
      proof: 'ast'
    });
  });

  it('says nothing about an audited base relation — that is L8 territory', async () => {
    const { views } = await analyzeViewBodies(
      [view({ definition: 'SELECT id FROM app.orders' })],
      [table()],
      ['app']
    );
    expect(checkUnauditedViewReach(views, GRAPH, ANON)).toEqual([]);
  });

  it('stays silent on an invoker view: the caller needs its own grant', async () => {
    const { views } = await analyzeViewBodies([view({ securityInvoker: true })], [table()], ['app']);
    expect(checkUnauditedViewReach(views, GRAPH, ANON)).toEqual([]);
  });

  it('stays silent when the untrusted role cannot read the view', async () => {
    const { views } = await analyzeViewBodies(
      [view({ grants: [] as GrantInfo[] })],
      [table()],
      ['app']
    );
    expect(checkUnauditedViewReach(views, GRAPH, ANON)).toEqual([]);
  });

  it('is a no-op until untrusted roles are configured', async () => {
    const { views } = await analyzeViewBodies([view()], [table()], ['app']);
    expect(checkUnauditedViewReach(views, GRAPH)).toEqual([]);
  });

  it('recommends bringing the schema into scope, never a revoke', async () => {
    const { views } = await analyzeViewBodies([view()], [table()], ['app']);
    const [finding] = checkUnauditedViewReach(views, GRAPH, ANON);
    expect(finding.hint).toContain('Add the schema to the audit');
    expect(finding.hint).toContain('do not revoke anything');
  });
});
