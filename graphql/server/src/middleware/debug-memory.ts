import { getNodeEnv } from '@constructive-io/graphql-env';
import { Logger } from '@pgpmjs/logger';
import { svcCache } from '@pgpmjs/server-utils';
import type { RequestHandler } from 'express';
import { getCacheStats } from 'graphile-cache';
import { getInFlightCount, getInFlightKeys } from './graphile';

const log = new Logger('debug-memory');

const toMB = (bytes: number): string => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/**
 * Development-only debug endpoint for monitoring memory usage and cache state.
 *
 * Mounts GET /debug/memory which returns:
 * - Node.js process memory (heap, RSS, external, array buffers)
 * - Graphile cache stats (size, max, TTL, keys with ages)
 * - Service cache size
 * - In-flight handler creation count
 * - Process uptime
 *
 * This endpoint is only available when NODE_ENV=development.
 * In production, it returns 404.
 */
export const debugMemory: RequestHandler = (_req, res) => {
  if (getNodeEnv() !== 'development') {
    res.status(404).send('Not found');
    return;
  }

  const mem = process.memoryUsage();
  const cacheStats = getCacheStats();

  const response = {
    memory: {
      heapUsed: toMB(mem.heapUsed),
      heapTotal: toMB(mem.heapTotal),
      rss: toMB(mem.rss),
      external: toMB(mem.external),
      arrayBuffers: toMB(mem.arrayBuffers),
    },
    graphileCache: {
      size: cacheStats.size,
      max: cacheStats.max,
      ttl: `${(cacheStats.ttl / 1000 / 60).toFixed(0)} min`,
      keys: cacheStats.keys,
    },
    svcCache: {
      size: svcCache.size,
    },
    inFlight: {
      count: getInFlightCount(),
      keys: getInFlightKeys(),
    },
    uptime: `${(process.uptime() / 60).toFixed(1)} min`,
    timestamp: new Date().toISOString(),
  };

  log.debug('Memory snapshot:', response);
  res.json(response);
};
