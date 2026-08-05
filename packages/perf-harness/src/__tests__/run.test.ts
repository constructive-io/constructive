import { resolveTenants } from '../config';
import { buildRunSchedule } from '../run';
import type { ArmPlan, DensityPlanV1, TenantTarget } from '../types';

describe('arm-specific fleet resolution', () => {
  it('selects the exact build identity for the running arm', () => {
    const tenants = [{
      id: 'tenant-a',
      surfaces: [{
        name: 'api',
        buildContract: 'default-hash',
        buildContracts: {
          stock: 'stock-hash',
          scoped: 'scoped-hash'
        },
        url: 'http://127.0.0.1:{port}/{mode}',
        warmup: { name: 'warm', capability: 'graphile', query: '{ __typename }' },
        operations: [{ name: 'read', capability: 'graphile', query: '{ __typename }' }],
        canaries: []
      }]
    }] as TenantTarget[];
    const arm = {
      name: 'scoped',
      port: 3345,
      introspectionMode: 'scoped-required'
    } as ArmPlan;

    const resolved = resolveTenants(tenants, arm);
    expect(resolved[0].surfaces[0]).toMatchObject({
      buildContract: 'scoped-hash',
      url: 'http://127.0.0.1:3345/scoped-required'
    });
  });

  it('uses heap-specific ramps and reproducibly interleaves arms within each cell', () => {
    const arms = [
      { name: 'stock' },
      { name: 'scoped' }
    ] as ArmPlan[];
    const plan = {
      runOrderSeed: 'seed-a',
      tenantCounts: [1],
      tenantCountsByHeapMiB: { 2048: [2, 4] }
    } as unknown as DensityPlanV1;
    const first = buildRunSchedule(plan, arms, [1024, 2048], 2);
    const second = buildRunSchedule(plan, arms, [1024, 2048], 2);
    expect(first.map((job) => ({
      arm: job.arm.name,
      heap: job.heapMiB,
      tenants: job.tenantCount,
      repetition: job.repetition,
      order: job.orderIndex
    }))).toEqual(second.map((job) => ({
      arm: job.arm.name,
      heap: job.heapMiB,
      tenants: job.tenantCount,
      repetition: job.repetition,
      order: job.orderIndex
    })));
    expect(first).toHaveLength(12);
    expect(first.slice(0, 2).map((job) => job.heapMiB)).toEqual([1024, 1024]);
    expect(first.slice(2, 6).map((job) => job.tenantCount)).toEqual([2, 2, 4, 4]);
    expect(first.map((job) => job.orderIndex)).toEqual(
      Array.from({ length: 12 }, (_, index) => index + 1)
    );
  });
});
