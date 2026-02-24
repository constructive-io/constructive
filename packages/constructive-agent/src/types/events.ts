import type { PolicyDecision } from './policy';
import type { RunStatus } from './run-state';
import type { ApprovalDecision } from './approval';

export type RunEventType =
  | 'run_start'
  | 'run_status_changed'
  | 'turn_start'
  | 'turn_end'
  | 'tool_call_start'
  | 'tool_call_update'
  | 'tool_call_end'
  | 'policy_decision'
  | 'approval_requested'
  | 'approval_decision'
  | 'approval_applied'
  | 'run_error'
  | 'run_end';

export interface RunEventEnvelope<
  TType extends RunEventType = RunEventType,
  TPayload extends Record<string, unknown> = Record<string, unknown>,
> {
  runId: string;
  seq: number;
  type: TType;
  timestamp: number;
  payload: TPayload;
}

export type RunStartEvent = RunEventEnvelope<
  'run_start',
  {
    actorId: string;
    tenantId?: string;
    modelProvider: string;
    modelName: string;
  }
>;

export type RunStatusChangedEvent = RunEventEnvelope<
  'run_status_changed',
  {
    from: RunStatus;
    to: RunStatus;
  }
>;

export type TurnStartEvent = RunEventEnvelope<
  'turn_start',
  {
    turnId: string;
  }
>;

export type TurnEndEvent = RunEventEnvelope<
  'turn_end',
  {
    turnId: string;
    reason: 'completed' | 'tool_use' | 'error' | 'aborted';
  }
>;

export type ToolCallStartEvent = RunEventEnvelope<
  'tool_call_start',
  {
    toolCallId: string;
    toolName: string;
    capability: string;
    args?: Record<string, unknown>;
  }
>;

export type ToolCallUpdateEvent = RunEventEnvelope<
  'tool_call_update',
  {
    toolCallId: string;
    update: Record<string, unknown>;
  }
>;

export type ToolCallEndEvent = RunEventEnvelope<
  'tool_call_end',
  {
    toolCallId: string;
    toolName: string;
    success: boolean;
    result?: Record<string, unknown>;
  }
>;

export type PolicyDecisionEvent = RunEventEnvelope<
  'policy_decision',
  {
    toolName: string;
    decision: PolicyDecision;
  }
>;

export type ApprovalRequestedEvent = RunEventEnvelope<
  'approval_requested',
  {
    requestId: string;
    toolName: string;
    reason: string;
    argsRedacted: Record<string, unknown>;
  }
>;

export type ApprovalDecisionEvent = RunEventEnvelope<
  'approval_decision',
  {
    requestId: string;
    decision: ApprovalDecision;
    decidedBy: string;
    reason?: string;
  }
>;

export type ApprovalAppliedEvent = RunEventEnvelope<
  'approval_applied',
  {
    requestId: string;
    toolName: string;
  }
>;

export type RunErrorEvent = RunEventEnvelope<
  'run_error',
  {
    code: string;
    message: string;
  }
>;

export type RunEndEvent = RunEventEnvelope<
  'run_end',
  {
    status: Exclude<RunStatus, 'queued' | 'running'>;
  }
>;

export type AgentRunEvent =
  | RunStartEvent
  | RunStatusChangedEvent
  | TurnStartEvent
  | TurnEndEvent
  | ToolCallStartEvent
  | ToolCallUpdateEvent
  | ToolCallEndEvent
  | PolicyDecisionEvent
  | ApprovalRequestedEvent
  | ApprovalDecisionEvent
  | ApprovalAppliedEvent
  | RunErrorEvent
  | RunEndEvent;
