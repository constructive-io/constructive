import 'graphile-build';
import 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-config';
import type { GraphQLFieldConfig } from 'graphql';
import type { GisFieldValue } from '../types';

// Import types.ts for Build augmentation side effects
import '../types';

/**
 * PostgisTransformationFieldsPlugin
 *
 * Adds transformation fields to PostGIS geometry/geography object types:
 *
 * - `centroid`: The geometric centroid of the geometry (client-side calculation)
 * - `bbox`: The bounding box of the geometry as [minX, minY, maxX, maxY]
 * - `numPoints`: Number of coordinate points in the geometry
 *
 * These are client-side transformations computed from GeoJSON coordinates.
 * For server-side PostGIS transformations (ST_Transform, ST_Buffer, ST_Simplify,
 * ST_MakeValid), use SQL computed columns or custom mutations.
 *
 * Note: ST_Transform, ST_Buffer, ST_Simplify, and ST_MakeValid take parameters
 * (target SRID, buffer distance, simplification tolerance) that make them better
 * suited as custom SQL functions or mutation fields rather than static object fields.
 */
export const PostgisTransformationFieldsPlugin: GraphileConfig.Plugin = {
  name: 'PostgisTransformationFieldsPlugin',
  version: '1.0.0',
  description: 'Adds transformation fields (centroid, bbox, numPoints) to PostGIS geometry types',
  after: ['PostgisRegisterTypesPlugin', 'PostgisGeometryFieldsPlugin'],

  schema: {
    hooks: {
      GraphQLObjectType_fields(fields, build, context) {
        const { isPgGISType, pgGISCodecName, pgGISTypeDetails } = context.scope;

        if (!isPgGISType || !pgGISCodecName || !pgGISTypeDetails) {
          return fields;
        }

        const {
          graphql: { GraphQLFloat, GraphQLInt, GraphQLList, GraphQLNonNull },
        } = build;

        type FieldsMap = Record<string, GraphQLFieldConfig<GisFieldValue, unknown>>;
        const newFields: FieldsMap = {};

        // bbox: available for all geometry types
        newFields.bbox = {
          type: new GraphQLList(new GraphQLNonNull(GraphQLFloat)),
          description:
            'Bounding box as [minX, minY, maxX, maxY]. ' +
            'Computed from GeoJSON coordinates.',
          resolve(data: GisFieldValue) {
            const coords = extractAllCoordinates(data.__geojson);
            if (coords.length === 0) return null;
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const c of coords) {
              if (c[0] < minX) minX = c[0];
              if (c[1] < minY) minY = c[1];
              if (c[0] > maxX) maxX = c[0];
              if (c[1] > maxY) maxY = c[1];
            }
            return [minX, minY, maxX, maxY];
          }
        };

        // centroid: available for all geometry types
        newFields.centroid = {
          type: new GraphQLList(new GraphQLNonNull(GraphQLFloat)),
          description:
            'Centroid as [x, y] (arithmetic mean of all coordinate points). ' +
            'This is a simple centroid, not a weighted geographic centroid.',
          resolve(data: GisFieldValue) {
            const coords = extractAllCoordinates(data.__geojson);
            if (coords.length === 0) return null;
            let sumX = 0, sumY = 0;
            for (const c of coords) {
              sumX += c[0];
              sumY += c[1];
            }
            return [sumX / coords.length, sumY / coords.length];
          }
        };

        // numPoints: count of coordinate points
        newFields.numPoints = {
          type: new GraphQLNonNull(GraphQLInt),
          description: 'Total number of coordinate points in the geometry.',
          resolve(data: GisFieldValue) {
            return extractAllCoordinates(data.__geojson).length;
          }
        };

        return build.extend(
          fields,
          newFields,
          'PostgisTransformationFieldsPlugin adding transformation fields'
        );
      }
    }
  }
};

/**
 * Recursively extracts all [x, y, ...] coordinate tuples from a GeoJSON geometry.
 */
function extractAllCoordinates(geojson: unknown): number[][] {
  const geo = geojson as Record<string, unknown>;
  const type = geo.type as string;

  switch (type) {
    case 'Point':
      return [geo.coordinates as number[]];

    case 'MultiPoint':
    case 'LineString':
      return geo.coordinates as number[][];

    case 'MultiLineString':
    case 'Polygon':
      return (geo.coordinates as number[][][]).flat();

    case 'MultiPolygon':
      return (geo.coordinates as number[][][][]).flat(2);

    case 'GeometryCollection': {
      const geometries = geo.geometries as unknown[];
      const all: number[][] = [];
      for (const g of geometries) {
        all.push(...extractAllCoordinates(g));
      }
      return all;
    }

    default:
      return [];
  }
}
