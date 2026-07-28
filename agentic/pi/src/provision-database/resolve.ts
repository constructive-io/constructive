// Ordered-overlay resolution for provision modules.
//
// Mirrors the skills overlay model (`@agentic-kit/harness` skills manifest): a
// pinned base (a named preset from `node-type-registry`) is layered under zero
// or more overlays, later layers winning by module key. An empty overlay list
// resolves to the base preset unchanged.
import {
  allModulePresets,
  DEFAULT_PROVISION_PRESET,
  getModulePreset,
  type ProvisionModule,
} from './presets';

export interface ProvisionOverlay {
  /**
   * Base preset name to resolve from (e.g. 'b2b:storage', 'full'). The last
   * layer that sets `preset` wins; if none set it, `DEFAULT_PROVISION_PRESET`
   * is used.
   */
  preset?: string;
  /**
   * Modules to add. An entry whose key matches an existing module OVERRIDES it
   * (e.g. re-declaring `storage_module` with app-specific options); a new key
   * is appended.
   */
  add?: ProvisionModule[];
  /**
   * Module names or `name:scope` keys to drop from the base. A bare name
   * removes every scope of that module; `name:scope` removes just that one.
   */
  remove?: string[];
}

function moduleName(m: ProvisionModule): string {
  return Array.isArray(m) ? m[0] : m;
}

function moduleScope(m: ProvisionModule): string | undefined {
  if (!Array.isArray(m)) return undefined;
  const scope = m[1]?.scope;
  return typeof scope === 'string' ? scope : undefined;
}

/** Stable identity for a module entry: `name` or `name:scope` when scoped. */
export function moduleKey(m: ProvisionModule): string {
  const scope = moduleScope(m);
  return scope ? `${moduleName(m)}:${scope}` : moduleName(m);
}

/**
 * Resolve the effective module list from a pinned preset plus ordered overlays.
 * Pure: no I/O, no host access. Later overlays win (last-write-wins by key).
 */
export function resolveProvisionModules(layers: ProvisionOverlay[] = []): ProvisionModule[] {
  const presetName =
    [...layers].reverse().find((l) => l.preset)?.preset ?? DEFAULT_PROVISION_PRESET;
  const preset = getModulePreset(presetName);
  if (!preset) {
    const known = allModulePresets.map((p) => p.name).join(', ');
    throw new Error(`Unknown provision preset "${presetName}". Known presets: ${known}.`);
  }

  // Ordered map keyed by module identity preserves position while allowing
  // overrides (same key) and appends (new key).
  const resolved = new Map<string, ProvisionModule>();
  for (const m of preset.modules as ProvisionModule[]) resolved.set(moduleKey(m), m);

  for (const layer of layers) {
    for (const target of layer.remove ?? []) {
      for (const key of [...resolved.keys()]) {
        if (key === target || key.split(':')[0] === target) resolved.delete(key);
      }
    }
    for (const m of layer.add ?? []) resolved.set(moduleKey(m), m);
  }

  return [...resolved.values()];
}
