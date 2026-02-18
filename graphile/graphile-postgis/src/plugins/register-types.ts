import 'graphile-build';
import 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-config';
import sql from 'pg-sql2';
import { GisSubtype, CONCRETE_SUBTYPES } from '../constants';
import { getGISTypeDetails, getGISTypeModifier, getGISTypeName } from '../utils';
import type { PostgisExtensionInfo } from './detect-extension';

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
        const postgisInfo: PostgisExtensionInfo | undefined = (build as any).pgGISExtensionInfo;
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

        const constructedTypes: Record<string, Record<string | number, any>> =
          (build as any).pgGISGraphQLTypesByCodecAndSubtype;

        const { schemaName, geometryCodec, geographyCodec } = postgisInfo;

        // Register the GeoJSON scalar type
        build.registerScalarType(
          'GeoJSON',
          {} as any,
          () => ({
            description:
              'The `GeoJSON` scalar type represents GeoJSON values as specified by ' +
              '[RFC 7946](https://tools.ietf.org/html/rfc7946).',
            serialize: (value: unknown) => value,
            parseValue: (value: unknown) => value,
            parseLiteral(ast: any, variables?: Record<string, unknown>) {
              return parseLiteralGeoJSON(ast, variables, Kind);
            }
          }),
          'PostgisRegisterTypesPlugin registering GeoJSON scalar'
        );

        // Process both geometry and geography types
        for (const gisCodec of [geometryCodec, geographyCodec]) {
          const key: string = gisCodec.name;
          const typeName: string = gisCodec.name;

          if (!constructedTypes[key]) {
            constructedTypes[key] = {};
          }

          // Register the main interface (no dimensional constraint)
          const mainInterfaceName = (inflection as any).gisInterfaceName(typeName);
          build.registerInterfaceType(
            mainInterfaceName,
            {
              isPgGISInterface: true,
              pgGISCodecName: typeName,
              pgGISZMFlag: -1
            } as any,
            () => ({
              description: `All ${typeName} types implement this interface`,
              fields: {
                [(inflection as any).geojsonFieldName()]: {
                  type: build.getTypeByName('GeoJSON')!,
                  description: 'Converts the object to GeoJSON'
                },
                srid: {
                  type: new GraphQLNonNull(GraphQLInt),
                  description: 'Spatial reference identifier (SRID)'
                }
              },
              resolveType(value: any) {
                const gisTypeKey = value.__gisType;
                const typeName = constructedTypes[key]?.[gisTypeKey];
                if (typeof typeName === 'string') {
                  return typeName;
                }
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
              const dimInterfaceName = (inflection as any).gisDimensionInterfaceName(typeName, hasZ, hasM);

              build.registerInterfaceType(
                dimInterfaceName,
                {
                  isPgGISDimensionInterface: true,
                  pgGISCodecName: typeName,
                  pgGISZMFlag: zmflag
                } as any,
                () => ({
                  description: `All ${typeName} ${coords[zmflag]} types implement this interface`,
                  fields: {
                    [(inflection as any).geojsonFieldName()]: {
                      type: build.getTypeByName('GeoJSON')!,
                      description: 'Converts the object to GeoJSON'
                    },
                    srid: {
                      type: new GraphQLNonNull(GraphQLInt),
                      description: 'Spatial reference identifier (SRID)'
                    }
                  },
                  resolveType(value: any) {
                    const gisTypeKey = value.__gisType;
                    const concreteTypeName = constructedTypes[key]?.[gisTypeKey];
                    if (typeof concreteTypeName === 'string') {
                      return concreteTypeName;
                    }
                    return undefined;
                  }
                }),
                `PostgisRegisterTypesPlugin registering ${dimInterfaceName} interface`
              );

              // Register concrete object types for each subtype + this dimension
              for (const subtype of CONCRETE_SUBTYPES) {
                const concreteTypeName = (inflection as any).gisType(typeName, subtype, hasZ, hasM, 0);
                const typeModifier = getGISTypeModifier(subtype, hasZ, hasM, 0);
                const typeDetails = getGISTypeDetails(typeModifier);

                build.registerObjectType(
                  concreteTypeName,
                  {
                    isPgGISType: true,
                    pgGISCodecName: typeName,
                    pgGISTypeDetails: typeDetails
                  } as any,
                  () => ({
                    description: `A PostGIS ${typeName} ${getGISTypeName(subtype, hasZ, hasM)} type`,
                    interfaces: [
                      build.getTypeByName(mainInterfaceName),
                      build.getTypeByName(dimInterfaceName)
                    ].filter(Boolean),
                    fields: {
                      [(inflection as any).geojsonFieldName()]: {
                        type: build.getTypeByName('GeoJSON')!,
                        description: 'Converts the object to GeoJSON',
                        resolve(data: any) {
                          return data.__geojson;
                        }
                      },
                      srid: {
                        type: new GraphQLNonNull(GraphQLInt),
                        description: 'Spatial reference identifier (SRID)',
                        resolve(data: any) {
                          return data.__srid;
                        }
                      }
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

        // Register input type mapping: GeoJSON scalar for both geometry and geography
        const setGraphQLTypeForPgCodec = (build as any).setGraphQLTypeForPgCodec;
        if (typeof setGraphQLTypeForPgCodec === 'function') {
          for (const gisCodec of [geometryCodec, geographyCodec]) {
            setGraphQLTypeForPgCodec(gisCodec, 'input', 'GeoJSON');
          }
        }

        return _;
      },

      build(build) {
        const postgisInfo: PostgisExtensionInfo | undefined = (build as any).pgGISExtensionInfo;
        if (!postgisInfo) {
          return build;
        }

        const { schemaName } = postgisInfo;
        const constructedTypes: Record<string, Record<string | number, any>> =
          (build as any).pgGISGraphQLTypesByCodecAndSubtype;

        return build.extend(build, {
          /**
           * Gets a registered PostGIS GraphQL type by its geometry type, subtype, and dimension.
           */
          getPostgisTypeByGeometryType(
            gisCodecName: string,
            subtype: GisSubtype,
            hasZ = false,
            hasM = false,
            _srid = 0
          ): any {
            const gisTypeKey = getGISTypeName(subtype, hasZ, hasM);
            const typeName = constructedTypes[gisCodecName]?.[gisTypeKey];
            if (typeof typeName === 'string') {
              return build.getTypeByName(typeName);
            }
            return typeName;
          },

          /**
           * Wraps a geometry/geography SQL expression in json_build_object() with
           * __gisType, __srid, and __geojson metadata.
           */
          pgGISWrapExpression(fragment: any): any {
            // PostGIS function names MUST be lowercase for PostgreSQL identifier matching
            const params = [
              sql.literal('__gisType'),
              sql.fragment`${sql.identifier(schemaName, 'postgis_type_name')}(
                ${sql.identifier(schemaName, 'geometrytype')}(${fragment}),
                ${sql.identifier(schemaName, 'st_coorddim')}(${fragment}::text)
              )`,
              sql.literal('__srid'),
              sql.fragment`${sql.identifier(schemaName, 'st_srid')}(${fragment})`,
              sql.literal('__geojson'),
              sql.fragment`${sql.identifier(schemaName, 'st_asgeojson')}(${fragment})::JSON`
            ];
            return sql.fragment`(case when ${fragment} is null then null else json_build_object(
              ${sql.join(params, ', ')}
            ) end)`;
          },

          /**
           * Creates an SQL fragment to convert GeoJSON input to a geometry value.
           */
          pgGISFromGeoJSON(value: any, codecName: string): any {
            const jsonStr = sql.value(JSON.stringify(value));
            if (codecName === 'geography') {
              return sql.fragment`st_geomfromgeojson(${jsonStr}::text)::${sql.identifier(schemaName, 'geography')}`;
            }
            return sql.fragment`st_geomfromgeojson(${jsonStr}::text)`;
          }
        }, 'PostgisRegisterTypesPlugin adding PostGIS helpers to build');
      },

      // Add pgGISIncludedTypes to the schema so all concrete types are discoverable
      GraphQLSchema(schema, build) {
        const includedTypes: any[] = (build as any).pgGISIncludedTypes;
        if (!includedTypes || includedTypes.length === 0) {
          return schema;
        }

        const existingTypes = (schema as any).types ?? [];
        return {
          ...schema,
          types: [...existingTypes, ...includedTypes]
        };
      }
    }
  }
};

/**
 * Recursively parses a GeoJSON literal from a GraphQL AST.
 */
function parseLiteralGeoJSON(
  ast: any,
  variables: Record<string, unknown> | undefined,
  Kind: any
): unknown {
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      return ast.value;
    case Kind.INT:
    case Kind.FLOAT:
      return parseFloat(ast.value);
    case Kind.OBJECT: {
      const value = Object.create(null);
      ast.fields.forEach((field: any) => {
        value[field.name.value] = parseLiteralGeoJSON(field.value, variables, Kind);
      });
      return value;
    }
    case Kind.LIST:
      return ast.values.map((n: any) => parseLiteralGeoJSON(n, variables, Kind));
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
