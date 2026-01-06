/**
 * In-memory schema cache for watch mode
 * 
 * Only stores the hash in memory - no file I/O during normal operation.
 * Touch file feature is optional and only writes when explicitly configured.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { MetaQueryResponse } from '../introspect/meta-query';
import type { IntrospectionQueryResponse } from '../../types/introspection';
import { hashObject, combineHashes } from './hash';

/**
 * Lightweight in-memory schema cache
 * Only stores the combined hash string to detect changes
 */
export class SchemaCache {
  /** Current schema hash (in-memory only) */
  private currentHash: string | null = null;

  /**
   * Check if schema has changed by comparing hashes
   * This is the hot path - must be efficient
   */
  async hasChanged(
    meta: MetaQueryResponse,
    schema: IntrospectionQueryResponse
  ): Promise<{ changed: boolean; newHash: string }> {
    const newHash = await this.computeHash(meta, schema);
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
   * Compute hash from meta and schema responses
   */
  private async computeHash(
    meta: MetaQueryResponse,
    schema: IntrospectionQueryResponse
  ): Promise<string> {
    // Hash each response separately then combine
    // This is more efficient than stringifying both together
    const metaHash = await hashObject(meta);
    const schemaHash = await hashObject(schema);
    return combineHashes(metaHash, schemaHash);
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
