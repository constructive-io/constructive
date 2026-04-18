/**
 * Utility functions for the connection filter plugin.
 */

/**
 * Check if a value is an empty object (no own enumerable keys).
 */
export function isEmpty(o: unknown): boolean {
  return typeof o === 'object' && o !== null && Object.keys(o).length === 0;
}

/**
 * Check if a pgResource is a computed scalar attribute function.
 * A computed attribute is a function that:
 * - has parameters
 * - returns a scalar (no attributes on codec)
 * - is unique (returns single row)
 * - first parameter's codec has attributes (i.e. takes a table row)
 */
export function isComputedScalarAttributeResource(s: any): boolean {
  if (!s.parameters || s.parameters.length < 1) {
    return false;
  }
  if (s.codec.attributes) {
    return false;
  }
  if (!s.isUnique) {
    return false;
  }
  const firstParameter = s.parameters[0];
  if (!firstParameter?.codec.attributes) {
    return false;
  }
  return true;
}

/**
 * Get all computed attribute resources for a given source.
 */
export function getComputedAttributeResources(build: any, source: any): any[] {
  const computedAttributeSources = Object.values(
    build.input.pgRegistry.pgResources
  ).filter(
    (s: any) =>
      isComputedScalarAttributeResource(s) &&
      s.parameters[0].codec === source.codec
  );
  return computedAttributeSources;
}

/**
 * Walks from a PgCondition up to the PgSelectQueryBuilder.
 * Uses the .parent property on PgCondition to traverse up the chain,
 * following Benjie's pattern from postgraphile-plugin-fulltext-filter.
 *
 * This is used by satellite plugins (search, BM25, pgvector) that need
 * to access the query builder from within a filter's apply callback
 * to inject SELECT expressions (for ranking/scoring) and ORDER BY clauses.
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

/**
 * Creates an assertion function that validates filter input values.
 *
 * Rejects empty objects in nested contexts (logical operators, relation filters)
 * and optionally rejects null literals based on the connectionFilterAllowNullInput option.
 *
 * Note: Top-level empty filter `{}` is handled in ConnectionFilterArgPlugin's
 * applyPlan — it's treated as "no filter" and skipped, not rejected.
 */
export function makeAssertAllowed(build: any): (value: unknown, mode: 'object' | 'list') => void {
  const { options, EXPORTABLE } = build;
  const {
    connectionFilterAllowNullInput,
  } = options;

  const assertAllowed = EXPORTABLE(
    (
      connectionFilterAllowNullInput: boolean,
      isEmpty: (o: unknown) => boolean
    ) =>
      function (value: unknown, mode: 'object' | 'list') {
        // Reject empty objects in nested where contexts (and/or/not, relation filters)
        if (mode === 'object' && isEmpty(value)) {
          throw Object.assign(
            new Error(
              'Empty objects are forbidden in where argument input.'
            ),
            {}
          );
        }

        if (mode === 'list') {
          const arr = value as unknown[];
          if (arr) {
            const l = arr.length;
            for (let i = 0; i < l; i++) {
              if (isEmpty(arr[i])) {
                throw Object.assign(
                  new Error(
                    'Empty objects are forbidden in where argument input.'
                  ),
                  {}
                );
              }
            }
          }
        }

        // For all modes, check null
        if (!connectionFilterAllowNullInput && value === null) {
          throw Object.assign(
            new Error(
              'Null literals are forbidden in where argument input.'
            ),
            {}
          );
        }
      },
    [connectionFilterAllowNullInput, isEmpty]
  );

  return assertAllowed;
}
