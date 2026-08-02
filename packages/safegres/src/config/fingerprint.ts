/**
 * Provenance: proving *which rules* produced a score.
 *
 * Every knob that moves the number — a rule's severity, an override, a perf
 * ignore, the exposed surface, the scoring weights — is deliberate and useful
 * to a developer declaring intent in CI. To an evaluation harness scoring an
 * agent, the same knobs are the cheapest way to win: turn off the rule, or
 * re-baseline the debt, and the score goes up without the database changing.
 *
 * So a report carries a fingerprint of the configuration it was produced
 * under. Two runs with the same fingerprint were graded by the same rules and
 * are comparable; a different fingerprint means the ruler changed, and a
 * harness can reject the run instead of believing the number.
 *
 * The fingerprint covers the *resolved* rules rather than the config text, so
 * it is invariant to how the same posture was expressed (preset vs. explicit
 * rules, key order, whitespace) and sensitive to anything that changes it.
 */

import { createHash } from 'crypto';

import type { ExposureAdapter } from '../exposure/adapters';
import { resolveRules } from './resolve';
import type { SafegresConfig } from './types';

/** Everything about a run that a comparison must be able to trust. */
export interface Provenance {
  /** The safegres version that produced the report. */
  version: string;
  /** `sha256:<hex>` over the resolved, score-relevant configuration. */
  fingerprint: string;
  /**
   * True when the run refused local configuration: no discovered config file,
   * no rule overrides, no baselines. An evaluation harness should require it.
   */
  sealed: boolean;
  /** The preset the sealed run was graded under, when one was named. */
  preset?: string;
}

/**
 * A canonical JSON encoding: object keys sorted at every depth, so two configs
 * that mean the same thing hash the same regardless of how they were written.
 */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return Object.fromEntries(entries.map(([k, v]) => [k, canonical(v)]));
  }
  return value;
}

/**
 * The score-relevant projection of a config. Deliberately *not* the whole
 * config: connection parameters, output formats and renderer options cannot
 * move the number, and hashing them would make every run look incomparable.
 */
function scoringSurface(config: SafegresConfig): unknown {
  const { rules } = resolveRules(config);
  return {
    rules: [...rules.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([code, rule]) => [code, rule.enabled, rule.severity, canonical(rule.options ?? null)]),
    overrides: (config.overrides ?? []).map((o) => canonical(o)),
    scoring: canonical(config.scoring ?? {}),
    publicRead: [...(config.public?.read ?? [])].sort(),
    perfIgnore: [...(config.perf?.ignore ?? [])].sort(),
    exposure: canonical({
      ...config.exposure,
      // An adapter is code, not data: identify it by name and let the version
      // field carry the rest.
      adapters: (config.exposure?.adapters ?? []).map((a: string | ExposureAdapter) =>
        typeof a === 'string' ? a : a.name
      )
    })
  };
}

/**
 * `sha256:<hex>` over the resolved scoring surface and the safegres version.
 * The version participates because a rule's *meaning* can change without its
 * configuration changing, and two scores from different analyzers are no more
 * comparable than two scores from different rule sets.
 */
export function configFingerprint(config: SafegresConfig, version: string): string {
  const payload = JSON.stringify({ version, config: scoringSurface(config) });
  return `sha256:${createHash('sha256').update(payload).digest('hex')}`;
}
