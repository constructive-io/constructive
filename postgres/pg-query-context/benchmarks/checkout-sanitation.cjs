/* Non-gating microbenchmark. Run after building this package and its test dependencies. */
const { performance } = require('node:perf_hooks');
const { writeFileSync } = require('node:fs');
const { getConnections } = require('pgsql-test');
const { defaultPgPoolFactory } = require('pg-cache');
const { withPgClient } = require('../dist');

async function run() {
  const samples = Number(process.argv[3] ?? 500);
  if (!Number.isSafeInteger(samples) || samples < 100) {
    throw new Error('samples must be an integer >= 100');
  }
  const fixture = await getConnections({}, []);
  let sanitized;
  try {
    const config = { ...fixture.db.config, max: 1 };
    const baseline = fixture.manager.getPool(config);
    // This factory is the behavior under measurement; the fixture owns the DB.
    sanitized = defaultPgPoolFactory({ ...fixture.db.config, pool: { max: 1 } });
    const server = await baseline.query('SHOW server_version');
    const prepared = { name: 'checkout_cost', text: 'SELECT 1 AS value' };
    const workloads = {
      checkout: async pool => {
        const client = await pool.connect();
        client.release();
      },
      prepared_select: async pool => {
        const client = await pool.connect();
        try { await client.query(prepared); }
        finally { client.release(); }
      },
      transaction: async pool => withPgClient(pool, {
        role: fixture.db.config.user,
        row_security: 'on',
        search_path: 'pg_catalog',
        'jwt.claims.user_id': '',
      }, client => client.query(prepared)),
    };
    const results = [];
    for (let round = 0; round < 3; round++) {
      for (const [workload, operation] of Object.entries(workloads)) {
        const arms = round % 2 ? [['sanitized', sanitized], ['baseline', baseline]]
          : [['baseline', baseline], ['sanitized', sanitized]];
        for (const [arm, pool] of arms) {
          for (let i = 0; i < 50; i++) await operation(pool);
          const latencies = [];
          const started = performance.now();
          for (let i = 0; i < samples; i++) {
            const before = performance.now();
            await operation(pool);
            latencies.push(performance.now() - before);
          }
          const elapsedMs = performance.now() - started;
          latencies.sort((a, b) => a - b);
          const percentile = p => latencies[Math.ceil(samples * p) - 1];
          results.push({ round: round + 1, workload, arm, samples, elapsedMs,
            operationsPerSecond: samples * 1000 / elapsedMs,
            p50Ms: percentile(0.5), p95Ms: percentile(0.95), p99Ms: percentile(0.99) });
        }
      }
    }
    const preparedState = {};
    for (const [arm, pool] of [['baseline', baseline], ['sanitized', sanitized]]) {
      const result = await pool.query("SELECT count(*)::int AS count FROM pg_prepared_statements WHERE name = 'checkout_cost'");
      preparedState[arm] = result.rows[0].count;
    }
    const report = { timestamp: new Date().toISOString(), node: process.version,
      postgres: server.rows[0].server_version, clients: 1, concurrency: 1,
      warmupPerArm: 50, order: 'alternating by round', preparedState, results };
    const output = JSON.stringify(report, null, 2) + '\n';
    if (process.argv[2]) writeFileSync(process.argv[2], output);
    else process.stdout.write(output);
  } finally {
    try { if (sanitized) await sanitized.end(); }
    finally { await fixture.teardown(); }
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
