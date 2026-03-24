import { GisSubtype } from '../src/constants';
import { PostgisTransformationFieldsPlugin } from '../src/plugins/transformation-functions';
import type { GisFieldValue } from '../src/types';

describe('PostgisTransformationFieldsPlugin', () => {
  describe('plugin metadata', () => {
    it('should have correct name', () => {
      expect(PostgisTransformationFieldsPlugin.name).toBe('PostgisTransformationFieldsPlugin');
    });

    it('should have correct version', () => {
      expect(PostgisTransformationFieldsPlugin.version).toBe('1.0.0');
    });

    it('should declare after dependencies', () => {
      expect(PostgisTransformationFieldsPlugin.after).toContain('PostgisRegisterTypesPlugin');
      expect(PostgisTransformationFieldsPlugin.after).toContain('PostgisGeometryFieldsPlugin');
    });
  });

  describe('field hook', () => {
    const fieldsHook = (PostgisTransformationFieldsPlugin as any).schema.hooks.GraphQLObjectType_fields;

    const mockBuild = {
      graphql: {
        GraphQLFloat: { name: 'Float' },
        GraphQLInt: { name: 'Int' },
        GraphQLList: class { constructor(public ofType: any) {} },
        GraphQLNonNull: class { constructor(public ofType: any) {} },
      },
      extend(base: any, extra: any, _reason: string) {
        return { ...base, ...extra };
      }
    };

    it('should return fields unchanged when not a PostGIS type', () => {
      const fields = { id: {} };
      const context = { scope: {} };
      const result = fieldsHook(fields, mockBuild, context);
      expect(result).toBe(fields);
    });

    it('should add bbox, centroid, and numPoints to Point types', () => {
      const context = {
        scope: {
          isPgGISType: true,
          pgGISCodecName: 'geometry',
          pgGISTypeDetails: { subtype: GisSubtype.Point, hasZ: false, hasM: false, srid: 0 }
        }
      };
      const result = fieldsHook({}, mockBuild, context);
      expect(result.bbox).toBeDefined();
      expect(result.centroid).toBeDefined();
      expect(result.numPoints).toBeDefined();
    });

    it('should add bbox, centroid, and numPoints to Polygon types', () => {
      const context = {
        scope: {
          isPgGISType: true,
          pgGISCodecName: 'geometry',
          pgGISTypeDetails: { subtype: GisSubtype.Polygon, hasZ: false, hasM: false, srid: 0 }
        }
      };
      const result = fieldsHook({}, mockBuild, context);
      expect(result.bbox).toBeDefined();
      expect(result.centroid).toBeDefined();
      expect(result.numPoints).toBeDefined();
    });
  });

  describe('resolve functions', () => {
    const fieldsHook = (PostgisTransformationFieldsPlugin as any).schema.hooks.GraphQLObjectType_fields;
    const mockBuild = {
      graphql: {
        GraphQLFloat: { name: 'Float' },
        GraphQLInt: { name: 'Int' },
        GraphQLList: class { constructor(public ofType: any) {} },
        GraphQLNonNull: class { constructor(public ofType: any) {} },
      },
      extend(base: any, extra: any, _reason: string) { return { ...base, ...extra }; }
    };

    function getFields(subtype: GisSubtype) {
      const context = {
        scope: {
          isPgGISType: true,
          pgGISCodecName: 'geometry',
          pgGISTypeDetails: { subtype, hasZ: false, hasM: false, srid: 0 }
        }
      };
      return fieldsHook({}, mockBuild, context);
    }

    describe('bbox', () => {
      it('should compute bounding box for a Point', () => {
        const fields = getFields(GisSubtype.Point);
        const data: GisFieldValue = {
          __gisType: 'Point',
          __srid: 4326,
          __geojson: { type: 'Point', coordinates: [10, 20] } as any
        };
        const bbox = fields.bbox.resolve(data);
        expect(bbox).toEqual([10, 20, 10, 20]);
      });

      it('should compute bounding box for a Polygon', () => {
        const fields = getFields(GisSubtype.Polygon);
        const data: GisFieldValue = {
          __gisType: 'Polygon',
          __srid: 4326,
          __geojson: {
            type: 'Polygon',
            coordinates: [[[0, 0], [10, 0], [10, 5], [0, 5], [0, 0]]]
          } as any
        };
        const bbox = fields.bbox.resolve(data);
        expect(bbox).toEqual([0, 0, 10, 5]);
      });

      it('should compute bounding box for a MultiPolygon', () => {
        const fields = getFields(GisSubtype.MultiPolygon);
        const data: GisFieldValue = {
          __gisType: 'MultiPolygon',
          __srid: 4326,
          __geojson: {
            type: 'MultiPolygon',
            coordinates: [
              [[[0, 0], [5, 0], [5, 5], [0, 5], [0, 0]]],
              [[[10, 10], [15, 10], [15, 15], [10, 15], [10, 10]]]
            ]
          } as any
        };
        const bbox = fields.bbox.resolve(data);
        expect(bbox).toEqual([0, 0, 15, 15]);
      });
    });

    describe('centroid', () => {
      it('should return coordinates for a Point', () => {
        const fields = getFields(GisSubtype.Point);
        const data: GisFieldValue = {
          __gisType: 'Point',
          __srid: 4326,
          __geojson: { type: 'Point', coordinates: [10, 20] } as any
        };
        const centroid = fields.centroid.resolve(data);
        expect(centroid).toEqual([10, 20]);
      });

      it('should compute centroid for a LineString', () => {
        const fields = getFields(GisSubtype.LineString);
        const data: GisFieldValue = {
          __gisType: 'LineString',
          __srid: 4326,
          __geojson: {
            type: 'LineString',
            coordinates: [[0, 0], [10, 0]]
          } as any
        };
        const centroid = fields.centroid.resolve(data);
        expect(centroid).toEqual([5, 0]);
      });

      it('should compute centroid for a Polygon', () => {
        const fields = getFields(GisSubtype.Polygon);
        const data: GisFieldValue = {
          __gisType: 'Polygon',
          __srid: 4326,
          __geojson: {
            type: 'Polygon',
            coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]
          } as any
        };
        const centroid = fields.centroid.resolve(data);
        // Mean of all 5 points (including closing point)
        expect(centroid[0]).toBeCloseTo(4, 0); // (0+10+10+0+0)/5 = 4
        expect(centroid[1]).toBeCloseTo(4, 0); // (0+0+10+10+0)/5 = 4
      });
    });

    describe('numPoints', () => {
      it('should return 1 for a Point', () => {
        const fields = getFields(GisSubtype.Point);
        const data: GisFieldValue = {
          __gisType: 'Point',
          __srid: 4326,
          __geojson: { type: 'Point', coordinates: [10, 20] } as any
        };
        expect(fields.numPoints.resolve(data)).toBe(1);
      });

      it('should count coordinates in a LineString', () => {
        const fields = getFields(GisSubtype.LineString);
        const data: GisFieldValue = {
          __gisType: 'LineString',
          __srid: 4326,
          __geojson: {
            type: 'LineString',
            coordinates: [[0, 0], [1, 0], [2, 0]]
          } as any
        };
        expect(fields.numPoints.resolve(data)).toBe(3);
      });

      it('should count all coordinates in a Polygon', () => {
        const fields = getFields(GisSubtype.Polygon);
        const data: GisFieldValue = {
          __gisType: 'Polygon',
          __srid: 4326,
          __geojson: {
            type: 'Polygon',
            coordinates: [
              [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
              [[2, 2], [8, 2], [8, 8], [2, 8], [2, 2]]
            ]
          } as any
        };
        expect(fields.numPoints.resolve(data)).toBe(10); // 5 exterior + 5 interior
      });

      it('should count all coordinates in a MultiPoint', () => {
        const fields = getFields(GisSubtype.MultiPoint);
        const data: GisFieldValue = {
          __gisType: 'MultiPoint',
          __srid: 4326,
          __geojson: {
            type: 'MultiPoint',
            coordinates: [[0, 0], [1, 1], [2, 2]]
          } as any
        };
        expect(fields.numPoints.resolve(data)).toBe(3);
      });

      it('should count all coordinates in a GeometryCollection', () => {
        const fields = getFields(GisSubtype.GeometryCollection);
        const data: GisFieldValue = {
          __gisType: 'GeometryCollection',
          __srid: 4326,
          __geojson: {
            type: 'GeometryCollection',
            geometries: [
              { type: 'Point', coordinates: [0, 0] },
              { type: 'LineString', coordinates: [[1, 1], [2, 2]] }
            ]
          } as any
        };
        expect(fields.numPoints.resolve(data)).toBe(3); // 1 Point + 2 LineString
      });
    });
  });
});
