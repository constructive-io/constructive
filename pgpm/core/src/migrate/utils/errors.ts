import { getEnvVars } from '@pgpmjs/env';
import { pgpmDefaults } from '@pgpmjs/types';

import { QueryHistoryEntry } from './transaction';

/**
 * Get error output configuration from environment variables with defaults.
 * Uses centralized env var parsing from @pgpmjs/env and defaults from @pgpmjs/types.
 */
export const getErrorOutputConfig = () => {
  const envVars = getEnvVars();
  const defaults = pgpmDefaults.errorOutput!;
  return {
    queryHistoryLimit: envVars.errorOutput?.queryHistoryLimit ?? defaults.queryHistoryLimit!,
    maxLength: envVars.errorOutput?.maxLength ?? defaults.maxLength!,
    verbose: envVars.errorOutput?.verbose ?? defaults.verbose!,
  };
};

const errorConfig = getErrorOutputConfig();

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
  if (errorConfig.verbose) {
    return history.map((entry, index) => formatQueryEntry(entry, index));
  }
  
  // Group consecutive identical queries
  const groups = groupConsecutiveQueries(history);
  
  // Apply limit - keep last N queries worth of groups
  let totalQueries = 0;
  let startGroupIndex = groups.length;
  
  for (let i = groups.length - 1; i >= 0; i--) {
    totalQueries += groups[i].count;
    if (totalQueries > errorConfig.queryHistoryLimit) {
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
  if (errorConfig.verbose) return lines;
  
  const joined = lines.join('\n');
  if (joined.length <= errorConfig.maxLength) return lines;
  
  // Truncate and add notice
  const truncated = joined.slice(0, errorConfig.maxLength);
  const lastNewline = truncated.lastIndexOf('\n');
  const cleanTruncated = lastNewline > 0 ? truncated.slice(0, lastNewline) : truncated;
  
  return [
    ...cleanTruncated.split('\n'),
    `... (output truncated at ${errorConfig.maxLength} chars, total was ${joined.length} chars)`,
    `    Set PGPM_ERROR_VERBOSE=true to see full output`
  ];
}
