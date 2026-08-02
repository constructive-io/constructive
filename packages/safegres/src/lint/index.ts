/**
 * Source-level SQL/PL/pgSQL convention linter.
 *
 * Distinct from safegres's catalog checks: it reasons about the *text* of a
 * function definition (fully-qualified references, dynamic SQL, forbidden
 * directives) rather than live-database facts, and carries no `pg` dependency.
 * safegres is its first consumer; the seam is drawn so it can become a
 * standalone `@pgsql/lint` package unchanged.
 */

export type { LintOptions } from './engine';
export { lintDefinition } from './engine';
export { parseUnit } from './parse-unit';
export { LINT_RULES, LINT_RULES_BY_CODE, LINT_RULES_BY_ID } from './rules';
export { Suppressions } from './suppressions';
export type {
  DynamicSqlSite,
  LintProblem,
  LintResult,
  LintRule,
  LintRuleMeta,
  LintUnit,
  SqlFragment,
  SuppressedProblem,
  SuppressionScope
} from './types';
