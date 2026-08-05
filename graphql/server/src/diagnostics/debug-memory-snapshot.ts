import os from 'node:os';
import v8 from 'node:v8';

import { getSvcCacheStats } from '@pgpmjs/server-utils';
import { getCacheCounters, getCacheStats } from 'graphile-cache';
import { getPgCacheStats, getPgCheckoutSanitizerStats } from 'pg-cache';

import { getInFlightCount, getInFlightKeys } from '../middleware/graphile';
import { getGraphileGovernorCounters } from '../middleware/graphile-build-governor';
import { getGraphileBuildStats } from '../middleware/observability/graphile-build-stats';
import { getRuntimeRoleSafetyStats } from '../middleware/runtime-role-safety';

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
  graphileCacheCounters: ReturnType<typeof getCacheCounters>;
  graphileGovernor: ReturnType<typeof getGraphileGovernorCounters>;
  pgCache: ReturnType<typeof getPgCacheStats>;
  pgCheckoutSanitizer: ReturnType<typeof getPgCheckoutSanitizerStats>;
  runtimeRoleSafety: ReturnType<typeof getRuntimeRoleSafetyStats>;
  svcCache: ReturnType<typeof getSvcCacheStats>;
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
    graphileCacheCounters: getCacheCounters(),
    graphileGovernor: getGraphileGovernorCounters(),
    pgCache: getPgCacheStats(),
    pgCheckoutSanitizer: getPgCheckoutSanitizerStats(),
    runtimeRoleSafety: getRuntimeRoleSafetyStats(),
    svcCache: getSvcCacheStats(),
    inFlight: {
      count: getInFlightCount(),
      keys: getInFlightKeys(),
    },
    graphileBuilds: getGraphileBuildStats(),
    uptimeMinutes: process.uptime() / 60,
    timestamp: new Date().toISOString(),
  };
};
