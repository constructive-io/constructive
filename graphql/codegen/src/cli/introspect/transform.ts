/**
 * Table utility functions for CleanTable[]
 *
 * Note: The _meta transform functions have been removed.
 * Tables are now inferred from standard GraphQL introspection
 * using inferTablesFromIntrospection() in ./infer-tables.ts
 */
import type { CleanTable } from '../../types/schema';

/**
 * Get table names from CleanTable array
 */
export function getTableNames(tables: CleanTable[]): string[] {
  return tables.map((t) => t.name);
}

/**
 * Find a table by name
 */
export function findTable(
  tables: CleanTable[],
  name: string
): CleanTable | undefined {
  return tables.find((t) => t.name === name);
}

/**
 * Filter tables by name pattern (glob-like)
 */
export function filterTables(
  tables: CleanTable[],
  include?: string[],
  exclude?: string[]
): CleanTable[] {
  let result = tables;

  if (include && include.length > 0) {
    result = result.filter((t) => matchesPatterns(t.name, include));
  }

  if (exclude && exclude.length > 0) {
    result = result.filter((t) => !matchesPatterns(t.name, exclude));
  }

  return result;
}

/**
 * Check if a name matches any of the patterns
 * Supports simple glob patterns with * wildcard
 */
function matchesPatterns(name: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern.includes('*')) {
      const regex = new RegExp(
        '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
      );
      return regex.test(name);
    }
    return name === pattern;
  });
}
