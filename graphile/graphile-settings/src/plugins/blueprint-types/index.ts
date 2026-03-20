/**
 * Blueprint Types Plugin
 *
 * Exports the plugin and preset for generating @oneOf typed input types
 * for blueprint definitions from node_type_registry.
 */
export {
  createBlueprintTypesPlugin,
  BlueprintTypesPreset,
} from './plugin';
export type { NodeTypeRegistryEntry } from './plugin';
