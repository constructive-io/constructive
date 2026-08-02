import * as fs from 'fs';
import * as path from 'path';
import { getConnections, PgTestClient } from 'pgsql-test';

import { audit } from '../src/commands/audit';
import { postgraphileAdapter } from '../src/exposure/adapters';
import { resolvePlaneReach } from '../src/exposure/planes';
import type { ApiReach } from '../src/exposure/reach';
import { computeApiReach } from '../src/exposure/reach';
import { emptyBehaviorSnapshot, parseBehaviorTags } from '../src/pg/behaviors';
import type { ResolvedPlane } from '../src/pg/exposure';
import { resolveReach } from '../src/pg/exposure';
import type { TableSnapshot } from '../src/pg/introspect';

jest.setTimeout(120000);

let pg: PgTestClient;
let teardown: () => Promise<void>;

const SCHEMA = 'fx_reach_api';

beforeAll(async () => {
  ({ pg, teardown } = await getConnections());
  const sql = fs.readFileSync(path.join(__dirname, 'fixtures', 'reach.sql'), 'utf8');
  await pg.any(sql);
});

afterAll(async () => {
  if (teardown) await teardown();
});

function snapshot(entries: {
  tables?: Record<string, string>;
  constraints?: Record<string, string>;
}) {
  const snap = emptyBehaviorSnapshot();
  for (const [key, value] of Object.entries(entries.tables ?? {})) {
    snap.tables.set(key, value);
  }
  for (const [key, value] of Object.entries(entries.constraints ?? {})) {
    snap.constraintDirections.set(key, parseBehaviorTags(value));
  }
  return snap;
}

describe('behavior tag parsing', () => {
  it('keeps the three tags apart and lets a directional one win', () => {
    const tags = parseBehaviorTags('@behavior -list\n@backwardBehavior -list -connection -single');
    expect(tags.both).toBe('-list');
    expect(tags.backward).toBe('-list -connection -single');
    expect(tags.forward).toBeUndefined();
  });

  it('stops at the first non-tag line, as smart tags do', () => {
    const tags = parseBehaviorTags('@behavior -select\nprose about the table\n@forwardBehavior -single');
    expect(tags.both).toBe('-select');
    expect(tags.forward).toBeUndefined();
  });
});

describe('computeApiReach', () => {
  const relations = ['s.parent', 's.child'];
  const edges = [{ from: 's.child', to: 's.parent', constraint: 'child_parent_fkey' }];

  it('says nothing when nothing is declared — silence is not denial', () => {
    const reach = computeApiReach({ relations, edges, behaviors: emptyBehaviorSnapshot() });
    expect(reach.unreachable).toEqual([]);
    expect(reach.hiddenBackwardRelations).toEqual([]);
  });

  it('keeps a root-denied relation that a surviving reverse relation still reaches', () => {
    const reach = computeApiReach({
      relations,
      edges,
      behaviors: snapshot({ tables: { 's.child': '-select -insert -update -delete' } })
    });
    expect(reach.unreachable).toEqual([]);
  });

  it('reports the relation only when the root and every relation field are denied', () => {
    const reach = computeApiReach({
      relations,
      edges,
      behaviors: snapshot({
        tables: { 's.child': '-select -insert -update -delete' },
        constraints: {
          's.child.child_parent_fkey':
            '@backwardBehavior -list -connection -single\n@forwardBehavior -single'
        }
      })
    });
    expect(reach.unreachable).toEqual([
      { schema: 's', table: 'child', reason: expect.stringContaining('every relation field') }
    ]);
  });

  it('does not treat a partial root denial as absence', () => {
    const reach = computeApiReach({
      relations,
      edges,
      behaviors: snapshot({
        tables: { 's.child': '-select -insert' },
        constraints: {
          's.child.child_parent_fkey':
            '@backwardBehavior -list -connection -single\n@forwardBehavior -single'
        }
      })
    });
    expect(reach.unreachable).toEqual([]);
  });

  it('reports a hidden reverse relation without calling the table unreachable', () => {
    const reach = computeApiReach({
      relations,
      edges,
      behaviors: snapshot({
        constraints: { 's.child.child_parent_fkey': '@backwardBehavior -list -connection -single' }
      })
    });
    expect(reach.hiddenBackwardRelations).toEqual(['s.child.child_parent_fkey']);
    expect(reach.unreachable).toEqual([]);
  });

  it('applies an undirected @behavior to both directions', () => {
    const reach = computeApiReach({
      relations,
      edges,
      behaviors: snapshot({
        tables: { 's.child': '-select -insert -update -delete' },
        constraints: { 's.child.child_parent_fkey': '@behavior -list -connection -single' }
      })
    });
    expect(reach.hiddenBackwardRelations).toEqual(['s.child.child_parent_fkey']);
    expect(reach.unreachable).toHaveLength(1);
  });

  it('walks more than one hop', () => {
    const reach = computeApiReach({
      relations: ['s.a', 's.b', 's.c'],
      edges: [
        { from: 's.b', to: 's.a', constraint: 'b_a_fkey' },
        { from: 's.c', to: 's.b', constraint: 'c_b_fkey' }
      ],
      behaviors: snapshot({
        tables: {
          's.b': '-select -insert -update -delete',
          's.c': '-select -insert -update -delete'
        }
      })
    });
    expect(reach.unreachable).toEqual([]);
  });
});

describe('the postgraphile adapter against a live catalog', () => {
  it('detects behavior tags and resolves no planes of its own', async () => {
    expect(await postgraphileAdapter.detect(pg.client as never)).toBe(true);
    expect(await postgraphileAdapter.resolve(pg.client as never)).toEqual([]);
  });

  it('scopes to the whole database when no schema is named', async () => {
    const reach = await postgraphileAdapter.reach!(pg.client as never, { schemas: [] });
    expect((reach.unreachable ?? []).map((r) => r.table).sort()).toEqual([
      'audit_shadow',
      'policy_shadow'
    ]);
  });

  it('subtracts only the relation denied at the root and in both directions', async () => {
    const reach = await resolveReach(pg.client as never, { adapters: ['postgraphile'] }, {
      schemas: [SCHEMA]
    });

    const names = (reach?.unreachable ?? []).map((r) => r.table).sort();
    expect(names).toEqual(['audit_shadow', 'policy_shadow']);
    expect(reach!.hiddenBackwardRelations.sort()).toEqual([
      `${SCHEMA}.audit_shadow.audit_shadow_post_id_fkey`,
      `${SCHEMA}.policy_shadow.policy_shadow_post_id_fkey`
    ]);
  });
});

describe('plane reach', () => {
  const tables = [
    { schema: SCHEMA, name: 'posts', grants: [] },
    { schema: SCHEMA, name: 'audit_shadow', grants: [] }
  ] as unknown as TableSnapshot[];
  const apiReach: ApiReach = {
    unreachable: [{ schema: SCHEMA, table: 'audit_shadow', reason: 'denied' }],
    hiddenBackwardRelations: []
  };

  it('narrows an api plane to what the API can address', () => {
    const plane: ResolvedPlane = {
      name: 'api',
      kind: 'api',
      primary: true,
      source: 'config',
      schemas: [SCHEMA],
      roles: [],
      anonRoles: []
    };
    const [reach] = resolvePlaneReach([plane], tables, new Map(), apiReach);
    expect([...reach.relations]).toEqual([`${SCHEMA}.posts`]);
    expect(reach.unaddressable).toHaveLength(1);
  });

  it('leaves a role plane alone — a grant is reachable whatever the API says', () => {
    const plane: ResolvedPlane = {
      name: 'direct',
      kind: 'role',
      primary: false,
      source: 'config',
      schemas: [],
      roles: ['fx_reach_api_role'],
      anonRoles: []
    };
    const withReach = resolvePlaneReach([plane], tables, new Map(), apiReach)[0];
    const withoutReach = resolvePlaneReach([plane], tables, new Map())[0];
    expect([...withReach.relations]).toEqual([...withoutReach.relations]);
    expect(withReach.unaddressable).toBeUndefined();
  });
});

describe('audit integration', () => {
  const exposure = {
    adapters: ['postgraphile'],
    schemas: [SCHEMA],
    roles: ['fx_reach_api_role']
  };

  it('excludes unaddressable relations from the exposed surface and reports them', async () => {
    const report = await audit(pg.client as never, { schemas: [SCHEMA], exposure });

    expect(report.exposure!.exposedTables).toBe(2);
    expect(report.exposure!.totalTables).toBe(4);
    expect((report.exposure!.unaddressable ?? []).map((r) => r.table).sort()).toEqual([
      'audit_shadow',
      'policy_shadow'
    ]);
  });

  it('grades an unaddressable relation as unexposed', async () => {
    const report = await audit(pg.client as never, { schemas: [SCHEMA], exposure });
    const shadow = report.findings.filter((f) => f.table === 'audit_shadow');
    expect(shadow.length).toBeGreaterThan(0);
    expect(shadow.every((f) => f.exposed === false)).toBe(true);
  });

  it('reports L6 for the grant no request can use, and stays silent about the one a policy needs', async () => {
    const report = await audit(pg.client as never, { schemas: [SCHEMA], exposure });
    const l6 = report.findings.filter((f) => f.code === 'L6');
    expect(l6.map((f) => f.table)).toEqual(['audit_shadow']);
    expect(l6[0].role).toBe('fx_reach_api_role');
  });

  it('changes nothing when reach is turned off', async () => {
    const report = await audit(pg.client as never, {
      schemas: [SCHEMA],
      exposure: { ...exposure, reach: false }
    });
    expect(report.exposure!.exposedTables).toBe(4);
    expect(report.exposure!.unaddressable).toBeUndefined();
    expect(report.findings.some((f) => f.code === 'L6')).toBe(false);
  });

  it('marks the hidden reverse relations as a declared path signal', async () => {
    const report = await audit(pg.client as never, {
      schemas: [SCHEMA],
      exposure,
      perf: true
    });
    expect(report.perf!.paths!.declaredHidden).toBe(2);
  });
});
