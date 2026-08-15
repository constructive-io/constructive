/**
 * Tool and approval projection: run log records → the state a UI needs to know
 * what is running and what is waiting on a human.
 *
 * Approvals ride in the log as pi `custom` messages rather than a side channel,
 * because "the run is blocked on you" is part of the run's history: a surface
 * that reconnects hours later must be able to see a pending request without
 * having been present when it was raised, and both placements then behave the
 * same — the cloud already treats the conversation as the approval UI.
 */

import { contentText, isAssistantMessage, isPiMessageEntry, isToolResultMessage, toolCalls } from '../pi-entry';
import type { RunEventRecord } from '../record';

/** `customType` of an approval request written by the gate extension. */
export const APPROVAL_REQUEST_TYPE = 'constructive.approval.request';
/** `customType` of the human's answer to a request. */
export const APPROVAL_RESOLUTION_TYPE = 'constructive.approval.resolution';
/**
 * `customType` of a settled gate decision.
 *
 * Unlike an approval, this is written for *every* decision including the ones
 * no human saw: a policy rule that denies a tool call is otherwise invisible in
 * the log, leaving "which tool calls did the gate block" unanswerable.
 */
export const GATE_DECISION_TYPE = 'constructive.gate.decision';

export type ToolCallStatus = 'requested' | 'awaiting-approval' | 'rejected' | 'running' | 'completed' | 'failed';

export interface ToolCallState {
  toolCallId: string;
  name: string;
  arguments: Record<string, unknown>;
  status: ToolCallStatus;
  requestedSeq: number;
  settledSeq?: number;
  output?: string;
  approval?: ApprovalState;
}

export interface ApprovalState {
  toolCallId: string;
  requestedSeq: number;
  prompt: string;
  resolvedSeq?: number;
  decision?: 'approved' | 'rejected';
  reason?: string;
  actorId?: string;
}

/** A settled gate decision as it is carried in the log. */
export interface GateDecisionDetails {
  toolCallId: string;
  toolName: string;
  /** What the policy said: `allow`, `deny` or `ask`. */
  verdict: string;
  /** How the call was finally settled — `ask` resolves to one of these. */
  decision: 'allow' | 'deny';
  reason?: string;
  actorId?: string;
  decidedAt?: string;
}

export interface GateDecisionState extends GateDecisionDetails {
  seq: number;
}

export interface ToolStateProjection {
  tools: Record<string, ToolCallState>;
  /** Settled gate decisions in log order, keyed by tool call id. */
  gateDecisions: Record<string, GateDecisionState>;
  /** In log order — the oldest unanswered request first. */
  pendingApprovals: ApprovalState[];
}

interface ApprovalDetails {
  toolCallId?: unknown;
  decision?: unknown;
  reason?: unknown;
  actorId?: unknown;
}

interface GateDetails extends ApprovalDetails {
  toolName?: unknown;
  verdict?: unknown;
  decidedAt?: unknown;
}

/** Where a bad entry is, when the caller is projecting a log rather than validating one value. */
const at = (seq?: number): string => (seq === undefined ? '' : ` at seq ${String(seq)}`);

const details = (value: unknown): GateDetails =>
  typeof value === 'object' && value !== null ? (value as GateDetails) : {};

export function projectToolState(records: readonly RunEventRecord[]): ToolStateProjection {
  const tools: Record<string, ToolCallState> = {};
  const approvals = new Map<string, ApprovalState>();
  const gateDecisions: Record<string, GateDecisionState> = {};

  for (const { entry, seq } of records) {
    if (!isPiMessageEntry(entry)) continue;
    const message = entry.message;

    if (isAssistantMessage(message)) {
      for (const call of toolCalls(message)) {
        tools[call.id] = {
          toolCallId: call.id,
          name: call.name,
          arguments: call.arguments ?? {},
          status: 'requested',
          requestedSeq: seq
        };
      }
      continue;
    }

    if (isToolResultMessage(message)) {
      const state = tools[message.toolCallId];
      const settled: Partial<ToolCallState> = {
        status: message.isError ? 'failed' : 'completed',
        settledSeq: seq,
        output: contentText(message.content)
      };
      tools[message.toolCallId] = state
        ? { ...state, ...settled }
        : {
          toolCallId: message.toolCallId,
          name: message.toolName,
          arguments: {},
          requestedSeq: seq,
          status: settled.status as ToolCallStatus,
          settledSeq: seq,
          output: settled.output as string
        };
      continue;
    }

    if (message.role !== 'custom') continue;

    if (message.customType === APPROVAL_REQUEST_TYPE) {
      const { toolCallId } = assertApprovalRequestDetails(message.details, seq);
      const approval: ApprovalState = {
        toolCallId,
        requestedSeq: seq,
        prompt: contentText(message.content)
      };
      approvals.set(toolCallId, approval);
      const state = tools[toolCallId];
      if (state) tools[toolCallId] = { ...state, status: 'awaiting-approval', approval };
      continue;
    }

    if (message.customType === APPROVAL_RESOLUTION_TYPE) {
      const info = assertApprovalResolutionDetails(message.details, seq);
      const toolCallId = info.toolCallId;
      const approved = info.decision === 'approved';
      const existing = approvals.get(toolCallId);
      const approval: ApprovalState = {
        ...(existing ?? { toolCallId, requestedSeq: seq, prompt: '' }),
        resolvedSeq: seq,
        decision: info.decision,
        ...(info.reason === undefined ? {} : { reason: info.reason }),
        ...(info.actorId === undefined ? {} : { actorId: info.actorId })
      };
      approvals.set(toolCallId, approval);
      const state = tools[toolCallId];
      if (state && state.status === 'awaiting-approval') {
        tools[toolCallId] = { ...state, status: approved ? 'running' : 'rejected', approval };
      } else if (state) {
        tools[toolCallId] = { ...state, approval };
      }
      continue;
    }

    if (message.customType === GATE_DECISION_TYPE) {
      const decision = assertGateDecisionDetails(message.details, seq);
      gateDecisions[decision.toolCallId] = { ...decision, seq };
      const state = tools[decision.toolCallId];
      // A blocked call never produces a tool result, so the gate's `deny` is the
      // only thing that will ever settle it.
      if (state && decision.decision === 'deny' && state.settledSeq === undefined) {
        tools[decision.toolCallId] = {
          ...state,
          status: 'rejected',
          settledSeq: seq,
          ...(decision.reason === undefined ? {} : { output: decision.reason })
        };
      }
    }
  }

  const pendingApprovals = Array.from(approvals.values())
    .filter((approval) => approval.resolvedSeq === undefined)
    .sort((a, b) => a.requestedSeq - b.requestedSeq);

  return { tools, gateDecisions, pendingApprovals };
}

/** Narrow the `details` of a `constructive.gate.decision` entry. */
export function assertGateDecisionDetails(value: unknown, seq?: number): GateDecisionDetails {
  const info = details(value);
  const toolCallId = typeof info.toolCallId === 'string' ? info.toolCallId : null;
  if (!toolCallId) {
    throw new TypeError(`gate decision${at(seq)} carries no toolCallId; the run log cannot attribute it`);
  }
  if (info.decision !== 'allow' && info.decision !== 'deny') {
    throw new TypeError(`gate decision${at(seq)} must settle to "allow" or "deny"`);
  }
  return {
    toolCallId,
    toolName: typeof info.toolName === 'string' ? info.toolName : '',
    verdict: typeof info.verdict === 'string' ? info.verdict : info.decision,
    decision: info.decision,
    ...(typeof info.reason === 'string' ? { reason: info.reason } : {}),
    ...(typeof info.actorId === 'string' ? { actorId: info.actorId } : {}),
    ...(typeof info.decidedAt === 'string' ? { decidedAt: info.decidedAt } : {})
  };
}

/** Narrow the `details` of a `constructive.approval.request` entry. */
export function assertApprovalRequestDetails(value: unknown, seq?: number): { toolCallId: string } {
  const info = details(value);
  if (typeof info.toolCallId !== 'string' || info.toolCallId.length === 0) {
    throw new TypeError(`approval request${at(seq)} carries no toolCallId; the run log cannot attribute it`);
  }
  return { toolCallId: info.toolCallId };
}

/** Narrow the `details` of a `constructive.approval.resolution` entry. */
export function assertApprovalResolutionDetails(value: unknown, seq?: number): ApprovalResolutionInput {
  const info = details(value);
  if (typeof info.toolCallId !== 'string' || info.toolCallId.length === 0) {
    throw new TypeError(`approval resolution${at(seq)} carries no toolCallId; the run log cannot attribute it`);
  }
  if (info.decision !== 'approved' && info.decision !== 'rejected') {
    throw new TypeError(`approval resolution${at(seq)} must decide "approved" or "rejected"`);
  }
  return {
    toolCallId: info.toolCallId,
    decision: info.decision,
    ...(typeof info.reason === 'string' ? { reason: info.reason } : {}),
    ...(typeof info.actorId === 'string' ? { actorId: info.actorId } : {})
  };
}

/** The parts of an approval request an extension needs to write one. */
export interface ApprovalRequestInput {
  toolCallId: string;
  prompt: string;
}

export interface ApprovalResolutionInput {
  toolCallId: string;
  decision: 'approved' | 'rejected';
  reason?: string;
  actorId?: string;
}

/** Build the pi `custom` message an approval request is carried in. */
export const approvalRequestMessage = (input: ApprovalRequestInput) => ({
  role: 'custom' as const,
  customType: APPROVAL_REQUEST_TYPE,
  content: input.prompt,
  display: true,
  details: { toolCallId: input.toolCallId },
  timestamp: Date.now()
});

/** Build the pi `custom` message a settled gate decision is carried in. */
export const gateDecisionMessage = (input: GateDecisionDetails) => ({
  role: 'custom' as const,
  customType: GATE_DECISION_TYPE,
  content: `gate ${input.decision}: ${input.toolName}${input.reason ? ` — ${input.reason}` : ''}`,
  // The model already learned of a denial through the blocked call's error; a
  // second telling would only spend context.
  display: false,
  details: {
    toolCallId: input.toolCallId,
    toolName: input.toolName,
    verdict: input.verdict,
    decision: input.decision,
    ...(input.reason ? { reason: input.reason } : {}),
    ...(input.actorId ? { actorId: input.actorId } : {}),
    ...(input.decidedAt ? { decidedAt: input.decidedAt } : {})
  },
  timestamp: Date.now()
});

/** Build the pi `custom` message a human's answer is carried in. */
export const approvalResolutionMessage = (input: ApprovalResolutionInput) => ({
  role: 'custom' as const,
  customType: APPROVAL_RESOLUTION_TYPE,
  content: input.reason ?? input.decision,
  display: true,
  details: {
    toolCallId: input.toolCallId,
    decision: input.decision,
    ...(input.reason ? { reason: input.reason } : {}),
    ...(input.actorId ? { actorId: input.actorId } : {})
  },
  timestamp: Date.now()
});
