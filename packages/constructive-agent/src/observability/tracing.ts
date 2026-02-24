export interface TraceContext {
  runId: string;
  turnId?: string;
  toolCallId?: string;
  requestId?: string;
}

export type AgentTraceEventType =
  | 'run_start'
  | 'run_resume'
  | 'run_abort'
  | 'run_end'
  | 'turn_start'
  | 'turn_end'
  | 'tool_execution_start'
  | 'tool_execution_end'
  | 'policy_decision'
  | 'approval_decision';

export interface AgentTraceEvent {
  type: AgentTraceEventType;
  timestamp: number;
  context: TraceContext;
  attributes?: Record<string, unknown>;
}

export interface TraceSink {
  record(event: AgentTraceEvent): Promise<void> | void;
}

export class NoopTraceSink implements TraceSink {
  record(_event: AgentTraceEvent): void {
    // no-op
  }
}

export class InMemoryTraceSink implements TraceSink {
  private readonly events: AgentTraceEvent[] = [];

  record(event: AgentTraceEvent): void {
    this.events.push(event);
  }

  list(): AgentTraceEvent[] {
    return this.events.slice();
  }

  clear(): void {
    this.events.length = 0;
  }
}

export function formatTraceContext(context: TraceContext): string {
  const parts = [
    `run=${context.runId}`,
    context.turnId ? `turn=${context.turnId}` : null,
    context.toolCallId ? `toolCall=${context.toolCallId}` : null,
    context.requestId ? `request=${context.requestId}` : null,
  ].filter(Boolean);

  return parts.join(' ');
}

export const ensureTraceSink = (sink?: TraceSink): TraceSink => {
  return sink || new NoopTraceSink();
};
