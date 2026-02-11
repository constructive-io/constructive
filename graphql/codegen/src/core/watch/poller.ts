/**
 * Schema polling logic with EventEmitter pattern
 *
 * Uses in-memory hash comparison for efficiency.
 * No file I/O during normal polling - only touchFile is optional file write.
 */

import { EventEmitter } from 'node:events';

import type { IntrospectionQueryResponse } from '../../types/introspection';
import { fetchSchema } from '../introspect/fetch-schema';
import { SchemaCache, touchFile } from './cache';
import { hashObject } from './hash';
import type {
  PollEvent,
  PollEventType,
  PollResult,
  WatchOptions,
} from './types';

/**
 * Schema poller that periodically introspects a GraphQL endpoint
 * and emits events when the schema changes.
 *
 * Uses in-memory caching for hash comparison - no file I/O overhead.
 */
export class SchemaPoller extends EventEmitter {
  private options: WatchOptions;
  private cache: SchemaCache;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private isPolling = false;
  private consecutiveErrors = 0;
  private readonly MAX_CONSECUTIVE_ERRORS = 5;

  constructor(options: WatchOptions) {
    super();
    this.options = options;
    this.cache = new SchemaCache();
  }

  /**
   * Start the polling loop
   */
  start(): void {
    if (this.pollTimer) {
      return; // Already running
    }

    // Do an immediate poll
    this.poll();

    // Set up interval
    this.pollTimer = setInterval(() => {
      this.poll();
    }, this.options.pollInterval);
  }

  /**
   * Stop the polling loop
   */
  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * Perform a single poll operation
   */
  async poll(): Promise<PollResult> {
    // Prevent concurrent polls
    if (this.isPolling) {
      return {
        success: false,
        changed: false,
        error: 'Poll already in progress',
      };
    }

    this.isPolling = true;
    const startTime = Date.now();
    this.emit('poll-start', this.createEvent('poll-start'));

    try {
      // Fetch __schema via standard introspection
      const schemaResult = await fetchSchema({
        endpoint: this.options.endpoint,
        authorization: this.options.authorization,
        headers: this.options.headers,
        timeout: 30000,
      });

      const duration = Date.now() - startTime;

      // Check for errors
      if (!schemaResult.success) {
        return this.handleError(
          `__schema fetch failed: ${schemaResult.error}`,
          duration,
        );
      }

      const schema = schemaResult.data!;

      // Check if schema changed
      const { changed, newHash } = await this.cache.hasChanged(schema);

      // Reset error counter on success
      this.consecutiveErrors = 0;

      if (changed) {
        // Update in-memory hash
        this.cache.updateHash(newHash);

        // Touch trigger file if configured (only file I/O in watch mode)
        if (this.options.touchFile) {
          touchFile(this.options.touchFile);
        }

        this.emit(
          'schema-changed',
          this.createEvent('schema-changed', { hash: newHash, duration }),
        );
        return { success: true, changed: true, hash: newHash, schema };
      }

      this.emit(
        'schema-unchanged',
        this.createEvent('schema-unchanged', { duration }),
      );
      this.emit('poll-success', this.createEvent('poll-success', { duration }));
      return { success: true, changed: false, hash: newHash, schema };
    } catch (err) {
      const duration = Date.now() - startTime;
      const error = err instanceof Error ? err.message : 'Unknown error';
      return this.handleError(error, duration);
    } finally {
      this.isPolling = false;
    }
  }

  /**
   * Perform a single poll without starting the loop (for initial generation)
   */
  async pollOnce(): Promise<PollResult> {
    return this.poll();
  }

  /**
   * Seed the cache with current schema hash without emitting events.
   * Call this after initial generation to prevent first poll from triggering regeneration.
   */
  async seedCache(): Promise<void> {
    try {
      const schemaResult = await fetchSchema({
        endpoint: this.options.endpoint,
        authorization: this.options.authorization,
        headers: this.options.headers,
        timeout: 30000,
      });

      if (schemaResult.success) {
        const { newHash } = await this.cache.hasChanged(schemaResult.data!);
        this.cache.updateHash(newHash);
      }
    } catch {
      // Silently fail - cache will be seeded on first successful poll
    }
  }

  /**
   * Get the current cached schema hash
   */
  getCurrentHash(): string | null {
    return this.cache.getHash();
  }

  /**
   * Get the cache instance for direct access
   */
  getCache(): SchemaCache {
    return this.cache;
  }

  /**
   * Check if the poller is currently running
   */
  isRunning(): boolean {
    return this.pollTimer !== null;
  }

  private handleError(error: string, duration: number): PollResult {
    this.consecutiveErrors++;
    this.emit(
      'poll-error',
      this.createEvent('poll-error', { error, duration }),
    );

    // Slow down polling after multiple consecutive errors
    if (
      this.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS &&
      this.pollTimer
    ) {
      this.stop();
      const newInterval = this.options.pollInterval * 2;
      this.pollTimer = setInterval(() => {
        this.poll();
      }, newInterval);
    }

    return { success: false, changed: false, error };
  }

  private createEvent(
    type: PollEventType,
    extra?: Partial<PollEvent>,
  ): PollEvent {
    return {
      type,
      timestamp: Date.now(),
      ...extra,
    };
  }
}

/**
 * Utility to compute schema hash without full poll
 */
export async function computeSchemaHash(
  schema: IntrospectionQueryResponse,
): Promise<string> {
  return hashObject(schema);
}
