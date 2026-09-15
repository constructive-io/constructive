// @agentic-kit/pi-host — the host half of a headless agent run: the
// harness's `GateHost` answered by the conversation thread, persona selection,
// the gated toolset, and `AgentEvent` → transcript. Every dependency arrives as
// a value; nothing here knows what a `ctx` is.

export type { TranscriptWriterOptions } from './events';
export {
  assistantText,
  parseTodos,
  resultText,
  TODO_TOOL_NAMES,
  TranscriptWriter
} from './events';
export type { ThreadGateHost, ThreadGateHostOptions } from './gate';
export { createThreadGateHost, DEFAULT_APPROVAL_TIMEOUT_MS } from './gate';
export type { PiHostValues } from './host';
export { createPiToolsHost } from './host';
export type { MeteredIdentity, MeteredModel, MeteredModelOptions } from './model';
export { createMeteredModel, gatewayApiRoot, meteringHeaders } from './model';
export type {
  LoadPersonaInput,
  PersonaConfig,
  PersonaRow,
  PersonaSelection,
  SelectPersonaInput,
  SkillResource
} from './persona';
export {
  loadPersona,
  loadPersonaSkills,
  PersonaModelUnresolvedError,
  PersonaNotFoundError,
  selectPersona,
  UnknownPersonaToolError
} from './persona';
export type { ProjectContextRequest } from './project-context';
export {
  isInside,
  materializeProjectContext,
  ProjectContextInsideWorkTreeError
} from './project-context';
export type { GatedToolset, GatedToolsetOptions } from './tools';
export { CLONE_GATE_DEPS, createGatedToolset } from './tools';
export type { WorkspaceToolsOptions } from './workspace-tools';
export {
  createWorkspaceTools,
  DEFAULT_COMMAND_TIMEOUT_MS,
  MAX_READ_BYTES,
  OutsideWorkspaceError,
  WORKSPACE_TOOL_NAMES
} from './workspace-tools';
