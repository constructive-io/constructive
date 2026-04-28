#!/usr/bin/env npx ts-node
/**
 * E2E GraphQL Multi-Tenancy Benchmark
 *
 * Sends REAL GraphQL HTTP requests through the Express server,
 * exercising the full PostGraphile/Grafast pipeline.
 *
 * Usage:
 *   MODE=old|new K=30 DURATION=300 WORKERS=8 npx ts-node perf/e2e-benchmark.ts
 */

import http from 'http';
import fs from 'fs';
import path from 'path';

// ─── Configuration ──────────────────────────────────────────────────────────
const K = parseInt(process.env.K || '30', 10);
const DURATION_SEC = parseInt(process.env.DURATION || '300', 10);
const WORKERS = parseInt(process.env.WORKERS || '8', 10);
const SERVER_PORT = parseInt(process.env.SERVER_PORT || '3000', 10);
const SERVER_HOST = process.env.SERVER_HOST || 'localhost';
const MODE = process.env.MODE || 'old'; // 'old' or 'new'

// Schemas to expose per tenant (via X-Schemata header)
const SCHEMAS = 'services_public';

// ─── Types ──────────────────────────────────────────────────────────────────
interface TenantProfile {
  tenantId: string;
  databaseId: string;
  headers: Record<string, string>;
}

interface OperationProfile {
  name: string;
  weight: number;
  query: string;
  variables?: Record<string, unknown>;
}

interface WorkerStats {
  totalQueries: number;
  errors: number;
  latencies: number[];
  errorSamples: string[];
}

interface BenchmarkResult {
  mode: string;
  k: number;
  durationSec: number;
  workers: number;
  totalQueries: number;
  errors: number;
  qps: number;
  p50: number;
  p95: number;
  p99: number;
  heapBefore: number;
  heapAfter: number;
  heapDelta: number;
  coldStartMs: number[];
}

// ─── HTTP Client ────────────────────────────────────────────────────────────
const agent = new http.Agent({
  keepAlive: true,
  maxSockets: WORKERS * 4,
  maxFreeSockets: WORKERS * 2,
});

function graphqlRequest(
  query: string,
  headers: Record<string, string>,
  variables?: Record<string, unknown>,
): Promise<{ data?: unknown; errors?: unknown[]; latencyMs: number }> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query, variables });
    const start = performance.now();

    const req = http.request(
      {
        hostname: SERVER_HOST,
        port: SERVER_PORT,
        path: '/graphql',
        method: 'POST',
        agent,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          const latencyMs = performance.now() - start;
          try {
            const parsed = JSON.parse(data);
            resolve({ ...parsed, latencyMs });
          } catch {
            resolve({ errors: [{ message: `Parse error: ${data.slice(0, 200)}` }], latencyMs });
          }
        });
      },
    );
    req.on('error', (err) => reject(err));
    req.write(body);
    req.end();
  });
}

// ─── Memory Snapshot ────────────────────────────────────────────────────────
async function getHeapUsedMB(): Promise<number> {
  try {
    const res = await new Promise<string>((resolve, reject) => {
      http
        .get(`http://${SERVER_HOST}:${SERVER_PORT}/debug/memory`, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve(data));
        })
        .on('error', reject);
    });
    const parsed = JSON.parse(res);
    if (parsed.heapUsed) return parsed.heapUsed / 1024 / 1024;
  } catch {
    // fallback
  }
  return process.memoryUsage().heapUsed / 1024 / 1024;
}

// ─── Tenant Profiles ────────────────────────────────────────────────────────
function buildTenantProfiles(k: number): TenantProfile[] {
  const profiles: TenantProfile[] = [];
  for (let i = 0; i < k; i++) {
    const tenantId = `tenant-${i}`;
    const databaseId = `db-${i.toString().padStart(4, '0')}-${tenantId}`;
    profiles.push({
      tenantId,
      databaseId,
      headers: {
        'X-Schemata': SCHEMAS,
        'X-Database-Id': databaseId,
      },
    });
  }
  return profiles;
}

// ─── Operation Profiles ─────────────────────────────────────────────────────
function buildOperationProfiles(): OperationProfile[] {
  return [
    {
      name: 'ListApis',
      weight: 40,
      query: `query ListApis { apis(first: 10) { nodes { id name dbname isPublic } totalCount } }`,
    },
    {
      name: 'ListApps',
      weight: 20,
      query: `query ListApps { apps(first: 10) { nodes { id name databaseId } totalCount } }`,
    },
    {
      name: 'ListDomains',
      weight: 20,
      query: `query ListDomains { domains(first: 10) { nodes { id domain subdomain } totalCount } }`,
    },
    {
      name: 'Introspection',
      weight: 10,
      query: `query Introspect { __schema { queryType { name } mutationType { name } types { name kind } } }`,
    },
    {
      name: 'MetaQuery',
      weight: 10,
      query: `query Meta { _meta { tables { name schemaName fields { name } } } }`,
    },
  ];
}

function pickWeightedOperation(profiles: OperationProfile[]): OperationProfile {
  const totalWeight = profiles.reduce((sum, p) => sum + p.weight, 0);
  let r = Math.random() * totalWeight;
  for (const p of profiles) {
    r -= p.weight;
    if (r <= 0) return p;
  }
  return profiles[profiles.length - 1];
}

// ─── Cold Start: Warm up all tenants ────────────────────────────────────────
async function warmUpTenants(tenants: TenantProfile[], operations: OperationProfile[]): Promise<number[]> {
  const coldStartMs: number[] = [];
  const simpleQuery = operations[0]; // ListApis

  console.log(`\n[Phase 1] Warming up ${tenants.length} tenants (cold start)...`);
  for (const tenant of tenants) {
    const start = performance.now();
    const result = await graphqlRequest(simpleQuery.query, tenant.headers, simpleQuery.variables);
    const elapsed = performance.now() - start;
    coldStartMs.push(elapsed);

    if (result.errors) {
      console.error(`  ERROR warming tenant ${tenant.tenantId}:`, JSON.stringify(result.errors).slice(0, 200));
    } else {
      console.log(`  ${tenant.tenantId}: ${elapsed.toFixed(1)}ms (cold start)`);
    }
  }
  return coldStartMs;
}

// ─── Pressure Worker ────────────────────────────────────────────────────────
async function pressureWorker(
  tenants: TenantProfile[],
  operations: OperationProfile[],
  durationMs: number,
  _workerId: number,
): Promise<WorkerStats> {
  const stats: WorkerStats = { totalQueries: 0, errors: 0, latencies: [], errorSamples: [] };
  const endTime = Date.now() + durationMs;

  while (Date.now() < endTime) {
    const tenant = tenants[Math.floor(Math.random() * tenants.length)];
    const op = pickWeightedOperation(operations);

    try {
      const result = await graphqlRequest(op.query, tenant.headers, op.variables);
      stats.totalQueries++;
      stats.latencies.push(result.latencyMs);

      if (result.errors) {
        stats.errors++;
        if (stats.errorSamples.length < 3) {
          stats.errorSamples.push(`[${op.name}] ${JSON.stringify(result.errors).slice(0, 200)}`);
        }
      }
    } catch (err) {
      stats.errors++;
      stats.totalQueries++;
      if (stats.errorSamples.length < 3) {
        stats.errorSamples.push(`[${op.name}] ${String(err).slice(0, 200)}`);
      }
    }
  }

  return stats;
}

// ─── Percentile Calculator ──────────────────────────────────────────────────
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// ─── Main Benchmark ─────────────────────────────────────────────────────────
async function runBenchmark(): Promise<BenchmarkResult> {
  console.log('='.repeat(70));
  console.log(`E2E GraphQL Benchmark — Mode: ${MODE.toUpperCase()}`);
  console.log(`  K=${K} tenants, Duration=${DURATION_SEC}s, Workers=${WORKERS}`);
  console.log(`  Server: http://${SERVER_HOST}:${SERVER_PORT}`);
  console.log(`  Schemas: ${SCHEMAS}`);
  console.log('='.repeat(70));

  const tenants = buildTenantProfiles(K);
  const operations = buildOperationProfiles();

  // Phase 0: Pre-benchmark heap snapshot
  const heapBefore = await getHeapUsedMB();
  console.log(`\n[Phase 0] Heap before warmup: ${heapBefore.toFixed(2)} MB`);

  // Phase 1: Cold start — warm up all tenants
  const coldStartMs = await warmUpTenants(tenants, operations);

  // Second warm-up pass to ensure operation plan caches are populated
  console.log(`\n[Phase 1b] Second warm-up pass (populate operation plan caches)...`);
  for (const tenant of tenants) {
    for (const op of operations) {
      await graphqlRequest(op.query, tenant.headers, op.variables);
    }
  }

  // Phase 2: Heap snapshot after warmup
  const heapAfterWarmup = await getHeapUsedMB();
  console.log(`\n[Phase 2] Heap after warmup: ${heapAfterWarmup.toFixed(2)} MB`);

  // Phase 3: Sustained pressure test
  const durationMs = DURATION_SEC * 1000;
  console.log(`\n[Phase 3] Starting ${WORKERS} workers for ${DURATION_SEC}s sustained load...`);
  const startTime = Date.now();

  const workerPromises: Promise<WorkerStats>[] = [];
  for (let w = 0; w < WORKERS; w++) {
    workerPromises.push(pressureWorker(tenants, operations, durationMs, w));
  }

  // Progress reporting
  const progressInterval = setInterval(() => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const remaining = Math.max(0, DURATION_SEC - parseInt(elapsed));
    process.stdout.write(`\r  Elapsed: ${elapsed}s / ${DURATION_SEC}s (${remaining}s remaining)   `);
  }, 5000);

  const results = await Promise.all(workerPromises);
  clearInterval(progressInterval);
  console.log('\n');

  // Phase 4: Post-pressure heap snapshot
  const heapAfter = await getHeapUsedMB();

  // Aggregate stats
  let totalQueries = 0;
  let totalErrors = 0;
  const allLatencies: number[] = [];
  const allErrorSamples: string[] = [];

  for (const r of results) {
    totalQueries += r.totalQueries;
    totalErrors += r.errors;
    allLatencies.push(...r.latencies);
    allErrorSamples.push(...r.errorSamples);
  }

  if (allErrorSamples.length > 0) {
    console.log(`\n[Errors] Sample error messages (first ${Math.min(allErrorSamples.length, 5)}):`);
    for (const s of allErrorSamples.slice(0, 5)) {
      console.log(`  ${s}`);
    }
  }

  allLatencies.sort((a, b) => a - b);
  const actualDuration = (Date.now() - startTime) / 1000;
  const qps = totalQueries / actualDuration;

  const result: BenchmarkResult = {
    mode: MODE,
    k: K,
    durationSec: Math.round(actualDuration),
    workers: WORKERS,
    totalQueries,
    errors: totalErrors,
    qps: Math.round(qps),
    p50: Math.round(percentile(allLatencies, 50)),
    p95: Math.round(percentile(allLatencies, 95)),
    p99: Math.round(percentile(allLatencies, 99)),
    heapBefore: Math.round(heapBefore * 100) / 100,
    heapAfter: Math.round(heapAfter * 100) / 100,
    heapDelta: Math.round((heapAfter - heapBefore) * 100) / 100,
    coldStartMs: coldStartMs.map((v) => Math.round(v)),
  };

  // Print results
  console.log('\u2500'.repeat(70));
  console.log('RESULTS:');
  console.log('\u2500'.repeat(70));
  console.log(`  Mode:           ${result.mode.toUpperCase()}`);
  console.log(`  Tenants (k):    ${result.k}`);
  console.log(`  Duration:       ${result.durationSec}s`);
  console.log(`  Workers:        ${result.workers}`);
  console.log(`  Total Queries:  ${result.totalQueries.toLocaleString()}`);
  console.log(`  Errors:         ${result.errors}`);
  console.log(`  QPS:            ${result.qps.toLocaleString()}`);
  console.log(`  p50 Latency:    ${result.p50}ms`);
  console.log(`  p95 Latency:    ${result.p95}ms`);
  console.log(`  p99 Latency:    ${result.p99}ms`);
  console.log(`  Heap Before:    ${result.heapBefore} MB`);
  console.log(`  Heap After:     ${result.heapAfter} MB`);
  console.log(`  Heap Delta:     ${result.heapDelta} MB`);
  console.log(
    `  Cold Start (first/last): ${result.coldStartMs[0]}ms / ${result.coldStartMs[result.coldStartMs.length - 1]}ms`,
  );
  console.log('\u2500'.repeat(70));

  // Write result to JSON file
  const resultsDir = path.join(__dirname, 'results');
  fs.mkdirSync(resultsDir, { recursive: true });
  const outFile = path.join(resultsDir, `e2e-benchmark-${MODE}-k${K}.json`);
  fs.writeFileSync(outFile, JSON.stringify(result, null, 2));
  console.log(`\nResults written to ${outFile}`);

  // Also write to /tmp for compatibility with run scripts
  const tmpFile = `/tmp/e2e-benchmark-${MODE}-k${K}.json`;
  fs.writeFileSync(tmpFile, JSON.stringify(result, null, 2));

  return result;
}

// ─── Entry Point ────────────────────────────────────────────────────────────
runBenchmark()
  .then((result) => {
    process.exit(result.errors > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error('Benchmark failed:', err);
    process.exit(2);
  });
