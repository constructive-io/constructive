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
 * Tuned for tenant-isolation apps: anything that can leak rows across
 * tenants is critical.
 */
export const multiTenant: SafegresConfig = {
  extends: 'safegres:recommended',
  rules: {
    A2: 'critical',
    A4: 'critical',
    A7: 'critical',
    P5: 'critical'
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
  'safegres:multi-tenant': multiTenant,
  'safegres:minimal': minimal
};
