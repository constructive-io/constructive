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
  BaselineBoundary,
  CallGraphBaseline,
  CallGraphDiff
} from './callgraph/baseline';
export { boundaryKey, diffCallGraph, parseBaseline, serializeBaseline, toBaseline } from './callgraph/baseline';
export type {
  CallGraphEdge,
  CallGraphNode,
  CallGraphOptions,
  CallGraphReport,
  ChecklistCode,
  ChecklistItem
} from './callgraph/graph';
export { buildCallGraph } from './callgraph/graph';
export {
  checkMissingPrimaryKey,
  checkRedundantIndexes,
  checkUnindexedForeignKeys
} from './checks/indexes';
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
  ruleCodesForDimension,
  rulesForTable
} from './config/resolve';
export type {
  ExposureConfig,
  FailOnConfig,
  Grade,
  OverrideEntry,
  PerfConfig,
  RulesConfig,
  RuleSetting,
  SafegresConfig,
  ScoringConfig
} from './config/types';
export type { ResolvedExposure } from './pg/exposure';
export { resolveConstructiveExposure, resolveExposure, UNKNOWN_EXPOSURE } from './pg/exposure';
export type { FunctionGrant, FunctionSnapshot, IntrospectFunctionOptions } from './pg/functions';
export { introspectFunctions } from './pg/functions';
export type { ForeignKeyInfo, IndexInfo, TableIndexSnapshot } from './pg/indexes';
export { introspectIndexes } from './pg/indexes';
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
export { renderCallGraph, renderCallGraphDiff } from './report/callgraph';
export { renderJson } from './report/json';
export { renderPretty } from './report/pretty';
export type { RuleMeta } from './rules/registry';
export { dimensionOf, expandRuleSelector, isKnownRule, RULES, RULES_BY_CODE } from './rules/registry';
export type { Score, ScoreContext, ScoreDeduction } from './score/score';
export { computeScore, DEFAULT_GRADE_BANDS, DEFAULT_WEIGHTS, meetsGrade } from './score/score';
export * from './types';
