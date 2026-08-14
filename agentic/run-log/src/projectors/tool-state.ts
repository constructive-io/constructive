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

export interface ToolStateProjection {
  tools: Record<string, ToolCallState>;
  /** In log order — the oldest unanswered request first. */
  pendingApprovals: ApprovalState[];
}

interface ApprovalDetails {
  toolCallId?: unknown;
  decision?: unknown;
  reason?: unknown;
  actorId?: unknown;
}

const details = (value: unknown): ApprovalDetails =>
  typeof value === 'object' && value !== null ? (value as ApprovalDetails) : {};

export function projectToolState(records: readonly RunEventRecord[]): ToolStateProjection {
  const tools: Record<string, ToolCallState> = {};
  const approvals = new Map<string, ApprovalState>();

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
      const info = details(message.details);
      const toolCallId = typeof info.toolCallId === 'string' ? info.toolCallId : null;
      if (!toolCallId) {
        throw new Error(
          `approval request at seq ${String(seq)} carries no toolCallId; the run log cannot attribute it`
        );
      }
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
      const info = details(message.details);
      const toolCallId = typeof info.toolCallId === 'string' ? info.toolCallId : null;
      if (!toolCallId) {
        throw new Error(
          `approval resolution at seq ${String(seq)} carries no toolCallId; the run log cannot attribute it`
        );
      }
      const approved = info.decision === 'approved';
      const existing = approvals.get(toolCallId);
      const approval: ApprovalState = {
        ...(existing ?? { toolCallId, requestedSeq: seq, prompt: '' }),
        resolvedSeq: seq,
        decision: approved ? 'approved' : 'rejected',
        ...(typeof info.reason === 'string' ? { reason: info.reason } : {}),
        ...(typeof info.actorId === 'string' ? { actorId: info.actorId } : {})
      };
      approvals.set(toolCallId, approval);
      const state = tools[toolCallId];
      if (state && state.status === 'awaiting-approval') {
        tools[toolCallId] = { ...state, status: approved ? 'running' : 'rejected', approval };
      } else if (state) {
        tools[toolCallId] = { ...state, approval };
      }
    }
  }

  const pendingApprovals = Array.from(approvals.values())
    .filter((approval) => approval.resolvedSeq === undefined)
    .sort((a, b) => a.requestedSeq - b.requestedSeq);

  return { tools, pendingApprovals };
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
