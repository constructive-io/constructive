/**
 * HTTP route resolution configuration.
 *
 * These options control the Stage B request-plane router (the middleware that
 * consumes `services_public.resolve_http_route`). They graduate the prototype
 * `HTTP_ROUTE_RESOLVER_MODE` env flag into typed configuration and add a
 * deployment-environment switch so local development behaves differently from
 * production without needing real DNS, domain verification, or TLS.
 */

/**
 * Route resolver dispatch mode.
 *
 * - `off`    : the router never runs; requests use legacy domain -> api resolution.
 * - `shadow` : resolve + attach the match + log, but never change behavior
 *              (used to verify parity against the legacy host-router).
 * - `on`     : dispatch on the resolved typed target.
 */
export type HttpRouteMode = 'off' | 'shadow' | 'on';

/**
 * Deployment environment for routing.
 *
 * - `local`      : developer machine. Real ingress concerns that cannot work on
 *                  localhost (public DNS domain verification, ACME/HTTPS cert
 *                  issuance) are simulated as satisfied so they never block dev.
 * - `production` : real ingress. Secure context is derived from the request
 *                  (`X-Forwarded-Proto`), not assumed.
 */
export type RoutingEnv = 'local' | 'production';

/**
 * Configuration for the HTTP route resolver / request-plane router.
 */
export interface RoutingOptions {
  /** Dispatch mode. Defaults to `shadow`. */
  mode?: HttpRouteMode;
  /**
   * Deployment environment. When unset, callers derive it from `NODE_ENV`
   * (`production` when `NODE_ENV==='production'`, otherwise `local`).
   */
  env?: RoutingEnv;
  /**
   * Host suffixes treated as local development hosts. Requests to these hosts
   * are always considered secure (TLS simulated) regardless of environment, so
   * a laptop serving plain HTTP is never blocked.
   */
  localHostSuffixes?: string[];
}

/**
 * Default routing configuration.
 *
 * `mode` and `env` are intentionally left unset so the resolver can apply
 * runtime precedence (explicit env var > typed config > derived default)
 * without a baked-in value shadowing an operator's env var.
 */
export const routingDefaults: RoutingOptions = {
  localHostSuffixes: ['localhost', '127.0.0.1', '::1', '.local', '.test']
};
