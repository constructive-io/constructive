import type { PagesPreset } from './types';

/**
 * Legal: the two documents every signup flow links to, as starter pages.
 *
 * These are page rows, not prose anyone should ship as-is: a tenant installs
 * them into its site's merkle-backed pages, replaces the placeholder text with
 * its own counsel's, and publishes. From then on the site's active commit is
 * the version — the `/terms` and `/privacy` pages serve it, and an acceptance
 * event records exactly which `commit_id` was on screen. That is the point of
 * seeding them as pages rather than a JSON blob: a blob has no versions to
 * cite, so acceptance against it is a checkbox rather than evidence.
 *
 * `body` is blank-line-separated prose, rendered escaped — never markup.
 */
export const legal: PagesPreset = {
  kind: 'pages',
  slug: 'legal',
  label: 'Legal starter pages',
  description:
    'Placeholder Terms of Service and Privacy Policy pages, installed into a site\u2019s merkle-backed pages so publishing versions them and acceptance events can cite the exact commit that was on screen. Replace the placeholder prose before publishing.',
  pages: [
    {
      path: '/terms',
      title: 'Terms of Service',
      body: 'These placeholder terms describe the agreement between this service and the people who use it. Replace this text with your own terms before publishing.\n\nUntil then, this page exists so every signup flow has a URL to link to and a version to record.'
    },
    {
      path: '/privacy',
      title: 'Privacy Policy',
      body: 'This placeholder policy describes what data this service collects and why. Replace this text with your own policy before publishing.\n\nUntil then, this page exists so every signup flow has a URL to link to and a version to record.'
    }
  ]
};
