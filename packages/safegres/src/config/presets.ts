import type { SafegresConfig } from './types';

/**
 * Built-in presets, resolvable via `extends: 'safegres:<name>'`.
 * A preset is just a partial config; users can publish their own as files
 * or npm packages.
 */

/** Today's default behavior: every rule at its registry default severity. */
export const recommended: SafegresConfig = {
  rules: {}
};

/**
 * Everything on and escalated. Fail-closed hygiene findings (dead grants,
 * locked tables) are re-tuned upward and even contribute a fraction of
 * their weight to the score.
 */
export const strict: SafegresConfig = {
  extends: 'safegres:recommended',
  rules: {
    A1: 'medium',
    A3: 'medium',
    A4: 'high',
    A5: 'medium',
    A6: 'medium',
    A8: 'medium',
    P1b: 'high'
  },
  scoring: { failClosedWeight: 0.25 },
  failOn: { severity: 'high' }
};

/**
 * Tuned for Constructive's architecture:
 * - the exposure surface auto-resolves from the routing plane
 *   (`routing_public.apis` → `api_schemas` → `metaschema_public.schema`),
 *   so only what the exposed APIs can reach drives the score;
 * - untrusted-role rules watch `anonymous`; anything that can leak rows
 *   across the role boundary is critical;
 * - A3 is off — API roles never own tables in the Constructive model, so
 *   non-FORCEd RLS is not an exposure;
 * - `pg_partman`'s schema is skipped: it creates child partitions and
 *   templates at runtime with no dependency on the extension, so ownership
 *   alone leaves them looking like unsecured application tables.
 */
export const constructive: SafegresConfig = {
  extends: 'safegres:recommended',
  exposure: { resolver: 'constructive' },
  extensions: { ignore: ['pg_partman'] },
  rules: {
    A2: 'critical',
    A3: 'off',
    P5: 'critical',
    R1: ['critical', { roles: ['anonymous'] }],
    R2: ['high', { roles: ['anonymous'] }],
    R3: 'medium'
  },
  scoring: { floorOnCritical: 'C' }
};

/** Structural flags only — a fast CI smoke check. */
export const minimal: SafegresConfig = {
  rules: {
    '*': 'off',
    A1: 'critical',
    A2: 'high',
    A3: 'medium'
  }
};

export const PRESETS: Record<string, SafegresConfig> = {
  'safegres:recommended': recommended,
  'safegres:strict': strict,
  'safegres:constructive': constructive,
  'safegres:minimal': minimal
};
