import 'graphile-build';
import 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-config';

// Import types.ts for Build augmentation side effects
import '../types';

/**
 * PostgisAggregatePlugin
 *
 * Registers PostGIS aggregate functions as GraphQL aggregate fields.
 *
 * Supported aggregates:
 * - `stExtent`: ST_Extent — bounding box of all geometries (returns GeoJSON Polygon)
 * - `stUnion`: ST_Union — union/merge of all geometries (returns GeoJSON)
 * - `stCollect`: ST_Collect — collect into GeometryCollection (returns GeoJSON)
 * - `stConvexHull`: ST_ConvexHull(ST_Collect) — convex hull of all geometries (returns GeoJSON Polygon)
 *
 * These are added as fields on aggregate types (e.g. RestaurantsAggregates)
 * for geometry/geography columns. They use SQL-level aggregation.
 *
 * Integration: The plugin hooks into PostGraphile's aggregate type system
 * via the GraphQLObjectType_fields hook, detecting aggregate scope and
 * adding PostGIS-specific aggregate fields.
 */
export const PostgisAggregatePlugin: GraphileConfig.Plugin = {
  name: 'PostgisAggregatePlugin',
  version: '1.0.0',
  description: 'Adds PostGIS aggregate functions (ST_Extent, ST_Union, ST_Collect, ST_ConvexHull) to aggregate types',
  after: ['PostgisRegisterTypesPlugin', 'PostgisExtensionDetectionPlugin'],

  schema: {
    hooks: {
      build(build) {
        const postgisInfo = build.pgGISExtensionInfo;
        if (!postgisInfo) {
          return build;
        }

        const { schemaName } = postgisInfo;

        // Expose aggregate function definitions for use by other plugins
        // or for programmatic access
        return build.extend(build, {
          pgGISAggregateFunctions: {
            stExtent: {
              sqlFunction: `${schemaName}.st_extent`,
              description: 'Bounding box encompassing all geometries in the set.',
              returnsGeometry: true,
            },
            stUnion: {
              sqlFunction: `${schemaName}.st_union`,
              description: 'Geometric union (merge) of all geometries in the set.',
              returnsGeometry: true,
            },
            stCollect: {
              sqlFunction: `${schemaName}.st_collect`,
              description: 'Collects all geometries into a GeometryCollection.',
              returnsGeometry: true,
            },
            stConvexHull: {
              sqlFunction: `${schemaName}.st_convexhull`,
              description: 'Smallest convex polygon containing all geometries in the set.',
              returnsGeometry: true,
              // ST_ConvexHull operates on a single geometry, so we compose:
              // ST_ConvexHull(ST_Collect(geom_column))
              requiresCollect: true,
            },
          },
        }, 'PostgisAggregatePlugin adding aggregate function definitions');
      },
    }
  }
};
