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
 * Creates an assertion function that validates filter input values
 * based on the connectionFilterAllowNullInput and connectionFilterAllowEmptyObjectInput options.
 */
export function makeAssertAllowed(build: any): (value: unknown, mode: 'object' | 'list') => void {
  const { options, EXPORTABLE } = build;
  const {
    connectionFilterAllowNullInput,
    connectionFilterAllowEmptyObjectInput,
  } = options;

  const assertAllowed = EXPORTABLE(
    (
      connectionFilterAllowEmptyObjectInput: boolean,
      connectionFilterAllowNullInput: boolean,
      isEmpty: (o: unknown) => boolean
    ) =>
      function (value: unknown, mode: 'object' | 'list') {
        if (
          mode === 'object' &&
          !connectionFilterAllowEmptyObjectInput &&
          isEmpty(value)
        ) {
          throw Object.assign(
            new Error(
              'Empty objects are forbidden in filter argument input.'
            ),
            {}
          );
        }

        if (mode === 'list' && !connectionFilterAllowEmptyObjectInput) {
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
    [connectionFilterAllowEmptyObjectInput, connectionFilterAllowNullInput, isEmpty]
  );

  return assertAllowed;
}
