// Type augmentation: adds the 'schema' property to GraphileConfig.Plugin
import 'graphile-build';

import type { GraphileConfig } from 'graphile-config';
import type { GraphQLSchema } from 'graphql';

import { setCachedTablesMeta } from './cache';
import { extendQueryWithMetaField } from './graphql-meta-field';
import { collectTablesMeta } from './table-meta-builder';
import type { MetaBuild, TableMeta } from './types';

const runtimeTablesBySchema = new WeakMap<GraphQLSchema, TableMeta[]>();

function getRuntimeTablesMeta(
  build: MetaBuild,
  schema: GraphQLSchema
): TableMeta[] {
  let tables = runtimeTablesBySchema.get(schema);
  if (!tables) {
    tables = collectTablesMeta(build, schema);
    runtimeTablesBySchema.set(schema, tables);
    setCachedTablesMeta(tables);
  }
  return tables;
}

/**
 * Returns the table metadata memoized for the given executable schema, or
 * `undefined` if `_meta` has not been resolved against that schema (e.g. the
 * meta plugin is disabled or `_meta` was never executed). Callers building
 * schemas offline should use this schema-keyed accessor rather than the
 * legacy process-global cache, which carries no association to any schema.
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
        const build = rawBuild as unknown as MetaBuild;
        return extendQueryWithMetaField(
          rawFields as unknown as Record<string, unknown>,
          (schema) => getRuntimeTablesMeta(build, schema),
        ) as typeof rawFields;
      },

      finalize(schema, rawBuild) {
        // Populate the legacy module-level cache for consumers that read
        // `_cachedTablesMeta` without executing `_meta`. Deliberately does NOT
        // pre-warm the per-schema memo: later finalizers may still mutate the
        // schema, and the resolver must recompute from its final info.schema.
        const build = rawBuild as unknown as MetaBuild;
        setCachedTablesMeta(collectTablesMeta(build, schema));
        return schema;
      },
    },
  },
};
