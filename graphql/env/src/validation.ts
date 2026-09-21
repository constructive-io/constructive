import { cleanEnv, EnvError, int } from '12factor-env';

import type { ConstructiveOptions } from '@constructive-io/graphql-types';

/**
 * Parse an explicitly set Graphile integer with the shared 12factor-env
 * integer validator. A blank string is normally treated like an unset env var,
 * but here it is an explicit configuration error.
 */
export const parseGraphileInteger = (
  name: string,
  value: string | undefined,
  min: number,
  max: number = Number.MAX_SAFE_INTEGER
): number | undefined => {
  if (value === undefined) return undefined;
  if (value.trim() === '') {
    throw new EnvError(`Missing or invalid environment variables:\n  ${name}: Expected an integer, got a blank value`);
  }

  const parsed = cleanEnv(
    { [name]: value },
    { [name]: int({ min, max }) }
  ) as Record<string, number>;
  return parsed[name];
};

const assertSafeInteger = (
  value: unknown,
  name: string,
  minimum: number,
  maximum: number = Number.MAX_SAFE_INTEGER
): void => {
  if (value === undefined) return;
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    const bound = minimum === 0 ? 'a nonnegative' : 'a positive';
    throw new EnvError(
      `Invalid ${name}: expected ${bound} safe integer no greater than ${maximum}`
    );
  }
};

const requireOptionsObject = (
  rawOptions: unknown,
  name: string
): Record<string, unknown> | undefined => {
  if (rawOptions === undefined) return undefined;
  if (rawOptions === null || typeof rawOptions !== 'object' || Array.isArray(rawOptions)) {
    throw new EnvError(`Invalid ${name}: expected an object`);
  }
  return rawOptions as Record<string, unknown>;
};

/** Validate final merged Graphile cache and build options. */
export const validateGraphileOptions = (options: ConstructiveOptions): void => {
  const graphile = options.graphile as unknown;
  if (graphile === null || typeof graphile !== 'object' || Array.isArray(graphile)) return;

  const graphileRecord = graphile as Record<string, unknown>;
  const cache = requireOptionsObject(graphileRecord.cache, 'graphile.cache');
  if (cache) {
    assertSafeInteger(cache.max, 'graphile.cache.max', 1);
    assertSafeInteger(cache.heapMaxBytes, 'graphile.cache.heapMaxBytes', 1);
    assertSafeInteger(cache.buildReserveBytes, 'graphile.cache.buildReserveBytes', 0);

    if (
      cache.heapMaxBytes !== undefined &&
      cache.buildReserveBytes !== undefined &&
      (cache.buildReserveBytes as number) >= (cache.heapMaxBytes as number)
    ) {
      throw new EnvError(
        'Invalid graphile.cache.buildReserveBytes: must be smaller than graphile.cache.heapMaxBytes'
      );
    }
  }

  const build = requireOptionsObject(graphileRecord.build, 'graphile.build');
  if (build) {
    assertSafeInteger(build.queueMax, 'graphile.build.queueMax', 0);
    assertSafeInteger(build.watchdogMs, 'graphile.build.watchdogMs', 1, 2_147_483_647);
    assertSafeInteger(
      build.shutdownTimeoutMs,
      'graphile.build.shutdownTimeoutMs',
      1,
      2_147_483_647
    );
  }
};
