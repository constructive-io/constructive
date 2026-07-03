import { Tenant } from '../../core/fleetfile';
import {
  computeCreepProjection,
  DEEP_SCENARIOS,
  deriveSurfaceFleets,
  parsePartitionIntervalSeconds,
  rewriteHostPrefix,
  scenarioEnabled,
  SECONDS_PER_MONTH
} from '../scenarios';

// ---------------------------------------------------------------------------
// fleet host-rewrite derivation
// ---------------------------------------------------------------------------
describe('rewriteHostPrefix', () => {
  test('rewrites the leading api- label to another surface', () => {
    expect(rewriteHostPrefix('api-factory2-fab4d29f.localhost', 'api', 'admin')).toBe('admin-factory2-fab4d29f.localhost');
    expect(rewriteHostPrefix('api-factory2-fab4d29f.localhost', 'api', 'usage')).toBe('usage-factory2-fab4d29f.localhost');
  });

  test('returns null when the from-prefix does not match', () => {
    expect(rewriteHostPrefix('auth-factory2-fab4d29f.localhost', 'api', 'admin')).toBeNull();
    expect(rewriteHostPrefix('', 'api', 'admin')).toBeNull();
    expect(rewriteHostPrefix(undefined as any, 'api', 'admin')).toBeNull();
  });

  test('only the FIRST label is rewritten (later api- substrings untouched)', () => {
    expect(rewriteHostPrefix('api-api-x.localhost', 'api', 'admin')).toBe('admin-api-x.localhost');
  });
});

describe('deriveSurfaceFleets', () => {
  const tenants: Tenant[] = [
    { dbname: 'factory2', apiHost: 'api-factory2-aaaa1111.localhost', authHost: 'auth-factory2-aaaa1111.localhost' },
    { dbname: 'factory3', apiHost: 'api-factory3-bbbb2222.localhost', authHost: 'auth-factory3-bbbb2222.localhost' }
  ];

  test('api surface keeps hosts; admin/usage rewrite the label; authHost preserved', () => {
    const { fleets, warnings } = deriveSurfaceFleets(tenants, ['api', 'admin', 'usage']);
    expect(warnings).toEqual([]);
    const api = fleets.find((f) => f.surface === 'api');
    const admin = fleets.find((f) => f.surface === 'admin');
    const usage = fleets.find((f) => f.surface === 'usage');
    expect(api.tenants.map((t) => t.apiHost)).toEqual(['api-factory2-aaaa1111.localhost', 'api-factory3-bbbb2222.localhost']);
    expect(admin.tenants.map((t) => t.apiHost)).toEqual(['admin-factory2-aaaa1111.localhost', 'admin-factory3-bbbb2222.localhost']);
    expect(usage.tenants.map((t) => t.apiHost)).toEqual(['usage-factory2-aaaa1111.localhost', 'usage-factory3-bbbb2222.localhost']);
    // authHost is untouched on every derived surface (login always uses auth).
    expect(admin.tenants[0].authHost).toBe('auth-factory2-aaaa1111.localhost');
  });

  test('tenants without apiHost, or with a non-api host, are dropped with a warning', () => {
    const mixed: Tenant[] = [
      { dbname: 'ok', apiHost: 'api-ok-1234abcd.localhost' },
      { dbname: 'nohost' },
      { dbname: 'weird', apiHost: 'gateway.example.com' }
    ];
    const { fleets, warnings } = deriveSurfaceFleets(mixed, ['admin']);
    expect(fleets[0].tenants.map((t) => t.dbname)).toEqual(['ok']);
    expect(warnings.some((w) => w.includes('nohost'))).toBe(true);
    expect(warnings.some((w) => w.includes('weird'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// creep math
// ---------------------------------------------------------------------------
describe('parsePartitionIntervalSeconds', () => {
  test('common partman intervals', () => {
    expect(parsePartitionIntervalSeconds('1 day')).toBe(86400);
    expect(parsePartitionIntervalSeconds('7 days')).toBe(604800);
    expect(parsePartitionIntervalSeconds('1 week')).toBe(604800);
    expect(parsePartitionIntervalSeconds('1 hour')).toBe(3600);
    expect(parsePartitionIntervalSeconds('1 mon')).toBe(SECONDS_PER_MONTH);
    expect(parsePartitionIntervalSeconds('1 month')).toBe(SECONDS_PER_MONTH);
  });

  test('clock and mixed forms', () => {
    expect(parsePartitionIntervalSeconds('01:00:00')).toBe(3600);
    expect(parsePartitionIntervalSeconds('00:15:00')).toBe(900);
    expect(parsePartitionIntervalSeconds('1 day 06:00:00')).toBe(86400 + 6 * 3600);
  });

  test('unparseable / id-based intervals return null', () => {
    expect(parsePartitionIntervalSeconds('10000')).toBeNull();
    expect(parsePartitionIntervalSeconds('')).toBeNull();
    expect(parsePartitionIntervalSeconds(null as any)).toBeNull();
  });
});

describe('computeCreepProjection', () => {
  test('monthly interval → exactly 1 partition/parent/month', () => {
    const p = computeCreepProjection({
      rowsPerPartition: 10,
      partitionedParents: 4,
      partitionIntervalSeconds: SECONDS_PER_MONTH,
      instanceHeapKBPerRow: 21
    });
    expect(p.intervalsPerMonth).toBe(1);
    expect(p.partitionsPerMonth).toBe(4);
    expect(p.rowsPerTenantPerMonth).toBe(40);
    // 40 rows * 21KB / 1024 = 0.82 MB
    expect(p.heapCreepMBPerMonthPerTenant).toBeCloseTo(0.82, 2);
  });

  test('daily interval scales by ~30.44 intervals/month', () => {
    const p = computeCreepProjection({
      rowsPerPartition: 5,
      partitionedParents: 1,
      partitionIntervalSeconds: 86400,
      instanceHeapKBPerRow: 21
    });
    expect(p.intervalsPerMonth).toBeCloseTo(30.44, 1);
    expect(p.rowsPerTenantPerMonth).toBeCloseTo(152.19, 1);
  });

  test('zero / negative inputs never divide-by-zero or go negative', () => {
    const p = computeCreepProjection({ rowsPerPartition: -5, partitionedParents: -1, partitionIntervalSeconds: 0, instanceHeapKBPerRow: 21 });
    expect(p.intervalsPerMonth).toBe(0);
    expect(p.rowsPerTenantPerMonth).toBe(0);
    expect(p.heapCreepMBPerMonthPerTenant).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// scenario filter
// ---------------------------------------------------------------------------
describe('scenarioEnabled', () => {
  test('all enabled by default', () => {
    for (const s of DEEP_SCENARIOS) expect(scenarioEnabled(s)).toBe(true);
  });

  test('--only restricts to the named set', () => {
    expect(scenarioEnabled('partition-creep', ['partition-creep'])).toBe(true);
    expect(scenarioEnabled('multi-api-residency', ['partition-creep'])).toBe(false);
  });

  test('--skip removes, and wins over --only', () => {
    expect(scenarioEnabled('partition-creep', null, ['partition-creep'])).toBe(false);
    expect(scenarioEnabled('partition-creep', ['partition-creep'], ['partition-creep'])).toBe(false);
  });
});
