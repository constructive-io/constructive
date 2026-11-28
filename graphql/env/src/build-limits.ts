import type { GraphileBuildLimits } from '@constructive-io/graphql-types';
import { parseEnvNumber } from '12factor-env';

type BuildLimitKey = keyof GraphileBuildLimits;

interface Bound {
  min: number;
  /** Inclusive upper bound; absent means any safe integer. */
  max?: number;
  env: string;
}

const BOUNDS: Record<BuildLimitKey, Bound> = {
  concurrency: { min: 1, env: 'GRAPHILE_BUILD_CONCURRENCY' },
  queueMax: { min: 0, env: 'GRAPHILE_BUILD_QUEUE_MAX' },
  // setTimeout fires at once for longer delays, so a larger wait never waits.
  queueWaitMs: { min: 0, max: 2_147_483_647, env: 'GRAPHILE_BUILD_QUEUE_WAIT_MS' }
};

const KEYS = Object.keys(BOUNDS) as BuildLimitKey[];

const assertBuildLimit = (key: BuildLimitKey, value: unknown, label: string): number => {
  const { min, max } = BOUNDS[key];
  if (
    !Number.isSafeInteger(value) ||
    (value as number) < min ||
    (max !== undefined && (value as number) > max)
  ) {
    throw new Error(
      max === undefined
        ? `${label} must be a safe integer of at least ${min}`
        : `${label} must be an integer from ${min} to ${max}`
    );
  }
  return value as number;
};

/** Build limits set through `GRAPHILE_BUILD_*`; absent when none is set. */
export const getBuildLimitsEnv = (
  env: NodeJS.ProcessEnv
): GraphileBuildLimits | undefined => {
  const limits: GraphileBuildLimits = {};
  for (const key of KEYS) {
    const { env: name } = BOUNDS[key];
    const raw = env[name];
    if (raw !== undefined) limits[key] = assertBuildLimit(key, parseEnvNumber(raw), name);
  }
  return Object.keys(limits).length > 0 ? limits : undefined;
};

/** Validate every configuration source before the bounds reach the server. */
export const normalizeGraphileBuildLimits = (
  limits: GraphileBuildLimits | undefined
): Readonly<GraphileBuildLimits> | undefined => {
  if (limits === undefined) return undefined;
  if (typeof limits !== 'object' || limits === null || Array.isArray(limits)) {
    throw new Error('graphile.buildLimits must be an object');
  }
  for (const key of Object.keys(limits)) {
    if (!(KEYS as string[]).includes(key)) {
      throw new Error(`graphile.buildLimits contains unsupported setting '${key}'`);
    }
  }
  const normalized: GraphileBuildLimits = {};
  for (const key of KEYS) {
    const value = limits[key];
    if (value !== undefined) {
      normalized[key] = assertBuildLimit(key, value, `graphile.buildLimits.${key}`);
    }
  }
  return Object.freeze(normalized);
};
