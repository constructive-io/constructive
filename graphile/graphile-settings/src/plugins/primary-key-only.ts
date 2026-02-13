import type { GraphileConfig } from 'graphile-config';

/**
 * Configuration options for unique lookup behavior.
 */
export interface UniqueLookupOptions {
  /**
   * If true, disables ALL unique constraint lookups including primary keys.
   * Users must use collection queries with filters instead.
   * Default: false (primary key lookups are kept)
   */
  disableAllUniqueLookups?: boolean;
}

/**
 * PrimaryKeyOnlyPlugin - Disables non-primary-key unique constraint lookups for
 * BOTH queries AND mutations.
 *
 * WHY THIS EXISTS:
 * PostGraphile v5 creates fields for EVERY unique constraint on a table:
 *
 * QUERIES (PgRowByUniquePlugin):
 * - `user(id)`, `userByEmail(email)`, `userByUsername(username)`
 *
 * MUTATIONS (PgMutationUpdateDeletePlugin):
 * - `updateUser`, `updateUserByEmail`, `updateUserByUsername`
 * - `deleteUser`, `deleteUserByEmail`, `deleteUserByUsername`
 *
 * For code generation (React Query, etc.), this creates unnecessary complexity.
 * The same operations can be done using the primary key lookup or filters.
 * Standardizing on primary keys reduces the API surface and generated code.
 *
 * SOURCE CODE REFERENCES:
 *
 * 1. Query fields (PgRowByUniquePlugin):
 * https://github.com/graphile/crystal/blob/924b2515c6bd30e5905ac1419a25244b40c8bb4d/graphile-build/graphile-build-pg/src/plugins/PgRowByUniquePlugin.ts#L42-L257
 *
 * The behavior check for queries:
 * ```typescript
 * const fieldBehaviorScope = "query:resource:single";
 * if (!build.behavior.pgResourceUniqueMatches([resource, unique], fieldBehaviorScope)) {
 *   return memo;  // Skip this field
 * }
 * ```
 *
 * 2. Mutation fields (PgMutationUpdateDeletePlugin):
 * https://github.com/graphile/crystal/blob/924b2515c6bd30e5905ac1419a25244b40c8bb4d/graphile-build/graphile-build-pg/src/plugins/PgMutationUpdateDeletePlugin.ts
 *
 * The behavior check for mutations:
 * ```typescript
 * const constraintMode = `constraint:${mode}`;  // "constraint:resource:update" or "constraint:resource:delete"
 * ...resource.uniques.filter((unique) => {
 *   return build.behavior.pgResourceUniqueMatches([resource, unique], constraintMode);
 * })
 * ```
 *
 * OUR FIX:
 * We use the behavior system's OVERRIDE phase (not inferred) to disable these behaviors.
 * The override phase runs AFTER the behavior multiplication/preferences system processes
 * behaviors, giving us the final say on what's enabled/disabled.
 *
 * Behaviors we control:
 * - `-single` - Disables query lookups (userByEmail, etc.)
 * - `-constraint:resource:update` - Disables updateByX mutations
 * - `-constraint:resource:delete` - Disables deleteByX mutations
 *
 * CONFIGURATION OPTIONS:
 *
 * 1. `disableAllUniqueLookups: false` (default - PrimaryKeyOnlyPreset):
 *    - Primary key: query lookup + mutations enabled
 *    - Non-primary-key: everything disabled
 *    Result: `user(id)`, `updateUser`, `deleteUser` only
 *
 * 2. `disableAllUniqueLookups: true` (NoUniqueLookupPreset):
 *    - Primary key: query lookup DISABLED, mutations ENABLED
 *    - Non-primary-key: everything disabled
 *    Result: No query lookups (use filters), but `updateUser`, `deleteUser` still work
 */

/**
 * Creates a plugin that controls unique constraint lookup behavior.
 *
 * @param options - Configuration options
 * @param options.disableAllUniqueLookups - If true, disables ALL unique lookups including primary keys
 */
export function createUniqueLookupPlugin(
  options: UniqueLookupOptions = {}
): GraphileConfig.Plugin {
  const { disableAllUniqueLookups = false } = options;

  return {
    name: 'UniqueLookupPlugin',
    version: '1.0.0',
    description: disableAllUniqueLookups
      ? 'Disables all unique constraint lookups (use filters instead)'
      : 'Disables non-primary-key unique constraint lookups to reduce API surface',

    schema: {
      entityBehavior: {
        pgResourceUnique: {
          // Use 'override' phase instead of 'inferred' - override runs AFTER
          // the behavior multiplication/preferences system processes behaviors,
          // so it has the final say on what behaviors are enabled/disabled.
          override: {
            provides: ['uniqueLookupControl'],
            callback(behavior, [_resource, unique]) {
              if (disableAllUniqueLookups) {
                // Disable ALL unique QUERY lookups - users must use filters
                // But KEEP primary key mutations (updateX, deleteX)
                if (unique.isPrimary) {
                  // Primary key: only disable query lookups, keep mutations
                  return [behavior, '-single'] as const;
                }
                // Non-primary-key: disable everything (queries and mutations)
                return [
                  behavior,
                  '-single',
                  '-constraint:resource:update',
                  '-constraint:resource:delete',
                ] as const;
              }
              // Only allow primary key lookups (both queries and mutations)
              if (!unique.isPrimary) {
                // Disable non-primary-key unique constraint lookups for queries and mutations
                return [
                  behavior,
                  '-single',
                  '-constraint:resource:update',
                  '-constraint:resource:delete',
                ] as const;
              }
              return behavior;
            },
          },
        },
      },
    },
  };
}

// Default plugin instance (primary key only)
export const PrimaryKeyOnlyPlugin = createUniqueLookupPlugin({
  disableAllUniqueLookups: false,
});

// Plugin that disables ALL unique lookups
export const NoUniqueLookupPlugin = createUniqueLookupPlugin({
  disableAllUniqueLookups: true,
});

/**
 * Preset that keeps only primary key lookups.
 * Use this in your main preset's `extends` array.
 */
export const PrimaryKeyOnlyPreset: GraphileConfig.Preset = {
  plugins: [PrimaryKeyOnlyPlugin],
};

/**
 * Preset that disables ALL unique lookups (including primary keys).
 * Users must use collection queries with filters instead.
 * Use this in your main preset's `extends` array.
 */
export const NoUniqueLookupPreset: GraphileConfig.Preset = {
  plugins: [NoUniqueLookupPlugin],
};
