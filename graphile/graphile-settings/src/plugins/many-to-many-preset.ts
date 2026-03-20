import type { GraphileConfig } from 'graphile-config';
import { PgManyToManyPreset } from '@graphile-contrib/pg-many-to-many';

/**
 * Many-to-Many Preset — ENABLED by default for clean relation naming.
 *
 * WHY THIS EXISTS:
 * Junction tables (e.g., `contact_events`, `deal_contacts`) create verbose
 * relation names like `contactEventsByEventId` with nested traversals through
 * the junction row. By enabling many-to-many by default, PostGraphile generates
 * clean shortcut fields that skip the junction table:
 *
 *   event.contacts          (instead of event.contactEventsByEventId)
 *   contact.deals           (instead of contact.dealContactsByContactId)
 *
 * The InflektPlugin's `_manyToManyRelation` inflector automatically picks short
 * names (pluralized target table) and falls back to the verbose default only
 * when there is a naming conflict (direct relation to the same target table,
 * or multiple m2m paths to the same target).
 *
 * OPTING OUT:
 * To disable many-to-many for a specific junction table, add a smart comment:
 *
 * ```sql
 * COMMENT ON TABLE post_tags IS E'@behavior -manyToMany';
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
 */

/**
 * Plugin that keeps many-to-many fields enabled by default.
 *
 * The upstream @graphile-contrib/pg-many-to-many plugin already enables m2m
 * by default. This plugin is now a no-op passthrough that preserves that
 * behavior. It remains in the preset chain so that the export names stay
 * stable and existing code that imports `ManyToManyOptInPlugin` continues
 * to work.
 *
 * To disable m2m for a specific junction table, use: @behavior -manyToMany
 */
export const ManyToManyOptInPlugin: GraphileConfig.Plugin = {
  name: 'ManyToManyOptInPlugin',
  version: '2.0.0',
  description: 'Many-to-many fields enabled by default (opt-out with @behavior -manyToMany)',
};

/**
 * Preset that includes the many-to-many plugin (enabled by default).
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
