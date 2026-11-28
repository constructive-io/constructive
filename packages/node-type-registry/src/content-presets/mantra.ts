import type { RouteBindingsPreset } from './types';

/**
 * Mantra: the platform's own website, as a table of rows.
 *
 * Mantra is ONE function image exposing many named tasks — `mantra:signin`,
 * `mantra:robots_txt`, and so on. Nothing about serving it is a new routing
 * mode: each binding below becomes an ordinary route row whose target is a
 * function, which the routing resolver already answers on the function lane by
 * emitting the definition's task identifier for the sync gateway.
 *
 * So the only real question is *which paths* Mantra owns on a site, and that is
 * a product decision — which is why it lives here as a preset rather than as a
 * list inside a PL/pgSQL function. Adding `/reset-password` becomes a row a
 * reviewer can read, a tenant can ship a different set under its own slug, and
 * retuning the set is an UPDATE with history rather than a migration.
 *
 * Deliberately no `/` and no catch-all: a site's own root route keeps serving
 * authored content, and Mantra layers onto the hostname that site already
 * serves. A path here is claimed from the site, so every one of them is a page
 * we intend to own.
 *
 * No SSO legs either: `/auth/start` and `/auth/callback` are the `sso` preset,
 * installed only by a tenant that signs people in with an identity provider.
 */
export const mantra: RouteBindingsPreset = {
  kind: 'route_bindings',
  slug: 'mantra',
  label: 'Mantra platform pages',
  description:
    "The platform-owned page set served by the mantra function image: authentication (sign in/up/out, confirming an address, password recovery, 2FA), the legal pages, and the well-known crawler and manifest files. Layers onto a site's existing hostname; claims no root or catch-all path.",
  bindings: [
    // Authentication.
    { path: '/login', task_identifier: 'mantra:signin', anonymous: true },
    // The phone-number lane under it: one page that signs a registered number
    // in and provisions an unregistered one, so it nests under /login rather
    // than sitting beside it as a second sign-up surface.
    { path: '/login/phone', task_identifier: 'mantra:phone_signin', anonymous: true },
    { path: '/login/magic', task_identifier: 'mantra:magic_link', anonymous: true },
    { path: '/logout', task_identifier: 'mantra:signout', anonymous: true },
    { path: '/signup', task_identifier: 'mantra:signup', anonymous: true },
    { path: '/forgot-password', task_identifier: 'mantra:forgot', anonymous: true },
    { path: '/reset-password', task_identifier: 'mantra:reset', anonymous: true },
    { path: '/2fa', task_identifier: 'mantra:two_factor', anonymous: true },
    { path: '/device-approval', task_identifier: 'mantra:device_approval', anonymous: true },
    // Turning a second factor on; /login sends a require_mfa sign-in here.
    { path: '/setup-2fa', task_identifier: 'mantra:setup_two_factor', anonymous: true },
    { path: '/auth/magic', task_identifier: 'mantra:magic_landing', anonymous: true },
    // The confirmation link a sign-up mails: a password sign-up stays pending
    // until this is followed, so without it a new account cannot sign in.
    { path: '/verify-email', task_identifier: 'mantra:verify_email', anonymous: true },

    // Legal pages every signup flow links to.
    { path: '/terms', task_identifier: 'mantra:terms', anonymous: true },
    { path: '/privacy', task_identifier: 'mantra:privacy', anonymous: true },

    // Well-known files a crawler or an installing browser asks for by name.
    { path: '/robots.txt', task_identifier: 'mantra:robots_txt', anonymous: true },
    { path: '/sitemap.xml', task_identifier: 'mantra:sitemap_xml', anonymous: true },
    { path: '/site.webmanifest', task_identifier: 'mantra:webmanifest', anonymous: true },

    // The browser bundle a page that asked to hydrate loads. A path rather than
    // a page: it is this image's own asset, served immutable by content hash,
    // and a site whose documents never ask for it never requests it.
    { path: '/_mantra/runtime.js', task_identifier: 'mantra:runtime_asset', anonymous: true },

    // What every page this image serves looks like: one stylesheet built into
    // the image, cached immutably by content hash, and overridden by any sheet a
    // site loads after it.
    { path: '/_mantra/styles.css', task_identifier: 'mantra:styles_asset', anonymous: true },
  ],
};
