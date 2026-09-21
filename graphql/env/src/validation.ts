import { cleanEnv, EnvError, int } from '12factor-env';

import type { ConstructiveOptions, GraphileCacheOptions } from '@constructive-io/graphql-types';

/**
 * Parse an explicitly set Graphile cache integer with the shared 12factor-env
 * integer validator. A blank string is normally treated like an unset env var,
 * but here it is an explicit configuration error.
 */
export const parseGraphileCacheInteger = (
  name: string,
  value: string | undefined,
  min: number
): number | undefined => {
  if (value === undefined) return undefined;
  if (value.trim() === '') {
    throw new EnvError(`Missing or invalid environment variables:\n  ${name}: Expected an integer, got a blank value`);
  }

  const parsed = cleanEnv(
    { [name]: value },
    { [name]: int({ min, max: Number.MAX_SAFE_INTEGER }) }
  ) as Record<string, number>;
  return parsed[name];
};

const assertSafeInteger = (
  cache: GraphileCacheOptions,
  field: keyof GraphileCacheOptions,
  minimum: number
): void => {
  const value = cache[field];
  if (value === undefined) return;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) {
    const bound = minimum === 0 ? 'a nonnegative' : 'a positive';
    throw new EnvError(`Invalid graphile.cache.${field}: expected ${bound} safe integer`);
  }
};

/** Validate the final merged file, environment, and runtime cache options. */
export const validateGraphileCacheOptions = (options: ConstructiveOptions): void => {
  const graphile = options.graphile as unknown;
  if (graphile === null || typeof graphile !== 'object' || Array.isArray(graphile)) return;

  const graphileRecord = graphile as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(graphileRecord, 'cache')) return;

  const rawCache = graphileRecord.cache;
  if (rawCache === undefined) return;
  if (rawCache === null || typeof rawCache !== 'object' || Array.isArray(rawCache)) {
    throw new EnvError('Invalid graphile.cache: expected an object');
  }

  const cache = rawCache as GraphileCacheOptions;
  assertSafeInteger(cache, 'max', 1);
  assertSafeInteger(cache, 'heapMaxBytes', 1);
  assertSafeInteger(cache, 'buildReserveBytes', 0);

  if (
    cache.heapMaxBytes !== undefined &&
    cache.buildReserveBytes !== undefined &&
    cache.buildReserveBytes >= cache.heapMaxBytes
  ) {
    throw new EnvError(
      'Invalid graphile.cache.buildReserveBytes: must be smaller than graphile.cache.heapMaxBytes'
    );
  }
};
