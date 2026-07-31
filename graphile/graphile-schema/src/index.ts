export { buildSchemaArtifacts, buildSchemaSDL } from './build-schema';
export type { BuildSchemaArtifacts, BuildSchemaOptions } from './build-schema';
export { buildIntrospectionJSON } from './build-introspection';
/** @deprecated Best-effort compatibility state only — use `buildSchemaArtifacts` */
export { _cachedTablesMeta } from 'graphile-settings';
export type {
  TableMeta,
  FieldMeta,
  TypeMeta,
  IndexMeta,
  ConstraintsMeta,
  PrimaryKeyConstraintMeta,
  UniqueConstraintMeta,
  ForeignKeyConstraintMeta,
  RelationsMeta,
  BelongsToRelation,
  HasRelation,
  ManyToManyRelation,
  InflectionMeta,
  QueryMeta,
} from 'graphile-settings';
export { fetchEndpointSchemaSDL } from './fetch-endpoint-schema';
export type { FetchEndpointSchemaOptions } from './fetch-endpoint-schema';
