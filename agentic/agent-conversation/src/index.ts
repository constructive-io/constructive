// @agentic-kit/agent-conversation — the agent module's three tables
// (`agent_thread`, `agent_message`, `agent_task`) as a library a workload can
// use with nothing but a conversation client. No `ctx`, no pool, no schema of
// its own.
//
// Two clients implement the seam: the GraphQL one, for a consumer that holds a
// tenant API credential, and the node-gateway one, for a resource workload whose
// only credential is the callback token of the execution it *is* — which is why
// the thread it writes to is resolved from that execution rather than passed in.

export type { FetchLike, GraphQLClient, HttpGraphQLClientOptions } from './client';
export { createHttpGraphQLClient, GraphQLRequestError } from './client';
export type {
  AppendMessageInput,
  ConversationClient,
  ConversationContext,
  ConversationContextClient,
  ConversationPersona,
  ConversationPersonaConfig,
  ConversationSkill,
  CreateTaskInput,
  UpdateMessageInput,
  UpdateTaskInput
} from './conversation-client';
export type { GatewayConversationClientOptions } from './gateway-conversation';
export {
  ConversationGatewayError,
  createGatewayConversationClient
} from './gateway-conversation';
export type { GraphQLConversationClientOptions } from './graphql-conversation';
export { createGraphQLConversationClient } from './graphql-conversation';
export type {
  ApprovalEvent,
  CancelEvent,
  InboxEvent,
  InboxOptions,
  UserTurnEvent
} from './inbox';
export { classifyMessage, Inbox, isApprovalEvent, messageText } from './inbox';
export type {
  MessagePart,
  TextPart,
  ToolApproval,
  ToolPart,
  ToolPartState
} from './parts';
export {
  advanceToolPart,
  completeToolPart,
  denyToolPart,
  failToolPart,
  InvalidToolPartTransitionError,
  isTextPart,
  isToolPart,
  requestApproval,
  respondToApproval,
  textPart,
  TOOL_PART_TRANSITIONS,
  toolPart
} from './parts';
export type { AgentTaskRow, TaskParent, TaskWriterOptions, TodoItem } from './tasks';
export { TaskWriter } from './tasks';
export type { AgentThreadRow, LoadOrCreateThreadInput } from './thread';
export { loadOrCreateThread, ThreadNotFoundError } from './thread';
export type { AgentMessageRow, TranscriptOptions } from './transcript';
export { toolPartOf, Transcript } from './transcript';
