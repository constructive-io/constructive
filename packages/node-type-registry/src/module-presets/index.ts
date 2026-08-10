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
import { PresetAuthHardened } from './auth-hardened';
import { PresetB2bStorage } from './b2b-storage';
import { PresetFull } from './full';
import { PresetMinimal } from './minimal';
import type { ModulePreset } from './types';

export { PresetAuthHardened, PresetB2bStorage, PresetFull, PresetMinimal };

/**
 * Ordered list of all shipped module presets, from smallest to largest
 * module footprint. Stable ordering — CLIs / UIs can present this directly.
 */
export const allModulePresets: ModulePreset[] = [
  PresetMinimal,
  PresetAuthHardened,
  PresetB2bStorage,
  PresetFull,
];

/** Look up a preset by name. Returns undefined if the name isn't known. */
export function getModulePreset(name: string): ModulePreset | undefined {
  return allModulePresets.find((p) => p.name === name);
}

function moduleName(entry: ModulePreset['modules'][number]): string {
  return typeof entry === 'string' ? entry : entry[0];
}

export function resolvePresetModules(
  preset: ModulePreset,
  options: { includeInternal?: boolean } = {},
): ModulePreset['modules'] {
  if (options.includeInternal) return preset.modules;
  return preset.modules.filter(
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
