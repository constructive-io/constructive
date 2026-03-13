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
        // Reject empty objects in nested filter contexts (and/or/not, relation filters)
        if (mode === 'object' && isEmpty(value)) {
          throw Object.assign(
            new Error(
              'Empty objects are forbidden in filter argument input.'
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
                    'Empty objects are forbidden in filter argument input.'
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
              'Null literals are forbidden in filter argument input.'
            ),
            {}
          );
        }
      },
    [connectionFilterAllowNullInput, isEmpty]
  );

  return assertAllowed;
}
