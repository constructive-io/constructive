import deepmerge from 'deepmerge';
import { makeSchema } from 'graphile-build';
import type { GraphileConfig } from 'graphile-config';
import type { TableMeta } from 'graphile-settings';
import { ConstructivePreset, getTablesMetaForSchema, makePgService } from 'graphile-settings';
import { graphql, lexicographicSortSchema, printSchema } from 'graphql';
import type { Pool } from 'pg';
import { getPgPool } from 'pg-cache';
import { getPgEnvOptions } from 'pg-env';

export type BuildSchemaOptions = {
  database?: string;
  schemas: string[];
  graphile?: Partial<GraphileConfig.Preset>;
  /** Operation-owned pool. When present, schema building never reads ambient PG state. */
  pool?: Pool;
  /**
   * @internal Test-only. Awaited after the schema's `_meta` metadata has been
   * collected and before artifacts are returned, so regression tests can
   * deterministically interleave concurrent builds.
   */
  _onMetaCollected?: () => Promise<void>;
};

export type BuildSchemaArtifacts = {
  /** SDL printed from the final executable schema. */
  sdl: string;
  /**
   * `_meta` table metadata belonging to the same `GraphQLSchema` the SDL was
   * printed from. Empty when the meta plugin is disabled (no `_meta` field).
   */
  tablesMeta: TableMeta[];
};

/**
 * Build the GraphQL schema for a database and return its SDL together with
 * the `_meta` table metadata from one correlated build boundary. Both values
 * are derived from the same final executable `GraphQLSchema` instance, so
 * concurrent builds in one process can never cross-contaminate results.
 */
export async function buildSchemaArtifacts(opts: BuildSchemaOptions): Promise<BuildSchemaArtifacts> {
  const database = opts.database ?? 'constructive';
  const schemas = Array.isArray(opts.schemas) ? opts.schemas : [];

  const config = getPgEnvOptions({ database });

  // Create the pool through pg-cache so it is tracked and can be cleaned up
  // by callers via pgCache.delete(database) before dropping ephemeral databases.
  // Without this, makePgService creates its own internal pool that isn't released,
  // causing "database has active sessions" errors during ephemeral DB teardown.
  const pool = opts.pool ?? getPgPool(config);

  // Hybrid preset composition: use deepmerge for safe scalar/object keys
  // (plugins, disablePlugins, schema, gather, etc.) but pluck out `extends`
  // and `pgServices` to compose them via Graphile's native mechanism.
  // deepmerge cannot deep-clone `extends` (contains the entire PostGraphile
  // preset tree) or `pgServices` (contains pg Pool / EventEmitter internals)
  // without overflowing the call stack.
  const callerExtends = opts.graphile?.extends;
  const callerRest = Object.fromEntries(
    Object.entries(opts.graphile ?? {}).filter(
      ([key]) => key !== 'extends' && key !== 'pgServices'
    )
  ) as GraphileConfig.Preset;

  const baseRest: GraphileConfig.Preset = {};

  const preset: GraphileConfig.Preset = {
    ...deepmerge(baseRest, callerRest),
    extends: [
      ConstructivePreset,
      ...(callerExtends ?? []),
    ],
    pgServices: [
      makePgService({
        pool,
        schemas,
      }),
    ],
  };

  const { schema } = await makeSchema(preset);

  // MetaSchemaPlugin validates executable names lazily against the schema that
  // will actually be executed. Trigger that resolver after every finalizer has
  // run, then read the metadata memoized for this exact GraphQLSchema instance.
  let tablesMeta: TableMeta[] = [];
  if (schema.getQueryType()?.getFields()._meta) {
    const result = await graphql({
      schema,
      source: '{ _meta { tables { name } } }',
    });
    if (result.errors?.length) {
      throw new AggregateError(result.errors, 'Failed to build schema metadata');
    }
    tablesMeta = getTablesMetaForSchema(schema) ?? [];
  }

  if (opts._onMetaCollected) {
    await opts._onMetaCollected();
  }

  return {
    sdl: printSchema(lexicographicSortSchema(schema)),
    tablesMeta
  };
}

export async function buildSchemaSDL(opts: BuildSchemaOptions): Promise<string> {
  return (await buildSchemaArtifacts(opts)).sdl;
}
