/**
 * route — HTTP route resolution (Stage B)
 *
 * Consumes the database-side `services_public.resolve_http_route(host, path,
 * method)` contract and turns a request into a typed target:
 *
 *   host + path + method  ->  { target_kind, target_id }
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
 *   - function -> recognized; full sync/page/webhook dispatch is tracked
 *                 separately. Returns a typed 501 for now.
 *   - bucket   -> recognized; object serving is a follow-up. Typed 501.
 *   - service  -> recognized; the only target that may point at a customer-owned
 *                 workload in its own namespace. Typed 501.
 *
 * Safety: routes are unseeded by default (constructive-db PR #2217), so with no
 * matching route this middleware is a no-op and the request falls through to the
 * existing domain -> api resolution. Behavior is unchanged until routes exist.
 *
 * Mode (HTTP_ROUTE_RESOLVER_MODE, default "shadow"):
 *   - off    : middleware does nothing.
 *   - shadow : resolve + attach req.httpRoute + log, but never change behavior
 *              (used to verify parity against the legacy host-router before flip).
 *   - on     : dispatch on the resolved target.
 */

import './types';

import { Logger } from '@pgpmjs/logger';
import { NextFunction, Request, Response } from 'express';
import { Pool } from 'pg';
import { getPgPool } from 'pg-cache';

import { ApiOptions } from '../types';

const log = new Logger('route');

export type HttpRouteMode = 'off' | 'shadow' | 'on';

export type HttpRouteTargetKind =
  | 'api'
  | 'site'
  | 'service'
  | 'function'
  | 'bucket';

export interface HttpRouteMatch {
  routeId: string;
  databaseId: string;
  domainId: string;
  matchedPath: string;
  method: string | null;
  targetKind: HttpRouteTargetKind;
  targetId: string;
}

interface ResolveHttpRouteRow {
  route_id: string | null;
  database_id: string | null;
  domain_id: string | null;
  matched_path: string | null;
  method: string | null;
  target_kind: HttpRouteTargetKind | null;
  target_id: string | null;
}

const RESOLVE_ROUTE_SQL = `
  SELECT
    route_id, database_id, domain_id, matched_path, method, target_kind, target_id
  FROM services_public.resolve_http_route($1, $2, $3)
`;

// Postgres error codes that mean "this database predates the route resolver".
// Treated as "no route" so the request always falls back to the legacy path.
const RESOLVER_ABSENT_CODES = new Set(['42883', '42P01', '3F000', '42P04']);

const VALID_MODES: readonly HttpRouteMode[] = ['off', 'shadow', 'on'];

/**
 * Prototype feature flag. Read once from the environment in a single place;
 * this graduates into the typed env-options system when Stage B is promoted
 * out of prototype.
 */
export const getHttpRouteMode = (): HttpRouteMode => {
  const raw = (process.env.HTTP_ROUTE_RESOLVER_MODE ?? 'shadow').toLowerCase();
  return (VALID_MODES as readonly string[]).includes(raw)
    ? (raw as HttpRouteMode)
    : 'shadow';
};

const toMatch = (row: ResolveHttpRouteRow): HttpRouteMatch | null => {
  if (!row || !row.route_id || !row.target_kind || !row.target_id) return null;
  return {
    routeId: row.route_id,
    databaseId: row.database_id ?? '',
    domainId: row.domain_id ?? '',
    matchedPath: row.matched_path ?? '',
    method: row.method,
    targetKind: row.target_kind,
    targetId: row.target_id
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
    targetId: match.targetId
  });
};

const sendSitePlaceholder = (res: Response, match: HttpRouteMatch): void => {
  // Track 2 (sites SSR) lands the real rendering + deep-link/SEO contract.
  // Until then a resolved site target returns a typed, cacheable placeholder
  // rather than a 404, so routing is demonstrably wired end to end.
  res
    .status(200)
    .set('Content-Type', 'text/html; charset=utf-8')
    .set('X-Constructive-Route', `site:${match.targetId}`)
    .send(
      `<!doctype html><html><head><meta charset="utf-8"><title>site</title></head>` +
        `<body data-site-id="${match.targetId}">` +
        `<!-- resolved via services_public.resolve_http_route --></body></html>`
    );
};

/**
 * Express middleware. Mounted after domain parsing and before the api
 * middleware so an `api` target can hand the resolved api id downstream.
 */
export const createRouteMiddleware = (opts: ApiOptions) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const mode = getHttpRouteMode();
    if (mode === 'off' || opts.api?.enableServicesApi === false) {
      return next();
    }

    const host = req.get('host') ?? '';
    const match = await resolveHttpRoute(getPgPool(opts.pg), host, req.path, req.method);

    req.httpRoute = match ?? undefined;

    if (!match) return next();

    if (mode === 'shadow') {
      log.debug(
        `[shadow] ${req.method} ${host}${req.path} -> ${match.targetKind}:${match.targetId}`
      );
      return next();
    }

    // mode === 'on'
    switch (match.targetKind) {
    case 'api':
      req.routeApiId = match.targetId;
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
