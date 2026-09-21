import { makeSchema, defaultPreset } from 'graphile-build';
import { defaultPreset as pgPreset } from 'graphile-build-pg';
import { makePgService } from 'postgraphile/adaptors/pg';
import { withPgClientFromPgService, type WithPgClient } from '@dataplan/pg';
import { grafast, constant } from 'grafast';
import { extendSchema } from 'graphile-utils';
import { printSchema, lexicographicSortSchema } from 'graphql';
// Real PostGraphile/PostgreSQL confirmation of the cache-mechanism benchmark.
// The existing perf-harness owns process isolation, scheduling and reporting.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import * as harness from '../../index';
import type { BenchmarkCaseDefinition } from '../../types';
import {
  applyCacheLimits,
  assertIndependent,
  objectConfig,
  errorText,
  memory,
  difference,
  cacheState as readCacheState,
} from './settings';
const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const limits: Record<
  'defaults' | 'example' | 'large',
  import('./settings').CacheLimits | undefined
> = {
  defaults: undefined,
  example: {
    queryCacheMaxLength: 512,
    operationsCacheMaxLength: 256,
    operationOperationPlansCacheMaxLength: 32,
  },
  large: {
    queryCacheMaxLength: 1024,
    operationsCacheMaxLength: 1024,
    operationOperationPlansCacheMaxLength: 128,
  },
};

function stream(size: number, seed: number) {
  let state = seed >>> 0;
  const order = Array.from({ length: size }, (_, i) => i);
  for (let i = size - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
const optionalFields = [
  'status',
  'tags',
  'metadata',
  'accountId',
  'accountByAccountId { name }',
];
function query(index: number) {
  const fields = optionalFields
    .filter((_, bit) => (index & (1 << bit)) !== 0)
    .join(' ');
  // Distinct operation names model distinct saved/ad-hoc documents. There are
  // only 32 selection shapes; this is explicitly not 600 unique business tasks.
  return `query Case${index} { cacheProbe allEntity1S(first: 5) { nodes { rowId title ${fields} } } }`;
}
function expected(index: number) {
  return {
    cacheProbe: 1,
    allEntity1S: {
      nodes: Array.from({ length: 5 }, (_, row) => {
        const value: Record<string, harness.JsonValue> = {
          rowId: String(row + 1),
          title: `Entity ${row + 1}`,
        };
        if (index & 1) value.status = 'active';
        if (index & 2) value.tags = ['benchmark'];
        if (index & 4) value.metadata = { n: row + 1 };
        if (index & 8) value.accountId = '1';
        if (index & 16)
          value.accountByAccountId = { name: 'Cache benchmark account' };
        return value;
      }),
    },
  };
}

async function worker() {
  const { databaseUrl, envelope } = harness.parseWorkerProcessArgs(
    process.argv.slice(2)
  );
  const { caseName } = envelope;
  let service: ReturnType<typeof makePgService>;
  let result: harness.WorkerResult;
  const errors: unknown[] = [];
  try {
    const config = objectConfig(envelope.workerConfig);
    assert(typeof config.arm === 'string' && Object.hasOwn(limits, config.arm));
    const arm = config.arm as keyof typeof limits;
    assert(
      typeof config.schema === 'string' && config.schema.startsWith('cperf_')
    );
    assert(
      typeof config.distinct === 'number' && [32, 600].includes(config.distinct)
    );
    assert(
      typeof config.cycles === 'number' &&
        Number.isSafeInteger(config.cycles) &&
        config.cycles > 0
    );
    assert(
      typeof config.seed === 'number' && Number.isSafeInteger(config.seed)
    );
    let plans = 0;
    const probe = extendSchema({
      typeDefs: 'extend type Query { cacheProbe: Int! }',
      plans: {
        Query: {
          cacheProbe() {
            plans++;
            return constant(1);
          },
        },
      },
    });
    const requests = Array.from({ length: config.distinct }, (_, i) => ({
      source: query(i),
      expected: expected(i),
    }));
    const order = stream(config.distinct, config.seed);
    service = makePgService({
      connectionString: databaseUrl,
      schemas: [config.schema],
      pubsub: false,
    });
    const baseline = memory();
    const started = performance.now();
    let { schema, resolvedPreset } = await makeSchema({
      extends: [defaultPreset, pgPreset],
      plugins: [probe],
      pgServices: [service],
    });
    schema = applyCacheLimits(schema, limits[arm]);
    const buildMs = performance.now() - started;
    const afterSchema = memory();
    const withPgClient: WithPgClient = (settings, callback) =>
      withPgClientFromPgService(service, settings, callback);
    const contextValue = { pgSettings: {}, withPgClient };
    async function execute(index: number) {
      const request = requests[index];
      const start = performance.now();
      const execution = await grafast({
        schema,
        resolvedPreset,
        source: request.source,
        contextValue,
      });
      const elapsed = performance.now() - start;
      assert(!('next' in execution), 'expected a non-streaming query result');
      assert(!execution.errors, JSON.stringify(execution.errors));
      // Full data equivalence is checked outside each request latency interval.
      assert.deepEqual(
        JSON.parse(JSON.stringify(execution.data)),
        request.expected
      );
      return elapsed;
    }
    const coldMs = await execute(order[0]);
    for (let cycle = 0; cycle < 2; cycle++)
      for (const index of order) await execute(index);
    const afterWarmup = memory();
    const plansBefore = plans;
    const cpuBefore = process.cpuUsage();
    const wallStart = performance.now();
    const times: number[] = [];
    for (let cycle = 0; cycle < config.cycles; cycle++)
      for (const index of order) times.push(await execute(index));
    const wallMs = performance.now() - wallStart;
    const cpu = process.cpuUsage(cpuBefore);
    const afterWorkload = memory();
    const cacheState = readCacheState(schema);
    const configured = limits[arm] ?? {
      queryCacheMaxLength: 525,
      operationsCacheMaxLength: 500,
    };
    assert.equal(cacheState.queryCache.limit, configured.queryCacheMaxLength);
    assert.equal(
      cacheState.cacheByOperation.limit,
      configured.operationsCacheMaxLength
    );
    const expectedPlans =
      config.distinct <=
      Math.min(
        configured.queryCacheMaxLength,
        configured.operationsCacheMaxLength
      )
        ? 0
        : times.length;
    assert.equal(
      plans - plansBefore,
      expectedPlans,
      'cyclic working-set replanning invariant'
    );
    times.sort((a, b) => a - b);
    const percentile = (q: number) =>
      times[Math.min(times.length - 1, Math.ceil(q * times.length) - 1)];
    assertIndependent();
    result = {
      status: 'ok',
      pid: process.pid,
      caseName,
      buildMs,
      schemaHash: hash(printSchema(lexicographicSortSchema(schema))),
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
        scope: 'PostGraphile + local PostgreSQL; sequential queries, no HTTP',
        arm: config.arm,
        distinct: config.distinct,
        requests: times.length,
        queryStreamHash: hash(JSON.stringify(order.map(query))),
        coldMs,
        warmupRequests: 2 * config.distinct,
        warmupPlans: plansBefore,
        measuredPlans: plans - plansBefore,
        wallMs,
        cpuMs: (cpu.user + cpu.system) / 1000,
        requestLatencyMs: {
          p50: percentile(0.5),
          p95: percentile(0.95),
          p99: percentile(0.99),
          mean: times.reduce((a, b) => a + b, 0) / times.length,
        },
        afterSchema,
        afterWarmup,
        afterWorkload,
        retainedWorkloadHeapBytes:
          afterWorkload.heapUsed - afterSchema.heapUsed,
        cacheState,
        loadAverage: os.loadavg(),
        cpu: os.cpus()[0].model,
      },
    };
  } catch (error) {
    errors.push(error);
  }
  if (service) {
    try {
      await service.release();
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length) {
    result = {
      status: 'error',
      pid: process.pid,
      caseName,
      error: harness.redactSecret(
        errors.map((e) => errorText(e)).join('\n'),
        databaseUrl
      ),
    };
    process.exitCode = 1;
  }
  harness.writeWorkerResult(result);
}

async function main() {
  const args = harness.parseValueArgs(process.argv.slice(2)).values;
  const databaseUrl = args.get('database-url');
  const schema = args.get('schema');
  assert(
    databaseUrl && schema,
    '--database-url and --schema required; prepare with existing perf-harness first'
  );
  const repetitions = Number(args.get('repetitions') ?? 8);
  const seed = Number(args.get('seed') ?? 20260921);
  const cycles = Number(args.get('cycles') ?? 4);
  const cases = [32, 600].flatMap((distinct) =>
    Object.keys(limits).map((arm) => ({
      name: `pg-${distinct}-${arm}`,
      expectedSchemaGroup: 'pg-cache',
      workerConfig: {
        arm,
        distinct,
        schema,
        cycles: distinct === 32 ? cycles * 16 : cycles,
        seed,
      },
    }))
  );
  const selected = args.has('case')
    ? cases.filter((c) => c.name === args.get('case'))
    : cases;
  const report = await harness.runBenchmarkSuite(
    { name: 'grafast-cache-postgres', cases: selected },
    {
      databaseUrl,
      repetitions,
      seed,
      order: null,
      workerTimeoutMs: 300000,
    },
    __filename
  );
  const output = await harness.writeJsonAtomically(
    args.get('output') ?? 'cache-postgres-report.json',
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
