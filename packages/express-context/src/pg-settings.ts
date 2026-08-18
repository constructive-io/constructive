/**
 * Canonical PostgreSQL request settings.
 *
 * Every request receives a value-complete security context. Missing claims are
 * represented by empty strings so a reused execution path cannot accidentally
 * retain facts from an earlier request.
 */

import type { ApiStructure, ConstructiveAPIToken } from './types';

export const SECURITY_GUC_KEYS = [
  'jwt.claims.access_level',
  'jwt.claims.api_id',
  'jwt.claims.database_id',
  'jwt.claims.device_token',
  'jwt.claims.email',
  'jwt.claims.entity_id',
  'jwt.claims.ip_address',
  'jwt.claims.kind',
  'jwt.claims.organization_id',
  'jwt.claims.origin',
  'jwt.claims.principal_id',
  'jwt.claims.role_type',
  'jwt.claims.session_id',
  'jwt.claims.tenant_id',
  'jwt.claims.token_id',
  'jwt.claims.user_agent',
  'jwt.claims.user_email',
  'jwt.claims.user_id',
] as const;

export const REQUIRED_PG_SETTING_KEYS = [
  ...SECURITY_GUC_KEYS,
  'role',
  'request.id',
  'transaction_read_only',
  'search_path',
  'row_security',
] as const;

export type SecurityGucKey = (typeof SECURITY_GUC_KEYS)[number];
export type RequiredPgSettingKey = (typeof REQUIRED_PG_SETTING_KEYS)[number];
export type PgSettings = Record<string, string>;
export type TrustedPgClaims = Partial<Record<SecurityGucKey, string>>;

const SECURITY_GUC_KEY_SET: ReadonlySet<string> = new Set(SECURITY_GUC_KEYS);

function assertStringDataProperties(
  value: unknown,
  label: string
): asserts value is Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object of string data properties`);
  }

  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') {
      throw new TypeError(`${label} must not contain symbol properties`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      !descriptor ||
      !('value' in descriptor) ||
      typeof descriptor.value !== 'string'
    ) {
      throw new TypeError(`${label}.${key} must be a string data property`);
    }
  }
}

/** Validate the value shape accepted by Graphile's `withPgClient`. */
export function assertPgSettings(
  value: unknown,
  label = 'pgSettings'
): asserts value is PgSettings {
  assertStringDataProperties(value, label);
}

/** Validate that a request carries the complete canonical settings contract. */
export function assertCompletePgSettings(
  value: unknown,
  label = 'pgSettings'
): asserts value is PgSettings {
  assertStringDataProperties(value, label);
  for (const key of REQUIRED_PG_SETTING_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      throw new TypeError(`${label} is missing required setting '${key}'`);
    }
  }
}

function copyTrustedClaims(claims: unknown, label: string): TrustedPgClaims {
  assertStringDataProperties(claims, label);
  const copy: TrustedPgClaims = {};
  for (const key of Object.keys(claims)) {
    if (!SECURITY_GUC_KEY_SET.has(key)) {
      throw new TypeError(
        `${label} contains unsupported security GUC '${key}'`
      );
    }
    copy[key as SecurityGucKey] = claims[key];
  }
  return copy;
}

/** Add server-owned claims without admitting arbitrary PostgreSQL settings. */
export function withTrustedPgClaims(
  pgSettings: unknown,
  trustedClaims: unknown
): PgSettings {
  assertCompletePgSettings(pgSettings);
  return {
    ...pgSettings,
    ...copyTrustedClaims(trustedClaims, 'trustedClaims'),
  };
}

/** Copy a complete request context while changing only its execution role. */
export function withPgSettingsRole(
  pgSettings: unknown,
  role: string
): PgSettings {
  assertCompletePgSettings(pgSettings);
  if (typeof role !== 'string' || role.length === 0) {
    throw new TypeError('role must be a non-empty string');
  }
  return { ...pgSettings, role };
}

export interface PgSettingsInput {
  /** Resolved API config (provides role names, database_id, physical schemas). */
  api: ApiStructure;
  /** Authenticated token (null for anonymous). */
  token: ConstructiveAPIToken | null;
  /** Per-request correlation ID. */
  requestId: string;
  /** Client IP address resolved by server middleware. */
  clientIp?: string;
  /** Origin header captured by the server. */
  origin?: string;
  /** User-Agent header captured by the server. */
  userAgent?: string;
  /** Trusted device cookie resolved by authentication middleware. */
  deviceToken?: string;
  /** Server-derived claims for an existing trusted private surface. */
  trustedClaims?: TrustedPgClaims;
  /** Ordered, audited extension/shared schemas required by request SQL. */
  dependencySchemas?: readonly string[];
}

const quoteIdentifier = (identifier: string): string =>
  `"${identifier.replace(/"/g, '""')}"`;

function setClaim(
  settings: PgSettings,
  key: SecurityGucKey,
  value: unknown
): void {
  if (typeof value === 'string') settings[key] = value;
}

/** Build a fresh, complete PostgreSQL security context for one request. */
export function buildPgSettings(input: PgSettingsInput): PgSettings {
  const { api, token, requestId, clientIp, origin, userAgent, deviceToken } =
    input;
  const settings: PgSettings = Object.fromEntries(
    SECURITY_GUC_KEYS.map((key) => [key, ''])
  );

  settings.role = token?.user_id
    ? api.roleName || 'authenticated'
    : api.anonRole || 'anonymous';

  setClaim(settings, 'jwt.claims.token_id', token?.id);
  setClaim(settings, 'jwt.claims.user_id', token?.user_id);
  setClaim(settings, 'jwt.claims.session_id', token?.session_id);
  setClaim(settings, 'jwt.claims.access_level', token?.access_level);
  setClaim(settings, 'jwt.claims.kind', token?.kind);
  setClaim(settings, 'jwt.claims.email', token?.email);
  setClaim(settings, 'jwt.claims.user_email', token?.user_email);
  setClaim(settings, 'jwt.claims.entity_id', token?.entity_id);
  setClaim(settings, 'jwt.claims.organization_id', token?.organization_id);
  setClaim(settings, 'jwt.claims.tenant_id', token?.tenant_id);
  setClaim(settings, 'jwt.claims.role_type', token?.role_type);
  setClaim(
    settings,
    'jwt.claims.principal_id',
    token?.principal_id || token?.user_id
  );
  setClaim(settings, 'jwt.claims.database_id', api.databaseId);
  setClaim(settings, 'jwt.claims.api_id', api.apiId);
  setClaim(settings, 'jwt.claims.ip_address', clientIp);
  setClaim(settings, 'jwt.claims.origin', origin);
  setClaim(settings, 'jwt.claims.user_agent', userAgent);
  setClaim(settings, 'jwt.claims.device_token', deviceToken);

  if (input.trustedClaims !== undefined) {
    Object.assign(
      settings,
      copyTrustedClaims(input.trustedClaims, 'trustedClaims')
    );
  }

  settings['request.id'] = requestId;
  settings.transaction_read_only =
    token?.access_level === 'read_only' ? 'on' : 'off';
  settings.row_security = 'on';

  const physicalSchemas = [...(input.dependencySchemas ?? []), ...api.schema];
  settings.search_path = [
    'pg_catalog',
    ...[...new Set(physicalSchemas)].map(quoteIdentifier),
  ].join(', ');

  assertCompletePgSettings(settings, 'built pgSettings');
  return settings;
}
