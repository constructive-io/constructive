export type {
  DependencyCondition,
  DependencyScope,
  MissingModuleDependency,
  ModuleDependency,
} from './dependencies';
export {
  assertModuleDependencies,
  describeMissingModuleDependency,
  entityScopes,
  findMissingModuleDependencies,
  moduleDependencies,
  moduleEntryName,
  withRequiredModules,
} from './dependencies';
export type {
  AgentModuleOptions,
  BaseModuleOptions,
  BillingModuleOptions,
  CatalogModuleOptions,
  DefaultMeterCatalogEntry,
  EventsModuleOptions,
  LimitDefault,
  LimitsModuleOptions,
  MerkleStoreModuleOptions,
  ModuleEntry,
  ModulePreset,
  StorageModuleOptions,
  TrustLadderRung,
} from './types';

import { getModuleType } from '../module-types';
import { PresetAuthByo } from './auth-byo';
import { PresetAuthHardened } from './auth-hardened';
import { PresetB2bSaas } from './b2b-saas';
import { PresetB2bStorage } from './b2b-storage';
import { withRequiredModules } from './dependencies';
import { PresetFull } from './full';
import { PresetMinimal } from './minimal';
import type { ModulePreset } from './types';

export {
  PresetAuthByo,
  PresetAuthHardened,
  PresetB2bSaas,
  PresetB2bStorage,
  PresetFull,
  PresetMinimal,
};

/**
 * Ordered list of all shipped module presets. Registration order: new presets
 * are appended, never inserted, because `db_preset_seed_data()` mirrors this
 * list positionally into the `infra_public.db_presets` seed alterations and an
 * insert in the middle would rewrite already-applied ones.
 */
export const allModulePresets: ModulePreset[] = [
  PresetMinimal,
  PresetAuthHardened,
  PresetB2bStorage,
  PresetFull,
  PresetB2bSaas,
  PresetAuthByo,
];

/** Look up a preset by name. Returns undefined if the name isn't known. */
export function getModulePreset(name: string): ModulePreset | undefined {
  return allModulePresets.find((p) => p.name === name);
}

function moduleName(entry: ModulePreset['modules'][number]): string {
  return typeof entry === 'string' ? entry : entry[0];
}

/**
 * The modules a preset installs.
 *
 * `includeDependencies` appends the planes the listed modules read but the
 * preset does not name — the same closure a provisioner would otherwise fail
 * on, in the scope each dependent asked for. It is opt-in because the shipped
 * presets are already dependency-complete (a test asserts that), so the closure
 * only matters for a caller-assembled list.
 */
export function resolvePresetModules(
  preset: ModulePreset,
  options: { includeInternal?: boolean; includeDependencies?: boolean } = {},
): ModulePreset['modules'] {
  const modules = options.includeDependencies
    ? withRequiredModules(preset.modules)
    : preset.modules;
  if (options.includeInternal) return modules;
  return modules.filter(
    (entry) => !getModuleType(moduleName(entry))?.internal,
  );
}

export const publicModulePresets: ModulePreset[] = allModulePresets
  .filter((preset) => !preset.internal)
  .map((preset) => ({
    ...preset,
    modules: resolvePresetModules(preset),
  }));

export function getPublicModulePreset(name: string): ModulePreset | undefined {
  return publicModulePresets.find((preset) => preset.name === name);
}
