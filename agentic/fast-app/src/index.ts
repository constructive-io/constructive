/**
 * Constructive's app-building layer, shared by its two hosts: Constructive
 * Desktop (a Local chat in the Electron main process) and a headless host (the
 * cloud Job of a Cloud chat).
 *
 * The root exports the pi extensions and the AppSpec layer. Everything else is
 * a deep import from the published `dist`, for example
 * `@agentic-kit/fast-app/extensions/provision-template`.
 */

export * from './app-spec';
export {
  CURATED_BLUEPRINTS,
  type CuratedBlueprint,
  type CuratedTable,
  curatedTables
} from './blueprints/curated';
export { blocksTools, type SearchBlocksDetails } from './extensions/blocks-tools';
export {
  applyCuratedBlueprint,
  blueprintPort,
  blueprintTools,
  type ProvisionTemplateDetails
} from './extensions/blueprint-tools';
export { codeRules } from './extensions/code-rules';
export { dbToolsWithLimits } from './extensions/db-tools/index-extension';
export { planTools } from './extensions/plan-tools';
export {
  type BlueprintPort,
  provisionTemplate,
  type ProvisionTemplateResult,
  type ProvisionTemplateStatus
} from './extensions/provision-template';
export { scopeTools } from './extensions/scope-tools';
export { isStoppedToolDetails, STOPPED_TOOL_NOTE, stoppedToolNote } from './extensions/stopped-tool-result';
