import { mantra } from './mantra';
import type { RouteBindingsPreset } from './types';

/**
 * Mantra on a host of its own.
 *
 * The `mantra` set deliberately claims no `/`, because it layers onto a site
 * that has content of its own. A hostname provisioned only to carry the auth
 * pages (`mantra.<domain>`) has no such content: its root is the placeholder
 * the route guard created targeting the empty site, which answers 404. This
 * set is the same pages plus that one root, as a redirect onto sign-in — a
 * redirects-table row, not a Mantra task, so the image still owns exactly the
 * pages it serves.
 *
 * Composed from `mantra` rather than copied, so retuning the page set retunes
 * both; the redirect is the only thing this preset adds.
 */
export const mantraStandalone: RouteBindingsPreset = {
  kind: 'route_bindings',
  slug: 'mantra-standalone',
  label: 'Mantra platform pages, on a dedicated host',
  description:
    "The mantra page set for a hostname that serves nothing else: every binding of 'mantra', plus the site root redirecting to sign-in. Install onto a site provisioned only to carry the auth pages; a site with authored content keeps its root by installing 'mantra' instead.",
  bindings: [
    ...mantra.bindings,
    { path: '/', target: 'redirect', to_path: '/login', anonymous: true },
  ],
};
