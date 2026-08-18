/**
 * Span projection: run log records → timed intervals with parents.
 *
 * The log answers *what* happened and the parts projection answers *in what
 * order*, but a trace view asks "how long did this take, and inside what" —
 * questions a transcript only answers in pairs. Every entry is timestamped, so a
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
import type { TranscriptUsage } from '../transcripts/event';
import { type ProjectionOptions, toEventGroups } from './events';
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
  /** The provider's response id — the join key to a metered inference row. */
  responseId?: string;
  stopReason?: string;
  usage?: TranscriptUsage;
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

const firstTimestamp = (events: readonly { at?: string }[]): string | undefined =>
  events.find((event) => typeof event.at === 'string')?.at;

/**
 * Project records into spans. Pure, and like the other projectors it ignores what
 * it does not recognise — a log written by a newer harness still traces. A
 * *registered* type that is malformed is another matter and throws: a gate
 * decision naming no tool call is a writer bug, and a trace that quietly omitted
 * a refusal would be worse than one that fails.
 */
export function projectSpans(
  records: readonly RunEventRecord[],
  options: ProjectionOptions = {}
): SpanProjection {
  const spans: Span[] = [];
  const tools = new Map<string, ToolSpan>();
  const approvals = new Map<string, ApprovalSpan>();
  /**
   * The end of the previous entry, which is the earliest the next model call
   * can have begun — a transcript logs a response, never a request.
   */
  let previousAt: string | undefined;

  for (const { events, seq } of toEventGroups(records, options)) {
    const at = firstTimestamp(events);
    if (at === undefined) continue;
    const previous = previousAt;
    previousAt = at;
    /** The model call the entry's tool calls belong to. */
    let modelSpan: ModelSpan | undefined;

    for (const event of events) {
      if (event.kind === 'model-response') {
        const span: ModelSpan = {
          id: `model:${event.entryId ?? String(seq)}`,
          kind: 'model',
          name: event.model ?? 'model',
          // The turn began no earlier than the previous entry was written; with
          // no previous entry the interval is unknown and the span is a point.
          startedAt: previous ?? at,
          startSeq: seq,
          endSeq: seq,
          endedAt: at,
          timing: 'bounded',
          status: event.stopReason === 'error' ? 'error' : 'ok',
          ...(event.model ? { model: event.model } : {}),
          ...(event.provider ? { provider: event.provider } : {}),
          ...(event.responseId ? { responseId: event.responseId } : {}),
          ...(event.stopReason ? { stopReason: event.stopReason } : {}),
          ...(event.usage ? { usage: event.usage } : {}),
          ...(event.errorMessage ? { errorMessage: event.errorMessage } : {})
        };
        const duration = ms(span.startedAt, at);
        if (duration !== undefined) span.durationMs = duration;
        modelSpan = span;
        spans.push(span);
        continue;
      }

      if (event.kind === 'tool-call') {
        const tool: ToolSpan = {
          id: `tool:${event.toolCallId}`,
          kind: 'tool',
          name: event.name,
          ...(modelSpan ? { parentId: modelSpan.id } : {}),
          toolCallId: event.toolCallId,
          arguments: event.arguments,
          startedAt: at,
          startSeq: seq,
          // A call and its result are two writes; anything between them —
          // approval, queueing — is inside the interval.
          timing: 'bounded',
          status: 'open'
        };
        tools.set(event.toolCallId, tool);
        spans.push(tool);
        continue;
      }

      if (event.kind === 'tool-result') {
        const tool = tools.get(event.toolCallId);
        if (!tool) continue;
        close(tool, seq, at);
        tool.status = event.failed ? 'error' : 'ok';
        tool.output = event.output;
        if (event.details !== undefined) tool.details = event.details;
        const approval = approvals.get(event.toolCallId);
        if (approval?.durationMs !== undefined) tool.approvalWaitMs = approval.durationMs;
        continue;
      }

      if (event.kind !== 'custom') continue;
      const info = detailsOf(event.details);
      const toolCallId = typeof info.toolCallId === 'string' ? info.toolCallId : undefined;
      if (toolCallId === undefined) continue;

      if (event.customType === APPROVAL_REQUEST_TYPE) {
        const tool = tools.get(toolCallId);
        const approval: ApprovalSpan = {
          id: `approval:${toolCallId}`,
          kind: 'approval',
          name: tool?.name ?? 'approval',
          ...(tool ? { parentId: tool.id } : {}),
          toolCallId,
          prompt: event.text,
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

      if (event.customType === APPROVAL_RESOLUTION_TYPE) {
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

      if (event.customType === GATE_DECISION_TYPE) {
        // Throws on a malformed decision — see the note on this function.
        const decision = assertGateDecisionDetails(event.details, seq);
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
  }

  return { spans };
}
