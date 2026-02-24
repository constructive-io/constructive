import 'graphile-build';
import 'graphile-build-pg';
import type { PgCodec } from '@dataplan/pg';
import type { GraphileConfig } from 'graphile-config';
import type { PostgisExtensionInfo } from '../types';

// Re-export for backward compat — other plugins import from here
export type { PostgisExtensionInfo } from '../types';

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
        const pgRegistry = build.input?.pgRegistry;
        if (!pgRegistry) {
          return build;
        }

        let geometryCodec: PgCodec | null = null;
        let geographyCodec: PgCodec | null = null;
        let schemaName: string = 'public';

        // Search through codecs for geometry and geography types
        for (const codec of Object.values(pgRegistry.pgCodecs)) {
          const pg = codec?.extensions?.pg;
          if (!pg) continue;

          if (pg.name === 'geometry') {
            geometryCodec = codec;
            schemaName = pg.schemaName || 'public';
          } else if (pg.name === 'geography') {
            geographyCodec = codec;
          }
        }

        // PostGIS requires at least the geometry codec to be present.
        // Geography is optional — not all databases use geography columns,
        // so PostGraphile may not introspect the geography type at all.
        if (!geometryCodec) {
          return build;
        }

        const postgisInfo: PostgisExtensionInfo = {
          schemaName,
          geometryCodec,
          geographyCodec
        };

        return build.extend(build, {
          pgGISExtensionInfo: postgisInfo,
          pgGISGraphQLTypesByCodecAndSubtype: {} as Record<string, Record<string | number, string>>
        }, 'PostgisExtensionDetectionPlugin adding PostGIS build state');
      }
    }
  }
};
