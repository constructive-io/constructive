import { compareArms, makeSchedule, summarizeArm } from '../src/matrix';
import { ARM_NAMES, type MatrixRun, type SuccessfulWorkerResult } from '../src/types';

const successfulResult = (
  arm: (typeof ARM_NAMES)[number],
  value: number
): SuccessfulWorkerResult => ({
  status: 'ok',
  pid: value,
  arm,
  definition: {
    name: arm,
    scopedIntrospection: arm === 'scoped' || arm === 'scoped-retire',
    retireBuildState: arm === 'retire' || arm === 'scoped-retire',
    introspectionMode:
      arm === 'scoped' || arm === 'scoped-retire'
        ? 'scoped-required'
        : 'stock',
    scopedCatalogTypes:
      arm === 'scoped' || arm === 'scoped-retire'
        ? 'dependency-closure'
        : null,
    introspectionClientReleaseMode:
      arm === 'scoped' || arm === 'scoped-retire' ? 'destroy' : 'reuse',
  },
  buildMs: value,
  schemaHash: 'same',
  schemaTypeCount: 10,
  queryVerified: true,
  buildStateReleased: arm === 'retire' || arm === 'scoped-retire',
  memory: {
    baseline: {
      rss: 10,
      heapTotal: 10,
      heapUsed: 10,
      external: 10,
      arrayBuffers: 10,
    },
    afterBuild: {
      rss: value,
      heapTotal: value,
      heapUsed: value,
      external: value,
      arrayBuffers: value,
    },
    delta: {
      rss: value - 10,
      heapTotal: value - 10,
      heapUsed: value - 10,
      external: value - 10,
      arrayBuffers: value - 10,
    },
    processPeakRss: value,
  },
});

describe('benchmark matrix', () => {
  test('seeded schedules are deterministic and cover every arm per repetition', () => {
    const first = makeSchedule(5, 1234);
    expect(makeSchedule(5, 1234)).toEqual(first);
    expect(makeSchedule(5, 4321)).not.toEqual(first);
    for (let repetition = 1; repetition <= 5; repetition += 1) {
      expect(
        first
          .filter((coordinate) => coordinate.repetition === repetition)
          .map((coordinate) => coordinate.arm)
          .sort()
      ).toEqual([...ARM_NAMES].sort());
    }
  });

  test('exact order is repeated without changing its positions', () => {
    const order = ['retire', 'stock', 'scoped-retire', 'scoped'] as const;
    expect(makeSchedule(2, 1, order).map((coordinate) => coordinate.arm)).toEqual(
      [...order, ...order]
    );
  });

  test('summaries use medians and comparisons keep the factor direction', () => {
    const runs: MatrixRun[] = [10, 30, 20].map((value, index) => ({
      repetition: index + 1,
      position: 1,
      arm: 'stock',
      result: successfulResult('stock', value),
    }));
    runs.push(
      ...[5, 15, 10].map((value, index) => ({
        repetition: index + 1,
        position: 2,
        arm: 'scoped' as const,
        result: successfulResult('scoped', value),
      }))
    );
    const stock = summarizeArm(runs, 'stock');
    const scoped = summarizeArm(runs, 'scoped');
    expect(stock?.buildMs.median).toBe(20);
    expect(scoped?.buildMs.median).toBe(10);
    expect(compareArms('stock', 'scoped', stock!, scoped!).buildMs).toEqual({
      baseline: 20,
      candidate: 10,
      difference: -10,
      percentChange: -50,
    });
  });
});
