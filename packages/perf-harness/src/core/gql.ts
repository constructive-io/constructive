/**
 * GraphQL-over-HTTP client + introspection-driven op discovery.
 * Verbatim ports from `scripts/scale-validate/_lib.mjs`.
 */

export interface GqlResponse {
  status: number;
  ok: boolean;
  json?: any;
  text?: string;
  elapsedMs: number;
  error?: string;
}

export interface GqlFetchOpts {
  host: string;
  port: number;
  query: string;
  variables?: any;
  token?: string;
  timeoutMs?: number;
  gqlPath?: string;
}

// We put the tenant host in the URL (e.g. api-xxx.localhost) because undici
// ignores an explicit `host` header. `*.localhost` resolves to loopback, so the
// connection lands on 127.0.0.1 while the server sees the correct Host header
// for subdomain routing.
export async function gqlFetch(opts: GqlFetchOpts): Promise<GqlResponse> {
  const { host, port, query, variables, token, timeoutMs = 30000, gqlPath = '/graphql' } = opts;
  const url = `http://${host}:${port}${gqlPath}`;
  const headers: Record<string, string> = { 'content-type': 'application/json', accept: 'application/json' };
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
    let json: any = null;
    let text: any = null;
    if (ct.includes('json')) {
      json = await res.json().catch((): any => null);
    } else {
      text = await res.text().catch((): any => null);
      // Some error paths return JSON without the header — try to parse.
      if (text) {
        try { json = JSON.parse(text); } catch { /* not json */ }
      }
    }
    return { status: res.status, ok: res.ok, json, text, elapsedMs, error: null };
  } catch (err: any) {
    const elapsedMs = performance.now() - start;
    const error = err && err.name === 'AbortError' ? 'timeout' : (err && (err.code || err.message)) || 'network';
    return { status: 0, ok: false, json: null, text: null, elapsedMs, error };
  } finally {
    clearTimeout(timer);
  }
}

export function isRotating(resp: GqlResponse): boolean {
  if (resp.status === 503) {
    const code = resp.json && resp.json.error && resp.json.error.code;
    return code === 'SERVICE_ROTATING' || true; // any 503 counts as rotating
  }
  return false;
}

export function gqlErrors(resp: GqlResponse): any[] {
  return (resp.json && Array.isArray(resp.json.errors)) ? resp.json.errors : [];
}

export function isUnauthenticated(resp: GqlResponse): boolean {
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

export function unwrapType(ref: any): any {
  let t = ref;
  while (t && t.ofType) t = t.ofType;
  return t || null;
}

export function isNonNull(ref: any): boolean {
  return !!(ref && ref.kind === 'NON_NULL');
}

export interface TypeIndex {
  index: Map<string, any>;
  queryType: string | null;
  mutationType: string | null;
}

export function buildTypeIndex(introspect: any): TypeIndex {
  const index = new Map<string, any>();
  const schema = introspect && introspect.__schema;
  if (!schema) return { index, queryType: null, mutationType: null };
  for (const t of schema.types) index.set(t.name, t);
  return {
    index,
    queryType: schema.queryType && schema.queryType.name,
    mutationType: schema.mutationType && schema.mutationType.name
  };
}

function findConnectionField(index: Map<string, any>, queryTypeName: string, re: RegExp): string | null {
  const qt = index.get(queryTypeName);
  if (!qt) return null;
  const candidates = (qt.fields || []).filter((f: any) => re.test(f.name));
  for (const f of candidates) {
    const named = unwrapType(f.type);
    const nt = named && index.get(named.name);
    if (nt && (nt.fields || []).some((sf: any) => sf.name === 'nodes')) return f.name;
  }
  return candidates[0] ? candidates[0].name : null;
}

const SCALAR_SAMPLE = (scalar: string, rand: any): any => {
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

export interface DiscoveredCreate {
  name: string;
  inputTypeName: string;
  innerName: string;
  requiredScalars: { name: string; scalar: string; kind: string }[];
  payloadFieldName: string | null;
  keySelect: string;
}

export interface DiscoveredDelete {
  name: string;
  inputTypeName: string;
  key: string;
}

export interface DiscoveredOps {
  queryType: string | null;
  mutationType: string | null;
  read: string | null;
  meta: boolean;
  create: DiscoveredCreate | null;
  del: DiscoveredDelete | null;
}

// Discover create/delete/read/meta operations from an introspection result.
export function discoverOps(introspect: any): DiscoveredOps {
  const { index, queryType, mutationType } = buildTypeIndex(introspect);
  const out: DiscoveredOps = { queryType, mutationType, read: null, meta: false, create: null, del: null };
  if (!queryType) return out;

  // read (categories connection)
  out.read = findConnectionField(index, queryType, /categor/i);

  // meta (_meta { tables { name } })
  const qt = index.get(queryType);
  out.meta = !!(qt && (qt.fields || []).some((f: any) => f.name === '_meta'));

  if (!mutationType) return out;
  const mt = index.get(mutationType);

  // delete mutation (prefer PK id-based over nodeId-based)
  const delField = (mt.fields || []).find((f: any) => /^delete.*categor/i.test(f.name) && !/nodeid/i.test(f.name))
    || (mt.fields || []).find((f: any) => /^delete.*categor/i.test(f.name));
  if (delField) {
    const inputArg = (delField.args || []).find((a: any) => a.name === 'input');
    if (inputArg) {
      const inputType = index.get(unwrapType(inputArg.type).name);
      const innerFields = (inputType.inputFields || []).map((f: any) => ({ name: f.name, typeName: unwrapType(f.type).name }));
      const byId = innerFields.find((f: any) => f.name === 'id');
      const byNodeId = innerFields.find((f: any) => f.name === 'nodeId');
      const key = byId ? 'id' : (byNodeId ? 'nodeId' : (innerFields[0] && innerFields[0].name));
      if (key) {
        out.del = { name: delField.name, inputTypeName: unwrapType(inputArg.type).name, key };
      }
    }
  }

  // create mutation
  const createField = (mt.fields || []).find((f: any) => /^create.*categor/i.test(f.name));
  if (createField) {
    const inputArg = (createField.args || []).find((a: any) => a.name === 'input');
    if (inputArg) {
      const inputTypeName = unwrapType(inputArg.type).name;
      const inputType = index.get(inputTypeName);
      const innerField = (inputType.inputFields || []).find((f: any) => {
        const nt = index.get(unwrapType(f.type).name);
        return nt && nt.kind === 'INPUT_OBJECT';
      });
      if (innerField) {
        const innerType = index.get(unwrapType(innerField.type).name);
        const requiredScalars = (innerType.inputFields || [])
          .filter((f: any) => isNonNull(f.type))
          .map((f: any) => ({ name: f.name, scalar: unwrapType(f.type).name, kind: unwrapType(f.type).kind }))
          .filter((f: any) => f.kind === 'SCALAR' || f.kind === 'ENUM');
        const payloadType = index.get(unwrapType(createField.type).name);
        const payloadField = (payloadType.fields || []).find((f: any) => {
          const nt = index.get(unwrapType(f.type).name);
          return nt && nt.kind === 'OBJECT' && /categor/i.test(nt.name) && (nt.fields || []).some((sf: any) => sf.name === 'id');
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
export function buildCreateRecord(create: DiscoveredCreate, nameValue: any, rand: any): Record<string, any> {
  const rec: Record<string, any> = {};
  for (const f of create.requiredScalars) {
    if (f.name === 'name') rec[f.name] = nameValue;
    else if (f.name === 'slug') rec[f.name] = `load-${rand}`;
    else rec[f.name] = SCALAR_SAMPLE(f.scalar, rand);
  }
  if (rec.name === undefined) rec.name = nameValue; // ensure name present even if not flagged required
  return rec;
}
