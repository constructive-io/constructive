import 'graphile-build';
import type { GraphileConfig } from 'graphile-config';
import sql from 'pg-sql2';
import type { SQL } from 'pg-sql2';
import { CONCRETE_SUBTYPES } from 'graphile-postgis';
import type { PostgisExtensionInfo } from 'graphile-postgis';

/**
 * PgConnectionArgFilterPostgisOperatorsPlugin
 *
 * Adds PostGIS spatial filter operators to postgraphile-plugin-connection-filter.
 *
 * Includes:
 * - ST_ function-based operators (contains, intersects, within, etc.)
 * - SQL operator-based operators (&&, =, ~, etc. for bounding box ops)
 *
 * Requires graphile-postgis and postgraphile-plugin-connection-filter to be loaded.
 */
export const PgConnectionArgFilterPostgisOperatorsPlugin: GraphileConfig.Plugin = {
  name: 'PgConnectionArgFilterPostgisOperatorsPlugin',
  version: '2.0.0',
  description: 'Adds PostGIS spatial filter operators to connection filter',
  after: [
    'PostgisRegisterTypesPlugin',
    'PostgisExtensionDetectionPlugin',
    'PostgisInflectionPlugin',
    'PgConnectionArgFilterPlugin'
  ],

  schema: {
    hooks: {
      init(_, build) {
        const postgisInfo: PostgisExtensionInfo | undefined = (build as any).pgGISExtensionInfo;
        if (!postgisInfo) {
          return _;
        }

        const addConnectionFilterOperator = (build as any).addConnectionFilterOperator;
        if (typeof addConnectionFilterOperator !== 'function') {
          return _;
        }

        const { inflection } = build;
        const { schemaName, geometryCodec, geographyCodec } = postgisInfo;

        // Collect all GQL type names for geometry and geography
        const gqlTypeNamesByBase: Record<string, string[]> = {
          geometry: [],
          geography: []
        };

        for (const [baseKey, codec] of [['geometry', geometryCodec], ['geography', geographyCodec]] as const) {
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

        // PostGIS function-based operators
        const functionSpecs: [string, string[], string, string][] = [
          [
            'ST_3DIntersects',
            ['geometry'],
            'intersects3D',
            'They share any portion of space in 3D.'
          ],
          [
            'ST_Contains',
            ['geometry'],
            'contains',
            'No points of the specified geometry lie in the exterior, and at least one point of the interior of the specified geometry lies in the interior.'
          ],
          [
            'ST_ContainsProperly',
            ['geometry'],
            'containsProperly',
            'The specified geometry intersects the interior but not the boundary (or exterior).'
          ],
          [
            'ST_CoveredBy',
            ['geometry', 'geography'],
            'coveredBy',
            'No point is outside the specified geometry.'
          ],
          [
            'ST_Covers',
            ['geometry', 'geography'],
            'covers',
            'No point in the specified geometry is outside.'
          ],
          [
            'ST_Crosses',
            ['geometry'],
            'crosses',
            'They have some, but not all, interior points in common.'
          ],
          [
            'ST_Disjoint',
            ['geometry'],
            'disjoint',
            'They do not share any space together.'
          ],
          [
            'ST_Equals',
            ['geometry'],
            'equals',
            'They represent the same geometry. Directionality is ignored.'
          ],
          [
            'ST_Intersects',
            ['geometry', 'geography'],
            'intersects',
            'They share any portion of space in 2D.'
          ],
          [
            'ST_OrderingEquals',
            ['geometry'],
            'orderingEquals',
            'They represent the same geometry and points are in the same directional order.'
          ],
          [
            'ST_Overlaps',
            ['geometry'],
            'overlaps',
            'They share space, are of the same dimension, but are not completely contained by each other.'
          ],
          [
            'ST_Touches',
            ['geometry'],
            'touches',
            'They have at least one point in common, but their interiors do not intersect.'
          ],
          [
            'ST_Within',
            ['geometry'],
            'within',
            'Completely inside the specified geometry.'
          ]
        ];

        // SQL operator-based operators
        const operatorSpecs: [string, string[], string, string][] = [
          [
            '=',
            ['geometry', 'geography'],
            'exactlyEquals',
            'Coordinates and coordinate order are the same as specified geometry.'
          ],
          [
            '&&',
            ['geometry', 'geography'],
            'bboxIntersects2D',
            "2D bounding box intersects the specified geometry's 2D bounding box."
          ],
          [
            '&&&',
            ['geometry'],
            'bboxIntersectsND',
            "n-D bounding box intersects the specified geometry's n-D bounding box."
          ],
          [
            '&<',
            ['geometry'],
            'bboxOverlapsOrLeftOf',
            "Bounding box overlaps or is to the left of the specified geometry's bounding box."
          ],
          [
            '&<|',
            ['geometry'],
            'bboxOverlapsOrBelow',
            "Bounding box overlaps or is below the specified geometry's bounding box."
          ],
          [
            '&>',
            ['geometry'],
            'bboxOverlapsOrRightOf',
            "Bounding box overlaps or is to the right of the specified geometry's bounding box."
          ],
          [
            '|&>',
            ['geometry'],
            'bboxOverlapsOrAbove',
            "Bounding box overlaps or is above the specified geometry's bounding box."
          ],
          [
            '<<',
            ['geometry'],
            'bboxLeftOf',
            "Bounding box is strictly to the left of the specified geometry's bounding box."
          ],
          [
            '<<|',
            ['geometry'],
            'bboxBelow',
            "Bounding box is strictly below the specified geometry's bounding box."
          ],
          [
            '>>',
            ['geometry'],
            'bboxRightOf',
            "Bounding box is strictly to the right of the specified geometry's bounding box."
          ],
          [
            '|>>',
            ['geometry'],
            'bboxAbove',
            "Bounding box is strictly above the specified geometry's bounding box."
          ],
          [
            '~',
            ['geometry'],
            'bboxContains',
            "Bounding box contains the specified geometry's bounding box."
          ],
          [
            '~=',
            ['geometry'],
            'bboxEquals',
            "Bounding box is the same as the specified geometry's bounding box."
          ]
        ];

        // Collect all resolved specs
        interface InternalSpec {
          typeNames: string[];
          operatorName: string;
          description: string;
          resolve: (i: SQL, v: SQL) => SQL;
        }
        const allSpecs: InternalSpec[] = [];

        // Process function-based operators
        for (const [fn, baseTypes, operatorName, description] of functionSpecs) {
          for (const baseType of baseTypes) {
            const sqlGisFunction = schemaName === 'public'
              ? sql.identifier(fn.toLowerCase())
              : sql.identifier(schemaName, fn.toLowerCase());

            allSpecs.push({
              typeNames: gqlTypeNamesByBase[baseType],
              operatorName,
              description,
              resolve: (i: SQL, v: SQL) => sql.fragment`${sqlGisFunction}(${i}, ${v})`
            });
          }
        }

        // Process SQL operator-based operators
        for (const [op, baseTypes, operatorName, description] of operatorSpecs) {
          for (const baseType of baseTypes) {
            allSpecs.push({
              typeNames: gqlTypeNamesByBase[baseType],
              operatorName,
              description,
              resolve: (i: SQL, v: SQL) => sql.fragment`${i} ${sql.raw(op)} ${v}`
            });
          }
        }

        // Sort by operator name for deterministic schema output
        allSpecs.sort((a, b) => (a.operatorName > b.operatorName ? 1 : -1));

        // Register each operator with the connection filter plugin
        for (const spec of allSpecs) {
          for (const typeName of spec.typeNames) {
            addConnectionFilterOperator(typeName, spec.operatorName, {
              description: spec.description,
              resolveType: (fieldType: any) => fieldType,
              resolve(
                sqlIdentifier: SQL,
                sqlValue: SQL,
                _input: unknown,
                _$where: any,
                _details: { fieldName: string | null; operatorName: string }
              ) {
                return spec.resolve(sqlIdentifier, sqlValue);
              }
            });
          }
        }

        return _;
      }
    }
  }
};
