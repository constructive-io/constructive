/**
 * Shared helpers for the scale-validate harness v2 (Task B).
 *
 * Pure tooling — no server/package code is imported at module load beyond `pg`
 * (resolved via the @dataplan/pg chain, exactly like scripts/scale-spike).
 * Every script imports from here; each script stays independently runnable via
 *   node scripts/scale-validate/<script>.mjs
 */
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import fs from 'node:fs';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const WORKTREE = path.resolve(__dirname, '..', '..');

// ---------------------------------------------------------------------------
// pg resolution
// ---------------------------------------------------------------------------
// `pg` is not a direct dep of the worktree root, but it is present in the pnpm
// store reachable through the @dataplan/pg dependency chain (same trick the
// scale-spike scripts use).
export function resolvePg() {
  const req = createRequire(path.join(WORKTREE, 'graphql', 'query', 'package.json'));
  const reqAdaptor = createRequire(req.resolve('postgraphile/adaptors/pg'));
  const reqDataplan = createRequire(reqAdaptor.resolve('@dataplan/pg'));
  return reqDataplan('pg');
}

// ---------------------------------------------------------------------------
// Postgres connection config
// ---------------------------------------------------------------------------
// Defaults target the isolated dev database on :5433. CLI flags win over env,
// env wins over defaults. We NEVER default to 5432.
export function pgConfigFromArgs(args = {}) {
  const num = (v, d) => {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : d;
  };
  return {
    host: args['pg-host'] || process.env.PGHOST || 'localhost',
    port: num(args['pg-port'] ?? process.env.PGPORT, 5433),
    user: args['pg-user'] || process.env.PGUSER || 'postgres',
    password: args['pg-password'] ?? process.env.PGPASSWORD ?? 'password',
    database: args['pg-database'] || process.env.PGDATABASE || 'constructive'
  };
}

// ---------------------------------------------------------------------------
// Minimal arg parsing: --flag value | --flag=value | --flag (boolean true)
// ---------------------------------------------------------------------------
export function parseArgs(argv) {
  const args = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq !== -1) {
        args[a.slice(2, eq)] = a.slice(eq + 1);
      } else {
        const key = a.slice(2);
        const next = argv[i + 1];
        if (next === undefined || next.startsWith('--')) {
          args[key] = true;
        } else {
          args[key] = next;
          i++;
        }
      }
    } else {
      positional.push(a);
    }
  }
  return { args, positional };
}

export function asBool(v, dflt = false) {
  if (v === undefined || v === null) return dflt;
  if (typeof v === 'boolean') return v;
  const s = String(v).toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

export function asInt(v, dflt) {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : dflt;
}

export function asFloat(v, dflt) {
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : dflt;
}

export const nowIso = () => new Date().toISOString();
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const round2 = (n) => Math.round(n * 100) / 100;

// Seedable RNG (mulberry32) for reproducible shape/tenant selection.
export function makeRng(seed) {
  let a = (seed >>> 0) || 0x9e3779b9;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Fleet manifest
// ---------------------------------------------------------------------------
export function loadFleet(fleetPath) {
  const raw = fs.readFileSync(fleetPath, 'utf8');
  const parsed = JSON.parse(raw);
  const tenants = Array.isArray(parsed) ? parsed : parsed.tenants;
  if (!Array.isArray(tenants) || tenants.length === 0) {
    throw new Error(`fleet file ${fleetPath} has no tenants`);
  }
  return { manifest: parsed, tenants };
}

// The token used inside CANARY-<token> rows. MUST match between canary-seed.mjs
// and the harness sentinel so bleed can be attributed to a foreign tenant.
export const canaryToken = (tenant) => tenant.dbname;
export const canaryName = (tenant) => `CANARY-${canaryToken(tenant)}`;
export const CANARY_PREFIX = 'CANARY-';

// ---------------------------------------------------------------------------
// GraphQL over HTTP
// ---------------------------------------------------------------------------
// We put the tenant host in the URL (e.g. api-xxx.localhost) because undici
// ignores an explicit `host` header. `*.localhost` resolves to loopback, so the
// connection lands on 127.0.0.1 while the server sees the correct Host header
// for subdomain routing.
export async function gqlFetch({ host, port, query, variables, token, timeoutMs = 30000, gqlPath = '/graphql' }) {
  const url = `http://${host}:${port}${gqlPath}`;
  const headers = { 'content-type': 'application/json', accept: 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  const start = performance.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(variables ? { query, variables } : { query }),
      signal: ac.signal
    });
    const elapsedMs = performance.now() - start;
    const ct = res.headers.get('content-type') || '';
    let json = null;
    let text = null;
    if (ct.includes('json')) {
      json = await res.json().catch(() => null);
    } else {
      text = await res.text().catch(() => null);
      // Some error paths return JSON without the header — try to parse.
      if (text) {
        try { json = JSON.parse(text); } catch { /* not json */ }
      }
    }
    return { status: res.status, ok: res.ok, json, text, elapsedMs, error: null };
  } catch (err) {
    const elapsedMs = performance.now() - start;
    const error = err && err.name === 'AbortError' ? 'timeout' : (err && (err.code || err.message)) || 'network';
    return { status: 0, ok: false, json: null, text: null, elapsedMs, error };
  } finally {
    clearTimeout(timer);
  }
}

export function isRotating(resp) {
  if (resp.status === 503) {
    const code = resp.json && resp.json.error && resp.json.error.code;
    return code === 'SERVICE_ROTATING' || true; // any 503 counts as rotating
  }
  return false;
}

export function gqlErrors(resp) {
  return (resp.json && Array.isArray(resp.json.errors)) ? resp.json.errors : [];
}

export function isUnauthenticated(resp) {
  const errs = gqlErrors(resp);
  for (const e of errs) {
    const code = e && e.extensions && e.extensions.code;
    if (code === 'UNAUTHENTICATED' || code === 'FORBIDDEN') return true;
    const msg = (e && e.message) || '';
    if (/unauthenticated|not authori[sz]ed|permission denied|jwt|login required|invalid token|expired/i.test(msg)) return true;
  }
  if (resp.status === 401 || resp.status === 403) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Introspection helpers (operate on the JSON introspection result)
// ---------------------------------------------------------------------------
export const INTROSPECTION_QUERY = `query Introspect {
  __schema {
    queryType { name }
    mutationType { name }
    types {
      kind
      name
      fields(includeDeprecated: true) { name args { name type { ...T } } type { ...T } }
      inputFields { name type { ...T } }
    }
  }
}
fragment T on __Type {
  kind name
  ofType { kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name } } } } }
}`;

export function unwrapType(ref) {
  let t = ref;
  while (t && t.ofType) t = t.ofType;
  return t || null;
}

export function isNonNull(ref) {
  return !!(ref && ref.kind === 'NON_NULL');
}

export function buildTypeIndex(introspect) {
  const index = new Map();
  const schema = introspect && introspect.__schema;
  if (!schema) return { index, queryType: null, mutationType: null };
  for (const t of schema.types) index.set(t.name, t);
  return {
    index,
    queryType: schema.queryType && schema.queryType.name,
    mutationType: schema.mutationType && schema.mutationType.name
  };
}

function findConnectionField(index, queryTypeName, re) {
  const qt = index.get(queryTypeName);
  if (!qt) return null;
  const candidates = (qt.fields || []).filter((f) => re.test(f.name));
  for (const f of candidates) {
    const named = unwrapType(f.type);
    const nt = named && index.get(named.name);
    if (nt && (nt.fields || []).some((sf) => sf.name === 'nodes')) return f.name;
  }
  return candidates[0] ? candidates[0].name : null;
}

const SCALAR_SAMPLE = (scalar, rand) => {
  switch (scalar) {
    case 'Int':
    case 'BigInt':
      return 0;
    case 'Float':
    case 'BigFloat':
      return 0;
    case 'Boolean':
      return true;
    default:
      return `load-${rand}`;
  }
};

// Discover create/delete/read/meta operations from an introspection result.
export function discoverOps(introspect) {
  const { index, queryType, mutationType } = buildTypeIndex(introspect);
  const out = { queryType, mutationType, read: null, meta: false, create: null, del: null };
  if (!queryType) return out;

  // read (categories connection)
  out.read = findConnectionField(index, queryType, /categor/i);

  // meta (_meta { tables { name } })
  const qt = index.get(queryType);
  out.meta = !!(qt && (qt.fields || []).some((f) => f.name === '_meta'));

  if (!mutationType) return out;
  const mt = index.get(mutationType);

  // delete mutation (prefer PK id-based over nodeId-based)
  const delField = (mt.fields || []).find((f) => /^delete.*categor/i.test(f.name) && !/nodeid/i.test(f.name))
    || (mt.fields || []).find((f) => /^delete.*categor/i.test(f.name));
  if (delField) {
    const inputArg = (delField.args || []).find((a) => a.name === 'input');
    if (inputArg) {
      const inputType = index.get(unwrapType(inputArg.type).name);
      const innerFields = (inputType.inputFields || []).map((f) => ({ name: f.name, typeName: unwrapType(f.type).name }));
      const byId = innerFields.find((f) => f.name === 'id');
      const byNodeId = innerFields.find((f) => f.name === 'nodeId');
      const key = byId ? 'id' : (byNodeId ? 'nodeId' : (innerFields[0] && innerFields[0].name));
      if (key) {
        out.del = { name: delField.name, inputTypeName: unwrapType(inputArg.type).name, key };
      }
    }
  }

  // create mutation
  const createField = (mt.fields || []).find((f) => /^create.*categor/i.test(f.name));
  if (createField) {
    const inputArg = (createField.args || []).find((a) => a.name === 'input');
    if (inputArg) {
      const inputTypeName = unwrapType(inputArg.type).name;
      const inputType = index.get(inputTypeName);
      const innerField = (inputType.inputFields || []).find((f) => {
        const nt = index.get(unwrapType(f.type).name);
        return nt && nt.kind === 'INPUT_OBJECT';
      });
      if (innerField) {
        const innerType = index.get(unwrapType(innerField.type).name);
        const requiredScalars = (innerType.inputFields || [])
          .filter((f) => isNonNull(f.type))
          .map((f) => ({ name: f.name, scalar: unwrapType(f.type).name, kind: unwrapType(f.type).kind }))
          .filter((f) => f.kind === 'SCALAR' || f.kind === 'ENUM');
        const payloadType = index.get(unwrapType(createField.type).name);
        const payloadField = (payloadType.fields || []).find((f) => {
          const nt = index.get(unwrapType(f.type).name);
          return nt && nt.kind === 'OBJECT' && /categor/i.test(nt.name) && (nt.fields || []).some((sf) => sf.name === 'id');
        });
        out.create = {
          name: createField.name,
          inputTypeName,
          innerName: innerField.name,
          requiredScalars,
          payloadFieldName: payloadField ? payloadField.name : null,
          // which key to select in the payload so we can delete afterwards
          keySelect: out.del ? out.del.key : 'id'
        };
      }
    }
  }
  return out;
}

// Build the record input object for a create write. `nameValue` is forced onto
// the `name` column; everything else required gets a type-appropriate value.
export function buildCreateRecord(create, nameValue, rand) {
  const rec = {};
  for (const f of create.requiredScalars) {
    if (f.name === 'name') rec[f.name] = nameValue;
    else if (f.name === 'slug') rec[f.name] = `load-${rand}`;
    else rec[f.name] = SCALAR_SAMPLE(f.scalar, rand);
  }
  if (rec.name === undefined) rec.name = nameValue; // ensure name present even if not flagged required
  return rec;
}

// ---------------------------------------------------------------------------
// Bucketed latency histogram (bounded memory — safe for multi-hour soaks)
// ---------------------------------------------------------------------------
const DEFAULT_BUCKETS = [
  1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610,
  1000, 1600, 2600, 4200, 6800, 11000, 18000, 30000, 60000
];

export class Histogram {
  constructor(buckets = DEFAULT_BUCKETS) {
    this.buckets = buckets;
    this.counts = new Array(buckets.length + 1).fill(0);
    this.count = 0;
    this.sum = 0;
    this.min = Infinity;
    this.max = 0;
  }

  record(ms) {
    this.count++;
    this.sum += ms;
    if (ms < this.min) this.min = ms;
    if (ms > this.max) this.max = ms;
    let i = 0;
    while (i < this.buckets.length && ms > this.buckets[i]) i++;
    this.counts[i]++;
  }

  percentile(p) {
    if (this.count === 0) return 0;
    const target = Math.ceil((p / 100) * this.count);
    let cum = 0;
    for (let i = 0; i < this.counts.length; i++) {
      cum += this.counts[i];
      if (cum >= target) {
        return i < this.buckets.length ? this.buckets[i] : Math.round(this.max);
      }
    }
    return Math.round(this.max);
  }

  summary() {
    return {
      count: this.count,
      min: this.count ? round2(this.min) : 0,
      mean: this.count ? round2(this.sum / this.count) : 0,
      p50: this.percentile(50),
      p95: this.percentile(95),
      p99: this.percentile(99),
      max: round2(this.max)
    };
  }
}

// ---------------------------------------------------------------------------
// Shape samplers over the tenant array
// ---------------------------------------------------------------------------
// zipf: weight_i = 1 / (i + 1) over fleet order; returns index sampler.
export function makeZipfSampler(n, rng) {
  const weights = [];
  let total = 0;
  for (let i = 0; i < n; i++) {
    const w = 1 / (i + 1);
    weights.push(w);
    total += w;
  }
  const cum = [];
  let acc = 0;
  for (let i = 0; i < n; i++) {
    acc += weights[i] / total;
    cum.push(acc);
  }
  return () => {
    const r = rng();
    for (let i = 0; i < n; i++) if (r <= cum[i]) return i;
    return n - 1;
  };
}

export function makeMixSampler(mixStr, rng) {
  // "read:0.7,write:0.25,meta:0.05"
  const entries = [];
  let total = 0;
  for (const part of String(mixStr).split(',')) {
    const [k, v] = part.split(':');
    const w = Number.parseFloat(v);
    if (k && Number.isFinite(w) && w > 0) {
      entries.push([k.trim(), w]);
      total += w;
    }
  }
  if (entries.length === 0) {
    entries.push(['read', 1]);
    total = 1;
  }
  const cum = [];
  let acc = 0;
  for (const [k, w] of entries) {
    acc += w / total;
    cum.push([k, acc]);
  }
  return () => {
    const r = rng();
    for (const [k, c] of cum) if (r <= c) return k;
    return cum[cum.length - 1][0];
  };
}
