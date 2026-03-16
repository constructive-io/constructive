/**
 * PostGraphile v5 Meta Schema Plugin
 *
 * Exposes a `_meta` GraphQL query that provides metadata about tables, fields,
 * constraints, indexes, and relations for code generation tooling.
 */

import type { GraphileConfig } from 'graphile-config';
import { cachedTablesMeta, getCachedTablesMeta } from './meta-schema/cache';
import { MetaSchemaPlugin } from './meta-schema/plugin';
import { buildFieldMeta, pgTypeToGqlType } from './meta-schema/type-mappings';

export { MetaSchemaPlugin };
export { getCachedTablesMeta };
export type { TableMeta } from './meta-schema/types';

export const MetaSchemaPreset: GraphileConfig.Preset = {
  plugins: [MetaSchemaPlugin],
};

/** @internal Exported for testing only */
export { pgTypeToGqlType as _pgTypeToGqlType };
/** @internal Exported for testing only */
export { buildFieldMeta as _buildFieldMeta };
/** @internal Exported for testing only */
export { cachedTablesMeta as _cachedTablesMeta };

export default MetaSchemaPlugin;
