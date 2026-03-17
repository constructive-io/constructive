import type { GraphileConfig } from 'graphile-config';
import { PgManyToManyPreset } from '@graphile-contrib/pg-many-to-many';

/**
 * Many-to-Many Preset with OPT-IN behavior (disabled by default).
 *
 * WHY THIS EXISTS:
 * The default @graphile-contrib/pg-many-to-many plugin adds many-to-many connection
 * fields to EVERY junction table automatically. This can bloat the API with fields
 * that may never be used.
 *
 * OUR FIX:
 * We override the default behavior to be OPT-IN instead of OPT-OUT:
 * - By default, NO many-to-many fields are generated
 * - To enable for a specific junction table, use: @behavior +manyToMany
 *
 * USAGE:
 * To enable many-to-many for a specific junction table, add a smart comment:
 *
 * ```sql
 * -- Enable many-to-many through this junction table
 * COMMENT ON TABLE post_tags IS E'@behavior +manyToMany';
 *
 * -- Or enable on a specific constraint
 * COMMENT ON CONSTRAINT post_tags_tag_id_fkey ON post_tags IS E'@behavior +manyToMany';
 * ```
 *
 * SOURCE CODE REFERENCE:
 * The many-to-many plugin uses the behavior system to control field generation:
 * https://github.com/graphile-contrib/pg-many-to-many/blob/v2.0.0-rc.1/src/PgManyToManyRelationPlugin.ts#L478-L503
 *
 * The plugin defines these behaviors:
 * - `manyToMany` - Controls whether many-to-many fields are generated
 * - `connection` - Controls whether connection fields are generated
 * - `list` - Controls whether list fields are generated
 *
 * By default, the plugin's entityBehavior for pgManyToMany includes:
 * `["manyToMany", "connection", "list", behavior]`
 *
 * We override this to be `-manyToMany` by default, requiring explicit opt-in.
 */

/**
 * Plugin that makes many-to-many fields opt-in by default.
 *
 * This overrides the default behavior from @graphile-contrib/pg-many-to-many
 * to require explicit `@behavior +manyToMany` smart tags.
 */
export const ManyToManyOptInPlugin: GraphileConfig.Plugin = {
  name: 'ManyToManyOptInPlugin',
  version: '1.0.0',
  description: 'Makes many-to-many fields opt-in by default (disabled unless explicitly enabled)',

  schema: {
    entityBehavior: {
      pgManyToMany: {
        // Override the default behavior to be opt-out (disabled by default)
        // The 'inferred' phase runs before 'override', so we use 'inferred'
        // to set the default before any smart tags are processed.
        inferred: {
          provides: ['manyToManyOptIn'],
          before: ['default'],
          callback(behavior) {
            // Default to disabled - require explicit @behavior +manyToMany
            return ['-manyToMany', behavior];
          },
        },
      },
    },
  },
};

/**
 * Preset that includes the many-to-many plugin with opt-in behavior.
 *
 * Use this in your main preset's `extends` array:
 * ```typescript
 * const preset: GraphileConfig.Preset = {
 *   extends: [
 *     MinimalPreset,
 *     ManyToManyOptInPreset,
 *     // ... other presets
 *   ],
 * };
 * ```
 */
export const ManyToManyOptInPreset: GraphileConfig.Preset = {
  extends: [PgManyToManyPreset],
  plugins: [ManyToManyOptInPlugin],
};

export default ManyToManyOptInPreset;
