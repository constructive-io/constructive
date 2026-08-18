// Provision module presets — the canonical source of truth.
//
// The module list is NEVER hand-copied here. It is imported from the pinned
// `node-type-registry` package (the same presets the backend and dashboard use),
// so bumping that dependency is how the base module set moves. Hosts customize
// on top with an ordered overlay (see `resolve.ts`) rather than editing a list.
import {
  allModulePresets,
  getModulePreset,
  type ModulePreset,
  PresetB2bStorage,
} from 'node-type-registry';

// A single module entry: either a bare module name or a `[name, options]` tuple
// for scoped/configured modules. Structurally identical to the registry's
// `ModulePreset['modules']` element, so preset lists flow straight through.
export type ProvisionModule = string | [string, Record<string, unknown>];

// Default base preset. `b2b:storage` = the full multi-tenant B2B shape plus file
// storage, matching Constructive's app shape. It carries the app-scoped secret,
// identity-provider, and storage modules the backend's provisioning requires —
// the drift the old hand-copied list caused (a dropped, then bare/unscoped, set).
export const DEFAULT_PROVISION_PRESET = PresetB2bStorage.name;

export { allModulePresets, getModulePreset, type ModulePreset };
