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
export type { SuppressedView, ViewBodyAnalysis } from './checks/definer-view';
export { analyzeViewBodies, checkDefinerViewBypass } from './checks/definer-view';
export {
  checkMissingPrimaryKey,
  checkRedundantIndexes,
  checkUnindexedForeignKeys,
  checkUnindexedSearchColumns,
  checkUnindexedSortColumns
} from './checks/indexes';
export type {
  EffectiveGrant,
  GrantVia,
  LatticeRoleOptions,
  RoleAccessEntry,
  RoleAccessRelation,
  RoleGraph
} from './checks/lattice';
export {
  checkDeadPolicies,
  checkDeadSchemaUsage,
  checkIndirectCoverageGaps,
  checkUnreachableGrants,
  checkUntrustedIndirectAccess,
  computeRoleAccess,
  effectiveGrants
} from './checks/lattice';
export type { PolicyClause, PredicateColumn } from './checks/policy-index';
export {
  checkNonLeakproofPolicyFunctions,
  checkPolicyColumnCasts,
  checkUnhoistedPolicyFunctions,
  checkUnindexedPolicyColumns,
  collectPredicateColumns
} from './checks/policy-index';
export type { RoleTrustOptions } from './checks/role-trust';
export {
  checkPublicGrants,
  checkUntrustedRolePolicies,
  checkUntrustedRoleWrites
} from './checks/role-trust';
export type { StatsThresholds } from './checks/stats';
export {
  checkDeadTuples,
  checkSeqScanDominant,
  checkStats,
  checkTopStatements,
  checkUnusedIndexes,
  DEFAULT_STATS_THRESHOLDS
} from './checks/stats';
export type { ViewWriteAnalysis } from './checks/view-writes';
export {
  analyzeViewWrites,
  checkDefinerViewWrite,
  checkViewRuleBypass
} from './checks/view-writes';
export type { AuditOptions } from './commands/audit';
export { audit } from './commands/audit';
export type { DoctorCheck, DoctorOptions, DoctorReport, DoctorStatus } from './commands/doctor';
export { doctor } from './commands/doctor';
export type { EvalCaseResult, EvalOptions, EvalReport } from './commands/eval';
export { runEval } from './commands/eval';
export type { Provenance } from './config/fingerprint';
export { configFingerprint } from './config/fingerprint';
export type { LoadConfigParams } from './config/loader';
export { loadConfig, safegresConfigLoader } from './config/loader';
export {
  constructive,
  graphile,
  hasura,
  minimal,
  multiTenant,
  oltp,
  postgrest,
  PRESETS,
  recommended,
  strict,
  supabase
} from './config/presets';
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
  EvalConfig,
  ExposureConfig,
  FailOnConfig,
  GithubCommentConfig,
  GithubReportConfig,
  Grade,
  OverrideEntry,
  PerfConfig,
  PlaneConfig,
  PlaneFailOnConfig,
  PlaneKind,
  ReportConfig,
  RulesConfig,
  RuleSetting,
  SafegresConfig,
  ScoringConfig
} from './config/types';
export type { CaseResult, CorpusCase, ExpectedFinding } from './corpus';
export { corpusBootstrap, corpusDir, gradeCase, loadCase, loadCorpus } from './corpus';
export type { ExposureAdapter, PlaneInput, ReachContext } from './exposure/adapters';
export {
  BUILTIN_ADAPTERS,
  constructiveAdapter,
  definePlanes,
  graphileAdapter,
  hasuraAdapter,
  postgraphileAdapter,
  postgrestAdapter,
  resolveAdapters,
  supabaseAdapter
} from './exposure/adapters';
export type { PlaneReach } from './exposure/planes';
export {
  onPlane,
  relationKey,
  resolvePlaneReach,
  scorePlane,
  stampPlanes
} from './exposure/planes';
export type { ApiReach, ReachEdge, ReachInputs, UnreachableRelation } from './exposure/reach';
export {
  BACKWARD_ABILITIES,
  computeApiReach,
  FORWARD_ABILITIES,
  ROOT_ABILITIES
} from './exposure/reach';
export type { BaselineFinding, PerfBaseline, PerfDiff } from './perf/baseline';
export {
  diffPerf,
  findingKey,
  parsePerfBaseline,
  serializePerfBaseline,
  subjectOf,
  toBaselineFinding,
  toPerfBaseline
} from './perf/baseline';
export type { ExplainOptions, ExplainReport } from './perf/explain';
export { proveFindings } from './perf/explain';
export type { RoleAttributes, SchemaAclGrant, SchemaAclInfo, SchemaAclOptions } from './pg/acl';
export { introspectRoleGraph, introspectSchemaAcls } from './pg/acl';
export type { ResolvedExposure, ResolvedPlane } from './pg/exposure';
export {
  resolveConstructiveExposure,
  resolveExposure,
  resolvePlanes,
  resolveReach,
  UNKNOWN_EXPOSURE
} from './pg/exposure';
export type { FunctionGrant, FunctionSnapshot, IntrospectFunctionOptions } from './pg/functions';
export { introspectFunctions } from './pg/functions';
export type { ColumnInfo, ForeignKeyInfo, IndexInfo, TableIndexSnapshot, ViewSnapshot } from './pg/indexes';
export { introspectIndexes, introspectViews } from './pg/indexes';
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
export type {
  IndexUsage,
  StatementUsage,
  StatsSnapshot,
  TableUsage
} from './pg/stats';
export { introspectStats } from './pg/stats';
export { renderCallGraph, renderCallGraphDiff } from './report/callgraph';
export type {
  DimensionSnapshot,
  ReportComparison,
  ReportSnapshot,
  RuleDelta,
  ScoreDelta
} from './report/compare';
export {
  compareReports,
  formatDelta,
  parseSnapshot,
  serializeSnapshot,
  toSnapshot
} from './report/compare';
export type { GithubRenderOptions } from './report/github';
export {
  COMMENT_MARKER,
  emitGithub,
  gradeBadge,
  postStickyComment,
  renderAnnotations,
  renderGithubComment,
  renderGithubSummary,
  scoreBadge
} from './report/github';
export { renderJson } from './report/json';
export type { RenderMarkdownOptions } from './report/markdown';
export { renderMarkdown } from './report/markdown';
export type { RenderPrettyOptions } from './report/pretty';
export { renderPretty } from './report/pretty';
export type { BuildSourceIndexOptions, RenderSarifOptions, SourceIndex, SourceLocation } from './report/sarif';
export { buildSourceIndex, renderSarif } from './report/sarif';
export type {
  ReportView,
  ViewConfig,
  ViewDimension,
  ViewFindings,
  ViewScore,
  ViewSection
} from './report/view';
export { ALL_SECTIONS, matchPlane, selectView, viewConfigFromReportConfig } from './report/view';
export type { RuleMeta } from './rules/registry';
export { dimensionOf, expandRuleSelector, isKnownRule, RULES, RULES_BY_CODE } from './rules/registry';
export type { Score, ScoreContext, ScoreDeduction } from './score/score';
export { computeScore, DEFAULT_GRADE_BANDS, DEFAULT_WEIGHTS, meetsGrade } from './score/score';
export * from './types';
