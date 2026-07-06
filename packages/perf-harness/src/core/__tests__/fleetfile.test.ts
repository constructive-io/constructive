import fs from 'node:fs';
import path from 'node:path';

import { buildSubset, canaryName, CANARY_PREFIX, loadFleet, Tenant } from '../fleetfile';

const fixture = (name: string): string => path.join(__dirname, 'fixtures', name);
const fleet: Tenant[] = loadFleet(fixture('fleet.json')).tenants;
const drifted = JSON.parse(fs.readFileSync(fixture('drifted.json'), 'utf8'));
const names = (ts: Tenant[]): string[] => ts.map((t) => t.dbname);

describe('loadFleet', () => {
  test('reads the tenant array from a {tenants} manifest', () => {
    const { tenants } = loadFleet(fixture('fleet.json'));
    expect(tenants.length).toBe(9);
  });

  test('throws on an empty fleet', () => {
    expect(() => loadFleet(fixture('empty-fleet.json'))).toThrow(/no tenants/);
  });
});

describe('canary naming', () => {
  test('prefix + dbname', () => {
    expect(CANARY_PREFIX).toBe('CANARY-');
    expect(canaryName({ dbname: 'factory7' })).toBe('CANARY-factory7');
  });
});

describe('buildSubset — diversity mode', () => {
  test('first K groups, N per group', () => {
    const { subset, tenants, warnings } = buildSubset(fleet, drifted, { blueprints: 2, perBlueprint: 2 });
    expect(names(tenants)).toEqual(['factory1', 'factory2', 'drift_a', 'drift_b']);
    expect(subset.count).toBe(4);
    expect(subset.subset).toBe('diversity k=2 per=2');
    expect(warnings).toEqual([]);
  });

  test('warns when a group has fewer than perBlueprint tenants', () => {
    const { tenants, warnings } = buildSubset(fleet, drifted, { blueprints: 2, perBlueprint: 5 });
    // group0 gives 5 (factory1..5); drift group only has 2
    expect(names(tenants)).toEqual(['factory1', 'factory2', 'factory3', 'factory4', 'factory5', 'drift_a', 'drift_b']);
    expect(warnings).toEqual(['warn: group 1 has only 2/5 tenants']);
  });

  test('throws when asking for more blueprint groups than exist', () => {
    expect(() => buildSubset(fleet, drifted, { blueprints: 5 })).toThrow('only 2 blueprint groups available, asked for 5');
  });
});

describe('buildSubset — tenant-count mode', () => {
  test('N group-0 tenants (column-drift tenant stays in group 0)', () => {
    const { subset, tenants, warnings } = buildSubset(fleet, drifted, { tenants: 3 });
    // factory3 is in columnDrift but keeps its relname set => still group 0
    expect(names(tenants)).toEqual(['factory1', 'factory2', 'factory3']);
    expect(subset.subset).toBe('tenant-count n=3 (single blueprint)');
    expect(subset.count).toBe(3);
    expect(warnings).toEqual([]);
  });

  test('warns when fewer undrifted tenants are available than requested', () => {
    const { subset, tenants, warnings } = buildSubset(fleet, drifted, { tenants: 100 });
    expect(tenants.length).toBe(6); // factory1..5 + marketplace_db_tenant1
    expect(subset.subset).toBe('tenant-count n=6 (single blueprint)');
    expect(warnings).toEqual(['warn: only 6/100 undrifted tenants available']);
  });

  test('excludes non-matching (divergent) seeder tenants like tenant2', () => {
    const { tenants } = buildSubset(fleet, drifted, { tenants: 100 });
    expect(names(tenants)).not.toContain('tenant2');
    expect(names(tenants)).not.toContain('drift_a');
  });
});

describe('buildSubset — mode selection', () => {
  test('throws when neither mode is selected', () => {
    expect(() => buildSubset(fleet, drifted, {})).toThrow('one of --blueprints or --tenants is required');
  });

  test('custom sameBpRegex changes group 0 membership', () => {
    const { tenants } = buildSubset(fleet, { groups: {} }, { tenants: 100, sameBpRegex: '^factory[0-9]+$' });
    // marketplace_db_tenant1 no longer matches
    expect(names(tenants)).toEqual(['factory1', 'factory2', 'factory3', 'factory4', 'factory5']);
  });
});
