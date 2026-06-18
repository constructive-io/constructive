import { Logger } from '@pgpmjs/logger';
import type { Pool } from 'pg';

import type { BuildKeyParts } from './types';

const log = new Logger('multi-tenancy-cache:build-key');

/**
 * Derive the pool connection identity from a pg.Pool instance.
 *
 * Real pg.Pool instances created via `new Pool({ connectionString })` store
 * only `{ connectionString }` in `pool.options` — the individual fields
 * (host, port, database, user) are NOT parsed onto the options object.
 *
 * This function handles both shapes:
 *   1. connectionString-based (production — via pg-cache's getPgPool)
 *   2. individual fields (fallback for pools created with explicit fields)
 */
export function getPoolIdentity(pool: Pool): string {
  const opts = (pool as unknown as { options: Record<string, unknown> }).options || {};

  if (typeof opts.connectionString === 'string') {
    try {
      const url = new URL(opts.connectionString);
      const host = url.hostname || 'localhost';
      const port = url.port || '5432';
      const database = url.pathname.slice(1) || '';
      const user = decodeURIComponent(url.username || '');
      return `${host}:${port}/${database}@${user}`;
    } catch {
      return opts.connectionString;
    }
  }

  if (opts.host || opts.database || opts.user) {
    return `${opts.host || 'localhost'}:${opts.port || 5432}/${opts.database || ''}@${opts.user || ''}`;
  }

  log.warn('Pool has no connectionString or individual connection fields — buildKey may not be unique');
  return 'unknown-pool';
}

export function normalizeBuildInput(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeBuildInput);
  }
  if (value && typeof value === 'object') {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const key of Object.keys(input).sort()) {
      const normalized = normalizeBuildInput(input[key]);
      if (normalized !== undefined) {
        output[key] = normalized;
      }
    }
    return output;
  }
  return value;
}

/**
 * Compute the buildKey from the inputs that materially affect
 * Graphile handler construction.
 *
 * Includes:
 *   - connection identity (host:port/database@user)
 *   - schemas (order preserved — NOT sorted)
 *   - anonRole
 *   - roleName
 *   - presetOptions/databaseSettings
 *
 * Does NOT include:
 *   - svc_key (routing-only)
 *   - databaseId (metadata-only)
 *   - token data, host/domain, transient headers
 */
export function computeBuildKey(
  pool: Pool,
  schemas: string[],
  anonRole: string,
  roleName: string,
  presetOptions?: unknown,
): string {
  const input: BuildKeyParts = {
    conn: getPoolIdentity(pool),
    schemas,
    anonRole,
    roleName,
  };
  const normalizedPresetOptions = normalizeBuildInput(presetOptions);
  if (normalizedPresetOptions !== undefined) {
    input.presetOptions = normalizedPresetOptions;
  }
  return JSON.stringify(input);
}
