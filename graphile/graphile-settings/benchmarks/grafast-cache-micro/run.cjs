const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { createRequire } = require('node:module');
const { resolve } = require('node:path');
const { performance } = require('node:perf_hooks');
const os = require('node:os');
const root = resolve(__dirname, '../../../..');
const harness = require(resolve(root, 'packages/perf-harness/dist'));
const hash = value => createHash('sha256').update(value).digest('hex');
const defaults = { queryCacheMaxLength: 525, operationsCacheMaxLength: 500, operationOperationPlansCacheMaxLength: 50 };
const arms = {
  omitted: undefined, explicit: defaults,
  small: { queryCacheMaxLength: 128, operationsCacheMaxLength: 64, operationOperationPlansCacheMaxLength: 8 },
  example: { queryCacheMaxLength: 512, operationsCacheMaxLength: 256, operationOperationPlansCacheMaxLength: 32 },
  large: { queryCacheMaxLength: 1024, operationsCacheMaxLength: 1024, operationOperationPlansCacheMaxLength: 128 },
  query128: { ...defaults, queryCacheMaxLength: 128, operationsCacheMaxLength: 1024 },
  query525: { ...defaults, operationsCacheMaxLength: 1024 },
  query1024: { ...defaults, queryCacheMaxLength: 1024, operationsCacheMaxLength: 1024 },
  ops64: { ...defaults, queryCacheMaxLength: 1024, operationsCacheMaxLength: 64 },
  ops500: { ...defaults, queryCacheMaxLength: 1024 },
  ops1024: { ...defaults, queryCacheMaxLength: 1024, operationsCacheMaxLength: 1024 },
};
function random(seed) { let state = seed >>> 0; return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; }; }
function indices(workload, seed) {
  const rand = random(seed);
  if (workload === 'mixed') {
    let cold = 32;
    const make = length => Array.from({ length }, (_, i) => i % 10 === 0 ? cold++ : Math.floor(rand() * 32));
    return { warm: make(1000), measured: make(6000), schemaCount: 1 };
  }
  if (workload === 'churn') return { warm: Array.from({ length: 300 }, (_, i) => i), measured: Array.from({ length: 3000 }, (_, i) => i + 300), schemaCount: 1 };
  const size = workload === 'hot' ? 32 : workload === 'multi' ? 300 : 600;
  const order = Array.from({ length: size }, (_, i) => i);
  for (let i = size - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const repeat = count => Array.from({ length: count }, (_, i) => order[i % size]);
  return { warm: repeat(workload === 'hot' ? 1024 : size * 2), measured: repeat(workload === 'hot' ? 4096 : workload === 'multi' ? 600 : 2400), schemaCount: workload === 'multi' ? 8 : 1 };
}
function memory() { global.gc(); global.gc(); global.gc(); return process.memoryUsage(); }
function difference(a, b) { return Object.fromEntries(Object.keys(a).map(k => [k, a[k] - b[k]])); }
function cacheState(schema) {
  const ext = schema.extensions.grafast;
  const out = {};
  for (const symbol of Object.getOwnPropertySymbols(ext)) {
    if (!['queryCache', 'cacheByOperation'].includes(symbol.description)) continue;
    const cache = ext[symbol];
    assert(cache.c instanceof Map, 'Grafast 1.1.2 inspection contract changed');
    out[symbol.description] = { length: cache.length, limit: cache.m };
  }
  return out;
}
async function worker() {
  const { databaseUrl, envelope } = harness.parseWorkerProcessArgs(process.argv.slice(2));
  const { caseName, workerConfig: config } = envelope;
  try {
    const sourceRoot = config.sourceRoot ?? root;
    const req = createRequire(resolve(sourceRoot, 'graphile/graphile-settings/package.json'));
    const { grafastSync, makeGrafastSchema, constant, lambda } = req('grafast');
    const { GraphQLSchema, printSchema, lexicographicSortSchema } = req('graphql');
    // Load identical benchmark tooling for parent/head; this is outside timing.
    req('ts-node').register({ transpileOnly: true, project: resolve(sourceRoot, 'tsconfig.json') });
    let preset = {};
    let createPreset;
    if (!config.parent) {
      createPreset = require(resolve(sourceRoot, 'graphile/graphile-settings/src/grafast-cache-limits.ts')).createGrafastCacheLimitsPreset;
    }
    const stream = indices(config.workload, config.seed);
    const poolSize = Math.max(...stream.warm, ...stream.measured) + 1;
    const sources = Array.from({ length: poolSize }, (_, i) => `query Q${i}($input:Int!) { probe value(input:$input) a b c d e f }`);
    let planCount = 0;
    const baseline = memory();
    const setupStart = performance.now();
    if (createPreset) preset = createPreset(arms[config.arm]);
    const configurationMs = performance.now() - setupStart;
    const buildStart = performance.now();
    const schemas = Array.from({ length: stream.schemaCount }, () => {
      let schema = makeGrafastSchema({ typeDefs: 'type Query { probe:Int! value(input:Int!):Int! a:Int! b:Int! c:Int! d:Int! e:Int! f:Int! }',
        objects: { Query: { plans: {
          probe() { planCount++; return constant(1); },
          value(_, args) { return lambda(args.getRaw('input'), value => value + 1); },
          ...Object.fromEntries(['a', 'b', 'c', 'd', 'e', 'f'].map((field, i) => [field, () => constant(i)])),
        } } },
      });
      for (const plugin of preset.plugins ?? []) schema = new GraphQLSchema(plugin.schema.hooks.GraphQLSchema(schema.toConfig(), {}, {}));
      return schema;
    });
    const buildMs = performance.now() - buildStart;
    const afterSchema = memory();
    function execute(schema, index) {
      const started = performance.now();
      const result = grafastSync({ schema, source: sources[index], variableValues: { input: index } });
      const elapsed = performance.now() - started;
      assert(!result.errors, JSON.stringify(result.errors));
      const data = result.data;
      assert.equal(Object.keys(data).length, 8);
      assert.equal(data.probe, 1); assert.equal(data.value, index + 1);
      for (const [i, field] of ['a', 'b', 'c', 'd', 'e', 'f'].entries()) assert.equal(data[field], i);
      return elapsed;
    }
    const coldMs = schemas.map(schema => execute(schema, stream.warm[0]));
    for (const schema of schemas) for (const index of stream.warm) execute(schema, index);
    const afterWarmup = memory();
    const beforePlans = planCount;
    const cpuStart = process.cpuUsage();
    const wallStart = performance.now();
    const times = [];
    for (const schema of schemas) for (const index of stream.measured) times.push(execute(schema, index));
    const wallMs = performance.now() - wallStart;
    const cpu = process.cpuUsage(cpuStart);
    const afterWorkload = memory();
    const cacheStates = schemas.map(cacheState);
    const expected = arms[config.arm] ?? defaults;
    for (const state of cacheStates) {
      assert.equal(state.queryCache.limit, expected.queryCacheMaxLength);
      assert.equal(state.cacheByOperation.limit, expected.operationsCacheMaxLength);
      assert(state.queryCache.length <= expected.queryCacheMaxLength);
      assert(state.cacheByOperation.length <= expected.operationsCacheMaxLength);
    }
    const measuredPlans = planCount - beforePlans;
    if (config.workload === 'hot') assert.equal(measuredPlans, 0);
    if (config.workload === 'churn') assert.equal(measuredPlans, times.length);
    if (['broad', 'multi'].includes(config.workload)) {
      const size = config.workload === 'broad' ? 600 : 300;
      assert.equal(measuredPlans, size <= Math.min(expected.queryCacheMaxLength, expected.operationsCacheMaxLength) ? 0 : times.length);
    }
    times.sort((a, b) => a - b);
    const percentile = q => times[Math.min(times.length - 1, Math.ceil(times.length * q) - 1)];
    harness.writeWorkerResult({
      status: 'ok', pid: process.pid, caseName, buildMs,
      schemaHash: hash(printSchema(lexicographicSortSchema(schemas[0]))), schemaTypeCount: Object.keys(schemas[0].getTypeMap()).length,
      runtimeVerified: true, caseValidation: { passed: true, errors: [] },
      memory: { baseline, afterBuild: afterSchema, delta: difference(afterSchema, baseline), processPeakRss: process.resourceUsage().maxRSS * 1024 },
      metadata: { scope: 'Grafast in-memory cache mechanism; no SQL or HTTP', parent: !!config.parent,
        configurationMs, coldMs, workload: config.workload, arm: config.arm, schemaCount: schemas.length,
        inputHash: hash(JSON.stringify({ sources, warm: stream.warm, measured: stream.measured })),
        requests: times.length, warmupRequests: schemas.length * stream.warm.length, warmupPlans: beforePlans, measuredPlans,
        wallMs, cpuMs: (cpu.user + cpu.system) / 1000,
        requestLatencyMs: { mean: times.reduce((a, b) => a + b, 0) / times.length, p50: percentile(.5), p95: percentile(.95), p99: percentile(.99) },
        afterSchema, afterWarmup, afterWorkload, retainedWorkloadHeapBytes: afterWorkload.heapUsed - afterSchema.heapUsed,
        retainedWorkloadHeapBytesPerSchema: (afterWorkload.heapUsed - afterSchema.heapUsed) / schemas.length,
        cacheStates, cpu: os.cpus()[0].model, loadAverage: os.loadavg(),
      },
    });
  } catch (error) {
    harness.writeWorkerResult({ status: 'error', pid: process.pid, caseName, error: harness.redactSecret(error.stack ?? String(error), databaseUrl) });
    process.exitCode = 1;
  }
}
async function main() {
  const args = harness.parseValueArgs(process.argv.slice(2)).values;
  const seed = Number(args.get('seed') ?? 20260921);
  const cases = [];
  function add(workload, arm, extra = {}) { cases.push({ name: `${workload}-${extra.parent ? 'parent' : arm}`, expectedSchemaGroup: 'cache-micro', workerConfig: { workload, arm, seed, ...extra } }); }
  if (args.has('baseline-root')) add('hot', 'omitted', { parent: true, sourceRoot: resolve(args.get('baseline-root')) });
  ['omitted', 'explicit', 'example', 'large'].forEach(arm => add('hot', arm));
  ['omitted', 'small', 'example', 'large'].forEach(arm => add('mixed', arm));
  ['omitted', 'example', 'large'].forEach(arm => add('churn', arm));
  ['query128', 'query525', 'query1024', 'ops64', 'ops500', 'ops1024'].forEach(arm => add('broad', arm));
  ['omitted', 'small', 'example'].forEach(arm => add('multi', arm));
  const selected = args.has('case') ? cases.filter(c => c.name === args.get('case')) : cases;
  const report = await harness.runBenchmarkSuite({ name: 'grafast-cache-micro', cases: selected }, {
    databaseUrl: 'unused://in-memory', repetitions: Number(args.get('repetitions') ?? 8), seed, order: null, workerTimeoutMs: 300000,
  }, __filename);
  const output = await harness.writeJsonAtomically(args.get('output') ?? 'cache-micro-report.json', report);
  console.log(JSON.stringify({ output, validation: report.validation }));
  if (report.validation.errors.length) process.exitCode = 1;
}
if (process.argv.includes('--worker-config')) void worker();
else void main().catch(error => { console.error(error); process.exitCode = 1; });
