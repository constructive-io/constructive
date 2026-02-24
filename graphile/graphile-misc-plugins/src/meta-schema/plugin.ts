import type { GraphileConfig } from 'graphile-config';
import { getCachedTablesMeta, setCachedTablesMeta } from './cache';
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
        setCachedTablesMeta(collectTablesMeta(build));
        return input;
      },

      GraphQLObjectType_fields(rawFields, _rawBuild, rawContext) {
        const context = rawContext as unknown as QueryTypeContext;
        if (context.Self?.name !== 'Query') return rawFields;
        return extendQueryWithMetaField(
          rawFields as unknown as Record<string, unknown>,
          getCachedTablesMeta(),
        ) as typeof rawFields;
      },
    },
  },
};
