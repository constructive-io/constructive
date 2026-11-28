import type { RouteBindingsPreset } from './types';

/**
 * SSO: the browser legs of signing in with an external identity provider.
 *
 * Its own slug rather than part of `mantra`, because a provider sign-in is
 * something a tenant turns on, not something every site serves: a tenant with
 * no identity providers has no callback to answer, and a callback path that
 * answers anyway is a public endpoint that does nothing but advertise itself.
 * Absent this preset the paths are simply unrouted, so they 404 — there is no
 * fallback page behind them.
 *
 * The pages are mantra's tasks (the `/login` provider buttons link to
 * `/auth/start`), so this installs beside `mantra` with the same verb:
 * `<sites>_install_mantra(site_id, entity_id, 'sso')`. The tenant still needs
 * `auth:sso` (identity providers + connected accounts) for there to be a
 * provider to start against.
 */
export const sso: RouteBindingsPreset = {
  kind: 'route_bindings',
  slug: 'sso',
  label: 'SSO sign-in pages',
  description:
    "The OAuth/OIDC browser legs served by the mantra function image: /auth/start sends the browser to the tenant's identity provider and /auth/callback consumes the return, signs the browser in and sets the session cookie, and /auth/error sends a return that failed back to /login naming why. Opt-in: install beside 'mantra' on a site whose tenant has auth:sso; without it these paths 404.",
  bindings: [
    { path: '/auth/start', task_identifier: 'mantra:oauth_start', anonymous: true },
    { path: '/auth/callback', task_identifier: 'mantra:oauth_callback', anonymous: true },
    // Where a return that failed is sent: the tenant's oauth_error_redirect_path
    // defaults here, so without it a cancelled sign-in ends on a 404.
    { path: '/auth/error', task_identifier: 'mantra:oauth_error', anonymous: true },
  ],
};
