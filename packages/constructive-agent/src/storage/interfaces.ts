import type { AgentRunEvent } from '../types/events';
import type {
  ApprovalDecisionInput,
  ApprovalRequestRecord,
} from '../types/approval';
import type { AgentRunRecord } from '../types/run-state';

export interface RunStore {
  create(run: AgentRunRecord): Promise<void>;
  get(runId: string): Promise<AgentRunRecord | null>;
  update(
    runId: string,
    patch: Partial<AgentRunRecord>,
  ): Promise<AgentRunRecord>;
}

export interface EventStore {
  append(event: AgentRunEvent): Promise<void>;
  list(runId: string): Promise<AgentRunEvent[]>;
  nextSeq(runId: string): Promise<number>;
}

export interface ApprovalStore {
  create(request: ApprovalRequestRecord): Promise<void>;
  get(requestId: string): Promise<ApprovalRequestRecord | null>;
  listByRun(runId: string): Promise<ApprovalRequestRecord[]>;
  getPendingByRun(runId: string): Promise<ApprovalRequestRecord | null>;
  findByInvocation(
    runId: string,
    toolName: string,
    argsHash: string,
  ): Promise<ApprovalRequestRecord | null>;
  decide(input: ApprovalDecisionInput): Promise<ApprovalRequestRecord>;
  markApplied(requestId: string): Promise<ApprovalRequestRecord>;
}
