import type { AnyHarnessTool } from '@agentic-kit/harness';
import type { ExtensionFactory } from '@earendil-works/pi-coding-agent';

import { createConfirmGate } from './confirm-gate';
import { resolveDataToken, resolveProjectContext } from './context';
import { configureHost, type PiToolsHost } from './host';
import { toPiTool } from './pi-tool';
import { addPoliciesTool } from './tools/add-policies';
import { addRecordsTool } from './tools/add-records';
import { addRelationTool } from './tools/add-relation';
import { createApiKeyTool } from './tools/create-api-key';
import { describeSchemaTool } from './tools/describe-schema';
import { manageEntityTypesTool } from './tools/manage-entity-types';
import { createFieldTool, deleteFieldTool, deleteTableTool, updateFieldTool } from './tools/mutations';
import { provisionBlueprintTool } from './tools/provision-blueprint';
import { provisionDatabaseTool } from './tools/provision-database';
import { runCodegenTool } from './tools/run-codegen';
import {
  applyTemplateTool,
  createTemplatePreviewTables,
  createTemplateTool,
  deleteTemplateTool,
  listTemplatesTool,
  updateTemplateTool,
} from './tools/templates';

/**
 * The Constructive database tools, in registration order.
 *
 * These are neutral `HarnessTool`s — nothing in `./tools` imports pi. A harness
 * gets them by binding them to its own runner; `dbTools` below is that binding
 * for pi.
 */
export const constructiveDbTools: readonly AnyHarnessTool[] = [
  provisionDatabaseTool,
  describeSchemaTool,
  listTemplatesTool,
  provisionBlueprintTool,
  addRelationTool,
  deleteTableTool,
  createFieldTool,
  updateFieldTool,
  deleteFieldTool,
  addPoliciesTool,
  applyTemplateTool,
  createTemplateTool,
  updateTemplateTool,
  deleteTemplateTool,
  addRecordsTool,
  manageEntityTypesTool,
  createApiKeyTool,
  runCodegenTool,
];

export const dbTools: ExtensionFactory = (pi) => {
  for (const tool of constructiveDbTools) {
    pi.registerTool(toPiTool(tool));
  }

  const gate = createConfirmGate({
    resolveProjectContext,
    resolveDataToken,
    createTemplatePreviewTables,
  });
  pi.on('agent_start', gate.onAgentStart);
  pi.on('tool_call', gate.onToolCall);
};

/** Configure the host and get the extension in one call. */
export function createDbTools(host: PiToolsHost): ExtensionFactory {
  configureHost(host);
  return dbTools;
}

export {
  type ConfirmGate,
  type ConfirmGateDeps,
  type ConfirmGateOptions,
  createConfirmGate,
} from './confirm-gate';
export {
  CONTEXT_ENV_KEYS,
  CONTEXT_ENV_PREFIX,
  type ContextEnvKey,
  type ContextSource,
  deriveSubdomainEndpoint,
  fromEnvFile,
  fromEnvironment,
  type ModulesClient,
  type ProjectContext,
  type ProjectContextFailureCode,
  resolveDataToken,
  resolveProjectContext,
} from './context';
export {
  type ComposedLanes,
  type ComposedRun,
  composeRun,
  type ComposeRunOptions,
  type GateLane,
  type MeteringLane,
  type RunLogLane,
} from './embed/lanes';
export {
  type CreateResourceLoader,
  type EmbeddedRun,
  type PiModule,
  type ResourceLoaderRequest,
  startRun,
  type StartRunOptions,
} from './embed/session';
export {
  createGateExtension,
  type GateExtension,
  type GateExtensionOptions,
} from './extensions/gate';
export {
  createMeteredModelExtension,
  type MeteredModelExtension,
  type MeteredModelExtensionOptions,
  piProviderConfig,
} from './extensions/metered-model';
export {
  createRunLogExtension,
  MIRROR_EVENTS,
  type MirrorEvent,
  type RunLogExtension,
  type RunLogExtensionOptions,
} from './extensions/run-log';
export {
  createUsageReportExtension,
  type UsageReportExtension,
  type UsageReportExtensionOptions,
} from './extensions/usage-report';
export { PI_HARNESS_ID, piHarness, type PiHarnessRun } from './harness';
export {
  type ActiveDataToken,
  configureHost,
  type DataAuthBroker,
  getHost,
  type HostAccount,
  type HostBackendConfig,
  type HostProvisionOverlay,
  type PiToolsHost,
  type PreviewToken,
} from './host';
export { toPiTool, toPiTools } from './pi-tool';
export {
  loadProvisionManifest,
  parseProvisionManifest,
  PROVISION_MANIFEST_FILE,
  type ProvisionManifest,
} from './provision-database/manifest';
export {
  allModulePresets,
  DEFAULT_PROVISION_PRESET,
  getModulePreset,
  type ModulePreset,
  type ProvisionModule,
} from './provision-database/presets';
export {
  moduleKey,
  type ProvisionOverlay,
  resolveProvisionModules,
} from './provision-database/resolve';
export { toolSchema } from './tool-schema';
export { createTemplatePreviewTables } from './tools/templates';

export default dbTools;
