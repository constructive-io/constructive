import type { CapabilityTag, ToolRiskClass } from './tools';

export type ApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'applied';

export interface ApprovalRequestRecord {
  id: string;
  runId: string;
  toolName: string;
  capability: CapabilityTag;
  riskClass: ToolRiskClass;
  argsHash: string;
  argsRedacted: Record<string, unknown>;
  reason: string;
  status: ApprovalStatus;
  requestedAt: number;
  decidedAt?: number;
  decidedBy?: string;
  decisionReason?: string;
  appliedAt?: number;
}

export type ApprovalDecision = 'approved' | 'rejected';

export interface ApprovalDecisionInput {
  requestId: string;
  decision: ApprovalDecision;
  decidedBy: string;
  reason?: string;
}

