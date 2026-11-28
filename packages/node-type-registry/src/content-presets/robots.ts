import type { RobotsPreset } from './types';

/**
 * Robots: the directives a site puts in front of crawlers, as starter rows.
 *
 * A site's `robots` column is emitted verbatim by `/robots.txt`, so what goes
 * in it is a product decision — which crawlers a tenant is willing to feed —
 * and a decision belongs in a catalog row a reviewer can read, not inside an
 * emitter. The image already disallows its own session and token paths, so a
 * preset never restates them: it carries only what a tenant chooses.
 *
 * Two are shipped because the choice is genuinely binary. `open` is the default
 * a public marketing site wants; `no-ai` is the same file plus the named
 * training crawlers, listed by name because `User-agent: *` cannot express
 * "index me, do not train on me". Neither is privileged — a tenant that wants
 * a third writes a row of exactly this shape.
 */
export const robotsOpen: RobotsPreset = {
  kind: 'robots',
  slug: 'open',
  label: 'Open to crawlers',
  description:
    'Nothing disallowed beyond the session and token paths the page set already excludes \u2014 the file a public site wants, stated rather than assumed.',
  directives: []
};

/**
 * The named training crawlers, each as its own group.
 *
 * They are listed rather than pattern-matched because robots.txt has no
 * wildcard for "an AI crawler": a group applies to the user-agent token it
 * names, so a list is the only thing a crawler actually obeys. It will go stale
 * as vendors rename — that is a row to update, which is why it is a row.
 */
export const robotsNoAi: RobotsPreset = {
  kind: 'robots',
  slug: 'no-ai',
  label: 'Open to search, closed to AI training',
  description:
    'Indexable by search engines, disallowed for the named model-training crawlers. The list names each user-agent because robots.txt has no wildcard for \u201Can AI crawler\u201D, so it is a row to keep current rather than a pattern.',
  directives: [
    'User-agent: GPTBot',
    'Disallow: /',
    '',
    'User-agent: ChatGPT-User',
    'Disallow: /',
    '',
    'User-agent: CCBot',
    'Disallow: /',
    '',
    'User-agent: ClaudeBot',
    'Disallow: /',
    '',
    'User-agent: anthropic-ai',
    'Disallow: /',
    '',
    'User-agent: Google-Extended',
    'Disallow: /',
    '',
    'User-agent: Applebot-Extended',
    'Disallow: /',
    '',
    'User-agent: meta-externalagent',
    'Disallow: /',
    '',
    'User-agent: Bytespider',
    'Disallow: /',
    '',
    'User-agent: PerplexityBot',
    'Disallow: /'
  ]
};
