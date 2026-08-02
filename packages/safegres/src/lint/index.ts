/**
 * Source-level SQL/PL/pgSQL convention linter.
 *
 * This module used to carry safegres's own copy of the linter. It now lives in
 * the standalone `@pgsql/lint` package (source text in → findings out, no `pg`
 * dependency); safegres consumes it as "the catalog adapter", feeding it the
 * `pg_get_functiondef` text it already reads. This file is a thin re-export so
 * the rest of safegres keeps importing from `../lint` unchanged.
 */

export type {
  DynamicSqlSite,
  LintOptions,
  LintProblem,
  LintResult,
  LintRule,
  LintRuleMeta,
  LintUnit,
  SqlFragment,
  SuppressedProblem,
  SuppressionScope
} from '@pgsql/lint';
export {
  LINT_RULES,
  LINT_RULES_BY_CODE,
  LINT_RULES_BY_ID,
  lintDefinition,
  parseUnit,
  Suppressions
} from '@pgsql/lint';
