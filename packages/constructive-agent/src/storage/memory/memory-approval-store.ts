import type {
  ApprovalDecisionInput,
  ApprovalRequestRecord,
} from '../../types/approval';
import type { ApprovalStore } from '../interfaces';

export class MemoryApprovalStore implements ApprovalStore {
  private approvals = new Map<string, ApprovalRequestRecord>();
  private byRunId = new Map<string, string[]>();

  async create(request: ApprovalRequestRecord): Promise<void> {
    this.approvals.set(request.id, { ...request });

    const ids = this.byRunId.get(request.runId) || [];
    ids.push(request.id);
    this.byRunId.set(request.runId, ids);
  }

  async get(requestId: string): Promise<ApprovalRequestRecord | null> {
    const record = this.approvals.get(requestId);
    return record ? { ...record } : null;
  }

  async listByRun(runId: string): Promise<ApprovalRequestRecord[]> {
    const ids = this.byRunId.get(runId) || [];
    return ids
      .map((id) => this.approvals.get(id))
      .filter(Boolean)
      .map((record) => ({ ...(record as ApprovalRequestRecord) }));
  }

  async getPendingByRun(runId: string): Promise<ApprovalRequestRecord | null> {
    const approvals = await this.listByRun(runId);
    return (
      approvals
        .filter((approval) => approval.status === 'pending')
        .sort((a, b) => a.requestedAt - b.requestedAt)[0] || null
    );
  }

  async findByInvocation(
    runId: string,
    toolName: string,
    argsHash: string,
  ): Promise<ApprovalRequestRecord | null> {
    const approvals = await this.listByRun(runId);

    return (
      approvals
        .filter(
          (record) =>
            record.toolName === toolName &&
            record.argsHash === argsHash,
        )
        .sort((a, b) => b.requestedAt - a.requestedAt)[0] || null
    );
  }

  async decide(input: ApprovalDecisionInput): Promise<ApprovalRequestRecord> {
    const existing = this.approvals.get(input.requestId);

    if (!existing) {
      throw new Error(`Approval ${input.requestId} not found`);
    }

    const updated: ApprovalRequestRecord = {
      ...existing,
      status: input.decision,
      decidedAt: Date.now(),
      decidedBy: input.decidedBy,
      decisionReason: input.reason,
    };

    this.approvals.set(updated.id, updated);
    return { ...updated };
  }

  async markApplied(requestId: string): Promise<ApprovalRequestRecord> {
    const existing = this.approvals.get(requestId);

    if (!existing) {
      throw new Error(`Approval ${requestId} not found`);
    }

    const updated: ApprovalRequestRecord = {
      ...existing,
      status: 'applied',
      appliedAt: Date.now(),
    };

    this.approvals.set(updated.id, updated);
    return { ...updated };
  }
}

