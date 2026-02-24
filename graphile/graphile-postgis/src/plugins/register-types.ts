import 'graphile-build';
import 'graphile-build-pg';
import type { PgCodec } from '@dataplan/pg';
import type { GraphileConfig } from 'graphile-config';
import type { ValueNode } from 'graphql';
import sql from 'pg-sql2';
import type { SQL } from 'pg-sql2';
import { GisSubtype, CONCRETE_SUBTYPES } from '../constants';
import type { GisFieldValue, PostgisExtensionInfo } from '../types';
import { getGISTypeDetails, getGISTypeModifier, getGISTypeName } from '../utils';

// Import types.ts for the Build/Inflection/Scope augmentation side effects
import '../types';

/**
 * PostgisRegisterTypesPlugin
 *
 * The core plugin that:
 * 1. Registers a GeoJSON scalar type
 * 2. Creates GraphQL interfaces for geometry/geography base types
 * 3. Creates GraphQL interfaces for each dimension combination (XY, XYZ, XYM, XYZM)
 * 4. Creates concrete GraphQL object types for each subtype/dimension combo
 * 5. Registers codec-to-type mappings so PostGraphile knows how to handle
 *    geometry/geography columns
 *
 * In v5, type registration is done during the init hook using
 * build.registerObjectType / build.registerInterfaceType / build.registerScalarType.
 *
 * The SQL tweak wraps geometry/geography values in json_build_object() containing
 * __gisType, __srid, and __geojson fields, which downstream resolvers use.
 */
export const PostgisRegisterTypesPlugin: GraphileConfig.Plugin = {
  name: 'PostgisRegisterTypesPlugin',
  version: '2.0.0',
  description: 'Registers PostGIS GeoJSON scalar and geometry/geography types',
  after: ['PostgisExtensionDetectionPlugin', 'PostgisInflectionPlugin'],

  schema: {
    hooks: {
      init(_, build) {
        const postgisInfo: PostgisExtensionInfo | undefined = build.pgGISExtensionInfo;
        if (!postgisInfo) {
          return _;
        }

        const {
          inflection,
          graphql: {
            GraphQLInt,
            GraphQLNonNull,
            Kind
          }
        } = build;

        const constructedTypes = build.pgGISGraphQLTypesByCodecAndSubtype;
        if (!constructedTypes) {
          return _;
        }

        const { geometryCodec, geographyCodec } = postgisInfo;

        // Register the GeoJSON scalar type
        build.registerScalarType(
          'GeoJSON',
          {},
          () => ({
            description:
              'The `GeoJSON` scalar type represents GeoJSON values as specified by ' +
              '[RFC 7946](https://tools.ietf.org/html/rfc7946).',
            serialize: (value: unknown) => value,
            parseValue: (value: unknown) => {
              if (value === null || value === undefined) return value;
              if (typeof value !== 'object' || Array.isArray(value)) {
                throw new TypeError('GeoJSON must be an object');
              }
              const obj = value as Record<string, unknown>;
              if (typeof obj.type !== 'string') {
                throw new TypeError('GeoJSON must have a "type" string property');
              }
              const validTypes = ['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon', 'GeometryCollection', 'Feature', 'FeatureCollection'];
              if (!validTypes.includes(obj.type)) {
                throw new TypeError(`GeoJSON type "${obj.type}" is not a recognized GeoJSON type`);
              }
              return value;
            },
            parseLiteral(ast: ValueNode, variables?: Record<string, unknown>) {
              return parseLiteralGeoJSON(ast, variables, Kind);
            }
          }),
          'PostgisRegisterTypesPlugin registering GeoJSON scalar'
        );

        // Process geometry and (optionally) geography types
        const gisCodecs = [geometryCodec, geographyCodec].filter((c): c is PgCodec => c !== null);
        for (const gisCodec of gisCodecs) {
          const key: string = gisCodec.name;
          const typeName: string = gisCodec.name;

          if (!constructedTypes[key]) {
            constructedTypes[key] = {};
          }

          // Register the main interface (no dimensional constraint)
          const mainInterfaceName = inflection.gisInterfaceName(typeName);
          build.registerInterfaceType(
            mainInterfaceName,
            {
              isPgGISInterface: true,
              pgGISCodecName: typeName,
              pgGISZMFlag: -1
            },
            () => ({
              description: `All ${typeName} types implement this interface`,
              fields: () => {
                const geoJsonType = build.getTypeByName('GeoJSON');
                if (!geoJsonType) {
                  throw new Error('PostGIS: GeoJSON scalar type not found.');
                }
                return {
                  [inflection.geojsonFieldName()]: {
                    type: geoJsonType,
                    description: 'Converts the object to GeoJSON'
                  },
                  srid: {
                    type: new GraphQLNonNull(GraphQLInt),
                    description: 'Spatial reference identifier (SRID)'
                  }
                };
              },
              resolveType(value: GisFieldValue) {
                const gisTypeKey = value.__gisType;
                const resolvedTypeName = constructedTypes[key]?.[gisTypeKey];
                if (typeof resolvedTypeName === 'string') {
                  return resolvedTypeName;
                }
                console.warn(`PostGIS: Could not resolve type for __gisType="${gisTypeKey}" on codec="${key}". Known types: ${Object.keys(constructedTypes[key] ?? {}).join(', ')}`);
                return undefined;
              }
            }),
            `PostgisRegisterTypesPlugin registering ${mainInterfaceName} interface`
          );

          // Register dimension interfaces (XY, XYZ, XYM, XYZM)
          for (const hasZ of [false, true]) {
            for (const hasM of [false, true]) {
              const zmflag = (hasZ ? 2 : 0) + (hasM ? 1 : 0);
              const coords: Record<number, string> = { 0: 'XY', 1: 'XYM', 2: 'XYZ', 3: 'XYZM' };
              const dimInterfaceName = inflection.gisDimensionInterfaceName(typeName, hasZ, hasM);

              build.registerInterfaceType(
                dimInterfaceName,
                {
                  isPgGISDimensionInterface: true,
                  pgGISCodecName: typeName,
                  pgGISZMFlag: zmflag
                },
                () => ({
                  description: `All ${typeName} ${coords[zmflag]} types implement this interface`,
                  fields: () => {
                    const geoJsonType = build.getTypeByName('GeoJSON');
                    if (!geoJsonType) {
                      throw new Error('PostGIS: GeoJSON scalar type not found.');
                    }
                    return {
                      [inflection.geojsonFieldName()]: {
                        type: geoJsonType,
                        description: 'Converts the object to GeoJSON'
                      },
                      srid: {
                        type: new GraphQLNonNull(GraphQLInt),
                        description: 'Spatial reference identifier (SRID)'
                      }
                    };
                  },
                  resolveType(value: GisFieldValue) {
                    const gisTypeKey = value.__gisType;
                    const concreteTypeName = constructedTypes[key]?.[gisTypeKey];
                    if (typeof concreteTypeName === 'string') {
                      return concreteTypeName;
                    }
                    console.warn(`PostGIS: Could not resolve type for __gisType="${gisTypeKey}" on codec="${key}". Known types: ${Object.keys(constructedTypes[key] ?? {}).join(', ')}`);
                    return undefined;
                  }
                }),
                `PostgisRegisterTypesPlugin registering ${dimInterfaceName} interface`
              );

              // Register concrete object types for each subtype + this dimension
              for (const subtype of CONCRETE_SUBTYPES) {
                const concreteTypeName = inflection.gisType(typeName, subtype, hasZ, hasM, 0);
                const typeModifier = getGISTypeModifier(subtype, hasZ, hasM, 0);
                const typeDetails = getGISTypeDetails(typeModifier);

                build.registerObjectType(
                  concreteTypeName,
                  {
                    isPgGISType: true,
                    pgGISCodecName: typeName,
                    pgGISTypeDetails: typeDetails
                  },
                  () => ({
                    description: `A PostGIS ${typeName} ${getGISTypeName(subtype, hasZ, hasM)} type`,
                    interfaces: () => [
                      build.getTypeByName(mainInterfaceName),
                      build.getTypeByName(dimInterfaceName)
                    ].filter(Boolean),
                    fields: () => {
                      const geoJsonType = build.getTypeByName('GeoJSON');
                      if (!geoJsonType) {
                        throw new Error('PostGIS: GeoJSON scalar type not found.');
                      }
                      return {
                        [inflection.geojsonFieldName()]: {
                          type: geoJsonType,
                          description: 'Converts the object to GeoJSON',
                        resolve(data: GisFieldValue) {
                          return data.__geojson;
                        }
                      },
                      srid: {
                        type: new GraphQLNonNull(GraphQLInt),
                        description: 'Spatial reference identifier (SRID)',
                        resolve(data: GisFieldValue) {
                          return data.__srid;
                        }
                      }
                    };
                    }
                  }),
                  `PostgisRegisterTypesPlugin registering ${concreteTypeName} type`
                );

                // Track the type by its gisTypeKey for resolveType lookups
                const gisTypeKey = getGISTypeName(subtype, hasZ, hasM);
                constructedTypes[key][gisTypeKey] = concreteTypeName;
              }

              // Map the Geometry subtype (0) for this dimension to the dimension interface
              const geomDimKey = getGISTypeName(GisSubtype.Geometry, hasZ, hasM);
              constructedTypes[key][geomDimKey] = dimInterfaceName;
            }
          }

          // Map null/unspecified modifier to the main interface
          constructedTypes[key][-1] = mainInterfaceName;
        }

        // Register type mappings so PostGraphile knows what GraphQL types to
        // use for geometry/geography columns.
        //
        // Without BOTH input AND output mappings, PgAttributesPlugin silently
        // omits geometry columns from the schema:
        // - Input: GeoJSON scalar (accepts GeoJSON objects)
        // - Output: The main interface type (e.g. GeometryInterface), which uses
        //   resolveType to dispatch to concrete types (GeometryPoint, etc.)
        const { setGraphQLTypeForPgCodec } = build;
        if (typeof setGraphQLTypeForPgCodec === 'function') {
          for (const gisCodec of gisCodecs) {
            const mainInterfaceName = inflection.gisInterfaceName(gisCodec.name);
            setGraphQLTypeForPgCodec(gisCodec, 'input', 'GeoJSON');
            setGraphQLTypeForPgCodec(gisCodec, 'output', mainInterfaceName);
          }
        }

        return _;
      },

      build(build) {
        const postgisInfo: PostgisExtensionInfo | undefined = build.pgGISExtensionInfo;
        if (!postgisInfo) {
          return build;
        }

        const { schemaName } = postgisInfo;
        const constructedTypes = build.pgGISGraphQLTypesByCodecAndSubtype;
        if (!constructedTypes) {
          return build;
        }

        return build.extend(build, {
          getPostgisTypeByGeometryType(
            gisCodecName: string,
            subtype: GisSubtype,
            hasZ = false,
            hasM = false,
            _srid = 0
          ) {
            const gisTypeKey = getGISTypeName(subtype, hasZ, hasM);
            const resolvedTypeName = constructedTypes[gisCodecName]?.[gisTypeKey];
            if (typeof resolvedTypeName === 'string') {
              return build.getTypeByName(resolvedTypeName);
            }
            return undefined;
          },

          pgGISWrapExpression(fragment: SQL): SQL {
            // PostGIS function names MUST be lowercase for PostgreSQL identifier matching
            const params = [
              sql.literal('__gisType'),
              sql.fragment`${sql.identifier(schemaName, 'geometrytype')}(${fragment})`,
              sql.literal('__srid'),
              sql.fragment`${sql.identifier(schemaName, 'st_srid')}(${fragment})`,
              sql.literal('__geojson'),
              sql.fragment`${sql.identifier(schemaName, 'st_asgeojson')}(${fragment})::JSON`
            ];
            return sql.fragment`(case when ${fragment} is null then null else json_build_object(
              ${sql.join(params, ', ')}
            ) end)`;
          },

          pgGISFromGeoJSON(value: Record<string, unknown>, codecName: string): SQL {
            const jsonStr = sql.value(JSON.stringify(value));
            if (codecName === 'geography') {
              return sql.fragment`${sql.identifier(schemaName, 'st_geomfromgeojson')}(${jsonStr}::text)::${sql.identifier(schemaName, 'geography')}`;
            }
            return sql.fragment`${sql.identifier(schemaName, 'st_geomfromgeojson')}(${jsonStr}::text)`;
          }
        }, 'PostgisRegisterTypesPlugin adding PostGIS helpers to build');
      },

      // Add all registered PostGIS concrete types to the schema so they are
      // discoverable for resolveType on the interfaces. Types registered via
      // build.registerObjectType() during init are lazy — they are only
      // materialized when getTypeByName() is called.
      //
      // We MUST use GraphQLSchema_types (not GraphQLSchema) because the
      // GraphQLSchema hook's types property gets overwritten by the
      // GraphQLSchema_types hook that runs immediately after it.
      GraphQLSchema_types(types, build) {
        const constructedTypes = build.pgGISGraphQLTypesByCodecAndSubtype;
        if (!constructedTypes) {
          return types;
        }

        for (const codecTypes of Object.values(constructedTypes)) {
          for (const typeName of Object.values(codecTypes)) {
            if (typeof typeName === 'string') {
              const graphqlType = build.getTypeByName(typeName);
              if (graphqlType && !types.includes(graphqlType)) {
                types.push(graphqlType);
              }
            }
          }
        }

        return types;
      }
    }
  }
};

/**
 * Recursively parses a GeoJSON literal from a GraphQL AST.
 */
function parseLiteralGeoJSON(
  ast: ValueNode,
  variables: Record<string, unknown> | undefined,
  Kind: typeof import('graphql').Kind,
  depth: number = 0
): unknown {
  if (depth > 32) {
    throw new Error('GeoJSON input exceeds maximum nesting depth');
  }
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      return ast.value;
    case Kind.INT:
    case Kind.FLOAT:
      return parseFloat(ast.value);
    case Kind.OBJECT: {
      const value = Object.create(null);
      ast.fields.forEach((field) => {
        value[field.name.value] = parseLiteralGeoJSON(field.value, variables, Kind, depth + 1);
      });
      return value;
    }
    case Kind.LIST:
      return ast.values.map((n) => parseLiteralGeoJSON(n, variables, Kind, depth + 1));
    case Kind.NULL:
      return null;
    case Kind.VARIABLE: {
      const variableName = ast.name.value;
      return variables ? variables[variableName] : undefined;
    }
    default:
      return undefined;
  }
}
