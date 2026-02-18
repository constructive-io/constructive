import { GisSubtype, SUBTYPE_STRING_BY_SUBTYPE } from '../src/constants';
import { PostgisInflectionPlugin } from '../src/plugins/inflection';

// Extract the inflection add methods for testing
const inflectionAdd = (PostgisInflectionPlugin as any).inflection.add;

// Create a mock `this` context with upperCamelCase (mimicking graphile inflection)
function upperCamelCase(str: string): string {
  return str
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

const mockThis = { upperCamelCase };

describe('PostgisInflectionPlugin', () => {
  describe('plugin metadata', () => {
    it('should have correct name', () => {
      expect(PostgisInflectionPlugin.name).toBe('PostgisInflectionPlugin');
    });

    it('should have correct version', () => {
      expect(PostgisInflectionPlugin.version).toBe('2.0.0');
    });
  });

  describe('gisType', () => {
    it('should generate UpperCamelCase type names for geometry Point', () => {
      const result = inflectionAdd.gisType.call(
        mockThis, {}, 'geometry', GisSubtype.Point, false, false
      );
      // 'geometry-point' -> 'GeometryPoint'
      expect(result).toBe('GeometryPoint');
    });

    it('should generate type names with Z suffix', () => {
      const result = inflectionAdd.gisType.call(
        mockThis, {}, 'geometry', GisSubtype.Point, true, false
      );
      // 'geometry-point-z' -> 'GeometryPointZ'
      expect(result).toBe('GeometryPointZ');
    });

    it('should generate type names with M suffix', () => {
      const result = inflectionAdd.gisType.call(
        mockThis, {}, 'geometry', GisSubtype.Point, false, true
      );
      // 'geometry-point-m' -> 'GeometryPointM'
      expect(result).toBe('GeometryPointM');
    });

    it('should generate type names with ZM suffix', () => {
      const result = inflectionAdd.gisType.call(
        mockThis, {}, 'geometry', GisSubtype.Point, true, true
      );
      // 'geometry-point-z-m' -> 'GeometryPointZM'
      expect(result).toBe('GeometryPointZM');
    });

    it('should generate correct names for geography types', () => {
      const result = inflectionAdd.gisType.call(
        mockThis, {}, 'geography', GisSubtype.Point, false, false
      );
      expect(result).toBe('GeographyPoint');
    });

    it('should generate correct names for all concrete subtypes', () => {
      const expected: Record<number, string> = {
        [GisSubtype.Point]: 'GeometryPoint',
        [GisSubtype.LineString]: 'GeometryLineString',
        [GisSubtype.Polygon]: 'GeometryPolygon',
        [GisSubtype.MultiPoint]: 'GeometryMultiPoint',
        [GisSubtype.MultiLineString]: 'GeometryMultiLineString',
        [GisSubtype.MultiPolygon]: 'GeometryMultiPolygon',
        [GisSubtype.GeometryCollection]: 'GeometryGeometryCollection'
      };

      for (const [subtype, expectedName] of Object.entries(expected)) {
        const result = inflectionAdd.gisType.call(
          mockThis, {}, 'geometry', Number(subtype), false, false
        );
        expect(result).toBe(expectedName);
      }
    });

    it('should produce names matching v4 output pattern', () => {
      // In v4, type.name was used (e.g. 'geometry')
      // In v5, typeName string is used directly
      // The inflection joins [typeName, subtypeString, z?, m?] with '-' then upperCamelCases
      const result = inflectionAdd.gisType.call(
        mockThis, {}, 'geometry', GisSubtype.MultiPolygon, true, true
      );
      // 'geometry-multi-polygon-z-m' -> 'GeometryMultiPolygonZM'
      expect(result).toBe('GeometryMultiPolygonZM');
    });
  });

  describe('gisInterfaceName', () => {
    it('should generate interface name for geometry', () => {
      const result = inflectionAdd.gisInterfaceName.call(mockThis, {}, 'geometry');
      // 'geometry-interface' -> 'GeometryInterface'
      expect(result).toBe('GeometryInterface');
    });

    it('should generate interface name for geography', () => {
      const result = inflectionAdd.gisInterfaceName.call(mockThis, {}, 'geography');
      expect(result).toBe('GeographyInterface');
    });
  });

  describe('gisDimensionInterfaceName', () => {
    it('should generate XY dimension interface name', () => {
      const result = inflectionAdd.gisDimensionInterfaceName.call(
        mockThis, {}, 'geometry', false, false
      );
      // 'geometry-geometry' -> 'GeometryGeometry'
      expect(result).toBe('GeometryGeometry');
    });

    it('should generate XYZ dimension interface name', () => {
      const result = inflectionAdd.gisDimensionInterfaceName.call(
        mockThis, {}, 'geometry', true, false
      );
      // 'geometry-geometry-z' -> 'GeometryGeometryZ'
      expect(result).toBe('GeometryGeometryZ');
    });

    it('should generate XYM dimension interface name', () => {
      const result = inflectionAdd.gisDimensionInterfaceName.call(
        mockThis, {}, 'geometry', false, true
      );
      // 'geometry-geometry-m' -> 'GeometryGeometryM'
      expect(result).toBe('GeometryGeometryM');
    });

    it('should generate XYZM dimension interface name', () => {
      const result = inflectionAdd.gisDimensionInterfaceName.call(
        mockThis, {}, 'geometry', true, true
      );
      // 'geometry-geometry-z-m' -> 'GeometryGeometryZM'
      expect(result).toBe('GeometryGeometryZM');
    });

    it('should use Geometry subtype string (not the actual subtype)', () => {
      // The dimension interface always uses GisSubtype.Geometry's string representation
      // which is 'geometry', regardless of the actual subtype being queried
      const geoStr = SUBTYPE_STRING_BY_SUBTYPE[GisSubtype.Geometry];
      expect(geoStr).toBe('geometry');
    });
  });

  describe('geojsonFieldName', () => {
    it('should return "geojson"', () => {
      const result = inflectionAdd.geojsonFieldName.call(mockThis);
      expect(result).toBe('geojson');
    });
  });

  describe('gisXFieldName', () => {
    it('should return "x" for geometry type', () => {
      const result = inflectionAdd.gisXFieldName.call(mockThis, {}, 'geometry');
      expect(result).toBe('x');
    });

    it('should return "longitude" for geography type', () => {
      const result = inflectionAdd.gisXFieldName.call(mockThis, {}, 'geography');
      expect(result).toBe('longitude');
    });
  });

  describe('gisYFieldName', () => {
    it('should return "y" for geometry type', () => {
      const result = inflectionAdd.gisYFieldName.call(mockThis, {}, 'geometry');
      expect(result).toBe('y');
    });

    it('should return "latitude" for geography type', () => {
      const result = inflectionAdd.gisYFieldName.call(mockThis, {}, 'geography');
      expect(result).toBe('latitude');
    });
  });

  describe('gisZFieldName', () => {
    it('should return "z" for geometry type', () => {
      const result = inflectionAdd.gisZFieldName.call(mockThis, {}, 'geometry');
      expect(result).toBe('z');
    });

    it('should return "height" for geography type', () => {
      const result = inflectionAdd.gisZFieldName.call(mockThis, {}, 'geography');
      expect(result).toBe('height');
    });
  });
});
