// Client-side mirror of the backend's modules_hash normalization
// (constructive-db: metaschema_private.modules_hash), used to decide whether a
// resolved module set can be requested by preset slug — the warm-pool-eligible
// path — or must be sent as an explicit modules array:
//   1. A bare module name normalizes to [name, {}]; a missing/null options
//      slot normalizes to {}.
//   2. Options are compared verbatim after canonicalization (object keys
//      sorted at every level) — no default-value normalization.
//   3. Entries are sorted so the caller's ordering never affects the match.
//   4. Duplicate normalized entries never match (the backend rejects them).
// Only equality within this process matters, so string sort order does not
// need to replicate PostgreSQL collation.
//
// The registry presets are the canonical definitions; the backend's
// db_presets catalog is synced from them. A slug match assumes that sync —
// preset drift would provision the backend's version of the set.

import { allModulePresets, type ProvisionModule } from './presets';
import type { ProvisionRequest } from './request-database';

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = canonicalize((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

function normalizedEntries(list: ProvisionModule[]): string[] | null {
  const entries = list.map((m) => {
    const name = Array.isArray(m) ? m[0] : m;
    const options = Array.isArray(m) ? (m[1] ?? {}) : {};
    return JSON.stringify([name, canonicalize(options)]);
  });
  entries.sort();
  for (let i = 1; i < entries.length; i++) {
    if (entries[i] === entries[i - 1]) return null;
  }
  return entries;
}

/**
 * The slug of the registry preset whose module set equals `resolved` under
 * the backend's hash semantics, or undefined when no preset matches.
 */
export function matchPresetSlug(resolved: ProvisionModule[]): string | undefined {
  const target = normalizedEntries(resolved)?.join('\n');
  if (!target) return undefined;
  for (const preset of allModulePresets) {
    if (normalizedEntries(preset.modules as ProvisionModule[])?.join('\n') === target) {
      return preset.name;
    }
  }
  return undefined;
}

/**
 * Build the requestDatabase input branch: presetSlug when the resolved set
 * equals a registry preset (warm-pool eligible), else the explicit modules
 * array — never both.
 */
export function selectProvisionRequest(resolved: ProvisionModule[]): ProvisionRequest {
  const presetSlug = matchPresetSlug(resolved);
  return presetSlug ? { presetSlug } : { modules: resolved };
}
