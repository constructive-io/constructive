import type { ApprovalStatus } from '../types/approval';
import type { AgentRunEvent } from '../types/events';
import type { AgentRunRecord, RunStatus } from '../types/run-state';

export interface ReplayApprovalState {
  requestId: string;
  toolName: string;
  status: ApprovalStatus;
  requestedAt: number;
  decidedAt?: number;
  decidedBy?: string;
  reason?: string;
}

export interface ReplaySnapshot {
  run: AgentRunRecord | null;
  approvals: ReplayApprovalState[];
}

const toTerminalStatus = (status: string): RunStatus => {
  if (status === 'completed' || status === 'failed' || status === 'aborted') {
    return status;
  }
  return 'failed';
};

export const replayRunEvents = (
  events: AgentRunEvent[],
  seedRun?: AgentRunRecord | null,
): ReplaySnapshot => {
  const ordered = events.slice().sort((a, b) => a.seq - b.seq);
  let run = seedRun ? { ...seedRun } : null;
  const approvals = new Map<string, ReplayApprovalState>();

  for (const event of ordered) {
    if (event.type === 'run_start' && !run) {
      run = {
        id: event.runId,
        status: 'queued',
        actorId: event.payload.actorId,
        tenantId: event.payload.tenantId,
        modelProvider: event.payload.modelProvider,
        modelName: event.payload.modelName,
        startedAt: event.timestamp,
      };
      continue;
    }

    if (!run) {
      continue;
    }

    if (event.type === 'run_status_changed') {
      run.status = event.payload.to;
      continue;
    }

    if (event.type === 'run_error') {
      run.errorCode = event.payload.code;
      run.errorMessage = event.payload.message;
      run.status = 'failed';
      continue;
    }

    if (event.type === 'run_end') {
      run.status = toTerminalStatus(event.payload.status);
      run.endedAt = event.timestamp;
      continue;
    }

    if (event.type === 'approval_requested') {
      approvals.set(event.payload.requestId, {
        requestId: event.payload.requestId,
        toolName: event.payload.toolName,
        status: 'pending',
        requestedAt: event.timestamp,
        reason: event.payload.reason,
      });
      continue;
    }

    if (event.type === 'approval_decision') {
      const current =
        approvals.get(event.payload.requestId) ||
        ({
          requestId: event.payload.requestId,
          toolName: 'unknown',
          status: 'pending',
          requestedAt: event.timestamp,
        } as ReplayApprovalState);

      approvals.set(event.payload.requestId, {
        ...current,
        status: event.payload.decision,
        decidedAt: event.timestamp,
        decidedBy: event.payload.decidedBy,
        reason: event.payload.reason,
      });
      continue;
    }

    if (event.type === 'approval_applied') {
      const current =
        approvals.get(event.payload.requestId) ||
        ({
          requestId: event.payload.requestId,
          toolName: event.payload.toolName,
          status: 'approved',
          requestedAt: event.timestamp,
        } as ReplayApprovalState);

      approvals.set(event.payload.requestId, {
        ...current,
        status: 'applied',
      });
    }
  }

  return {
    run,
    approvals: [...approvals.values()].sort(
      (a, b) => a.requestedAt - b.requestedAt,
    ),
  };
};

