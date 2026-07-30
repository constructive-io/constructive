// Type augmentation: adds the 'schema' property to GraphileConfig.Plugin
import 'graphile-build';

import type { GraphileConfig } from 'graphile-config';
import type { GraphQLSchema } from 'graphql';

import { setCachedTablesMeta } from './cache';
import { extendQueryWithMetaField } from './graphql-meta-field';
import { collectTablesMeta } from './table-meta-builder';
import type { MetaBuild, TableMeta } from './types';

interface QueryTypeContext {
  Self?: {
    name?: string;
  };
}

interface MetaSchemaState {
  runtimeTablesBySchema: WeakMap<GraphQLSchema, TableMeta[]>;
}

const stateByBuild = new WeakMap<object, MetaSchemaState>();

function getState(build: MetaBuild): MetaSchemaState {
  let state = stateByBuild.get(build as object);
  if (!state) {
    state = { runtimeTablesBySchema: new WeakMap() };
    stateByBuild.set(build as object, state);
  }
  return state;
}

function getRuntimeTablesMeta(
  build: MetaBuild,
  schema: GraphQLSchema
): TableMeta[] {
  const state = getState(build);
  let tables = state.runtimeTablesBySchema.get(schema);
  if (!tables) {
    tables = collectTablesMeta(build, schema);
    state.runtimeTablesBySchema.set(schema, tables);
    setCachedTablesMeta(tables);
  }
  return tables;
}

export const MetaSchemaPlugin: GraphileConfig.Plugin = {
  name: 'MetaSchemaPlugin',
  version: '1.0.0',
  description: 'Exposes _meta query for database schema introspection',
  schema: {
    hooks: {
      GraphQLObjectType_fields(rawFields, rawBuild, rawContext) {
        const context = rawContext as unknown as QueryTypeContext;
        if (context.Self?.name !== 'Query') return rawFields;
        const build = rawBuild as unknown as MetaBuild;
        return extendQueryWithMetaField(
          rawFields as unknown as Record<string, unknown>,
          (schema) => getRuntimeTablesMeta(build, schema),
        ) as typeof rawFields;
      },

      finalize(schema, rawBuild) {
        const build = rawBuild as unknown as MetaBuild;
        const tables = collectTablesMeta(build, schema);
        setCachedTablesMeta(tables);
        return schema;
      },
    },
  },
};
