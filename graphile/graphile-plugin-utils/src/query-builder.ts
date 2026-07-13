import type { GraphileBuild } from 'graphile-build';
// Side-effect type import: graphile-build-pg augments GraphileBuild.Build with
// the `dataplanPg` helpers used below.
import type {} from 'graphile-build-pg';

/**
 * Walks from a PgCondition up to the PgSelectQueryBuilder.
 * Uses the `.parent` property on PgCondition to traverse up the chain,
 * following Benjie's pattern from postgraphile-plugin-fulltext-filter.
 *
 * This is used by satellite plugins (search, BM25, pgvector) that need to
 * access the query builder from within a filter's apply callback to inject
 * SELECT expressions (for ranking/scoring) and ORDER BY clauses.
 *
 * @param build - The Graphile Build object (needs build.dataplanPg.PgCondition)
 * @param $condition - The PgCondition instance from the filter apply callback
 * @returns The PgSelectQueryBuilder if found, or null
 */
export function getQueryBuilder(
  build: GraphileBuild.Build,
  $condition: any
): any | null {
  const PgCondition = build.dataplanPg?.PgCondition;
  if (!PgCondition) return null;

  let current = $condition;
  const { alias } = current;

  // Walk up through nested PgConditions (e.g. and/or/not)
  // Note: PgCondition.parent is protected, so we use bracket notation
  // to access it from outside the class hierarchy.
  while (
    current &&
    current instanceof PgCondition &&
    current.alias === alias
  ) {
    current = (current as any)['parent'];
  }

  // Verify we found a query builder with matching alias
  // Using duck-typing per Benjie's pattern
  if (
    current &&
    typeof current.selectAndReturnIndex === 'function' &&
    current.alias === alias
  ) {
    return current;
  }

  return null;
}
