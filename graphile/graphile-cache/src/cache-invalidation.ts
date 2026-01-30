import { Logger } from '@pgpmjs/logger';
import type { Pool, PoolClient } from 'pg';

const log = new Logger('cache-invalidation');

/**
 * Channel name for cross-node cache invalidation via PostgreSQL LISTEN/NOTIFY.
 */
const CACHE_INVALIDATE_CHANNEL = 'cache:invalidate';

/**
 * Configuration options for the CacheInvalidationService.
 */
export interface CacheInvalidationConfig {
  /**
   * Enable cross-node cache invalidation via PostgreSQL LISTEN/NOTIFY.
   * When disabled, invalidation only affects the local node.
   * @default true
   */
  enabled?: boolean;

  /**
   * Reconnect delay in milliseconds after a connection error.
   * @default 5000
   */
  reconnectDelayMs?: number;

  /**
   * Custom channel name for NOTIFY messages.
   * @default 'cache:invalidate'
   */
  channel?: string;
}

/**
 * Payload structure for cache invalidation messages.
 */
export interface CacheInvalidationPayload {
  /**
   * The cache key to invalidate.
   */
  key: string;

  /**
   * Optional pattern for matching multiple keys (regex string).
   */
  pattern?: string;

  /**
   * Timestamp when the invalidation was requested.
   */
  timestamp: number;

  /**
   * Unique node identifier to prevent processing our own messages.
   */
  nodeId: string;
}

/**
 * Callback type for cache invalidation handlers.
 */
export type InvalidationHandler = (key: string) => void;

/**
 * Callback type for pattern-based invalidation handlers.
 */
export type PatternInvalidationHandler = (pattern: RegExp) => number;

/**
 * CacheInvalidationService provides cross-node cache invalidation using PostgreSQL LISTEN/NOTIFY.
 *
 * This service allows multiple server instances to coordinate cache invalidation,
 * ensuring that when a cache entry is invalidated on one node, all nodes evict it.
 *
 * Usage:
 * ```typescript
 * const service = new CacheInvalidationService(pgPool, {
 *   enabled: true,
 *   reconnectDelayMs: 5000,
 * });
 *
 * // Register handlers for invalidation events
 * service.onInvalidate((key) => myCache.delete(key));
 * service.onPatternInvalidate((pattern) => myCache.clearMatching(pattern));
 *
 * // Start listening for invalidation events
 * await service.start();
 *
 * // Invalidate a key (broadcasts to all nodes)
 * await service.invalidate('my-cache-key');
 *
 * // Invalidate by pattern
 * await service.invalidatePattern('^user:.*');
 *
 * // Stop the service
 * await service.stop();
 * ```
 */
export class CacheInvalidationService {
  private readonly pool: Pool;
  private readonly config: Required<CacheInvalidationConfig>;
  private readonly nodeId: string;
  private readonly invalidationHandlers: Set<InvalidationHandler> = new Set();
  private readonly patternHandlers: Set<PatternInvalidationHandler> = new Set();

  private client: PoolClient | null = null;
  private release: (() => void) | null = null;
  private isStarted = false;
  private isShuttingDown = false;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * Creates a new CacheInvalidationService.
   *
   * @param pool - PostgreSQL connection pool
   * @param config - Service configuration options
   */
  constructor(pool: Pool, config: CacheInvalidationConfig = {}) {
    this.pool = pool;
    this.config = {
      enabled: config.enabled ?? this.getEnabledFromEnv(),
      reconnectDelayMs: config.reconnectDelayMs ?? 5000,
      channel: config.channel ?? CACHE_INVALIDATE_CHANNEL,
    };

    // Generate unique node identifier using process ID and random string
    this.nodeId = `node-${process.pid}-${Math.random().toString(36).substring(2, 10)}`;
  }

  /**
   * Get the enabled setting from environment variable.
   * Defaults to true if not set.
   */
  private getEnabledFromEnv(): boolean {
    const envValue = process.env.CACHE_INVALIDATION_ENABLED;
    if (envValue === undefined) return true;
    return envValue.toLowerCase() !== 'false' && envValue !== '0';
  }

  /**
   * Register a handler to be called when a cache key should be invalidated.
   *
   * @param handler - Function to call with the cache key to invalidate
   * @returns Unregister function to remove the handler
   */
  onInvalidate(handler: InvalidationHandler): () => void {
    this.invalidationHandlers.add(handler);
    return () => {
      this.invalidationHandlers.delete(handler);
    };
  }

  /**
   * Register a handler to be called when a cache pattern should be invalidated.
   *
   * @param handler - Function to call with the regex pattern to match
   * @returns Unregister function to remove the handler
   */
  onPatternInvalidate(handler: PatternInvalidationHandler): () => void {
    this.patternHandlers.add(handler);
    return () => {
      this.patternHandlers.delete(handler);
    };
  }

  /**
   * Check if the service is currently running.
   */
  get running(): boolean {
    return this.isStarted && !this.isShuttingDown;
  }

  /**
   * Check if cross-node invalidation is enabled.
   */
  get enabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get the unique node identifier for this service instance.
   */
  get id(): string {
    return this.nodeId;
  }

  /**
   * Start the cache invalidation service.
   * Connects to PostgreSQL and begins listening for invalidation messages.
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      log.warn('CacheInvalidationService already started');
      return;
    }

    if (!this.config.enabled) {
      log.info('Cross-node cache invalidation is disabled');
      this.isStarted = true;
      return;
    }

    this.isShuttingDown = false;
    await this.connect();
    this.isStarted = true;
    log.info(`CacheInvalidationService started (nodeId: ${this.nodeId})`);
  }

  /**
   * Connect to PostgreSQL and set up the LISTEN subscription.
   */
  private async connect(): Promise<void> {
    if (this.isShuttingDown) return;

    try {
      const client = await this.pool.connect();
      this.client = client;
      this.release = () => client.release();

      // Set up notification handler
      client.on('notification', this.handleNotification.bind(this));

      // Subscribe to the invalidation channel
      await client.query(`LISTEN "${this.config.channel}"`);
      log.info(`Listening on channel "${this.config.channel}"`);

      // Handle connection errors
      client.on('error', this.handleConnectionError.bind(this));
    } catch (err) {
      log.error('Failed to connect for cache invalidation:', err);
      this.scheduleReconnect();
    }
  }

  /**
   * Handle incoming NOTIFY messages.
   */
  private handleNotification(msg: { channel: string; payload?: string }): void {
    if (msg.channel !== this.config.channel || !msg.payload) {
      return;
    }

    try {
      const payload: CacheInvalidationPayload = JSON.parse(msg.payload);

      // Ignore our own messages
      if (payload.nodeId === this.nodeId) {
        log.debug(`Ignoring own invalidation message for key: ${payload.key}`);
        return;
      }

      log.debug(`Received cache invalidation from ${payload.nodeId}: key=${payload.key}, pattern=${payload.pattern || 'none'}`);

      // Handle pattern-based invalidation
      if (payload.pattern) {
        const regex = new RegExp(payload.pattern);
        this.patternHandlers.forEach((handler) => {
          try {
            const count = handler(regex);
            log.debug(`Pattern handler cleared ${count} entries`);
          } catch (err) {
            log.error('Error in pattern invalidation handler:', err);
          }
        });
      }

      // Handle key-based invalidation
      if (payload.key) {
        this.invalidationHandlers.forEach((handler) => {
          try {
            handler(payload.key);
          } catch (err) {
            log.error('Error in invalidation handler:', err);
          }
        });
      }
    } catch (err) {
      log.error('Failed to parse cache invalidation payload:', err);
    }
  }

  /**
   * Handle connection errors and trigger reconnection.
   */
  private handleConnectionError(err: Error): void {
    if (this.isShuttingDown) {
      if (this.release) {
        this.release();
        this.release = null;
      }
      return;
    }

    log.error('Cache invalidation listener connection error:', err);
    this.cleanup();
    this.scheduleReconnect();
  }

  /**
   * Schedule a reconnection attempt after the configured delay.
   */
  private scheduleReconnect(): void {
    if (this.isShuttingDown || this.reconnectTimeout) return;

    log.info(`Scheduling reconnection in ${this.config.reconnectDelayMs}ms`);
    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = null;
      if (!this.isShuttingDown) {
        await this.connect();
      }
    }, this.config.reconnectDelayMs);
  }

  /**
   * Invalidate a specific cache key across all nodes.
   *
   * @param key - The cache key to invalidate
   */
  async invalidate(key: string): Promise<void> {
    // Always invoke local handlers first
    this.invalidationHandlers.forEach((handler) => {
      try {
        handler(key);
      } catch (err) {
        log.error('Error in local invalidation handler:', err);
      }
    });

    // Broadcast to other nodes if enabled
    if (!this.config.enabled) {
      return;
    }

    const payload: CacheInvalidationPayload = {
      key,
      timestamp: Date.now(),
      nodeId: this.nodeId,
    };

    await this.publish(payload);
  }

  /**
   * Invalidate cache entries matching a pattern across all nodes.
   *
   * @param pattern - Regex pattern string to match cache keys
   */
  async invalidatePattern(pattern: string): Promise<void> {
    // Always invoke local handlers first
    const regex = new RegExp(pattern);
    this.patternHandlers.forEach((handler) => {
      try {
        handler(regex);
      } catch (err) {
        log.error('Error in local pattern invalidation handler:', err);
      }
    });

    // Broadcast to other nodes if enabled
    if (!this.config.enabled) {
      return;
    }

    const payload: CacheInvalidationPayload = {
      key: '',
      pattern,
      timestamp: Date.now(),
      nodeId: this.nodeId,
    };

    await this.publish(payload);
  }

  /**
   * Publish an invalidation message to all nodes via PostgreSQL NOTIFY.
   */
  private async publish(payload: CacheInvalidationPayload): Promise<void> {
    try {
      // Use a separate client for publishing to avoid blocking the listener
      const payloadStr = JSON.stringify(payload);
      // Escape single quotes for SQL
      const escapedPayload = payloadStr.replace(/'/g, "''");
      await this.pool.query(`NOTIFY "${this.config.channel}", '${escapedPayload}'`);
      log.debug(`Published cache invalidation: key=${payload.key}, pattern=${payload.pattern || 'none'}`);
    } catch (err) {
      log.error('Failed to publish cache invalidation:', err);
    }
  }

  /**
   * Clean up the current connection resources.
   */
  private cleanup(): void {
    if (this.client) {
      this.client.removeAllListeners('notification');
      this.client.removeAllListeners('error');
      this.client = null;
    }

    if (this.release) {
      this.release();
      this.release = null;
    }
  }

  /**
   * Stop the cache invalidation service.
   * Unsubscribes from PostgreSQL notifications and releases the connection.
   */
  async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    this.isShuttingDown = true;

    // Clear any pending reconnect
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Unsubscribe from the channel
    if (this.client) {
      try {
        await this.client.query(`UNLISTEN "${this.config.channel}"`);
      } catch {
        // Ignore cleanup errors during shutdown
      }
    }

    this.cleanup();
    this.isStarted = false;
    log.info('CacheInvalidationService stopped');
  }
}

/**
 * Create a cache invalidation service with default configuration.
 * This is a convenience factory function.
 *
 * @param pool - PostgreSQL connection pool
 * @param config - Optional configuration overrides
 * @returns A new CacheInvalidationService instance
 */
export function createCacheInvalidationService(
  pool: Pool,
  config?: CacheInvalidationConfig
): CacheInvalidationService {
  return new CacheInvalidationService(pool, config);
}
