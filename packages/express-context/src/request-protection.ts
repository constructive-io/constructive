/**
 * request-protection — platform bounds for the per-request protection settings.
 *
 * `database_settings` / `api_settings` carry a tenant's *preferences*; this
 * module owns the numbers the platform will actually honour. The platform
 * default and the hard ceiling are code constants rather than rows, so a
 * tenant can never widen a bound by writing metadata: a setting is only ever
 * read as a request to be *stricter* than the platform is.
 *
 *   effective = clamp(LEAST(api_override, database_setting) ?? default, floor, max)
 *
 * `LEAST` (not `COALESCE`) is what makes an API override lower-only: an API
 * that asks for a 60s statement timeout under a database that says 10s gets
 * 10s. The floor exists so a tenant cannot write a value that makes its own
 * API unusable (a 0ms statement timeout), and the ceiling so it cannot raise
 * one past what the shared cluster will absorb.
 */

// ─── Resolved shape ─────────────────────────────────────────────────────────

/** Every request-protection bound, resolved to a value the runtime enforces. */
export interface RequestProtection {
  /** `statement_timeout` for the request's transaction. */
  statementTimeoutMs: number;
  /** `idle_in_transaction_session_timeout` for the request's transaction. */
  idleInTransactionTimeoutMs: number;
  /** `lock_timeout` for the request's transaction. */
  lockTimeoutMs: number;
  /** In-flight requests allowed per tenant (not yet enforced). */
  maxConcurrentRequests: number;
  /** How long a request may wait for a concurrency slot (not yet enforced). */
  maxQueueWaitMs: number;
  /** Sustained request rate per tenant (not yet enforced). */
  rateLimitRpm: number;
  /** Burst allowance above `rateLimitRpm` (not yet enforced). */
  rateLimitBurst: number;
  /** Deepest selection set accepted in an operation. */
  maxQueryDepth: number;
  /** Largest static cost accepted in an operation. */
  maxQueryCost: number;
  /** Largest `first`/`last` accepted on a connection. */
  maxPageSize: number;
  /** Largest request body accepted. */
  maxRequestBytes: number;
  /** Whether the schema answers introspection queries. */
  enableIntrospection: boolean;
}

/** The numeric bounds — every field of {@link RequestProtection} but the flag. */
export type NumericProtectionKey = Exclude<keyof RequestProtection, 'enableIntrospection'>;

/** What the platform grants, and the window a tenant may move inside. */
export interface ProtectionBound {
  /** Applied when neither scope expresses a preference. */
  default: number;
  /** Lowest value a tenant can make effective — below this its API breaks. */
  floor: number;
  /** Highest value the platform honours, whatever metadata says. */
  max: number;
}

// ─── Platform bounds ────────────────────────────────────────────────────────

/**
 * The platform's own numbers. Deliberately constants: a ceiling stored next to
 * the value it caps is a ceiling a tenant can edit.
 */
export const PROTECTION_BOUNDS: Record<NumericProtectionKey, ProtectionBound> = {
  statementTimeoutMs: { default: 30_000, floor: 1_000, max: 120_000 },
  idleInTransactionTimeoutMs: { default: 60_000, floor: 1_000, max: 300_000 },
  lockTimeoutMs: { default: 5_000, floor: 100, max: 60_000 },
  maxConcurrentRequests: { default: 50, floor: 1, max: 500 },
  maxQueueWaitMs: { default: 5_000, floor: 0, max: 60_000 },
  rateLimitRpm: { default: 600, floor: 1, max: 60_000 },
  rateLimitBurst: { default: 60, floor: 1, max: 10_000 },
  maxQueryDepth: { default: 12, floor: 1, max: 50 },
  // Cost is measured in rows a document can pull (see ASSUMED_PAGE_SIZE), so
  // the default has to leave room for the nesting Graphile encourages while
  // still refusing the millions-of-rows shapes.
  maxQueryCost: { default: 1_000_000, floor: 100, max: 100_000_000 },
  maxPageSize: { default: 1_000, floor: 1, max: 10_000 },
  maxRequestBytes: { default: 1_000_000, floor: 1_024, max: 10_000_000 }
};

/**
 * What a connection with no `first`/`last` is charged.
 *
 * Such a field is unbounded in principle, so charging it the tenant's
 * `maxPageSize` would make a large ceiling self-defeating: raising the page
 * size a client *may* ask for would shrink the query it can write. A fixed
 * estimate keeps the two bounds independent.
 */
export const ASSUMED_PAGE_SIZE = 100;

/**
 * Introspection stays on until metadata says otherwise, and `platformAllows`
 * is the kill switch that takes it away cluster-wide regardless.
 *
 * The platform default is permissive here where the metadata default is not
 * (`database_settings.enable_introspection` is `NOT NULL DEFAULT false`) on
 * purpose: this value applies to a database that has expressed *no*
 * preference — typically one whose routing plane predates the column — and
 * silently disabling introspection for it would break GraphiQL and codegen for
 * every tenant the moment this code deployed, without anyone opting in.
 */
export const INTROSPECTION_BOUND = {
  default: true,
  platformAllows: true
};

/** What a database with no settings row gets. */
export const DEFAULT_REQUEST_PROTECTION: RequestProtection = resolveDefaults();

function resolveDefaults(): RequestProtection {
  const numeric = Object.fromEntries(
    Object.entries(PROTECTION_BOUNDS).map(([key, bound]) => [key, bound.default])
  ) as Record<NumericProtectionKey, number>;
  return { ...numeric, enableIntrospection: INTROSPECTION_BOUND.default };
}

// ─── Raw metadata shape ─────────────────────────────────────────────────────

/**
 * One scope's stored preferences. Every field is nullable — `null` is "no
 * preference at this scope", which is why the resolver never treats a missing
 * value as a zero.
 */
export interface RequestProtectionInput {
  statementTimeoutMs?: number | null;
  idleInTransactionTimeoutMs?: number | null;
  lockTimeoutMs?: number | null;
  maxConcurrentRequests?: number | null;
  maxQueueWaitMs?: number | null;
  rateLimitRpm?: number | null;
  rateLimitBurst?: number | null;
  maxQueryDepth?: number | null;
  maxQueryCost?: number | null;
  maxPageSize?: number | null;
  maxRequestBytes?: number | null;
  enableIntrospection?: boolean | null;
}

// ─── Resolution ─────────────────────────────────────────────────────────────

const clamp = (value: number, bound: ProtectionBound): number =>
  Math.min(Math.max(value, bound.floor), bound.max);

/** The stricter of two preferences, ignoring the scopes that expressed none. */
const strictest = (a: number | null | undefined, b: number | null | undefined): number | null => {
  const values = [a, b].filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  return values.length > 0 ? Math.min(...values) : null;
};

/**
 * Resolve the bounds a request runs under.
 *
 * @param database - the `database_settings` row for the tenant, if any
 * @param api - the `api_settings` overrides for the API the request arrived on
 */
export function resolveRequestProtection(
  database?: RequestProtectionInput | null,
  api?: RequestProtectionInput | null
): RequestProtection {
  const resolved = {} as Record<NumericProtectionKey, number>;
  for (const [name, bound] of Object.entries(PROTECTION_BOUNDS) as Array<
    [NumericProtectionKey, ProtectionBound]
  >) {
    const preferred = strictest(database?.[name], api?.[name]);
    resolved[name] = clamp(preferred ?? bound.default, bound);
  }

  // Lower-only applies to the flag too: an API may switch introspection off
  // for itself, never back on for a database that turned it off, and the
  // platform switch can only ever take it away.
  const enableIntrospection =
    (database?.enableIntrospection ?? INTROSPECTION_BOUND.default) &&
    (api?.enableIntrospection ?? true) &&
    INTROSPECTION_BOUND.platformAllows;

  return { ...resolved, enableIntrospection };
}

/**
 * The timeout GUCs as `SET LOCAL` pairs, for merging into a request's
 * pgSettings. PostgreSQL reads a bare integer for all three as milliseconds.
 */
export function protectionPgSettings(protection: RequestProtection): Record<string, string> {
  return {
    statement_timeout: String(protection.statementTimeoutMs),
    idle_in_transaction_session_timeout: String(protection.idleInTransactionTimeoutMs),
    lock_timeout: String(protection.lockTimeoutMs)
  };
}
