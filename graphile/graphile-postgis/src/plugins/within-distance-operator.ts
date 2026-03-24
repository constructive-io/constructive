import 'graphile-build';
import 'graphile-connection-filter';
import type {
  ConnectionFilterOperatorFactory,
  ConnectionFilterOperatorRegistration,
  ConnectionFilterOperatorSpec,
} from 'graphile-connection-filter';
import type { GraphQLInputObjectType as GraphQLInputObjectTypeType } from 'graphql';
import sql from 'pg-sql2';
import type { SQL } from 'pg-sql2';
import { CONCRETE_SUBTYPES } from '../constants';
import type { PostgisExtensionInfo } from './detect-extension';

// Import types.ts for Build augmentation side effects
import '../types';

/**
 * Creates the PostGIS ST_DWithin (withinDistance) operator factory.
 *
 * ST_DWithin is special among PostGIS spatial operators because it takes
 * THREE arguments: (geom1, geom2, distance) instead of the standard two.
 * This requires a compound GraphQL input type (geometry + distance) rather
 * than just a geometry value.
 *
 * For geography columns, distance is in meters.
 * For geometry columns, distance is in the SRID's coordinate units.
 *
 * @example
 * ```graphql
 * query {
 *   restaurants(where: {
 *     location: {
 *       withinDistance: {
 *         point: { type: "Point", coordinates: [-73.99, 40.73] }
 *         distance: 5000
 *       }
 *     }
 *   }) {
 *     nodes { name }
 *   }
 * }
 * ```
 */
export function createWithinDistanceOperatorFactory(): ConnectionFilterOperatorFactory {
  return (build) => {
    const postgisInfo: PostgisExtensionInfo | undefined = (build as any).pgGISExtensionInfo;
    if (!postgisInfo) {
      return [];
    }

    const { inflection } = build;
    const { schemaName, geometryCodec, geographyCodec } = postgisInfo;

    // Collect all GQL type names for geometry and geography (same as main factory)
    const gqlTypeNamesByBase: Record<string, string[]> = {
      geometry: [],
      geography: []
    };

    const codecPairs: [string, typeof geometryCodec][] = [['geometry', geometryCodec]];
    if (geographyCodec) {
      codecPairs.push(['geography', geographyCodec]);
    }
    for (const [baseKey, codec] of codecPairs) {
      const typeName: string = codec.name;
      gqlTypeNamesByBase[baseKey].push((inflection as any).gisInterfaceName(typeName));

      for (const subtype of CONCRETE_SUBTYPES) {
        for (const hasZ of [false, true]) {
          for (const hasM of [false, true]) {
            gqlTypeNamesByBase[baseKey].push(
              (inflection as any).gisType(typeName, subtype, hasZ, hasM, 0)
            );
          }
        }
      }
    }

    // Lazily create the WithinDistanceInput GraphQL type (shared across all registrations)
    let withinDistanceInputType: GraphQLInputObjectTypeType | null = null;

    const getWithinDistanceInputType = (): GraphQLInputObjectTypeType => {
      if (!withinDistanceInputType) {
        const {
          GraphQLInputObjectType,
          GraphQLNonNull,
          GraphQLFloat
        } = build.graphql;
        const GeoJSON = build.getTypeByName('GeoJSON');
        if (!GeoJSON) {
          throw new Error('PostGIS: GeoJSON type not found; ensure PostgisRegisterTypesPlugin runs before connection filter factory processing.');
        }
        withinDistanceInputType = new GraphQLInputObjectType({
          name: 'WithinDistanceInput',
          description:
            'Input for distance-based spatial filtering via ST_DWithin. ' +
            'Distance is in meters for geography columns, or SRID coordinate units for geometry columns.',
          fields: {
            point: {
              type: new GraphQLNonNull(GeoJSON),
              description: 'Reference geometry to measure distance from.'
            },
            distance: {
              type: new GraphQLNonNull(GraphQLFloat),
              description: 'Maximum distance threshold.'
            }
          }
        });
      }
      return withinDistanceInputType;
    };

    const sqlDWithinFn = sql.identifier(schemaName, 'st_dwithin');
    const sqlGeomFromGeoJSON = sql.identifier(schemaName, 'st_geomfromgeojson');

    // Build registrations for every geometry/geography type name
    const registrations: ConnectionFilterOperatorRegistration[] = [];

    for (const [baseType, typeNames] of Object.entries(gqlTypeNamesByBase)) {
      if (typeNames.length === 0) continue;

      for (const typeName of typeNames) {
        const geographyCast = baseType === 'geography'
          ? sql.fragment`::${sql.identifier(schemaName, 'geography')}`
          : sql.fragment``;

        registrations.push({
          typeNames: typeName,
          operatorName: 'withinDistance',
          spec: {
            description:
              'Is within the specified distance of the given geometry (ST_DWithin). ' +
              'Distance is in meters for geography, SRID units for geometry.',
            resolveType: () => getWithinDistanceInputType(),
            // We override SQL value generation since the standard pipeline
            // expects a single geometry value, but we have a compound input.
            resolveSqlValue: () => sql.null,
            resolve(
              sqlIdentifier: SQL,
              _sqlValue: SQL,
              input: unknown,
              _$where: any,
              _details: { fieldName: string | null; operatorName: string }
            ) {
              const { point, distance } = input as {
                point: Record<string, unknown>;
                distance: number;
              };
              const geoJsonStr = sql.value(JSON.stringify(point));
              const geomSql = sql.fragment`${sqlGeomFromGeoJSON}(${geoJsonStr}::text)${geographyCast}`;
              return sql.fragment`${sqlDWithinFn}(${sqlIdentifier}, ${geomSql}, ${sql.value(distance)})`;
            }
          } satisfies ConnectionFilterOperatorSpec,
        });
      }
    }

    return registrations;
  };
}
