/**
 * load/harness — workload driver for the scale-validation soak/ramp.
 *
 * Generates a token-bucket-paced request stream (open-loop) at a target RPS
 * across the tenant fleet, with a read/write/meta class mix, tenant-selection
 * shapes (zipf/uniform/burst), per-tenant auth, a cross-tenant bleed sentinel,
 * latency histograms, rolling per-interval stdout summaries, and a final JSON
 * report.
 *
 * Faithful port of `scripts/scale-validate/harness.mjs`: every flag, default,
 * output field, protocol line, and exit code is preserved. Deviations (all
 * mandated by DESIGN.md) are: creds resolve via `resolveCreds` with NO literal
 * password default; the server `--port` runs through the hub guardrail; and the
 * script becomes a `run(argv): Promise<number>` subcommand that returns exit
 * codes (0 ok / 1 fatal / 2 bleed-sentinel violation) instead of mutating
 * `process.exitCode` and calling `process.exit`.
 *
 * NO server/package code is imported — this only speaks GraphQL over HTTP.
 */
import fs from 'node:fs';

import { Argv, asBool, asFloat, asInt } from '../core/args';
import { assertPortAllowed, resolveCreds } from '../core/config';
import { CANARY_PREFIX, canaryName, loadFleet, Tenant } from '../core/fleetfile';
import {
  buildCreateRecord, buildTypeIndex, DiscoveredOps, discoverOps, gqlErrors, gqlFetch, GqlResponse,
  INTROSPECTION_QUERY, isRotating, isUnauthenticated, unwrapType
} from '../core/gql';
import { Histogram } from '../core/histogram';
import { makeMixSampler, makeRng, makeZipfSampler } from '../core/rng';

// Tiny helpers that lived inline in `_lib.mjs` and are not part of the core
// signature surface — kept local to the load domain.
const nowIso = (): string => new Date().toISOString();
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const round2 = (n: number): number => Math.round(n * 100) / 100;

const HELP = `perf-harness load harness — workload driver (soaks + ramps) against the running cnc server

Required:
  --fleet <file>              fleet manifest from \`fleet discover\`
Common:
  --port <n>                  server port (default 3333)
  --duration-sec <n>          run length (default 60)
  --rps <n>                   target requests/sec (default 20)
  --mix read:.7,write:.25,meta:.05   class mix (default that)
  --shape zipf|uniform|burst  tenant selection (default zipf)
  --auth 0|1                  authenticate reads/writes (default 1)
  --sentinel-interval-sec <n> bleed sentinel period (default 60)
  --out <file>                final JSON report (default results.json)
Tuning:
  --report-sec <n>            rolling summary interval (default 60)
  --burst-window-sec <n>      burst shape focus window (default 30)
  --relogin-sec <n>           token refresh period (default 3600)
  --timeout-ms <n>            per-request timeout (default 30000)
  --max-inflight <n>          concurrency cap (default max(64, rps*2))
  --rotate-backoff-ms <n>     503 retry backoff (default 250)
  --email <addr>              seeder email (default seeder@gmail.com)
  --password <pw>             seeder password (or PERF_PASSWORD env; required when --auth 1)
  --seed <n>                  RNG seed for reproducible selection
  --allow-hub                 permit a hub port for --port (danger)
  --quiet                     suppress per-minute lines (still written to --out)
  --help

Leaked LOAD- rows (only on delete failure) are reported as write.leaked; clean
with: DELETE FROM "<schema>".categories WHERE name LIKE 'LOAD-%';
`;

// ---------------------------------------------------------------------------
// Auth token-field scoring (pure — exported for unit tests)
// ---------------------------------------------------------------------------
export function scoreTokenField(name: string): number {
  if (/^accesstoken$/i.test(name)) return 4;
  if (/accesstoken/i.test(name)) return 3;
  if (/token/i.test(name)) return 2;
  if (/jwt/i.test(name)) return 1;
  return 0;
}

export interface TokenSelection {
  selection: string;
  path: string[];
  score: number;
}

// Given a built type index and a payload type name, find the best token field to
// select out of a signIn mutation payload. Prefers a direct scalar
// `accessToken` (score >= 3); otherwise descends one level into object fields
// (e.g. `result { accessToken }`).
export function findTokenSelection(index: Map<string, any>, payloadTypeName: string): TokenSelection | null {
  const pt = index.get(payloadTypeName);
  if (!pt) return null;
  let best: TokenSelection | null = null;
  const consider = (selection: string, path: string[], score: number): void => {
    if (score > 0 && (!best || score > best.score)) best = { selection, path, score };
  };
  for (const f of (pt.fields || [])) {
    const nt = index.get(unwrapType(f.type).name);
    if (nt && nt.kind === 'SCALAR') consider(f.name, [f.name], scoreTokenField(f.name));
  }
  if (best && best.score >= 3) return best;
  for (const f of (pt.fields || [])) {
    const nt = index.get(unwrapType(f.type).name);
    if (nt && nt.kind === 'OBJECT') {
      for (const sf of (nt.fields || [])) {
        const st = index.get(unwrapType(sf.type).name);
        if (st && st.kind === 'SCALAR') consider(`${f.name} { ${sf.name} }`, [f.name, sf.name], scoreTokenField(sf.name));
      }
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Startup capability fallback (pure — exported for unit tests)
// ---------------------------------------------------------------------------
// Used when a tenant's introspection fails: assume the canonical `categories`
// shape so the tenant still exercises its PostGraphile instance. `queryType`/
// `mutationType` are null because there is no schema to derive them from.
export const DEFAULT_OPS = (): DiscoveredOps => ({
  queryType: null,
  mutationType: null,
  read: 'categories',
  meta: true,
  create: {
    name: 'createCategory',
    inputTypeName: 'CreateCategoryInput',
    innerName: 'category',
    requiredScalars: [
      { name: 'name', scalar: 'String', kind: 'SCALAR' },
      { name: 'slug', scalar: 'String', kind: 'SCALAR' }
    ],
    payloadFieldName: 'category',
    keySelect: 'id'
  },
  del: { name: 'deleteCategory', inputTypeName: 'DeleteCategoryInput', key: 'id' }
});

const isValidationAbsent = (resp: GqlResponse): boolean =>
  gqlErrors(resp).some((e) =>
    /cannot query field|unknown field|unknown argument|unknown type|does not exist on type|not defined|no field/i.test((e && e.message) || '')
  );

const getByPath = (obj: any, path: string[]): any => {
  let cur = obj;
  for (const k of path) { if (cur == null) return null; cur = cur[k]; }
  return cur == null ? null : cur;
};

interface RuntimeTenant {
  tenant: Tenant;
  ops: DiscoveredOps;
  token: string | null;
  tokenAt: number;
  reloginInFlight: boolean;
  authError: string | null;
  introspectError: string | null;
  leakedKeys: any[];
}

interface AuthShape {
  field: string;
  query: string;
  path: string[];
  selection: string;
}

// ---------------------------------------------------------------------------
// Subcommand entry point
// ---------------------------------------------------------------------------
export async function runHarness(argv: Argv): Promise<number> {
  if (asBool(argv.help) || !argv.fleet) {
    process.stderr.write(HELP);
    return (!argv.fleet && !asBool(argv.help)) ? 1 : 0;
  }

  // -------------------------------------------------------------------------
  // Config
  // -------------------------------------------------------------------------
  const PORT = asInt(argv.port, 3333);
  assertPortAllowed(PORT, asBool(argv['allow-hub']), 'port');
  const DURATION_SEC = asInt(argv['duration-sec'], 60);
  const RPS = Math.max(asFloat(argv.rps, 20), 0.1);
  const MIX = typeof argv.mix === 'string' ? argv.mix : 'read:0.7,write:0.25,meta:0.05';
  const SHAPE = ['zipf', 'uniform', 'burst'].includes(argv.shape) ? argv.shape : 'zipf';
  const AUTH = asBool(argv.auth, true);
  const SENTINEL_SEC = asInt(argv['sentinel-interval-sec'], 60);
  const OUT = typeof argv.out === 'string' ? argv.out : 'results.json';
  const REPORT_SEC = asInt(argv['report-sec'], 60);
  const BURST_WINDOW_SEC = asInt(argv['burst-window-sec'], 30);
  const RELOGIN_SEC = asInt(argv['relogin-sec'], 3600);
  const TIMEOUT_MS = asInt(argv['timeout-ms'], 30000);
  const MAX_INFLIGHT = asInt(argv['max-inflight'], Math.max(64, Math.ceil(RPS * 2)));
  const ROTATE_BACKOFF_MS = asInt(argv['rotate-backoff-ms'], 250);
  const SEED = asInt(argv.seed, (Date.now() & 0x7fffffff));
  const QUIET = asBool(argv.quiet);

  // Credentials: NO literal password default (DESIGN creds rule). Resolve via
  // flag > PERF_PASSWORD and fail with guidance when auth is on but absent.
  const { email: EMAIL, password: PASSWORD } = resolveCreds(argv);
  if (AUTH && !PASSWORD) {
    process.stderr.write(
      '[harness] --auth 1 but no password provided. Pass --password <pw> or set PERF_PASSWORD ' +
        '(or run with --auth 0 to skip authentication).\n'
    );
    return 1;
  }

  const rng = makeRng(SEED);
  const { tenants } = loadFleet(argv.fleet);

  // -------------------------------------------------------------------------
  // Metrics
  // -------------------------------------------------------------------------
  const M: any = {
    startedAt: nowIso(),
    config: {
      port: PORT, durationSec: DURATION_SEC, rps: RPS, mix: MIX, shape: SHAPE, auth: AUTH,
      sentinelIntervalSec: SENTINEL_SEC, reportSec: REPORT_SEC, burstWindowSec: BURST_WINDOW_SEC,
      reloginSec: RELOGIN_SEC, timeoutMs: TIMEOUT_MS, maxInflight: MAX_INFLIGHT, seed: SEED,
      fleetCount: tenants.length
    },
    totals: { sent: 0, completed: 0, ok: 0, err: 0, requests: 0, dropped: 0, rotating: 0, rotatingRetried: 0, timeouts: 0, network: 0 },
    http: {},
    netErrors: {},
    gqlByCode: {},
    gqlByMsg: {},
    gqlMsgOverflow: 0,
    classes: {
      read: { sent: 0, ok: 0, err: 0, unavailable: 0, hist: new Histogram() },
      write: { sent: 0, ok: 0, err: 0, unavailable: 0, fallbackRead: 0, created: 0, deleted: 0, leaked: 0, createErr: 0, deleteErr: 0, hist: new Histogram() },
      meta: { sent: 0, ok: 0, err: 0, unavailable: 0, hist: new Histogram() }
    },
    overallHist: new Histogram(),
    perTenant: {},
    auth: { enabled: AUTH, shape: null, logins: 0, loginFailures: 0, relogins: 0, unauth: 0 },
    sentinel: { checks: 0, tenantsChecked: 0, ownCanarySeen: 0, inconclusive: 0, violations: [], ok: true },
    progress: []
  };
  for (const t of tenants) M.perTenant[t.dbname] = { sent: 0, ok: 0, err: 0 };

  let windowHist = new Histogram();
  const startMs = Date.now();
  let pacingStartMs = 0;
  let inFlight = 0;
  let stopping = false;
  let stopReason: string | null = null;
  let exitCode = 0;

  // -------------------------------------------------------------------------
  // Runtime tenant state
  // -------------------------------------------------------------------------
  const runtime: RuntimeTenant[] = tenants.map((tenant): RuntimeTenant => ({
    tenant,
    ops: { queryType: null, mutationType: null, read: null, meta: false, create: null, del: null },
    token: null,
    tokenAt: 0,
    reloginInFlight: false,
    authError: null,
    introspectError: null,
    leakedKeys: []
  }));

  let writeCounter = 0;
  const randId = (): string => `${(SEED & 0xffff).toString(36)}-${(writeCounter++).toString(36)}-${Math.floor(rng() * 1e9).toString(36)}`;
  const log = (...a: any[]): void => { if (!QUIET) process.stderr.write(`${a.join(' ')}\n`); };
  const emit = (obj: any): void => { process.stdout.write(`${JSON.stringify(obj)}\n`); };

  // -------------------------------------------------------------------------
  // HTTP request with retry-once on 503 SERVICE_ROTATING
  // -------------------------------------------------------------------------
  async function apiRequest(s: RuntimeTenant, opts: { query: string; variables?: any; token?: string }): Promise<GqlResponse> {
    let resp = await gqlFetch({ host: s.tenant.apiHost, port: PORT, query: opts.query, variables: opts.variables, token: opts.token, timeoutMs: TIMEOUT_MS });
    if (isRotating(resp)) {
      M.totals.rotating++;
      await sleep(ROTATE_BACKOFF_MS);
      resp = await gqlFetch({ host: s.tenant.apiHost, port: PORT, query: opts.query, variables: opts.variables, token: opts.token, timeoutMs: TIMEOUT_MS });
      M.totals.rotatingRetried++;
    }
    return resp;
  }

  function trackHttp(resp: GqlResponse, cls: string): void {
    M.totals.requests++;
    M.overallHist.record(resp.elapsedMs);
    windowHist.record(resp.elapsedMs);
    M.classes[cls].hist.record(resp.elapsedMs);
    const key = String(resp.status);
    M.http[key] = (M.http[key] || 0) + 1;
    if (resp.error === 'timeout') M.totals.timeouts++;
    else if (resp.error) { M.totals.network++; M.netErrors[resp.error] = (M.netErrors[resp.error] || 0) + 1; }
    for (const e of gqlErrors(resp)) {
      const code = (e.extensions && e.extensions.code) || 'GRAPHQL_ERROR';
      M.gqlByCode[code] = (M.gqlByCode[code] || 0) + 1;
      const msg = String((e && e.message) || '').slice(0, 200);
      // Cap distinct-message cardinality so a 24h soak with id-bearing messages
      // cannot grow this map without bound.
      if (M.gqlByMsg[msg] !== undefined || Object.keys(M.gqlByMsg).length < 1000) {
        M.gqlByMsg[msg] = (M.gqlByMsg[msg] || 0) + 1;
      } else {
        M.gqlMsgOverflow++;
      }
    }
  }

  function bumpTenant(s: RuntimeTenant, kind: string): void { const p = M.perTenant[s.tenant.dbname]; if (p) p[kind]++; }

  function maybeRelogin(s: RuntimeTenant, resp: GqlResponse): void {
    if (!AUTH) return;
    if (isUnauthenticated(resp)) { M.auth.unauth++; scheduleRelogin(s); }
  }

  // -------------------------------------------------------------------------
  // Op executors — each returns { ok } or { skip:true }; runOp folds into totals.
  // -------------------------------------------------------------------------
  async function execRead(s: RuntimeTenant): Promise<any> {
    const r = M.classes.read;
    r.sent++;
    const resp = await apiRequest(s, { query: `{ ${s.ops.read} { totalCount nodes { name } } }`, token: s.token });
    trackHttp(resp, 'read');
    maybeRelogin(s, resp);
    const ok = resp.ok && gqlErrors(resp).length === 0 && !resp.error;
    if (ok) r.ok++; else r.err++;
    bumpTenant(s, ok ? 'ok' : 'err');
    return { ok };
  }

  async function execMeta(s: RuntimeTenant): Promise<any> {
    const m = M.classes.meta;
    m.sent++;
    const resp = await apiRequest(s, { query: '{ _meta { tables { name } } }' });
    trackHttp(resp, 'meta');
    const ok = resp.ok && gqlErrors(resp).length === 0 && !resp.error;
    if (ok) m.ok++; else m.err++;
    bumpTenant(s, ok ? 'ok' : 'err');
    return { ok };
  }

  function createQuery(c: any): string {
    return `mutation Create($input: ${c.inputTypeName}!) { ${c.name}(input: $input) { ${c.payloadFieldName} { ${c.keySelect} } } }`;
  }
  function deleteQuery(d: any): string {
    return `mutation Del($input: ${d.inputTypeName}!) { ${d.name}(input: $input) { clientMutationId } }`;
  }

  async function execWrite(s: RuntimeTenant): Promise<any> {
    const w = M.classes.write;
    w.sent++;
    const rand = randId();
    const record = buildCreateRecord(s.ops.create, `LOAD-${rand}`, rand);
    const cResp = await apiRequest(s, {
      query: createQuery(s.ops.create),
      variables: { input: { [s.ops.create.innerName]: record } },
      token: s.token
    });
    trackHttp(cResp, 'write');
    maybeRelogin(s, cResp);
    const cOk = cResp.ok && gqlErrors(cResp).length === 0 && !cResp.error;
    if (!cOk) { w.createErr++; w.err++; bumpTenant(s, 'err'); return { ok: false }; }
    w.created++;
    const payload = cResp.json && cResp.json.data && cResp.json.data[s.ops.create.name];
    const rec = payload && payload[s.ops.create.payloadFieldName];
    const keyVal = rec && rec[s.ops.create.keySelect];
    if (keyVal == null) { w.err++; w.leaked++; bumpTenant(s, 'err'); return { ok: false }; }
    const dResp = await apiRequest(s, {
      query: deleteQuery(s.ops.del),
      variables: { input: { [s.ops.del.key]: keyVal } },
      token: s.token
    });
    trackHttp(dResp, 'write');
    maybeRelogin(s, dResp);
    const dOk = dResp.ok && gqlErrors(dResp).length === 0 && !dResp.error;
    if (dOk) { w.deleted++; w.ok++; bumpTenant(s, 'ok'); return { ok: true }; }
    w.deleteErr++; w.leaked++; w.err++;
    if (s.leakedKeys.length < 200) s.leakedKeys.push(keyVal);
    bumpTenant(s, 'err');
    return { ok: false };
  }

  // Substitution keeps a tenant's PostGraphile instance under load even when a
  // class is unavailable for it (e.g. the blank tenant with no categories table).
  function canWrite(s: RuntimeTenant): boolean { return !!(s.ops.create && s.ops.del && s.ops.create.payloadFieldName); }

  async function opRead(s: RuntimeTenant): Promise<any> {
    if (s.ops.read) return execRead(s);
    M.classes.read.unavailable++;
    if (s.ops.meta) return execMeta(s);
    return { skip: true };
  }
  async function opMeta(s: RuntimeTenant): Promise<any> {
    if (s.ops.meta) return execMeta(s);
    M.classes.meta.unavailable++;
    if (s.ops.read) return execRead(s);
    return { skip: true };
  }
  async function opWrite(s: RuntimeTenant): Promise<any> {
    if (canWrite(s)) return execWrite(s);
    M.classes.write.unavailable++;
    if (s.ops.read) { M.classes.write.fallbackRead++; return execRead(s); }
    if (s.ops.meta) { M.classes.write.fallbackRead++; return execMeta(s); }
    return { skip: true };
  }

  async function runOp(cls: string, s: RuntimeTenant): Promise<void> {
    M.perTenant[s.tenant.dbname].sent++;
    let res;
    if (cls === 'read') res = await opRead(s);
    else if (cls === 'write') res = await opWrite(s);
    else res = await opMeta(s);
    if (res && res.skip) return;
    if (res && res.ok) M.totals.ok++; else M.totals.err++;
  }

  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------
  async function resolveAuthShape(): Promise<AuthShape> {
    for (const s of runtime) {
      if (!s.tenant.authHost) continue;
      const resp = await gqlFetch({ host: s.tenant.authHost, port: PORT, query: INTROSPECTION_QUERY, timeoutMs: TIMEOUT_MS });
      const data = resp.json && resp.json.data;
      if (!data || !data.__schema) continue;
      const { index, mutationType } = buildTypeIndex(data);
      if (!mutationType) continue;
      const mt = index.get(mutationType);
      const field = (mt.fields || []).find((f: any) => /^signin$/i.test(f.name)) || (mt.fields || []).find((f: any) => /signin/i.test(f.name));
      if (!field) continue;
      const tokenSel = findTokenSelection(index, unwrapType(field.type).name);
      if (!tokenSel) continue;
      const query = `mutation SignIn($email: String!, $password: String!) { ${field.name}(input: { email: $email, password: $password }) { ${tokenSel.selection} } }`;
      return { field: field.name, query, path: [field.name, ...tokenSel.path], selection: tokenSel.selection };
    }
    // Fallback: documented shape.
    return {
      field: 'signIn',
      query: 'mutation SignIn($email: String!, $password: String!) { signIn(input: { email: $email, password: $password }) { result { accessToken } } }',
      path: ['signIn', 'result', 'accessToken'],
      selection: 'result { accessToken }'
    };
  }

  let authShape: AuthShape | null = null;
  async function loginTenant(s: RuntimeTenant, initial: boolean): Promise<boolean> {
    if (!authShape || !s.tenant.authHost) return false;
    const resp = await gqlFetch({ host: s.tenant.authHost, port: PORT, query: authShape.query, variables: { email: EMAIL, password: PASSWORD }, timeoutMs: TIMEOUT_MS });
    const errs = gqlErrors(resp);
    if (!resp.ok || errs.length || resp.error) {
      M.auth.loginFailures++;
      s.authError = (errs[0] && errs[0].message) || resp.error || `http ${resp.status}`;
      return false;
    }
    const tok = getByPath(resp.json && resp.json.data, authShape.path);
    if (!tok || typeof tok !== 'string') { M.auth.loginFailures++; s.authError = 'no token in signIn response'; return false; }
    s.token = tok;
    s.tokenAt = Date.now();
    s.authError = null;
    if (initial) M.auth.logins++; else M.auth.relogins++;
    return true;
  }

  function scheduleRelogin(s: RuntimeTenant): void {
    if (s.reloginInFlight) return;
    s.reloginInFlight = true;
    loginTenant(s, false).catch(() => {}).finally(() => { s.reloginInFlight = false; });
  }

  // -------------------------------------------------------------------------
  // Startup capability discovery (introspection + probe verification)
  // -------------------------------------------------------------------------
  async function resolveTenantOps(s: RuntimeTenant): Promise<void> {
    const resp = await apiRequest(s, { query: INTROSPECTION_QUERY });
    const data = resp.json && resp.json.data;
    if (data && data.__schema) {
      s.ops = discoverOps(data);
    } else {
      s.introspectError = (gqlErrors(resp)[0] && gqlErrors(resp)[0].message) || resp.error || `http ${resp.status}`;
      s.ops = DEFAULT_OPS();
    }
    // Probe read presence (schema-level) with token so RLS doesn't mask absence.
    if (s.ops.read) {
      const pr = await apiRequest(s, { query: `{ ${s.ops.read} { totalCount } }`, token: s.token });
      if (isValidationAbsent(pr)) s.ops.read = null;
    }
    if (s.ops.meta) {
      const pm = await apiRequest(s, { query: '{ _meta { tables { name } } }' });
      if (isValidationAbsent(pm)) s.ops.meta = false;
    }
    // Probe write: attempt a real create+delete once; downgrade only on schema absence.
    if (canWrite(s)) {
      const rand = `probe-${randId()}`;
      const record = buildCreateRecord(s.ops.create, `LOAD-${rand}`, rand);
      const cr = await apiRequest(s, { query: createQuery(s.ops.create), variables: { input: { [s.ops.create.innerName]: record } }, token: s.token });
      if (isValidationAbsent(cr)) {
        s.ops.create = null;
        s.ops.del = null;
      } else {
        const payload = cr.json && cr.json.data && cr.json.data[s.ops.create.name];
        const rec = payload && payload[s.ops.create.payloadFieldName];
        const keyVal = rec && rec[s.ops.create.keySelect];
        if (keyVal != null) {
          await apiRequest(s, { query: deleteQuery(s.ops.del), variables: { input: { [s.ops.del.key]: keyVal } }, token: s.token });
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Bleed sentinel
  // -------------------------------------------------------------------------
  function pickTwo<T>(arr: T[]): T[] {
    if (arr.length <= 1) return arr.slice();
    const i = Math.floor(rng() * arr.length);
    let j = Math.floor(rng() * arr.length);
    if (j === i) j = (j + 1) % arr.length;
    return [arr[i], arr[j]];
  }

  async function runSentinel(): Promise<void> {
    if (stopping) return;
    M.sentinel.checks++;
    const eligible = runtime.filter((s) => s.ops.read && (!AUTH || s.token));
    if (eligible.length === 0) { M.sentinel.inconclusive++; return; }
    const picks = pickTwo(eligible);
    for (const s of picks) {
      M.sentinel.tenantsChecked++;
      const resp = await apiRequest(s, { query: `{ ${s.ops.read} { nodes { name } } }`, token: s.token });
      if (!resp.ok || gqlErrors(resp).length || resp.error) { M.sentinel.inconclusive++; continue; }
      const nodes = (((resp.json || {}).data || {})[s.ops.read] || {}).nodes || [];
      const own = canaryName(s.tenant);
      let sawOwn = false;
      for (const node of nodes) {
        const nm = node && node.name;
        if (typeof nm !== 'string') continue;
        if (nm === own) { sawOwn = true; continue; }
        if (nm.startsWith(CANARY_PREFIX)) {
          M.sentinel.ok = false;
          M.sentinel.violations.push({
            at: nowIso(),
            readTenant: s.tenant.dbname,
            readHost: s.tenant.apiHost,
            foreignCanary: nm,
            sampleNames: nodes.map((n: any) => n && n.name).filter(Boolean).slice(0, 50)
          });
        }
      }
      if (sawOwn) M.sentinel.ownCanarySeen++;
    }
    if (!M.sentinel.ok) {
      exitCode = 2;
      finish('sentinel-violation');
    }
  }

  // -------------------------------------------------------------------------
  // Pacer (token bucket) + worker pool
  // -------------------------------------------------------------------------
  const zipfSampler = SHAPE === 'zipf' ? makeZipfSampler(runtime.length, rng) : null;
  let burstIndex = Math.floor(rng() * runtime.length);
  let burstUntil = Date.now() + BURST_WINDOW_SEC * 1000;

  function pickTenant(): RuntimeTenant {
    if (SHAPE === 'uniform') return runtime[Math.floor(rng() * runtime.length)];
    if (SHAPE === 'burst') {
      if (Date.now() >= burstUntil) {
        burstIndex = Math.floor(rng() * runtime.length);
        burstUntil = Date.now() + BURST_WINDOW_SEC * 1000;
      }
      return runtime[burstIndex];
    }
    return runtime[zipfSampler()];
  }

  const mixSampler = makeMixSampler(MIX, rng);

  let tokens = 0;
  const capacity = Math.max(RPS, 1);
  const tickMs = 20;
  const refillPerTick = RPS * (tickMs / 1000);

  function launchOne(): void {
    inFlight++;
    M.totals.sent++;
    const s = pickTenant();
    const cls = mixSampler();
    runOp(cls, s).catch(() => {}).finally(() => {
      inFlight--;
      M.totals.completed++;
      pump();
    });
  }

  function pump(): void {
    while (!stopping && tokens >= 1 && inFlight < MAX_INFLIGHT) {
      tokens -= 1;
      launchOne();
    }
  }

  // -------------------------------------------------------------------------
  // Rolling per-interval reporter
  // -------------------------------------------------------------------------
  let snap = { t: startMs, completed: 0, ok: 0, err: 0 };
  function report(kind: string): void {
    const nowT = Date.now();
    const elapsedSec = (nowT - startMs) / 1000;
    const winSec = Math.max((nowT - snap.t) / 1000, 0.001);
    const dc = M.totals.completed - snap.completed;
    const der = M.totals.err - snap.err;
    const line = {
      t: kind,
      at: nowIso(),
      elapsedSec: round2(elapsedSec),
      windowSec: round2(winSec),
      sent: M.totals.sent,
      completed: M.totals.completed,
      ok: M.totals.ok,
      err: M.totals.err,
      windowRps: round2(dc / winSec),
      cumRps: round2(M.totals.completed / Math.max(elapsedSec, 0.001)),
      windowErrRate: dc ? round2(der / dc) : 0,
      inFlight,
      dropped: Math.round(M.totals.dropped),
      rotating: M.totals.rotating,
      latencyWindow: windowHist.summary(),
      sentinelChecks: M.sentinel.checks,
      sentinelOwnSeen: M.sentinel.ownCanarySeen,
      sentinelOk: M.sentinel.ok
    };
    emit(line);
    M.progress.push(line);
    snap = { t: nowT, completed: M.totals.completed, ok: M.totals.ok, err: M.totals.err };
    windowHist = new Histogram();
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------
  let timers: any[] = [];
  let durationTimer: any = null;
  let donePromiseResolve: (value?: void | PromiseLike<void>) => void;
  const donePromise = new Promise<void>((res) => { donePromiseResolve = res; });

  function finish(reason: string): void {
    if (stopping) return;
    stopping = true;
    stopReason = reason;
    for (const t of timers) clearInterval(t);
    timers = [];
    if (durationTimer) { clearTimeout(durationTimer); durationTimer = null; }
    donePromiseResolve();
  }

  async function drain(): Promise<void> {
    const deadline = Date.now() + 15000;
    while (inFlight > 0 && Date.now() < deadline) await sleep(50);
  }

  function finalize(): any {
    const endMs = Date.now();
    const wallSec = (endMs - startMs) / 1000;
    const loadSec = (endMs - (pacingStartMs || startMs)) / 1000;
    const topN = (obj: any, n = 20): any[] => Object.entries(obj).sort((a: any, b: any) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ key: k, count: v }));
    const classSummary = (c: any): any => {
      const base = { sent: c.sent, ok: c.ok, err: c.err, unavailable: c.unavailable, latency: c.hist.summary() };
      if (c === M.classes.write) {
        return { ...base, created: c.created, deleted: c.deleted, leaked: c.leaked, createErr: c.createErr, deleteErr: c.deleteErr, fallbackRead: c.fallbackRead };
      }
      return base;
    };
    const out = {
      startedAt: M.startedAt,
      endedAt: nowIso(),
      wallSec: round2(wallSec),
      loadSec: round2(loadSec),
      stopReason,
      config: M.config,
      fleet: { count: tenants.length, file: argv.fleet },
      capabilities: runtime.map((s) => ({
        dbname: s.tenant.dbname,
        apiHost: s.tenant.apiHost,
        read: !!s.ops.read,
        write: canWrite(s),
        meta: !!s.ops.meta,
        authed: !!s.token,
        authError: s.authError,
        introspectError: s.introspectError,
        leakedKeys: s.leakedKeys.length
      })),
      totals: {
        ...M.totals,
        dropped: Math.round(M.totals.dropped),
        achievedRps: round2(M.totals.completed / Math.max(loadSec, 0.001)),
        errRate: M.totals.completed ? round2(M.totals.err / M.totals.completed) : 0
      },
      latencyOverall: M.overallHist.summary(),
      byClass: { read: classSummary(M.classes.read), write: classSummary(M.classes.write), meta: classSummary(M.classes.meta) },
      http: M.http,
      netErrors: M.netErrors,
      gqlErrorsByCode: M.gqlByCode,
      gqlErrorsTop: topN(M.gqlByMsg),
      gqlErrorsMsgOverflow: M.gqlMsgOverflow,
      perTenant: M.perTenant,
      auth: M.auth,
      sentinel: M.sentinel,
      progress: M.progress,
      verdict: {
        pass: M.sentinel.ok,
        bleedViolations: M.sentinel.violations.length,
        note: M.sentinel.ok ? 'no cross-tenant bleed detected' : 'BLEED SENTINEL VIOLATION'
      }
    };
    fs.writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
    return out;
  }

  // -------------------------------------------------------------------------
  // Main
  // -------------------------------------------------------------------------
  const onSig = (): void => finish('signal');
  const cleanup = (): void => {
    for (const t of timers) clearInterval(t);
    timers = [];
    if (durationTimer) { clearTimeout(durationTimer); durationTimer = null; }
    process.removeListener('SIGINT', onSig);
    process.removeListener('SIGTERM', onSig);
  };

  try {
    log(`[harness] seed=${SEED} shape=${SHAPE} rps=${RPS} dur=${DURATION_SEC}s mix=${MIX} auth=${AUTH} tenants=${tenants.length} -> ${OUT}`);

    if (AUTH) {
      authShape = await resolveAuthShape();
      M.auth.shape = authShape.selection;
      log(`[harness] auth shape: ${authShape.field} { ${authShape.selection} }`);
      await Promise.all(runtime.map((s) => loginTenant(s, true)));
      log(`[harness] logins ok=${M.auth.logins} failed=${M.auth.loginFailures}`);
    }

    await Promise.all(runtime.map((s) => resolveTenantOps(s).catch((e) => { s.introspectError = String((e && e.message) || e); })));
    const caps = runtime.map((s) => `${s.tenant.dbname.replace('marketplace_db_', '')}[r=${s.ops.read ? 1 : 0}w=${canWrite(s) ? 1 : 0}m=${s.ops.meta ? 1 : 0}${s.token ? 'a' : ''}]`);
    log(`[harness] capabilities: ${caps.join(' ')}`);

    // Timers
    pacingStartMs = Date.now();
    snap = { t: pacingStartMs, completed: 0, ok: 0, err: 0 };
    timers.push(setInterval(() => {
      if (stopping) return;
      tokens += refillPerTick;
      if (tokens > capacity) { M.totals.dropped += (tokens - capacity); tokens = capacity; }
      pump();
    }, tickMs));
    timers.push(setInterval(() => report('progress'), REPORT_SEC * 1000));
    timers.push(setInterval(() => { runSentinel().catch(() => {}); }, SENTINEL_SEC * 1000));
    timers.push(setInterval(() => {
      if (!AUTH) return;
      const cutoff = Date.now() - RELOGIN_SEC * 1000;
      for (const s of runtime) if (s.token && s.tokenAt < cutoff) scheduleRelogin(s);
    }, 30000));

    durationTimer = setTimeout(() => finish('duration'), DURATION_SEC * 1000);
    process.on('SIGINT', onSig);
    process.on('SIGTERM', onSig);

    await donePromise;
    await drain();
    const out = finalize();

    const c = out.byClass;
    log(`[harness] DONE reason=${stopReason} wall=${out.wallSec}s load=${out.loadSec}s completed=${out.totals.completed} ok=${out.totals.ok} err=${out.totals.err} achievedRps=${out.totals.achievedRps} p50=${out.latencyOverall.p50} p95=${out.latencyOverall.p95} p99=${out.latencyOverall.p99}`);
    log(`[harness] read ${c.read.ok}/${c.read.err} write ${c.write.ok}/${c.write.err}(created=${c.write.created} leaked=${c.write.leaked}) meta ${c.meta.ok}/${c.meta.err} | sentinel checks=${M.sentinel.checks} ownSeen=${M.sentinel.ownCanarySeen} violations=${M.sentinel.violations.length}`);
    log(`[harness] wrote ${OUT}`);
    if (!M.sentinel.ok) log('[harness] *** BLEED SENTINEL VIOLATION — exit 2 ***');

    cleanup();
    return exitCode;
  } catch (err: any) {
    process.stderr.write(`[harness] FATAL: ${err && err.stack ? err.stack : err}\n`);
    try { finalize(); } catch { /* best effort */ }
    cleanup();
    return exitCode || 1;
  }
}
