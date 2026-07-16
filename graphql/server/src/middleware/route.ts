/**
 * route — HTTP route resolution (Stage B)
 *
 * Consumes the database-side `services_public.resolve_http_route(host, path,
 * method)` contract and turns a request into a typed target:
 *
 *   host + path + method  ->  { target_kind, channel, api_id, site_id, ... }
 *
 * This is the request-plane counterpart to the routing table that lives in
 * constructive-db (PR #2214). The resolver decides *which typed thing* serves a
 * request; this middleware performs the dispatch:
 *
 *   - api      -> stash req.routeApiId; the api middleware resolves that api by
 *                 id and the request flows into the normal GraphQL path. This is
 *                 the host-only fast path (api on its own subdomain) — a single
 *                 default route per api, so there is no per-request path fan-out
 *                 cost unless a host is deliberately shared.
 *   - site     -> served by the site handler (Track 2 SSR lands the full
 *                 contract; this returns a typed placeholder for now).
 *   - function -> recognized (with channel); full sync/page/webhook dispatch is
 *                 tracked separately. Returns a typed 501 for now.
 *   - bucket   -> recognized; object serving is a follow-up. Typed 501.
 *   - service  -> recognized; the only target that may point at a customer-owned
 *                 workload in its own namespace. Typed 501.
 *
 * Safety: routes are unseeded by default (constructive-db PR #2217), so with no
 * matching route this middleware is a no-op and the request falls through to the
 * existing domain -> api resolution. Behavior is unchanged until routes exist.
 *
 * Mode (routing.mode, or HTTP_ROUTE_RESOLVER_MODE, default "shadow"):
 *   - off    : middleware does nothing.
 *   - shadow : resolve + attach req.httpRoute + log, but never change behavior
 *              (used to verify parity against the legacy host-router before flip).
 *   - on     : dispatch on the resolved target.
 *
 * Deployment environment (routing.env, or ROUTING_ENV, derived from NODE_ENV):
 *   - local      : developer machine. Ingress concerns that cannot work on
 *                  localhost (public DNS domain verification, ACME/HTTPS certs)
 *                  are simulated as satisfied, so a laptop serving plain HTTP is
 *                  never blocked. The request is always treated as secure.
 *   - production : secure context is derived from the request (X-Forwarded-Proto
 *                  / req.protocol), not assumed. Known local dev hosts are still
 *                  treated as secure so mixed setups don't break.
 */

import './types';

import type { HttpRouteMode, RoutingEnv } from '@constructive-io/graphql-types';
import { Logger } from '@pgpmjs/logger';
import { NextFunction, Request, Response } from 'express';
import { Pool } from 'pg';
import { getPgPool } from 'pg-cache';

import { ApiOptions } from '../types';

const log = new Logger('route');

// Re-export routing types so existing importers of this module keep working.
export type { HttpRouteMode, RoutingEnv };

export type HttpRouteTargetKind =
  | 'api'
  | 'site'
  | 'service'
  | 'function'
  | 'bucket';

export interface HttpRouteMatch {
  routeId: string;
  domainId: string;
  matchedPath: string;
  method: string | null;
  targetKind: HttpRouteTargetKind;
  channel: string | null;
  apiId: string | null;
  siteId: string | null;
  serviceId: string | null;
  functionDefinitionId: string | null;
  bucketId: string | null;
  routeScope: string;
}

interface ResolveHttpRouteRow {
  route_id: string | null;
  domain_id: string | null;
  matched_path: string | null;
  method: string | null;
  target_kind: HttpRouteTargetKind | null;
  channel: string | null;
  api_id: string | null;
  site_id: string | null;
  service_id: string | null;
  function_definition_id: string | null;
  bucket_id: string | null;
  route_scope: string | null;
}

const RESOLVE_ROUTE_SQL = `
  SELECT
    route_id, domain_id, matched_path, method, target_kind, channel,
    api_id, site_id, service_id, function_definition_id, bucket_id, route_scope
  FROM services_public.resolve_http_route($1, $2, $3)
`;

// Postgres error codes that mean "this database predates the route resolver".
// Treated as "no route" so the request always falls back to the legacy path.
const RESOLVER_ABSENT_CODES = new Set(['42883', '42P01', '3F000', '42P04']);

const VALID_MODES: readonly HttpRouteMode[] = ['off', 'shadow', 'on'];
const VALID_ENVS: readonly RoutingEnv[] = ['local', 'production'];

const DEFAULT_LOCAL_HOST_SUFFIXES = [
  'localhost',
  '127.0.0.1',
  '::1',
  '.local',
  '.test'
];

/**
 * Resolve the dispatch mode. Precedence: explicit HTTP_ROUTE_RESOLVER_MODE env
 * var (runtime override) > typed `routing.mode` config > default `shadow`.
 * The env var keeps highest precedence so operators (and tests) can flip mode
 * at runtime without rebuilding config.
 */
export const resolveRouteMode = (opts?: ApiOptions): HttpRouteMode => {
  const raw = (process.env.HTTP_ROUTE_RESOLVER_MODE ?? '').toLowerCase();
  if ((VALID_MODES as readonly string[]).includes(raw)) return raw as HttpRouteMode;
  const configured = opts?.routing?.mode;
  if (configured && (VALID_MODES as readonly string[]).includes(configured)) {
    return configured;
  }
  return 'shadow';
};

/** Back-compat alias (no-arg): reads env var / default only. */
export const getHttpRouteMode = (): HttpRouteMode => resolveRouteMode();

/**
 * Resolve the deployment environment. Precedence: ROUTING_ENV env var > typed
 * `routing.env` config > derived from NODE_ENV (production when
 * NODE_ENV==='production', otherwise local).
 */
export const resolveRoutingEnv = (opts?: ApiOptions): RoutingEnv => {
  const raw = (process.env.ROUTING_ENV ?? '').toLowerCase();
  if ((VALID_ENVS as readonly string[]).includes(raw)) return raw as RoutingEnv;
  const configured = opts?.routing?.env;
  if (configured && (VALID_ENVS as readonly string[]).includes(configured)) {
    return configured;
  }
  return process.env.NODE_ENV === 'production' ? 'production' : 'local';
};

const resolveLocalHostSuffixes = (opts?: ApiOptions): string[] => {
  const configured = opts?.routing?.localHostSuffixes;
  return configured && configured.length ? configured : DEFAULT_LOCAL_HOST_SUFFIXES;
};

/**
 * Normalize an incoming Host header for domain matching: lowercase and drop the
 * port. Without this a local request to `app.localhost:5678` would never match
 * a `app.localhost` domain row — the single biggest blocker to exercising
 * host-based routing on a developer machine.
 */
export const normalizeHost = (host: string): string => {
  const trimmed = (host ?? '').trim().toLowerCase();
  if (!trimmed) return '';
  // IPv6 literal, e.g. "[::1]:3000" -> "[::1]"
  if (trimmed.startsWith('[')) {
    const close = trimmed.indexOf(']');
    return close === -1 ? trimmed : trimmed.slice(0, close + 1);
  }
  const colon = trimmed.indexOf(':');
  return colon === -1 ? trimmed : trimmed.slice(0, colon);
};

/** Whether a normalized host is a known local development host. */
export const isLocalHost = (host: string, suffixes: string[]): boolean => {
  const bare = host.replace(/^\[|\]$/g, '');
  return suffixes.some((suffix) => {
    const s = suffix.toLowerCase();
    if (s.startsWith('.')) return host.endsWith(s);
    return host === s || bare === s || host.endsWith(`.${s}`);
  });
};

/**
 * Whether the request should be treated as a secure (TLS) context. In `local`
 * env TLS is simulated as satisfied; known local hosts are always secure; in
 * `production` the scheme is derived from X-Forwarded-Proto / req.protocol.
 */
export const isSecureRequest = (
  req: Request,
  env: RoutingEnv,
  host: string,
  suffixes: string[]
): boolean => {
  if (isLocalHost(host, suffixes)) return true;
  if (env === 'local') return true;
  const forwarded = (req.get('x-forwarded-proto') ?? '').split(',')[0].trim().toLowerCase();
  if (forwarded) return forwarded === 'https';
  return req.protocol === 'https' || req.secure === true;
};

const toMatch = (row: ResolveHttpRouteRow): HttpRouteMatch | null => {
  if (!row || !row.route_id || !row.target_kind) return null;
  return {
    routeId: row.route_id,
    domainId: row.domain_id ?? '',
    matchedPath: row.matched_path ?? '',
    method: row.method,
    targetKind: row.target_kind,
    channel: row.channel,
    apiId: row.api_id,
    siteId: row.site_id,
    serviceId: row.service_id,
    functionDefinitionId: row.function_definition_id,
    bucketId: row.bucket_id,
    routeScope: row.route_scope ?? ''
  };
};

/**
 * Resolve a request to a typed route target, or null when nothing matches.
 * Never throws: a missing resolver (un-migrated database) or any query error
 * resolves to null so the caller falls back to legacy behavior.
 */
export const resolveHttpRoute = async (
  pool: Pool,
  host: string,
  path: string,
  method: string
): Promise<HttpRouteMatch | null> => {
  if (!host) return null;
  try {
    const { rows } = await pool.query<ResolveHttpRouteRow>(RESOLVE_ROUTE_SQL, [
      host,
      path || '/',
      method || 'GET'
    ]);
    return rows[0] ? toMatch(rows[0]) : null;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code && RESOLVER_ABSENT_CODES.has(code)) {
      log.debug(`resolve_http_route unavailable (code=${code}); falling back`);
      return null;
    }
    log.debug(`resolve_http_route error: ${(err as Error)?.message}; falling back`);
    return null;
  }
};

const sendNotImplemented = (
  res: Response,
  match: HttpRouteMatch
): void => {
  res.status(501).json({
    error: 'Route target not yet served',
    targetKind: match.targetKind,
    channel: match.channel,
    routeScope: match.routeScope,
    ...(match.functionDefinitionId ? { functionDefinitionId: match.functionDefinitionId } : {}),
    ...(match.bucketId ? { bucketId: match.bucketId } : {}),
    ...(match.serviceId ? { serviceId: match.serviceId } : {})
  });
};

const sendSitePlaceholder = (res: Response, match: HttpRouteMatch): void => {
  // Track 2 (sites SSR) lands the real rendering + deep-link/SEO contract.
  // Until then a resolved site target returns a typed, cacheable placeholder
  // rather than a 404, so routing is demonstrably wired end to end.
  res
    .status(200)
    .set('Content-Type', 'text/html; charset=utf-8')
    .set('X-Constructive-Route', `site:${match.siteId ?? ''}`)
    .send(
      `<!doctype html><html><head><meta charset="utf-8"><title>site</title></head>` +
        `<body data-site-id="${match.siteId ?? ''}" data-route-scope="${match.routeScope}">` +
        `<!-- resolved via services_public.resolve_http_route --></body></html>`
    );
};

/**
 * Express middleware. Mounted after domain parsing and before the api
 * middleware so an `api` target can hand the resolved api id downstream.
 */
export const createRouteMiddleware = (opts: ApiOptions) => {
  const suffixes = resolveLocalHostSuffixes(opts);
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const mode = resolveRouteMode(opts);
    if (mode === 'off' || opts.api?.enableServicesApi === false) {
      return next();
    }

    const host = normalizeHost(req.get('host') ?? '');
    const env = resolveRoutingEnv(opts);
    const secure = isSecureRequest(req, env, host, suffixes);
    req.routeEnv = env;
    req.routeSecure = secure;
    res.set('X-Constructive-Route-Env', env);
    res.set('X-Constructive-Route-Secure', String(secure));

    const match = await resolveHttpRoute(getPgPool(opts.pg), host, req.path, req.method);

    req.httpRoute = match ?? undefined;

    if (!match) return next();

    if (mode === 'shadow') {
      log.debug(
        `[shadow] ${req.method} ${host}${req.path} -> ${match.targetKind}` +
          `${match.channel ? `:${match.channel}` : ''} (scope=${match.routeScope}, env=${env}, secure=${secure})`
      );
      return next();
    }

    // mode === 'on'
    switch (match.targetKind) {
    case 'api':
      if (match.apiId) {
        req.routeApiId = match.apiId;
      }
      return next();
    case 'site':
      return sendSitePlaceholder(res, match);
    case 'function':
    case 'bucket':
    case 'service':
      return sendNotImplemented(res, match);
    default:
      return next();
    }
  };
};
