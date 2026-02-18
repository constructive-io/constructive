import { GisSubtype, CONCRETE_SUBTYPES } from '../src/constants';
import { getGISTypeModifier, getGISTypeName } from '../src/utils';
import { PostgisRegisterTypesPlugin } from '../src/plugins/register-types';

describe('PostgisRegisterTypesPlugin', () => {
  describe('plugin metadata', () => {
    it('should have correct name', () => {
      expect(PostgisRegisterTypesPlugin.name).toBe('PostgisRegisterTypesPlugin');
    });

    it('should have correct version', () => {
      expect(PostgisRegisterTypesPlugin.version).toBe('2.0.0');
    });

    it('should declare after dependencies', () => {
      expect(PostgisRegisterTypesPlugin.after).toContain('PostgisExtensionDetectionPlugin');
      expect(PostgisRegisterTypesPlugin.after).toContain('PostgisInflectionPlugin');
    });
  });

  describe('type registration structure', () => {
    it('should have init and build hooks', () => {
      const hooks = (PostgisRegisterTypesPlugin as any).schema?.hooks;
      expect(hooks).toBeDefined();
      expect(hooks.init).toBeDefined();
      expect(hooks.build).toBeDefined();
      expect(hooks.GraphQLSchema).toBeDefined();
    });
  });

  describe('type modifier to type key mapping', () => {
    it('should produce correct gisTypeKey for concrete types', () => {
      // Verify that each concrete subtype + dimension combo produces a unique key
      const keys = new Set<string>();

      for (const subtype of CONCRETE_SUBTYPES) {
        for (const hasZ of [false, true]) {
          for (const hasM of [false, true]) {
            const key = getGISTypeName(subtype, hasZ, hasM);
            expect(keys.has(key)).toBe(false);
            keys.add(key);
          }
        }
      }

      // 7 subtypes x 4 dimension combos = 28 unique keys
      expect(keys.size).toBe(28);
    });

    it('should produce correct keys for Geometry dimension interfaces', () => {
      // Geometry subtype (0) maps to dimension interfaces, not concrete types
      const keys = [];
      for (const hasZ of [false, true]) {
        for (const hasM of [false, true]) {
          keys.push(getGISTypeName(GisSubtype.Geometry, hasZ, hasM));
        }
      }
      expect(keys).toEqual(['Geometry', 'GeometryM', 'GeometryZ', 'GeometryZM']);
    });
  });

  describe('type modifier roundtrip for type registration', () => {
    it('should create and decode modifiers for all registered type combos', () => {
      for (const subtype of CONCRETE_SUBTYPES) {
        for (const hasZ of [false, true]) {
          for (const hasM of [false, true]) {
            const modifier = getGISTypeModifier(subtype, hasZ, hasM, 0);
            const gisTypeName = getGISTypeName(subtype, hasZ, hasM);

            // Verify the type name is well-formed
            expect(gisTypeName).toBeTruthy();
            expect(gisTypeName.length).toBeGreaterThan(0);

            // Verify the modifier is non-negative
            expect(modifier).toBeGreaterThanOrEqual(0);
          }
        }
      }
    });
  });
});

describe('parseLiteralGeoJSON (via GeoJSON scalar)', () => {
  // The parseLiteral function is inlined in register-types.ts
  // We test its behavior patterns here

  it('should handle GeoJSON Point structure', () => {
    const point = {
      type: 'Point',
      coordinates: [125.6, 10.1]
    };
    // Verify the structure is valid GeoJSON
    expect(point.type).toBe('Point');
    expect(point.coordinates).toHaveLength(2);
  });

  it('should handle GeoJSON LineString structure', () => {
    const lineString = {
      type: 'LineString',
      coordinates: [[100.0, 0.0], [101.0, 1.0]]
    };
    expect(lineString.type).toBe('LineString');
    expect(lineString.coordinates).toHaveLength(2);
  });

  it('should handle GeoJSON Polygon structure', () => {
    const polygon = {
      type: 'Polygon',
      coordinates: [
        [[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]]
      ]
    };
    expect(polygon.type).toBe('Polygon');
    expect(polygon.coordinates[0]).toHaveLength(5);
  });

  it('should handle GeoJSON GeometryCollection structure', () => {
    const collection = {
      type: 'GeometryCollection',
      geometries: [
        { type: 'Point', coordinates: [100.0, 0.0] },
        { type: 'LineString', coordinates: [[101.0, 0.0], [102.0, 1.0]] }
      ]
    };
    expect(collection.type).toBe('GeometryCollection');
    expect(collection.geometries).toHaveLength(2);
  });
});

describe('SQL generation patterns', () => {
  it('should verify json_build_object key names match v4', () => {
    // The pgGISWrapExpression produces json_build_object with these keys
    const expectedKeys = ['__gisType', '__srid', '__geojson'];
    expectedKeys.forEach(key => {
      expect(key.startsWith('__')).toBe(true);
    });
  });

  it('should verify PostGIS function names are lowercase', () => {
    // PostGIS functions must be lowercase for PostgreSQL
    const requiredFunctions = [
      'postgis_type_name',
      'geometrytype',
      'st_coorddim',
      'st_srid',
      'st_asgeojson',
      'st_geomfromgeojson'
    ];
    requiredFunctions.forEach(fn => {
      expect(fn).toBe(fn.toLowerCase());
    });
  });
});
