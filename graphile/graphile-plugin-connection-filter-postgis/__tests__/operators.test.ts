import sql from 'pg-sql2';
import { CONCRETE_SUBTYPES } from 'graphile-postgis';
import { PgConnectionArgFilterPostgisOperatorsPlugin } from '../src/plugin';
import { PostgisConnectionFilterPreset } from '../src/preset';

// Build a mock inflection that matches what graphile-postgis produces
function createMockInflection() {
  return {
    upperCamelCase(str: string) {
      return str
        .split('-')
        .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
        .join('');
    },
    gisInterfaceName(typeName: string) {
      return this.upperCamelCase(`${typeName}-interface`);
    },
    gisType(
      typeName: string,
      subtype: number,
      hasZ: boolean,
      hasM: boolean,
      _srid?: number
    ) {
      const subtypeNames: Record<number, string> = {
        0: 'geometry',
        1: 'point',
        2: 'line-string',
        3: 'polygon',
        4: 'multi-point',
        5: 'multi-line-string',
        6: 'multi-polygon',
        7: 'geometry-collection'
      };
      const parts = [
        typeName,
        subtypeNames[subtype],
        hasZ ? 'z' : null,
        hasM ? 'm' : null
      ].filter(Boolean);
      return this.upperCamelCase(parts.join('-'));
    }
  };
}

// Run the plugin init hook and capture all registered operators
function runPlugin(options: {
  schemaName?: string;
  hasPostgis?: boolean;
  hasFilterPlugin?: boolean;
} = {}) {
  const {
    schemaName = 'public',
    hasPostgis = true,
    hasFilterPlugin = true
  } = options;

  const registered: Array<{
    typeName: string;
    operatorName: string;
    description: string;
    resolveType: (t: any) => any;
    resolve: (...args: any[]) => any;
  }> = [];

  const inflection = createMockInflection();

  const postgisInfo = hasPostgis
    ? {
        schemaName,
        geometryCodec: { name: 'geometry' },
        geographyCodec: { name: 'geography' }
      }
    : undefined;

  const addConnectionFilterOperator = hasFilterPlugin
    ? (typeName: string, operatorName: string, opts: any) => {
        registered.push({
          typeName,
          operatorName,
          description: opts.description,
          resolveType: opts.resolveType,
          resolve: opts.resolve
        });
      }
    : undefined;

  const build = {
    inflection,
    pgGISExtensionInfo: postgisInfo,
    addConnectionFilterOperator
  };

  const plugin = PgConnectionArgFilterPostgisOperatorsPlugin;
  const initHook = (plugin.schema as any).hooks.init;
  const result = initHook({}, build);

  return { registered, result };
}

describe('PgConnectionArgFilterPostgisOperatorsPlugin', () => {
  describe('plugin metadata', () => {
    it('has correct name and version', () => {
      expect(PgConnectionArgFilterPostgisOperatorsPlugin.name).toBe(
        'PgConnectionArgFilterPostgisOperatorsPlugin'
      );
      expect(PgConnectionArgFilterPostgisOperatorsPlugin.version).toBe('2.0.0');
    });

    it('declares correct after dependencies', () => {
      expect(PgConnectionArgFilterPostgisOperatorsPlugin.after).toEqual([
        'PostgisRegisterTypesPlugin',
        'PostgisExtensionDetectionPlugin',
        'PostgisInflectionPlugin',
        'PgConnectionArgFilterPlugin'
      ]);
    });

    it('has an init hook in schema.hooks', () => {
      const hooks = (PgConnectionArgFilterPostgisOperatorsPlugin.schema as any)?.hooks;
      expect(hooks).toBeDefined();
      expect(typeof hooks.init).toBe('function');
    });
  });

  describe('preset', () => {
    it('includes the plugin', () => {
      expect(PostgisConnectionFilterPreset.plugins).toContain(
        PgConnectionArgFilterPostgisOperatorsPlugin
      );
    });
  });

  describe('graceful degradation', () => {
    it('returns early when PostGIS is not available', () => {
      const { registered, result } = runPlugin({ hasPostgis: false });
      expect(registered).toHaveLength(0);
      expect(result).toEqual({});
    });

    it('returns early when connection filter plugin is not loaded', () => {
      const { registered, result } = runPlugin({ hasFilterPlugin: false });
      expect(registered).toHaveLength(0);
      expect(result).toEqual({});
    });
  });

  describe('operator registration', () => {
    const FUNCTION_OPERATORS = [
      { name: 'intersects3D', fn: 'st_3dintersects', baseTypes: ['geometry'] },
      { name: 'contains', fn: 'st_contains', baseTypes: ['geometry'] },
      { name: 'containsProperly', fn: 'st_containsproperly', baseTypes: ['geometry'] },
      { name: 'coveredBy', fn: 'st_coveredby', baseTypes: ['geometry', 'geography'] },
      { name: 'covers', fn: 'st_covers', baseTypes: ['geometry', 'geography'] },
      { name: 'crosses', fn: 'st_crosses', baseTypes: ['geometry'] },
      { name: 'disjoint', fn: 'st_disjoint', baseTypes: ['geometry'] },
      { name: 'equals', fn: 'st_equals', baseTypes: ['geometry'] },
      { name: 'intersects', fn: 'st_intersects', baseTypes: ['geometry', 'geography'] },
      { name: 'orderingEquals', fn: 'st_orderingequals', baseTypes: ['geometry'] },
      { name: 'overlaps', fn: 'st_overlaps', baseTypes: ['geometry'] },
      { name: 'touches', fn: 'st_touches', baseTypes: ['geometry'] },
      { name: 'within', fn: 'st_within', baseTypes: ['geometry'] }
    ];

    const SQL_OPERATORS = [
      { name: 'exactlyEquals', op: '=', baseTypes: ['geometry', 'geography'] },
      { name: 'bboxIntersects2D', op: '&&', baseTypes: ['geometry', 'geography'] },
      { name: 'bboxIntersectsND', op: '&&&', baseTypes: ['geometry'] },
      { name: 'bboxOverlapsOrLeftOf', op: '&<', baseTypes: ['geometry'] },
      { name: 'bboxOverlapsOrBelow', op: '&<|', baseTypes: ['geometry'] },
      { name: 'bboxOverlapsOrRightOf', op: '&>', baseTypes: ['geometry'] },
      { name: 'bboxOverlapsOrAbove', op: '|&>', baseTypes: ['geometry'] },
      { name: 'bboxLeftOf', op: '<<', baseTypes: ['geometry'] },
      { name: 'bboxBelow', op: '<<|', baseTypes: ['geometry'] },
      { name: 'bboxRightOf', op: '>>', baseTypes: ['geometry'] },
      { name: 'bboxAbove', op: '|>>', baseTypes: ['geometry'] },
      { name: 'bboxContains', op: '~', baseTypes: ['geometry'] },
      { name: 'bboxEquals', op: '~=', baseTypes: ['geometry'] }
    ];

    it('registers exactly 13 function-based operators', () => {
      expect(FUNCTION_OPERATORS).toHaveLength(13);
    });

    it('registers exactly 13 SQL operator-based operators', () => {
      expect(SQL_OPERATORS).toHaveLength(13);
    });

    it('registers all 26 unique operator names', () => {
      const { registered } = runPlugin();
      const uniqueOperatorNames = [...new Set(registered.map(r => r.operatorName))];
      const allExpected = [
        ...FUNCTION_OPERATORS.map(o => o.name),
        ...SQL_OPERATORS.map(o => o.name)
      ];
      expect(uniqueOperatorNames.sort()).toEqual(allExpected.sort());
    });

    it('registers operators sorted by name', () => {
      const { registered } = runPlugin();
      const operatorNames = registered.map(r => r.operatorName);
      // Within each consecutive group of the same operator, order should be consistent
      // Globally, operators should be sorted alphabetically
      const seen: string[] = [];
      for (const name of operatorNames) {
        if (seen.length === 0 || seen[seen.length - 1] !== name) {
          if (seen.length > 0) {
            // Each new operator name should be >= the last distinct name
            expect(name >= seen[seen.length - 1]).toBe(true);
          }
          seen.push(name);
        }
      }
    });
  });

  describe('type name coverage', () => {
    // Per base type: 1 interface + 7 subtypes * 4 dimension combos = 29 type names
    const TYPES_PER_BASE = 1 + CONCRETE_SUBTYPES.length * 4; // 29

    it('generates correct number of type names per base type', () => {
      const { registered } = runPlugin();
      // Pick a geometry-only operator (e.g., 'contains')
      const containsOps = registered.filter(r => r.operatorName === 'contains');
      expect(containsOps).toHaveLength(TYPES_PER_BASE);
    });

    it('doubles registrations for geometry+geography operators', () => {
      const { registered } = runPlugin();
      // 'intersects' applies to both geometry and geography
      const intersectsOps = registered.filter(r => r.operatorName === 'intersects');
      expect(intersectsOps).toHaveLength(TYPES_PER_BASE * 2);
    });

    it('includes interface names in type names', () => {
      const { registered } = runPlugin();
      const containsTypeNames = registered
        .filter(r => r.operatorName === 'contains')
        .map(r => r.typeName);
      expect(containsTypeNames).toContain('GeometryInterface');
    });

    it('includes concrete subtype names', () => {
      const { registered } = runPlugin();
      const containsTypeNames = registered
        .filter(r => r.operatorName === 'contains')
        .map(r => r.typeName);
      // Should include GeometryPoint, GeometryPolygon, etc.
      expect(containsTypeNames).toContain('GeometryPoint');
      expect(containsTypeNames).toContain('GeometryPolygon');
      expect(containsTypeNames).toContain('GeometryLineString');
      expect(containsTypeNames).toContain('GeometryMultiPoint');
      expect(containsTypeNames).toContain('GeometryMultiLineString');
      expect(containsTypeNames).toContain('GeometryMultiPolygon');
      expect(containsTypeNames).toContain('GeometryGeometryCollection');
    });

    it('includes Z/M dimension variants', () => {
      const { registered } = runPlugin();
      const containsTypeNames = registered
        .filter(r => r.operatorName === 'contains')
        .map(r => r.typeName);
      expect(containsTypeNames).toContain('GeometryPointZ');
      expect(containsTypeNames).toContain('GeometryPointM');
      expect(containsTypeNames).toContain('GeometryPointZM');
    });

    it('includes geography types for dual-base operators', () => {
      const { registered } = runPlugin();
      const intersectsTypeNames = registered
        .filter(r => r.operatorName === 'intersects')
        .map(r => r.typeName);
      expect(intersectsTypeNames).toContain('GeographyInterface');
      expect(intersectsTypeNames).toContain('GeographyPoint');
      expect(intersectsTypeNames).toContain('GeometryInterface');
      expect(intersectsTypeNames).toContain('GeometryPoint');
    });
  });

  describe('SQL generation', () => {
    describe('function-based operators', () => {
      it('generates correct SQL for public schema', () => {
        const { registered } = runPlugin({ schemaName: 'public' });
        const containsOp = registered.find(r => r.operatorName === 'contains');
        expect(containsOp).toBeDefined();

        const i = sql.identifier('col');
        const v = sql.identifier('val');
        const result = containsOp!.resolve(i, v, null, null, {
          fieldName: null,
          operatorName: 'contains'
        });
        const compiled = sql.compile(result);
        expect(compiled.text).toBe('"st_contains"("col", "val")');
      });

      it('generates schema-qualified SQL for non-public schema', () => {
        const { registered } = runPlugin({ schemaName: 'postgis' });
        const containsOp = registered.find(r => r.operatorName === 'contains');
        expect(containsOp).toBeDefined();

        const i = sql.identifier('col');
        const v = sql.identifier('val');
        const result = containsOp!.resolve(i, v, null, null, {
          fieldName: null,
          operatorName: 'contains'
        });
        const compiled = sql.compile(result);
        expect(compiled.text).toBe('"postgis"."st_contains"("col", "val")');
      });

      it('lowercases function names in SQL', () => {
        const { registered } = runPlugin();
        const op3d = registered.find(r => r.operatorName === 'intersects3D');
        expect(op3d).toBeDefined();

        const i = sql.identifier('a');
        const v = sql.identifier('b');
        const result = op3d!.resolve(i, v, null, null, {
          fieldName: null,
          operatorName: 'intersects3D'
        });
        const compiled = sql.compile(result);
        expect(compiled.text).toBe('"st_3dintersects"("a", "b")');
      });
    });

    describe('SQL operator-based operators', () => {
      it('generates correct SQL for = operator', () => {
        const { registered } = runPlugin();
        const exactOp = registered.find(r => r.operatorName === 'exactlyEquals');
        expect(exactOp).toBeDefined();

        const i = sql.identifier('col');
        const v = sql.identifier('val');
        const result = exactOp!.resolve(i, v, null, null, {
          fieldName: null,
          operatorName: 'exactlyEquals'
        });
        const compiled = sql.compile(result);
        expect(compiled.text).toBe('"col" = "val"');
      });

      it('generates correct SQL for && operator', () => {
        const { registered } = runPlugin();
        const bboxOp = registered.find(r => r.operatorName === 'bboxIntersects2D');
        expect(bboxOp).toBeDefined();

        const i = sql.identifier('col');
        const v = sql.identifier('val');
        const result = bboxOp!.resolve(i, v, null, null, {
          fieldName: null,
          operatorName: 'bboxIntersects2D'
        });
        const compiled = sql.compile(result);
        expect(compiled.text).toBe('"col" && "val"');
      });

      it('generates correct SQL for ~ operator', () => {
        const { registered } = runPlugin();
        const bboxContainsOp = registered.find(r => r.operatorName === 'bboxContains');
        expect(bboxContainsOp).toBeDefined();

        const i = sql.identifier('col');
        const v = sql.identifier('val');
        const result = bboxContainsOp!.resolve(i, v, null, null, {
          fieldName: null,
          operatorName: 'bboxContains'
        });
        const compiled = sql.compile(result);
        expect(compiled.text).toBe('"col" ~ "val"');
      });

      it('generates correct SQL for ~= operator', () => {
        const { registered } = runPlugin();
        const bboxEqOp = registered.find(r => r.operatorName === 'bboxEquals');
        expect(bboxEqOp).toBeDefined();

        const i = sql.identifier('col');
        const v = sql.identifier('val');
        const result = bboxEqOp!.resolve(i, v, null, null, {
          fieldName: null,
          operatorName: 'bboxEquals'
        });
        const compiled = sql.compile(result);
        expect(compiled.text).toBe('"col" ~= "val"');
      });

      it('generates correct SQL for &&& operator', () => {
        const { registered } = runPlugin();
        const ndOp = registered.find(r => r.operatorName === 'bboxIntersectsND');
        expect(ndOp).toBeDefined();

        const i = sql.identifier('col');
        const v = sql.identifier('val');
        const result = ndOp!.resolve(i, v, null, null, {
          fieldName: null,
          operatorName: 'bboxIntersectsND'
        });
        const compiled = sql.compile(result);
        expect(compiled.text).toBe('"col" &&& "val"');
      });
    });
  });

  describe('resolveType', () => {
    it('returns fieldType unchanged (identity)', () => {
      const { registered } = runPlugin();
      const op = registered[0];
      const mockType = { name: 'GeometryInterface' };
      expect(op.resolveType(mockType)).toBe(mockType);
    });
  });

  describe('operator descriptions', () => {
    const expectedDescriptions: Record<string, string> = {
      intersects3D: 'They share any portion of space in 3D.',
      contains:
        'No points of the specified geometry lie in the exterior, and at least one point of the interior of the specified geometry lies in the interior.',
      containsProperly:
        'The specified geometry intersects the interior but not the boundary (or exterior).',
      coveredBy: 'No point is outside the specified geometry.',
      covers: 'No point in the specified geometry is outside.',
      crosses: 'They have some, but not all, interior points in common.',
      disjoint: 'They do not share any space together.',
      equals: 'They represent the same geometry. Directionality is ignored.',
      intersects: 'They share any portion of space in 2D.',
      orderingEquals:
        'They represent the same geometry and points are in the same directional order.',
      overlaps:
        'They share space, are of the same dimension, but are not completely contained by each other.',
      touches:
        'They have at least one point in common, but their interiors do not intersect.',
      within: 'Completely inside the specified geometry.',
      exactlyEquals:
        'Coordinates and coordinate order are the same as specified geometry.',
      bboxIntersects2D:
        "2D bounding box intersects the specified geometry's 2D bounding box.",
      bboxIntersectsND:
        "n-D bounding box intersects the specified geometry's n-D bounding box.",
      bboxOverlapsOrLeftOf:
        "Bounding box overlaps or is to the left of the specified geometry's bounding box.",
      bboxOverlapsOrBelow:
        "Bounding box overlaps or is below the specified geometry's bounding box.",
      bboxOverlapsOrRightOf:
        "Bounding box overlaps or is to the right of the specified geometry's bounding box.",
      bboxOverlapsOrAbove:
        "Bounding box overlaps or is above the specified geometry's bounding box.",
      bboxLeftOf:
        "Bounding box is strictly to the left of the specified geometry's bounding box.",
      bboxBelow:
        "Bounding box is strictly below the specified geometry's bounding box.",
      bboxRightOf:
        "Bounding box is strictly to the right of the specified geometry's bounding box.",
      bboxAbove:
        "Bounding box is strictly above the specified geometry's bounding box.",
      bboxContains:
        "Bounding box contains the specified geometry's bounding box.",
      bboxEquals:
        "Bounding box is the same as the specified geometry's bounding box."
    };

    it('has correct descriptions for all 26 operators', () => {
      const { registered } = runPlugin();
      for (const [opName, expectedDesc] of Object.entries(expectedDescriptions)) {
        const op = registered.find(r => r.operatorName === opName);
        expect(op).toBeDefined();
        expect(op!.description).toBe(expectedDesc);
      }
    });

    it('covers all 26 expected descriptions', () => {
      expect(Object.keys(expectedDescriptions)).toHaveLength(26);
    });
  });

  describe('total registration count', () => {
    it('registers the correct total number of operator+type combinations', () => {
      const { registered } = runPlugin();
      // geometry-only function ops: 10 ops * 29 types = 290
      // geometry+geography function ops: 3 ops * 29 * 2 = 174
      // geometry-only SQL ops: 11 ops * 29 types = 319
      // geometry+geography SQL ops: 2 ops * 29 * 2 = 116
      // Total: 290 + 174 + 319 + 116 = 899
      const typesPerBase = 1 + CONCRETE_SUBTYPES.length * 4; // 29

      const geoOnlyFnOps = 10;
      const dualFnOps = 3;
      const geoOnlySqlOps = 11;
      const dualSqlOps = 2;

      const expected =
        geoOnlyFnOps * typesPerBase +
        dualFnOps * typesPerBase * 2 +
        geoOnlySqlOps * typesPerBase +
        dualSqlOps * typesPerBase * 2;

      expect(registered).toHaveLength(expected);
    });
  });
});
