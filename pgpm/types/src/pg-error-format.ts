/**
 * PostgreSQL Error Formatting Utilities
 * 
 * Extracts and formats extended PostgreSQL error fields from pg library errors.
 * These fields provide additional context for debugging database errors.
 */

/**
 * Extended PostgreSQL error fields available from pg-protocol.
 * These fields are populated by PostgreSQL when an error occurs.
 */
export interface PgErrorFields {
  /** PostgreSQL error code (e.g., '42P01' for undefined table) */
  code?: string;
  /** Additional detail about the error */
  detail?: string;
  /** Suggestion for fixing the error */
  hint?: string;
  /** PL/pgSQL call stack or context */
  where?: string;
  /** Character position in the query where the error occurred */
  position?: string;
  /** Position in internal query */
  internalPosition?: string;
  /** Internal query that caused the error */
  internalQuery?: string;
  /** Schema name related to the error */
  schema?: string;
  /** Table name related to the error */
  table?: string;
  /** Column name related to the error */
  column?: string;
  /** Data type name related to the error */
  dataType?: string;
  /** Constraint name related to the error */
  constraint?: string;
  /** Source file in PostgreSQL where error was generated */
  file?: string;
  /** Line number in PostgreSQL source file */
  line?: string;
  /** PostgreSQL routine that generated the error */
  routine?: string;
}

/**
 * Context about the query that caused the error.
 */
export interface PgErrorContext {
  /** The SQL query that was executed */
  query?: string;
  /** Parameter values passed to the query */
  values?: any[];
}

/**
 * Extract PostgreSQL error fields from an error object.
 * Returns null if the error doesn't appear to be a PostgreSQL error.
 * 
 * @param err - The error object to extract fields from
 * @returns PgErrorFields if the error has PG fields, null otherwise
 */
export function extractPgErrorFields(err: unknown): PgErrorFields | null {
  if (!err || typeof err !== 'object') {
    return null;
  }

  const e = err as Record<string, unknown>;
  
  // Check if this looks like a PostgreSQL error (has code or detail)
  if (!e.code && !e.detail && !e.where) {
    return null;
  }

  const fields: PgErrorFields = {};
  
  if (typeof e.code === 'string') fields.code = e.code;
  if (typeof e.detail === 'string') fields.detail = e.detail;
  if (typeof e.hint === 'string') fields.hint = e.hint;
  if (typeof e.where === 'string') fields.where = e.where;
  if (typeof e.position === 'string') fields.position = e.position;
  if (typeof e.internalPosition === 'string') fields.internalPosition = e.internalPosition;
  if (typeof e.internalQuery === 'string') fields.internalQuery = e.internalQuery;
  if (typeof e.schema === 'string') fields.schema = e.schema;
  if (typeof e.table === 'string') fields.table = e.table;
  if (typeof e.column === 'string') fields.column = e.column;
  if (typeof e.dataType === 'string') fields.dataType = e.dataType;
  if (typeof e.constraint === 'string') fields.constraint = e.constraint;
  if (typeof e.file === 'string') fields.file = e.file;
  if (typeof e.line === 'string') fields.line = e.line;
  if (typeof e.routine === 'string') fields.routine = e.routine;

  return fields;
}

/**
 * Format PostgreSQL error fields into an array of human-readable lines.
 * Only includes fields that are present and non-empty.
 * 
 * @param fields - The PostgreSQL error fields to format
 * @returns Array of formatted lines
 */
export function formatPgErrorFields(fields: PgErrorFields): string[] {
  const lines: string[] = [];
  
  if (fields.detail) lines.push(`Detail: ${fields.detail}`);
  if (fields.hint) lines.push(`Hint: ${fields.hint}`);
  if (fields.where) lines.push(`Where: ${fields.where}`);
  if (fields.schema) lines.push(`Schema: ${fields.schema}`);
  if (fields.table) lines.push(`Table: ${fields.table}`);
  if (fields.column) lines.push(`Column: ${fields.column}`);
  if (fields.dataType) lines.push(`Data Type: ${fields.dataType}`);
  if (fields.constraint) lines.push(`Constraint: ${fields.constraint}`);
  if (fields.position) lines.push(`Position: ${fields.position}`);
  if (fields.internalQuery) lines.push(`Internal Query: ${fields.internalQuery}`);
  if (fields.internalPosition) lines.push(`Internal Position: ${fields.internalPosition}`);
  
  return lines;
}

/**
 * Format a PostgreSQL error with full context for debugging.
 * Combines the original error message with extended PostgreSQL fields
 * and optional query context.
 * 
 * @param err - The error object
 * @param context - Optional query context (SQL and parameters)
 * @returns Formatted error string with all available information
 */
export function formatPgError(err: unknown, context?: PgErrorContext): string {
  if (!err || typeof err !== 'object') {
    return String(err);
  }

  const e = err as Record<string, unknown>;
  const message = typeof e.message === 'string' ? e.message : String(err);
  
  const lines: string[] = [message];
  
  // Add PostgreSQL error fields
  const pgFields = extractPgErrorFields(err);
  if (pgFields) {
    const fieldLines = formatPgErrorFields(pgFields);
    if (fieldLines.length > 0) {
      lines.push(...fieldLines);
    }
  }
  
  // Add query context
  if (context?.query) {
    lines.push(`Query: ${context.query}`);
  }
  if (context?.values !== undefined) {
    lines.push(`Values: ${JSON.stringify(context.values)}`);
  }
  
  return lines.join('\n');
}
