import os from 'node:os';
import v8 from 'node:v8';
import { svcCache, SVC_CACHE_TTL_MS } from '@pgpmjs/server-utils';
import { getCacheStats } from 'graphile-cache';
import { getInFlightCount, getInFlightKeys } from '../middleware/graphile';
import { getGraphileBuildStats } from '../middleware/observability/graphile-build-stats';

const toMB = (bytes: number): string => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export interface DebugMemorySnapshot {
  pid: number;
  nodeEnv: string | undefined;
  memory: {
    heapUsedBytes: number;
    heapTotalBytes: number;
    rssBytes: number;
    externalBytes: number;
    arrayBuffersBytes: number;
    heapUsed: string;
    heapTotal: string;
    rss: string;
    external: string;
    arrayBuffers: string;
  };
  cpuUsageMicros: NodeJS.CpuUsage;
  resourceUsage: NodeJS.ResourceUsage;
  system: {
    loadAverage: number[];
    freeMemoryBytes: number;
    totalMemoryBytes: number;
    uptimeSeconds: number;
  };
  v8: {
    heapStatistics: ReturnType<typeof v8.getHeapStatistics>;
    heapSpaces: Array<{
      spaceName: string;
      spaceSizeBytes: number;
      spaceUsedBytes: number;
      spaceAvailableBytes: number;
      physicalSpaceSizeBytes: number;
    }>;
  };
  graphileCache: ReturnType<typeof getCacheStats>;
  svcCache: {
    size: number;
    max: number;
    ttlMs: number;
    oldestKeyAgeMs: number | null;
    keys: string[];
  };
  inFlight: {
    count: number;
    keys: string[];
  };
  graphileBuilds: ReturnType<typeof getGraphileBuildStats>;
  uptimeMinutes: number;
  timestamp: string;
}

export const getDebugMemorySnapshot = (): DebugMemorySnapshot => {
  const mem = process.memoryUsage();
  const heapSpaces = v8.getHeapSpaceStatistics().map((space) => ({
    spaceName: space.space_name,
    spaceSizeBytes: space.space_size,
    spaceUsedBytes: space.space_used_size,
    spaceAvailableBytes: space.space_available_size,
    physicalSpaceSizeBytes: space.physical_space_size,
  }));

  return {
    pid: process.pid,
    nodeEnv: process.env.NODE_ENV,
    memory: {
      heapUsedBytes: mem.heapUsed,
      heapTotalBytes: mem.heapTotal,
      rssBytes: mem.rss,
      externalBytes: mem.external,
      arrayBuffersBytes: mem.arrayBuffers,
      heapUsed: toMB(mem.heapUsed),
      heapTotal: toMB(mem.heapTotal),
      rss: toMB(mem.rss),
      external: toMB(mem.external),
      arrayBuffers: toMB(mem.arrayBuffers),
    },
    cpuUsageMicros: process.cpuUsage(),
    resourceUsage: process.resourceUsage(),
    system: {
      loadAverage: os.loadavg(),
      freeMemoryBytes: os.freemem(),
      totalMemoryBytes: os.totalmem(),
      uptimeSeconds: os.uptime(),
    },
    v8: {
      heapStatistics: v8.getHeapStatistics(),
      heapSpaces,
    },
    graphileCache: getCacheStats(),
    svcCache: {
      size: svcCache.size,
      max: svcCache.max,
      ttlMs: SVC_CACHE_TTL_MS,
      // Note: with updateAgeOnGet: true, this is "time since last access" not "time since creation"
      oldestKeyAgeMs: (() => {
        let minRemaining = Infinity;
        for (const key of svcCache.keys()) {
          const remaining = svcCache.getRemainingTTL(key);
          if (remaining < minRemaining) {
            minRemaining = remaining;
          }
        }
        return Number.isFinite(minRemaining) ? SVC_CACHE_TTL_MS - minRemaining : null;
      })(),
      keys: [...svcCache.keys()].slice(0, 200),
    },
    inFlight: {
      count: getInFlightCount(),
      keys: getInFlightKeys(),
    },
    graphileBuilds: getGraphileBuildStats(),
    uptimeMinutes: process.uptime() / 60,
    timestamp: new Date().toISOString(),
  };
};
