/**
 * Utility functions for graphile-plugin-connection-filter v5
 *
 * These utilities are used across multiple plugins for validation,
 * computed attribute detection, and other shared functionality.
 */

import 'graphile-build-pg';
import type { PgResource } from '@dataplan/pg';

/**
 * Checks if an object is empty (no keys).
 * Used for validating filter input when connectionFilterAllowEmptyObjectInput is false.
 */
export function isEmpty(o: unknown): boolean {
  return typeof o === 'object' && o !== null && Object.keys(o).length === 0;
}

/**
 * Checks if a resource represents a computed scalar attribute.
 *
 * A computed scalar attribute is a function that:
 * 1. Has at least one parameter
 * 2. Returns a scalar (no attributes on codec)
 * 3. Is unique (returns single value)
 * 4. First parameter is a table type (has attributes)
 */
export function isComputedScalarAttributeResource(
  s: PgResource<any, any, any, any>
): boolean {
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
 * Gets all computed attribute resources for a given source.
 *
 * Returns functions where:
 * - The function is a computed scalar attribute
 * - The first parameter's codec matches the source's codec
 */
export function getComputedAttributeResources(
  build: GraphileBuild.Build,
  source: PgResource<any, any, any, any>
): PgResource<any, any, any, any>[] {
  const computedAttributeSources = Object.values(
    build.input.pgRegistry.pgResources
  ).filter(
    (s) =>
      isComputedScalarAttributeResource(s as PgResource<any, any, any, any>) &&
      (s as PgResource<any, any, any, any>).parameters![0].codec === source.codec
  );
  return computedAttributeSources as PgResource<any, any, any, any>[];
}

/**
 * Creates an assertion function that validates filter input values.
 *
 * The returned function checks:
 * - For 'object' mode: ensures value is not empty (if connectionFilterAllowEmptyObjectInput is false)
 * - For 'list' mode: ensures no items in the list are empty objects
 * - For 'scalar' mode: only checks null (scalars can't be empty objects)
 * - For all modes: ensures value is not null (if connectionFilterAllowNullInput is false)
 *
 * This function is designed to be used with EXPORTABLE for tree-shaking.
 * The returned function includes `isEmpty` in its closure so callers don't need to pass it.
 */
export function makeAssertAllowed(
  build: GraphileBuild.Build
): (value: unknown, mode: 'object' | 'list' | 'scalar') => void {
  const { options, EXPORTABLE } = build;
  const {
    connectionFilterAllowNullInput,
    connectionFilterAllowEmptyObjectInput,
  } = options;

  const assertAllowed = EXPORTABLE(
    (
      connectionFilterAllowEmptyObjectInput: boolean | undefined,
      connectionFilterAllowNullInput: boolean | undefined,
      isEmpty: (o: unknown) => boolean
    ) =>
      function (value: unknown, mode: 'object' | 'list' | 'scalar'): void {
        if (
          mode === 'object' &&
          !connectionFilterAllowEmptyObjectInput &&
          isEmpty(value)
        ) {
          throw Object.assign(
            new Error('Empty objects are forbidden in filter argument input.'),
            {
              // TODO: mark this error as safe
            }
          );
        }

        if (mode === 'list' && !connectionFilterAllowEmptyObjectInput) {
          const arr = value as unknown[] | null | undefined;
          if (arr) {
            const l = arr.length;
            for (let i = 0; i < l; i++) {
              if (isEmpty(arr[i])) {
                throw Object.assign(
                  new Error(
                    'Empty objects are forbidden in filter argument input.'
                  ),
                  {
                    // TODO: mark this error as safe
                  }
                );
              }
            }
          }
        }

        // For all modes, check null
        if (!connectionFilterAllowNullInput && value === null) {
          throw Object.assign(
            new Error('Null literals are forbidden in filter argument input.'),
            {
              // TODO: mark this error as safe
            }
          );
        }
      },
    [connectionFilterAllowEmptyObjectInput, connectionFilterAllowNullInput, isEmpty]
  );

  return assertAllowed;
}
