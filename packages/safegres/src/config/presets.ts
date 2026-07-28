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

/** Everything on and escalated; coverage gaps are treated as critical. */
export const strict: SafegresConfig = {
  extends: 'safegres:recommended',
  rules: {
    A4: 'critical',
    A5: 'high',
    A6: 'medium',
    P1b: 'high'
  },
  failOn: { severity: 'high' }
};

/**
 * Tuned for Constructive's role model (RLS-first, anonymous/authenticated/
 * administrator): untrusted-role rules watch `anonymous`, and anything that
 * can leak rows across the role boundary is critical.
 */
export const constructive: SafegresConfig = {
  extends: 'safegres:recommended',
  rules: {
    A2: 'critical',
    A4: 'critical',
    A7: 'critical',
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
