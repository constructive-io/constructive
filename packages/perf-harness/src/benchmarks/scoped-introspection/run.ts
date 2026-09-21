import { mkdirSync, writeFileSync } from 'node:fs';
import { cpus, loadavg, totalmem } from 'node:os';
import { join, resolve } from 'node:path';

import { makeSchemaScopedIntrospectionPlan } from 'graphile-scoped-introspection';
import { buildConnectionString } from 'pg-cache';
import { withPgClientFromPgService } from 'postgraphile/@dataplan/pg';
import { makePgService } from 'postgraphile/adaptors/pg';
import { makeIntrospectionQuery } from 'postgraphile/graphile-build-pg/pg-introspection';

import { prepareFixture } from '../../fixture';
import { parseValueArgs } from '../../process';
import type { RunSuiteOptions } from '../../run';
import { runBenchmarkSuite } from '../../run';
import { makeScopedIntrospectionSuite } from '../../scoped-introspection-suite';

interface SessionSetting {
  name: string;
  setting: string;
  unit: string | null;
}

interface CatalogCounts {
  schemas: number;
  tables: number;
  functions: number;
}

const usage = `Usage: scoped:introspection [--output DIRECTORY]

Compare stock and default scoped introspection using the standard PG* environment.
Results default to benchmarks/scoped-introspection/results in the package directory.
`;

export async function main(args = process.argv.slice(2)): Promise<void> {
  if (args.length === 1 && args[0] === '--help') {
    process.stdout.write(usage);
    return;
  }
  const { values } = parseValueArgs(args);
  for (const name of values.keys()) {
    if (name !== 'output') throw new Error(`unsupported argument '--${name}'`);
  }
  const output = values.get('output') ?? resolve(
    __dirname, '../../../benchmarks/scoped-introspection/results'
  );
  if (!output.trim()) throw new Error('--output must be a non-empty directory');
  mkdirSync(output, { recursive: true });
  const writeJson = (name: string, value: unknown): void => {
    writeFileSync(join(output, name), JSON.stringify(value, null, 2));
  };

  // Load the database harness only after validating command-line arguments.
  const { getConnections } = await import('pgsql-test');
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
        expectedData: {
          allAccounts: { nodes: [{ name: 'benchmark account' }] },
          allEntity1S: { nodes: [{ title: 'benchmark entity', accountByAccountId: { name: 'benchmark account' } }] },
          entity1ByAccount: { nodes: [{ title: 'benchmark entity' }] },
        },
      },
    });
    const worker = resolve(__dirname, '../../scoped-introspection-worker.js');
    const environment = {
      capturedAt: new Date().toISOString(),
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
      cpu: cpus()[0].model,
      logicalCpus: cpus().length,
      totalMemory: totalmem(),
      fixture,
      loadAverageBefore: loadavg(),
      postgresSettings: (await conn.pg.query<SessionSetting>(
        "select name, setting, unit from pg_settings where name in ('jit','jit_above_cost','work_mem','statement_timeout','max_parallel_workers_per_gather','shared_buffers') order by name"
      )).rows,
      adaptorSessionSettings: [] as readonly SessionSetting[],
      method: 'Fresh Node process per sample, default PostGraphile adaptor session settings for both cases, database caches warmed by discarded pair at each scale, seeded interleaving, no historical implementation or catalogTypes override.',
    };
    writeJson('environment.json', environment);
    let previous = 0;
    for (const schemas of [0, 10, 50]) {
      for (let i = previous; i < schemas; i++) {
        await prepareFixture({ databaseUrl, schema: `cperf_noise_${i}`, tables: 20 });
      }
      previous = schemas;
      const counts = await conn.pg.query<CatalogCounts>(
        "select (select count(*)::int from pg_namespace where nspname like 'cperf_%') as schemas, (select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname like 'cperf_%' and c.relkind='r') as tables, (select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname like 'cperf_%') as functions"
      );
      const options: RunSuiteOptions = { databaseUrl, repetitions: 1, seed: 20260910, order: null, workerTimeoutMs: 300000 };
      const warm = await runBenchmarkSuite(suite, options, worker);
      writeJson(`warmup-${schemas}.json`, warm);
      if (!warm.validation.allRunsSucceeded || !warm.validation.schemaGroupsEquivalent) {
        throw new Error(JSON.stringify(warm.validation));
      }
      const report = {
        ...await runBenchmarkSuite(suite, { ...options, repetitions: 7 }, worker),
        catalog: counts.rows[0],
        loadAverageAfter: loadavg(),
      };
      writeJson(`report-${schemas}.json`, report);
      if (!report.validation.allRunsSucceeded || !report.validation.schemaGroupsEquivalent) {
        throw new Error(JSON.stringify(report.validation));
      }
      console.log(JSON.stringify({
        unrelatedSchemas: schemas,
        catalog: counts.rows[0],
        validation: report.validation,
        medians: Object.fromEntries(Object.entries(report.summaries).map(([name, summary]) => [name, {
          buildMs: summary.buildMs.median,
          heapMiB: summary.heapUsedAfterBuild.median / 1048576,
          peakRssMiB: summary.processPeakRss.median / 1048576,
        }])),
      }));
    }

    // Diagnostics follow all measured samples and use the same default adaptor.
    const stockQuery = makeIntrospectionQuery();
    const scopedQuery = makeSchemaScopedIntrospectionPlan(['cperf_target']).query;
    const service = makePgService({ name: 'main', connectionString: databaseUrl, schemas: ['cperf_target'], pubsub: false });
    try {
      await withPgClientFromPgService(service, null, async (client) => {
        environment.adaptorSessionSettings = (await client.query<SessionSetting>({
          text: "select name, setting, unit from pg_settings where name in ('jit','jit_above_cost','jit_inline_above_cost','jit_optimize_above_cost','work_mem','statement_timeout','max_parallel_workers_per_gather') order by name",
        })).rows;
        writeJson('environment.json', environment);
        const plans: Record<string, unknown> = {};
        const queries: Record<string, { text: string; values: readonly unknown[] }> = {
          stock: { text: stockQuery, values: [] },
          scoped: scopedQuery,
        };
        for (const [name, query] of Object.entries(queries)) {
          plans[name] = (await client.query<{ 'QUERY PLAN': unknown }>({
            text: 'explain (analyze, buffers, format json) ' + query.text,
            values: [...query.values],
          })).rows[0]['QUERY PLAN'];
        }
        writeJson('plans-default.json', plans);
      });
    } finally {
      await service.release();
    }
  } finally {
    await conn.teardown();
  }
}

if (
  typeof require !== 'undefined' &&
  typeof module !== 'undefined' &&
  require.main === module
) {
  void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
