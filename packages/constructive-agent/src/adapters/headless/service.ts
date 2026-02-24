import type { ApprovalRequestRecord } from '../../types/approval';
import type { ConstructiveAgentRunConfig } from '../../types/config';
import type { AgentRunRecord } from '../../types/run-state';
import type { AgentRunner } from '../../runtime/create-agent-runner';

export class HeadlessAgentService {
  constructor(private readonly runner: AgentRunner) {}

  async startRun(
    config: ConstructiveAgentRunConfig,
    signal?: AbortSignal,
  ): Promise<AgentRunRecord> {
    return this.runner.startRun(config, {
      signal,
    });
  }

  async resumeRun(runId: string, signal?: AbortSignal): Promise<AgentRunRecord> {
    return this.runner.resumeRun(runId, {
      signal,
    });
  }

  async abortRun(
    runId: string,
    reason?: string,
  ): Promise<AgentRunRecord> {
    return this.runner.abortRun(runId, {
      reason,
    });
  }

  async listApprovals(runId: string): Promise<ApprovalRequestRecord[]> {
    return this.runner.listApprovals(runId);
  }

  async approvePending(
    runId: string,
    decidedBy: string,
    reason?: string,
    signal?: AbortSignal,
  ): Promise<AgentRunRecord> {
    return this.runner.approvePending(runId, {
      decidedBy,
      reason,
      signal,
    });
  }

  async rejectPending(
    runId: string,
    decidedBy: string,
    reason?: string,
  ): Promise<AgentRunRecord> {
    return this.runner.rejectPending(runId, {
      decidedBy,
      reason,
    });
  }
}
