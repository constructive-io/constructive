import { GisSubtype } from '../src/constants';
import { PostgisMeasurementFieldsPlugin } from '../src/plugins/measurement-fields';
import type { GisFieldValue } from '../src/types';

describe('PostgisMeasurementFieldsPlugin', () => {
  describe('plugin metadata', () => {
    it('should have correct name', () => {
      expect(PostgisMeasurementFieldsPlugin.name).toBe('PostgisMeasurementFieldsPlugin');
    });

    it('should have correct version', () => {
      expect(PostgisMeasurementFieldsPlugin.version).toBe('1.0.0');
    });

    it('should declare after dependencies', () => {
      expect(PostgisMeasurementFieldsPlugin.after).toContain('PostgisRegisterTypesPlugin');
      expect(PostgisMeasurementFieldsPlugin.after).toContain('PostgisGeometryFieldsPlugin');
    });
  });

  describe('field hook', () => {
    const fieldsHook = (PostgisMeasurementFieldsPlugin as any).schema.hooks.GraphQLObjectType_fields;

    const mockBuild = {
      graphql: {
        GraphQLFloat: { name: 'Float' },
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

    it('should return fields unchanged for Point types (no measurements)', () => {
      const fields = { geojson: {} };
      const context = {
        scope: {
          isPgGISType: true,
          pgGISCodecName: 'geometry',
          pgGISTypeDetails: { subtype: GisSubtype.Point, hasZ: false, hasM: false, srid: 0 }
        }
      };
      const result = fieldsHook(fields, mockBuild, context);
      expect(result).toBe(fields);
    });

    it('should return fields unchanged for MultiPoint types', () => {
      const fields = { geojson: {} };
      const context = {
        scope: {
          isPgGISType: true,
          pgGISCodecName: 'geometry',
          pgGISTypeDetails: { subtype: GisSubtype.MultiPoint, hasZ: false, hasM: false, srid: 0 }
        }
      };
      const result = fieldsHook(fields, mockBuild, context);
      expect(result).toBe(fields);
    });

    it('should return fields unchanged for GeometryCollection types', () => {
      const fields = { geojson: {} };
      const context = {
        scope: {
          isPgGISType: true,
          pgGISCodecName: 'geometry',
          pgGISTypeDetails: { subtype: GisSubtype.GeometryCollection, hasZ: false, hasM: false, srid: 0 }
        }
      };
      const result = fieldsHook(fields, mockBuild, context);
      expect(result).toBe(fields);
    });

    it('should add area and perimeter fields for Polygon types', () => {
      const fields = { geojson: {} };
      const context = {
        scope: {
          isPgGISType: true,
          pgGISCodecName: 'geometry',
          pgGISTypeDetails: { subtype: GisSubtype.Polygon, hasZ: false, hasM: false, srid: 0 }
        }
      };
      const result = fieldsHook(fields, mockBuild, context);
      expect(result.area).toBeDefined();
      expect(result.perimeter).toBeDefined();
      expect(result.length).toBeUndefined();
    });

    it('should add area and perimeter fields for MultiPolygon types', () => {
      const fields = { geojson: {} };
      const context = {
        scope: {
          isPgGISType: true,
          pgGISCodecName: 'geometry',
          pgGISTypeDetails: { subtype: GisSubtype.MultiPolygon, hasZ: false, hasM: false, srid: 0 }
        }
      };
      const result = fieldsHook(fields, mockBuild, context);
      expect(result.area).toBeDefined();
      expect(result.perimeter).toBeDefined();
    });

    it('should add length field for LineString types', () => {
      const fields = { geojson: {} };
      const context = {
        scope: {
          isPgGISType: true,
          pgGISCodecName: 'geometry',
          pgGISTypeDetails: { subtype: GisSubtype.LineString, hasZ: false, hasM: false, srid: 0 }
        }
      };
      const result = fieldsHook(fields, mockBuild, context);
      expect(result.length).toBeDefined();
      expect(result.area).toBeUndefined();
      expect(result.perimeter).toBeUndefined();
    });

    it('should add length field for MultiLineString types', () => {
      const fields = { geojson: {} };
      const context = {
        scope: {
          isPgGISType: true,
          pgGISCodecName: 'geometry',
          pgGISTypeDetails: { subtype: GisSubtype.MultiLineString, hasZ: false, hasM: false, srid: 0 }
        }
      };
      const result = fieldsHook(fields, mockBuild, context);
      expect(result.length).toBeDefined();
    });
  });

  describe('measurement calculations', () => {
    const fieldsHook = (PostgisMeasurementFieldsPlugin as any).schema.hooks.GraphQLObjectType_fields;
    const mockBuild = {
      graphql: { GraphQLFloat: { name: 'Float' } },
      extend(base: any, extra: any, _reason: string) { return { ...base, ...extra }; }
    };

    describe('Polygon area', () => {
      it('should calculate area for a simple square polygon', () => {
        const context = {
          scope: {
            isPgGISType: true,
            pgGISCodecName: 'geometry',
            pgGISTypeDetails: { subtype: GisSubtype.Polygon, hasZ: false, hasM: false, srid: 0 }
          }
        };
        const result = fieldsHook({}, mockBuild, context);

        // A small square near the equator (~1 degree sides)
        const data: GisFieldValue = {
          __gisType: 'Polygon',
          __srid: 4326,
          __geojson: {
            type: 'Polygon',
            coordinates: [
              [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]
            ]
          } as any
        };

        const area = result.area.resolve(data);
        // ~12,364 km² for a 1°×1° square at the equator
        expect(area).toBeGreaterThan(1e10); // > 10 billion sq meters = 10,000+ km²
        expect(area).toBeLessThan(2e10);
      });

      it('should return 0 for degenerate polygon (less than 4 points)', () => {
        const context = {
          scope: {
            isPgGISType: true,
            pgGISCodecName: 'geometry',
            pgGISTypeDetails: { subtype: GisSubtype.Polygon, hasZ: false, hasM: false, srid: 0 }
          }
        };
        const result = fieldsHook({}, mockBuild, context);

        const data: GisFieldValue = {
          __gisType: 'Polygon',
          __srid: 4326,
          __geojson: {
            type: 'Polygon',
            coordinates: [[[0, 0], [1, 0], [0, 0]]]
          } as any
        };

        const area = result.area.resolve(data);
        expect(area).toBe(0);
      });
    });

    describe('Polygon perimeter', () => {
      it('should calculate perimeter for a simple polygon', () => {
        const context = {
          scope: {
            isPgGISType: true,
            pgGISCodecName: 'geometry',
            pgGISTypeDetails: { subtype: GisSubtype.Polygon, hasZ: false, hasM: false, srid: 0 }
          }
        };
        const result = fieldsHook({}, mockBuild, context);

        const data: GisFieldValue = {
          __gisType: 'Polygon',
          __srid: 4326,
          __geojson: {
            type: 'Polygon',
            coordinates: [
              [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]
            ]
          } as any
        };

        const perimeter = result.perimeter.resolve(data);
        // ~4 × 111km = ~444km for a 1°×1° square at the equator
        expect(perimeter).toBeGreaterThan(400_000);
        expect(perimeter).toBeLessThan(500_000);
      });
    });

    describe('LineString length', () => {
      it('should calculate length for a simple line', () => {
        const context = {
          scope: {
            isPgGISType: true,
            pgGISCodecName: 'geometry',
            pgGISTypeDetails: { subtype: GisSubtype.LineString, hasZ: false, hasM: false, srid: 0 }
          }
        };
        const result = fieldsHook({}, mockBuild, context);

        const data: GisFieldValue = {
          __gisType: 'LineString',
          __srid: 4326,
          __geojson: {
            type: 'LineString',
            coordinates: [[0, 0], [1, 0]]
          } as any
        };

        const length = result.length.resolve(data);
        // ~111km for 1 degree at the equator
        expect(length).toBeGreaterThan(100_000);
        expect(length).toBeLessThan(120_000);
      });

      it('should return 0 for a single-point line', () => {
        const context = {
          scope: {
            isPgGISType: true,
            pgGISCodecName: 'geometry',
            pgGISTypeDetails: { subtype: GisSubtype.LineString, hasZ: false, hasM: false, srid: 0 }
          }
        };
        const result = fieldsHook({}, mockBuild, context);

        const data: GisFieldValue = {
          __gisType: 'LineString',
          __srid: 4326,
          __geojson: {
            type: 'LineString',
            coordinates: [[0, 0]]
          } as any
        };

        const length = result.length.resolve(data);
        expect(length).toBe(0);
      });
    });

    describe('MultiPolygon area', () => {
      it('should sum areas of multiple polygons', () => {
        const context = {
          scope: {
            isPgGISType: true,
            pgGISCodecName: 'geometry',
            pgGISTypeDetails: { subtype: GisSubtype.MultiPolygon, hasZ: false, hasM: false, srid: 0 }
          }
        };
        const result = fieldsHook({}, mockBuild, context);

        const data: GisFieldValue = {
          __gisType: 'MultiPolygon',
          __srid: 4326,
          __geojson: {
            type: 'MultiPolygon',
            coordinates: [
              [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
              [[[2, 2], [3, 2], [3, 3], [2, 3], [2, 2]]]
            ]
          } as any
        };

        const area = result.area.resolve(data);
        // Should be roughly double the single polygon area
        expect(area).toBeGreaterThan(2e10);
      });
    });

    describe('MultiLineString length', () => {
      it('should sum lengths of multiple lines', () => {
        const context = {
          scope: {
            isPgGISType: true,
            pgGISCodecName: 'geometry',
            pgGISTypeDetails: { subtype: GisSubtype.MultiLineString, hasZ: false, hasM: false, srid: 0 }
          }
        };
        const result = fieldsHook({}, mockBuild, context);

        const data: GisFieldValue = {
          __gisType: 'MultiLineString',
          __srid: 4326,
          __geojson: {
            type: 'MultiLineString',
            coordinates: [
              [[0, 0], [1, 0]],
              [[2, 2], [3, 2]]
            ]
          } as any
        };

        const length = result.length.resolve(data);
        // Should be roughly double the single line length (~222km)
        expect(length).toBeGreaterThan(200_000);
        expect(length).toBeLessThan(250_000);
      });
    });
  });
});
