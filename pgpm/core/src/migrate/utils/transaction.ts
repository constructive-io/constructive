import { Logger } from '@pgpmjs/logger';
import { extractPgErrorFields, formatPgErrorFields } from '@pgpmjs/types';
import { Pool, PoolClient } from 'pg';

const log = new Logger('migrate:transaction');

/**
 * Environment variables for controlling error output verbosity:
 * - PGPM_ERROR_QUERY_HISTORY_LIMIT: Max queries to show (default: 30)
 * - PGPM_ERROR_MAX_LENGTH: Max chars for error output (default: 10000)
 * - PGPM_ERROR_VERBOSE: Set to 'true' to disable all limiting
 */
const ERROR_QUERY_HISTORY_LIMIT = parseInt(process.env.PGPM_ERROR_QUERY_HISTORY_LIMIT || '30', 10);
const ERROR_MAX_LENGTH = parseInt(process.env.PGPM_ERROR_MAX_LENGTH || '10000', 10);
const ERROR_VERBOSE = process.env.PGPM_ERROR_VERBOSE === 'true';

/**
 * Represents a group of consecutive queries with the same query template
 */
interface QueryGroup {
  query: string;
  startIndex: number;
  endIndex: number;
  count: number;
  entries: QueryHistoryEntry[];
}

/**
 * Extract a friendly name from pgpm_migrate.deploy params for better error context
 */
function extractDeployChangeName(params?: any[]): string | null {
  if (!params || params.length < 2) return null;
  // params[1] is the change name (e.g., "schemas/metaschema_public/tables/extension/table")
  return typeof params[1] === 'string' ? params[1] : null;
}

/**
 * Group consecutive queries by their query template (ignoring params)
 */
function groupConsecutiveQueries(history: QueryHistoryEntry[]): QueryGroup[] {
  if (history.length === 0) return [];
  
  const groups: QueryGroup[] = [];
  let currentGroup: QueryGroup = {
    query: history[0].query,
    startIndex: 0,
    endIndex: 0,
    count: 1,
    entries: [history[0]]
  };
  
  for (let i = 1; i < history.length; i++) {
    const entry = history[i];
    if (entry.query === currentGroup.query) {
      // Same query template, extend the group
      currentGroup.endIndex = i;
      currentGroup.count++;
      currentGroup.entries.push(entry);
    } else {
      // Different query, start a new group
      groups.push(currentGroup);
      currentGroup = {
        query: entry.query,
        startIndex: i,
        endIndex: i,
        count: 1,
        entries: [entry]
      };
    }
  }
  groups.push(currentGroup);
  
  return groups;
}

/**
 * Format a single query entry for display
 */
function formatQueryEntry(entry: QueryHistoryEntry, index: number): string {
  const duration = entry.duration ? ` (${entry.duration}ms)` : '';
  const params = entry.params && entry.params.length > 0 
    ? ` with params: ${JSON.stringify(entry.params.slice(0, 2))}${entry.params.length > 2 ? '...' : ''}`
    : '';
  return `  ${index + 1}. ${entry.query.split('\n')[0].trim()}${params}${duration}`;
}

/**
 * Format a group of queries for display, collapsing repetitive queries
 */
function formatQueryGroup(group: QueryGroup): string[] {
  const lines: string[] = [];
  const queryPreview = group.query.split('\n')[0].trim();
  
  if (group.count === 1) {
    // Single query, format normally
    lines.push(formatQueryEntry(group.entries[0], group.startIndex));
  } else {
    // Multiple consecutive identical queries, collapse them
    const isPgpmDeploy = queryPreview.includes('pgpm_migrate.deploy');
    
    // Show range and count
    lines.push(`  ${group.startIndex + 1}-${group.endIndex + 1}. ${queryPreview} (${group.count} calls)`);
    
    // For pgpm_migrate.deploy, show first and last change names for context
    if (isPgpmDeploy) {
      const firstChange = extractDeployChangeName(group.entries[0].params);
      const lastChange = extractDeployChangeName(group.entries[group.entries.length - 1].params);
      if (firstChange) {
        lines.push(`       First: ${firstChange}`);
      }
      if (lastChange && lastChange !== firstChange) {
        lines.push(`       Last:  ${lastChange}`);
      }
    } else {
      // For other queries, show first and last params
      const firstParams = group.entries[0].params;
      const lastParams = group.entries[group.entries.length - 1].params;
      if (firstParams && firstParams.length > 0) {
        lines.push(`       First params: ${JSON.stringify(firstParams.slice(0, 2))}${firstParams.length > 2 ? '...' : ''}`);
      }
      if (lastParams && lastParams.length > 0 && JSON.stringify(lastParams) !== JSON.stringify(firstParams)) {
        lines.push(`       Last params:  ${JSON.stringify(lastParams.slice(0, 2))}${lastParams.length > 2 ? '...' : ''}`);
      }
    }
  }
  
  return lines;
}

/**
 * Format query history with smart collapsing and limiting
 */
export function formatQueryHistory(history: QueryHistoryEntry[]): string[] {
  if (history.length === 0) return [];
  
  // In verbose mode, show everything without collapsing
  if (ERROR_VERBOSE) {
    return history.map((entry, index) => formatQueryEntry(entry, index));
  }
  
  // Group consecutive identical queries
  const groups = groupConsecutiveQueries(history);
  
  // Apply limit - keep last N queries worth of groups
  let totalQueries = 0;
  let startGroupIndex = groups.length;
  
  for (let i = groups.length - 1; i >= 0; i--) {
    totalQueries += groups[i].count;
    if (totalQueries > ERROR_QUERY_HISTORY_LIMIT) {
      startGroupIndex = i + 1;
      break;
    }
    startGroupIndex = i;
  }
  
  const lines: string[] = [];
  
  // If we're truncating, show how many were omitted
  if (startGroupIndex > 0) {
    let omittedCount = 0;
    for (let i = 0; i < startGroupIndex; i++) {
      omittedCount += groups[i].count;
    }
    lines.push(`  ... (${omittedCount} earlier queries omitted, set PGPM_ERROR_VERBOSE=true to see all)`);
  }
  
  // Format the remaining groups
  for (let i = startGroupIndex; i < groups.length; i++) {
    lines.push(...formatQueryGroup(groups[i]));
  }
  
  return lines;
}

/**
 * Truncate error output if it exceeds the max length
 */
export function truncateErrorOutput(lines: string[]): string[] {
  if (ERROR_VERBOSE) return lines;
  
  const joined = lines.join('\n');
  if (joined.length <= ERROR_MAX_LENGTH) return lines;
  
  // Truncate and add notice
  const truncated = joined.slice(0, ERROR_MAX_LENGTH);
  const lastNewline = truncated.lastIndexOf('\n');
  const cleanTruncated = lastNewline > 0 ? truncated.slice(0, lastNewline) : truncated;
  
  return [
    ...cleanTruncated.split('\n'),
    `... (output truncated at ${ERROR_MAX_LENGTH} chars, total was ${joined.length} chars)`,
    `    Set PGPM_ERROR_VERBOSE=true to see full output`
  ];
}

export interface TransactionOptions {
  useTransaction: boolean;
}

export interface TransactionContext {
  client: PoolClient | Pool;
  isTransaction: boolean;
  // Add query tracking for debugging
  queryHistory: QueryHistoryEntry[];
  addQuery: (query: string, params?: any[], startTime?: number) => void;
}

export interface QueryHistoryEntry {
  query: string;
  params?: any[];
  timestamp: number;
  duration?: number;
  error?: any;
}

/**
 * Execute a function within a transaction context
 * If useTransaction is true, wraps the execution in a transaction
 * If false, uses the pool directly without transaction
 */
export async function withTransaction<T>(
  pool: Pool,
  options: TransactionOptions,
  fn: (context: TransactionContext) => Promise<T>
): Promise<T> {
  const queryHistory: QueryHistoryEntry[] = [];
  
  const addQuery = (query: string, params?: any[], startTime?: number) => {
    queryHistory.push({
      query,
      params,
      timestamp: Date.now(),
      duration: startTime ? Date.now() - startTime : undefined
    });
  };

  if (!options.useTransaction) {
    // No transaction - use pool directly
    log.debug('Executing without transaction');
    return fn({ client: pool, isTransaction: false, queryHistory, addQuery });
  }

  // Use transaction
  const client = await pool.connect();
  const transactionStartTime = Date.now();
  log.debug('Starting transaction');

  try {
    const beginTime = Date.now();
    await client.query('BEGIN');
    addQuery('BEGIN', [], beginTime);
    
    const result = await fn({ client, isTransaction: true, queryHistory, addQuery });
    
    const commitTime = Date.now();
    await client.query('COMMIT');
    addQuery('COMMIT', [], commitTime);
    
    const transactionDuration = Date.now() - transactionStartTime;
    log.debug(`Transaction committed successfully in ${transactionDuration}ms`);
    
    return result;
  } catch (error: any) {
    const rollbackTime = Date.now();
    
    try {
      await client.query('ROLLBACK');
      addQuery('ROLLBACK', [], rollbackTime);
    } catch (rollbackError) {
      log.error('Failed to rollback transaction:', rollbackError);
    }
    
    const transactionDuration = Date.now() - transactionStartTime;
    
    // Enhanced error logging with context
    const errorLines = [];
    errorLines.push(`Transaction rolled back due to error after ${transactionDuration}ms:`);
    errorLines.push(`Error Code: ${error.code || 'N/A'}`);
    errorLines.push(`Error Message: ${error.message || 'N/A'}`);
    
    // Add extended PostgreSQL error fields
    const pgFields = extractPgErrorFields(error);
    if (pgFields) {
      const fieldLines = formatPgErrorFields(pgFields);
      if (fieldLines.length > 0) {
        errorLines.push(...fieldLines);
      }
    }
    
    // Log query history for debugging (with smart collapsing and limiting)
    if (queryHistory.length > 0) {
      errorLines.push('Query history for this transaction:');
      const historyLines = formatQueryHistory(queryHistory);
      errorLines.push(...historyLines);
    }
    
    // For transaction aborted errors, provide additional context
    if (error.code === '25P02') {
      errorLines.push('🔍 Debug Info: Transaction was aborted due to a previous error.');
      errorLines.push('   This usually means a previous command in the transaction failed.');
      errorLines.push('   Check the query history above to identify the failing command.');
    }
    
    // Apply total output length limit and log the consolidated error message
    const finalLines = truncateErrorOutput(errorLines);
    log.error(finalLines.join('\n'));
    
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Helper to execute a query within a transaction context with enhanced logging
 */
export async function executeQuery(
  context: TransactionContext,
  query: string,
  params?: any[]
): Promise<any> {
  const startTime = Date.now();
  
  try {
    const result = await context.client.query(query, params);
    const duration = Date.now() - startTime;
    
    // Add to query history
    context.addQuery(query, params, startTime);
    
    // Log slow queries for debugging
    if (duration > 1000) {
      log.warn(`Slow query detected (${duration}ms): ${query.split('\n')[0].trim()}`);
    }
    
    return result;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    // Add failed query to history
    context.addQuery(query, params, startTime);
    
    // Enhanced error logging
    const errorLines = [];
    errorLines.push(`Query failed after ${duration}ms:`);
    errorLines.push(`  Query: ${query.split('\n')[0].trim()}`);
    if (params && params.length > 0) {
      errorLines.push(`  Params: ${JSON.stringify(params)}`);
    }
    errorLines.push(`  Error Code: ${error.code || 'N/A'}`);
    errorLines.push(`  Error Message: ${error.message || 'N/A'}`);
    
    // Add extended PostgreSQL error fields
    const pgFields = extractPgErrorFields(error);
    if (pgFields) {
      const fieldLines = formatPgErrorFields(pgFields);
      if (fieldLines.length > 0) {
        fieldLines.forEach(line => errorLines.push(`  ${line}`));
      }
    }
    
    // Provide debugging hints for common errors
    if (error.code === '42P01') {
      errorLines.push('💡 Hint: Relation (table/view) does not exist. Check if migrations are applied in correct order.');
    } else if (error.code === '42883') {
      errorLines.push('💡 Hint: Function does not exist. Check if required extensions or functions are installed.');
    } else if (error.code === '23505') {
      errorLines.push('💡 Hint: Unique constraint violation. Check for duplicate data.');
    } else if (error.code === '23503') {
      errorLines.push('💡 Hint: Foreign key constraint violation. Check referential integrity.');
    }
    
    // Log the consolidated error message
    log.error(errorLines.join('\n'));
    
    throw error;
  }
}
