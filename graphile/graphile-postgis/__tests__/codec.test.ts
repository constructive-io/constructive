import { PostgisCodecPlugin } from '../src/plugins/codec';

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
    const gatherHook = (PostgisCodecPlugin as any).gather.hooks.pgCodecs_findPgCodec;

    it('should skip if pgCodec is already set', async () => {
      const info = { helpers: { pgIntrospection: { getNamespaces: jest.fn() } } };
      const event = { pgCodec: { name: 'existing' }, pgType: { typname: 'geometry' }, serviceName: 'main' };

      await gatherHook(info, event);
      // Should not have called getNamespaces since pgCodec was already set
      expect(info.helpers.pgIntrospection.getNamespaces).not.toHaveBeenCalled();
    });

    it('should skip if namespace is not found', async () => {
      const info = {
        helpers: { pgIntrospection: { getNamespaces: jest.fn().mockResolvedValue([]) } }
      };
      const event = {
        pgCodec: undefined as any,
        pgType: { typname: 'geometry', typnamespace: 123 },
        serviceName: 'main'
      };

      await gatherHook(info, event);
      expect(event.pgCodec).toBeUndefined();
    });

    it('should create geometry codec when type is geometry', async () => {
      const info = {
        helpers: {
          pgIntrospection: {
            getNamespaces: jest.fn().mockResolvedValue([
              { _id: 123, nspname: 'public' }
            ])
          }
        }
      };
      const event = {
        pgCodec: undefined as any,
        pgType: { typname: 'geometry', typnamespace: 123, _id: 456 },
        serviceName: 'main'
      };

      await gatherHook(info, event);

      expect(event.pgCodec).toBeDefined();
      expect(event.pgCodec.name).toBe('geometry');
      expect(event.pgCodec.extensions.pg.name).toBe('geometry');
      expect(event.pgCodec.extensions.pg.schemaName).toBe('public');
      expect(event.pgCodec.extensions.pg.serviceName).toBe('main');
      expect(event.pgCodec.extensions.oid).toBe(456);
    });

    it('should create geography codec when type is geography', async () => {
      const info = {
        helpers: {
          pgIntrospection: {
            getNamespaces: jest.fn().mockResolvedValue([
              { _id: 789, nspname: 'postgis' }
            ])
          }
        }
      };
      const event = {
        pgCodec: undefined as any,
        pgType: { typname: 'geography', typnamespace: 789, _id: 101 },
        serviceName: 'main'
      };

      await gatherHook(info, event);

      expect(event.pgCodec).toBeDefined();
      expect(event.pgCodec.name).toBe('geography');
      expect(event.pgCodec.extensions.pg.name).toBe('geography');
      expect(event.pgCodec.extensions.pg.schemaName).toBe('postgis');
    });

    it('should skip non-geometry/geography types', async () => {
      const info = {
        helpers: {
          pgIntrospection: {
            getNamespaces: jest.fn().mockResolvedValue([
              { _id: 123, nspname: 'public' }
            ])
          }
        }
      };
      const event = {
        pgCodec: undefined as any,
        pgType: { typname: 'text', typnamespace: 123, _id: 200 },
        serviceName: 'main'
      };

      await gatherHook(info, event);
      expect(event.pgCodec).toBeUndefined();
    });

    describe('fromPg', () => {
      let fromPg: (value: string) => any;

      beforeAll(async () => {
        const info = {
          helpers: {
            pgIntrospection: {
              getNamespaces: jest.fn().mockResolvedValue([
                { _id: 1, nspname: 'public' }
              ])
            }
          }
        };
        const event = {
          pgCodec: undefined as any,
          pgType: { typname: 'geometry', typnamespace: 1, _id: 10 },
          serviceName: 'main'
        };
        await gatherHook(info, event);
        fromPg = event.pgCodec.fromPg;
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

      it('should return non-JSON strings as-is', () => {
        const hexValue = '0101000020E6100000';
        const result = fromPg(hexValue);
        expect(result).toBe(hexValue);
      });

      it('should pass through non-string values', () => {
        const obj = { __gisType: 'Point' };
        const result = fromPg(obj as any);
        expect(result).toBe(obj);
      });
    });

    describe('toPg', () => {
      let toPg: (value: unknown) => string;

      beforeAll(async () => {
        const info = {
          helpers: {
            pgIntrospection: {
              getNamespaces: jest.fn().mockResolvedValue([
                { _id: 1, nspname: 'public' }
              ])
            }
          }
        };
        const event = {
          pgCodec: undefined as any,
          pgType: { typname: 'geometry', typnamespace: 1, _id: 10 },
          serviceName: 'main'
        };
        await gatherHook(info, event);
        toPg = event.pgCodec.toPg;
      });

      it('should JSON.stringify objects', () => {
        const geojson = { type: 'Point', coordinates: [1, 2] };
        const result = toPg(geojson);
        expect(result).toBe(JSON.stringify(geojson));
      });

      it('should convert non-objects to string', () => {
        expect(toPg('some-string')).toBe('some-string');
        expect(toPg(42)).toBe('42');
      });

      it('should handle null by converting to string', () => {
        expect(toPg(null)).toBe('null');
      });
    });
  });
});
