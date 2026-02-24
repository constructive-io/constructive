import { randomUUID } from 'crypto';

import { Logger } from '@pgpmjs/logger';

import type { AgentRunEvent, RunEventType } from '../types/events';
import type {
  ApprovalDecisionInput,
  ApprovalRequestRecord,
} from '../types/approval';
import type { AgentRunRecord, RunStatus } from '../types/run-state';
import type {
  ApprovalStore,
  EventStore,
  RunStore,
} from '../storage/interfaces';

const log = new Logger('constructive-agent:run-controller');

export interface CreateRunInput {
  runId?: string;
  actorId: string;
  tenantId?: string;
  modelProvider: string;
  modelName: string;
  metadata?: Record<string, unknown>;
}

export interface CreateApprovalInput {
  requestId?: string;
  runId: string;
  toolName: string;
  capability: ApprovalRequestRecord['capability'];
  riskClass: ApprovalRequestRecord['riskClass'];
  argsHash: string;
  argsRedacted: Record<string, unknown>;
  reason: string;
}

export interface RunControllerHooks {
  onTerminalStatus?: (
    runId: string,
    status: RunStatus,
  ) => Promise<void> | void;
}

const TERMINAL_STATUSES: RunStatus[] = [
  'completed',
  'failed',
  'aborted',
];

export class RunController {
  private readonly emitQueues = new Map<string, Promise<void>>();

  constructor(
    private readonly runStore: RunStore,
    private readonly eventStore: EventStore,
    private readonly approvalStore?: ApprovalStore,
    private readonly hooks: RunControllerHooks = {},
  ) {}

  async startRun(options: CreateRunInput): Promise<AgentRunRecord> {
    const runId = options.runId || randomUUID();

    const run: AgentRunRecord = {
      id: runId,
      status: 'queued',
      actorId: options.actorId,
      tenantId: options.tenantId,
      modelProvider: options.modelProvider,
      modelName: options.modelName,
      startedAt: Date.now(),
      metadata: options.metadata,
    };

    await this.runStore.create(run);

    await this.emit(runId, 'run_start', {
      actorId: run.actorId,
      tenantId: run.tenantId,
      modelProvider: run.modelProvider,
      modelName: run.modelName,
    });

    return this.transitionStatus(runId, 'running');
  }

  async transitionStatus(
    runId: string,
    to: RunStatus,
  ): Promise<AgentRunRecord> {
    const current = await this.getRunOrThrow(runId);

    if (current.status === to) {
      return current;
    }

    const patch: Partial<AgentRunRecord> = {
      status: to,
    };

    if (TERMINAL_STATUSES.includes(to)) {
      patch.endedAt = Date.now();
    }

    const updated = await this.runStore.update(runId, patch);

    await this.emit(runId, 'run_status_changed', {
      from: current.status,
      to,
    });

    if (TERMINAL_STATUSES.includes(to)) {
      await this.emit(runId, 'run_end', {
        status: to,
      });

      try {
        await this.hooks.onTerminalStatus?.(runId, to);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        log.error(
          `[${runId}] terminal status hook failed for ${to}: ${message}`,
        );
      }
    }

    return updated;
  }

  async recordError(
    runId: string,
    code: string,
    message: string,
  ): Promise<AgentRunRecord> {
    log.error(`[${runId}] ${code}: ${message}`);

    await this.emit(runId, 'run_error', {
      code,
      message,
    });

    await this.transitionStatus(runId, 'failed');

    return this.runStore.update(runId, {
      errorCode: code,
      errorMessage: message,
    });
  }

  async appendEvent(
    runId: string,
    type: RunEventType,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.emit(runId, type, payload);
  }

  async getRun(runId: string): Promise<AgentRunRecord | null> {
    return this.runStore.get(runId);
  }

  async getEvents(runId: string): Promise<AgentRunEvent[]> {
    return this.eventStore.list(runId);
  }

  async requestApproval(
    input: CreateApprovalInput,
  ): Promise<ApprovalRequestRecord> {
    if (!this.approvalStore) {
      throw new Error('Approval store not configured');
    }

    const request: ApprovalRequestRecord = {
      id: input.requestId || randomUUID(),
      runId: input.runId,
      toolName: input.toolName,
      capability: input.capability,
      riskClass: input.riskClass,
      argsHash: input.argsHash,
      argsRedacted: input.argsRedacted,
      reason: input.reason,
      status: 'pending',
      requestedAt: Date.now(),
    };

    await this.approvalStore.create(request);

    await this.emit(input.runId, 'approval_requested', {
      requestId: request.id,
      toolName: request.toolName,
      reason: request.reason,
      argsRedacted: request.argsRedacted,
    });

    return request;
  }

  async decideApproval(
    runId: string,
    input: ApprovalDecisionInput,
  ): Promise<ApprovalRequestRecord> {
    if (!this.approvalStore) {
      throw new Error('Approval store not configured');
    }

    const approval = await this.approvalStore.decide(input);

    await this.emit(runId, 'approval_decision', {
      requestId: approval.id,
      decision: input.decision,
      decidedBy: input.decidedBy,
      reason: input.reason,
    });

    return approval;
  }

  async markApprovalApplied(
    runId: string,
    requestId: string,
  ): Promise<ApprovalRequestRecord> {
    if (!this.approvalStore) {
      throw new Error('Approval store not configured');
    }

    const approval = await this.approvalStore.markApplied(requestId);

    await this.emit(runId, 'approval_applied', {
      requestId: approval.id,
      toolName: approval.toolName,
    });

    return approval;
  }

  async getPendingApproval(runId: string): Promise<ApprovalRequestRecord | null> {
    if (!this.approvalStore) {
      return null;
    }

    return this.approvalStore.getPendingByRun(runId);
  }

  async listApprovals(runId: string): Promise<ApprovalRequestRecord[]> {
    if (!this.approvalStore) {
      return [];
    }

    return this.approvalStore.listByRun(runId);
  }

  async findApprovalByInvocation(
    runId: string,
    toolName: string,
    argsHash: string,
  ): Promise<ApprovalRequestRecord | null> {
    if (!this.approvalStore) {
      return null;
    }

    return this.approvalStore.findByInvocation(runId, toolName, argsHash);
  }

  private async emit(
    runId: string,
    type: RunEventType,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const previousQueue = this.emitQueues.get(runId) || Promise.resolve();
    const nextQueue = previousQueue
      .catch((): void => {})
      .then(async () => {
        const seq = await this.eventStore.nextSeq(runId);

        const event: AgentRunEvent = {
          runId,
          seq,
          type,
          timestamp: Date.now(),
          payload,
        } as AgentRunEvent;

        await this.eventStore.append(event);
      });

    this.emitQueues.set(runId, nextQueue);

    try {
      await nextQueue;
    } finally {
      if (this.emitQueues.get(runId) === nextQueue) {
        this.emitQueues.delete(runId);
      }
    }
  }

  private async getRunOrThrow(runId: string): Promise<AgentRunRecord> {
    const run = await this.runStore.get(runId);

    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }

    return run;
  }
}
