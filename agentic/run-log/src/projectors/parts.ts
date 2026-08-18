/**
 * Renderable projection: run log records → an ordered list of parts a UI draws.
 *
 * This is the projection that replaces per-host transcript encodings. It reads
 * neutral transcript events rather than any harness's entries, so a renderer
 * draws a run without knowing which harness produced it. A tool call and its
 * later result collapse into one part, so a renderer never has to correlate two
 * messages itself, and an entry the format's reader does not understand becomes
 * an `unknown` part rather than disappearing — a log written by a newer harness
 * still renders, minus the detail this version understands.
 */

import type { RunEventRecord } from '../record';
import type { TranscriptEntry } from '../transcripts/entry';
import { type ProjectionOptions, toEvents } from './events';

export type ToolStatus = 'requested' | 'completed' | 'failed';

export interface PartBase {
  /** Sequence of the record that introduced the part — a stable React key. */
  seq: number;
  entryId?: string;
}

export interface TextPart extends PartBase {
  kind: 'text';
  role: 'user' | 'assistant';
  text: string;
  model?: string;
  provider?: string;
}

export interface ThinkingPart extends PartBase {
  kind: 'thinking';
  text: string;
}

export interface ToolPart extends PartBase {
  kind: 'tool';
  toolCallId: string;
  name: string;
  arguments: Record<string, unknown>;
  status: ToolStatus;
  /** Text of the tool result, once one has been logged. */
  output?: string;
  details?: unknown;
  /** Sequence of the record that settled the call. */
  settledSeq?: number;
}

export interface BashPart extends PartBase {
  kind: 'bash';
  command: string;
  output: string;
  exitCode?: number;
}

export interface CustomPart extends PartBase {
  kind: 'custom';
  customType: string;
  text: string;
  display: boolean;
  details?: unknown;
}

export interface SummaryPart extends PartBase {
  kind: 'summary';
  reason: 'compaction' | 'branch';
  summary: string;
}

export interface UnknownPart extends PartBase {
  kind: 'unknown';
  entryType: string;
  entry: TranscriptEntry;
}

export type ConversationPart =
  | TextPart
  | ThinkingPart
  | ToolPart
  | BashPart
  | CustomPart
  | SummaryPart
  | UnknownPart;

export interface Conversation {
  parts: ConversationPart[];
  /** From the transcript's opening entry, when the log carries one. */
  sessionId?: string;
  cwd?: string;
}

/**
 * Project records into a conversation. Pure and total: the same records always
 * produce the same parts, whichever harness wrote them.
 */
export function projectParts(
  records: readonly RunEventRecord[],
  options: ProjectionOptions = {}
): Conversation {
  const parts: ConversationPart[] = [];
  const toolsByCallId = new Map<string, ToolPart>();
  let sessionId: string | undefined;
  let cwd: string | undefined;

  for (const { seq, event } of toEvents(records, options)) {
    const base = { seq, ...(event.entryId === undefined ? {} : { entryId: event.entryId }) };

    switch (event.kind) {
    case 'session-start':
      if (event.sessionId !== undefined) sessionId = event.sessionId;
      if (event.cwd !== undefined) cwd = event.cwd;
      break;

      // A model call is a trace and metering concern; its content arrives as the
      // text and tool-call events that follow it.
    case 'model-response':
      break;

    case 'text':
      parts.push({
        kind: 'text',
        role: event.role,
        text: event.text,
        ...(event.model ? { model: event.model } : {}),
        ...(event.provider ? { provider: event.provider } : {}),
        ...base
      });
      break;

    case 'thinking':
      parts.push({ kind: 'thinking', text: event.text, ...base });
      break;

    case 'tool-call': {
      const part: ToolPart = {
        kind: 'tool',
        toolCallId: event.toolCallId,
        name: event.name,
        arguments: event.arguments,
        status: 'requested',
        ...base
      };
      toolsByCallId.set(event.toolCallId, part);
      parts.push(part);
      break;
    }

    case 'tool-result': {
      const existing = toolsByCallId.get(event.toolCallId);
      const status: ToolStatus = event.failed ? 'failed' : 'completed';
      if (existing) {
        existing.status = status;
        existing.output = event.output;
        existing.settledSeq = seq;
        if (event.details !== undefined) existing.details = event.details;
      } else {
        // A result whose call is not in this window (paged read, forked branch).
        parts.push({
          kind: 'tool',
          toolCallId: event.toolCallId,
          name: event.name,
          arguments: {},
          status,
          output: event.output,
          settledSeq: seq,
          ...base
        });
      }
      break;
    }

    case 'bash':
      parts.push({
        kind: 'bash',
        command: event.command,
        output: event.output,
        ...(event.exitCode === undefined ? {} : { exitCode: event.exitCode }),
        ...base
      });
      break;

    case 'custom':
      parts.push({
        kind: 'custom',
        customType: event.customType,
        text: event.text,
        display: event.display,
        ...(event.details === undefined ? {} : { details: event.details }),
        ...base
      });
      break;

    case 'summary':
      parts.push({ kind: 'summary', reason: event.reason, summary: event.summary, ...base });
      break;

    case 'unknown':
      parts.push({ kind: 'unknown', entryType: event.entryType, entry: event.entry, ...base });
      break;
    }
  }

  return {
    parts,
    ...(sessionId ? { sessionId } : {}),
    ...(cwd ? { cwd } : {})
  };
}
