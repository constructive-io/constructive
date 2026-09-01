/**
 * pg-settings — Build pgSettings from resolved API + auth token
 *
 * pgSettings are key-value pairs passed to PostgreSQL via SET LOCAL
 * within each transaction. They carry the JWT claims, role, database_id,
 * and request_id so that RLS policies and SQL functions can reference
 * the current user context via `current_setting('jwt.claims.user_id')`.
 *
 * This module extracts the pgSettings construction so it's reusable
 * across the PostGraphile server, LLM sidecar, or any Express service.
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
  'jwt.claims.user_id'
] as const;

export type SecurityGucKey = typeof SECURITY_GUC_KEYS[number];

const SECURITY_GUC_KEY_SET: ReadonlySet<string> = new Set(SECURITY_GUC_KEYS);

const applyTrustedClaims = (
  settings: Record<string, string>,
  trustedClaims: PgSettingsInput['trustedClaims']
): void => {
  if (trustedClaims === undefined) return;
  if (
    typeof trustedClaims !== 'object'
    || trustedClaims === null
    || Array.isArray(trustedClaims)
  ) {
    throw new TypeError('trustedClaims must be an object of security GUC strings');
  }

  for (const key of Reflect.ownKeys(trustedClaims)) {
    if (typeof key !== 'string' || !SECURITY_GUC_KEY_SET.has(key)) {
      throw new TypeError(`trustedClaims contains unsupported security GUC '${String(key)}'`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(trustedClaims, key);
    if (!descriptor || !('value' in descriptor) || typeof descriptor.value !== 'string') {
      throw new TypeError(`trustedClaims.${key} must be a string data property`);
    }
    settings[key] = descriptor.value;
  }
};

export interface PgSettingsInput {
  /** Resolved API config (provides role names, database_id) */
  api: ApiStructure;
  /** Authenticated token (null for anonymous) */
  token: ConstructiveAPIToken | null;
  /** Per-request correlation ID */
  requestId: string;
  /** Client IP address (from request-ip middleware) */
  clientIp?: string;
  /** Origin header captured by the server */
  origin?: string;
  /** User-Agent header captured by the server */
  userAgent?: string;
  /** Trusted device cookie resolved by authentication middleware */
  deviceToken?: string;
  /** Server-derived claims for trusted private surfaces */
  trustedClaims?: Partial<Record<SecurityGucKey, string>>;
  /** Ordered, audited extension/shared schemas needed for runtime operators and functions. */
  dependencySchemas?: readonly string[];
}

const quoteIdentifier = (identifier: string): string =>
  `"${identifier.replace(/"/g, '""')}"`;

/**
 * Build pgSettings from the resolved API + auth token.
 *
 * These settings are applied via SET LOCAL in each transaction,
 * making them available to RLS policies and SQL functions.
 */
export function buildPgSettings(input: PgSettingsInput): Record<string, string> {
  const { api, token, requestId, clientIp, origin, userAgent, deviceToken } = input;
  const settings: Record<string, string> = Object.fromEntries(
    SECURITY_GUC_KEYS.map((key) => [key, ''])
  );

  // Role: from token (authenticated) or api (anonymous fallback)
  if (token?.user_id) {
    settings['role'] = api.roleName || 'authenticated';
    settings['jwt.claims.user_id'] = token.user_id;
  } else {
    settings['role'] = api.anonRole || 'anonymous';
  }

  if (token?.id) settings['jwt.claims.token_id'] = token.id;
  if (token?.access_level) settings['jwt.claims.access_level'] = token.access_level;
  if (token?.kind) settings['jwt.claims.kind'] = token.kind;
  if (typeof token?.email === 'string') settings['jwt.claims.email'] = token.email;
  if (typeof token?.user_email === 'string') settings['jwt.claims.user_email'] = token.user_email;
  if (typeof token?.entity_id === 'string') settings['jwt.claims.entity_id'] = token.entity_id;
  if (typeof token?.organization_id === 'string') settings['jwt.claims.organization_id'] = token.organization_id;
  if (typeof token?.tenant_id === 'string') settings['jwt.claims.tenant_id'] = token.tenant_id;
  if (typeof token?.role_type === 'string') settings['jwt.claims.role_type'] = token.role_type;

  // Session claims
  if (token?.session_id) {
    settings['jwt.claims.session_id'] = token.session_id;
  }

  // Principal identity (service accounts / bots)
  if (token?.principal_id || token?.user_id) {
    settings['jwt.claims.principal_id'] = token.principal_id || token.user_id || '';
  }

  // Database context
  if (api.databaseId) {
    settings['jwt.claims.database_id'] = api.databaseId;
  }

  // API provenance — which API surface this request arrived through.
  // Derived server-side by resolving the hostname through the scoped routing
  // plane (resolve_route -> api_id); never taken from client-supplied headers,
  // body, or token payload.
  if (api.apiId) {
    settings['jwt.claims.api_id'] = api.apiId;
  }

  // Distributed tracing
  settings['request.id'] = requestId;

  // Client metadata (for audit functions)
  if (clientIp) {
    settings['jwt.claims.ip_address'] = clientIp;
  }

  if (origin) settings['jwt.claims.origin'] = origin;
  if (userAgent) settings['jwt.claims.user_agent'] = userAgent;
  if (deviceToken) settings['jwt.claims.device_token'] = deviceToken;
  // This is an exported boundary and TypeScript types do not constrain runtime
  // objects. Reject extra keys/accessors so a future caller cannot smuggle
  // role, search_path, or other session state through this trusted seam.
  applyTrustedClaims(settings, input.trustedClaims);

  // Explicitly undo read-only state inherited from a previous request.
  settings['transaction_read_only'] = token?.access_level === 'read_only' ? 'on' : 'off';
  // Pin name resolution after SET ROLE. DISCARD ALL resets to role/database
  // defaults, which are mutable control-plane state and must not route a
  // request into an unapproved schema.
  settings['search_path'] = [
    'pg_catalog',
    ...[...new Set(input.dependencySchemas ?? [])].map(quoteIdentifier),
    ...api.schema.map(quoteIdentifier)
  ].join(', ');
  // Owners and BYPASSRLS logins are rejected separately, but this makes the
  // intended RLS state explicit for every transaction and clears prior state.
  settings['row_security'] = 'on';

  return settings;
}
