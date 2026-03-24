import { PostgisAggregatePlugin } from '../src/plugins/aggregate-functions';

interface MockExtensionInfo {
  schemaName: string;
  geometryCodec: { name: string };
  geographyCodec: { name: string } | null;
}

interface MockBuild {
  pgGISExtensionInfo: MockExtensionInfo | undefined;
  extend?(base: Record<string, unknown>, extra: Record<string, unknown>, reason: string): Record<string, unknown>;
}

function createMockBuild(schemaName = 'public', hasPostgis = true): MockBuild {
  return {
    pgGISExtensionInfo: hasPostgis
      ? {
          schemaName,
          geometryCodec: { name: 'geometry' },
          geographyCodec: null
        }
      : undefined,
    extend(base: Record<string, unknown>, extra: Record<string, unknown>, _reason: string) {
      return { ...base, ...extra };
    }
  };
}

describe('PostgisAggregatePlugin', () => {
  describe('plugin metadata', () => {
    it('should have correct name', () => {
      expect(PostgisAggregatePlugin.name).toBe('PostgisAggregatePlugin');
    });

    it('should have correct version', () => {
      expect(PostgisAggregatePlugin.version).toBe('1.0.0');
    });

    it('should declare after dependencies', () => {
      expect(PostgisAggregatePlugin.after).toContain('PostgisRegisterTypesPlugin');
      expect(PostgisAggregatePlugin.after).toContain('PostgisExtensionDetectionPlugin');
    });
  });

  describe('build hook', () => {
    const buildHook = (PostgisAggregatePlugin as any).schema.hooks.build;

    it('should return build unchanged when PostGIS is not available', () => {
      const build = createMockBuild('public', false);
      const result = buildHook(build);
      expect(result).toBe(build);
      expect(result.pgGISAggregateFunctions).toBeUndefined();
    });

    it('should add pgGISAggregateFunctions to build when PostGIS is available', () => {
      const build = createMockBuild();
      const result = buildHook(build);
      expect(result.pgGISAggregateFunctions).toBeDefined();
    });

    it('should define stExtent aggregate function', () => {
      const result = buildHook(createMockBuild());
      const { stExtent } = result.pgGISAggregateFunctions;
      expect(stExtent).toBeDefined();
      expect(stExtent.sqlFunction).toBe('public.st_extent');
      expect(stExtent.returnsGeometry).toBe(true);
      expect(stExtent.description).toContain('Bounding box');
    });

    it('should define stUnion aggregate function', () => {
      const result = buildHook(createMockBuild());
      const { stUnion } = result.pgGISAggregateFunctions;
      expect(stUnion).toBeDefined();
      expect(stUnion.sqlFunction).toBe('public.st_union');
      expect(stUnion.returnsGeometry).toBe(true);
    });

    it('should define stCollect aggregate function', () => {
      const result = buildHook(createMockBuild());
      const { stCollect } = result.pgGISAggregateFunctions;
      expect(stCollect).toBeDefined();
      expect(stCollect.sqlFunction).toBe('public.st_collect');
      expect(stCollect.returnsGeometry).toBe(true);
    });

    it('should define stConvexHull aggregate function with requiresCollect flag', () => {
      const result = buildHook(createMockBuild());
      const { stConvexHull } = result.pgGISAggregateFunctions;
      expect(stConvexHull).toBeDefined();
      expect(stConvexHull.sqlFunction).toBe('public.st_convexhull');
      expect(stConvexHull.returnsGeometry).toBe(true);
      expect(stConvexHull.requiresCollect).toBe(true);
    });

    it('should use the correct schema name', () => {
      const result = buildHook(createMockBuild('postgis_ext'));
      expect(result.pgGISAggregateFunctions.stExtent.sqlFunction).toBe('postgis_ext.st_extent');
      expect(result.pgGISAggregateFunctions.stUnion.sqlFunction).toBe('postgis_ext.st_union');
      expect(result.pgGISAggregateFunctions.stCollect.sqlFunction).toBe('postgis_ext.st_collect');
      expect(result.pgGISAggregateFunctions.stConvexHull.sqlFunction).toBe('postgis_ext.st_convexhull');
    });

    it('should define exactly 4 aggregate functions', () => {
      const result = buildHook(createMockBuild());
      expect(Object.keys(result.pgGISAggregateFunctions)).toHaveLength(4);
    });
  });
});
