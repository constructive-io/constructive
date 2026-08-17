/**
 * Span projection: run log records → timed intervals with parents.
 *
 * The log answers *what* happened and the parts projection answers *in what
 * order*, but a trace view asks "how long did this take, and inside what" —
 * questions pi's entries only answer in pairs. Every entry is timestamped, so a
 * tool call and its result, or an approval request and its answer, bracket an
 * interval; nothing new has to be stored to know it.
 *
 * Two honesty rules shape the output. A duration derived from a *pair of writes*
 * is a bound, not a measurement — the gap between a tool call and its result
 * includes the wait for a human — so every span says which it is via `timing`,
 * and a tool span carries its approval wait separately so a renderer can show
 * "blocked on you" apart from "running". And an interval that never closed stays
 * `open` with no duration rather than being closed at the last record: a run
 * still in flight must not look like one that finished.
 */

import type { RunEventRecord } from '../record';
import {
  contentText,
  isAssistantMessage,
  isPiMessageEntry,
  isToolResultMessage,
  type PiUsage,
  toolCalls
} from '../transcripts/pi-entry';
import {
  APPROVAL_REQUEST_TYPE,
  APPROVAL_RESOLUTION_TYPE,
  assertGateDecisionDetails,
  GATE_DECISION_TYPE
} from './tool-state';

export type SpanKind = 'model' | 'tool' | 'approval';

export type SpanStatus = 'open' | 'ok' | 'error' | 'denied';

/**
 * Whether the duration is the interval that was measured, or a bound that
 * includes whatever else sat between the two writes.
 */
export type SpanTiming = 'measured' | 'bounded';

export interface SpanBase {
  /** Stable within a run — a renderer's key and a parent reference. */
  id: string;
  kind: SpanKind;
  /** Row title: the tool name, the model, or the awaited tool. */
  name: string;
  parentId?: string;
  startSeq: number;
  /** Absent while the span is still open. */
  endSeq?: number;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  timing: SpanTiming;
  status: SpanStatus;
}

export interface ModelSpan extends SpanBase {
  kind: 'model';
  model?: string;
  provider?: string;
  /** pi's provider response id — the join key to a metered inference row. */
  responseId?: string;
  stopReason?: string;
  usage?: PiUsage;
  errorMessage?: string;
}

export interface ToolSpan extends SpanBase {
  kind: 'tool';
  toolCallId: string;
  arguments: Record<string, unknown>;
  output?: string;
  details?: unknown;
  /** Of the total duration, how much was spent waiting on a human. */
  approvalWaitMs?: number;
  /** Set when the gate settled the call instead of an execution. */
  gateDecision?: 'allow' | 'deny';
  gateReason?: string;
}

export interface ApprovalSpan extends SpanBase {
  kind: 'approval';
  toolCallId: string;
  prompt: string;
  decision?: 'approved' | 'rejected';
  actorId?: string;
}

export type Span = ModelSpan | ToolSpan | ApprovalSpan;

export interface SpanProjection {
  /** In start order — the order a timeline draws them. */
  spans: Span[];
}

const ms = (from: string, to: string): number | undefined => {
  const start = Date.parse(from);
  const end = Date.parse(to);
  if (Number.isNaN(start) || Number.isNaN(end)) return undefined;
  return end - start;
};

const close = (span: Span, seq: number, at: string): void => {
  span.endSeq = seq;
  span.endedAt = at;
  const duration = ms(span.startedAt, at);
  if (duration !== undefined) span.durationMs = duration;
};

const detailsOf = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

/**
 * Project records into spans. Pure, and like the other projectors it ignores what
 * it does not recognise — a log written by a newer pi still traces. A *registered*
 * type that is malformed is another matter and throws: a gate decision naming no
 * tool call is a writer bug, and a trace that quietly omitted a refusal would be
 * worse than one that fails.
 */
export function projectSpans(records: readonly RunEventRecord[]): SpanProjection {
  const spans: Span[] = [];
  const tools = new Map<string, ToolSpan>();
  const approvals = new Map<string, ApprovalSpan>();
  /**
   * The end of the previous entry, which is the earliest the next model call
   * can have begun — pi logs a response, never a request.
   */
  let previousAt: string | undefined;

  for (const { entry, seq } of records) {
    const at = typeof entry.timestamp === 'string' ? entry.timestamp : undefined;
    if (at === undefined) continue;
    const previous = previousAt;
    previousAt = at;

    if (!isPiMessageEntry(entry)) continue;
    const message = entry.message;

    if (isAssistantMessage(message)) {
      const span: ModelSpan = {
        id: `model:${entry.id}`,
        kind: 'model',
        name: message.model ?? 'model',
        // The turn began no earlier than the previous entry was written; with no
        // previous entry the interval is unknown and the span is a point.
        startedAt: previous ?? at,
        startSeq: seq,
        endSeq: seq,
        endedAt: at,
        timing: 'bounded',
        status: message.stopReason === 'error' ? 'error' : 'ok',
        ...(message.model ? { model: message.model } : {}),
        ...(message.provider ? { provider: message.provider } : {}),
        ...(typeof message.responseId === 'string' ? { responseId: message.responseId } : {}),
        ...(message.stopReason ? { stopReason: message.stopReason } : {}),
        ...(message.usage ? { usage: message.usage } : {}),
        ...(message.errorMessage ? { errorMessage: message.errorMessage } : {})
      };
      const duration = ms(span.startedAt, at);
      if (duration !== undefined) span.durationMs = duration;
      spans.push(span);

      for (const call of toolCalls(message)) {
        const tool: ToolSpan = {
          id: `tool:${call.id}`,
          kind: 'tool',
          name: call.name,
          parentId: span.id,
          toolCallId: call.id,
          arguments: call.arguments ?? {},
          startedAt: at,
          startSeq: seq,
          // A call and its result are two writes; anything between them —
          // approval, queueing — is inside the interval.
          timing: 'bounded',
          status: 'open'
        };
        tools.set(call.id, tool);
        spans.push(tool);
      }
      continue;
    }

    if (isToolResultMessage(message)) {
      const tool = tools.get(message.toolCallId);
      if (!tool) continue;
      close(tool, seq, at);
      tool.status = message.isError ? 'error' : 'ok';
      tool.output = contentText(message.content);
      if (message.details !== undefined) tool.details = message.details;
      const approval = approvals.get(message.toolCallId);
      if (approval?.durationMs !== undefined) tool.approvalWaitMs = approval.durationMs;
      continue;
    }

    if (message.role !== 'custom') continue;
    const info = detailsOf(message.details);
    const toolCallId = typeof info.toolCallId === 'string' ? info.toolCallId : undefined;
    if (toolCallId === undefined) continue;

    if (message.customType === APPROVAL_REQUEST_TYPE) {
      const tool = tools.get(toolCallId);
      const approval: ApprovalSpan = {
        id: `approval:${toolCallId}`,
        kind: 'approval',
        name: tool?.name ?? 'approval',
        ...(tool ? { parentId: tool.id } : {}),
        toolCallId,
        prompt: contentText(message.content),
        startedAt: at,
        startSeq: seq,
        // Request and answer are exactly the interval a human held the run.
        timing: 'measured',
        status: 'open'
      };
      approvals.set(toolCallId, approval);
      spans.push(approval);
      continue;
    }

    if (message.customType === APPROVAL_RESOLUTION_TYPE) {
      const approval = approvals.get(toolCallId);
      if (!approval) continue;
      close(approval, seq, at);
      const approved = info.decision === 'approved';
      approval.decision = approved ? 'approved' : 'rejected';
      approval.status = approved ? 'ok' : 'denied';
      if (typeof info.actorId === 'string') approval.actorId = info.actorId;
      const tool = tools.get(toolCallId);
      if (tool && approval.durationMs !== undefined) tool.approvalWaitMs = approval.durationMs;
      continue;
    }

    if (message.customType === GATE_DECISION_TYPE) {
      // Throws on a malformed decision — see the note on this function.
      const decision = assertGateDecisionDetails(message.details, seq);
      const tool = tools.get(decision.toolCallId);
      if (!tool) continue;
      tool.gateDecision = decision.decision;
      if (decision.reason !== undefined) tool.gateReason = decision.reason;
      // A denied call is never executed, so this write is the only thing that
      // will ever close its span.
      if (decision.decision === 'deny' && tool.status === 'open') {
        close(tool, seq, at);
        tool.status = 'denied';
      }
    }
  }

  return { spans };
}
