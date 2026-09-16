// Reproduce the default stock/scoped catalog-scaling comparison.
// Run after building perf-harness, graphile-scoped-introspection and pgsql-test.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const root = process.argv[2];
const output = process.argv[3];
if (!root || !output) throw new Error('usage: node scoped-introspection.cjs ABSOLUTE_WORKTREE OUTPUT');
const { createRequire } = require('node:module');
const req = createRequire(path.join(root, 'packages/perf-harness/package.json'));
const { getConnections } = require(path.join(root, 'postgres/pgsql-test/dist'));
const { buildConnectionString } = require(path.join(root, 'postgres/pg-cache/dist'));
const { prepareFixture, makeScopedIntrospectionSuite, runBenchmarkSuite } = require(path.join(root, 'packages/perf-harness/dist'));
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const conn = await getConnections({}, []);
  try {
    const c = conn.pg.config;
    const databaseUrl = buildConnectionString(c.user, c.password, c.host, c.port, c.database);
    const fixture = await prepareFixture({ databaseUrl, schema: 'cperf_target', tables: 8 });
    await conn.pg.query(`insert into cperf_target.account (external_id, name) values ('11111111-1111-1111-1111-111111111111', 'benchmark account');
      insert into cperf_target.entity_1 (account_id, title) values (1, 'benchmark entity');`);
    const suite = makeScopedIntrospectionSuite({
      schemas: ['cperf_target'],
      runtimeCheck: {
        query: '{ allAccounts { nodes { name } } allEntity1S { nodes { title accountByAccountId { name } } } entity1ByAccount(requestedAccountId: "1") { nodes { title } } }',
        expectedData: { allAccounts: { nodes: [{ name: 'benchmark account' }] }, allEntity1S: { nodes: [{ title: 'benchmark entity', accountByAccountId: { name: 'benchmark account' } }] }, entity1ByAccount: { nodes: [{ title: 'benchmark entity' }] } },
      },
    });
    const worker = path.join(root, 'packages/perf-harness/dist/scoped-introspection-worker.js');
    const environment = {
      capturedAt: new Date().toISOString(),
      node: process.version, platform: process.platform, architecture: process.arch,
      cpu: os.cpus()[0].model, logicalCpus: os.cpus().length, totalMemory: os.totalmem(),
      fixture, loadAverageBefore: os.loadavg(),
      postgresSettings: (await conn.pg.query("select name, setting, unit from pg_settings where name in ('jit','jit_above_cost','work_mem','statement_timeout','max_parallel_workers_per_gather','shared_buffers') order by name")).rows,
      method: 'Fresh Node process per sample, default PostGraphile adaptor session settings for both cases, database caches warmed by discarded pair at each scale, seeded interleaving, no historical implementation or catalogTypes override.',
    };
    fs.writeFileSync(path.join(output, 'environment.json'), JSON.stringify(environment, null, 2));
    let previous = 0;
    for (const schemas of [0, 10, 50]) {
      for (let i = previous; i < schemas; i++) await prepareFixture({ databaseUrl, schema: `cperf_noise_${i}`, tables: 20 });
      previous = schemas;
      const counts = await conn.pg.query(`select (select count(*)::int from pg_namespace where nspname like 'cperf_%') as schemas, (select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname like 'cperf_%' and c.relkind='r') as tables, (select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname like 'cperf_%') as functions`);
      const options = { databaseUrl, repetitions: 1, seed: 20260910, order: null, workerTimeoutMs: 300000 };
      const warm = await runBenchmarkSuite(suite, options, worker);
      fs.writeFileSync(path.join(output, `warmup-${schemas}.json`), JSON.stringify(warm, null, 2));
      if (!warm.validation.allRunsSucceeded || !warm.validation.schemaGroupsEquivalent) throw new Error(JSON.stringify(warm.validation));
      const report = await runBenchmarkSuite(suite, { ...options, repetitions: 7 }, worker);
      report.catalog = counts.rows[0];
      report.loadAverageAfter = os.loadavg();
      fs.writeFileSync(path.join(output, `report-${schemas}.json`), JSON.stringify(report, null, 2));
      if (!report.validation.allRunsSucceeded || !report.validation.schemaGroupsEquivalent) throw new Error(JSON.stringify(report.validation));
      console.log(JSON.stringify({ unrelatedSchemas: schemas, catalog: counts.rows[0], validation: report.validation, medians: Object.fromEntries(Object.entries(report.summaries).map(([k,v]) => [k, { buildMs: v.buildMs.median, heapMiB: v.heapUsedAfterBuild.median/1048576, peakRssMiB: v.processPeakRss.median/1048576 }])) }));
    }
    // SQL-only diagnostics after measured samples, through the same default
    // PostGraphile adaptor as the workers (including its built-in JIT setting).
    const stockQuery = req('postgraphile/graphile-build-pg/pg-introspection').makeIntrospectionQuery();
    const scopedQuery = req('graphile-scoped-introspection').makeSchemaScopedIntrospectionPlan(['cperf_target']).query;
    const { makePgService } = req('postgraphile/adaptors/pg');
    const { withPgClientFromPgService } = req('postgraphile/@dataplan/pg');
    const service = makePgService({ name: 'main', connectionString: databaseUrl, schemas: ['cperf_target'], pubsub: false });
    try {
      await withPgClientFromPgService(service, null, async client => {
        environment.adaptorSessionSettings = (await client.query({ text: "select name, setting, unit from pg_settings where name in ('jit','jit_above_cost','jit_inline_above_cost','jit_optimize_above_cost','work_mem','statement_timeout','max_parallel_workers_per_gather') order by name" })).rows;
        fs.writeFileSync(path.join(output, 'environment.json'), JSON.stringify(environment, null, 2));
        const plans = {};
        for (const [name, query] of [['stock', { text: stockQuery, values: [] }], ['scoped', scopedQuery]]) {
          plans[name] = (await client.query({ text: 'explain (analyze, buffers, format json) ' + query.text, values: query.values })).rows[0]['QUERY PLAN'];
        }
        fs.writeFileSync(path.join(output, 'plans-default.json'), JSON.stringify(plans, null, 2));
      });
    } finally { await service.release(); }
  } finally { await conn.teardown(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
