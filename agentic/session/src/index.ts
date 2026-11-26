export {
  type AccountSession,
  checkContextName,
  ContextNameError,
  openStore,
  saveSession,
  STASH_DIR_ENV,
  STASH_NAME,
  stashBaseDir,
  stashDirectories
} from './account-store';
export {
  type AgentDetails,
  AgentError,
  type AgentErrorKind,
  type AgentInfo,
  type AgentRemoval,
  type AgentRenewal,
  agentSession,
  createAgent,
  grantSchemaChanges,
  listAgents,
  removeAgent,
  renewAgentKey,
  revokeSchemaChanges,
  SCHEMA_READ_ONLY_MASK
} from './agent';
export { checkAgentName } from './agent-store';
export { keyEndsSoon, type KeyRevocation, type PreviousKey, SIGN_IN_AGAIN_WITHIN_MS } from './api-key';
export { type CredentialCheck, signIn, type SignInResult, signOut, type SignOutResult, verifySession } from './auth';
export { SignInError, type SignInErrorKind } from './auth-error';
export {
  addBackend,
  type BackendConfig,
  type BackendContext,
  backendFromEndpoints,
  ContextInUseError,
  contextNameFor,
  EndpointError,
  type EndpointProblem,
  listBackends,
  type Plane,
  PLANES,
  readBackend,
  removeBackend,
  selectBackend
} from './backend-store';
export {
  type AgentIdentity,
  type AgentUnusableReason,
  hostAccount,
  OVERRIDE_ENV_VARS,
  type PersonSession,
  type ResolvedAgentSession,
  resolveSession,
  type Session,
  type SessionAccount,
  type SessionKey,
  sessionProblem,
  type SessionSource
} from './session';
export { sessionToolsHost } from './tools-host';
export type { ConfigStore } from 'appstash';
