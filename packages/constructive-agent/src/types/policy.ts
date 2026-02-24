import type { AgentRunRecord } from './run-state';
import type {
  AgentToolDefinition,
  ToolInvocationRequest,
  ToolRiskClass,
} from './tools';

export type PolicyAction = 'allow' | 'deny' | 'needs_approval';

export interface PolicyDecision {
  action: PolicyAction;
  reason: string;
  riskClass: ToolRiskClass;
  metadata?: Record<string, unknown>;
}

export interface PolicyEvaluationContext {
  run: AgentRunRecord;
  tool: AgentToolDefinition;
  invocation: ToolInvocationRequest;
}

export interface PolicyEngine {
  evaluate(context: PolicyEvaluationContext): Promise<PolicyDecision>;
}
