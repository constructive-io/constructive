/**
 * Public surface of `safegres` — a pure-PostgreSQL Row-Level-Security auditor.
 *
 * The auditor introspects pg_class / pg_policy / role grants and emits
 * structured findings (A1–A7, P1, P5). It has no knowledge of any specific
 * application schema or policy DSL.
 *
 * For convenience, `node-type-registry`'s Authz* / Data* / Relation* / View*
 * type definitions are re-exported here so consumers building auditors on
 * top of Constructive's type system only need a single dependency.
 */

export { auditPg } from './commands/pg';
export type { AuditPgOptions } from './commands/pg';
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

export type { JSONSchema, NodeTypeDefinition } from 'node-type-registry';
export {
  AuthzAllowAll,
  AuthzComposite,
  AuthzDenyAll,
  AuthzDirectOwner,
  AuthzDirectOwnerAny,
  AuthzEntityMembership,
  AuthzMemberList,
  AuthzMembership,
  AuthzNotReadOnly,
  AuthzOrgHierarchy,
  AuthzPeerOwnership,
  AuthzPublishable,
  AuthzRelatedEntityMembership,
  AuthzRelatedMemberList,
  AuthzRelatedPeerOwnership,
  AuthzTemporal
} from 'node-type-registry';
