import { dimensionOf, expandRuleSelector, isKnownRule, RULES, RULES_BY_CODE } from '../rules/registry';
import type { Dimension, Finding, Severity } from '../types';
import { SEVERITY_ORDER } from '../types';
import type { OverrideEntry, RulesConfig, RuleSetting, SafegresConfig } from './types';

export interface ResolvedRule {
  enabled: boolean;
  severity: Severity;
  options?: Record<string, unknown>;
}

export interface ResolvedRules {
  rules: Map<string, ResolvedRule>;
  overrides: OverrideEntry[];
}

export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

function parseSetting(code: string, setting: RuleSetting): ResolvedRule {
  if (setting === 'off') {
    return { enabled: false, severity: RULES_BY_CODE.get(code)!.defaultSeverity };
  }
  if (typeof setting === 'string') {
    assertSeverity(code, setting);
    return { enabled: true, severity: setting };
  }
  if (Array.isArray(setting) && setting.length >= 1) {
    assertSeverity(code, setting[0]);
    return { enabled: true, severity: setting[0], options: setting[1] };
  }
  throw new ConfigValidationError(
    `Invalid setting for rule "${code}": expected "off", a severity, or [severity, options].`
  );
}

function assertSeverity(code: string, sev: string): asserts sev is Severity {
  if (!(sev in SEVERITY_ORDER)) {
    throw new ConfigValidationError(
      `Invalid severity "${sev}" for rule "${code}". Expected one of: ${Object.keys(SEVERITY_ORDER).join(', ')}, off.`
    );
  }
}

/**
 * Apply a RulesConfig on top of a base rule map. Wildcard selectors apply
 * first, exact codes second — so `{ 'P*': 'off', P1: 'high' }` disables all
 * P-rules except P1.
 */
export function applyRulesConfig(
  base: Map<string, ResolvedRule>,
  rulesConfig: RulesConfig,
  strictUnknown: boolean = true
): Map<string, ResolvedRule> {
  const out = new Map(base);

  const entries = Object.entries(rulesConfig);
  const wildcards = entries.filter(([sel]) => sel.endsWith('*'));
  const exacts = entries.filter(([sel]) => !sel.endsWith('*'));

  for (const [selector, setting] of [...wildcards, ...exacts]) {
    if (!selector.endsWith('*') && !isKnownRule(selector)) {
      if (strictUnknown) {
        throw new ConfigValidationError(
          `Unknown rule code "${selector}". Known rules: ${RULES.map((r) => r.code).join(', ')}.`
        );
      }
      continue;
    }
    for (const code of expandRuleSelector(selector)) {
      out.set(code, parseSetting(code, setting));
    }
  }

  return out;
}

/** Base rule map: every registered rule enabled at its default severity. */
export function defaultRuleMap(): Map<string, ResolvedRule> {
  return new Map(
    RULES.map((r) => [r.code, { enabled: true, severity: r.defaultSeverity } as ResolvedRule])
  );
}

/** Resolve the rule + override portion of a merged SafegresConfig. */
export function resolveRules(config: SafegresConfig): ResolvedRules {
  let rules = defaultRuleMap();
  if (config.rules) {
    rules = applyRulesConfig(rules, config.rules);
  }
  if (config.perf?.rules) {
    assertPerfSelectors(config.perf.rules);
    rules = applyRulesConfig(rules, config.perf.rules);
  }
  const overrides = config.overrides ?? [];
  for (const o of overrides) {
    if (!Array.isArray(o.tables) || o.tables.length === 0) {
      throw new ConfigValidationError('Every "overrides" entry needs a non-empty "tables" array.');
    }
    // Validate override rule settings eagerly.
    applyRulesConfig(rules, o.rules ?? {});
  }
  const publicRead = config.public?.read;
  if (publicRead !== undefined) {
    if (!Array.isArray(publicRead) || publicRead.some((p) => typeof p !== 'string' || p.length === 0)) {
      throw new ConfigValidationError('"public.read" must be an array of non-empty schema.table glob patterns.');
    }
  }
  const perfIgnore = config.perf?.ignore;
  if (perfIgnore !== undefined) {
    if (!Array.isArray(perfIgnore) || perfIgnore.some((p) => typeof p !== 'string' || p.length === 0)) {
      throw new ConfigValidationError('"perf.ignore" must be an array of non-empty schema.table glob patterns.');
    }
  }
  return { rules, overrides };
}

/**
 * `perf.rules` may only retune perf-dimension codes — otherwise a security
 * rule would silently change behind the perf flag.
 */
function assertPerfSelectors(rules: RulesConfig): void {
  for (const selector of Object.keys(rules)) {
    const codes = expandRuleSelector(selector);
    if (codes.length === 0) {
      throw new ConfigValidationError(
        `Unknown rule code "${selector}" in "perf.rules". Perf rules: ${perfRuleCodes().join(', ')}.`
      );
    }
    const security = codes.filter((code) => dimensionOf(RULES_BY_CODE.get(code)!) !== 'perf');
    if (security.length > 0) {
      throw new ConfigValidationError(
        `"perf.rules" may only configure perf-dimension rules; "${selector}" matches security rule(s) `
          + `${security.join(', ')}. Configure those under the top-level "rules".`
      );
    }
  }
}

/** Rule codes belonging to a scoring dimension. */
export function ruleCodesForDimension(dimension: Dimension): string[] {
  return RULES.filter((r) => dimensionOf(r) === dimension).map((r) => r.code);
}

function perfRuleCodes(): string[] {
  return ruleCodesForDimension('perf');
}

/** Simple `*` glob match against a qualified `schema.table` name. */
export function matchTablePattern(pattern: string, qualified: string): boolean {
  const re = new RegExp(
    `^${pattern.split('*').map(escapeRegExp).join('.*')}$`
  );
  return re.test(qualified);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The effective rule settings for one table: base rules plus any matching
 * override entries (later entries win).
 */
export function rulesForTable(
  resolved: ResolvedRules,
  schema: string,
  table: string
): Map<string, ResolvedRule> {
  const qualified = `${schema}.${table}`;
  let rules = resolved.rules;
  for (const o of resolved.overrides) {
    if (o.tables.some((p) => matchTablePattern(p, qualified))) {
      rules = applyRulesConfig(rules, o.rules ?? {});
    }
  }
  return rules;
}

/**
 * Apply resolved rules to raw findings: drop findings for disabled rules and
 * restamp severities from config (respecting per-table overrides).
 */
export function applyRulesToFindings(resolved: ResolvedRules, findings: Finding[]): Finding[] {
  const out: Finding[] = [];
  for (const f of findings) {
    const rules =
      f.schema && f.table ? rulesForTable(resolved, f.schema, f.table) : resolved.rules;
    const rule = rules.get(f.code);
    if (!rule) {
      out.push(f); // unknown/unregistered code — pass through untouched
      continue;
    }
    if (!rule.enabled) continue;
    out.push(f.severity === rule.severity ? f : { ...f, severity: rule.severity });
  }
  return out;
}

/** True when every AST-scoped rule is disabled (lets the audit skip parsing). */
export function allAstRulesDisabled(resolved: ResolvedRules): boolean {
  const astCodes = RULES.filter((r) => r.scope === 'policy-ast').map((r) => r.code);
  const base = astCodes.every((code) => resolved.rules.get(code)?.enabled === false);
  if (!base) return false;
  // An override could re-enable an AST rule for some table.
  for (const o of resolved.overrides) {
    const merged = applyRulesConfig(resolved.rules, o.rules ?? {});
    if (astCodes.some((code) => merged.get(code)?.enabled)) return false;
  }
  return true;
}
