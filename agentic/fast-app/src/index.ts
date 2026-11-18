/**
 * Constructive's app-building layer, shared by its two hosts: Constructive
 * Desktop (a Local chat in the Electron main process) and a headless host (the
 * cloud Job of a Cloud chat).
 *
 * The root exports what a host needs: the host contract (`configureFastAppHost`
 * and its types), the services it builds the contract from, the pi
 * extensions (`fastAppTools` for plan_app and verify_app, and the tools around
 * them), the app-building prompt sections, and the AppSpec layer. Everything
 * else is a deep import from the published `dist`, for example
 * `@agentic-kit/fast-app/pipeline/build-record`.
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
export type {
  AppBuildDetails,
  AppPlanAuthMethod,
  AppPlanPrompt,
  AppReprovisionPrompt,
  PhaseName
} from './pipeline/app-plan';
export type { BuildPlan } from './pipeline/build-plan';
export { DevServerManager, DevServerStopped } from './pipeline/dev-server';
export {
  type AppendEntry,
  type AppTemplate,
  type BuildCard,
  type CardAnswer,
  type CardRequest,
  configureFastAppHost,
  type DatabaseRequest,
  type DbChange,
  type FastAppAccount,
  type FastAppEvents,
  type FastAppHost,
  type FastAppProject,
  type FastAppServices,
  getFastAppHost,
  type Note,
  type OwnerCredential,
  type OwnerSession,
  type OwnerSessions,
  type PasswordCredential,
  type PlanCards,
  type PlatformIdentityCredential,
  type ProgressWatch,
  type ProjectDatabaseState,
  type ProjectRecords,
  type RenderCheck,
  type RenderCheckResult,
  type RenderFailure,
  type SideStep
} from './pipeline/host';
export { BuildProgress, PhaseError, type PhaseReporter } from './pipeline/progress';
export { ProjectLocks } from './pipeline/project-lock';
export type { ProvisionedBinding } from './pipeline/provisioned-binding';
export { appBuildingSection, specToolsNote } from './prompt';
export { fastAppTools } from './tools';
