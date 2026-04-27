/**
 * Public surface of `safegres` — a pure-PostgreSQL Row-Level-Security auditor.
 *
 * The auditor introspects pg_class / pg_policy / role grants and emits
 * structured findings (A1–A7, P1, P5). It has no knowledge of any specific
 * application schema or policy DSL.
 */

export { audit } from './commands/audit';
export type { AuditOptions } from './commands/audit';
export { renderJson } from './report/json';
export { renderPretty } from './report/pretty';
export * from './types';
export {
  introspectTables,
  type IntrospectOptions,
  type PgPrivilege,
  type PolicyCmd,
  type PolicyInfo,
  type QueryExecutor,
  type TableSnapshot
} from './pg/introspect';
export { listAuditableRoles, resolveRoles } from './pg/roles';
export {
  parsePolicyExpression,
  PolicyParseError,
  type PgAstNode,
  type PolicyExpression
} from './ast/parse';
