import type { ExtensionFactory } from '@earendil-works/pi-coding-agent';

import { createConfirmGate } from './confirm-gate';
import { resolveDataToken, resolveProjectContext } from './context';
import { configureHost, type PiToolsHost } from './host';
import { addPoliciesTool } from './tools/add-policies';
import { addRecordsTool } from './tools/add-records';
import { addRelationTool } from './tools/add-relation';
import { describeSchemaTool } from './tools/describe-schema';
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

export const dbTools: ExtensionFactory = (pi) => {
  pi.registerTool(provisionDatabaseTool);
  pi.registerTool(describeSchemaTool);
  pi.registerTool(listTemplatesTool);
  pi.registerTool(provisionBlueprintTool);
  pi.registerTool(addRelationTool);
  pi.registerTool(deleteTableTool);
  pi.registerTool(createFieldTool);
  pi.registerTool(updateFieldTool);
  pi.registerTool(deleteFieldTool);
  pi.registerTool(addPoliciesTool);
  pi.registerTool(applyTemplateTool);
  pi.registerTool(createTemplateTool);
  pi.registerTool(updateTemplateTool);
  pi.registerTool(deleteTemplateTool);
  pi.registerTool(addRecordsTool);
  pi.registerTool(runCodegenTool);

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

export { type ConfirmGate, type ConfirmGateDeps, createConfirmGate } from './confirm-gate';
export {
  type ModulesClient,
  type ProjectContext,
  resolveDataToken,
  resolveProjectContext,
} from './context';
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
