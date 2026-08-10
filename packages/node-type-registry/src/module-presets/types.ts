/**
 * A preset is a named, curated bundle of Constructive modules intended for a
 * recognizable app shape (internal tool, consumer email login, SSO-only B2B,
 * etc.). Presets are metadata only — passing `preset.modules` to
 * `provision_database_modules(v_modules => ...)` is what actually installs
 * them.
 *
 * Presets are NOT node types. They are a sibling concept: node types are
 * reusable building blocks used inside a blueprint; presets are starting
 * points for which modules to install before any blueprint is authored.
 *
 * All module names match the `rls_module`, `user_auth_module`, ... names in
 * `metaschema_generators.provision_database_modules` in constructive-db.
 *
 * Naming uses snake_case for module names to match the server-side SQL
 * convention, and kebab-ish `auth:hardened` for preset names because they're
 * user-facing labels, not identifiers.
 */

/**
 * Options shared by every module entry. All fields map 1:1 to what
 * `metaschema_generators.provision_database_modules` reads from
 * `e->'options'` for the module. NULL/omitted fields use module defaults.
 */
export type BaseModuleOptions = {
  /** Scope for scoped modules: 'app' (membership_type = app) or 'org' (per-org). Some modules also accept 'platform'. */
  scope?: 'app' | 'org' | 'platform';
  /** Table-name prefix for the module's generated tables. */
  prefix?: string;
  /** API name used in GraphQL naming (module-specific default, e.g. 'usage', 'admin', 'agent'). */
  api_name?: string;
  /** Override for the module's public schema name. */
  public_schema_name?: string;
  /** Override for the module's private schema name. */
  private_schema_name?: string;
  /** RLS policy overrides for the module's tables. */
  policies?: unknown[];
};

/**
 * One row of a billing module's default meter catalog. Seeded into the
 * generated `meter_defaults` table as data fixtures at provision time
 * (the same pattern `membership_defaults` uses). Rows are catalog
 * metadata only — they grant no capacity; capacity is a plan concern
 * (`plan_meter_limits` → `balances`).
 */
export type DefaultMeterCatalogEntry = {
  /** Meter identifier, e.g. 'universal', 'compute', 'cupcakes_ordered'. */
  slug: string;
  /** Human-readable label. */
  display_name?: string;
  /** Meter kind, e.g. 'quota', 'boolean', 'usage_pool'. */
  meter_type?: string;
  /** Suggested plan limit; -1 = unlimited. */
  default_plan_limit?: number;
  /** Unit of measure, e.g. 'credits', 'tokens'. */
  unit?: string;
  /** Parent pool for the credits waterfall; null for the top-level backstop. */
  category_meter?: string | null;
  /** Soft-disable toggle. Defaults to true. */
  is_active?: boolean;
};

/**
 * Billing module options. `default_meter_catalog` supplies the rows seeded
 * into the generated `meter_defaults` table; omitted → clean empty catalog.
 * The platform preset passes the standard taxonomy (universal + compute,
 * inference, storage, database, transfer, messaging, infrastructure);
 * customer apps pass nothing or their own domain catalog.
 */
export type BillingModuleOptions = BaseModuleOptions & {
  default_meter_catalog?: DefaultMeterCatalogEntry[];
};

/** Agent module feature flags (see BlueprintAgentConfig for the blueprint-level shape). */
export type AgentModuleOptions = BaseModuleOptions & {
  has_plans?: boolean;
  has_resources?: boolean;
  has_agents?: boolean;
  resources?: unknown[];
};

/** Storage module feature flags. */
export type StorageModuleOptions = BaseModuleOptions & {
  has_versioning?: boolean;
  has_content_hash?: boolean;
  has_custom_keys?: boolean;
  has_audit_log?: boolean;
  has_confirm_upload?: boolean;
  /** Postgres interval literal, e.g. '30 seconds'. */
  confirm_upload_delay?: string;
  /** Provision a temp staging bucket that stages for the private default. */
  staging?: boolean;
  /** Staged-file expiry window; implies staging. Postgres interval literal, e.g. '24 hours'. */
  staging_ttl?: string;
};

/** One rung of a trust ladder: the row set provisioning inserts per rung. */
export type TrustLadderRung = {
  /** Level earned when the requirement is met, e.g. 'established'. */
  level: string;
  /** Event type counted towards the rung. Mutually exclusive with `metric`. */
  event?: string;
  /** Computed signal compared against `required_count`, e.g. 'account_age_days'. */
  metric?: string;
  /** Threshold; defaults to 1. */
  required_count?: number;
  /** Level capability the rung projects into. Omitted → a badge with no bit. */
  capability?: string;
  /** Rungs sharing a group are alternatives: any one of them satisfies it. */
  group?: string;
  /** Default-limit name this rung deposits credits into when earned. */
  limit?: string;
  /** Credits deposited into `limit`; defaults to 0. */
  limit_amount?: number;
};

/** One baseline limit: a row in the tenant's default-limits table. */
export type LimitDefault = {
  /** Limit name, referenced by ladder rungs that pay credits into it. */
  name: string;
  /** Baseline allowance before any credits are earned. */
  max: number;
};

/**
 * Limits module options. `limit_defaults` is the baseline capacity seeded at
 * provision: omitted seeds nothing (every tenant before this option), a string
 * names a `limit_defaults` preset in the content catalog (`'metered'` is the
 * conservative baseline the metered trust ladder pays credits into — a catalog
 * row like any other, retunable without a code change), and an array is the
 * caller's own document inline.
 */
export type LimitsModuleOptions = BaseModuleOptions & {
  limit_defaults?: string | LimitDefault[];
};

/**
 * Events module options. `trust_ladder` is the trust content seeded at
 * provision: omitted seeds nothing, a string names a `trust_ladder` preset in
 * the content catalog — `'humanity'` for evidence that an account belongs to
 * someone (one reachable channel plus onboarding), `'metered'` where capacity
 * is rationed (reachable → accountable → established → trusted → vouched) —
 * and an array is the caller's own ladder inline. App scope only — an entity ladder belongs to an
 * organization that does not exist at provision time.
 */
export type EventsModuleOptions = BaseModuleOptions & {
  trust_ladder?: string | TrustLadderRung[];
};

/** Catalog module options (table-name overrides). */
export type CatalogModuleOptions = BaseModuleOptions & {
  domains_table_name?: string;
  apis_table_name?: string;
  sites_table_name?: string;
};

/** Merkle store module options (prefix is required by provisioning). */
export type MerkleStoreModuleOptions = BaseModuleOptions & {
  prefix: string;
  function_prefix?: string;
  capability_key?: string;
};

/**
 * A module list entry: a plain module name, a known-module tuple with typed
 * options, or a generic tuple for modules without a dedicated options type.
 */
export type ModuleEntry =
  | string
  | ['billing_module', BillingModuleOptions]
  | ['agent_module', AgentModuleOptions]
  | ['storage_module', StorageModuleOptions]
  | ['events_module', EventsModuleOptions]
  | ['limits_module', LimitsModuleOptions]
  | ['catalog_module', CatalogModuleOptions]
  | ['merkle_store_module', MerkleStoreModuleOptions]
  | [string, BaseModuleOptions & Record<string, unknown>];

/** A named, curated bundle of Constructive modules — see the module doc above. */
export interface ModulePreset {
  /** Preset identifier, e.g. 'auth:hardened'. Stable, used as a key in CLI/codegen. */
  name: string;

  /** Human-readable label for UIs, e.g. 'Email + Password'. */
  display_name: string;

  /** One-line pitch — what this preset is in plain English. */
  summary: string;

  /**
   * Longer narrative. Explain when you'd reach for this preset, what it
   * implies architecturally, and what tradeoffs the user is accepting by
   * choosing it. Keep to a few paragraphs max.
   */
  description: string;

  /** Concrete scenarios this preset fits well. */
  good_for: string[];

  /** Scenarios where this preset is the wrong choice — point at alternatives. */
  not_for: string[];

  /**
   * List of modules to install. Each entry is either a plain module name
   * (string) or a Babel-style tuple [name, options] for modules that need
   * configuration. Module names must match the canonical list accepted by
   * `metaschema_generators.provision_database_modules` in constructive-db.
   * Order doesn't matter — provisioning resolves dependencies.
   *
   * Examples:
   *   'users_module'                              — simple module
   *   ['capabilities_module', { scope: 'app' }]    — scoped module
   *   ['agent_module', { scope: 'app', has_plans: true }]        — feature-flagged module
   */
  modules: ModuleEntry[];

  /** Whether this preset is reserved for the platform control plane. */
  internal?: boolean;

  /**
   * Optional: name(s) of presets this one builds on. Purely documentary —
   * not enforced at runtime, `modules` must still be the full flat list.
   */
  extends?: string[];
}
