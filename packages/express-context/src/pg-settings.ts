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

import {
  DEFAULT_REQUEST_PROTECTION,
  protectionPgSettings,
  type RequestProtection
} from './request-protection';
import type { ApiStructure, ConstructiveAPIToken } from './types';

/** Trusted identity headers available only on private, server-to-server APIs. */
export interface PgSettingsHeaders {
  actorId?: string;
  entityId?: string;
  entityType?: string;
  organizationId?: string;
}

export interface PgSettingsInput {
  /** Resolved API config (provides role names, database_id) */
  api: ApiStructure;
  /** Authenticated token (null for anonymous) */
  token: ConstructiveAPIToken | null;
  /** Per-request correlation ID */
  requestId: string;
  /** Client IP address (from request-ip middleware) */
  clientIp?: string;
  /** Origin header captured by the server. */
  origin?: string;
  /** User-Agent header captured by the server. */
  userAgent?: string;
  /** Trusted device cookie resolved by authentication middleware. */
  deviceToken?: string;
  /** Per-request protection bounds, resolved and clamped by the platform. */
  requestProtection?: RequestProtection;
  /** Identity headers captured from the request; trusted only for private APIs. */
  headers?: PgSettingsHeaders;
}

/**
 * Build pgSettings from the resolved API + auth token.
 *
 * These settings are applied via SET LOCAL in each transaction,
 * making them available to RLS policies and SQL functions.
 */
export function buildPgSettings(input: PgSettingsInput): Record<string, string> {
  const {
    api,
    token,
    requestId,
    clientIp,
    origin,
    userAgent,
    deviceToken,
    requestProtection,
    headers
  } = input;
  const settings: Record<string, string> = {
    ...protectionPgSettings(requestProtection ?? DEFAULT_REQUEST_PROTECTION)
  };

  // Role: from token (authenticated), trusted private actor, or the API's
  // anonymous fallback. The private branch must be selected before the
  // anonymous database attribution is added.
  // Internal actor attribution is accepted only on a server-to-server API.
  // Public requests may carry these headers, but they cannot assert identity.
  if (token?.user_id) {
    settings['role'] = api.roleName || 'authenticated';
    settings['jwt.claims.user_id'] = token.user_id;

    if (token.id) {
      settings['jwt.claims.token_id'] = token.id;
    }
  } else if (api.isPublic === false && headers?.actorId) {
    settings['role'] = api.roleName || 'authenticated';
    settings['jwt.claims.user_id'] = headers.actorId;
    settings['jwt.claims.principal_id'] = headers.actorId;
    if (headers.entityId) {
      settings['jwt.claims.entity_id'] = headers.entityId;
    }
    if (headers.entityType) {
      settings['jwt.claims.entity_type'] = headers.entityType;
    }
    if (headers.organizationId) {
      settings['jwt.claims.organization_id'] = headers.organizationId;
    }
  } else {
    settings['role'] = api.anonRole || 'anonymous';

    // Preserve database attribution for anonymous requests. This is the
    // tenant's own identity and is unrelated to client-supplied headers.
    if (api.databaseId) {
      settings['jwt.claims.entity_id'] = api.databaseId;
      settings['jwt.claims.entity_type'] = 'database';
    }
  }

  // Session claims
  if (token?.session_id) {
    settings['jwt.claims.session_id'] = token.session_id;
  }

  // Session lineage (token exchange chains)
  if (token?.root_session_id) {
    settings['jwt.claims.root_session_id'] = token.root_session_id;
  }
  if (token?.parent_session_id) {
    settings['jwt.claims.parent_session_id'] = token.parent_session_id;
  }

  // Declared purpose of the credential
  if (token?.intent) {
    settings['jwt.claims.intent'] = token.intent;
  }

  // Credential metadata is available to tenant procedures for authorization
  // and audit decisions, while the role remains the API's resolved role.
  if (token?.access_level) {
    settings['jwt.claims.access_level'] = token.access_level;
  }
  if (token?.kind) {
    settings['jwt.claims.kind'] = token.kind;
  }

  // Principal identity (service accounts / bots)
  if (token?.user_id) {
    settings['jwt.claims.principal_id'] = token.principal_id || token.user_id;
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

  if (origin) {
    settings['jwt.claims.origin'] = origin;
  }
  if (userAgent) {
    settings['jwt.claims.user_agent'] = userAgent;
  }
  if (deviceToken) {
    settings['jwt.claims.device_token'] = deviceToken;
  }

  if (token?.access_level === 'read_only') {
    settings['default_transaction_read_only'] = 'on';
  }

  return settings;
}
