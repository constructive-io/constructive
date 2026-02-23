import type { PgCodec } from '@dataplan/pg';
import { PostgisCodecPlugin } from '../src/plugins/codec';
import type { GisFieldValue } from '../src/types';

// Test event shape matching the GatherHooks.pgCodecs_findPgCodec event
interface MockEvent {
  pgCodec: PgCodec | null;
  pgType: { typname: string; typnamespace?: string; _id?: string };
  serviceName: string;
}

describe('PostgisCodecPlugin', () => {
  describe('plugin metadata', () => {
    it('should have correct name', () => {
      expect(PostgisCodecPlugin.name).toBe('PostgisCodecPlugin');
    });

    it('should have correct version', () => {
      expect(PostgisCodecPlugin.version).toBe('2.0.0');
    });
  });

  describe('gather hook', () => {
    const gatherHook = (PostgisCodecPlugin as { gather: { hooks: { pgCodecs_findPgCodec: Function } } })
      .gather.hooks.pgCodecs_findPgCodec;

    it('should skip if pgCodec is already set', async () => {
      const info = { helpers: { pgIntrospection: { getNamespace: jest.fn() } } };
      const event = { pgCodec: { name: 'existing' }, pgType: { typname: 'geometry' }, serviceName: 'main' };

      await gatherHook(info, event);
      // Should not have called getNamespace since pgCodec was already set
      expect(info.helpers.pgIntrospection.getNamespace).not.toHaveBeenCalled();
    });

    it('should skip if namespace is not found', async () => {
      const info = {
        helpers: { pgIntrospection: { getNamespace: jest.fn().mockResolvedValue(null) } }
      };
      const event: MockEvent = {
        pgCodec: null,
        pgType: { typname: 'geometry', typnamespace: '123' },
        serviceName: 'main'
      };

      await gatherHook(info, event);
      expect(event.pgCodec).toBeNull();
    });

    it('should create geometry codec when type is geometry', async () => {
      const info = {
        helpers: {
          pgIntrospection: {
            getNamespace: jest.fn().mockResolvedValue({ _id: '123', nspname: 'public' })
          }
        }
      };
      const event: MockEvent = {
        pgCodec: null,
        pgType: { typname: 'geometry', typnamespace: '123', _id: '456' },
        serviceName: 'main'
      };

      await gatherHook(info, event);

      expect(event.pgCodec).toBeDefined();
      expect(event.pgCodec!.name).toBe('geometry');
      expect(event.pgCodec!.extensions?.pg?.name).toBe('geometry');
      expect(event.pgCodec!.extensions?.pg?.schemaName).toBe('public');
      expect(event.pgCodec!.extensions?.pg?.serviceName).toBe('main');
      expect(event.pgCodec!.extensions?.oid).toBe('456');
    });

    it('should create geography codec when type is geography', async () => {
      const info = {
        helpers: {
          pgIntrospection: {
            getNamespace: jest.fn().mockResolvedValue({ _id: '789', nspname: 'postgis' })
          }
        }
      };
      const event: MockEvent = {
        pgCodec: null,
        pgType: { typname: 'geography', typnamespace: '789', _id: '101' },
        serviceName: 'main'
      };

      await gatherHook(info, event);

      expect(event.pgCodec).toBeDefined();
      expect(event.pgCodec!.name).toBe('geography');
      expect(event.pgCodec!.extensions?.pg?.name).toBe('geography');
      expect(event.pgCodec!.extensions?.pg?.schemaName).toBe('postgis');
    });

    it('should skip non-geometry/geography types', async () => {
      const info = {
        helpers: {
          pgIntrospection: {
            getNamespace: jest.fn().mockResolvedValue({ _id: '123', nspname: 'public' })
          }
        }
      };
      const event: MockEvent = {
        pgCodec: null,
        pgType: { typname: 'text', typnamespace: '123', _id: '200' },
        serviceName: 'main'
      };

      await gatherHook(info, event);
      expect(event.pgCodec).toBeNull();
    });

    it('should pass correct args to getNamespace', async () => {
      const getNamespace = jest.fn().mockResolvedValue({ _id: '123', nspname: 'public' });
      const info = { helpers: { pgIntrospection: { getNamespace } } };
      const event: MockEvent = {
        pgCodec: null,
        pgType: { typname: 'geometry', typnamespace: '123', _id: '456' },
        serviceName: 'main'
      };

      await gatherHook(info, event);
      expect(getNamespace).toHaveBeenCalledWith('main', '123');
    });

    describe('fromPg', () => {
      let fromPg: (value: string) => GisFieldValue;

      beforeAll(async () => {
        const info = {
          helpers: {
            pgIntrospection: {
              getNamespace: jest.fn().mockResolvedValue({ _id: '1', nspname: 'public' })
            }
          }
        };
        const event = {
          pgCodec: null as unknown,
          pgType: { typname: 'geometry', typnamespace: '1', _id: '10' },
          serviceName: 'main'
        };
        await gatherHook(info, event);
        fromPg = (event.pgCodec as { fromPg: typeof fromPg }).fromPg;
      });

      it('should parse JSON string values', () => {
        const jsonStr = JSON.stringify({
          __gisType: 'Point',
          __srid: 4326,
          __geojson: { type: 'Point', coordinates: [1, 2] }
        });
        const result = fromPg(jsonStr);
        expect(result.__gisType).toBe('Point');
        expect(result.__srid).toBe(4326);
      });

      it('should normalize uppercase gisType to mixed case', () => {
        const jsonStr = JSON.stringify({
          __gisType: 'MULTIPOLYGON',
          __srid: 4326,
          __geojson: { type: 'MultiPolygon', coordinates: [] }
        });
        const result = fromPg(jsonStr);
        expect(result.__gisType).toBe('MultiPolygon');
      });

      it('should pass through already-normalized gisType', () => {
        const jsonStr = JSON.stringify({
          __gisType: 'LineString',
          __srid: 4326,
          __geojson: { type: 'LineString', coordinates: [] }
        });
        const result = fromPg(jsonStr);
        expect(result.__gisType).toBe('LineString');
      });

      it('should throw on invalid JSON (castFromPg guarantees valid JSON)', () => {
        expect(() => fromPg('not-json')).toThrow();
      });
    });

    describe('toPg', () => {
      let toPg: (value: GisFieldValue) => string;

      beforeAll(async () => {
        const info = {
          helpers: {
            pgIntrospection: {
              getNamespace: jest.fn().mockResolvedValue({ _id: '1', nspname: 'public' })
            }
          }
        };
        const event = {
          pgCodec: null as unknown,
          pgType: { typname: 'geometry', typnamespace: '1', _id: '10' },
          serviceName: 'main'
        };
        await gatherHook(info, event);
        toPg = (event.pgCodec as { toPg: typeof toPg }).toPg;
      });

      it('should JSON.stringify GeoJSON objects', () => {
        const geojson = { type: 'Point', coordinates: [1, 2] } as unknown as GisFieldValue;
        const result = toPg(geojson);
        expect(result).toBe(JSON.stringify(geojson));
      });

      it('should JSON.stringify GisFieldValue objects', () => {
        const value: GisFieldValue = {
          __gisType: 'Point',
          __srid: 4326,
          __geojson: { type: 'Point', coordinates: [1, 2] }
        };
        const result = toPg(value);
        expect(JSON.parse(result).__gisType).toBe('Point');
      });
    });

    describe('castFromPg', () => {
      it('should be defined on the codec', async () => {
        const info = {
          helpers: {
            pgIntrospection: {
              getNamespace: jest.fn().mockResolvedValue({ _id: '1', nspname: 'public' })
            }
          }
        };
        const event = {
          pgCodec: null as unknown,
          pgType: { typname: 'geometry', typnamespace: '1', _id: '10' },
          serviceName: 'main'
        };
        await gatherHook(info, event);

        const codec = event.pgCodec as { castFromPg?: Function };
        expect(codec.castFromPg).toBeDefined();
        expect(typeof codec.castFromPg).toBe('function');
      });
    });
  });
});
