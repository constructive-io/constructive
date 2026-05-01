import type { NodeTypeDefinition } from '../types';

export const SearchSpatialAggregate: NodeTypeDefinition = {
  name: 'SearchSpatialAggregate',
  slug: 'search_spatial_aggregate',
  category: 'search',
  display_name: 'Spatial Aggregate Search',
  description: 'Creates a derived/materialized geometry field on the parent table that automatically aggregates geometries from a source (child) table via triggers. When child rows are inserted/updated/deleted, the parent aggregate field is recalculated using the specified PostGIS aggregation function (ST_Union, ST_Collect, ST_ConvexHull, ST_ConcaveHull). Useful for materializing spatial boundaries from collections of points or polygons.',
  parameter_schema: {
    type: 'object',
    properties: {
      field_name: {
        type: 'string',
        format: 'column-ref',
        description: 'Name of the aggregate geometry column on the parent table',
        default: 'geom_aggregate'
      },
      source_table_id: {
        type: 'string',
        format: 'uuid',
        description: 'UUID of the source (child) table containing individual geometries'
      },
      source_geom_field: {
        type: 'string',
        format: 'column-ref',
        description: 'Name of the geometry column on the source table',
        default: 'geom'
      },
      source_fk_field: {
        type: 'string',
        format: 'column-ref',
        description: 'Name of the foreign key column on the source table pointing to the parent'
      },
      aggregate_function: {
        type: 'string',
        enum: [
          'union',
          'collect',
          'convex_hull',
          'concave_hull'
        ],
        description: 'PostGIS aggregation function: union (ST_Union, merges overlapping), collect (ST_Collect, groups without merging), convex_hull (smallest convex polygon), concave_hull (tighter boundary)',
        default: 'union'
      },
      geometry_type: {
        type: 'string',
        enum: [
          'Point',
          'LineString',
          'Polygon',
          'MultiPoint',
          'MultiLineString',
          'MultiPolygon',
          'GeometryCollection',
          'Geometry'
        ],
        description: 'Output geometry type constraint for the aggregate field',
        default: 'MultiPolygon'
      },
      srid: {
        type: 'integer',
        description: 'Spatial Reference System Identifier (e.g. 4326 for WGS84)',
        default: 4326
      },
      dimension: {
        type: 'integer',
        enum: [
          2,
          3,
          4
        ],
        description: 'Coordinate dimension (2=XY, 3=XYZ, 4=XYZM)',
        default: 2
      },
      use_geography: {
        type: 'boolean',
        description: 'Use geography type instead of geometry',
        default: false
      },
      index_method: {
        type: 'string',
        enum: [
          'gist',
          'spgist'
        ],
        description: 'Spatial index method for the aggregate field',
        default: 'gist'
      }
    },
    required: [
      'source_table_id',
      'source_fk_field'
    ]
  },
  tags: [
    'spatial',
    'postgis',
    'geometry',
    'aggregate',
    'schema'
  ]
};
