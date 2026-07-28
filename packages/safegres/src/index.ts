/**
 * Public surface of `safegres` — a pure-PostgreSQL Row-Level-Security auditor.
 *
 * The auditor introspects pg_class / pg_policy / role grants and emits
 * structured findings (A1–A7, P1, P5). It has no knowledge of any specific
 * application schema or policy DSL.
 */

export {
  parsePolicyExpression,
  type PgAstNode,
  type PolicyExpression,
  PolicyParseError} from './ast/parse';
export type { AuditOptions } from './commands/audit';
export { audit } from './commands/audit';
export type { DoctorCheck, DoctorOptions, DoctorReport, DoctorStatus } from './commands/doctor';
export { doctor } from './commands/doctor';
export type { LoadConfigParams } from './config/loader';
export { loadConfig, safegresConfigLoader } from './config/loader';
export { minimal, multiTenant, PRESETS, recommended, strict } from './config/presets';
export type { ResolvedRule, ResolvedRules } from './config/resolve';
export {
  allAstRulesDisabled,
  applyRulesToFindings,
  ConfigValidationError,
  defaultRuleMap,
  matchTablePattern,
  resolveRules,
  rulesForTable
} from './config/resolve';
export type {
  FailOnConfig,
  Grade,
  OverrideEntry,
  RulesConfig,
  RuleSetting,
  SafegresConfig,
  ScoringConfig
} from './config/types';
export {
  type IntrospectOptions,
  introspectTables,
  type PgPrivilege,
  type PolicyCmd,
  type PolicyInfo,
  type QueryExecutor,
  type TableSnapshot
} from './pg/introspect';
export { listAuditableRoles, resolveRoles } from './pg/roles';
export { renderJson } from './report/json';
export { renderPretty } from './report/pretty';
export type { RuleMeta } from './rules/registry';
export { expandRuleSelector, isKnownRule, RULES, RULES_BY_CODE } from './rules/registry';
export type { Score, ScoreDeduction } from './score/score';
export { computeScore, DEFAULT_GRADE_BANDS, DEFAULT_WEIGHTS, meetsGrade } from './score/score';
export * from './types';
