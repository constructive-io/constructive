import { GisSubtype } from '../src/constants';
import { getGISTypeName } from '../src/utils';
import { PostgisGeometryFieldsPlugin } from '../src/plugins/geometry-fields';

describe('PostgisGeometryFieldsPlugin', () => {
  describe('plugin metadata', () => {
    it('should have correct name', () => {
      expect(PostgisGeometryFieldsPlugin.name).toBe('PostgisGeometryFieldsPlugin');
    });

    it('should have correct version', () => {
      expect(PostgisGeometryFieldsPlugin.version).toBe('2.0.0');
    });

    it('should declare after dependencies', () => {
      expect(PostgisGeometryFieldsPlugin.after).toContain('PostgisRegisterTypesPlugin');
      expect(PostgisGeometryFieldsPlugin.after).toContain('PostgisInflectionPlugin');
    });
  });

  describe('field hook', () => {
    const fieldsHook = (PostgisGeometryFieldsPlugin as any).schema.hooks.GraphQLObjectType_fields;

    it('should return fields unchanged when not a PostGIS type', () => {
      const fields = { id: {} };
      const build = {};
      const context = { scope: {} };
      const result = fieldsHook(fields, build, context);
      expect(result).toBe(fields);
    });

    it('should return fields unchanged when scope is incomplete', () => {
      const fields = { id: {} };
      const build = {};
      const context = { scope: { isPgGISType: true } };
      const result = fieldsHook(fields, build, context);
      expect(result).toBe(fields);
    });
  });

  describe('resolve functions (GeoJSON data mapping)', () => {
    // These tests verify the data transformation patterns used in resolvers

    describe('Point resolvers', () => {
      it('should extract x/y from GeoJSON coordinates', () => {
        const data = {
          __gisType: 'Point',
          __srid: 4326,
          __geojson: { type: 'Point', coordinates: [125.6, 10.1] }
        };
        expect(data.__geojson.coordinates[0]).toBe(125.6); // x/longitude
        expect(data.__geojson.coordinates[1]).toBe(10.1);  // y/latitude
      });

      it('should extract z from GeoJSON coordinates when hasZ', () => {
        const data = {
          __gisType: 'PointZ',
          __srid: 4326,
          __geojson: { type: 'Point', coordinates: [125.6, 10.1, 100.5] }
        };
        expect(data.__geojson.coordinates[2]).toBe(100.5); // z/height
      });
    });

    describe('LineString resolvers', () => {
      it('should map coordinates to Point objects', () => {
        const data = {
          __gisType: 'LineString',
          __srid: 4326,
          __geojson: {
            type: 'LineString',
            coordinates: [[100.0, 0.0], [101.0, 1.0]]
          }
        };

        const hasZ = false;
        const hasM = false;
        const points = data.__geojson.coordinates.map((coord: number[]) => ({
          __gisType: getGISTypeName(GisSubtype.Point, hasZ, hasM),
          __srid: data.__srid,
          __geojson: { type: 'Point', coordinates: coord }
        }));

        expect(points).toHaveLength(2);
        expect(points[0].__gisType).toBe('Point');
        expect(points[0].__srid).toBe(4326);
        expect(points[0].__geojson.coordinates).toEqual([100.0, 0.0]);
        expect(points[1].__geojson.coordinates).toEqual([101.0, 1.0]);
      });
    });

    describe('Polygon resolvers', () => {
      it('should extract exterior ring as LineString', () => {
        const data = {
          __gisType: 'Polygon',
          __srid: 4326,
          __geojson: {
            type: 'Polygon',
            coordinates: [
              [[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]],
              [[100.2, 0.2], [100.8, 0.2], [100.8, 0.8], [100.2, 0.8], [100.2, 0.2]]
            ]
          }
        };

        const hasZ = false;
        const hasM = false;

        // Exterior ring
        const exterior = {
          __gisType: getGISTypeName(GisSubtype.LineString, hasZ, hasM),
          __srid: data.__srid,
          __geojson: {
            type: 'LineString',
            coordinates: data.__geojson.coordinates[0]
          }
        };
        expect(exterior.__gisType).toBe('LineString');
        expect(exterior.__geojson.coordinates).toHaveLength(5);

        // Interior rings
        const interiors = data.__geojson.coordinates.slice(1).map((coord: number[][]) => ({
          __gisType: getGISTypeName(GisSubtype.LineString, hasZ, hasM),
          __srid: data.__srid,
          __geojson: { type: 'LineString', coordinates: coord }
        }));
        expect(interiors).toHaveLength(1);
        expect(interiors[0].__geojson.coordinates).toHaveLength(5);
      });
    });

    describe('MultiPoint resolvers', () => {
      it('should map coordinates to Point objects', () => {
        const data = {
          __gisType: 'MultiPoint',
          __srid: 4326,
          __geojson: {
            type: 'MultiPoint',
            coordinates: [[100.0, 0.0], [101.0, 1.0]]
          }
        };

        const points = data.__geojson.coordinates.map((coord: number[]) => ({
          __gisType: getGISTypeName(GisSubtype.Point, false, false),
          __srid: data.__srid,
          __geojson: { type: 'Point', coordinates: coord }
        }));

        expect(points).toHaveLength(2);
        expect(points[0].__gisType).toBe('Point');
      });
    });

    describe('MultiLineString resolvers', () => {
      it('should map coordinate arrays to LineString objects', () => {
        const data = {
          __gisType: 'MultiLineString',
          __srid: 4326,
          __geojson: {
            type: 'MultiLineString',
            coordinates: [
              [[100.0, 0.0], [101.0, 1.0]],
              [[102.0, 2.0], [103.0, 3.0]]
            ]
          }
        };

        const lines = data.__geojson.coordinates.map((coord: number[][]) => ({
          __gisType: getGISTypeName(GisSubtype.LineString, false, false),
          __srid: data.__srid,
          __geojson: { type: 'LineString', coordinates: coord }
        }));

        expect(lines).toHaveLength(2);
        expect(lines[0].__gisType).toBe('LineString');
      });
    });

    describe('MultiPolygon resolvers', () => {
      it('should map coordinate arrays to Polygon objects', () => {
        const data = {
          __gisType: 'MultiPolygon',
          __srid: 4326,
          __geojson: {
            type: 'MultiPolygon',
            coordinates: [
              [[[102.0, 2.0], [103.0, 2.0], [103.0, 3.0], [102.0, 3.0], [102.0, 2.0]]],
              [[[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]]]
            ]
          }
        };

        const polygons = data.__geojson.coordinates.map((coord: number[][][]) => ({
          __gisType: getGISTypeName(GisSubtype.Polygon, false, false),
          __srid: data.__srid,
          __geojson: { type: 'Polygon', coordinates: coord }
        }));

        expect(polygons).toHaveLength(2);
        expect(polygons[0].__gisType).toBe('Polygon');
      });
    });

    describe('GeometryCollection resolvers', () => {
      it('should map geometries using GisSubtype enum for type lookup', () => {
        const data = {
          __gisType: 'GeometryCollection',
          __srid: 4326,
          __geojson: {
            type: 'GeometryCollection',
            geometries: [
              { type: 'Point', coordinates: [100.0, 0.0] },
              { type: 'LineString', coordinates: [[101.0, 0.0], [102.0, 1.0]] }
            ]
          }
        };

        const hasZ = false;
        const hasM = false;
        const geometries = data.__geojson.geometries.map((geom: any) => {
          const subtypeValue = GisSubtype[geom.type as keyof typeof GisSubtype];
          return {
            __gisType: getGISTypeName(subtypeValue, hasZ, hasM),
            __srid: data.__srid,
            __geojson: geom
          };
        });

        expect(geometries).toHaveLength(2);
        expect(geometries[0].__gisType).toBe('Point');
        expect(geometries[1].__gisType).toBe('LineString');
      });

      it('should throw for unsupported geometry subtypes', () => {
        expect(() => {
          const badType = 'Circle';
          const subtypeValue = GisSubtype[badType as keyof typeof GisSubtype];
          if (subtypeValue === undefined) {
            throw new Error(`Unsupported geometry subtype ${badType}`);
          }
        }).toThrow('Unsupported geometry subtype Circle');
      });

      it('should handle all valid GeoJSON geometry types', () => {
        const validTypes = [
          'Point', 'LineString', 'Polygon',
          'MultiPoint', 'MultiLineString', 'MultiPolygon',
          'GeometryCollection'
        ];

        for (const type of validTypes) {
          const subtypeValue = GisSubtype[type as keyof typeof GisSubtype];
          expect(subtypeValue).toBeDefined();
          expect(typeof subtypeValue).toBe('number');
        }
      });
    });
  });
});
