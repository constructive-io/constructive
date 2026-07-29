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
export type {
  CallGraphEdge,
  CallGraphNode,
  CallGraphOptions,
  CallGraphReport,
  ChecklistCode,
  ChecklistItem
} from './callgraph/graph';
export { buildCallGraph } from './callgraph/graph';
export type { RoleTrustOptions } from './checks/role-trust';
export {
  checkPublicGrants,
  checkUntrustedRolePolicies,
  checkUntrustedRoleWrites
} from './checks/role-trust';
export type { AuditOptions } from './commands/audit';
export { audit } from './commands/audit';
export type { DoctorCheck, DoctorOptions, DoctorReport, DoctorStatus } from './commands/doctor';
export { doctor } from './commands/doctor';
export type { LoadConfigParams } from './config/loader';
export { loadConfig, safegresConfigLoader } from './config/loader';
export { constructive, minimal, PRESETS, recommended, strict } from './config/presets';
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
  ExposureConfig,
  FailOnConfig,
  Grade,
  OverrideEntry,
  RulesConfig,
  RuleSetting,
  SafegresConfig,
  ScoringConfig
} from './config/types';
export type { ResolvedExposure } from './pg/exposure';
export { resolveConstructiveExposure, resolveExposure, UNKNOWN_EXPOSURE } from './pg/exposure';
export type { FunctionGrant, FunctionSnapshot, IntrospectFunctionOptions } from './pg/functions';
export { introspectFunctions } from './pg/functions';
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
export { renderCallGraph } from './report/callgraph';
export { renderJson } from './report/json';
export { renderPretty } from './report/pretty';
export type { RuleMeta } from './rules/registry';
export { expandRuleSelector, isKnownRule, RULES, RULES_BY_CODE } from './rules/registry';
export type { Score, ScoreContext, ScoreDeduction } from './score/score';
export { computeScore, DEFAULT_GRADE_BANDS, DEFAULT_WEIGHTS, meetsGrade } from './score/score';
export * from './types';
