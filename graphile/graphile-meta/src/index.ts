/**
 * PostGraphile v5 Meta Schema Plugin
 *
 * Exposes a `_meta` GraphQL query that provides metadata about tables, fields,
 * constraints, indexes, and relations for code generation tooling.
 */

import type { GraphileConfig } from 'graphile-config';

import { cachedTablesMeta } from './cache';
import { buildScalarEncoding } from './encoding-meta-builders';
import { getTablesMetaForSchema, MetaSchemaPlugin } from './plugin';
import { buildFieldMeta, pgTypeToGqlType } from './type-mappings';

export { getTablesMetaForSchema, MetaSchemaPlugin };

export const MetaSchemaPreset: GraphileConfig.Preset = {
  plugins: [MetaSchemaPlugin],
};

export type {
  BelongsToRelation,
  ConstraintsMeta,
  FieldMeta,
  ForeignKeyConstraintMeta,
  HasRelation,
  IndexMeta,
  InflectionMeta,
  ManyToManyRelation,
  PrimaryKeyConstraintMeta,
  QueryMeta,
  RelationsMeta,
  TableMeta,
  TypeMeta,
  UniqueConstraintMeta,
} from './types';

/** @internal Exported for testing only */
export { pgTypeToGqlType as _pgTypeToGqlType };
/** @internal Exported for testing only */
export { buildFieldMeta as _buildFieldMeta };
/** @deprecated Best-effort compatibility state only — use `getTablesMetaForSchema` */
export { cachedTablesMeta as _cachedTablesMeta };
/** @internal Exported for testing only */
export { buildScalarEncoding as _buildScalarEncoding };

export default MetaSchemaPlugin;
