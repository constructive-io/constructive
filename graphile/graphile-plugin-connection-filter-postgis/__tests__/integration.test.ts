import sql from 'pg-sql2';
import type { SQL } from 'pg-sql2';
import { CONCRETE_SUBTYPES, GisSubtype } from 'graphile-postgis';
import type { ConnectionFilterOperatorSpec as OperatorSpec } from 'graphile-connection-filter';
import { PgConnectionArgFilterPostgisOperatorsPlugin } from '../src/plugin';

/**
 * Integration tests verifying that:
 * 1. Our operator specs match the real OperatorSpec interface from connection-filter
 * 2. Type name generation matches graphile-postgis inflection conventions
 * 3. The resolve function signature is compatible with connection-filter's expectations
 */

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

// Capture all registered operators by running the plugin init hook
function runPlugin() {
  const registered: Array<{
    typeName: string;
    operatorName: string;
    spec: OperatorSpec;
  }> = [];

  const inflection = createMockInflection();

  const postgisInfo = {
    schemaName: 'public',
    geometryCodec: { name: 'geometry' },
    geographyCodec: { name: 'geography' }
  };

  const addConnectionFilterOperator = (
    typeName: string,
    operatorName: string,
    spec: OperatorSpec
  ) => {
    registered.push({ typeName, operatorName, spec });
  };

  const build = {
    inflection,
    pgGISExtensionInfo: postgisInfo,
    addConnectionFilterOperator
  };

  const plugin = PgConnectionArgFilterPostgisOperatorsPlugin;
  const initHook = (plugin.schema as any).hooks.init;
  initHook({}, build);

  return { registered };
}

describe('Integration: connection-filter OperatorSpec compatibility', () => {
  it('every registered spec has a description string', () => {
    const { registered } = runPlugin();
    expect(registered.length).toBeGreaterThan(0);

    for (const { spec, operatorName } of registered) {
      expect(typeof spec.description).toBe('string');
      expect(spec.description.length).toBeGreaterThan(0);
    }
  });

  it('every registered spec has a resolve function with correct arity', () => {
    const { registered } = runPlugin();

    for (const { spec, operatorName } of registered) {
      expect(typeof spec.resolve).toBe('function');
      // OperatorSpec.resolve expects 5 args:
      // (sqlIdentifier, sqlValue, input, _unused, details)
      expect(spec.resolve.length).toBe(5);
    }
  });

  it('every registered spec has a resolveType function', () => {
    const { registered } = runPlugin();

    for (const { spec } of registered) {
      expect(typeof spec.resolveType).toBe('function');
    }
  });

  it('resolveType returns the input type unchanged (identity)', () => {
    const { registered } = runPlugin();
    const mockType = { name: 'GeometryInterface' } as any;

    for (const { spec } of registered) {
      expect(spec.resolveType!(mockType)).toBe(mockType);
    }
  });

  it('resolve returns valid SQL when called with connection-filter args', () => {
    const { registered } = runPlugin();
    const sqlIdentifier = sql.identifier('geom_col');
    const sqlValue = sql.identifier('input_val');
    const details = { fieldName: 'geom', operatorName: 'contains' };

    for (const { spec, operatorName } of registered) {
      const result = spec.resolve(
        sqlIdentifier,
        sqlValue,
        null,
        null as any,
        details
      );
      // Should return a SQL fragment that compiles without error
      const compiled = sql.compile(result);
      expect(typeof compiled.text).toBe('string');
      expect(compiled.text.length).toBeGreaterThan(0);
    }
  });

  it('specs do not include unsupported OperatorSpec fields', () => {
    const { registered } = runPlugin();
    const validKeys: (keyof OperatorSpec)[] = [
      'name',
      'description',
      'resolveSqlIdentifier',
      'resolveInput',
      'resolveInputCodec',
      'resolveSql',
      'resolveSqlValue',
      'resolve',
      'resolveType'
    ];

    for (const { spec, operatorName } of registered) {
      const specKeys = Object.keys(spec);
      for (const key of specKeys) {
        expect(validKeys).toContain(key);
      }
    }
  });
});

describe('Integration: type name generation matches graphile-postgis', () => {
  const inflection = createMockInflection();

  it('CONCRETE_SUBTYPES contains exactly 7 subtypes', () => {
    expect(CONCRETE_SUBTYPES).toHaveLength(7);
  });

  it('generates correct interface names for geometry and geography', () => {
    expect(inflection.gisInterfaceName('geometry')).toBe('GeometryInterface');
    expect(inflection.gisInterfaceName('geography')).toBe('GeographyInterface');
  });

  it('generates correct concrete type names matching PostGIS conventions', () => {
    const expectedGeometryTypes = [
      'GeometryPoint', 'GeometryPointZ', 'GeometryPointM', 'GeometryPointZM',
      'GeometryLineString', 'GeometryLineStringZ', 'GeometryLineStringM', 'GeometryLineStringZM',
      'GeometryPolygon', 'GeometryPolygonZ', 'GeometryPolygonM', 'GeometryPolygonZM',
      'GeometryMultiPoint', 'GeometryMultiPointZ', 'GeometryMultiPointM', 'GeometryMultiPointZM',
      'GeometryMultiLineString', 'GeometryMultiLineStringZ', 'GeometryMultiLineStringM', 'GeometryMultiLineStringZM',
      'GeometryMultiPolygon', 'GeometryMultiPolygonZ', 'GeometryMultiPolygonM', 'GeometryMultiPolygonZM',
      'GeometryGeometryCollection', 'GeometryGeometryCollectionZ', 'GeometryGeometryCollectionM', 'GeometryGeometryCollectionZM'
    ];

    const generatedTypes: string[] = [];
    for (const subtype of CONCRETE_SUBTYPES) {
      for (const hasZ of [false, true]) {
        for (const hasM of [false, true]) {
          generatedTypes.push(inflection.gisType('geometry', subtype, hasZ, hasM, 0));
        }
      }
    }

    expect(generatedTypes.sort()).toEqual(expectedGeometryTypes.sort());
  });

  it('generates 29 type names per base type (1 interface + 7 subtypes * 4 dimension combos)', () => {
    const typesPerBase = 1 + CONCRETE_SUBTYPES.length * 4;
    expect(typesPerBase).toBe(29);
  });

  it('registered operator type names match generated PostGIS type names', () => {
    const { registered } = runPlugin();

    // Build expected type names using the same logic as the plugin
    const expectedGeoTypes: string[] = [inflection.gisInterfaceName('geometry')];
    const expectedGeogTypes: string[] = [inflection.gisInterfaceName('geography')];

    for (const subtype of CONCRETE_SUBTYPES) {
      for (const hasZ of [false, true]) {
        for (const hasM of [false, true]) {
          expectedGeoTypes.push(inflection.gisType('geometry', subtype, hasZ, hasM, 0));
          expectedGeogTypes.push(inflection.gisType('geography', subtype, hasZ, hasM, 0));
        }
      }
    }

    // Check a geometry-only operator
    const containsTypeNames = registered
      .filter(r => r.operatorName === 'contains')
      .map(r => r.typeName);
    expect(containsTypeNames.sort()).toEqual(expectedGeoTypes.sort());

    // Check a dual-base operator (geometry + geography)
    const intersectsTypeNames = registered
      .filter(r => r.operatorName === 'intersects')
      .map(r => r.typeName);
    expect(intersectsTypeNames.sort()).toEqual(
      [...expectedGeoTypes, ...expectedGeogTypes].sort()
    );
  });
});
