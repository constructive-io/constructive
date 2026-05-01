import type { NodeTypeDefinition } from '../types';

export const RelationSpatial: NodeTypeDefinition = {
  name: 'RelationSpatial',
  slug: 'relation_spatial',
  category: 'relation',
  display_name: 'Spatial Relation',
  description: "Declares a spatial predicate between two existing geometry/geography columns. Inserts a metaschema_public.spatial_relation row; the sync_spatial_relation_tags trigger then projects a @spatialRelation smart tag onto the owner column so graphile-postgis' PostgisSpatialRelationsPlugin can expose it as a cross-table filter in GraphQL. Metadata-only: both source_field and target_field must already exist on their tables. Idempotent on (source_table_id, name). One direction per tag — author two RelationSpatial entries if symmetry is desired.",
  parameter_schema: {
    type: 'object',
    properties: {
      source_table_id: {
        type: 'string',
        format: 'uuid',
        description: 'Table that owns the relation (the @spatialRelation tag is emitted on the owner column of this table)'
      },
      source_field_id: {
        type: 'string',
        format: 'uuid',
        description: 'Geometry/geography column on source_table that carries the @spatialRelation smart tag'
      },
      target_table_id: {
        type: 'string',
        format: 'uuid',
        description: 'Table being referenced by the spatial predicate'
      },
      target_field_id: {
        type: 'string',
        format: 'uuid',
        description: 'Geometry/geography column on target_table that the predicate is evaluated against'
      },
      name: {
        type: 'string',
        description: 'Relation name (stable, snake_case). Becomes the generated filter field name in GraphQL (e.g. nearby_clinic). Unique per (source_table_id, name) — idempotency key.'
      },
      operator: {
        type: 'string',
        enum: [
          'st_contains',
          'st_within',
          'st_intersects',
          'st_covers',
          'st_coveredby',
          'st_overlaps',
          'st_touches',
          'st_dwithin'
        ],
        description: 'PostGIS spatial predicate. One of the 8 whitelisted operators. st_dwithin requires param_name.'
      },
      param_name: {
        type: 'string',
        description: 'Parameter name for parametric operators (currently only st_dwithin, which needs a distance argument). Must be NULL for all other operators. Enforced by table CHECK.'
      }
    },
    required: [
      'source_table_id',
      'source_field_id',
      'target_table_id',
      'target_field_id',
      'name',
      'operator'
    ]
  },
  tags: [
    'relation',
    'spatial',
    'postgis',
    'schema'
  ]
};
