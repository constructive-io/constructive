/**
 * In-memory schema cache for watch mode
 *
 * Only stores the hash in memory - no file I/O during normal operation.
 * Touch file feature is optional and only writes when explicitly configured.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import type { IntrospectionQueryResponse } from '../../types/introspection';
import { hashObject } from './hash';

/**
 * Lightweight in-memory schema cache
 * Only stores the schema hash string to detect changes
 */
export class SchemaCache {
  /** Current schema hash (in-memory only) */
  private currentHash: string | null = null;

  /**
   * Check if schema has changed by comparing hashes
   * This is the hot path - must be efficient
   */
  async hasChanged(
    schema: IntrospectionQueryResponse,
  ): Promise<{ changed: boolean; newHash: string }> {
    const newHash = await this.computeHash(schema);
    const changed = this.currentHash === null || this.currentHash !== newHash;
    return { changed, newHash };
  }

  /**
   * Update the cached hash (call after successful regeneration)
   */
  updateHash(hash: string): void {
    this.currentHash = hash;
  }

  /**
   * Get the current cached hash
   */
  getHash(): string | null {
    return this.currentHash;
  }

  /**
   * Clear the cached hash
   */
  clear(): void {
    this.currentHash = null;
  }

  /**
   * Compute hash from schema response
   */
  private async computeHash(
    schema: IntrospectionQueryResponse,
  ): Promise<string> {
    return hashObject(schema);
  }
}

/**
 * Touch a file to signal schema change (for external tools like tsc/webpack)
 * This is the only file I/O in watch mode, and it's optional.
 */
export function touchFile(filePath: string): void {
  // Ensure parent directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Touch the file (create if doesn't exist, update mtime if it does)
  const time = new Date();
  try {
    fs.utimesSync(filePath, time, time);
  } catch {
    fs.closeSync(fs.openSync(filePath, 'w'));
  }
}
