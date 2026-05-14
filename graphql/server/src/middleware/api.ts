import { getNodeEnv } from '@pgpmjs/env';
import { Logger } from '@pgpmjs/logger';
import { svcCache } from '@pgpmjs/server-utils';
import { parseUrl } from '@constructive-io/url-domains';
import { NextFunction, Request, Response } from 'express';
import { Pool } from 'pg';
import { getPgPool } from 'pg-cache';

import errorPage50x from '../errors/50x';
import errorPage404Message from '../errors/404-message';
import { ApiConfigResult, ApiError, ApiOptions, ApiStructure, AuthSettings, DatabaseSettings, PubkeyChallengeSettings, RlsModule, WebauthnSettings } from '../types';
import './types';

const log = new Logger('api');
const isDev = () => getNodeEnv() === 'development';

// =============================================================================
// SQL Queries
// =============================================================================

const DOMAIN_LOOKUP_SQL = `
  SELECT 
    a.id as api_id,
    a.database_id,
    a.dbname,
    a.role_name,
    a.anon_role,
    a.is_public,
    COALESCE(array_agg(s.schema_name) FILTER (WHERE s.schema_name IS NOT NULL), '{}') as schemas
  FROM services_public.domains d
  JOIN services_public.apis a ON d.api_id = a.id
  LEFT JOIN services_public.api_schemas aps ON a.id = aps.api_id
  LEFT JOIN metaschema_public.schema s ON aps.schema_id = s.id
  WHERE d.domain = $1 
    AND (($2::text IS NULL AND d.subdomain IS NULL) OR d.subdomain = $2)
    AND a.is_public = $3
  GROUP BY a.id, a.database_id, a.dbname, a.role_name, a.anon_role, a.is_public
  LIMIT 1
`;

const API_NAME_LOOKUP_SQL = `
  SELECT 
    a.id as api_id,
    a.database_id,
    a.dbname,
    a.role_name,
    a.anon_role,
    a.is_public,
    COALESCE(array_agg(s.schema_name) FILTER (WHERE s.schema_name IS NOT NULL), '{}') as schemas
  FROM services_public.apis a
  LEFT JOIN services_public.api_schemas aps ON a.id = aps.api_id
  LEFT JOIN metaschema_public.schema s ON aps.schema_id = s.id
  WHERE a.database_id = $1 
    AND a.name = $2
    AND a.is_public = $3
  GROUP BY a.id, a.database_id, a.dbname, a.role_name, a.anon_role, a.is_public
  LIMIT 1
`;

const API_LIST_SQL = `
  SELECT 
    a.id,
    a.database_id,
    a.name,
    a.dbname,
    a.role_name,
    a.anon_role,
    a.is_public,
    COALESCE(
      json_agg(
        json_build_object('domain', d.domain, 'subdomain', d.subdomain)
      ) FILTER (WHERE d.domain IS NOT NULL),
      '[]'
    ) as domains
  FROM services_public.apis a
  LEFT JOIN services_public.domains d ON a.id = d.api_id
  WHERE a.is_public = $1
  GROUP BY a.id, a.database_id, a.name, a.dbname, a.role_name, a.anon_role, a.is_public
  LIMIT 100
`;

const RLS_MODULE_SQL = `
  SELECT data
  FROM services_public.api_modules
  WHERE api_id = $1 AND name = 'rls_module'
  LIMIT 1
`;

const RLS_SETTINGS_SQL = `
  SELECT
    auth_schema.schema_name AS authenticate_schema,
    role_schema.schema_name AS role_schema,
    auth_fn.name AS authenticate,
    auth_strict_fn.name AS authenticate_strict,
    role_fn.name AS current_role,
    role_id_fn.name AS current_role_id,
    ua_fn.name AS current_user_agent,
    ip_fn.name AS current_ip_address
  FROM services_public.rls_settings rs
  LEFT JOIN metaschema_public.schema auth_schema ON rs.authenticate_schema_id = auth_schema.id
  LEFT JOIN metaschema_public.schema role_schema ON rs.role_schema_id = role_schema.id
  LEFT JOIN metaschema_public.function auth_fn ON rs.authenticate_function_id = auth_fn.id
  LEFT JOIN metaschema_public.function auth_strict_fn ON rs.authenticate_strict_function_id = auth_strict_fn.id
  LEFT JOIN metaschema_public.function role_fn ON rs.current_role_function_id = role_fn.id
  LEFT JOIN metaschema_public.function role_id_fn ON rs.current_role_id_function_id = role_id_fn.id
  LEFT JOIN metaschema_public.function ua_fn ON rs.current_user_agent_function_id = ua_fn.id
  LEFT JOIN metaschema_public.function ip_fn ON rs.current_ip_address_function_id = ip_fn.id
  WHERE rs.database_id = $1
  LIMIT 1
`;

/**
 * Discover auth settings table location via public metaschema tables.
 * Joins sessions_module with metaschema_public.schema to resolve
 * the schema name + table name without touching private schemas.
 */
const AUTH_SETTINGS_DISCOVERY_SQL = `
  SELECT s.schema_name, sm.auth_settings_table AS table_name
  FROM metaschema_modules_public.sessions_module sm
  JOIN metaschema_public.schema s ON s.id = sm.schema_id
  LIMIT 1
`;

/**
 * Query auth settings from the discovered table.
 * Schema and table name are resolved dynamically from metaschema modules.
 */
const AUTH_SETTINGS_SQL = (schemaName: string, tableName: string) => `
  SELECT
    cookie_secure,
    cookie_samesite,
    cookie_domain,
    cookie_httponly,
    cookie_max_age,
    cookie_path,
    remember_me_duration,
    enable_captcha,
    captcha_site_key
  FROM "${schemaName}"."${tableName}"
  LIMIT 1
`;

const CORS_SETTINGS_SQL = `
  SELECT allowed_origins
  FROM services_public.cors_settings
  WHERE database_id = $1 AND api_id = $2
  LIMIT 1
`;

const CORS_SETTINGS_DB_DEFAULT_SQL = `
  SELECT allowed_origins
  FROM services_public.cors_settings
  WHERE database_id = $1 AND api_id IS NULL
  LIMIT 1
`;

const CORS_MODULE_SQL = `
  SELECT data
  FROM services_public.api_modules
  WHERE api_id = $1 AND name = 'cors'
  LIMIT 1
`;

const PUBKEY_SETTINGS_SQL = `
  SELECT
    s.schema_name AS schema,
    ps.crypto_network,
    sign_up_fn.name AS sign_up_with_key,
    sign_in_req_fn.name AS sign_in_request_challenge,
    sign_in_fail_fn.name AS sign_in_record_failure,
    sign_in_fn.name AS sign_in_with_challenge
  FROM services_public.pubkey_settings ps
  LEFT JOIN metaschema_public.schema s ON ps.schema_id = s.id
  LEFT JOIN metaschema_public.function sign_up_fn ON ps.sign_up_with_key_function_id = sign_up_fn.id
  LEFT JOIN metaschema_public.function sign_in_req_fn ON ps.sign_in_request_challenge_function_id = sign_in_req_fn.id
  LEFT JOIN metaschema_public.function sign_in_fail_fn ON ps.sign_in_record_failure_function_id = sign_in_fail_fn.id
  LEFT JOIN metaschema_public.function sign_in_fn ON ps.sign_in_with_challenge_function_id = sign_in_fn.id
  WHERE ps.database_id = $1
  LIMIT 1
`;

const PUBKEY_MODULE_SQL = `
  SELECT data
  FROM services_public.api_modules
  WHERE api_id = $1 AND name = 'pubkey_challenge'
  LIMIT 1
`;

const WEBAUTHN_SETTINGS_SQL = `
  SELECT
    s.schema_name AS schema,
    cred_s.schema_name AS credentials_schema,
    sess_s.schema_name AS sessions_schema,
    sec_s.schema_name AS session_secrets_schema,
    ws.rp_id,
    ws.rp_name,
    ws.origin_allowlist,
    ws.attestation_type,
    ws.require_user_verification,
    ws.resident_key,
    ws.challenge_expiry_seconds
  FROM services_public.webauthn_settings ws
  LEFT JOIN metaschema_public.schema s ON ws.schema_id = s.id
  LEFT JOIN metaschema_public.schema cred_s ON ws.credentials_schema_id = cred_s.id
  LEFT JOIN metaschema_public.schema sess_s ON ws.sessions_schema_id = sess_s.id
  LEFT JOIN metaschema_public.schema sec_s ON ws.session_secrets_schema_id = sec_s.id
  WHERE ws.database_id = $1
  LIMIT 1
`;

const DATABASE_SETTINGS_SQL = `
  SELECT
    ds.enable_aggregates,
    ds.enable_postgis,
    ds.enable_search,
    ds.enable_direct_uploads,
    ds.enable_presigned_uploads,
    ds.enable_many_to_many,
    ds.enable_connection_filter,
    ds.enable_ltree,
    ds.enable_llm,
    ds.enable_bulk,
    COALESCE(aps.enable_aggregates, ds.enable_aggregates) AS resolved_enable_aggregates,
    COALESCE(aps.enable_postgis, ds.enable_postgis) AS resolved_enable_postgis,
    COALESCE(aps.enable_search, ds.enable_search) AS resolved_enable_search,
    COALESCE(aps.enable_direct_uploads, ds.enable_direct_uploads) AS resolved_enable_direct_uploads,
    COALESCE(aps.enable_presigned_uploads, ds.enable_presigned_uploads) AS resolved_enable_presigned_uploads,
    COALESCE(aps.enable_many_to_many, ds.enable_many_to_many) AS resolved_enable_many_to_many,
    COALESCE(aps.enable_connection_filter, ds.enable_connection_filter) AS resolved_enable_connection_filter,
    COALESCE(aps.enable_ltree, ds.enable_ltree) AS resolved_enable_ltree,
    COALESCE(aps.enable_llm, ds.enable_llm) AS resolved_enable_llm,
    COALESCE(aps.enable_realtime, ds.enable_realtime) AS resolved_enable_realtime,
    COALESCE(aps.enable_bulk, ds.enable_bulk) AS resolved_enable_bulk
  FROM services_public.database_settings ds
  LEFT JOIN services_public.api_settings aps ON ds.database_id = aps.database_id AND aps.api_id = $2
  WHERE ds.database_id = $1
  LIMIT 1
`;

// =============================================================================
// Types
// =============================================================================

interface ApiRow {
  api_id: string;
  database_id: string;
  dbname: string;
  role_name: string;
  anon_role: string;
  is_public: boolean;
  schemas: string[];
}

interface RlsModuleData {
  authenticate: string;
  authenticate_strict: string;
  authenticate_schema: string;
  role_schema: string;
  current_role: string;
  current_role_id: string;
  current_ip_address: string;
  current_user_agent: string;
}

interface AuthSettingsRow {
  cookie_secure: boolean;
  cookie_samesite: string;
  cookie_domain: string | null;
  cookie_httponly: boolean;
  cookie_max_age: string | null;
  cookie_path: string;
  remember_me_duration: string | null;
  enable_captcha: boolean;
  captcha_site_key: string | null;
}

interface RlsModuleRow {
  data: RlsModuleData | null;
}

interface CorsSettingsRow {
  allowed_origins: string[];
}

interface CorsModuleRow {
  data: { urls: string[] } | null;
}

interface PubkeySettingsRow {
  schema: string;
  crypto_network: string;
  sign_up_with_key: string;
  sign_in_request_challenge: string;
  sign_in_record_failure: string;
  sign_in_with_challenge: string;
}

interface PubkeyModuleRow {
  data: {
    schema: string;
    crypto_network: string;
    sign_up_with_key: string;
    sign_in_request_challenge: string;
    sign_in_record_failure: string;
    sign_in_with_challenge: string;
  } | null;
}

interface WebauthnSettingsRow {
  schema: string;
  credentials_schema: string;
  sessions_schema: string;
  session_secrets_schema: string;
  rp_id: string;
  rp_name: string;
  origin_allowlist: string[];
  attestation_type: string;
  require_user_verification: boolean;
  resident_key: string;
  challenge_expiry_seconds: number;
}

interface DatabaseSettingsRow {
  resolved_enable_aggregates: boolean;
  resolved_enable_postgis: boolean;
  resolved_enable_search: boolean;
  resolved_enable_direct_uploads: boolean;
  resolved_enable_presigned_uploads: boolean;
  resolved_enable_many_to_many: boolean;
  resolved_enable_connection_filter: boolean;
  resolved_enable_ltree: boolean;
  resolved_enable_llm: boolean;
  resolved_enable_realtime: boolean;
  resolved_enable_bulk: boolean;
}

interface ApiListRow {
  id: string;
  database_id: string;
  name: string;
  dbname: string;
  role_name: string;
  anon_role: string;
  is_public: boolean;
  domains: Array<{ domain: string; subdomain: string | null }>;
}

interface ResolveContext {
  opts: ApiOptions;
  pool: Pool;
  domain: string;
  subdomain: string | null;
  cacheKey: string;
  headers: {
    schemata?: string;
    apiName?: string;
    metaSchema?: string;
    databaseId?: string;
  };
}

type ResolutionMode = 
  | 'services-disabled'
  | 'schemata-header'
  | 'api-name-header'
  | 'meta-schema-header'
  | 'domain-lookup';

// =============================================================================
// Helpers
// =============================================================================

const isApiError = (result: ApiConfigResult): result is ApiError =>
  !!result && typeof (result as ApiError).errorHtml === 'string';

const parseCommaSeparatedHeader = (value: string): string[] =>
  value.split(',').map((s) => s.trim()).filter(Boolean);

const getUrlDomains = (req: Request): { domain: string; subdomains: string[] } => {
  const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const parsed = parseUrl(fullUrl);
  return {
    domain: parsed.domain ?? '',
    subdomains: parsed.subdomains ?? [],
  };
};

export const getSubdomain = (subdomains: string[]): string | null => {
  const filtered = subdomains.filter((name) => name !== 'www');
  return filtered.length ? filtered.join('.') : null;
};

export const getSvcKey = (opts: ApiOptions, req: Request): string => {
  const { domain, subdomains } = getUrlDomains(req);
  const baseKey = subdomains.filter((n) => n !== 'www').concat(domain).join('.');

  if (opts.api?.isPublic === false) {
    if (req.get('X-Api-Name')) {
      return `api:${req.get('X-Database-Id')}:${req.get('X-Api-Name')}`;
    }
    if (req.get('X-Schemata')) {
      return `schemata:${req.get('X-Database-Id')}:${req.get('X-Schemata')}`;
    }
    if (req.get('X-Meta-Schema')) {
      return `metaschema:api:${req.get('X-Database-Id')}`;
    }
  }
  return baseKey;
};

const toRlsModule = (row: RlsModuleRow | null): RlsModule | undefined => {
  if (!row?.data) return undefined;
  const d = row.data;
  return {
    authenticate: d.authenticate,
    authenticateStrict: d.authenticate_strict,
    privateSchema: {
      schemaName: d.authenticate_schema,
    },
    publicSchema: {
      schemaName: d.role_schema,
    },
    currentRole: d.current_role,
    currentRoleId: d.current_role_id,
    currentIpAddress: d.current_ip_address,
    currentUserAgent: d.current_user_agent,
  };
};

const toRlsModuleFromSettings = (row: RlsModuleData | null): RlsModule | undefined => {
  if (!row) return undefined;
  // If metaschema_public.function rows are missing (e.g. trigger was skipped
  // during migration), the LEFT JOINs resolve NULL.  Return undefined so the
  // caller falls back to the legacy api_modules lookup.
  if (!row.authenticate || !row.authenticate_schema) return undefined;
  return {
    authenticate: row.authenticate,
    authenticateStrict: row.authenticate_strict,
    privateSchema: {
      schemaName: row.authenticate_schema,
    },
    publicSchema: {
      schemaName: row.role_schema,
    },
    currentRole: row.current_role,
    currentRoleId: row.current_role_id,
    currentIpAddress: row.current_ip_address,
    currentUserAgent: row.current_user_agent,
  };
};

const toAuthSettings = (row: AuthSettingsRow | null): AuthSettings | undefined => {
  if (!row) return undefined;
  return {
    cookieSecure: row.cookie_secure,
    cookieSamesite: row.cookie_samesite,
    cookieDomain: row.cookie_domain,
    cookieHttponly: row.cookie_httponly,
    cookieMaxAge: row.cookie_max_age,
    cookiePath: row.cookie_path,
    rememberMeDuration: row.remember_me_duration,
    enableCaptcha: row.enable_captcha,
    captchaSiteKey: row.captcha_site_key,
  };
};

interface ResolvedSettings {
  rlsModule?: RlsModule;
  authSettingsRow?: AuthSettingsRow | null;
  corsOrigins?: string[];
  databaseSettings?: DatabaseSettings;
  pubkeyChallengeSettings?: PubkeyChallengeSettings;
  webauthnSettings?: WebauthnSettings;
}

const toApiStructure = (row: ApiRow, opts: ApiOptions, settings: ResolvedSettings = {}): ApiStructure => ({
  apiId: row.api_id,
  dbname: row.dbname || opts.pg?.database || '',
  anonRole: row.anon_role || 'anon',
  roleName: row.role_name || 'authenticated',
  schema: row.schemas || [],
  apiModules: [],
  rlsModule: settings.rlsModule,
  domains: [],
  databaseId: row.database_id,
  isPublic: row.is_public,
  authSettings: toAuthSettings(settings.authSettingsRow ?? null),
  corsOrigins: settings.corsOrigins,
  databaseSettings: settings.databaseSettings,
  pubkeyChallengeSettings: settings.pubkeyChallengeSettings,
  webauthnSettings: settings.webauthnSettings,
});

const createAdminStructure = (
  opts: ApiOptions,
  schemas: string[],
  databaseId?: string
): ApiStructure => ({
  dbname: opts.pg?.database ?? '',
  anonRole: 'administrator',
  roleName: 'administrator',
  schema: schemas,
  apiModules: [],
  domains: [],
  databaseId,
  isPublic: false,
});

// =============================================================================
// Database Queries
// =============================================================================

const validateSchemata = async (pool: Pool, schemas: string[]): Promise<string[]> => {
  const result = await pool.query(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name = ANY($1::text[])`,
    [schemas]
  );
  return result.rows.map((row: { schema_name: string }) => row.schema_name);
};

const queryByDomain = async (
  pool: Pool,
  domain: string,
  subdomain: string | null,
  isPublic: boolean
): Promise<ApiRow | null> => {
  const result = await pool.query<ApiRow>(DOMAIN_LOOKUP_SQL, [domain, subdomain, isPublic]);
  return result.rows[0] ?? null;
};

const queryByApiName = async (
  pool: Pool,
  databaseId: string,
  name: string,
  isPublic: boolean
): Promise<ApiRow | null> => {
  const result = await pool.query<ApiRow>(API_NAME_LOOKUP_SQL, [databaseId, name, isPublic]);
  return result.rows[0] ?? null;
};

const queryApiList = async (pool: Pool, isPublic: boolean): Promise<ApiListRow[]> => {
  const result = await pool.query<ApiListRow>(API_LIST_SQL, [isPublic]);
  return result.rows;
};

const queryRlsSettings = async (pool: Pool, databaseId: string): Promise<RlsModule | undefined> => {
  try {
    const result = await pool.query<RlsModuleData>(RLS_SETTINGS_SQL, [databaseId]);
    return toRlsModuleFromSettings(result.rows[0] ?? null);
  } catch (e: any) {
    log.warn(`[rls-settings] Failed to load RLS settings: ${e.message}`);
    return undefined;
  }
};

const queryRlsModuleLegacy = async (pool: Pool, apiId: string): Promise<RlsModule | undefined> => {
  const result = await pool.query<RlsModuleRow>(RLS_MODULE_SQL, [apiId]);
  return toRlsModule(result.rows[0] ?? null);
};

const queryRlsModule = async (pool: Pool, databaseId: string, apiId: string): Promise<RlsModule | undefined> => {
  const fromSettings = await queryRlsSettings(pool, databaseId);
  if (fromSettings) return fromSettings;
  return queryRlsModuleLegacy(pool, apiId);
};

// -- CORS --

const queryCorsSettings = async (pool: Pool, databaseId: string, apiId?: string): Promise<string[] | undefined> => {
  try {
    if (apiId) {
      const perApi = await pool.query<CorsSettingsRow>(CORS_SETTINGS_SQL, [databaseId, apiId]);
      if (perApi.rows[0]) return perApi.rows[0].allowed_origins;
    }
    const dbDefault = await pool.query<CorsSettingsRow>(CORS_SETTINGS_DB_DEFAULT_SQL, [databaseId]);
    return dbDefault.rows[0]?.allowed_origins;
  } catch (e: any) {
    log.warn(`[cors-settings] Failed to load CORS settings: ${e.message}`);
    return undefined;
  }
};

const queryCorsModuleLegacy = async (pool: Pool, apiId: string): Promise<string[] | undefined> => {
  const result = await pool.query<CorsModuleRow>(CORS_MODULE_SQL, [apiId]);
  return result.rows[0]?.data?.urls;
};

const queryCorsOrigins = async (pool: Pool, databaseId: string, apiId?: string): Promise<string[] | undefined> => {
  const fromSettings = await queryCorsSettings(pool, databaseId, apiId);
  if (fromSettings) return fromSettings;
  if (apiId) return queryCorsModuleLegacy(pool, apiId);
  return undefined;
};

// -- Pubkey --

const toPubkeyChallengeSettings = (row: PubkeySettingsRow | null): PubkeyChallengeSettings | undefined => {
  if (!row?.schema || !row?.sign_up_with_key) return undefined;
  return {
    schema: row.schema,
    cryptoNetwork: row.crypto_network,
    signUpWithKey: row.sign_up_with_key,
    signInRequestChallenge: row.sign_in_request_challenge,
    signInRecordFailure: row.sign_in_record_failure,
    signInWithChallenge: row.sign_in_with_challenge,
  };
};

const toPubkeyChallengeFromModule = (row: PubkeyModuleRow | null): PubkeyChallengeSettings | undefined => {
  if (!row?.data?.schema) return undefined;
  const d = row.data;
  return {
    schema: d.schema,
    cryptoNetwork: d.crypto_network,
    signUpWithKey: d.sign_up_with_key,
    signInRequestChallenge: d.sign_in_request_challenge,
    signInRecordFailure: d.sign_in_record_failure,
    signInWithChallenge: d.sign_in_with_challenge,
  };
};

const queryPubkeySettings = async (pool: Pool, databaseId: string): Promise<PubkeyChallengeSettings | undefined> => {
  try {
    const result = await pool.query<PubkeySettingsRow>(PUBKEY_SETTINGS_SQL, [databaseId]);
    return toPubkeyChallengeSettings(result.rows[0] ?? null);
  } catch (e: any) {
    log.warn(`[pubkey-settings] Failed to load pubkey challenge settings: ${e.message}`);
    return undefined;
  }
};

const queryPubkeyModuleLegacy = async (pool: Pool, apiId: string): Promise<PubkeyChallengeSettings | undefined> => {
  const result = await pool.query<PubkeyModuleRow>(PUBKEY_MODULE_SQL, [apiId]);
  return toPubkeyChallengeFromModule(result.rows[0] ?? null);
};

const queryPubkeyChallenge = async (pool: Pool, databaseId: string, apiId?: string): Promise<PubkeyChallengeSettings | undefined> => {
  const fromSettings = await queryPubkeySettings(pool, databaseId);
  if (fromSettings) return fromSettings;
  if (apiId) return queryPubkeyModuleLegacy(pool, apiId);
  return undefined;
};

// -- WebAuthn --

const toWebauthnSettings = (row: WebauthnSettingsRow | null): WebauthnSettings | undefined => {
  if (!row?.schema) return undefined;
  return {
    schema: row.schema,
    credentialsSchema: row.credentials_schema,
    sessionsSchema: row.sessions_schema,
    sessionSecretsSchema: row.session_secrets_schema,
    rpId: row.rp_id,
    rpName: row.rp_name,
    originAllowlist: row.origin_allowlist,
    attestationType: row.attestation_type,
    requireUserVerification: row.require_user_verification,
    residentKey: row.resident_key,
    challengeExpirySeconds: row.challenge_expiry_seconds,
  };
};

const queryWebauthnSettings = async (pool: Pool, databaseId: string): Promise<WebauthnSettings | undefined> => {
  try {
    const result = await pool.query<WebauthnSettingsRow>(WEBAUTHN_SETTINGS_SQL, [databaseId]);
    return toWebauthnSettings(result.rows[0] ?? null);
  } catch (e: any) {
    log.warn(`[webauthn-settings] Failed to load webauthn settings: ${e.message}`);
    return undefined;
  }
};

// -- Database Settings (feature flags) --

const toDatabaseSettings = (row: DatabaseSettingsRow | null): DatabaseSettings | undefined => {
  if (!row) return undefined;
  return {
    enableAggregates: row.resolved_enable_aggregates,
    enablePostgis: row.resolved_enable_postgis,
    enableSearch: row.resolved_enable_search,
    enableDirectUploads: row.resolved_enable_direct_uploads,
    enablePresignedUploads: row.resolved_enable_presigned_uploads,
    enableManyToMany: row.resolved_enable_many_to_many,
    enableConnectionFilter: row.resolved_enable_connection_filter,
    enableLtree: row.resolved_enable_ltree,
    enableLlm: row.resolved_enable_llm,
    enableRealtime: row.resolved_enable_realtime,
    enableBulk: row.resolved_enable_bulk,
  };
};

const queryDatabaseSettings = async (pool: Pool, databaseId: string, apiId?: string): Promise<DatabaseSettings | undefined> => {
  try {
    const result = await pool.query<DatabaseSettingsRow>(DATABASE_SETTINGS_SQL, [databaseId, apiId ?? null]);
    return toDatabaseSettings(result.rows[0] ?? null);
  } catch (e: any) {
    log.warn(`[database-settings] Failed to load database settings: ${e.message}`);
    return undefined;
  }
};

/**
 * Load server-relevant auth settings from the tenant DB.
 * Discovers the auth settings table dynamically by joining
 * metaschema_modules_public.sessions_module with metaschema_public.schema
 * (both public schemas). Fails gracefully if modules or table don't exist yet.
 */
const queryAuthSettings = async (
  opts: ApiOptions,
  dbname: string
): Promise<AuthSettingsRow | null> => {
  try {
    const tenantPool = getPgPool({ ...opts.pg, database: dbname });

    // Discover the auth settings schema + table name from public metaschema tables
    const discovery = await tenantPool.query<{ schema_name: string; table_name: string }>(AUTH_SETTINGS_DISCOVERY_SQL);
    const resolved = discovery.rows[0];
    if (!resolved) {
      log.debug('[auth-settings] No sessions_module row found in tenant DB');
      return null;
    }

    // Query the discovered auth settings table
    const result = await tenantPool.query<AuthSettingsRow>(AUTH_SETTINGS_SQL(resolved.schema_name, resolved.table_name));
    return result.rows[0] ?? null;
  } catch (e: any) {
    // Table/module may not exist yet if the 2FA migration hasn't been applied
    log.debug(`[auth-settings] Failed to load auth settings: ${e.message}`);
    return null;
  }
};

// =============================================================================
// Resolution Logic
// =============================================================================

const determineMode = (ctx: ResolveContext): ResolutionMode => {
  const { opts, headers } = ctx;
  
  if (opts.api?.enableServicesApi === false) return 'services-disabled';
  if (opts.api?.isPublic === false) {
    if (headers.schemata) return 'schemata-header';
    if (headers.apiName) return 'api-name-header';
    if (headers.metaSchema) return 'meta-schema-header';
  }
  return 'domain-lookup';
};

const resolveServicesDisabled = (ctx: ResolveContext): ApiStructure => {
  const { opts } = ctx;
  return {
    dbname: opts.pg?.database ?? '',
    anonRole: opts.api?.anonRole ?? '',
    roleName: opts.api?.roleName ?? '',
    schema: opts.api?.exposedSchemas ?? [],
    apiModules: [],
    domains: [],
    databaseId: opts.api?.defaultDatabaseId,
    isPublic: false,
  };
};

const resolveSchemataHeader = async (
  ctx: ResolveContext,
  validatedSchemas: string[]
): Promise<ApiConfigResult> => {
  const { opts, headers } = ctx;
  const headerSchemas = parseCommaSeparatedHeader(headers.schemata!);
  const validSet = new Set(validatedSchemas);
  const validHeaderSchemas = headerSchemas.filter((s) => validSet.has(s));

  if (validHeaderSchemas.length === 0) {
    return { errorHtml: 'No valid schemas found for the supplied X-Schemata header.' };
  }

  return createAdminStructure(opts, validHeaderSchemas, headers.databaseId);
};

const resolveApiNameHeader = async (ctx: ResolveContext): Promise<ApiStructure | null> => {
  const { opts, pool, headers } = ctx;
  if (!headers.databaseId) return null;

  const isPublic = opts.api?.isPublic ?? false;
  const row = await queryByApiName(pool, headers.databaseId, headers.apiName!, isPublic);
  
  if (!row) {
    log.debug(`[api-name-lookup] No API found for databaseId=${headers.databaseId} name=${headers.apiName}`);
    return null;
  }

  const [rlsModule, authSettingsRow, corsOrigins, databaseSettings, pubkeyChallengeSettings, webauthnSettings] = await Promise.all([
    queryRlsModule(pool, row.database_id, row.api_id),
    queryAuthSettings(opts, row.dbname),
    queryCorsOrigins(pool, row.database_id, row.api_id),
    queryDatabaseSettings(pool, row.database_id, row.api_id),
    queryPubkeyChallenge(pool, row.database_id, row.api_id),
    queryWebauthnSettings(pool, row.database_id),
  ]);
  log.debug(`[api-name-lookup] resolved schemas: [${row.schemas?.join(', ')}], rlsModule: ${rlsModule ? 'found' : 'none'}, authSettings: ${authSettingsRow ? 'found' : 'none'}`);
  return toApiStructure(row, opts, { rlsModule, authSettingsRow, corsOrigins, databaseSettings, pubkeyChallengeSettings, webauthnSettings });
};

const resolveMetaSchemaHeader = (
  ctx: ResolveContext,
  validatedSchemas: string[]
): ApiStructure => {
  return createAdminStructure(ctx.opts, validatedSchemas, ctx.headers.databaseId);
};

const resolveDomainLookup = async (ctx: ResolveContext): Promise<ApiStructure | null> => {
  const { opts, pool, domain, subdomain } = ctx;
  const isPublic = opts.api?.isPublic ?? false;

  log.debug(`[domain-lookup] domain=${domain} subdomain=${subdomain} isPublic=${isPublic}`);
  
  const row = await queryByDomain(pool, domain, subdomain, isPublic);
  
  if (!row) {
    log.debug(`[domain-lookup] No API found for domain=${domain} subdomain=${subdomain}`);
    return null;
  }

  const [rlsModule, authSettingsRow, corsOrigins, databaseSettings, pubkeyChallengeSettings, webauthnSettings] = await Promise.all([
    queryRlsModule(pool, row.database_id, row.api_id),
    queryAuthSettings(opts, row.dbname),
    queryCorsOrigins(pool, row.database_id, row.api_id),
    queryDatabaseSettings(pool, row.database_id, row.api_id),
    queryPubkeyChallenge(pool, row.database_id, row.api_id),
    queryWebauthnSettings(pool, row.database_id),
  ]);
  log.debug(`[domain-lookup] resolved schemas: [${row.schemas?.join(', ')}], rlsModule: ${rlsModule ? 'found' : 'none'}, authSettings: ${authSettingsRow ? 'found' : 'none'}`);
  return toApiStructure(row, opts, { rlsModule, authSettingsRow, corsOrigins, databaseSettings, pubkeyChallengeSettings, webauthnSettings });
};

const buildDevFallbackError = async (
  ctx: ResolveContext,
  req: Request
): Promise<ApiError | null> => {
  if (getNodeEnv() !== 'development') return null;

  const isPublic = ctx.opts.api?.isPublic ?? false;
  const apis = await queryApiList(ctx.pool, isPublic);
  if (!apis.length) return null;

  const host = req.get('host') || '';
  const portMatch = host.match(/:(\d+)$/);
  const port = portMatch ? portMatch[1] : '';

  const apiCards = apis.map((api) => {
    const domains = api.domains.length
      ? api.domains.map((d) => {
          const hostname = d.subdomain ? `${d.subdomain}.${d.domain}` : d.domain;
          const url = port ? `http://${hostname}:${port}/graphiql` : `http://${hostname}/graphiql`;
          return `<a href="${url}" style="color:#01A1FF;text-decoration:none;font-weight:500" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${hostname}</a>`;
        }).join('<span style="color:#D4DCEA;margin:0 4px">·</span>')
      : '<span style="color:#8E9398;font-style:italic;font-size:11px">no domains</span>';

    const badge = api.is_public
      ? '<span style="color:#01A1FF;font-size:10px;font-weight:500">public</span>'
      : '<span style="color:#8E9398;font-size:10px">private</span>';

    return `
      <div style="background:#fff;border-radius:8px;padding:10px 14px;margin-bottom:6px;box-shadow:0 1px 3px rgba(0,0,0,0.04);border:1px solid #E8ECF0;display:flex;align-items:center;gap:12px;transition:background 0.15s" onmouseover="this.style.background='#FAFBFC'" onmouseout="this.style.background='#fff'">
        <div style="flex:1;min-width:0;display:flex;align-items:center;gap:8px;font-size:13px">
          <span style="font-weight:600;color:#232323;white-space:nowrap">${api.name}</span>
          <span style="color:#D4DCEA">→</span>
          ${domains}
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          <span style="color:#8E9398;font-size:11px;font-family:'SF Mono',Monaco,monospace">${api.dbname}</span>
          ${badge}
        </div>
      </div>`;
  }).join('');

  return {
    errorHtml: `
      <div style="text-align:left;max-width:600px;margin:0 auto">
        <p style="color:#8E9398;font-size:11px;margin-bottom:10px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px">Available APIs</p>
        ${apiCards}
      </div>`,
  };
};

// =============================================================================
// Main Resolution Function
// =============================================================================

export const getApiConfig = async (
  opts: ApiOptions,
  req: Request
): Promise<ApiConfigResult> => {
  const pool = getPgPool(opts.pg);
  const { domain, subdomains } = getUrlDomains(req);
  const subdomain = getSubdomain(subdomains);
  const cacheKey = getSvcKey(opts, req);

  req.svc_key = cacheKey;

  // Check cache first
  if (svcCache.has(cacheKey)) {
    log.debug(`Cache HIT for key=${cacheKey}`);
    return svcCache.get(cacheKey) as ApiStructure;
  }

  log.debug(`Cache MISS for key=${cacheKey}, resolving API`);

  const ctx: ResolveContext = {
    opts,
    pool,
    domain,
    subdomain,
    cacheKey,
    headers: {
      schemata: req.get('X-Schemata'),
      apiName: req.get('X-Api-Name'),
      metaSchema: req.get('X-Meta-Schema'),
      databaseId: req.get('X-Database-Id'),
    },
  };

  // Validate schemas upfront for modes that need them
  const apiOpts = opts.api || {};
  const headerSchemas = ctx.headers.schemata ? parseCommaSeparatedHeader(ctx.headers.schemata) : [];
  const candidateSchemas =
    apiOpts.isPublic === false && headerSchemas.length
      ? [...new Set([...(apiOpts.metaSchemas || []), ...headerSchemas])]
      : apiOpts.metaSchemas || [];
  
  const validatedSchemas = await validateSchemata(pool, candidateSchemas);

  if (validatedSchemas.length === 0) {
    const source = headerSchemas.length ? headerSchemas : apiOpts.metaSchemas || [];
    const label = headerSchemas.length ? 'X-Schemata' : 'metaSchemas';
    const error = new Error(`No valid schemas found. Configured ${label}: [${source.join(', ')}]`) as Error & { code?: string };
    error.code = 'NO_VALID_SCHEMAS';
    throw error;
  }

  // Route to appropriate resolver based on mode
  const mode = determineMode(ctx);
  let result: ApiConfigResult;

  switch (mode) {
    case 'services-disabled':
      result = resolveServicesDisabled(ctx);
      break;

    case 'schemata-header':
      result = await resolveSchemataHeader(ctx, validatedSchemas);
      break;

    case 'api-name-header':
      result = await resolveApiNameHeader(ctx);
      break;

    case 'meta-schema-header':
      result = resolveMetaSchemaHeader(ctx, validatedSchemas);
      break;

    case 'domain-lookup':
      result = await resolveDomainLookup(ctx);
      if (!result && apiOpts.isPublic) {
        const fallback = await buildDevFallbackError(ctx, req);
        if (fallback) return fallback;
      }
      break;
  }

  // Cache successful results
  if (result && !isApiError(result)) {
    svcCache.set(cacheKey, result);
  }

  return result;
};

// =============================================================================
// Express Middleware
// =============================================================================

export const createApiMiddleware = (opts: ApiOptions) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    log.debug(`[api-middleware] ${req.method} ${req.path}`);

    // Fast path: services disabled
    if (opts.api?.enableServicesApi === false) {
      req.api = resolveServicesDisabled({
        opts,
        pool: null as unknown as Pool,
        domain: '',
        subdomain: null,
        cacheKey: 'meta-api-off',
        headers: {},
      });
      req.databaseId = req.api.databaseId;
      req.svc_key = 'meta-api-off';
      return next();
    }

    try {
      const apiConfig = await getApiConfig(opts, req);

      if (isApiError(apiConfig)) {
        res.status(404).send(errorPage404Message('API not found', apiConfig.errorHtml));
        return;
      }

      if (!apiConfig) {
        res.status(404).send(errorPage404Message('API service not found for the given domain/subdomain.'));
        return;
      }

      req.api = apiConfig;
      req.databaseId = apiConfig.databaseId;
      log.debug(`Resolved API: db=${apiConfig.dbname}, schemas=[${apiConfig.schema?.join(', ')}]`);
      next();
    } catch (error: unknown) {
      const err = error as Error & { code?: string };

      if (err.code === 'NO_VALID_SCHEMAS') {
        res.status(404).send(errorPage404Message(err.message));
        return;
      }

      if (err.message?.includes('does not exist')) {
        res.status(404).send(errorPage404Message("The resource you're looking for does not exist."));
        return;
      }

      log.error('API middleware error:', err);
      res.status(500).send(errorPage50x);
    }
  };
};
