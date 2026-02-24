import type { AgentIdentityContext } from './config';

export type CapabilityTag =
  | 'read'
  | 'write'
  | 'destructive'
  | 'admin'
  | 'integration'
  | 'unsafe';

export type ToolRiskClass = 'read_only' | 'low' | 'high' | 'destructive';

export interface ToolExecutionContext {
  runId: string;
  actorId: string;
  tenantId?: string;
  identity?: AgentIdentityContext;
  metadata?: Record<string, unknown>;
}

export interface ToolExecutionResult<TData = unknown> {
  content: TData;
  summary?: string;
  details?: Record<string, unknown>;
}

export type ToolUpdateCallback<TData = unknown> = (
  partialResult: ToolExecutionResult<TData>,
) => void;

export interface AgentToolDefinition<TArgs = unknown, TResult = unknown> {
  name: string;
  label: string;
  description: string;
  capability: CapabilityTag;
  riskClass: ToolRiskClass;
  parameters?: unknown;
  execute: (
    args: TArgs,
    context: ToolExecutionContext,
    signal?: AbortSignal,
    onUpdate?: ToolUpdateCallback<TResult>,
  ) => Promise<ToolExecutionResult<TResult>>;
}

export interface ToolInvocationRequest<TArgs = unknown> {
  toolName: string;
  args: TArgs;
}
