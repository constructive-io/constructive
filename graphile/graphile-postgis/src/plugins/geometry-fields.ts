import 'graphile-build';
import 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-config';
import type {
  GraphQLFieldConfig,
  GraphQLList as GraphQLListType,
  GraphQLOutputType
} from 'graphql';
import { GisSubtype } from '../constants';
import type { GisFieldValue, GisTypeDetails } from '../types';
import { getGISTypeName } from '../utils';

// Import types.ts for Build/Inflection/Scope augmentation side effects
import '../types';

/**
 * PostgisGeometryFieldsPlugin
 *
 * Enhances PostGIS geometry object types with subtype-specific fields:
 *
 * - Point: x/longitude, y/latitude, optional z/height
 * - LineString: points array
 * - Polygon: exterior ring, interiors array
 * - MultiPoint: points array
 * - MultiLineString: lines array
 * - MultiPolygon: polygons array
 * - GeometryCollection: geometries array (uses dimension interface)
 *
 * Uses the GraphQLObjectType_fields hook to add fields based on the
 * type's scope (isPgGISType, pgGISCodecName, pgGISTypeDetails).
 */
export const PostgisGeometryFieldsPlugin: GraphileConfig.Plugin = {
  name: 'PostgisGeometryFieldsPlugin',
  version: '2.0.0',
  description: 'Adds subtype-specific fields to PostGIS geometry types',
  after: ['PostgisRegisterTypesPlugin', 'PostgisInflectionPlugin'],

  schema: {
    hooks: {
      GraphQLObjectType_fields(fields, build, context) {
        const { isPgGISType, pgGISCodecName, pgGISTypeDetails } = context.scope;

        if (!isPgGISType || !pgGISCodecName || !pgGISTypeDetails) {
          return fields;
        }

        const {
          graphql: { GraphQLNonNull, GraphQLFloat, GraphQLList },
          inflection
        } = build;

        const typeDetails = pgGISTypeDetails;
        const { subtype, hasZ, hasM, srid } = typeDetails;
        const getType = build.getPostgisTypeByGeometryType;

        switch (subtype) {
          case GisSubtype.Point:
            return addPointFields(
              fields, build, pgGISCodecName, hasZ,
              GraphQLNonNull, GraphQLFloat, inflection
            );

          case GisSubtype.LineString:
            return addLineStringFields(
              fields, build, pgGISCodecName, hasZ, hasM, srid,
              GraphQLList, getType
            );

          case GisSubtype.Polygon:
            return addPolygonFields(
              fields, build, pgGISCodecName, hasZ, hasM, srid,
              GraphQLList, getType
            );

          case GisSubtype.MultiPoint:
            return addMultiPointFields(
              fields, build, pgGISCodecName, hasZ, hasM, srid,
              GraphQLList, getType
            );

          case GisSubtype.MultiLineString:
            return addMultiLineStringFields(
              fields, build, pgGISCodecName, hasZ, hasM, srid,
              GraphQLList, getType
            );

          case GisSubtype.MultiPolygon:
            return addMultiPolygonFields(
              fields, build, pgGISCodecName, hasZ, hasM, srid,
              GraphQLList, getType
            );

          case GisSubtype.GeometryCollection:
            return addGeometryCollectionFields(
              fields, build, pgGISCodecName, hasZ, hasM,
              GraphQLList
            );

          default:
            return fields;
        }
      }
    }
  }
};

type FieldsMap = Record<string, GraphQLFieldConfig<GisFieldValue, unknown>>;
type GetTypeByGeometryType = GraphileBuild.Build['getPostgisTypeByGeometryType'];

function addPointFields(
  fields: FieldsMap,
  build: GraphileBuild.Build,
  codecName: string,
  hasZ: boolean,
  GraphQLNonNull: typeof import('graphql').GraphQLNonNull,
  GraphQLFloat: typeof import('graphql').GraphQLFloat,
  inflection: GraphileBuild.Inflection
): FieldsMap {
  const xFieldName = inflection.gisXFieldName(codecName);
  const yFieldName = inflection.gisYFieldName(codecName);
  const zFieldName = inflection.gisZFieldName(codecName);

  const newFields: FieldsMap = {
    [xFieldName]: {
      type: new GraphQLNonNull(GraphQLFloat),
      resolve(data: GisFieldValue) {
        const point = data.__geojson;
        return (point as { coordinates: number[] }).coordinates[0];
      }
    },
    [yFieldName]: {
      type: new GraphQLNonNull(GraphQLFloat),
      resolve(data: GisFieldValue) {
        const point = data.__geojson;
        return (point as { coordinates: number[] }).coordinates[1];
      }
    }
  };

  if (hasZ) {
    newFields[zFieldName] = {
      type: new GraphQLNonNull(GraphQLFloat),
      resolve(data: GisFieldValue) {
        const point = data.__geojson;
        return (point as { coordinates: number[] }).coordinates[2];
      }
    };
  }

  return build.extend(
    fields,
    newFields,
    'PostgisGeometryFieldsPlugin adding Point fields'
  );
}

function addLineStringFields(
  fields: FieldsMap,
  build: GraphileBuild.Build,
  codecName: string,
  hasZ: boolean,
  hasM: boolean,
  srid: number,
  GraphQLList: typeof GraphQLListType,
  getType: GetTypeByGeometryType
): FieldsMap {
  const PointType = getType?.(codecName, GisSubtype.Point, hasZ, hasM, srid);
  if (!PointType) return fields;

  return build.extend(
    fields,
    {
      points: {
        type: new GraphQLList(PointType as GraphQLOutputType),
        resolve(data: GisFieldValue) {
          const lineString = data.__geojson as { coordinates: number[][] };
          return lineString.coordinates.map((coord: number[]) => ({
            __gisType: getGISTypeName(GisSubtype.Point, hasZ, hasM),
            __srid: data.__srid,
            __geojson: {
              type: 'Point' as const,
              coordinates: coord
            }
          }));
        }
      }
    },
    'PostgisGeometryFieldsPlugin adding LineString fields'
  );
}

function addPolygonFields(
  fields: FieldsMap,
  build: GraphileBuild.Build,
  codecName: string,
  hasZ: boolean,
  hasM: boolean,
  srid: number,
  GraphQLList: typeof GraphQLListType,
  getType: GetTypeByGeometryType
): FieldsMap {
  const LineStringType = getType?.(codecName, GisSubtype.LineString, hasZ, hasM, srid);
  if (!LineStringType) return fields;

  return build.extend(
    fields,
    {
      exterior: {
        type: LineStringType as GraphQLOutputType,
        resolve(data: GisFieldValue) {
          const polygon = data.__geojson as { coordinates: number[][][] };
          return {
            __gisType: getGISTypeName(GisSubtype.LineString, hasZ, hasM),
            __srid: data.__srid,
            __geojson: {
              type: 'LineString' as const,
              coordinates: polygon.coordinates[0]
            }
          };
        }
      },
      interiors: {
        type: new GraphQLList(LineStringType as GraphQLOutputType),
        resolve(data: GisFieldValue) {
          const polygon = data.__geojson as { coordinates: number[][][] };
          return polygon.coordinates.slice(1).map((coord: number[][]) => ({
            __gisType: getGISTypeName(GisSubtype.LineString, hasZ, hasM),
            __srid: data.__srid,
            __geojson: {
              type: 'LineString' as const,
              coordinates: coord
            }
          }));
        }
      }
    },
    'PostgisGeometryFieldsPlugin adding Polygon fields'
  );
}

function addMultiPointFields(
  fields: FieldsMap,
  build: GraphileBuild.Build,
  codecName: string,
  hasZ: boolean,
  hasM: boolean,
  srid: number,
  GraphQLList: typeof GraphQLListType,
  getType: GetTypeByGeometryType
): FieldsMap {
  const PointType = getType?.(codecName, GisSubtype.Point, hasZ, hasM, srid);
  if (!PointType) return fields;

  return build.extend(
    fields,
    {
      points: {
        type: new GraphQLList(PointType as GraphQLOutputType),
        resolve(data: GisFieldValue) {
          const multiPoint = data.__geojson as { coordinates: number[][] };
          return multiPoint.coordinates.map((coord: number[]) => ({
            __gisType: getGISTypeName(GisSubtype.Point, hasZ, hasM),
            __srid: data.__srid,
            __geojson: {
              type: 'Point' as const,
              coordinates: coord
            }
          }));
        }
      }
    },
    'PostgisGeometryFieldsPlugin adding MultiPoint fields'
  );
}

function addMultiLineStringFields(
  fields: FieldsMap,
  build: GraphileBuild.Build,
  codecName: string,
  hasZ: boolean,
  hasM: boolean,
  srid: number,
  GraphQLList: typeof GraphQLListType,
  getType: GetTypeByGeometryType
): FieldsMap {
  const LineStringType = getType?.(codecName, GisSubtype.LineString, hasZ, hasM, srid);
  if (!LineStringType) return fields;

  return build.extend(
    fields,
    {
      lines: {
        type: new GraphQLList(LineStringType as GraphQLOutputType),
        resolve(data: GisFieldValue) {
          const multiLineString = data.__geojson as { coordinates: number[][][] };
          return multiLineString.coordinates.map((coord: number[][]) => ({
            __gisType: getGISTypeName(GisSubtype.LineString, hasZ, hasM),
            __srid: data.__srid,
            __geojson: {
              type: 'LineString' as const,
              coordinates: coord
            }
          }));
        }
      }
    },
    'PostgisGeometryFieldsPlugin adding MultiLineString fields'
  );
}

function addMultiPolygonFields(
  fields: FieldsMap,
  build: GraphileBuild.Build,
  codecName: string,
  hasZ: boolean,
  hasM: boolean,
  srid: number,
  GraphQLList: typeof GraphQLListType,
  getType: GetTypeByGeometryType
): FieldsMap {
  const PolygonType = getType?.(codecName, GisSubtype.Polygon, hasZ, hasM, srid);
  if (!PolygonType) return fields;

  return build.extend(
    fields,
    {
      polygons: {
        type: new GraphQLList(PolygonType as GraphQLOutputType),
        resolve(data: GisFieldValue) {
          const multiPolygon = data.__geojson as { coordinates: number[][][][] };
          return multiPolygon.coordinates.map((coord: number[][][]) => ({
            __gisType: getGISTypeName(GisSubtype.Polygon, hasZ, hasM),
            __srid: data.__srid,
            __geojson: {
              type: 'Polygon' as const,
              coordinates: coord
            }
          }));
        }
      }
    },
    'PostgisGeometryFieldsPlugin adding MultiPolygon fields'
  );
}

function addGeometryCollectionFields(
  fields: FieldsMap,
  build: GraphileBuild.Build,
  codecName: string,
  hasZ: boolean,
  hasM: boolean,
  GraphQLList: typeof GraphQLListType
): FieldsMap {
  const dimInterfaceName = build.inflection.gisDimensionInterfaceName(codecName, hasZ, hasM);
  const Interface = build.getTypeByName(dimInterfaceName);

  if (!Interface) {
    console.warn(`PostgisGeometryFieldsPlugin: Could not find dimension interface ${dimInterfaceName}`);
    return fields;
  }

  return build.extend(
    fields,
    {
      geometries: {
        type: new GraphQLList(Interface),
        resolve(data: GisFieldValue) {
          const geometryCollection = data.__geojson as { geometries: Array<{ type: string; coordinates: unknown }> };
          return geometryCollection.geometries.map((geom) => {
            const subtypeValue = GisSubtype[geom.type as keyof typeof GisSubtype];
            if (subtypeValue === undefined) {
              throw new Error(`Unsupported geometry subtype ${geom.type}`);
            }
            return {
              __gisType: getGISTypeName(subtypeValue, hasZ, hasM),
              __srid: data.__srid,
              __geojson: geom
            };
          });
        }
      }
    },
    'PostgisGeometryFieldsPlugin adding GeometryCollection fields'
  );
}
