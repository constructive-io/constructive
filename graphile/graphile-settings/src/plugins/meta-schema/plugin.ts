import type { GraphileConfig } from 'graphile-config';
import {
  getTablesMetaForBuild,
  setCachedTablesMeta,
  setTablesMetaForBuild,
} from './cache';
import { extendQueryWithMetaField } from './graphql-meta-field';
import { collectTablesMeta } from './table-meta-builder';
import type { MetaBuild } from './types';

interface QueryTypeContext {
  Self?: {
    name?: string;
  };
}

export const MetaSchemaPlugin: GraphileConfig.Plugin = {
  name: 'MetaSchemaPlugin',
  version: '1.0.0',
  description: 'Exposes _meta query for database schema introspection',
  schema: {
    hooks: {
      init(input, rawBuild) {
        const build = rawBuild as unknown as MetaBuild;
        const tablesMeta = collectTablesMeta(build);
        // Keyed by this build so the _meta field resolver reads its own tables,
        // even when other builds run concurrently in the same process.
        setTablesMetaForBuild(rawBuild, tablesMeta);
        // Flat mirror for out-of-process codegen consumers (see cache.ts).
        setCachedTablesMeta(tablesMeta);
        return input;
      },

      GraphQLObjectType_fields(rawFields, rawBuild, rawContext) {
        const context = rawContext as unknown as QueryTypeContext;
        if (context.Self?.name !== 'Query') return rawFields;
        return extendQueryWithMetaField(
          rawFields as unknown as Record<string, unknown>,
          getTablesMetaForBuild(rawBuild),
        ) as typeof rawFields;
      },
    },
  },
};
