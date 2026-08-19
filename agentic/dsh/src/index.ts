/**
 * `@agentic-kit/dsh` — the DeepSeek Harness adapter.
 *
 * The sibling of `@agentic-kit/pi`, and the reason the harness contracts are
 * neutral: the same 18 Constructive tools, the same confirm gate and the same
 * run-log vocabulary, bound to a second harness without any of them changing.
 * Everything dsh-specific is here — its tool shape, its JSON Schema subset, its
 * plugin surface, its session-event log — and nothing here reaches back into
 * the neutral packages' internals.
 *
 * dsh is a developer preview whose packages promise breaking changes, so this
 * adapter binds to its *shape* rather than its types (see `./dsh-types`): the
 * package has no `@deepseek-ai/*` dependency, which also keeps dsh's ESM-only
 * graph out of a CJS consumer's way.
 */

export { toDshTool, type ToDshToolOptions,toDshTools } from './dsh-tool';
export {
  type DshApprovalOutcome,
  type DshApprovalService,
  type DshContentBlock,
  type DshJsonSchema,
  type DshPlugin,
  type DshPluginContext,
  type DshPreToolDecision,
  type DshToolDefinition,
  type DshToolExecution,
  type DshToolOutputDefinition,
  type DshToolRunContext,
  type DshToolRuntime
} from './dsh-types';
export {
  type ConstructivePluginOptions,
  createConstructivePlugin,
  DSH_PLUGIN_NAME
} from './plugin';
export {
  convertDshParameters,
  type DshSchemaConversion,
  toDshParameters
} from './schema';
/**
 * The transcript reader, re-exported for a node host. A renderer imports
 * `@agentic-kit/dsh/transcript` instead: that entry point pulls neither the db
 * tools nor anything else a browser cannot load.
 */
export {
  assertDshSessionEvent,
  DSH_TRANSCRIPT_FORMAT,
  dshEventToEvents,
  type DshSessionEvent,
  dshTranscriptReader,
  SUPPORTED_DSH_TRANSCRIPT_VERSION
} from './transcript';

/** Stable adapter id, matching the transcript format its runs are logged under. */
export const DSH_HARNESS_ID = 'dsh';
