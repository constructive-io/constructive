import type { Pool } from 'pg';

import { getPoolIdentity } from './pool-identity';
import type { BuildKeyParts } from './types';

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
