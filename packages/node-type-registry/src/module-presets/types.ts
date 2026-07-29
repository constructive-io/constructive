/**
 * A preset is a named, curated bundle of Constructive modules intended for a
 * recognizable app shape (internal tool, consumer email login, SSO-only B2B,
 * etc.). Presets are metadata only — passing `preset.modules` to the
 * provisioning function is what actually installs them.
 *
 * Presets are NOT node types. They are a sibling concept: node types are
 * reusable building blocks used inside a blueprint; presets are starting
 * points for which modules to install before any blueprint is authored.
 *
 * All module names match the canonical provisioning module names.
 *
 * Naming uses snake_case for module names to match the server-side SQL
 * convention, and kebab-ish `auth:hardened` for preset names because they're
 * user-facing labels, not identifiers.
 */

/**
 * Options shared by every module entry. All fields map 1:1 to what each
 * module reads from `e->'options'`. NULL/omitted fields use module defaults.
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
  permission_key?: string;
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
   * the canonical provisioning module list.
   * Order doesn't matter — provisioning resolves dependencies.
   *
   * Examples:
   *   'users_module'                              — simple module
   *   ['permissions_module', { scope: 'app' }]    — scoped module
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
