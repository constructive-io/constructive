// Type augmentation: adds the 'schema' property to GraphileConfig.Plugin
import 'graphile-build';

import type { GraphileConfig } from 'graphile-config';
import type { GraphQLSchema } from 'graphql';

import { extendQueryWithMetaField } from './graphql-meta-field';
import { collectTablesMeta } from './table-meta-builder';
import type { MetaBuild, TableMeta } from './types';

const runtimeTablesBySchema = new WeakMap<GraphQLSchema, TableMeta[]>();

function getRuntimeTablesMeta(schema: GraphQLSchema): TableMeta[] {
  const tables = runtimeTablesBySchema.get(schema);
  if (!tables) {
    throw new Error(
      'Meta schema runtime state was not finalized for this GraphQL schema'
    );
  }
  return tables;
}

/**
 * Returns the table metadata memoized for the given executable schema, or
 * `undefined` when the meta plugin was not installed for that schema.
 */
export function getTablesMetaForSchema(
  schema: GraphQLSchema
): TableMeta[] | undefined {
  return runtimeTablesBySchema.get(schema);
}

export const MetaSchemaPlugin: GraphileConfig.Plugin = {
  name: 'MetaSchemaPlugin',
  version: '1.0.0',
  description: 'Exposes _meta query for database schema introspection',
  schema: {
    hooks: {
      GraphQLObjectType_fields(rawFields, rawBuild, rawContext) {
        if (!rawContext.scope.isRootQuery) return rawFields;
        return extendQueryWithMetaField(
          rawFields as unknown as Record<string, unknown>,
          getRuntimeTablesMeta
        ) as typeof rawFields;
      },
      finalize(schema, rawBuild) {
        const build = rawBuild as unknown as MetaBuild;
        runtimeTablesBySchema.set(schema, collectTablesMeta(build, schema));
        return schema;
      },
    },
  },
};
