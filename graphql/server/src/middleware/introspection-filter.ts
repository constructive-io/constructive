import { Logger } from '@pgpmjs/logger';

// =============================================================================
// Introspection filter: scope PostGraphile v5 catalog introspection to the
// namespaces an instance actually serves.
//
// PostGraphile v5's introspection SQL (pg-introspection makeIntrospectionQuery)
// is UNSCOPED: it ingests the entire pg_class catalog (tens of thousands of rows
// on a shared multi-tenant database) into every built instance, and the parsed
// result's internal cross-references pin ~1.4GB of heap per instance regardless
// of how few schemas that instance serves. This module intercepts the single,
// static, parameter-less introspection statement as it flows through the pg pool
// wrapper we already own and rewrites its four namespace gates so only the
// served schemas (plus their transitive cross-schema references, plus public and
// pg_catalog) are ingested.
//
// It is intentionally FAIL-OPEN: any shape it does not recognize (gate count !=
// 4, a non-introspection query, an empty served-schema set, the feature flag
// off) falls straight back to today's stock behavior. The one non-open path is a
// throwing discovery query — that fails the instance build, which the caller
// already retries on later requests, and is preferable to serving an instance
// built on an under-scoped (data-losing) catalog.
//
// The rewrite touches SQL STRING LITERALS only (single-quoted schema names in an
// `= any(array[...])`); it never emits double-quoted identifiers, so the sibling
// rewrite-pool's identifier lexer neither sees nor rewrites anything here.
// =============================================================================

const log = new Logger('graphile:introspection-filter');

// The exact namespace-gate substring emitted by pg-introspection@1.0.1's
// makeIntrospectionQuery(). It appears EXACTLY 4 times (classes.relnamespace,
// constraints.connamespace, procs.pronamespace, types.typnamespace). The types
// gate is followed by `or (typnamespace = 'pg_catalog'::regnamespace)` which we
// leave intact so pg_catalog types survive. NOTE the single backslash before the
// underscore: that is the runtime string (the .js source shows a doubled
// backslash only because it sits in a template literal). Verified by test
// against the installed package rather than hand-transcription.
const GATE_SUBSTRING =
  "in (select namespaces._id from namespaces where nspname <> 'information_schema' and nspname not like 'pg\\_%')";

// Cheap structural signature of the introspection statement. Ordinary
// GraphQL-generated SQL can never satisfy all three of these simultaneously.
const INTROSPECTION_PREFIX = 'with\n  database as (';
const INTROSPECTION_MARKER = ')::text as introspection';
const INTROSPECTION_VERSION_TOKEN = 'introspection_version';

// -----------------------------------------------------------------------------
// Env flag
// -----------------------------------------------------------------------------

/**
 * Whether the introspection filter is enabled via GRAPHILE_INTROSPECTION_FILTER.
 * Accepts '1' or 'true'; anything else (incl. unset) means disabled. Mirrors the
 * GRAPHILE_BLUEPRINT_POOLING read in blueprint.ts.
 */
export const isIntrospectionFilterEnabled = (): boolean => {
  const value = process.env.GRAPHILE_INTROSPECTION_FILTER;
  return value === '1' || value === 'true';
};

// -----------------------------------------------------------------------------
// Counters
// -----------------------------------------------------------------------------

export interface IntrospectionFilterCounters {
  /** Closure-discovery passes actually run (one per intercepted introspection). */
  discoveries: number;
  /** Introspection queries whose text was swapped for a filtered one. */
  swaps: number;
  /** Callback-form or otherwise unfilterable introspection queries passed through. */
  failures: number;
  /** Times buildFilteredIntrospectionQuery returned null (gate count != 4). */
  gateMismatches: number;
  /** Closure loops that hit the 5-round cap before converging. */
  closureTruncations: number;
  /** Total namespaces retained by the most recent successful filter build. */
  keepNamespaceCount: number;
}

/** Build a zeroed counters object (companion to the interceptor opts). */
export const createIntrospectionFilterCounters = (): IntrospectionFilterCounters => ({
  discoveries: 0,
  swaps: 0,
  failures: 0,
  gateMismatches: 0,
  closureTruncations: 0,
  keepNamespaceCount: 0
});

// Process-wide sink: the default counters when an interceptor/pool is created
// without its own, so getIntrospectionFilterCounters() (read by the metrics
// sampler) reflects real activity aggregated across every filtered instance.
const moduleCounters = createIntrospectionFilterCounters();

/** Snapshot the process-wide introspection-filter counters (metrics sampler entry point). Returns a copy so callers cannot mutate live state. */
export const getIntrospectionFilterCounters = (): IntrospectionFilterCounters => ({
  ...moduleCounters
});

/**
 * Record a callback-form introspection query that had to be passed through
 * unfiltered (callback semantics are never rewritten). Bumps the module sink so
 * the rewrite-pool integration can report it without owning its own counters.
 */
export const noteIntrospectionCallbackPassthrough = (): void => {
  moduleCounters.failures += 1;
};

// -----------------------------------------------------------------------------
// Query detection
// -----------------------------------------------------------------------------

/**
 * Cheap signature check for the pg-introspection statement. Robust against
 * user/GraphQL-generated SQL: requires the length floor, the real CTE prefix,
 * the trailing `)::text as introspection` marker AND the introspection_version
 * token together.
 */
export const isIntrospectionQuery = (text: string): boolean => {
  if (typeof text !== 'string' || text.length <= 5000) return false;
  return (
    text.startsWith(INTROSPECTION_PREFIX) &&
    text.includes(INTROSPECTION_MARKER) &&
    text.includes(INTROSPECTION_VERSION_TOKEN)
  );
};

// -----------------------------------------------------------------------------
// Filtered-query builder
// -----------------------------------------------------------------------------

/** Escape a value as a SQL string literal body (single quotes doubled). */
const sqlLiteral = (value: string): string => "'" + value.replace(/'/g, "''") + "'";

const isRejectedNamespace = (name: string): boolean =>
  name.length === 0 ||
  name.includes('\u0000') ||
  name === 'information_schema' ||
  name.startsWith('pg_');

/**
 * Rewrite the four namespace gates of the stock introspection text so only
 * `keepNamespaces` (sorted, deduped, escaped) are ingested. Returns null when
 * the gate substring does not appear exactly 4 times (the caller then falls back
 * to the stock text). Names starting 'pg_' / equal to 'information_schema' /
 * containing NUL are defensively dropped from the injected array; the intact
 * `or (typnamespace = 'pg_catalog'::regnamespace)` branch keeps pg_catalog
 * types.
 */
export const buildFilteredIntrospectionQuery = (
  stockText: string,
  keepNamespaces: string[]
): string | null => {
  const occurrences = stockText.split(GATE_SUBSTRING).length - 1;
  if (occurrences !== 4) return null;

  const cleaned = Array.from(new Set(keepNamespaces.filter((n) => !isRejectedNamespace(n)))).sort();
  const arrayLiteral =
    cleaned.length === 0
      ? "in (select namespaces._id from namespaces where false)"
      : 'in (select namespaces._id from namespaces where nspname = any (array[' +
        cleaned.map(sqlLiteral).join(', ') +
        ']::text[]))';

  return stockText.split(GATE_SUBSTRING).join(arrayLiteral);
};

// -----------------------------------------------------------------------------
// Namespace-closure discovery
// -----------------------------------------------------------------------------

// One round of closure discovery. Given the already-kept namespaces ($1), return
// NEW namespaces referenced by objects living in kept namespaces, via three arms:
//   1. FK targets:      pg_constraint(contype='f') in kept classes -> confrelid ns
//   2. attribute types: live attributes of kept classes -> atttypid ns, plus that
//                       type's typbasetype and typelem namespaces when nonzero
//   3. proc types:      pg_proc in kept namespaces -> prorettype ns + arg-type ns
// Every arm schema-qualifies pg_catalog.* (no search_path) and excludes
// information_schema, pg_* namespaces, and names already in the kept set.
const CLOSURE_ROUND_SQL = `
with kept as (
  select n.oid
  from pg_catalog.pg_namespace n
  where n.nspname = any ($1::text[])
),
kept_classes as (
  select c.oid, c.relnamespace
  from pg_catalog.pg_class c
  where c.relnamespace in (select oid from kept)
),
referenced as (
  -- arm 1: foreign-key target namespaces
  select tc.relnamespace as nsoid
  from pg_catalog.pg_constraint con
  join kept_classes kc on kc.oid = con.conrelid
  join pg_catalog.pg_class tc on tc.oid = con.confrelid
  where con.contype = 'f'

  union

  -- arm 2: attribute type namespaces (+ base/element type namespaces)
  select t.typnamespace as nsoid
  from pg_catalog.pg_attribute a
  join kept_classes kc on kc.oid = a.attrelid
  join pg_catalog.pg_type t on t.oid = a.atttypid
  where a.attnum > 0 and not a.attisdropped

  union
  select bt.typnamespace as nsoid
  from pg_catalog.pg_attribute a
  join kept_classes kc on kc.oid = a.attrelid
  join pg_catalog.pg_type t on t.oid = a.atttypid
  join pg_catalog.pg_type bt on bt.oid = t.typbasetype
  where a.attnum > 0 and not a.attisdropped and t.typbasetype <> 0

  union
  select et.typnamespace as nsoid
  from pg_catalog.pg_attribute a
  join kept_classes kc on kc.oid = a.attrelid
  join pg_catalog.pg_type t on t.oid = a.atttypid
  join pg_catalog.pg_type et on et.oid = t.typelem
  where a.attnum > 0 and not a.attisdropped and t.typelem <> 0

  union

  -- arm 3: proc return-type and argument-type namespaces
  select rt.typnamespace as nsoid
  from pg_catalog.pg_proc p
  join pg_catalog.pg_type rt on rt.oid = p.prorettype
  where p.pronamespace in (select oid from kept)

  union
  select at.typnamespace as nsoid
  from pg_catalog.pg_proc p
  cross join lateral unnest(p.proargtypes) as pat(argoid)
  join pg_catalog.pg_type at on at.oid = pat.argoid
  where p.pronamespace in (select oid from kept)
)
select distinct n.nspname
from referenced r
join pg_catalog.pg_namespace n on n.oid = r.nsoid
where n.nspname <> 'information_schema'
  and n.nspname not like 'pg\\_%'
  and n.nspname <> all ($1::text[])
`;

const MAX_CLOSURE_ROUNDS = 5;

/** Minimal shape of the checked-out client the discovery needs. */
interface RawClientLike {
  query(sql: string, values?: any[]): Promise<{ rows: any[] }>;
}

/**
 * Iterate CLOSURE_ROUND_SQL in JS until a round adds nothing or the round cap is
 * hit. Starting set = servedSchemas ∪ {'public'}. Runs sequential queries on the
 * provided (exclusively checked-out) client. Returns the accumulated keep set and
 * whether the cap truncated the walk.
 */
const discoverKeepNamespaces = async (
  client: RawClientLike,
  servedSchemas: string[]
): Promise<{ keep: string[]; truncated: boolean }> => {
  const keep = new Set<string>(['public']);
  for (const s of servedSchemas) {
    if (typeof s === 'string' && s.length > 0) keep.add(s);
  }

  let truncated = true;
  for (let round = 0; round < MAX_CLOSURE_ROUNDS; round++) {
    const result = await client.query(CLOSURE_ROUND_SQL, [Array.from(keep)]);
    const added: string[] = [];
    for (const row of result.rows) {
      const name = row.nspname;
      if (typeof name === 'string' && !keep.has(name)) {
        keep.add(name);
        added.push(name);
      }
    }
    if (added.length === 0) {
      truncated = false;
      break;
    }
  }

  return { keep: Array.from(keep), truncated };
};

// -----------------------------------------------------------------------------
// Interceptor
// -----------------------------------------------------------------------------

export interface IntrospectionInterceptorOptions {
  /** Physical schema names this instance serves (the discovery seed, sans public). */
  servedSchemas: string[];
  /** Optional shared counters; the module sink is used when omitted. */
  counters?: IntrospectionFilterCounters;
}

/**
 * The interceptor callback: given the stock introspection text and the raw
 * checked-out client, resolves to the text to actually execute. Returns null
 * (synchronously) when the filter must not apply — filter disabled, no served
 * schemas, or the text is not the introspection query — so the caller runs the
 * original query unchanged.
 *
 * On the filtering path it memoizes: the closure discovery + filtered text are
 * computed once per interceptor (i.e. once per instance build) and reused for any
 * subsequent introspection on the same interceptor. A gate mismatch records the
 * reason, warns once, and returns the STOCK text (graceful fallback). A throwing
 * discovery query rejects (the instance build fails and is retried later).
 */
export type IntrospectionInterceptor = (
  text: string,
  rawClient: RawClientLike
) => Promise<string> | null;

export const createIntrospectionInterceptor = (
  opts: IntrospectionInterceptorOptions
): IntrospectionInterceptor => {
  const counters = opts.counters ?? moduleCounters;
  const servedSchemas = Array.isArray(opts.servedSchemas) ? opts.servedSchemas : [];

  let memo: Promise<string> | null = null;
  let warnedGateMismatch = false;

  return (text: string, rawClient: RawClientLike): Promise<string> | null => {
    if (!isIntrospectionFilterEnabled()) return null;
    if (servedSchemas.length === 0) return null;
    if (!isIntrospectionQuery(text)) return null;

    if (memo) return memo;

    memo = (async (): Promise<string> => {
      counters.discoveries += 1;
      const { keep, truncated } = await discoverKeepNamespaces(rawClient, servedSchemas);
      if (truncated) counters.closureTruncations += 1;

      const filtered = buildFilteredIntrospectionQuery(text, keep);
      if (filtered === null) {
        counters.gateMismatches += 1;
        if (!warnedGateMismatch) {
          warnedGateMismatch = true;
          log.warn(
            'introspection gate substring not found exactly 4 times; falling back to unfiltered introspection'
          );
        }
        return text;
      }

      counters.swaps += 1;
      counters.keepNamespaceCount = keep.length;
      return filtered;
    })();

    // A rejected discovery must not poison later attempts (the build is retried).
    memo.catch(() => {
      memo = null;
    });

    return memo;
  };
};

// -----------------------------------------------------------------------------
// Dedicated-instance pool wrapper
// -----------------------------------------------------------------------------

export interface IntrospectionFilterPoolOptions {
  /** Physical schema names this dedicated instance serves. */
  servedSchemas: string[];
  /** Optional shared counters; the module sink is used when omitted. */
  counters?: IntrospectionFilterCounters;
}

/**
 * Thin Proxy over a raw pg Pool for DEDICATED (non-pooled) instances: intercepts
 * a checked-out client's introspection query and swaps it for the filtered text.
 * Everything else passes through untouched. No settings parsing, identifier
 * rewriting, or prepared-name logic (unlike rewrite-pool). The per-checkout
 * interceptor closure is a per-connection memo; release restores nothing.
 */
export const createIntrospectionFilterPool = (pool: any, opts: IntrospectionFilterPoolOptions): any => {
  const counters = opts.counters ?? moduleCounters;
  const servedSchemas = opts.servedSchemas;

  const wrapClient = (client: any): any => {
    const interceptor = createIntrospectionInterceptor({ servedSchemas, counters });

    const interceptQuery = (rawQuery: any, thisArg: any, args: any[]): any => {
      const first = args[0];

      // Promise-form config object with a text field is the only introspection
      // shape (the @dataplan/pg adaptor runs `client.query({ text })`). A callback
      // last-arg means callback semantics: never filter, count and pass through.
      let text: string | undefined;
      if (typeof first === 'string') text = first;
      else if (first && typeof first === 'object' && typeof first.text === 'string') text = first.text;

      const hasCallback = typeof args[args.length - 1] === 'function';

      if (text !== undefined && isIntrospectionQuery(text)) {
        if (hasCallback) {
          counters.failures += 1;
          return rawQuery.apply(thisArg, args);
        }
        const swapPromise = interceptor(text, { query: (sql, values) => thisArg.query(sql, values) });
        if (swapPromise === null) {
          return rawQuery.apply(thisArg, args);
        }
        return Promise.resolve(swapPromise).then((swapped) => {
          if (swapped === text) return rawQuery.apply(thisArg, args);
          if (typeof first === 'string') {
            return rawQuery.apply(thisArg, [swapped, ...args.slice(1)]);
          }
          return rawQuery.apply(thisArg, [{ ...first, text: swapped }, ...args.slice(1)]);
        });
      }

      return rawQuery.apply(thisArg, args);
    };

    return new Proxy(client, {
      get(target, prop, receiver) {
        if (prop === 'query') {
          return (...args: any[]) => interceptQuery(target.query, target, args);
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
          return Promise.resolve(target.connect(...args)).then((client: any) => wrapClient(client));
        };
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
};
