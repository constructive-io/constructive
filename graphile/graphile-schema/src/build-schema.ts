import { printSchema } from 'graphql'
import { ConstructivePreset, makePgService } from 'graphile-settings'
import { makeSchema } from 'graphile-build'
import { getPgPool } from 'pg-cache'
import { getPgEnvOptions } from 'pg-env'
import type { GraphileConfig } from 'graphile-config'

export type BuildSchemaOptions = {
  database?: string;
  schemas: string[];
  graphile?: Partial<GraphileConfig.Preset>;
};

export async function buildSchemaSDL(opts: BuildSchemaOptions): Promise<string> {
  const database = opts.database ?? 'constructive'
  const schemas = Array.isArray(opts.schemas) ? opts.schemas : []

  const config = getPgEnvOptions({ database })

  // Create the pool through pg-cache so it is tracked and can be cleaned up
  // by callers via pgCache.delete(database) before dropping ephemeral databases.
  // Without this, makePgService creates its own internal pool that isn't released,
  // causing "database has active sessions" errors during ephemeral DB teardown.
  const pool = getPgPool(config)

  // Compose presets using Graphile's native `extends` mechanism instead of
  // deepmerge.  deepmerge recursively clones every nested object — including
  // the pg Pool (EventEmitter internals) and the entire PostGraphile preset
  // tree — which overflows the call stack.
  const preset: GraphileConfig.Preset = {
    extends: [
      ConstructivePreset,
      ...(opts.graphile?.extends ?? []),
    ],
    plugins: opts.graphile?.plugins ?? [],
    pgServices: [
      makePgService({
        pool,
        schemas,
      }),
    ],
  }

  const { schema } = await makeSchema(preset)
  return printSchema(schema)
}
