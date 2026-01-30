/**
 * Prometheus Metrics Middleware
 *
 * Exposes Prometheus-format metrics for the GraphQL server including:
 * - Cache hit/miss counters
 * - Cache size gauge
 * - In-flight creations gauge
 * - Instance creation latency histogram
 * - Eviction counters by reason
 * - Request counters by status
 * - DB connection pool metrics (total, idle, waiting, active)
 *
 * Metrics endpoint: GET /metrics
 */

import { Request, Response, NextFunction, RequestHandler, Router } from 'express';
import { Registry, Counter, Gauge, Histogram, collectDefaultMetrics } from 'prom-client';
import { graphileCache, getCacheStats, cacheEvents, EvictionReason } from 'graphile-cache';
import { pgCache } from 'pg-cache';
import { getInFlightCount } from './graphile';

// Create a custom registry for our metrics
const register = new Registry();

// Collect default Node.js metrics (CPU, memory, event loop, etc.)
collectDefaultMetrics({ register, prefix: 'graphile_nodejs_' });

// --- Counter: Cache Hits ---
export const cacheHitsCounter = new Counter({
  name: 'graphile_cache_hits_total',
  help: 'Total number of cache hits for GraphQL instances',
  registers: [register],
});

// --- Counter: Cache Misses ---
export const cacheMissesCounter = new Counter({
  name: 'graphile_cache_misses_total',
  help: 'Total number of cache misses for GraphQL instances',
  registers: [register],
});

// --- Gauge: Cache Size ---
export const cacheSizeGauge = new Gauge({
  name: 'graphile_cache_size',
  help: 'Current number of cached GraphQL instances',
  registers: [register],
  collect() {
    // Update gauge value when metrics are collected
    this.set(graphileCache.size);
  },
});

// --- Gauge: Cache Max Size ---
export const cacheMaxSizeGauge = new Gauge({
  name: 'graphile_cache_max_size',
  help: 'Maximum configured cache size',
  registers: [register],
  collect() {
    const stats = getCacheStats();
    this.set(stats.max);
  },
});

// --- Gauge: In-flight Creations ---
export const inFlightCreationsGauge = new Gauge({
  name: 'graphile_in_flight_creations',
  help: 'Number of GraphQL instances currently being created',
  registers: [register],
  collect() {
    // Update gauge value when metrics are collected
    this.set(getInFlightCount());
  },
});

// --- Histogram: Instance Creation Duration ---
export const instanceCreationDuration = new Histogram({
  name: 'graphile_instance_creation_duration_seconds',
  help: 'Duration of GraphQL instance creation in seconds',
  registers: [register],
  buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30], // buckets in seconds
});

// --- Counter: Evictions by Reason ---
export const evictionsCounter = new Counter({
  name: 'graphile_evictions_total',
  help: 'Total number of cache evictions by reason',
  labelNames: ['reason'] as const,
  registers: [register],
});

// --- Counter: Requests by Status ---
export const requestsCounter = new Counter({
  name: 'graphile_requests_total',
  help: 'Total number of requests by status',
  labelNames: ['status'] as const,
  registers: [register],
});

// --- Histogram: Request Duration ---
export const requestDuration = new Histogram({
  name: 'graphile_request_duration_seconds',
  help: 'Duration of requests in seconds',
  labelNames: ['status'] as const,
  registers: [register],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

// --- Gauge: DB Pool Total Count ---
export const dbPoolTotalCountGauge = new Gauge({
  name: 'graphile_db_pool_total_count',
  help: 'Total number of connections in the database connection pool',
  registers: [register],
  collect() {
    const stats = pgCache.getPoolStats();
    this.set(stats.totalCount);
  },
});

// --- Gauge: DB Pool Idle Count ---
export const dbPoolIdleCountGauge = new Gauge({
  name: 'graphile_db_pool_idle_count',
  help: 'Number of idle connections available in the database connection pool',
  registers: [register],
  collect() {
    const stats = pgCache.getPoolStats();
    this.set(stats.idleCount);
  },
});

// --- Gauge: DB Pool Waiting Count ---
export const dbPoolWaitingCountGauge = new Gauge({
  name: 'graphile_db_pool_waiting_count',
  help: 'Number of clients waiting for a database connection',
  registers: [register],
  collect() {
    const stats = pgCache.getPoolStats();
    this.set(stats.waitingCount);
  },
});

// --- Gauge: DB Pool Active Count ---
export const dbPoolActiveCountGauge = new Gauge({
  name: 'graphile_db_pool_active_count',
  help: 'Number of active connections currently in use',
  registers: [register],
  collect() {
    const stats = pgCache.getPoolStats();
    this.set(stats.activeCount);
  },
});

/**
 * Metrics helper functions for use in other middleware
 */
export const metrics = {
  /**
   * Record a cache hit
   */
  recordCacheHit(): void {
    cacheHitsCounter.inc();
  },

  /**
   * Record a cache miss
   */
  recordCacheMiss(): void {
    cacheMissesCounter.inc();
  },

  /**
   * Record instance creation duration
   * @param durationSeconds - Duration in seconds
   */
  recordCreationDuration(durationSeconds: number): void {
    instanceCreationDuration.observe(durationSeconds);
  },

  /**
   * Start a timer for instance creation
   * @returns Function to call when creation completes
   */
  startCreationTimer(): () => number {
    return instanceCreationDuration.startTimer();
  },

  /**
   * Record an eviction
   * @param reason - The reason for eviction: 'lru', 'ttl', or 'manual'
   */
  recordEviction(reason: 'lru' | 'ttl' | 'manual'): void {
    evictionsCounter.inc({ reason });
  },

  /**
   * Record a request
   * @param status - The status: 'success' or 'error'
   */
  recordRequest(status: 'success' | 'error'): void {
    requestsCounter.inc({ status });
  },

  /**
   * Start a timer for request duration
   * @param labels - Labels for the histogram
   * @returns Function to call when request completes
   */
  startRequestTimer(): (labels?: { status: 'success' | 'error' }) => number {
    return requestDuration.startTimer();
  },
};

/**
 * Express router for the /metrics endpoint
 */
export function metricsRouter(): Router {
  const router = Router();

  router.get('/metrics', async (_req: Request, res: Response) => {
    try {
      res.set('Content-Type', register.contentType);
      const metricsOutput = await register.metrics();
      res.end(metricsOutput);
    } catch (err) {
      res.status(500).end(err instanceof Error ? err.message : 'Error collecting metrics');
    }
  });

  return router;
}

/**
 * Middleware to track request metrics.
 * Should be placed early in the middleware chain.
 */
export function requestMetricsMiddleware(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip metrics for the /metrics endpoint itself
    if (req.path === '/metrics') {
      return next();
    }

    const stopTimer = metrics.startRequestTimer();

    res.on('finish', () => {
      const status: 'success' | 'error' = res.statusCode >= 400 ? 'error' : 'success';
      stopTimer({ status });
      metrics.recordRequest(status);
    });

    next();
  };
}

/**
 * Get the Prometheus registry for custom metric operations
 */
export function getRegistry(): Registry {
  return register;
}

/**
 * Reset all metrics (useful for testing)
 */
export async function resetMetrics(): Promise<void> {
  register.resetMetrics();
}

// Track if event listeners have been initialized
let eventListenersInitialized = false;

/**
 * Initialize event listeners for cache eviction metrics.
 * This should be called once during server startup.
 */
export function initMetricsEventListeners(): void {
  if (eventListenersInitialized) {
    return;
  }
  eventListenersInitialized = true;

  // Listen for cache eviction events and record metrics
  cacheEvents.on('eviction', (_key: string, reason: EvictionReason) => {
    metrics.recordEviction(reason);
  });
}

export default metricsRouter;
