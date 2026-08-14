/**
 * `@agentic-kit/run-log` — the append-only run log: one ordered record of what
 * an agent run did, wherever it ran.
 *
 * Browser-safe on purpose: renderers import the projectors, so nothing here may
 * reach for a node builtin. The filesystem store lives behind
 * `@agentic-kit/run-log/file-store`.
 */

export {
  follow,
  type FollowOptions,
  readAll
} from './follow';
export {
  assertPiSessionEntry,
  contentText,
  isAssistantMessage,
  isPiBranchSummaryEntry,
  isPiCompactionEntry,
  isPiMessageEntry,
  isPiSessionHeader,
  isToolResultMessage,
  type PiAssistantMessage,
  type PiBashExecutionMessage,
  type PiBranchSummaryEntry,
  type PiCompactionEntry,
  type PiContent,
  type PiCustomMessage,
  type PiEntryBase,
  type PiImageContent,
  type PiMessage,
  type PiMessageEntry,
  type PiOtherEntry,
  type PiSessionEntry,
  type PiSessionHeader,
  type PiSummaryMessage,
  type PiTextContent,
  type PiThinkingContent,
  type PiToolCallContent,
  type PiToolResultMessage,
  type PiUsage,
  type PiUsageCost,
  type PiUserMessage,
  toolCalls
} from './pi-entry';
export {
  type BashPart,
  type Conversation,
  type ConversationPart,
  type CustomPart,
  projectParts,
  type SummaryPart,
  type TextPart,
  type ThinkingPart,
  type ToolPart,
  type ToolStatus,
  type UnknownPart
} from './projectors/parts';
export {
  parseSessionJsonl,
  projectSession,
  type SessionProjection,
  type SessionProjectionOptions
} from './projectors/session';
export {
  APPROVAL_REQUEST_TYPE,
  APPROVAL_RESOLUTION_TYPE,
  type ApprovalRequestInput,
  approvalRequestMessage,
  type ApprovalResolutionInput,
  approvalResolutionMessage,
  type ApprovalState,
  projectToolState,
  type ToolCallState,
  type ToolCallStatus,
  type ToolStateProjection
} from './projectors/tool-state';
export {
  modelKey,
  type ModelUsage,
  projectUsage,
  type RunUsage,
  type UsageTotals
} from './projectors/usage';
export {
  assertOrdered,
  assertRunEventRecord,
  idempotencyKey,
  RUN_LOG_WRAPPER_VERSION,
  type RunEventRecord,
  SUPPORTED_PI_SESSION_VERSION,
  wrapEntry,
  type WrapEntryOptions
} from './record';
export {
  type AppendOptions,
  cursorAfter,
  MemoryRunLogStore,
  type RunLogAppendStore,
  type RunLogCursor,
  type RunLogPage,
  type RunLogReadStore,
  type RunLogStore,
  START
} from './store';
