/**
 * Renderable projection: run log records → an ordered list of parts a UI draws.
 *
 * This is the projection that replaces per-host transcript encodings. A tool
 * call and its later result collapse into one part, so a renderer never has to
 * correlate two messages itself, and an unknown entry type becomes an
 * `unknown` part rather than disappearing — a log written by a newer pi still
 * renders, minus the detail this version understands.
 */

import type { RunEventRecord } from '../record';
import {
  contentText,
  isAssistantMessage,
  isPiBranchSummaryEntry,
  isPiCompactionEntry,
  isPiMessageEntry,
  isPiSessionHeader,
  isToolResultMessage,
  type PiSessionEntry,
  toolCalls
} from '../transcripts/pi-entry';

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
  entry: PiSessionEntry;
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
  /** From the session header, when the log carries one. */
  sessionId?: string;
  cwd?: string;
}

/**
 * Project records into a conversation. Pure and total: the same records always
 * produce the same parts, whichever host wrote them.
 */
export function projectParts(records: readonly RunEventRecord[]): Conversation {
  const parts: ConversationPart[] = [];
  const toolsByCallId = new Map<string, ToolPart>();
  let sessionId: string | undefined;
  let cwd: string | undefined;

  for (const record of records) {
    const { entry, seq } = record;

    if (isPiSessionHeader(entry)) {
      sessionId = entry.id;
      if (typeof entry.cwd === 'string') cwd = entry.cwd;
      continue;
    }

    if (isPiCompactionEntry(entry)) {
      parts.push({ kind: 'summary', reason: 'compaction', summary: entry.summary, seq, entryId: entry.id });
      continue;
    }

    if (isPiBranchSummaryEntry(entry)) {
      parts.push({ kind: 'summary', reason: 'branch', summary: entry.summary, seq, entryId: entry.id });
      continue;
    }

    if (!isPiMessageEntry(entry)) {
      parts.push({ kind: 'unknown', entryType: entry.type, entry, seq, entryId: (entry as { id?: string }).id });
      continue;
    }

    const message = entry.message;
    const base = { seq, entryId: entry.id };

    if (message.role === 'user') {
      parts.push({ kind: 'text', role: 'user', text: contentText(message.content), ...base });
      continue;
    }

    if (isAssistantMessage(message)) {
      for (const block of Array.isArray(message.content) ? message.content : []) {
        if (block.type === 'text' && block.text.length > 0) {
          parts.push({
            kind: 'text',
            role: 'assistant',
            text: block.text,
            ...(message.model ? { model: message.model } : {}),
            ...(message.provider ? { provider: message.provider } : {}),
            ...base
          });
        } else if (block.type === 'thinking') {
          parts.push({ kind: 'thinking', text: block.thinking, ...base });
        }
      }
      for (const call of toolCalls(message)) {
        const part: ToolPart = {
          kind: 'tool',
          toolCallId: call.id,
          name: call.name,
          arguments: call.arguments ?? {},
          status: 'requested',
          ...base
        };
        toolsByCallId.set(call.id, part);
        parts.push(part);
      }
      continue;
    }

    if (isToolResultMessage(message)) {
      const existing = toolsByCallId.get(message.toolCallId);
      const output = contentText(message.content);
      const status: ToolStatus = message.isError ? 'failed' : 'completed';
      if (existing) {
        existing.status = status;
        existing.output = output;
        existing.settledSeq = seq;
        if (message.details !== undefined) existing.details = message.details;
      } else {
        // A result whose call is not in this window (paged read, forked branch).
        parts.push({
          kind: 'tool',
          toolCallId: message.toolCallId,
          name: message.toolName,
          arguments: {},
          status,
          output,
          settledSeq: seq,
          ...base
        });
      }
      continue;
    }

    if (message.role === 'bashExecution') {
      parts.push({
        kind: 'bash',
        command: message.command,
        output: message.output,
        ...(typeof message.exitCode === 'number' ? { exitCode: message.exitCode } : {}),
        ...base
      });
      continue;
    }

    if (message.role === 'custom') {
      parts.push({
        kind: 'custom',
        customType: message.customType,
        text: contentText(message.content),
        display: message.display !== false,
        ...(message.details !== undefined ? { details: message.details } : {}),
        ...base
      });
      continue;
    }

    parts.push({
      kind: 'summary',
      reason: message.role === 'branchSummary' ? 'branch' : 'compaction',
      summary: (message as { summary?: string }).summary ?? '',
      ...base
    });
  }

  return {
    parts,
    ...(sessionId ? { sessionId } : {}),
    ...(cwd ? { cwd } : {})
  };
}
