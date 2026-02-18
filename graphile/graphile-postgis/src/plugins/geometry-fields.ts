import 'graphile-build';
import type { GraphileConfig } from 'graphile-config';
import { GisSubtype } from '../constants';
import { getGISTypeName } from '../utils';
import type { GisTypeDetails } from '../types';

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
        const scope = context.scope as any;
        const { isPgGISType, pgGISCodecName, pgGISTypeDetails } = scope;

        if (!isPgGISType || !pgGISCodecName || !pgGISTypeDetails) {
          return fields;
        }

        const {
          graphql: { GraphQLNonNull, GraphQLFloat, GraphQLList },
          inflection
        } = build;

        const typeDetails = pgGISTypeDetails as GisTypeDetails;
        const { subtype, hasZ, hasM, srid } = typeDetails;
        const getType = (build as any).getPostgisTypeByGeometryType;

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

function addPointFields(
  fields: any,
  build: any,
  codecName: string,
  hasZ: boolean,
  GraphQLNonNull: any,
  GraphQLFloat: any,
  inflection: any
): any {
  const xFieldName = inflection.gisXFieldName(codecName);
  const yFieldName = inflection.gisYFieldName(codecName);
  const zFieldName = inflection.gisZFieldName(codecName);

  const newFields: Record<string, any> = {
    [xFieldName]: {
      type: new GraphQLNonNull(GraphQLFloat),
      resolve(data: any) {
        const point = data.__geojson;
        return point.coordinates[0];
      }
    },
    [yFieldName]: {
      type: new GraphQLNonNull(GraphQLFloat),
      resolve(data: any) {
        const point = data.__geojson;
        return point.coordinates[1];
      }
    }
  };

  if (hasZ) {
    newFields[zFieldName] = {
      type: new GraphQLNonNull(GraphQLFloat),
      resolve(data: any) {
        const point = data.__geojson;
        return point.coordinates[2];
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
  fields: any,
  build: any,
  codecName: string,
  hasZ: boolean,
  hasM: boolean,
  srid: number,
  GraphQLList: any,
  getType: any
): any {
  const PointType = getType(codecName, GisSubtype.Point, hasZ, hasM, srid);
  if (!PointType) return fields;

  return build.extend(
    fields,
    {
      points: {
        type: new GraphQLList(PointType),
        resolve(data: any) {
          const lineString = data.__geojson;
          return lineString.coordinates.map((coord: number[]) => ({
            __gisType: getGISTypeName(GisSubtype.Point, hasZ, hasM),
            __srid: data.__srid,
            __geojson: {
              type: 'Point',
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
  fields: any,
  build: any,
  codecName: string,
  hasZ: boolean,
  hasM: boolean,
  srid: number,
  GraphQLList: any,
  getType: any
): any {
  const LineStringType = getType(codecName, GisSubtype.LineString, hasZ, hasM, srid);
  if (!LineStringType) return fields;

  return build.extend(
    fields,
    {
      exterior: {
        type: LineStringType,
        resolve(data: any) {
          const polygon = data.__geojson;
          return {
            __gisType: getGISTypeName(GisSubtype.LineString, hasZ, hasM),
            __srid: data.__srid,
            __geojson: {
              type: 'LineString',
              coordinates: polygon.coordinates[0]
            }
          };
        }
      },
      interiors: {
        type: new GraphQLList(LineStringType),
        resolve(data: any) {
          const polygon = data.__geojson;
          return polygon.coordinates.slice(1).map((coord: number[][]) => ({
            __gisType: getGISTypeName(GisSubtype.LineString, hasZ, hasM),
            __srid: data.__srid,
            __geojson: {
              type: 'LineString',
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
  fields: any,
  build: any,
  codecName: string,
  hasZ: boolean,
  hasM: boolean,
  srid: number,
  GraphQLList: any,
  getType: any
): any {
  const PointType = getType(codecName, GisSubtype.Point, hasZ, hasM, srid);
  if (!PointType) return fields;

  return build.extend(
    fields,
    {
      points: {
        type: new GraphQLList(PointType),
        resolve(data: any) {
          const multiPoint = data.__geojson;
          return multiPoint.coordinates.map((coord: number[]) => ({
            __gisType: getGISTypeName(GisSubtype.Point, hasZ, hasM),
            __srid: data.__srid,
            __geojson: {
              type: 'Point',
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
  fields: any,
  build: any,
  codecName: string,
  hasZ: boolean,
  hasM: boolean,
  srid: number,
  GraphQLList: any,
  getType: any
): any {
  const LineStringType = getType(codecName, GisSubtype.LineString, hasZ, hasM, srid);
  if (!LineStringType) return fields;

  return build.extend(
    fields,
    {
      lines: {
        type: new GraphQLList(LineStringType),
        resolve(data: any) {
          const multiLineString = data.__geojson;
          return multiLineString.coordinates.map((coord: number[][]) => ({
            __gisType: getGISTypeName(GisSubtype.LineString, hasZ, hasM),
            __srid: data.__srid,
            __geojson: {
              type: 'LineString',
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
  fields: any,
  build: any,
  codecName: string,
  hasZ: boolean,
  hasM: boolean,
  srid: number,
  GraphQLList: any,
  getType: any
): any {
  const PolygonType = getType(codecName, GisSubtype.Polygon, hasZ, hasM, srid);
  if (!PolygonType) return fields;

  return build.extend(
    fields,
    {
      polygons: {
        type: new GraphQLList(PolygonType),
        resolve(data: any) {
          const multiPolygon = data.__geojson;
          return multiPolygon.coordinates.map((coord: number[][][]) => ({
            __gisType: getGISTypeName(GisSubtype.Polygon, hasZ, hasM),
            __srid: data.__srid,
            __geojson: {
              type: 'Polygon',
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
  fields: any,
  build: any,
  codecName: string,
  hasZ: boolean,
  hasM: boolean,
  GraphQLList: any
): any {
  // Get the dimension interface name and resolve it
  const dimInterfaceName = (build.inflection as any).gisDimensionInterfaceName(codecName, hasZ, hasM);
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
        resolve(data: any) {
          const geometryCollection = data.__geojson;
          return geometryCollection.geometries.map((geom: any) => {
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
