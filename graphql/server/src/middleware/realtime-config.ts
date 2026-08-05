import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import { DEFAULT_GRAPHILE_REALTIME_SCHEMA } from 'graphile-cache';

/** Resolve the exact cursor-function schema for one enabled Graphile surface. */
export const resolveGraphileRealtimeSchema = (
  opts: ConstructiveOptions,
  enableRealtime: boolean
): string | null => {
  if (!enableRealtime) return null;
  const configured = opts.graphile?.realtimeSchema;
  if (configured === undefined) return DEFAULT_GRAPHILE_REALTIME_SCHEMA;
  if (typeof configured !== 'string' || configured.length === 0) {
    throw new Error('graphile.realtimeSchema must be one non-empty exact schema name');
  }
  return configured;
};

/** Approve the cursor schema for runtime-role safety without exposing it. */
export const addRealtimeRuntimeDependencySchema = (
  dependencySchemas: readonly string[],
  realtimeSchema: string | null
): string[] => [
  ...new Set([
    ...dependencySchemas,
    ...(realtimeSchema ? [realtimeSchema] : [])
  ])
];
