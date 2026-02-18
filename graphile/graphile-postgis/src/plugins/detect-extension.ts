import 'graphile-build';
import 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-config';

export interface PostgisExtensionInfo {
  /** The schema name where PostGIS is installed (e.g. 'public') */
  schemaName: string;
  /** The geometry codec from the registry */
  geometryCodec: any;
  /** The geography codec from the registry */
  geographyCodec: any;
}

/**
 * PostgisExtensionDetectionPlugin
 *
 * Detects PostGIS presence in the database by searching for geometry/geography
 * codecs in the pgRegistry. Stores detected info on the build object for
 * downstream plugins.
 *
 * Gracefully degrades if PostGIS is not installed.
 */
export const PostgisExtensionDetectionPlugin: GraphileConfig.Plugin = {
  name: 'PostgisExtensionDetectionPlugin',
  version: '2.0.0',
  description: 'Detects PostGIS extension in the database',

  schema: {
    hooks: {
      build(build) {
        const pgRegistry = (build as any).input?.pgRegistry;
        if (!pgRegistry) {
          return build;
        }

        let geometryCodec: any = null;
        let geographyCodec: any = null;
        let schemaName: string = 'public';

        // Search through codecs for geometry and geography types
        for (const codec of Object.values(pgRegistry.pgCodecs) as any[]) {
          const pg = codec?.extensions?.pg;
          if (!pg) continue;

          if (pg.name === 'geometry') {
            geometryCodec = codec;
            schemaName = pg.schemaName || 'public';
          } else if (pg.name === 'geography') {
            geographyCodec = codec;
          }
        }

        if (!geometryCodec || !geographyCodec) {
          console.warn('PostGIS extension not found in database; skipping PostGIS plugin');
          return build;
        }

        const postgisInfo: PostgisExtensionInfo = {
          schemaName,
          geometryCodec,
          geographyCodec
        };

        return build.extend(build, {
          pgGISExtensionInfo: postgisInfo,
          pgGISGraphQLTypesByCodecAndSubtype: {} as Record<string, Record<string | number, any>>,
          pgGISGraphQLInterfaceTypesByCodec: {} as Record<string, Record<number, any>>,
          pgGISIncludedTypes: [] as any[]
        }, 'PostgisExtensionDetectionPlugin adding PostGIS build state');
      }
    }
  }
};
