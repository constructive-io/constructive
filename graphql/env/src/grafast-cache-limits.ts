import type { GrafastCacheLimits } from '@constructive-io/graphql-types';
import { parseEnvNumber } from '12factor-env';

const LIMIT_KEYS = [
  'queryCacheMaxLength',
  'operationsCacheMaxLength',
  'operationOperationPlansCacheMaxLength',
] as const;

const assertGrafastCacheLimit = (value: unknown, label: string): number => {
  if (!Number.isSafeInteger(value) || (value as number) < 2) {
    throw new Error(`${label} must be a safe integer of at least 2`);
  }
  return value as number;
};

export const parseGrafastCacheLimitEnv = (
  value: string | undefined,
  envName: string
): number | undefined => {
  if (value === undefined) return undefined;
  return assertGrafastCacheLimit(parseEnvNumber(value), envName);
};

/** Validate every configuration source before cache bounds reach Grafast. */
export const normalizeGrafastCacheLimits = (
  limits: GrafastCacheLimits | undefined
): Readonly<GrafastCacheLimits> | undefined => {
  if (limits === undefined) return undefined;
  if (typeof limits !== 'object' || limits === null || Array.isArray(limits)) {
    throw new Error('graphile.grafastCache must be an object');
  }

  const allowedKeys = new Set<string>(LIMIT_KEYS);
  for (const key of Object.keys(limits)) {
    if (!allowedKeys.has(key)) {
      throw new Error(
        `graphile.grafastCache contains unsupported setting '${key}'`
      );
    }
  }

  const normalized: GrafastCacheLimits = {};
  for (const key of LIMIT_KEYS) {
    const value = limits[key];
    if (value !== undefined) {
      normalized[key] = assertGrafastCacheLimit(
        value,
        `graphile.grafastCache.${key}`
      );
    }
  }
  return Object.freeze(normalized);
};
