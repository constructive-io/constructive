/**
 * Node Type Registry Plugin
 *
 * Exports the gather-phase plugin and preset for generating @oneOf typed
 * input types for blueprint definitions from node_type_registry.
 *
 * The NodeTypeRegistryPlugin queries node_type_registry through the existing
 * pgService connection during the gather phase — no separate pool needed.
 */
export {
  NodeTypeRegistryPlugin,
  NodeTypeRegistryPreset,
  // Legacy exports for backward compatibility
  createBlueprintTypesPlugin,
  BlueprintTypesPreset,
} from './plugin';
export type { NodeTypeRegistryEntry } from './plugin';
