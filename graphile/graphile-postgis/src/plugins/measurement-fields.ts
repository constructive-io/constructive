import 'graphile-build';
import 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-config';
import type { GraphQLFieldConfig } from 'graphql';
import { GisSubtype } from '../constants';
import type { GisFieldValue } from '../types';

// Import types.ts for Build/Inflection/Scope augmentation side effects
import '../types';

// ─── Client-side geodesic calculations ───────────────────────────────────
//
// These compute approximate measurements from GeoJSON coordinates using
// geodesic formulas (Haversine for distance, spherical excess for area).
// They assume WGS84 (SRID 4326) coordinates ([longitude, latitude]).
//
// For exact server-side PostGIS measurements, use SQL computed columns
// with ST_Area, ST_Length, or ST_Perimeter directly.

const EARTH_RADIUS_M = 6_371_008.8;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Haversine distance between two [lon, lat] points, in meters. */
function haversineDistance(a: number[], b: number[]): number {
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Length of a coordinate sequence in meters (sum of Haversine segments). */
function coordsLength(coords: number[][]): number {
  let len = 0;
  for (let i = 1; i < coords.length; i++) {
    len += haversineDistance(coords[i - 1], coords[i]);
  }
  return len;
}

/**
 * Geodesic area of a ring using the spherical excess formula.
 * Coordinates are [longitude, latitude] in degrees. Returns square meters.
 */
function ringArea(coords: number[][]): number {
  if (coords.length < 4) return 0;
  let area = 0;
  const len = coords.length;
  for (let i = 0; i < len - 1; i++) {
    const p1 = coords[i];
    const p2 = coords[(i + 1) % (len - 1)];
    area += toRad(p2[0] - p1[0]) * (2 + Math.sin(toRad(p1[1])) + Math.sin(toRad(p2[1])));
  }
  return Math.abs((area * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
}

/** Area of a polygon (exterior minus holes), in square meters. */
function polygonArea(coordinates: number[][][]): number {
  let area = ringArea(coordinates[0]);
  for (let i = 1; i < coordinates.length; i++) {
    area -= ringArea(coordinates[i]);
  }
  return Math.abs(area);
}

/**
 * PostgisMeasurementFieldsPlugin
 *
 * Adds measurement fields to PostGIS geometry/geography object types:
 *
 * - LineString / MultiLineString: `length` (meters, Haversine)
 * - Polygon / MultiPolygon: `area` (sq meters, spherical excess), `perimeter` (meters)
 *
 * All measurements are approximate geodesic calculations from GeoJSON
 * coordinates assuming WGS84. For exact PostGIS server-side values, use
 * SQL computed columns (ST_Area, ST_Length, ST_Perimeter).
 */
export const PostgisMeasurementFieldsPlugin: GraphileConfig.Plugin = {
  name: 'PostgisMeasurementFieldsPlugin',
  version: '1.0.0',
  description: 'Adds measurement fields (area, length, perimeter) to PostGIS geometry types',
  after: ['PostgisRegisterTypesPlugin', 'PostgisGeometryFieldsPlugin'],

  schema: {
    hooks: {
      GraphQLObjectType_fields(fields, build, context) {
        const { isPgGISType, pgGISCodecName, pgGISTypeDetails } = context.scope;

        if (!isPgGISType || !pgGISCodecName || !pgGISTypeDetails) {
          return fields;
        }

        const {
          graphql: { GraphQLFloat },
        } = build;

        const { subtype } = pgGISTypeDetails;

        type FieldsMap = Record<string, GraphQLFieldConfig<GisFieldValue, unknown>>;
        const newFields: FieldsMap = {};

        if (subtype === GisSubtype.Polygon) {
          newFields.area = {
            type: GraphQLFloat,
            description: 'Approximate area in square meters (geodesic calculation from coordinates).',
            resolve(data: GisFieldValue) {
              const geojson = data.__geojson as { coordinates: number[][][] };
              return polygonArea(geojson.coordinates);
            }
          };
          newFields.perimeter = {
            type: GraphQLFloat,
            description: 'Approximate perimeter in meters (geodesic calculation from coordinates).',
            resolve(data: GisFieldValue) {
              const geojson = data.__geojson as { coordinates: number[][][] };
              let perim = coordsLength(geojson.coordinates[0]);
              for (let i = 1; i < geojson.coordinates.length; i++) {
                perim += coordsLength(geojson.coordinates[i]);
              }
              return perim;
            }
          };
        }

        if (subtype === GisSubtype.MultiPolygon) {
          newFields.area = {
            type: GraphQLFloat,
            description: 'Approximate total area in square meters (geodesic calculation from coordinates).',
            resolve(data: GisFieldValue) {
              const geojson = data.__geojson as { coordinates: number[][][][] };
              let total = 0;
              for (const polygonCoords of geojson.coordinates) {
                total += polygonArea(polygonCoords);
              }
              return total;
            }
          };
          newFields.perimeter = {
            type: GraphQLFloat,
            description: 'Approximate total perimeter in meters (geodesic calculation from coordinates).',
            resolve(data: GisFieldValue) {
              const geojson = data.__geojson as { coordinates: number[][][][] };
              let perim = 0;
              for (const polygonCoords of geojson.coordinates) {
                for (const ring of polygonCoords) {
                  perim += coordsLength(ring);
                }
              }
              return perim;
            }
          };
        }

        if (subtype === GisSubtype.LineString) {
          newFields.length = {
            type: GraphQLFloat,
            description: 'Approximate length in meters (geodesic calculation from coordinates).',
            resolve(data: GisFieldValue) {
              const geojson = data.__geojson as { coordinates: number[][] };
              return coordsLength(geojson.coordinates);
            }
          };
        }

        if (subtype === GisSubtype.MultiLineString) {
          newFields.length = {
            type: GraphQLFloat,
            description: 'Approximate total length in meters (geodesic calculation from coordinates).',
            resolve(data: GisFieldValue) {
              const geojson = data.__geojson as { coordinates: number[][][] };
              let total = 0;
              for (const lineCoords of geojson.coordinates) {
                total += coordsLength(lineCoords);
              }
              return total;
            }
          };
        }

        if (Object.keys(newFields).length === 0) {
          return fields;
        }

        return build.extend(
          fields,
          newFields,
          'PostgisMeasurementFieldsPlugin adding measurement fields'
        );
      }
    }
  }
};
