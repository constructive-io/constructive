import { grafastSync, makeGrafastSchema, constant } from 'grafast';
import { printSchema } from 'graphql';
// Isolate the third capacity: several constraint-specific plans for ONE operation.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import os from 'node:os';
import * as harness from '../../index';
import {
  applyCacheLimits,
  assertIndependent,
  objectConfig,
  errorText,
  memory,
  difference,
  inspectCache,
  countOperationPlans,
} from './settings';
function sha(text: string) {
  return createHash('sha256').update(text).digest('hex');
}
async function worker() {
  const { databaseUrl, envelope } = harness.parseWorkerProcessArgs(
    process.argv.slice(2)
  );
  const { caseName } = envelope;
  try {
    const config = objectConfig(envelope.workerConfig);
    assert(typeof config.cap === 'number' && [8, 50, 128].includes(config.cap));
    assert(
      typeof config.seed === 'number' && Number.isSafeInteger(config.seed)
    );
    const fields = ['a', 'b', 'c', 'd', 'e', 'f'];
    const source = `query Variants(${fields.map((f) => `$${f}:Boolean!`).join(',')}) { probe ${fields.map((f) => `${f} @include(if:$${f})`).join(' ')} }`;
    const inputs = Array.from({ length: 64 }, (_, i) =>
      Object.fromEntries(fields.map((f, bit) => [f, !!(i & (1 << bit))]))
    );
    let state = config.seed >>> 0;
    const order = Array.from({ length: 64 }, (_, i) => i);
    for (let i = 63; i > 0; i--) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      const j = state % (i + 1);
      [order[i], order[j]] = [order[j], order[i]];
    }
    let plans = 0;
    const baseline = memory();
    const buildStart = performance.now();
    let schema = makeGrafastSchema({
      typeDefs:
        'type Query { probe:Int! a:Int! b:Int! c:Int! d:Int! e:Int! f:Int! }',
      objects: {
        Query: {
          plans: {
            probe() {
              plans++;
              return constant(1);
            },
            ...Object.fromEntries(fields.map((f, i) => [f, () => constant(i)])),
          },
        },
      },
    });
    schema = applyCacheLimits(schema, {
      operationOperationPlansCacheMaxLength: config.cap,
    });
    const buildMs = performance.now() - buildStart;
    const afterSchema = memory();
    function execute(i: number) {
      const start = performance.now();
      const result = grafastSync({ schema, source, variableValues: inputs[i] });
      const elapsed = performance.now() - start;
      assert(!result.errors, JSON.stringify(result.errors));
      assert.equal(result.data.probe, 1);
      assert.equal(
        Object.keys(result.data).length,
        1 + fields.filter((f) => inputs[i][f]).length
      );
      fields.forEach((f, n) =>
        assert.equal(result.data[f], inputs[i][f] ? n : undefined)
      );
      return elapsed;
    }
    const coldMs = execute(order[0]);
    for (let cycle = 0; cycle < 2; cycle++) for (const i of order) execute(i);
    const afterWarmup = memory();
    const plansBefore = plans;
    const cpuStart = process.cpuUsage();
    const wallStart = performance.now();
    const times: number[] = [];
    for (let cycle = 0; cycle < 32; cycle++)
      for (const i of order) times.push(execute(i));
    const wallMs = performance.now() - wallStart;
    const cpu = process.cpuUsage(cpuStart);
    const afterWorkload = memory();
    const byOperation = inspectCache(schema, 'cacheByOperation');
    const queryCache = inspectCache(schema, 'queryCache');
    assert.equal(byOperation.length, 1);
    assert.equal(queryCache.length, 1);
    assert.equal(byOperation.m, 500);
    assert.equal(queryCache.m, 525);
    const planEntries = countOperationPlans(byOperation);
    assert.equal(planEntries, Math.min(64, config.cap));
    assert.equal(plans - plansBefore, config.cap >= 64 ? 0 : times.length);
    times.sort((a, b) => a - b);
    const pct = (q: number) => times[Math.ceil(times.length * q) - 1];
    assertIndependent();
    harness.writeWorkerResult({
      status: 'ok',
      pid: process.pid,
      caseName,
      buildMs,
      schemaHash: sha(printSchema(schema)),
      schemaTypeCount: Object.keys(schema.getTypeMap()).length,
      runtimeVerified: true,
      caseValidation: { passed: true, errors: [] },
      memory: {
        baseline,
        afterBuild: afterSchema,
        delta: difference(afterSchema, baseline),
        processPeakRss: process.resourceUsage().maxRSS * 1024,
      },
      metadata: {
        configurationSource: 'grafast-schema-extensions',
        scope: '64 @include combinations in one Grafast operation; no SQL/HTTP',
        cap: config.cap,
        inputHash: sha(JSON.stringify({ source, inputs, order })),
        requests: times.length,
        coldMs,
        warmupRequests: 128,
        warmupPlans: plansBefore,
        measuredPlans: plans - plansBefore,
        cacheState: {
          queries: queryCache.length,
          operations: byOperation.length,
          planEntries,
        },
        wallMs,
        cpuMs: (cpu.user + cpu.system) / 1000,
        requestLatencyMs: {
          mean: times.reduce((a, b) => a + b, 0) / times.length,
          p50: pct(0.5),
          p95: pct(0.95),
          p99: pct(0.99),
        },
        afterSchema,
        afterWarmup,
        afterWorkload,
        retainedWorkloadHeapBytes:
          afterWorkload.heapUsed - afterSchema.heapUsed,
        cpu: os.cpus()[0].model,
        loadAverage: os.loadavg(),
      },
    });
  } catch (error) {
    harness.writeWorkerResult({
      status: 'error',
      pid: process.pid,
      caseName,
      error: harness.redactSecret(errorText(error), databaseUrl),
    });
    process.exitCode = 1;
  }
}
async function main() {
  const args = harness.parseValueArgs(process.argv.slice(2)).values;
  const seed = Number(args.get('seed') ?? 20260921);
  const cases = [8, 50, 128].map((cap) => ({
    name: `variants-${cap}`,
    expectedSchemaGroup: 'plan-variants',
    workerConfig: { cap, seed },
  }));
  const report = await harness.runBenchmarkSuite(
    { name: 'grafast-cache-plan-variants', cases },
    {
      databaseUrl: 'unused://in-memory',
      repetitions: Number(args.get('repetitions') ?? 8),
      seed,
      order: null,
      workerTimeoutMs: 300000,
    },
    __filename
  );
  const output = await harness.writeJsonAtomically(
    args.get('output') ?? 'cache-variants-report.json',
    report
  );
  console.log(JSON.stringify({ output, validation: report.validation }));
  if (report.validation.errors.length) process.exitCode = 1;
}
if (
  typeof require !== 'undefined' &&
  typeof module !== 'undefined' &&
  require.main === module
) {
  if (process.argv.includes('--worker-config')) void worker();
  else
    void main().catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
