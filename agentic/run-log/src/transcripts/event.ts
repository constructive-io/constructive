/**
 * The neutral vocabulary every projector reads.
 *
 * A projector used to know pi's message shapes, which made "render a run" and
 * "read pi" the same capability. An event is what a transcript entry *means* —
 * a model answered, a tool was called, a human was asked — so a format is
 * understood in exactly one place (its `TranscriptReader`) and rendering,
 * tracing and usage folding stop caring which harness ran.
 *
 * Kept close to what the projectors need rather than to any one harness: pi's
 * `message`/`toolResult`/`custom` entries and DeepSeek Harness's
 * `assistant/message`, `tool/call`, `tool/result` events both land here without
 * either format's naming surviving the trip.
 */

import type { TranscriptEntry } from './entry';

/** Tokens and cost as a transcript reports them — all fields optional. */
export interface TranscriptUsage {
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheWrite?: number;
  totalTokens?: number;
  cost?: { total?: number; [key: string]: unknown };
  [key: string]: unknown;
}

export interface TranscriptEventBase {
  /** The entry's id in its own transcript, when the format gives entries ids. */
  entryId?: string;
  /** The entry's ISO timestamp, when it carries one. */
  at?: string;
}

/** The transcript's opening entry: which session, and where it ran. */
export interface SessionStartEvent extends TranscriptEventBase {
  kind: 'session-start';
  sessionId?: string;
  cwd?: string;
}

export interface TextEvent extends TranscriptEventBase {
  kind: 'text';
  role: 'user' | 'assistant';
  text: string;
  model?: string;
  provider?: string;
}

export interface ThinkingEvent extends TranscriptEventBase {
  kind: 'thinking';
  text: string;
}

/**
 * A model finished answering. Separate from the text it produced because a
 * trace and a usage total ask about the *call* — which model, what it cost, why
 * it stopped — while a renderer asks about the content.
 */
export interface ModelResponseEvent extends TranscriptEventBase {
  kind: 'model-response';
  model?: string;
  provider?: string;
  /** The provider's response id — the join key to a metered inference row. */
  responseId?: string;
  stopReason?: string;
  usage?: TranscriptUsage;
  errorMessage?: string;
}

export interface ToolCallEvent extends TranscriptEventBase {
  kind: 'tool-call';
  toolCallId: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResultEvent extends TranscriptEventBase {
  kind: 'tool-result';
  toolCallId: string;
  name: string;
  output: string;
  failed: boolean;
  details?: unknown;
  /** Nested model work the tool itself paid for. */
  usage?: TranscriptUsage;
}

export interface BashEvent extends TranscriptEventBase {
  kind: 'bash';
  command: string;
  output: string;
  exitCode?: number;
}

/**
 * A platform entry riding in the transcript — an approval request, a gate
 * decision — discriminated by `customType` and interpreted by the entry-type
 * registry rather than by a format's reader.
 */
export interface CustomEvent extends TranscriptEventBase {
  kind: 'custom';
  customType: string;
  text: string;
  /** Whether the entry is part of the conversation a human is shown. */
  display: boolean;
  details?: unknown;
}

export interface SummaryEvent extends TranscriptEventBase {
  kind: 'summary';
  reason: 'compaction' | 'branch';
  summary: string;
  usage?: TranscriptUsage;
}

/**
 * An entry this reader does not understand. Carried rather than dropped: a log
 * written by a newer harness still renders, minus the detail this version
 * knows, and a projector never silently loses a row.
 */
export interface UnknownEvent extends TranscriptEventBase {
  kind: 'unknown';
  entryType: string;
  entry: TranscriptEntry;
}

export type TranscriptEvent =
  | SessionStartEvent
  | TextEvent
  | ThinkingEvent
  | ModelResponseEvent
  | ToolCallEvent
  | ToolResultEvent
  | BashEvent
  | CustomEvent
  | SummaryEvent
  | UnknownEvent;
