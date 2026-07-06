/**
 * Deep-tier scenario checks — the four multi-surface / settings / realtime /
 * partition probes that run ONLY under `regression run --suite deep`.
 *
 * Each scenario is:
 *   - individually skippable (`--only` / `--skip`, via scenarioEnabled)
 *   - self-contained: it boots its OWN fresh server(s) via run/server.spawnServer
 *     and drives light traffic itself via core/gql.gqlFetch (per RECON finding 3);
 *     no ramp/harness child is required
 *   - reversible: every mutating SQL statement is paired with its exact inverse
 *     in a `finally`, and settings mutations refuse to run (skip) if the target
 *     rows already exist, so the rig is left EXACTLY as found
 *   - guardrailed: every PG + server port flows through the existing
 *     assertPortAllowed guardrail (spawnServer + pgConfigFromArgv already do this;
 *     the ctx handed in is already validated by the suite)
 *
 * Only `multi-api-residency` is a GRADEABLE check (the deterministic pooling
 * residency invariant). Everything else is ADVISORY: reported, never gating.
 *
 * The PURE helpers (rewriteHostPrefix / deriveSurfaceFleets / computeCreepProjection
 * / parsePartitionIntervalSeconds / scenarioEnabled / buildTeardownLeftoverWarning
 * / buildResidencyAbortCheck) are exported for unit tests and touch no PG or network.
 */
import fs from 'node:fs';
import path from 'node:path';

import { assertPortAllowed, PgConfig } from '../core/config';
import { buildSubset, Tenant } from '../core/fleetfile';
import { gqlFetch, GqlResponse } from '../core/gql';
import { withFreshClient } from '../core/pgc';
import { ensureParentDir, readJsonl } from '../core/proc';
import { spawnServer, SpawnedServer } from '../run/server';
import { Baseline } from './baselines';
import { CheckResult } from './compare';
import {
  buildCreateProbePartition,
  buildDropProbePartition,
  buildPartConfigLikePatterns,
  buildSettingsInsert,
  DATABASE_ID_BY_NAME_SQL,
  IS_PARTITIONED_PARENT_SQL,
  PART_CONFIG_FOR_TENANT_SQL,
  PG_CLASS_COUNT_SQL,
  SCHEMA_UPDATE_CHANNEL,
  SCHEMA_UPDATE_NOTIFY_SQL,
  SETTINGS_DELETE_SQL,
  SETTINGS_EXISTING_SQL,
  SettingsFlag,
  splitParentTable,
  TENANT_SCHEMAS_SQL
} from './sql';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const round1 = (n: number): number => Math.round(n * 10) / 10;
const round2 = (n: number): number => Math.round(n * 100) / 100;
const round4 = (n: number): number => Math.round(n * 10000) / 10000;
const MB = (bytes: number): number => round1(bytes / 1024 / 1024);

// ===========================================================================
// Registry + filter (pure)
// ===========================================================================

export const DEEP_SCENARIOS = [
  'multi-api-residency',
  'settings-variant-split',
  'realtime-dedicated-cost',
  'partition-creep'
] as const;

export type DeepScenarioName = (typeof DEEP_SCENARIOS)[number];

// `--only a,b` restricts to that set; `--skip a,b` removes from the set; skip
// wins over only. Empty/absent `only` means "all not skipped".
export function scenarioEnabled(name: string, only?: string[] | null, skip?: string[] | null): boolean {
  if (skip && skip.includes(name)) return false;
  if (only && only.length > 0) return only.includes(name);
  return true;
}

// ===========================================================================
// Host-rewrite derivation (pure)
// ===========================================================================

// Rewrite the leading `<from>-` label of a virtual host to `<to>-`. The rig's
// tenant hosts are `api-<tenant>-<hex8>.<domain>`; the admin/usage/… surfaces
// share the tenant+hex+domain and differ only in this first label. Returns null
// when `host` does not start with `<from>-`.
export function rewriteHostPrefix(host: string, fromPrefix: string, toPrefix: string): string | null {
  if (!host || typeof host !== 'string') return null;
  const from = `${fromPrefix}-`;
  if (!host.startsWith(from)) return null;
  return `${toPrefix}-${host.slice(from.length)}`;
}

export interface SurfaceFleet {
  surface: string;
  tenants: Tenant[]; // each tenant's apiHost rewritten to this surface's host
}

// Derive a per-surface fleet by rewriting each tenant's apiHost. `surfaces`
// entries other than 'api' rewrite the `api-` label to `<surface>-`; 'api'
// keeps the host as-is. authHost is preserved unchanged (login always uses the
// auth surface). Tenants without an apiHost, or whose apiHost cannot be
// rewritten, are dropped from that surface's fleet (with a warning).
export function deriveSurfaceFleets(
  tenants: Tenant[],
  surfaces: string[]
): { fleets: SurfaceFleet[]; warnings: string[] } {
  const warnings: string[] = [];
  const fleets: SurfaceFleet[] = [];
  for (const surface of surfaces) {
    const out: Tenant[] = [];
    for (const t of tenants) {
      if (!t.apiHost) {
        warnings.push(`${t.dbname}: no apiHost; dropped from ${surface} surface`);
        continue;
      }
      const host = surface === 'api' ? t.apiHost : rewriteHostPrefix(t.apiHost, 'api', surface);
      if (!host) {
        warnings.push(`${t.dbname}: apiHost '${t.apiHost}' has no 'api-' label; dropped from ${surface} surface`);
        continue;
      }
      out.push({ ...t, apiHost: host });
    }
    fleets.push({ surface, tenants: out });
  }
  return { fleets, warnings };
}

// ===========================================================================
// Partition-creep math (pure)
// ===========================================================================

// Average calendar month (30.4375 d) — matches the 'month' unit weight in
// parsePartitionIntervalSeconds so a monthly interval yields exactly 1/month.
export const SECONDS_PER_MONTH = 30.4375 * 24 * 3600;

const INTERVAL_UNIT_SECONDS: Record<string, number> = {
  sec: 1, secs: 1, second: 1, seconds: 1,
  min: 60, mins: 60, minute: 60, minutes: 60,
  hour: 3600, hours: 3600, hr: 3600, hrs: 3600,
  day: 86400, days: 86400,
  week: 604800, weeks: 604800,
  mon: SECONDS_PER_MONTH, mons: SECONDS_PER_MONTH, month: SECONDS_PER_MONTH, months: SECONDS_PER_MONTH,
  year: 365.25 * 24 * 3600, years: 365.25 * 24 * 3600
};

// Parse a Postgres/partman interval string ('1 day', '7 days', '1 mon',
// '01:00:00', '1 day 06:00:00') into seconds. Returns null when nothing
// recognizable is found (e.g. an id-based partition interval like '10000').
export function parsePartitionIntervalSeconds(interval: string): number | null {
  if (!interval || typeof interval !== 'string') return null;
  const s = interval.trim().toLowerCase();
  if (!s) return null;

  // Pure clock form HH:MM:SS.
  const pureClock = /^(\d+):(\d{2}):(\d{2})$/.exec(s);
  if (pureClock) return Number(pureClock[1]) * 3600 + Number(pureClock[2]) * 60 + Number(pureClock[3]);

  let total = 0;
  let matched = false;
  const re = /(\d+(?:\.\d+)?)\s*([a-z]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    const weight = INTERVAL_UNIT_SECONDS[m[2]];
    if (weight === undefined) continue;
    total += Number(m[1]) * weight;
    matched = true;
  }
  // Trailing clock component in a mixed interval, e.g. '1 day 06:00:00'.
  const trailingClock = /(?:^|\s)(\d+):(\d{2}):(\d{2})(?:\s|$)/.exec(s);
  if (trailingClock && matched) {
    total += Number(trailingClock[1]) * 3600 + Number(trailingClock[2]) * 60 + Number(trailingClock[3]);
  }
  return matched ? total : null;
}

export interface CreepInputs {
  rowsPerPartition: number;
  partitionedParents: number;
  partitionIntervalSeconds: number;
  instanceHeapKBPerRow: number;
}

export interface CreepProjection {
  intervalsPerMonth: number;
  partitionsPerMonth: number;
  rowsPerTenantPerMonth: number;
  heapCreepMBPerMonthPerTenant: number;
}

// Project monthly catalog + heap creep for ONE tenant from a measured
// rows-per-partition, the count of partitioned parents, and the (uniform)
// partition interval. heap uses the sizing constant KB/pg_class-row.
export function computeCreepProjection(inp: CreepInputs): CreepProjection {
  const s = inp.partitionIntervalSeconds;
  const intervalsPerMonth = s > 0 ? SECONDS_PER_MONTH / s : 0;
  const parents = Math.max(0, inp.partitionedParents);
  const rowsPer = Math.max(0, inp.rowsPerPartition);
  const kbPerRow = Math.max(0, inp.instanceHeapKBPerRow);
  const partitionsPerMonth = parents * intervalsPerMonth;
  const rowsPerTenantPerMonth = partitionsPerMonth * rowsPer;
  const heapCreepMBPerMonthPerTenant = (rowsPerTenantPerMonth * kbPerRow) / 1024;
  return {
    intervalsPerMonth: round2(intervalsPerMonth),
    partitionsPerMonth: round2(partitionsPerMonth),
    rowsPerTenantPerMonth: round2(rowsPerTenantPerMonth),
    heapCreepMBPerMonthPerTenant: round2(heapCreepMBPerMonthPerTenant)
  };
}

// ===========================================================================
// Scenario context + result
// ===========================================================================

export interface ScenarioContext {
  suite: string;
  pg: PgConfig;
  port: number;
  deepHeapMb: number; // --deep-heap-mb (multi-api residency server)
  heapMb: number; // regression --heap-mb (the capacity-2 thrash sub-check)
  outDir: string;
  repoRoot: string;
  serverCmd: string[];
  allowHub: boolean;
  catalogRows: number;
  baseline: Baseline;
  fleet: Tenant[];
  drifted: any;
  sameBpRegex?: string;
  only?: string[] | null;
  skip?: string[] | null;
  creds: { email: string; password: string | null };
}

export interface ScenarioResult {
  name: string;
  ran: boolean;
  skipped?: string;
  checks: CheckResult[];
  data?: any;
  warnings?: string[];
  error?: string;
}

const skippedResult = (name: string, reason: string): ScenarioResult => ({
  name,
  ran: false,
  skipped: reason,
  checks: []
});

// ===========================================================================
// Server + metrics helpers (internal)
// ===========================================================================

interface BootedServer {
  server: SpawnedServer;
  metricsFile: string;
}

async function bootFreshServer(
  ctx: ScenarioContext,
  tag: string,
  heapMb: number,
  opts?: { metricsEndpoint?: boolean }
): Promise<BootedServer> {
  assertPortAllowed(ctx.port, ctx.allowHub, 'server-port');
  const metricsFile = path.join(ctx.outDir, `deep-metrics-${tag}.jsonl`);
  if (fs.existsSync(metricsFile)) fs.rmSync(metricsFile);
  // Size the LRU cache from the MEASURED per-instance heap (catalog pg_class
  // rows x baseline KB/row), NOT graphile-cache's 512MB default. Without this
  // the server derives GRAPHILE_CACHE_MAX for ~0.5GB instances (6 @3584MB,
  // 13 @7168MB) while each real instance retains ~1.3GB here — it would admit
  // far more instances than the heap can hold, defeat ensureCacheHeadroom's
  // evict-before-build guard, and risk a genuine OOM/SIGABRT. At the measured
  // size the cap matches the baseline capacity model (e.g. 2 @3584MB), so the
  // thrash sub-check's "cap < surfaces" premise and the residency hot-set-fits
  // premise both actually hold.
  const instanceHeapBytes = Math.max(1, Math.round(ctx.catalogRows * ctx.baseline.instanceHeapKBPerRow * 1024));
  const server = await spawnServer({
    name: `deep-${tag}`,
    port: ctx.port,
    heapMb,
    metricsFile,
    pg: ctx.pg,
    repoRoot: ctx.repoRoot,
    outDir: ctx.outDir,
    serverCmd: ctx.serverCmd,
    instanceHeapBytes,
    metricsEndpoint: opts?.metricsEndpoint === true,
    detached: false,
    allowHub: ctx.allowHub
  });
  return { server, metricsFile };
}

async function stopServer(server: SpawnedServer | null): Promise<void> {
  if (!server) return;
  try {
    await server.stop();
  } catch {
    /* already gone */
  }
  // Let the OS release the listen socket before the next scenario re-binds it.
  await sleep(2000);
}

const latestMetrics = (metricsFile: string): any | null => {
  const rows = readJsonl(metricsFile);
  return rows.length ? rows[rows.length - 1] : null;
};

const cacheSizeOf = (s: any): number => (s && s.cache && typeof s.cache.size === 'number' ? s.cache.size : 0);
const cacheKeysOf = (s: any): number => (s && s.cache && typeof s.cache.keys === 'number' ? s.cache.keys : 0);
const buildsOf = (s: any): number => (s && s.counters && typeof s.counters.builds === 'number' ? s.counters.builds : 0);
const heapUsedMBOf = (s: any): number => (s && typeof s.heapUsed === 'number' ? MB(s.heapUsed) : 0);
const lruEvictionsOf = (s: any): number => (s && s.counters && s.counters.evictions ? s.counters.evictions.lru || 0 : 0);
const evictionsTotalOf = (s: any): number => {
  const e = s && s.counters && s.counters.evictions;
  return e ? (e.lru || 0) + (e.ttl || 0) + (e.manual || 0) + (e.governor || 0) : 0;
};

// Wait until the metrics sampler has written at least one line (~10s cadence).
async function waitForBaselineSample(metricsFile: string, timeoutMs = 90000): Promise<any | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const s = latestMetrics(metricsFile);
    if (s) return s;
    await sleep(2000);
  }
  return latestMetrics(metricsFile);
}

// Wait for a metrics sample strictly NEWER than `afterTs` (the sampler writes a
// fresh line ~every 10s). Used to snapshot counters AFTER an action completes so
// a stale line can't misattribute the action's builds/evictions to a later
// window. Falls back to the latest sample on timeout.
async function waitForSampleAfter(metricsFile: string, afterTs: string | undefined, timeoutMs = 15000): Promise<any | null> {
  const deadline = Date.now() + timeoutMs;
  let last = latestMetrics(metricsFile);
  while (Date.now() < deadline) {
    last = latestMetrics(metricsFile);
    if (last && (!afterTs || last.ts !== afterTs)) return last;
    await sleep(1000);
  }
  return last;
}

const COLD_TIMEOUT_MS = 300000;
const WARM_TIMEOUT_MS = 15000;

// A `{ __typename }` probe — builds the tenant's PostGraphile instance on first
// hit (no auth, universally valid; see RECON finding 4). Retries transient 503
// SERVICE_ROTATING while the instance builds.
async function coldProbe(host: string, port: number, retries = 8): Promise<GqlResponse> {
  let r: GqlResponse = { status: 0, ok: false, elapsedMs: 0, error: 'not-attempted' };
  for (let i = 0; i <= retries; i++) {
    r = await gqlFetch({ host, port, query: '{ __typename }', timeoutMs: COLD_TIMEOUT_MS });
    if (r.status !== 503) return r;
    await sleep(1500);
  }
  return r;
}

const warmProbe = (host: string, port: number): Promise<GqlResponse> =>
  gqlFetch({ host, port, query: '{ __typename }', timeoutMs: WARM_TIMEOUT_MS });

const answered = (r: GqlResponse): boolean =>
  r.status === 200 && !r.error && !(r.json && Array.isArray(r.json.errors) && r.json.errors.length > 0);

// Pick up to N group-0 (single-blueprint) tenants that carry the fields a
// scenario needs. buildSubset is the same pure selector the standard checks use.
function pickGroup0(ctx: ScenarioContext, n: number): Tenant[] {
  try {
    return buildSubset(ctx.fleet, ctx.drifted || {}, { tenants: n, sameBpRegex: ctx.sameBpRegex }).tenants;
  } catch {
    return [];
  }
}

// Resolve a tenant's control-plane database id (uuid) — from the manifest when
// present, else by name from metaschema_public.database.
async function resolveDatabaseId(client: any, t: Tenant): Promise<string | null> {
  if (t.databaseId) return String(t.databaseId);
  const r = await client.query(DATABASE_ID_BY_NAME_SQL, [t.dbname]);
  return r.rows[0] ? String(r.rows[0].id) : null;
}

// Resolve db ids for the target tenants and REFUSE to proceed (throw 'SKIP: …')
// if any already carry a settings row — this phase performs NO mutation, so a
// skip here leaves the rig exactly as found.
async function resolveAndPrecheck(ctx: ScenarioContext, tenants: Tenant[]): Promise<string[]> {
  return withFreshClient(ctx.pg, async (client): Promise<string[]> => {
    const ids: string[] = [];
    for (const t of tenants) {
      const id = await resolveDatabaseId(client, t);
      if (!id) throw new Error(`could not resolve database id for ${t.dbname}`);
      ids.push(id);
    }
    const existing = await client.query(SETTINGS_EXISTING_SQL, [ids]);
    if (existing.rows.length > 0) {
      throw new Error(
        `SKIP: ${existing.rows.length} target tenant(s) already carry a database_settings row; ` +
          'refusing to mutate (would break exact-restore teardown)'
      );
    }
    return ids;
  });
}

// INSERT one settings row per id (all requested flags set true), pushing each
// committed id into `inserted` so teardown deletes PRECISELY what landed — even
// if a later INSERT throws mid-way.
async function seedSettings(ctx: ScenarioContext, ids: string[], flags: SettingsFlag[], inserted: string[]): Promise<void> {
  const insertSql = buildSettingsInsert(flags);
  const values = flags.map(() => true);
  await withFreshClient(ctx.pg, async (client): Promise<void> => {
    for (const id of ids) {
      await client.query(insertSql, [id, ...values]);
      inserted.push(id);
    }
  });
}

// DELETE exactly the seeded rows + a best-effort schema:update NOTIFY, then
// report how many survived. Never throws (teardown failures become warnings);
// an empty id list is a no-op.
async function teardownSettings(
  ctx: ScenarioContext,
  ids: string[]
): Promise<{ rowsRemaining: number | null; error: string | null }> {
  if (!ids.length) return { rowsRemaining: 0, error: null };
  try {
    return await withFreshClient(ctx.pg, async (client): Promise<{ rowsRemaining: number; error: null }> => {
      await client.query(SETTINGS_DELETE_SQL, [ids]);
      for (const id of ids) {
        await client.query(SCHEMA_UPDATE_NOTIFY_SQL, [SCHEMA_UPDATE_CHANNEL, id]).catch(() => {});
      }
      const left = await client.query(SETTINGS_EXISTING_SQL, [ids]);
      return { rowsRemaining: left.rows.length, error: null };
    });
  } catch (e: any) {
    return { rowsRemaining: null, error: String(e && e.message ? e.message : e) };
  }
}

// Surface a non-exact teardown into the suite warnings: when a scenario's
// teardown left settings rows behind (rowsRemaining > 0) the rig is no longer
// exactly as found, and that must be VISIBLE in the verdict output — not merely
// recorded in `data`. Returns the warning string, or null when nothing leaked
// (0 rows) or the leftover count is unknown (null — the teardown itself already
// pushed its own error warning). Pure (no PG/IO); exported for unit tests.
export function buildTeardownLeftoverWarning(scenario: string, rowsRemaining: number | null): string | null {
  if (typeof rowsRemaining === 'number' && rowsRemaining > 0) {
    return `${scenario} TEARDOWN left ${rowsRemaining} database_settings row(s) behind (manual cleanup may be needed)`;
  }
  return null;
}

// ===========================================================================
// 1) multi-api-residency  (GRADEABLE residency + ADVISORY heap / thrash)
// ===========================================================================

const SURFACES = ['api', 'admin', 'usage'] as const; // + auth via authHost

// Fail-CLOSED CheckResult for the residency invariant when the scenario aborts
// before it can be measured. NON-advisory (no `advisory` flag) so it GATES the
// verdict — the whole point is that the suite must not silently PASS when the
// one gradeable deep check never ran. Pure; exported for unit tests.
export function buildResidencyAbortCheck(errorMessage: string): CheckResult {
  return {
    name: 'multi-api-residency',
    pass: false,
    value: null,
    threshold: 0,
    note: `residency invariant NOT established — scenario aborted before measurement: ${errorMessage}`
  };
}

export async function runMultiApiResidency(ctx: ScenarioContext): Promise<ScenarioResult> {
  const name = 'multi-api-residency';
  const warnings: string[] = [];

  const tenants = pickGroup0(ctx, 10).filter((t) => t.apiHost);
  if (tenants.length === 0) return skippedResult(name, 'no group-0 tenants with an apiHost');

  // Derive api/admin/usage surface fleets by host-rewrite; auth uses authHost.
  const { fleets, warnings: dw } = deriveSurfaceFleets(tenants, SURFACES as unknown as string[]);
  warnings.push(...dw);
  const surfaceTargets: { surface: string; hosts: string[] }[] = [];
  for (const f of fleets) {
    const hosts = f.tenants.map((t) => t.apiHost).filter(Boolean) as string[];
    if (hosts.length) surfaceTargets.push({ surface: f.surface, hosts });
  }
  const authHosts = tenants.map((t) => t.authHost).filter(Boolean) as string[];
  if (authHosts.length) surfaceTargets.push({ surface: 'auth', hosts: authHosts });

  const R = surfaceTargets.length;
  if (R < 2) return skippedResult(name, `only ${R} routable surface(s) derivable; need >= 2`);

  const data: any = {
    surfaces: surfaceTargets.map((s) => s.surface),
    tenantCount: tenants.length,
    expectedResidency: R
  };

  // -- primary server at --deep-heap-mb (capacity should be >= R) -----------
  let booted: BootedServer | null = null;
  const checks: CheckResult[] = [];
  try {
    booted = await bootFreshServer(ctx, 'multiapi', ctx.deepHeapMb);
    const base = await waitForBaselineSample(booted.metricsFile);
    if (!base) throw new Error('no baseline metrics sample from the deep-heap server');
    const baseHeapMB = heapUsedMBOf(base);
    data.deepHeapMb = ctx.deepHeapMb;
    data.baseHeapMB = baseHeapMB;

    // Cold-build every surface across every tenant. NOTE: on THIS rig each
    // (surface, tenant) is its OWN blueprint instance — computeBlueprintKey folds
    // the per-tenant dbname into the key (middleware/blueprint.ts) and every
    // tenant here has a distinct dbname, so tenants do NOT collapse to one
    // instance per surface. This sweep is advisory reachability; the gradeable
    // invariant below is pool REUSE of the held-hot set, not cross-tenant collapse.
    const coldOk: Record<string, number> = {};
    for (const st of surfaceTargets) {
      coldOk[st.surface] = 0;
      for (const host of st.hosts) {
        const r = await coldProbe(host, ctx.port);
        if (answered(r)) coldOk[st.surface]++;
      }
    }
    data.coldOk = coldOk;

    // Optional faithful "auth via login" — best effort, records nothing gating.
    if (ctx.creds.password && authHosts.length) {
      const login = await attemptSignIn(authHosts[0], ctx.port, ctx.creds);
      data.authLogin = login;
    }

    // -- prime, then hold ONE host per surface HOT for ~120s -----------------
    // Gradeable invariant: pool REUSE. Once the R hot instances are resident,
    // re-serving them must trigger ZERO rebuilds (the pool returns the CACHED
    // instance, not a fresh build per request) and ZERO LRU evictions (the hot
    // set fits — which is why the server is sized from the measured per-instance
    // heap; see bootFreshServer). A pooling regression — unstable keys, or a
    // collapse that mints a per-request instance — surfaces here as the builds
    // counter CLIMBING during the hold. cache.size >= R alone can't detect that
    // (>= R instances already exist from the cold sweep). The cold sweep above
    // may have LRU-evicted the hot hosts, so PRIME them, then measure the
    // builds/eviction DELTA across the steady hold.
    const holdHosts = surfaceTargets.map((st) => ({ surface: st.surface, host: st.hosts[0] }));
    for (const h of holdHosts) await coldProbe(h.host, ctx.port);
    // Snapshot counters from a sample taken AFTER the prime builds land, so their
    // builds are not counted against the steady hold below.
    const primed = await waitForSampleAfter(booted.metricsFile, latestMetrics(booted.metricsFile)?.ts);
    const buildsAtHoldStart = buildsOf(primed);
    const lruAtStart = lruEvictionsOf(primed);
    let maxCacheSize = cacheSizeOf(primed);
    let maxHeapMB = Math.max(baseHeapMB, heapUsedMBOf(primed));
    const surfacesAnswered = new Set<string>();
    const holdMs = 120000;
    const holdDeadline = Date.now() + holdMs;
    while (Date.now() < holdDeadline) {
      for (const h of holdHosts) {
        const r = await warmProbe(h.host, ctx.port);
        if (answered(r)) surfacesAnswered.add(h.surface);
      }
      const s = latestMetrics(booted.metricsFile);
      if (s) {
        maxCacheSize = Math.max(maxCacheSize, cacheSizeOf(s));
        maxHeapMB = Math.max(maxHeapMB, heapUsedMBOf(s));
      }
      await sleep(1500);
    }
    const lastSample = latestMetrics(booted.metricsFile);
    const buildsDuringHold = Math.max(0, buildsOf(lastSample) - buildsAtHoldStart);
    const lruDuringHold = Math.max(0, lruEvictionsOf(lastSample) - lruAtStart);
    const cacheSizeReached = Math.max(maxCacheSize, cacheSizeOf(lastSample));
    const buildsTotal = buildsOf(lastSample);

    data.residency = {
      perTenantKeys: true, // dbname is folded into the bp key on this rig — no cross-tenant collapse
      cacheSizeReached,
      cacheKeysLast: cacheKeysOf(lastSample),
      buildsTotal,
      buildsDuringHold,
      lruEvictionsDuringHold: lruDuringHold,
      surfacesAnswered: [...surfacesAnswered],
      maxHeapMB
    };

    // Deterministic given a correctly heap-sized cache: steady-state re-serving
    // of the R hot surfaces rebuilds nothing and evicts nothing, and every
    // surface keeps answering.
    const residencyOk =
      buildsDuringHold === 0 && lruDuringHold === 0 && surfacesAnswered.size === R && cacheSizeReached >= R;
    checks.push({
      name: 'multi-api-residency',
      pass: residencyOk,
      value: buildsDuringHold,
      threshold: 0,
      note:
        `${R} surfaces (${surfaceTargets.map((s) => s.surface).join('/')}) held hot ~120s ` +
        `(per-tenant dbname keys — no cross-tenant collapse on this rig): rebuilds during hold ` +
        `${buildsDuringHold} (must be 0 — pool reuse), LRU evictions ${lruDuringHold} (must be 0 — hot ` +
        `set resident), surfaces answering ${surfacesAnswered.size}/${R}, cache.size ${cacheSizeReached}`
    });

    // -- ADVISORY: heap plateau consistent with base + R*I (±tolerance) ------
    const perInstanceMB = (ctx.baseline.instanceHeapKBPerRow * ctx.catalogRows) / 1024;
    const expectedPlateauMB = baseHeapMB + R * perInstanceMB;
    const deltaRatio = expectedPlateauMB > 0 ? Math.abs(maxHeapMB - expectedPlateauMB) / expectedPlateauMB : 1;
    const tol = ctx.baseline.deepThresholds.multiApiHeapTolerance;
    const measuredPerInstanceMB = R > 0 ? (maxHeapMB - baseHeapMB) / R : 0;
    data.heapPlateau = {
      perInstanceExpectedMB: round1(perInstanceMB),
      expectedPlateauMB: round1(expectedPlateauMB),
      measuredMaxHeapMB: round1(maxHeapMB),
      measuredPerInstanceMB: round1(measuredPerInstanceMB),
      deltaRatio: round4(deltaRatio),
      tolerance: tol
    };
    checks.push({
      name: 'multi-api-heap-plateau',
      advisory: true,
      pass: deltaRatio <= tol,
      value: round1(maxHeapMB),
      threshold: round1(expectedPlateauMB),
      note:
        `heapUsed plateau ${round1(maxHeapMB)}MB vs base+${R}*I=${round1(expectedPlateauMB)}MB ` +
        `(±${tol}; measured ~${round1(measuredPerInstanceMB)}MB/instance)`
    });
  } catch (e: any) {
    if (!booted && e && e.server) booted = { server: e.server, metricsFile: '' };
    const msg = String(e && e.message ? e.message : e);
    warnings.push(`multi-api-residency primary phase error: ${msg}`);
    data.error = msg;
    // Fail CLOSED: residency is the one GRADEABLE deep check. If we aborted
    // before recording it, the suite would otherwise PASS with the invariant
    // never tested (advisory checks don't gate). Push a FAILING gradeable result
    // — unless the residency check already landed — so the verdict reflects that
    // the invariant could not be established.
    if (!checks.some((c) => c.name === name)) {
      checks.push(buildResidencyAbortCheck(msg));
    }
  } finally {
    await stopServer(booted ? booted.server : null);
  }

  // -- ADVISORY sub-check: same 4 surfaces at heap 3584 (capacity ~2) must ---
  // -- churn (LRU evictions) WITHOUT the process dying. ----------------------
  try {
    const thrash = await runMultiApiThrash(ctx, surfaceTargets);
    data.thrash = thrash.data;
    checks.push(thrash.check);
    warnings.push(...thrash.warnings);
  } catch (e: any) {
    warnings.push(`multi-api thrash sub-check error: ${e && e.message ? e.message : e}`);
  }

  return { name, ran: true, checks, data, warnings };
}

async function runMultiApiThrash(
  ctx: ScenarioContext,
  surfaceTargets: { surface: string; hosts: string[] }[]
): Promise<{ check: CheckResult; data: any; warnings: string[] }> {
  const warnings: string[] = [];
  let booted: BootedServer | null = null;
  let crashed = false;
  let evictions = 0;
  let evictionsStart = 0;
  try {
    booted = await bootFreshServer(ctx, 'multiapi-thrash', ctx.heapMb);
    await waitForBaselineSample(booted.metricsFile);
    evictionsStart = evictionsTotalOf(latestMetrics(booted.metricsFile));
    // A few rounds cycling all surfaces forces the sub-capacity cache to evict.
    for (let round = 0; round < 3; round++) {
      for (const st of surfaceTargets) {
        const r = await coldProbe(st.hosts[0], ctx.port, 4);
        if (r.status === 0 && r.error) warnings.push(`thrash: ${st.surface} network error ${r.error}`);
      }
      if (booted.server.exited()) {
        crashed = true;
        break;
      }
    }
    await sleep(3000);
    const last = latestMetrics(booted.metricsFile);
    evictions = Math.max(0, evictionsTotalOf(last) - evictionsStart);
    crashed = crashed || booted.server.exited();
  } catch (e: any) {
    if (!booted && e && e.server) booted = { server: e.server, metricsFile: '' };
    crashed = booted ? booted.server.exited() : true;
    warnings.push(`thrash boot/drive error: ${e && e.message ? e.message : e}`);
  } finally {
    await stopServer(booted ? booted.server : null);
  }
  const data = { heapMb: ctx.heapMb, evictionsObserved: evictions, serverCrashed: crashed };
  return {
    check: {
      name: 'multi-api-thrash-3584',
      advisory: true,
      pass: !crashed && evictions > 0,
      value: evictions,
      threshold: 0,
      note:
        `at heap ${ctx.heapMb}MB the heap-sized cache cap (~2 for the measured ~1.3GB instances) is below ` +
        `the ${surfaceTargets.length} cycled surfaces; expect eviction churn without death: ` +
        `evictions=${evictions}, crashed=${crashed}`
    },
    data,
    warnings
  };
}

// Best-effort signIn against an auth host (records outcome, never gates).
async function attemptSignIn(
  authHost: string,
  port: number,
  creds: { email: string; password: string | null }
): Promise<any> {
  if (!creds.password) return { attempted: false, reason: 'no password' };
  const query =
    'mutation SignIn($email: String!, $password: String!) ' +
    '{ signIn(input: { email: $email, password: $password }) { result { accessToken } } }';
  const r = await gqlFetch({
    host: authHost,
    port,
    query,
    variables: { email: creds.email, password: creds.password },
    timeoutMs: WARM_TIMEOUT_MS
  });
  return { attempted: true, status: r.status, ok: answered(r) };
}

// Read the server's LIVE graphileCache key list from the loopback-only
// /debug/memory endpoint (enabled with metricsEndpoint:true). getCacheStats()
// keys the cache by the pool DECISION key, so a pooled tenant appears as its
// `bp:` blueprint key — letting us observe the key itself, not just a count.
// Returns null when the endpoint is unavailable/unreachable.
async function fetchGraphileCacheKeys(port: number): Promise<string[] | null> {
  for (const host of ['127.0.0.1', '[::1]']) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 3000);
    try {
      const res = await fetch(`http://${host}:${port}/debug/memory`, { signal: ac.signal });
      if (!res.ok) continue;
      const j: any = await res.json();
      const keys = j && j.graphileCache && Array.isArray(j.graphileCache.keys) ? j.graphileCache.keys : null;
      if (keys) return keys.filter((k: any) => typeof k === 'string');
    } catch {
      /* try the next loopback family */
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

const bpKeys = (keys: string[] | null): string[] => (keys || []).filter((k) => k.startsWith('bp:'));

// Boot a fresh (metrics-endpoint) server, cold-build ONE tenant's api surface,
// and return the NEW `bp:` cache key it produced. The before/after key-set diff
// isolates THIS tenant's key from anything the server built at startup. The
// server is always stopped before returning.
async function bootAndCaptureTenantKey(
  ctx: ScenarioContext,
  tag: string,
  tenant: Tenant
): Promise<{ key: string | null; warning?: string }> {
  let booted: BootedServer | null = null;
  try {
    booted = await bootFreshServer(ctx, tag, ctx.heapMb, { metricsEndpoint: true });
    await waitForBaselineSample(booted.metricsFile);
    const before = bpKeys(await fetchGraphileCacheKeys(ctx.port));
    const r = await coldProbe(tenant.apiHost, ctx.port);
    if (!answered(r)) return { key: null, warning: `${tag}: tenant ${tenant.dbname} did not answer (status ${r.status})` };
    await sleep(2000);
    const after = bpKeys(await fetchGraphileCacheKeys(ctx.port));
    const added = after.filter((k) => !before.includes(k));
    if (added.length === 1) return { key: added[0] };
    if (added.length === 0) {
      return {
        key: null,
        warning: `${tag}: no new bp: key after building ${tenant.dbname} (before=${before.length} after=${after.length}; endpoint or pooling unavailable?)`
      };
    }
    return { key: added.sort()[0], warning: `${tag}: ${added.length} new bp: keys building one tenant; took the first` };
  } catch (e: any) {
    // A boot that started the child but timed out on the port attaches it here;
    // salvage the handle so the finally can stop it instead of leaking it.
    if (!booted && e && e.server) booted = { server: e.server, metricsFile: '' };
    throw e;
  } finally {
    await stopServer(booted ? booted.server : null);
  }
}

// ===========================================================================
// 2) settings-variant-split  (ADVISORY)
// ===========================================================================

export async function runSettingsVariantSplit(ctx: ScenarioContext): Promise<ScenarioResult> {
  const name = 'settings-variant-split';
  const warnings: string[] = [];
  const flags: SettingsFlag[] = ['enable_aggregates'];

  // Compare ONE tenant's blueprint key across two fresh-server boots — a CONTROL
  // boot with no settings row (g=[]) and a VARIANT boot with the flag seeded
  // (g=[…]). The physical dbname is folded into the key on this per-database rig,
  // so counting instances across DIFFERENT tenants proves nothing (each tenant
  // already has its own dbname → its own bp: key regardless of settings). Holding
  // the SAME tenant constant makes the settings flag the ONLY thing that can move
  // the key — which is exactly the contract this probe is meant to verify.
  const pool = pickGroup0(ctx, 6).filter((t) => t.apiHost);
  if (pool.length < 1) return skippedResult(name, `need >= 1 group-0 tenant with apiHost, have ${pool.length}`);
  const tenant = pool[0];

  const data: any = {
    tenant: tenant.dbname,
    flags,
    expectedInstances: ctx.baseline.deepThresholds.settingsSplitExpectedInstances,
    method: 'same-tenant two-boot blueprint-key comparison (dbname held constant to isolate the flag)',
    note:
      'Each boot is a NEW process with a FRESH databaseSettingsLoader, so boot 1 ' +
      'loads g=[] and boot 2 loads g=[…] deterministically — no dependence on the ' +
      '5-min loader TTL or a schema:update flush (RECON finding b).'
  };

  // Resolve the db id + refuse to mutate a tenant that already has a settings row
  // (NO mutation in this phase — a skip here leaves the rig untouched).
  let tenantIds: string[] = [];
  try {
    tenantIds = await resolveAndPrecheck(ctx, [tenant]);
  } catch (e: any) {
    const msg = e && e.message ? e.message : String(e);
    if (msg.startsWith('SKIP:')) return skippedResult(name, msg.slice(5).trim());
    return { name, ran: false, checks: [], error: msg, warnings };
  }

  // `insertedIds` tracks exactly what we commit, so teardown deletes precisely
  // that row even if the variant boot throws mid-way.
  const insertedIds: string[] = [];
  const checks: CheckResult[] = [];
  try {
    // -- boot 1: CONTROL (no settings row) → capture the tenant's bp: key -----
    const control = await bootAndCaptureTenantKey(ctx, 'settings-control', tenant);
    if (control.warning) warnings.push(control.warning);
    data.controlKey = control.key;

    // -- seed the flag, then boot 2: VARIANT → capture the bp: key again ------
    await seedSettings(ctx, tenantIds, flags, insertedIds);
    data.seededDatabaseIds = insertedIds;
    const variant = await bootAndCaptureTenantKey(ctx, 'settings-variant', tenant);
    if (variant.warning) warnings.push(variant.warning);
    data.variantKey = variant.key;

    const bothCaptured = !!control.key && !!variant.key;
    const distinctKeys = new Set([control.key, variant.key].filter(Boolean)).size;
    const flagChangedKey = bothCaptured && control.key !== variant.key;
    const expected = ctx.baseline.deepThresholds.settingsSplitExpectedInstances; // 2 distinct keys
    data.distinctInstances = distinctKeys;
    data.flagChangedKey = flagChangedKey;

    checks.push({
      name: 'settings-variant-split',
      advisory: true,
      pass: bothCaptured && distinctKeys >= expected,
      value: distinctKeys,
      threshold: expected,
      note: bothCaptured
        ? `tenant ${tenant.dbname} yielded ${distinctKeys} distinct blueprint key(s) across ` +
          `control(g=[]) vs variant(g=[${flags.join(',')}]) boots (expected ${expected}); the flag ` +
          `${flagChangedKey ? 'CHANGED' : 'did NOT change'} the key`
        : `could not capture both blueprint keys (control=${control.key ? 'ok' : 'missing'}, ` +
          `variant=${variant.key ? 'ok' : 'missing'}); see warnings`
    });
  } catch (e: any) {
    warnings.push(`settings-variant-split drive error: ${e && e.message ? e.message : e}`);
    data.error = String(e && e.message ? e.message : e);
  } finally {
    // TEARDOWN: delete exactly the row we inserted + best-effort flush NOTIFY.
    // Restores the rig to zero settings rows (its measured ground truth).
    const td = await teardownSettings(ctx, insertedIds);
    data.teardownRowsRemaining = td.rowsRemaining;
    if (td.error) warnings.push(`settings-variant-split TEARDOWN failed (manual cleanup may be needed): ${td.error}`);
    const leftover = buildTeardownLeftoverWarning(name, td.rowsRemaining);
    if (leftover) warnings.push(leftover);
  }

  return { name, ran: true, checks, data, warnings };
}

// ===========================================================================
// 3) realtime-dedicated-cost  (ADVISORY)
// ===========================================================================

export async function runRealtimeDedicatedCost(ctx: ScenarioContext): Promise<ScenarioResult> {
  const name = 'realtime-dedicated-cost';
  const warnings: string[] = [];
  const flags: SettingsFlag[] = ['enable_realtime'];

  const pool = pickGroup0(ctx, 6).filter((t) => t.apiHost);
  if (pool.length < 3) return skippedResult(name, `need >= 3 group-0 tenants with apiHost, have ${pool.length}`);
  const realtime = pool[0];
  const controls = pool.slice(1, 3);

  const data: any = {
    realtimeTenant: realtime.dbname,
    controlTenants: controls.map((t) => t.dbname),
    flags,
    note:
      'RECON finding c: enable_realtime=true force-UNPOOLS the tenant (dedicated ' +
      'per-tenant instance) and, absent realtime_public infra, adds a background ' +
      '5s error-poll — it degrades, it does not crash.'
  };

  // No-mutation resolve + pre-check (skip cleanly if a row already exists).
  let realtimeIds: string[] = [];
  try {
    realtimeIds = await resolveAndPrecheck(ctx, [realtime]);
  } catch (e: any) {
    const msg = e && e.message ? e.message : String(e);
    if (msg.startsWith('SKIP:')) return skippedResult(name, msg.slice(5).trim());
    return { name, ran: false, checks: [], error: msg, warnings };
  }

  const insertedIds: string[] = [];
  const checks: CheckResult[] = [];
  let booted: BootedServer | null = null;
  try {
    await seedSettings(ctx, realtimeIds, flags, insertedIds);
    data.seededDatabaseIds = insertedIds;

    booted = await bootFreshServer(ctx, 'realtime', ctx.heapMb);
    const base = await waitForBaselineSample(booted.metricsFile);
    const baseHeapMB = heapUsedMBOf(base);

    // 1) control A → the shared pooled control instance (baseline).
    const cA = await coldProbe(controls[0].apiHost, ctx.port);
    await sleep(4000);
    const afterControl = latestMetrics(booted.metricsFile);
    const cacheAfterControl = cacheSizeOf(afterControl);
    const heapAfterControlMB = heapUsedMBOf(afterControl);

    // 2) realtime tenant → its own (dedicated / unpooled) instance.
    const rt = await coldProbe(realtime.apiHost, ctx.port);
    await sleep(6000);
    const afterRealtime = latestMetrics(booted.metricsFile);
    const cacheAfterRealtime = cacheSizeOf(afterRealtime);
    const heapAfterRealtimeMB = heapUsedMBOf(afterRealtime);

    // 3) control B → must NOT add an instance (controls stay pooled together).
    const cB = await coldProbe(controls[1].apiHost, ctx.port);
    await sleep(4000);
    const afterControlB = latestMetrics(booted.metricsFile);
    const cacheAfterControlB = cacheSizeOf(afterControlB);

    const realtimeServed = answered(rt);
    const dedicatedInstance = cacheAfterRealtime > cacheAfterControl; // gained its own
    const controlsStayPooled = cacheAfterControlB <= cacheAfterRealtime; // B added none
    const realtimeInstanceHeapMB = round1(heapAfterRealtimeMB - heapAfterControlMB);

    const logTail = booted.server.logTail(4000) || '';
    const realtimePollNoticed = /realtime_public|realtime|touch_listener|drain_changes/i.test(logTail);

    data.measurements = {
      baseHeapMB,
      cacheAfterControl,
      cacheAfterRealtime,
      cacheAfterControlB,
      heapAfterControlMB: round1(heapAfterControlMB),
      heapAfterRealtimeMB: round1(heapAfterRealtimeMB),
      realtimeInstanceHeapMB,
      realtimeServed,
      dedicatedInstance,
      controlsStayPooled,
      realtimeLogSignalsSeen: realtimePollNoticed,
      controlAStatus: cA.status,
      realtimeStatus: rt.status,
      controlBStatus: cB.status
    };

    if (!realtimeServed) {
      // Capture the exact failure mode — valuable data, not a suite failure.
      data.failureMode = {
        status: rt.status,
        error: rt.error || null,
        body: (rt.text || (rt.json ? JSON.stringify(rt.json).slice(0, 400) : '')) || '',
        serverExited: booted.server.exited(),
        serverExit: booted.server.exitInfo(),
        logTail: booted.server.logTail(2000)
      };
    }

    checks.push({
      name: 'realtime-dedicated-cost',
      advisory: true,
      pass: realtimeServed && dedicatedInstance && controlsStayPooled,
      value: realtimeInstanceHeapMB,
      threshold: null,
      note: realtimeServed
        ? `realtime tenant served on a dedicated instance (~${realtimeInstanceHeapMB}MB); ` +
          `controls stayed pooled (${cacheAfterControlB} instance(s))`
        : `realtime tenant did NOT serve (status ${rt.status}) — failure mode captured`
    });
  } catch (e: any) {
    if (!booted && e && e.server) booted = { server: e.server, metricsFile: '' };
    warnings.push(`realtime-dedicated-cost drive error: ${e && e.message ? e.message : e}`);
    data.error = String(e && e.message ? e.message : e);
    checks.push({
      name: 'realtime-dedicated-cost',
      advisory: true,
      pass: false,
      value: null,
      threshold: null,
      note: `error while measuring realtime tenant: ${data.error}`
    });
  } finally {
    await stopServer(booted ? booted.server : null);
    const td = await teardownSettings(ctx, insertedIds);
    data.teardownRowsRemaining = td.rowsRemaining;
    if (td.error) warnings.push(`realtime-dedicated-cost TEARDOWN failed (manual cleanup may be needed): ${td.error}`);
    const leftover = buildTeardownLeftoverWarning(name, td.rowsRemaining);
    if (leftover) warnings.push(leftover);
  }

  return { name, ran: true, checks, data, warnings };
}

// ===========================================================================
// 4) partition-creep  (ADVISORY, pure SQL — no server)
// ===========================================================================

// Far-future, interval-agnostic window for the throwaway probe partition. No
// premade partition covers 2099, so the CREATE cannot collide; it is DROPped
// immediately regardless.
const PROBE_LO = '2099-01-01 00:00:00+00';
const PROBE_HI = '2099-01-08 00:00:00+00';
const PROBE_SUFFIX = '__perfcreep_probe';

export async function runPartitionCreep(ctx: ScenarioContext): Promise<ScenarioResult> {
  const name = 'partition-creep';
  const warnings: string[] = [];

  const tenants = pickGroup0(ctx, 3);
  const tenant = tenants.find((t) => t.databaseId) || tenants[0];
  if (!tenant) return skippedResult(name, 'no group-0 tenant available');

  const data: any = { tenant: tenant.dbname };
  const checks: CheckResult[] = [];

  try {
    await withFreshClient(ctx.pg, async (client): Promise<void> => {
      const dbId = await resolveDatabaseId(client, tenant);
      if (!dbId) {
        warnings.push(`could not resolve database id for ${tenant.dbname}`);
        return;
      }

      const schemaRows = await client.query(TENANT_SCHEMAS_SQL, [dbId]);
      const schemas = schemaRows.rows.map((r: any) => r.schema_name);
      if (schemas.length === 0) {
        data.skipped = 'no physical schemas for tenant';
        return;
      }
      const patterns = buildPartConfigLikePatterns(schemas);
      const partRows = (await client.query(PART_CONFIG_FOR_TENANT_SQL, [patterns])).rows as any[];
      if (partRows.length === 0) {
        data.skipped = 'no partman.part_config rows for this tenant (not partitioned / partman absent)';
        return;
      }

      // Record every partitioned parent + its interval/premake.
      const parents = partRows.map((r) => {
        const intervalSeconds = parsePartitionIntervalSeconds(r.partition_interval);
        return {
          parentTable: r.parent_table,
          partitionInterval: r.partition_interval,
          intervalSeconds,
          premake: r.premake
        };
      });
      data.parents = parents;
      data.partitionedParents = parents.length;

      // Prefer an events parent (RECON: events/billing/limits/user_auth are
      // partitioned); fall back to the first parent with a parseable interval.
      const eventsParent =
        parents.find((p) => /events/i.test(p.parentTable) && p.intervalSeconds) ||
        parents.find((p) => p.intervalSeconds);
      if (!eventsParent) {
        data.skipped = 'no parent with a parseable time interval; cannot measure/project';
        return;
      }
      data.measuredParent = eventsParent.parentTable;
      const split = splitParentTable(eventsParent.parentTable);
      if (!split) {
        data.skipped = `could not split parent_table '${eventsParent.parentTable}'`;
        return;
      }

      const isNative = await client.query(IS_PARTITIONED_PARENT_SQL, [split.schema, split.table]);
      if (isNative.rows.length === 0) {
        data.skipped = `parent ${eventsParent.parentTable} is not a native partitioned table (relkind<>'p')`;
        return;
      }

      // -- measure: create ONE probe partition, diff pg_class, drop, verify ---
      const child = `${split.table}${PROBE_SUFFIX}`;
      // Clear any probe child left by a crashed prior run so the baseline is clean.
      await client.query(buildDropProbePartition(split.schema, child)).catch(() => {});
      const before = (await client.query(PG_CLASS_COUNT_SQL)).rows[0].n as number;
      let rowsPerPartition = 0;
      let restored = before;
      let created = false;
      try {
        await client.query(buildCreateProbePartition(split.schema, split.table, child, PROBE_LO, PROBE_HI));
        created = true;
        const after = (await client.query(PG_CLASS_COUNT_SQL)).rows[0].n as number;
        rowsPerPartition = after - before;
      } catch (e: any) {
        warnings.push(`probe partition CREATE failed (measurement skipped): ${e && e.message ? e.message : e}`);
        data.createError = String(e && e.message ? e.message : e);
      } finally {
        if (created) {
          try {
            await client.query(buildDropProbePartition(split.schema, child));
          } catch (e: any) {
            warnings.push(`probe partition DROP failed — MANUAL CLEANUP NEEDED for ${split.schema}.${child}: ${e && e.message ? e.message : e}`);
          }
          restored = (await client.query(PG_CLASS_COUNT_SQL)).rows[0].n as number;
        }
      }
      data.pgClass = { before, restored, rowsPerPartition, restoredToZero: restored === before };
      if (created && restored !== before) {
        warnings.push(`partition-creep: pg_class did not return to ${before} (now ${restored}) — investigate leftover objects`);
      }

      // -- project monthly creep (advisory) -----------------------------------
      const projection = computeCreepProjection({
        rowsPerPartition,
        partitionedParents: parents.length,
        partitionIntervalSeconds: eventsParent.intervalSeconds as number,
        instanceHeapKBPerRow: ctx.baseline.instanceHeapKBPerRow
      });
      data.projection = projection;
      data.intervalSecondsUsed = eventsParent.intervalSeconds;

      const ceiling = ctx.baseline.deepThresholds.partitionCreepMaxRowsPerTenantMonth;
      const measured = rowsPerPartition > 0;
      checks.push({
        name: 'partition-creep',
        advisory: true,
        pass: measured ? projection.rowsPerTenantPerMonth <= ceiling : true,
        value: projection.rowsPerTenantPerMonth,
        threshold: ceiling,
        note: measured
          ? `${rowsPerPartition} pg_class rows/partition × ${parents.length} parents → ` +
            `~${projection.rowsPerTenantPerMonth} rows/tenant/month ` +
            `(~${projection.heapCreepMBPerMonthPerTenant}MB/tenant/month @ ${ctx.baseline.instanceHeapKBPerRow}KB/row)`
          : 'measurement skipped (see createError); projection uses rowsPerPartition=0'
      });
    });
  } catch (e: any) {
    warnings.push(`partition-creep error: ${e && e.message ? e.message : e}`);
    data.error = String(e && e.message ? e.message : e);
  }

  if (checks.length === 0 && data.skipped) return skippedResult(name, data.skipped);
  return { name, ran: true, checks, data, warnings };
}

// ===========================================================================
// Orchestrator
// ===========================================================================

const RUNNERS: Record<DeepScenarioName, (ctx: ScenarioContext) => Promise<ScenarioResult>> = {
  'multi-api-residency': runMultiApiResidency,
  'settings-variant-split': runSettingsVariantSplit,
  'realtime-dedicated-cost': runRealtimeDedicatedCost,
  'partition-creep': runPartitionCreep
};

// Run each enabled deep scenario in isolation. A thrown scenario is contained
// (recorded as an errored result) so one failure never aborts the others — and
// every scenario has already restored the rig in its own finally.
export async function runDeepScenarios(ctx: ScenarioContext): Promise<ScenarioResult[]> {
  const results: ScenarioResult[] = [];
  for (const scenarioName of DEEP_SCENARIOS) {
    if (!scenarioEnabled(scenarioName, ctx.only, ctx.skip)) {
      results.push(skippedResult(scenarioName, 'disabled via --only/--skip'));
      continue;
    }
    try {
      results.push(await RUNNERS[scenarioName](ctx));
    } catch (e: any) {
      results.push({
        name: scenarioName,
        ran: false,
        checks: [],
        error: `unhandled: ${e && e.message ? e.message : e}`
      });
    }
  }
  return results;
}
