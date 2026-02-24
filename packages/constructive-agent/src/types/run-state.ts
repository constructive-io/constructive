export type RunStatus =
  | 'queued'
  | 'running'
  | 'needs_approval'
  | 'completed'
  | 'failed'
  | 'aborted';

export interface AgentRunRecord {
  id: string;
  status: RunStatus;
  actorId: string;
  tenantId?: string;
  modelProvider: string;
  modelName: string;
  startedAt: number;
  endedAt?: number;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}
