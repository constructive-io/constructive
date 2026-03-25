/**
 * PostGraphile v5 Preset for Node Type Registry
 *
 * Opt-in preset that generates @oneOf typed GraphQL input types
 * (BlueprintDefinitionInput, BlueprintNodeInput, etc.) from the
 * TS node type definitions. Uses the existing createBlueprintTypesPlugin
 * factory — no DB query needed.
 *
 * This preset is NOT included in ConstructivePreset (which is for all
 * Constructive databases). It should only be layered on by the
 * constructive-db SDK codegen or other consumers that need blueprint types.
 *
 * Usage:
 *   import { NodeTypeRegistryPreset } from 'node-type-registry/preset';
 *
 *   const sdl = await buildSchemaSDL({
 *     database: dbConfig.database,
 *     schemas,
 *     graphile: { extends: [NodeTypeRegistryPreset] },
 *   });
 */
import type { GraphileConfig } from 'graphile-config';
import { createBlueprintTypesPlugin } from 'graphile-settings/plugins/blueprint-types/plugin';
import { allNodeTypes } from './index';

export const NodeTypeRegistryPreset: GraphileConfig.Preset = {
  plugins: [createBlueprintTypesPlugin(allNodeTypes)],
};
