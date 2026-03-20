import sql from 'pg-sql2';
import { CONCRETE_SUBTYPES } from '../src/constants';
import { createWithinDistanceOperatorFactory } from '../src/plugins/within-distance-operator';
import { GraphilePostgisPreset } from '../src/preset';

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

// Mock GraphQL types for resolveType testing
const mockGeoJSON = { name: 'GeoJSON' };
const mockGraphQLFloat = { name: 'Float' };
const mockGraphQLNonNull = class {
  ofType: any;
  constructor(inner: any) { this.ofType = inner; }
};
const mockGraphQLInputObjectType = class {
  name: string;
  description: string;
  _fields: any;
  constructor(config: any) {
    this.name = config.name;
    this.description = config.description;
    this._fields = config.fields;
  }
};

function runFactory(options: {
  schemaName?: string;
  hasPostgis?: boolean;
} = {}) {
  const {
    schemaName = 'public',
    hasPostgis = true
  } = options;

  const inflection = createMockInflection();

  const postgisInfo = hasPostgis
    ? {
        schemaName,
        geometryCodec: { name: 'geometry' },
        geographyCodec: { name: 'geography' }
      }
    : undefined;

  const build = {
    inflection,
    pgGISExtensionInfo: postgisInfo,
    graphql: {
      GraphQLInputObjectType: mockGraphQLInputObjectType,
      GraphQLNonNull: mockGraphQLNonNull,
      GraphQLFloat: mockGraphQLFloat,
    },
    getTypeByName(name: string) {
      if (name === 'GeoJSON') return mockGeoJSON;
      return undefined;
    }
  };

  const factory = createWithinDistanceOperatorFactory();
  const registrations = factory(build as any);

  const registered = registrations.map(r => ({
    typeName: r.typeNames as string,
    operatorName: r.operatorName,
    description: r.spec.description,
    resolveType: r.spec.resolveType,
    resolveSqlValue: r.spec.resolveSqlValue,
    resolve: r.spec.resolve
  }));

  return { registered, registrations, build };
}

describe('PostGIS withinDistance operator factory (createWithinDistanceOperatorFactory)', () => {
  describe('preset integration', () => {
    it('declares the withinDistance factory in connectionFilterOperatorFactories', () => {
      const schema = GraphilePostgisPreset.schema as Record<string, unknown> | undefined;
      const factories = schema?.connectionFilterOperatorFactories as unknown[] | undefined;
      expect(factories).toBeDefined();
      expect(factories).toHaveLength(2); // main factory + withinDistance factory
      expect(typeof factories![0]).toBe('function');
      expect(typeof factories![1]).toBe('function');
    });
  });

  describe('graceful degradation', () => {
    it('returns empty array when PostGIS is not available', () => {
      const { registered } = runFactory({ hasPostgis: false });
      expect(registered).toHaveLength(0);
    });
  });

  describe('operator registration', () => {
    const TYPES_PER_BASE = 1 + CONCRETE_SUBTYPES.length * 4; // 29

    it('registers withinDistance for both geometry and geography types', () => {
      const { registered } = runFactory();
      const uniqueOperatorNames = [...new Set(registered.map(r => r.operatorName))];
      expect(uniqueOperatorNames).toEqual(['withinDistance']);
    });

    it('registers for all geometry and geography type names', () => {
      const { registered } = runFactory();
      // geometry: 29 types + geography: 29 types = 58 registrations
      expect(registered).toHaveLength(TYPES_PER_BASE * 2);
    });

    it('includes interface names', () => {
      const { registered } = runFactory();
      const typeNames = registered.map(r => r.typeName);
      expect(typeNames).toContain('GeometryInterface');
      expect(typeNames).toContain('GeographyInterface');
    });

    it('includes concrete subtype names for both bases', () => {
      const { registered } = runFactory();
      const typeNames = registered.map(r => r.typeName);
      expect(typeNames).toContain('GeometryPoint');
      expect(typeNames).toContain('GeometryPolygon');
      expect(typeNames).toContain('GeographyPoint');
      expect(typeNames).toContain('GeographyPolygon');
    });

    it('includes Z/M dimension variants', () => {
      const { registered } = runFactory();
      const typeNames = registered.map(r => r.typeName);
      expect(typeNames).toContain('GeometryPointZ');
      expect(typeNames).toContain('GeometryPointM');
      expect(typeNames).toContain('GeometryPointZM');
      expect(typeNames).toContain('GeographyPointZ');
    });
  });

  describe('resolveType', () => {
    it('returns a WithinDistanceInput type', () => {
      const { registered } = runFactory();
      const op = registered[0];
      const mockFieldType = { name: 'SomeType' } as any;
      const result = op.resolveType!(mockFieldType);
      expect(result).toBeDefined();
      expect((result as any).name).toBe('WithinDistanceInput');
    });

    it('returns the same WithinDistanceInput instance across calls', () => {
      const { registered } = runFactory();
      const op1 = registered[0];
      const op2 = registered[1];
      const mockFieldType = { name: 'SomeType' } as any;
      const result1 = op1.resolveType!(mockFieldType);
      const result2 = op2.resolveType!(mockFieldType);
      expect(result1).toBe(result2);
    });
  });

  describe('resolveSqlValue', () => {
    it('returns sql.null (overrides default SQL value pipeline)', () => {
      const { registered } = runFactory();
      const op = registered[0];
      const result = op.resolveSqlValue!(null, null, null);
      const compiled = sql.compile(result);
      expect(compiled.text).toBe('null');
    });
  });

  describe('SQL generation', () => {
    it('generates ST_DWithin SQL for geometry types', () => {
      const { registered } = runFactory({ schemaName: 'public' });
      // Find a geometry registration
      const geometryOp = registered.find(r => r.typeName === 'GeometryPoint');
      expect(geometryOp).toBeDefined();

      const colIdentifier = sql.identifier('my_col');
      const input = {
        point: { type: 'Point', coordinates: [-73.99, 40.73] },
        distance: 5000
      };

      const result = geometryOp!.resolve!(
        colIdentifier, sql.null, input, null,
        { fieldName: null, operatorName: 'withinDistance' }
      );
      const compiled = sql.compile(result);

      // Should contain ST_DWithin, ST_GeomFromGeoJSON, and the distance
      expect(compiled.text).toContain('"public"."st_dwithin"');
      expect(compiled.text).toContain('"public"."st_geomfromgeojson"');
      expect(compiled.text).toContain('my_col');
      // Should not contain geography cast for geometry types
      expect(compiled.text).not.toContain('"public"."geography"');
    });

    it('generates ST_DWithin SQL with geography cast for geography types', () => {
      const { registered } = runFactory({ schemaName: 'public' });
      // Find a geography registration
      const geographyOp = registered.find(r => r.typeName === 'GeographyPoint');
      expect(geographyOp).toBeDefined();

      const colIdentifier = sql.identifier('location');
      const input = {
        point: { type: 'Point', coordinates: [-73.99, 40.73] },
        distance: 5000
      };

      const result = geographyOp!.resolve!(
        colIdentifier, sql.null, input, null,
        { fieldName: null, operatorName: 'withinDistance' }
      );
      const compiled = sql.compile(result);

      expect(compiled.text).toContain('"public"."st_dwithin"');
      expect(compiled.text).toContain('"public"."st_geomfromgeojson"');
      // Should contain geography cast
      expect(compiled.text).toContain('"public"."geography"');
    });

    it('uses parameterized values for distance and GeoJSON', () => {
      const { registered } = runFactory();
      const op = registered.find(r => r.typeName === 'GeometryPoint');

      const input = {
        point: { type: 'Point', coordinates: [1.0, 2.0] },
        distance: 100
      };

      const result = op!.resolve!(
        sql.identifier('col'), sql.null, input, null,
        { fieldName: null, operatorName: 'withinDistance' }
      );
      const compiled = sql.compile(result);

      // Distance and GeoJSON should be parameterized (not inlined)
      expect(compiled.values.length).toBeGreaterThanOrEqual(2);
    });

    it('respects custom schema names', () => {
      const { registered } = runFactory({ schemaName: 'postgis_ext' });
      const op = registered.find(r => r.typeName === 'GeometryPoint');

      const input = {
        point: { type: 'Point', coordinates: [0, 0] },
        distance: 1
      };

      const result = op!.resolve!(
        sql.identifier('col'), sql.null, input, null,
        { fieldName: null, operatorName: 'withinDistance' }
      );
      const compiled = sql.compile(result);

      expect(compiled.text).toContain('"postgis_ext"."st_dwithin"');
      expect(compiled.text).toContain('"postgis_ext"."st_geomfromgeojson"');
    });
  });

  describe('operator description', () => {
    it('has a meaningful description', () => {
      const { registered } = runFactory();
      const op = registered[0];
      expect(op.description).toContain('ST_DWithin');
      expect(op.description).toContain('distance');
    });
  });
});
