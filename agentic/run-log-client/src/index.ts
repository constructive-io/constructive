/**
 * `@agentic-kit/run-log-client` — the run log as a user's browser sees it.
 *
 * One tenant-GraphQL `RunLogStore` over a module's `agent_run`/`agent_event`
 * pair, a follower that tails the run row alongside the log, and the pure
 * reduction a surface renders. No React, no node builtins: the platform UI, a
 * desktop pane and a test all consume the same three pieces.
 */

/**
 * The projections and record types a surface renders, re-exported so a host
 * imports one package rather than reaching past this one into the kernel.
 */
export {
  ATTACHABLE_STATUSES,
  createRunLogClient,
  type CreateRunInput,
  type CreateThreadInput,
  GraphqlRunLogClient,
  isSeqConflict,
  isTerminalStatus,
  type ListRunsArgs,
  type RunLogClientOptions,
  type RunPatch,
  type RunStatus,
  type RunSummary,
  TERMINAL_STATUSES,
  type ThreadSummary,
} from './client';
export {
  advanceRunDocument,
  appendDocument,
  createRunDocument,
  createThreadDocument,
  EVENT_FIELDS,
  eventsDocument,
  RUN_FIELDS,
  runDocument,
  runsDocument,
} from './documents';
export { followRun, type FollowRunOptions } from './follow-run';
export {
  adoptLocalRun,
  type LocalRun,
  markLocalRunFailed,
  markLocalRunIdle,
  markLocalRunRunning,
  openLocalRun,
  type OpenLocalRunOptions,
} from './local-run';
export {
  DEFAULT_EVENT_TABLE,
  DEFAULT_RUN_TABLE,
  DEFAULT_THREAD_TABLE,
  type RunLogNames,
  runLogNames,
} from './names';
export {
  changedSubscriptionDocument,
  changedSubscriptionField,
  createRealtimeWakeup,
  type RealtimeWakeup,
  type RealtimeWakeupOptions,
  type RunLogWsClient,
} from './realtime';
export { isMissingRunSurface } from './surface';
export {
  createGraphqlRequest,
  type GraphqlRequest,
  type GraphqlTransportOptions,
} from './transport';
export {
  applyError,
  applyRecords,
  applyRun,
  emptyRunView,
  isFollowable,
  mergeRecords,
  type RunView,
  type RunViewPhase,
  type RunViewProjection,
} from './view';
export type {
  ApprovalResolutionInput,
  ApprovalState,
  Conversation,
  ConversationPart,
  ModelUsage,
  RunEventRecord,
  RunLogCursor,
  RunLogPage,
  RunUsage,
  ToolCallState,
  ToolCallStatus,
  ToolStateProjection,
} from '@agentic-kit/run-log';
