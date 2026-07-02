import fs from 'node:fs';
import { constants as perfConstants, PerformanceObserver } from 'node:perf_hooks';
import v8 from 'node:v8';
import { Logger } from '@pgpmjs/logger';
import { getCacheCounters, getCacheStats } from 'graphile-cache';

import { getBuildQueueDepth, getGraphileCounters } from '../middleware/graphile';
import { getConnectionErrorGuardCounters } from './connection-error-guard';

const log = new Logger('metrics-sampler');

const DEFAULT_INTERVAL_MS = 10_000;
const DEFAULT_METRICS_FILE = './metrics.jsonl';

// =============================================================================
// GC tracking (perf_hooks)
//
// A single process-global PerformanceObserver accumulates GC pause time and counts
// by kind. Registered lazily the first time the sampler starts (so there is zero
// overhead when GRAPHILE_DEBUG_METRICS is off) and torn down when the sampler stops.
// =============================================================================

interface GcKindStat {
  count: number;
  totalPauseMs: number;
}

type GcStats = Record<string, GcKindStat>;

const gcStats: GcStats = {};
let gcObserver: PerformanceObserver | null = null;

// Map perf_hooks GC kind flags to stable, human-readable names for the metrics line.
const GC_KIND_NAMES: Record<number, string> = {
  [perfConstants.NODE_PERFORMANCE_GC_MINOR]: 'minor',
  [perfConstants.NODE_PERFORMANCE_GC_MAJOR]: 'major',
  [perfConstants.NODE_PERFORMANCE_GC_INCREMENTAL]: 'incremental',
  [perfConstants.NODE_PERFORMANCE_GC_WEAKCB]: 'weakcb'
};

const startGcObserver = (): void => {
  if (gcObserver) {
    return;
  }
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // `detail.kind` is the modern accessor; fall back to the deprecated top-level
        // `kind` for older Node. Guard: unknown kinds are bucketed by their numeric flag.
        const kind =
          (entry as { detail?: { kind?: number } }).detail?.kind ??
          (entry as unknown as { kind?: number }).kind;
        const name =
          kind != null && GC_KIND_NAMES[kind] ? GC_KIND_NAMES[kind] : `kind_${kind ?? 'unknown'}`;
        const stat = gcStats[name] ?? (gcStats[name] = { count: 0, totalPauseMs: 0 });
        stat.count += 1;
        stat.totalPauseMs += entry.duration;
      }
    });
    observer.observe({ entryTypes: ['gc'] });
    gcObserver = observer;
  } catch (err) {
    // GC observation is best-effort; a platform without 'gc' entries just omits GC data.
    gcObserver = null;
    log.warn('GC PerformanceObserver unavailable; metrics will omit GC data', err);
  }
};

const stopGcObserver = (): void => {
  if (gcObserver) {
    try {
      gcObserver.disconnect();
    } catch {
      // ignore — teardown is best-effort
    }
    gcObserver = null;
  }
};

const snapshotGcStats = (): GcStats => {
  const out: GcStats = {};
  for (const [name, stat] of Object.entries(gcStats)) {
    out[name] = { count: stat.count, totalPauseMs: stat.totalPauseMs };
  }
  return out;
};

// =============================================================================
// Env parsing
// =============================================================================

const isEnabled = (): boolean => {
  const raw = process.env.GRAPHILE_DEBUG_METRICS;
  if (!raw) {
    return false;
  }
  const normalized = raw.trim().toLowerCase();
  return normalized === '1' || normalized === 'true';
};

const getIntervalMs = (): number => {
  const raw = process.env.GRAPHILE_DEBUG_METRICS_INTERVAL_MS;
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_INTERVAL_MS;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_INTERVAL_MS;
};

const getMetricsFile = (): string =>
  process.env.GRAPHILE_DEBUG_METRICS_FILE || DEFAULT_METRICS_FILE;

// =============================================================================
// Sample
// =============================================================================

export interface MetricsSample {
  ts: string;
  rss: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  heap_size_limit: number;
  cache: {
    size: number;
    keys: number;
  };
  counters: ReturnType<typeof getCacheCounters> &
    ReturnType<typeof getGraphileCounters> & {
      buildQueueDepth: number;
      connGuard: ReturnType<typeof getConnectionErrorGuardCounters>;
    };
  gc: GcStats;
}

/**
 * Collect a single metrics sample. Cheap: a memoryUsage() call, a v8 heap-stats read,
 * cache size/key-count, and integer counter snapshots. Exposed for tests and future
 * promotion to a /metrics endpoint.
 */
export const collectMetricsSample = (): MetricsSample => {
  const mem = process.memoryUsage();
  const cacheStats = getCacheStats();
  return {
    ts: new Date().toISOString(),
    rss: mem.rss,
    heapUsed: mem.heapUsed,
    heapTotal: mem.heapTotal,
    external: mem.external,
    heap_size_limit: v8.getHeapStatistics().heap_size_limit,
    cache: {
      size: cacheStats.size,
      keys: cacheStats.keys.length
    },
    counters: {
      ...getCacheCounters(),
      ...getGraphileCounters(),
      buildQueueDepth: getBuildQueueDepth(),
      connGuard: getConnectionErrorGuardCounters()
    },
    gc: snapshotGcStats()
  };
};

// =============================================================================
// Sampler
// =============================================================================

export interface MetricsSamplerHandle {
  stop(): void;
}

/**
 * Start the in-process metrics sampler.
 *
 * When GRAPHILE_DEBUG_METRICS is '1' or 'true', appends one JSON line per
 * GRAPHILE_DEBUG_METRICS_INTERVAL_MS (default 10000ms) to GRAPHILE_DEBUG_METRICS_FILE
 * (default ./metrics.jsonl). The interval timer is unref'd so it never keeps the
 * process alive, and file writes swallow errors so metrics can never affect the server.
 *
 * Returns null (a true no-op, zero overhead) when disabled.
 */
export const startMetricsSampler = (): MetricsSamplerHandle | null => {
  if (!isEnabled()) {
    return null;
  }

  startGcObserver();

  const intervalMs = getIntervalMs();
  const file = getMetricsFile();

  const writeSample = (): void => {
    const line = `${JSON.stringify(collectMetricsSample())}\n`;
    // Fire-and-forget; a failed metrics write must never impact request handling.
    fs.appendFile(file, line, () => {
      // swallow errors
    });
  };

  // Emit an immediate baseline sample so the file has a line without waiting a full
  // interval, then sample periodically.
  writeSample();

  const timer = setInterval(writeSample, intervalMs);
  timer.unref();

  log.info(`Metrics sampler writing every ${intervalMs}ms to ${file}`);

  return {
    stop(): void {
      clearInterval(timer);
      stopGcObserver();
    }
  };
};
