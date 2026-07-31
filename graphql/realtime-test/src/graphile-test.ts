import type { RealtimeTestContext,RealtimeTestInput } from 'graphile-realtime-test';
import { createRealtimeTestContext } from 'graphile-realtime-test';
import { ConstructivePreset } from 'graphile-settings';
import type { SeedAdapter } from 'pgsql-test/seed/types';

/**
 * Creates a realtime test context using the full ConstructivePreset.
 *
 * This is the Constructive-specific wrapper that pre-loads all plugins
 * from graphile-settings (auth, RLS, storage, search, etc.) into the
 * realtime subscription schema. For generic realtime testing without
 * the Constructive preset, use graphile-realtime-test directly.
 *
 * Mirrors the pattern of `@constructive-io/graphql-test`'s `GraphQLTest`
 * wrapping `graphile-test`.
 */
export async function createConstructiveRealtimeTestContext(
  input: RealtimeTestInput,
  seedAdapters?: SeedAdapter[],
): Promise<RealtimeTestContext> {
  const mergedInput: RealtimeTestInput = {
    ...input,
    preset: {
      extends: [
        ConstructivePreset,
        ...(input.preset?.extends ?? []),
      ],
      ...(input.preset?.disablePlugins && { disablePlugins: input.preset.disablePlugins }),
      ...(input.preset?.plugins && { plugins: input.preset.plugins }),
      ...(input.preset?.schema && { schema: input.preset.schema }),
      ...(input.preset?.grafast && { grafast: input.preset.grafast }),
    },
  };

  return createRealtimeTestContext(mergedInput, seedAdapters);
}
