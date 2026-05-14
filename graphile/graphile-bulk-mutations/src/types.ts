/**
 * Configuration options and shared types for graphile-bulk-mutations.
 */

/**
 * Naming strategy for bulk mutation fields.
 *
 * - 'bulk': bulkCreateUser, bulkUpsertUser, bulkUpdateUser, bulkDeleteUser
 * - 'pluralized': createUsers, upsertUsers, updateUsers, deleteUsers
 * - 'many': createManyUsers, upsertManyUsers, updateManyUsers, deleteManyUsers
 */
export type BulkNamingStrategy = 'bulk' | 'pluralized' | 'many';

/**
 * Configuration options for the bulk mutations preset.
 */
export interface BulkMutationOptions {
  /** Naming strategy for bulk mutation fields. Default: 'bulk' */
  bulkNaming?: BulkNamingStrategy;
  /** Enable bulk insert mutations. Default: true */
  bulkInsert?: boolean;
  /** Enable bulk upsert mutations. Default: true */
  bulkUpsert?: boolean;
  /** Enable bulk update mutations. Default: true */
  bulkUpdate?: boolean;
  /** Enable bulk delete mutations. Default: true */
  bulkDelete?: boolean;
  /** Enable relational/nested inserts on bulk create. Default: false */
  bulkRelational?: boolean;
  /** Include returning rows in payload. Default: true */
  bulkReturning?: boolean;
  /** Max items in values array (insert/upsert). Default: 1000 */
  bulkMaxRows?: number;
  /** Max nesting depth for relational inserts. Default: 3 */
  bulkMaxNestingDepth?: number;
  /** Require non-empty where on bulk update/delete. Default: true */
  bulkRequireWhere?: boolean;
}

/**
 * Max PostgreSQL parameters per query. Auto-batch splits at this limit.
 */
export const PG_MAX_PARAMS = 32_000;
