/**
 * Types for the graphile-history v5 plugin.
 */

export interface HistoryPluginOptions {
  /**
   * Suffix used to derive the history table name from the source table name
   * when the `@history` smart tag does not carry an explicit table name.
   * @default '_history'
   */
  historySuffix?: string;

  /**
   * Column on the history table that stores the version timestamp.
   * @default 'recorded_at'
   */
  recordedAtColumn?: string;

  /**
   * Column on the history table that stores the operation marker
   * (INSERT / UPDATE / DELETE).
   * @default 'history_op'
   */
  operationColumn?: string;

  /**
   * Source columns that must never be written by a restore mutation
   * (in addition to primary-key columns, which are always excluded).
   * @default ['created_at', 'updated_at']
   */
  immutableColumns?: string[];
}

export interface HistoryColumn {
  /** Physical column name on the history table */
  column: string;
  /** GraphQL field name (camelCase) */
  gqlName: string;
  /** Underlying pg codec name (e.g. 'uuid', 'text', 'timestamptz') */
  pgType: string;
}

export interface HistoryTableInfo {
  /** Source table SQL name */
  sourceTable: string;
  /** History table SQL name */
  historyTable: string;
  /** Schema name (shared by source and history tables) */
  schemaName: string;
  /** Primary-key columns on the source table */
  pkColumns: HistoryColumn[];
  /** Version timestamp column on the history table */
  recordedAtColumn: string;
  /** Operation marker column on the history table */
  operationColumn: string;
  /** Copied source columns present on the history table (excludes reserved cols) */
  copyColumns: HistoryColumn[];
  /** GraphQL type name of the source table (e.g. 'Post') */
  sourceTypeName: string;
}
