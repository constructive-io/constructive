import { createHash } from 'node:crypto';

// =============================================================================
// Rewriting pool: per-request tenant schema rewriting for a pooled instance
//
// One PostGraphile instance is pooled across many tenants whose PostgreSQL
// schemas are shape-identical but differently prefixed (e.g. canonical
// `myapp-a1b2c3d4-app-public` vs tenant `other-9f8e7d6c-app-public`). The
// pooled instance emits fully-qualified SQL naming the CANONICAL tenant's
// schemas. This module wraps the `pg` Pool handed to the PostGraphile adaptor
// and, per request, rewrites the canonical schema identifiers to the requesting
// tenant's — plus namespaces prepared-statement names per tenant so one tenant's
// prepared plan never serves another.
//
// Tenant identity arrives inside the adaptor's pgSettings query via a custom GUC
// (POOL_SCHEMAS_GUC). Until a checkout has seen that GUC it has NO mapping; any
// query that would otherwise ship canonical SQL FAILS CLOSED rather than read
// the wrong tenant's data.
//
// The SQL rewriting is a single-pass lexer that rewrites ONLY double-quoted
// identifier tokens — never string literals, dollar-quoted bodies, comments or
// E-strings — so output is byte-identical to input except for replaced idents.
// =============================================================================

export const POOL_SCHEMAS_GUC = 'constructive.pool_schemas';

export interface RewriteCounters {
  settingsParses: number;
  rewrittenQueries: number;
  memoHits: number;
  failClosed: number;
  nameRewrites: number;
}

export interface RewritingPoolOptions {
  /** Physical schema names the pooled instance was built against. */
  canonicalSchemas: string[];
  /** Maps a physical schema name to its logical (prefix-stripped) name. Injected. */
  logicalName: (physical: string) => string;
  /** LRU cap for both the needs-rewrite and rewrite-result memos. Default 2000. */
  maxMemoEntries?: number;
  /**
   * Per-connection cap on the prepared-statement names we issue. Defaults to the
   * adaptor's own DATAPLAN_PG_PREPARED_STATEMENT_CACHE_SIZE parse (unset -> 100).
   */
  maxPreparedNames?: number;
  /** Optional shared counters; a fresh set is created when omitted. */
  counters?: RewriteCounters;
}

/** Build a zeroed counters object (companion to RewritingPoolOptions.counters). */
export function createRewriteCounters(): RewriteCounters {
  return {
    settingsParses: 0,
    rewrittenQueries: 0,
    memoHits: 0,
    failClosed: 0,
    nameRewrites: 0
  };
}

// Process-wide counters: the default sink when a pool is created without its own
// counters, so getRewritePoolCounters() (read by the metrics sampler) reflects
// real pooled activity aggregated across every pooled instance.
const moduleCounters = createRewriteCounters();

/** Snapshot the process-wide rewrite-pool counters (metrics sampler entry point). Returns a copy so callers cannot mutate live state. */
export function getRewritePoolCounters(): RewriteCounters {
  return { ...moduleCounters };
}

// -----------------------------------------------------------------------------
// SQL lexer
// -----------------------------------------------------------------------------

const isIdentChar = (ch: string | undefined): boolean => {
  if (ch === undefined) return false;
  return (
    (ch >= 'a' && ch <= 'z') ||
    (ch >= 'A' && ch <= 'Z') ||
    (ch >= '0' && ch <= '9') ||
    ch === '_' ||
    ch === '$'
  );
};

const isTagStartChar = (ch: string | undefined): boolean => {
  if (ch === undefined) return false;
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
};

const isTagChar = (ch: string | undefined): boolean =>
  isTagStartChar(ch) || (ch !== undefined && ch >= '0' && ch <= '9');

/**
 * If `text[i]` opens a dollar-quote tag (`$$` or `$tag$` where the tag follows
 * unquoted-identifier rules), return the full opening tag (e.g. `$$`, `$body$`);
 * otherwise null. Positional params like `$1` return null (digit-led tag).
 */
const matchDollarTag = (text: string, i: number): string | null => {
  // text[i] === '$'
  const next = text[i + 1];
  if (next === '$') return '$$';
  if (!isTagStartChar(next)) return null;
  let j = i + 2;
  while (j < text.length && isTagChar(text[j])) j++;
  if (text[j] === '$') return text.slice(i, j + 1);
  return null;
};

interface IdentifierToken {
  /** Index of the opening `"`. */
  start: number;
  /** Index just past the closing `"`. */
  end: number;
  /** Unescaped identifier value (`""` collapsed to `"`). */
  value: string;
}

/**
 * Single left-to-right scan collecting every double-quoted identifier token,
 * skipping over string literals, E-strings, dollar-quoted bodies, and line /
 * (nested) block comments. This is the ONLY place identifier boundaries are
 * decided; both public helpers below reuse it.
 */
const scanIdentifierTokens = (text: string): IdentifierToken[] => {
  const tokens: IdentifierToken[] = [];
  const n = text.length;
  let i = 0;

  while (i < n) {
    const ch = text[i];

    // Line comment -- ... to end of line
    if (ch === '-' && text[i + 1] === '-') {
      i += 2;
      while (i < n && text[i] !== '\n') i++;
      continue;
    }

    // Block comment /* ... */ (nested)
    if (ch === '/' && text[i + 1] === '*') {
      i += 2;
      let depth = 1;
      while (i < n && depth > 0) {
        if (text[i] === '/' && text[i + 1] === '*') {
          depth++;
          i += 2;
        } else if (text[i] === '*' && text[i + 1] === '/') {
          depth--;
          i += 2;
        } else {
          i++;
        }
      }
      continue;
    }

    // Double-quoted identifier — the only token we ever rewrite
    if (ch === '"') {
      const start = i;
      i++;
      let value = '';
      while (i < n) {
        if (text[i] === '"') {
          if (text[i + 1] === '"') {
            value += '"';
            i += 2;
            continue;
          }
          i++;
          break;
        }
        value += text[i];
        i++;
      }
      tokens.push({ start, end: i, value });
      continue;
    }

    // Dollar-quoted string $tag$ ... $tag$
    if (ch === '$') {
      const tag = matchDollarTag(text, i);
      if (tag !== null) {
        i += tag.length;
        const close = text.indexOf(tag, i);
        i = close === -1 ? n : close + tag.length;
        continue;
      }
    }

    // E-string: a standalone e/E immediately followed by a quote. Both \\-style
    // backslash escapes AND '' count; a backslash escapes the next char.
    if ((ch === 'e' || ch === 'E') && text[i + 1] === "'" && !isIdentChar(text[i - 1])) {
      i += 2;
      while (i < n) {
        const c = text[i];
        if (c === '\\') {
          i += 2;
          continue;
        }
        if (c === "'") {
          if (text[i + 1] === "'") {
            i += 2;
            continue;
          }
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    // Regular single-quoted string literal ('' is an escaped quote)
    if (ch === "'") {
      i++;
      while (i < n) {
        if (text[i] === "'") {
          if (text[i + 1] === "'") {
            i += 2;
            continue;
          }
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    i++;
  }

  return tokens;
};

/**
 * Rewrite ONLY double-quoted identifier tokens whose unescaped value is a key of
 * `map`. String literals, dollar-quoted bodies, comments, E-strings and
 * unquoted words are never touched. Output is byte-identical to input except for
 * replaced tokens (a replacement is re-quoted with embedded `"` doubled).
 */
export function rewriteQuotedIdentifiers(text: string, map: Map<string, string>): string {
  const tokens = scanIdentifierTokens(text);
  if (tokens.length === 0) return text;

  let out = '';
  let last = 0;
  for (const tok of tokens) {
    const replacement = map.get(tok.value);
    // Non-matches keep their original bytes: they stay inside the next verbatim
    // slice because `last` only advances past tokens we actually replace.
    if (replacement === undefined) continue;
    out += text.slice(last, tok.start);
    out += '"' + replacement.replace(/"/g, '""') + '"';
    last = tok.end;
  }
  if (last === 0) return text;
  out += text.slice(last);
  return out;
}

/**
 * True iff `text` contains any of `names` as a complete double-quoted identifier
 * token (same lexer as rewriteQuotedIdentifiers — matches on the unescaped
 * value, so an identifier merely prefixing a longer one does not count).
 */
export function containsQuotedIdentifier(text: string, names: Set<string>): boolean {
  const tokens = scanIdentifierTokens(text);
  for (const tok of tokens) {
    if (names.has(tok.value)) return true;
  }
  return false;
}

// -----------------------------------------------------------------------------
// Small insertion-order LRU (bounded memo). A stored `false`/'' is a real value,
// so callers distinguish a miss via `has()` rather than an undefined return.
// -----------------------------------------------------------------------------

class LruCache<V> {
  private readonly map = new Map<string, V>();
  constructor(private readonly max: number) {}

  has(key: string): boolean {
    return this.map.has(key);
  }

  get(key: string): V | undefined {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key);
    // Touch: move to most-recently-used position.
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: string, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.max) {
      const oldest = this.map.keys().next().value;
      this.map.delete(oldest);
    }
  }
}

// -----------------------------------------------------------------------------
// Pool / client wrapper
// -----------------------------------------------------------------------------

interface CheckoutState {
  /** Canonical -> tenant physical schema map; null until a settings query lands. */
  tenantMap: Map<string, string> | null;
  /** Per-tenant namespace tag; null in identity mode (canonical querying itself). */
  tenantTag: string | null;
  /** Set when the tenant schema set can't satisfy the canonical shape (fail closed). */
  invalidReason: string | null;
}

const freshState = (): CheckoutState => ({ tenantMap: null, tenantTag: null, invalidReason: null });

const sha256hex = (input: string): string => createHash('sha256').update(input).digest('hex');

/** Deterministic per-tenant prepared-statement name: same tenant+name -> same result. */
const hashName = (tenantTag: string, name: string): string =>
  'bp_' + sha256hex(tenantTag + ':' + name).slice(0, 24);

const isSettingsValues = (values: any): boolean =>
  Array.isArray(values) &&
  values.length > 0 &&
  typeof values[0] === 'string' &&
  values[0].includes(POOL_SCHEMAS_GUC);

// Per-connection prepared-statement state lives on the RAW client under this
// module-private Symbol: prepared statements are physical-connection scoped and
// must survive checkout/release (unlike per-checkout tenant state).
const BP_PREPARED = Symbol('constructive.rewrite-pool.prepared');

/**
 * Replicate @dataplan/pg's DATAPLAN_PG_PREPARED_STATEMENT_CACHE_SIZE parse:
 * unset / empty / non-numeric -> 100; an explicit 0 -> 0 (upstream then disables
 * prepared statements entirely, so our LRU is never exercised).
 */
const parsePreparedStatementCacheSize = (raw: string | undefined): number => {
  const fromEnv = raw ? parseInt(raw, 10) : null;
  return !!fromEnv || fromEnv === 0 ? fromEnv : 100;
};

export function createRewritingPool(pool: any, opts: RewritingPoolOptions): any {
  const counters = opts.counters ?? moduleCounters;
  const maxMemoEntries = opts.maxMemoEntries ?? 2000;
  const maxPreparedNames =
    opts.maxPreparedNames ??
    parsePreparedStatementCacheSize(process.env.DATAPLAN_PG_PREPARED_STATEMENT_CACHE_SIZE);
  const canonicalSchemas = opts.canonicalSchemas;
  const canonicalNames = new Set(canonicalSchemas);
  const logicalName = opts.logicalName;

  // Caches live at pool scope (shared across checkouts). `needs` depends only on
  // the text; the rewrite result is disambiguated per tenant via tenantTag.
  const needsCache = new LruCache<boolean>(maxMemoEntries);
  const rewriteCache = new LruCache<string>(maxMemoEntries);

  const needsRewrite = (text: string): boolean => {
    if (needsCache.has(text)) return needsCache.get(text);
    const result = containsQuotedIdentifier(text, canonicalNames);
    needsCache.set(text, result);
    return result;
  };

  const rewriteText = (tenantTag: string, text: string, map: Map<string, string>): string => {
    const key = tenantTag + ' ' + text;
    if (rewriteCache.has(key)) {
      counters.rewrittenQueries += 1;
      counters.memoHits += 1;
      return rewriteCache.get(key);
    }
    const out = rewriteQuotedIdentifiers(text, map);
    rewriteCache.set(key, out);
    counters.rewrittenQueries += 1;
    return out;
  };

  // We rename prepared statements to bp_<hash>, which defeats the adaptor's own
  // dispose (it keys its LRU by the ORIGINAL name, but pg's parsedStatements is
  // now keyed by our hashed name, so its `deallocate <original>` never fires).
  // So the wrapper OWNS the lifecycle: an insertion-ordered LRU of hashed names,
  // kept on the RAW client so it survives release, evicts the oldest and fires a
  // best-effort DEALLOCATE for it once the per-connection cap is exceeded.
  const trackPreparedName = (rawClient: any, hashedName: string): void => {
    if (maxPreparedNames <= 0) return;
    let store: Map<string, true> = rawClient[BP_PREPARED];
    if (!store) {
      store = new Map();
      rawClient[BP_PREPARED] = store;
    }
    if (store.has(hashedName)) {
      // Refresh recency.
      store.delete(hashedName);
      store.set(hashedName, true);
      return;
    }
    store.set(hashedName, true);
    if (store.size > maxPreparedNames) {
      const evicted = store.keys().next().value;
      store.delete(evicted);
      // Fire-and-forget on the raw connection (hashed names need no escaping).
      Promise.resolve(rawClient.query('deallocate "' + evicted + '"'))
        .then(() => {
          // Mirror the adaptor's dispose: node-postgres tracks prepared names in
          // connection.parsedStatements. Without clearing the entry, re-preparing
          // the evicted name later would skip the Parse step and fail on PG with
          // "prepared statement does not exist".
          const parsed = rawClient.connection?.parsedStatements;
          if (parsed) delete parsed[evicted];
        })
        .catch((err: any) => {
          // eslint-disable-next-line no-console
          console.error('[rewrite-pool] failed to deallocate prepared statement ' + evicted, err);
        });
    }
  };

  // Parse the adaptor's pgSettings query and (re)build the checkout's tenant map.
  const applySettings = (values: any[], state: CheckoutState): void => {
    counters.settingsParses += 1;

    let tenantSchemas: string[] | null = null;
    try {
      const parsed = JSON.parse(values[0]);
      let raw: any;
      if (Array.isArray(parsed)) {
        for (const entry of parsed) {
          if (Array.isArray(entry) && entry[0] === POOL_SCHEMAS_GUC) {
            raw = entry[1];
            break;
          }
        }
      } else if (parsed && typeof parsed === 'object') {
        raw = parsed[POOL_SCHEMAS_GUC];
      }
      if (typeof raw === 'string') tenantSchemas = JSON.parse(raw);
      else if (Array.isArray(raw)) tenantSchemas = raw;
    } catch {
      tenantSchemas = null;
    }

    if (!Array.isArray(tenantSchemas)) {
      state.tenantMap = null;
      state.tenantTag = null;
      state.invalidReason = `malformed ${POOL_SCHEMAS_GUC} value`;
      return;
    }

    const tenantByLogical = new Map<string, string>();
    for (const t of tenantSchemas) tenantByLogical.set(logicalName(t), t);

    const map = new Map<string, string>();
    for (const c of canonicalSchemas) {
      const logical = logicalName(c);
      const t = tenantByLogical.get(logical);
      if (t === undefined) {
        state.tenantMap = null;
        state.tenantTag = null;
        state.invalidReason = `canonical schema "${c}" (logical "${logical}") has no tenant schema in [${tenantSchemas.join(', ')}]`;
        return;
      }
      if (t !== c) map.set(c, t);
    }

    state.tenantMap = map;
    state.invalidReason = null;
    if (map.size === 0) {
      // Canonical tenant querying itself: identity mode, no rewriting/namespacing.
      state.tenantTag = null;
    } else {
      state.tenantTag = sha256hex([...tenantSchemas].sort().join(',')).slice(0, 16);
    }
  };

  const failClosed = (state: CheckoutState, args: any[]): any => {
    counters.failClosed += 1;
    const reason = state.invalidReason ?? 'no tenant schema mapping has been applied to this connection';
    const err = new Error(
      `[rewrite-pool] pooled query requires a tenant mapping but none is established on this connection: ${reason}`
    );
    const last = args[args.length - 1];
    if (typeof last === 'function') {
      last(err);
      return undefined;
    }
    return Promise.reject(err);
  };

  const interceptQuery = (rawQuery: any, thisArg: any, args: any[], state: CheckoutState): any => {
    const first = args[0];

    let text: string;
    let values: any;
    let name: any;
    let isConfig = false;

    if (typeof first === 'string') {
      text = first;
      if (Array.isArray(args[1])) values = args[1];
    } else if (first && typeof first === 'object' && typeof first.text === 'string') {
      isConfig = true;
      text = first.text;
      values = first.values;
      name = first.name;
    } else {
      // Unknown shape (e.g. a Submittable) — forward untouched.
      return rawQuery.apply(thisArg, args);
    }

    // Settings query: parse tenant identity, forward the query itself untouched.
    if (isSettingsValues(values)) {
      applySettings(values, state);
      return rawQuery.apply(thisArg, args);
    }

    let newText = text;
    if (needsRewrite(text)) {
      if (state.invalidReason !== null || state.tenantMap === null) {
        return failClosed(state, args);
      }
      if (state.tenantMap.size > 0) {
        newText = rewriteText(state.tenantTag, text, state.tenantMap);
      }
      // else identity mode: leave text unchanged.
    }

    // Prepared-statement name namespacing (config form only). thisArg is the raw
    // client on the checkout path (the only path where tenantTag is ever set), so
    // the per-connection prepared-name LRU hangs off it.
    let newName = name;
    if (isConfig && name != null && state.tenantTag !== null) {
      newName = hashName(state.tenantTag, String(name));
      counters.nameRewrites += 1;
      trackPreparedName(thisArg, newName);
    }

    if (newText === text && newName === name) {
      return rawQuery.apply(thisArg, args);
    }

    // Clone rather than mutate the caller's object.
    if (isConfig) {
      const cloned = { ...first, text: newText };
      if (newName !== name) cloned.name = newName;
      return rawQuery.apply(thisArg, [cloned, ...args.slice(1)]);
    }
    return rawQuery.apply(thisArg, [newText, ...args.slice(1)]);
  };

  const wrapClient = (client: any): any => {
    const state = freshState();
    return new Proxy(client, {
      get(target, prop, receiver) {
        if (prop === 'query') {
          return (...args: any[]) => interceptQuery(target.query, target, args, state);
        }
        if (prop === 'release') {
          return (...args: any[]) => {
            // Per-checkout state must not leak into the next borrower.
            state.tenantMap = null;
            state.tenantTag = null;
            state.invalidReason = null;
            return target.release.apply(target, args);
          };
        }
        const value = Reflect.get(target, prop, receiver);
        return typeof value === 'function' ? value.bind(target) : value;
      }
    });
  };

  return new Proxy(pool, {
    get(target, prop, receiver) {
      if (prop === 'connect') {
        return (...args: any[]) => {
          // Callback style: connect((err, client, release) => ...)
          if (typeof args[0] === 'function') {
            const cb = args[0];
            return target.connect((err: any, client: any, done: any) => {
              if (err) {
                cb(err, client, done);
                return;
              }
              cb(err, wrapClient(client), done);
            });
          }
          // Promise style (used by the PostGraphile adaptor).
          return Promise.resolve(target.connect(...args)).then((client: any) => wrapClient(client));
        };
      }
      if (prop === 'query') {
        // Pool-level one-shot: no established checkout => tenantMap stays null,
        // so anything needing a rewrite fails closed; everything else passes.
        return (...args: any[]) => interceptQuery(target.query, target, args, freshState());
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
}
