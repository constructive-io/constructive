// Real PostGraphile/PostgreSQL confirmation of the cache-mechanism benchmark.
// The existing perf-harness owns process isolation, scheduling and reporting.
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { createRequire } = require('node:module');
const { resolve } = require('node:path');
const os = require('node:os');
const { performance } = require('node:perf_hooks');
const root = resolve(__dirname, '../../../..');
const ownerRequire = createRequire(resolve(root, 'graphile/graphile-settings/package.json'));
const harness = require(resolve(root, 'packages/perf-harness/dist'));
const hash = (value) => createHash('sha256').update(value).digest('hex');
const limits = {
  defaults: undefined,
  example: { queryCacheMaxLength: 512, operationsCacheMaxLength: 256, operationOperationPlansCacheMaxLength: 32 },
  large: { queryCacheMaxLength: 1024, operationsCacheMaxLength: 1024, operationOperationPlansCacheMaxLength: 128 },
};

function snapshot() {
  global.gc(); global.gc(); global.gc();
  return process.memoryUsage();
}
function delta(after, before) {
  return Object.fromEntries(Object.keys(after).map((key) => [key, after[key] - before[key]]));
}
function caches(schema) {
  const ext = schema.extensions.grafast;
  const result = {};
  for (const symbol of Object.getOwnPropertySymbols(ext)) {
    if (!['queryCache', 'cacheByOperation'].includes(symbol.description)) continue;
    const cache = ext[symbol];
    assert(cache.c instanceof Map, 'pinned Grafast LRU inspection contract changed');
    result[symbol.description] = { length: cache.length, limit: cache.m };
  }
  return result;
}
function stream(size, seed) {
  let state = seed >>> 0;
  const order = Array.from({ length: size }, (_, i) => i);
  for (let i = size - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
const optionalFields = ['status', 'tags', 'metadata', 'accountId', 'accountByAccountId { name }'];
function query(index) {
  const fields = optionalFields.filter((_, bit) => (index & (1 << bit)) !== 0).join(' ');
  // Distinct operation names model distinct saved/ad-hoc documents. There are
  // only 32 selection shapes; this is explicitly not 600 unique business tasks.
  return `query Case${index} { cacheProbe allEntity1S(first: 5) { nodes { rowId title ${fields} } } }`;
}
function expected(index) {
  return { cacheProbe: 1, allEntity1S: { nodes: Array.from({ length: 5 }, (_, row) => {
    const value = { rowId: String(row + 1), title: `Entity ${row + 1}` };
    if (index & 1) value.status = 'active';
    if (index & 2) value.tags = ['benchmark'];
    if (index & 4) value.metadata = { n: row + 1 };
    if (index & 8) value.accountId = '1';
    if (index & 16) value.accountByAccountId = { name: 'Cache benchmark account' };
    return value;
  }) } };
}

async function worker() {
  const { databaseUrl, envelope } = harness.parseWorkerProcessArgs(process.argv.slice(2));
  const { caseName, workerConfig: config } = envelope;
  let service;
  let result;
  const errors = [];
  try {
    ownerRequire('ts-node').register({ transpileOnly: true, project: resolve(root, 'tsconfig.json') });
    const { createGrafastCacheLimitsPreset } = require(resolve(root, 'graphile/graphile-settings/src/grafast-cache-limits.ts'));
    const { makeSchema, defaultPreset } = ownerRequire('graphile-build');
    const pgPreset = ownerRequire('graphile-build-pg').defaultPreset;
    const { makePgService } = ownerRequire('postgraphile/adaptors/pg');
    const { withPgClientFromPgService } = ownerRequire('@dataplan/pg');
    const { grafast, constant } = ownerRequire('grafast');
    const { extendSchema } = ownerRequire('graphile-utils');
    const { printSchema, lexicographicSortSchema } = ownerRequire('graphql');
    let plans = 0;
    const probe = extendSchema({ typeDefs: 'extend type Query { cacheProbe: Int! }',
      plans: { Query: { cacheProbe() { plans++; return constant(1); } } } });
    const requests = Array.from({ length: config.distinct }, (_, i) => ({ source: query(i), expected: expected(i) }));
    const order = stream(config.distinct, config.seed);
    service = makePgService({ connectionString: databaseUrl, schemas: [config.schema], pubsub: false });
    const baseline = snapshot();
    const started = performance.now();
    const { schema, resolvedPreset } = await makeSchema({
      extends: [defaultPreset, pgPreset, createGrafastCacheLimitsPreset(limits[config.arm])],
      plugins: [probe], pgServices: [service],
    });
    const buildMs = performance.now() - started;
    const afterSchema = snapshot();
    const contextValue = { pgSettings: {}, withPgClient: (settings, callback) => withPgClientFromPgService(service, settings, callback) };
    async function execute(index) {
      const request = requests[index];
      const start = performance.now();
      const execution = await grafast({ schema, resolvedPreset, source: request.source, contextValue });
      const elapsed = performance.now() - start;
      assert(!execution.errors, JSON.stringify(execution.errors));
      // Full data equivalence is checked outside each request latency interval.
      assert.deepEqual(JSON.parse(JSON.stringify(execution.data)), request.expected);
      return elapsed;
    }
    const coldMs = await execute(order[0]);
    for (let cycle = 0; cycle < 2; cycle++) for (const index of order) await execute(index);
    const afterWarmup = snapshot();
    const plansBefore = plans;
    const cpuBefore = process.cpuUsage();
    const wallStart = performance.now();
    const times = [];
    for (let cycle = 0; cycle < config.cycles; cycle++) for (const index of order) times.push(await execute(index));
    const wallMs = performance.now() - wallStart;
    const cpu = process.cpuUsage(cpuBefore);
    const afterWorkload = snapshot();
    const cacheState = caches(schema);
    const configured = limits[config.arm] ?? { queryCacheMaxLength: 525, operationsCacheMaxLength: 500 };
    assert.equal(cacheState.queryCache.limit, configured.queryCacheMaxLength);
    assert.equal(cacheState.cacheByOperation.limit, configured.operationsCacheMaxLength);
    const expectedPlans = config.distinct <= Math.min(configured.queryCacheMaxLength, configured.operationsCacheMaxLength) ? 0 : times.length;
    assert.equal(plans - plansBefore, expectedPlans, 'cyclic working-set replanning invariant');
    times.sort((a, b) => a - b);
    const percentile = (q) => times[Math.min(times.length - 1, Math.ceil(q * times.length) - 1)];
    result = {
      status: 'ok', pid: process.pid, caseName, buildMs,
      schemaHash: hash(printSchema(lexicographicSortSchema(schema))),
      schemaTypeCount: Object.keys(schema.getTypeMap()).length, runtimeVerified: true,
      caseValidation: { passed: true, errors: [] },
      memory: { baseline, afterBuild: afterSchema, delta: delta(afterSchema, baseline), processPeakRss: process.resourceUsage().maxRSS * 1024 },
      metadata: { scope: 'PostGraphile + local PostgreSQL; sequential queries, no HTTP', arm: config.arm,
        distinct: config.distinct, requests: times.length, queryStreamHash: hash(JSON.stringify(order.map(query))),
        coldMs, warmupRequests: 2 * config.distinct, warmupPlans: plansBefore,
        measuredPlans: plans - plansBefore, wallMs, cpuMs: (cpu.user + cpu.system) / 1000,
        requestLatencyMs: { p50: percentile(.5), p95: percentile(.95), p99: percentile(.99), mean: times.reduce((a, b) => a + b, 0) / times.length },
        afterSchema, afterWarmup, afterWorkload, retainedWorkloadHeapBytes: afterWorkload.heapUsed - afterSchema.heapUsed,
        cacheState, loadAverage: os.loadavg(), cpu: os.cpus()[0].model,
      },
    };
  } catch (error) { errors.push(error); }
  if (service) { try { await service.release(); } catch (error) { errors.push(error); } }
  if (errors.length) {
    result = { status: 'error', pid: process.pid, caseName, error: harness.redactSecret(errors.map(e => e.stack ?? String(e)).join('\n'), databaseUrl) };
    process.exitCode = 1;
  }
  harness.writeWorkerResult(result);
}

async function main() {
  const args = harness.parseValueArgs(process.argv.slice(2)).values;
  const databaseUrl = args.get('database-url');
  const schema = args.get('schema');
  assert(databaseUrl && schema, '--database-url and --schema required; prepare with existing perf-harness first');
  const repetitions = Number(args.get('repetitions') ?? 8);
  const seed = Number(args.get('seed') ?? 20260921);
  const cycles = Number(args.get('cycles') ?? 4);
  const cases = [32, 600].flatMap(distinct => Object.keys(limits).map(arm => ({
    name: `pg-${distinct}-${arm}`, expectedSchemaGroup: 'pg-cache', workerConfig: { arm, distinct, schema, cycles: distinct === 32 ? cycles * 16 : cycles, seed },
  })));
  const selected = args.has('case') ? cases.filter(c => c.name === args.get('case')) : cases;
  const report = await harness.runBenchmarkSuite({ name: 'grafast-cache-postgres', cases: selected }, {
    databaseUrl, repetitions, seed, order: null, workerTimeoutMs: 300000,
  }, __filename);
  const output = await harness.writeJsonAtomically(args.get('output') ?? 'cache-postgres-report.json', report);
  console.log(JSON.stringify({ output, validation: report.validation }));
  if (report.validation.errors.length) process.exitCode = 1;
}
if (process.argv.includes('--worker-config')) void worker();
else void main().catch(error => { console.error(error); process.exitCode = 1; });
