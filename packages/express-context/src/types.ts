/**
 * Shared types for Constructive Express middleware.
 *
 * These types describe the resolved API structure, RLS module, auth settings,
 * database feature flags, and other config that middleware attaches to the
 * Express request. Extracted from graphql/server so any Express-based service
 * (PostGraphile, LLM sidecar, etc.) can share the same context.
 */

import type { Pool, PoolClient } from 'pg';

import type { BillingClient } from './billing-client';

// ─── API Structure ──────────────────────────────────────────────────────────

export interface DatabaseSettings {
  enableAggregates: boolean;
  enablePostgis: boolean;
  enableSearch: boolean;
  enableDirectUploads: boolean;
  enablePresignedUploads: boolean;
  enableManyToMany: boolean;
  enableConnectionFilter: boolean;
  enableLtree: boolean;
  enableLlm: boolean;
  enableRealtime: boolean;
  enableBulk: boolean;
  enableI18n: boolean;
}

export interface PubkeyChallengeSettings {
  schema: string;
  cryptoNetwork: string;
  signUpWithKey: string;
  signInRequestChallenge: string;
  signInRecordFailure: string;
  signInWithChallenge: string;
}

export interface WebauthnSettings {
  schema: string;
  credentialsSchema: string;
  sessionsSchema: string;
  sessionSecretsSchema: string;
  rpId: string;
  rpName: string;
  originAllowlist: string[];
  attestationType: string;
  requireUserVerification: boolean;
  residentKey: string;
  challengeExpirySeconds: number;
}

export interface RlsModule {
  authenticate: string;
  authenticateStrict: string;
  privateSchema: {
    schemaName: string;
  };
  publicSchema: {
    schemaName: string;
  };
  currentRole: string;
  currentRoleId: string;
  currentIpAddress: string;
  currentUserAgent: string;
}

export interface AuthSettings {
  cookieSecure?: boolean;
  cookieSamesite?: string;
  cookieDomain?: string | null;
  cookieHttponly?: boolean;
  cookieMaxAge?: string | null;
  cookiePath?: string;
  rememberMeDuration?: string | null;
  enableCaptcha?: boolean;
  captchaSiteKey?: string | null;
}

/**
 * Where a tenant's auth surface physically lives.
 *
 * Only schemas and relation names — the generated procedure names
 * (`sign_in_identity`, `sign_up_identity`, `verify_idp`, `link_identity`) are
 * fixed by the generators that emit them.
 */
export interface AuthSurface {
  /** Schema holding `sign_in_identity` / `sign_up_identity` / `verify_idp`. */
  privateSchema: string;
  /** Schema holding `link_identity` (an authenticated user action). */
  publicSchema: string;
  /** Schema holding the user-facing identifier views (`emails`, connected accounts). */
  identifiersPublicSchema: string;
  /** Physical name of the emails relation in that schema. */
  emailsTable: string;
  /** Physical name of the connected-accounts relation the owner can read. */
  connectedAccountsView: string;
}

/** Current Tenant's provisioned private unified-auth module surface. */
export interface SsoSurface {
  privateSchema: string;
}

/** One identity provider row, with its client secret resolved. */
export interface IdentityProviderConfig {
  id: string;
  /** The `:provider` path segment. */
  slug: string;
  kind: string;
  displayName: string;
  enabled: boolean;
  clientId: string;
  clientSecret: string | null;
  authorizationUrl: string | null;
  tokenUrl: string | null;
  userinfoUrl: string | null;
  issuerUrl: string | null;
  discoveryUrlOverride: string | null;
  discoveryDoc: Record<string, unknown> | null;
  /** Cached JWKS for id_token verification, refreshed by the callback leg. */
  jwks: Record<string, unknown> | null;
  jwksFetchedAt: Date | null;
  /** Additional audiences accepted in an id_token (native app clients). */
  acceptableClientIds: string[];
  scopes: string[];
  extraAuthorizationParams: Record<string, string>;
  emailOptional: boolean;
  allowLinkByEmail: boolean;
  skipNonceCheck: boolean;
  pkceEnabled: boolean;
}

export interface IdentityProvidersModule {
  /** Keyed by slug. */
  providers: Record<string, IdentityProviderConfig>;
  /** Physical location the providers were read from, for error context. */
  source: { schemaName: string; tableName: string };
}

export interface ApiStructure {
  apiId?: string;
  /** Trusted Site runtime identity emitted by scoped routing, when present. */
  siteId?: string;
  dbname: string;
  anonRole: string;
  roleName: string;
  schema: string[];
  rlsModule?: RlsModule;
  domains?: string[];
  databaseId?: string;
  isPublic?: boolean;
  authSettings?: AuthSettings;
  corsOrigins?: string[];
  databaseSettings?: DatabaseSettings;
  pubkeyChallengeSettings?: PubkeyChallengeSettings;
  webauthnSettings?: WebauthnSettings;
}

export type ApiError = { errorHtml: string };
export type ApiConfigResult = ApiStructure | ApiError | null;

// ─── Auth Token ─────────────────────────────────────────────────────────────

export type ConstructiveAPIToken = {
  id?: string;
  user_id?: string;
  principal_id?: string;
  session_id?: string;
  access_level?: string;
  kind?: string;
  [key: string]: unknown;
};

// ─── Billing & Metering Types ───────────────────────────────────────────────

export interface BillingConfig {
  publicSchema: string;
  privateSchema: string;
  recordUsageFunction: string;
  checkBillingQuotaFunction: string;
}

export interface InferenceLogConfig {
  schema: string;
  tableName: string;
}

export interface AgentChatConfig {
  schemaName: string;
  threadTableName: string | null;
  messageTableName: string | null;
  taskTableName: string | null;
}

/** One provisioned function-module scope's compute table names. */
export interface ComputeModuleConfig {
  schemaName: string;
  definitionsTableName: string;
  bindingsTableName: string;
  invocationsSchemaName: string;
  invocationsTableName: string;
  /**
   * Scope-key column of the invocations table, read from the metaschema
   * (`function_invocation_module.entity_field`): `database_id` for the
   * database scope, `NULL` for global scopes (platform/app), or the entity
   * key column for entity scopes. Consumers set this column on invocation
   * inserts instead of switching on scope name.
   */
  invocationsEntityField: string | null;
}

/**
 * All function modules provisioned on the database. A database may have one
 * per scope; every module is exposed and RLS governs access to each.
 */
export interface ComputeConfig {
  modules: ComputeModuleConfig[];
}

export interface LlmConfig {
  embeddingProvider: string;
  embeddingModel: string;
  embeddingBaseUrl: string;
  embeddingDimensions: number | null;
  chatProvider: string | null;
  chatModel: string | null;
  chatBaseUrl: string | null;
  rateLimitRpm: number | null;
  maxTokensPerRequest: number | null;
  ragContextLimit: number | null;
}

// ─── Module Types Map ───────────────────────────────────────────────────────

/**
 * Maps built-in loader names to their resolved types.
 *
 * This enables typed access via `useModule`:
 *   const rls = await ctx.useModule('rlsModule'); // typed as RlsModule | undefined
 *
 * Custom loaders (not in this map) return `unknown`.
 */
export interface BuiltinModuleMap {
  rlsModule: RlsModule;
  corsOrigins: string[];
  databaseSettings: DatabaseSettings;
  authSettings: AuthSettings;
  authSurface: AuthSurface;
  ssoSurface: SsoSurface;
  identityProviders: IdentityProvidersModule;
  pubkeyChallengeSettings: PubkeyChallengeSettings;
  webauthnSettings: WebauthnSettings;
  billing: BillingConfig;
  inferenceLog: InferenceLogConfig;
  agentChat: AgentChatConfig;
  llm: LlmConfig;
  compute: ComputeConfig;
}

// ─── Constructive Context ───────────────────────────────────────────────────

/**
 * Callback for executing queries within a tenant-scoped transaction
 * with proper pgSettings (role, claims, request_id).
 */
export type WithPgClient = <T>(
  fn: (client: PoolClient) => Promise<T>,
) => Promise<T>;

/**
 * The full tenant context attached to `req.constructive` by the middleware.
 * Any Express-based service can use this to interact with the tenant database.
 */
export interface ConstructiveContext {
  /** Resolved API structure (database, schemas, RLS, feature flags) */
  api: ApiStructure;
  /** Authenticated token (null for anonymous requests) */
  token: ConstructiveAPIToken | null;
  /** pgSettings for SET LOCAL in tenant transactions */
  pgSettings: Record<string, string>;
  /** Database UUID from the API resolver */
  databaseId: string | null;
  /** Trusted Site UUID from the resolved route; never inferred from Origin. */
  siteId: string | null;
  /** Authenticated user ID from the JWT token */
  userId: string | null;
  /** Per-request correlation ID for distributed tracing */
  requestId: string;
  /** Tenant database connection pool */
  pool: Pool;
  /** Execute a function within a tenant-scoped RLS transaction */
  withPgClient: WithPgClient;

  /**
   * Resolve a per-database module on demand (lazy, cached).
   *
   * Only fires the SQL query on the first call per databaseId per TTL window.
   * Subsequent calls return the cached result instantly.
   *
   * Built-in modules are typed:
   *   const rls = await ctx.useModule('rlsModule');     // RlsModule | undefined
   *   const auth = await ctx.useModule('authSettings');  // AuthSettings | undefined
   *
   * Custom modules return unknown:
   *   const custom = await ctx.useModule('myModule');    // unknown
   *
   * Returns undefined if:
   *   - No loader registry was provided to the middleware
   *   - The named loader isn't registered
   *   - The module isn't provisioned for this database
   */
  useModule: {
    <K extends keyof BuiltinModuleMap>(name: K): Promise<BuiltinModuleMap[K] | undefined>;
    (name: string): Promise<unknown>;
  };

  /**
   * Resolve a shared BillingClient bound to this request's entity.
   *
   * Returns a BillingClient with `checkQuota`, `recordUsage`, and
   * `logInference` methods. Returns null if billing_module is not
   * provisioned for this database or if no entity ID is available.
   *
   * Lazy: only resolves billing/inferenceLog loaders on first call.
   * Cached: subsequent calls return the same client instance.
   */
  useBilling(): Promise<BillingClient | null>;

  /**
   * Resolve per-database LLM provider config.
   *
   * Returns the resolved LlmConfig from the llm_module table, or null
   * if the module is not provisioned for this database. Callers should
   * fall back to environment variables when null.
   *
   * Lazy: only resolves the llm loader on first call.
   * Cached: subsequent calls return the same config instance.
   */
  useLlm(): Promise<LlmConfig | null>;
}

// ─── Express Augmentation ───────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      api?: ApiStructure;
      clientIp?: string;
      requestId?: string;
      token?: ConstructiveAPIToken;
      constructive?: ConstructiveContext;
    }
  }
}
