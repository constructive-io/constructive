import type { ApprovalRequestRecord } from '../types/approval';
import type { ConstructiveAgentRunConfig } from '../types/config';
import type { AgentRunEvent } from '../types/events';
import type { AgentRunRecord } from '../types/run-state';
import {
  assertApprovalAuthorized,
  type ApprovalAuthorizer,
} from '../policy/approval-authorizer';
import {
  ensureMetricsRecorder,
  type MetricsRecorder,
  type MetricTags,
} from '../observability/metrics';
import {
  ensureTraceSink,
  type TraceSink,
} from '../observability/tracing';
import type { ApprovalStore, EventStore, RunStore } from '../storage/interfaces';
import { MemoryApprovalStore } from '../storage/memory/memory-approval-store';
import { MemoryEventStore } from '../storage/memory/memory-event-store';
import { MemoryRunStore } from '../storage/memory/memory-run-store';
import { RunController } from './run-controller';

export interface AgentRuntimeAdapter {
  execute(
    run: AgentRunRecord,
    controller: RunController,
    config: ConstructiveAgentRunConfig,
    signal?: AbortSignal,
  ): Promise<void>;
}

export interface RunEventPublisher {
  publish(event: AgentRunEvent): Promise<void> | void;
}

export interface CreateAgentRunnerOptions {
  runStore?: RunStore;
  eventStore?: EventStore;
  approvalStore?: ApprovalStore;
  runtimeAdapter?: AgentRuntimeAdapter;
  eventPublisher?: RunEventPublisher;
  metrics?: MetricsRecorder;
  traceSink?: TraceSink;
  concurrency?: {
    maxGlobalRuns?: number;
    maxRunsPerActor?: number;
    maxRunsPerTenant?: number;
  };
  approvalAuthorizer?: ApprovalAuthorizer;
}

export interface StartRunOptions {
  signal?: AbortSignal;
  completeWhenNoAdapter?: boolean;
}

export interface ResumeRunOptions {
  signal?: AbortSignal;
}

export interface DecideApprovalOptions {
  requestId?: string;
  decidedBy: string;
  reason?: string;
  autoResume?: boolean;
  signal?: AbortSignal;
}

export interface AbortRunOptions {
  reason?: string;
}

export interface AgentRunner {
  startRun(
    config: ConstructiveAgentRunConfig,
    options?: StartRunOptions,
  ): Promise<AgentRunRecord>;
  resumeRun(runId: string, options?: ResumeRunOptions): Promise<AgentRunRecord>;
  abortRun(runId: string, options?: AbortRunOptions): Promise<AgentRunRecord>;
  listApprovals(runId: string): Promise<ApprovalRequestRecord[]>;
  approvePending(
    runId: string,
    options: DecideApprovalOptions,
  ): Promise<AgentRunRecord>;
  rejectPending(
    runId: string,
    options: Omit<DecideApprovalOptions, 'autoResume'>,
  ): Promise<AgentRunRecord>;
  getRun(runId: string): Promise<AgentRunRecord | null>;
  getEvents(runId: string): ReturnType<RunController['getEvents']>;
  controller: RunController;
}

class PublishingEventStore implements EventStore {
  constructor(
    private readonly delegate: EventStore,
    private readonly publisher: RunEventPublisher,
  ) {}

  async append(event: AgentRunEvent): Promise<void> {
    await this.delegate.append(event);

    try {
      await this.publisher.publish(event);
    } catch {
      // Best-effort publishing only; storage remains source of truth.
    }
  }

  list(runId: string): Promise<AgentRunEvent[]> {
    return this.delegate.list(runId);
  }

  nextSeq(runId: string): Promise<number> {
    return this.delegate.nextSeq(runId);
  }
}

const isTerminalStatus = (status: AgentRunRecord['status']): boolean => {
  return status === 'completed' || status === 'failed' || status === 'aborted';
};

const toMetricTags = (
  input: Record<string, string | number | boolean | undefined>,
): MetricTags | undefined => {
  const tags: MetricTags = {};

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) {
      continue;
    }

    tags[key] = value;
  }

  return Object.keys(tags).length > 0 ? tags : undefined;
};

const bindAbortSignal = (
  controller: AbortController,
  externalSignal?: AbortSignal,
): void => {
  if (!externalSignal) {
    return;
  }

  if (externalSignal.aborted) {
    controller.abort(externalSignal.reason);
    return;
  }

  externalSignal.addEventListener(
    'abort',
    () => {
      controller.abort(externalSignal.reason);
    },
    { once: true },
  );
};

export function createAgentRunner(
  options: CreateAgentRunnerOptions = {},
): AgentRunner {
  const runStore = options.runStore || new MemoryRunStore();
  const baseEventStore = options.eventStore || new MemoryEventStore();
  const eventStore = options.eventPublisher
    ? new PublishingEventStore(baseEventStore, options.eventPublisher)
    : baseEventStore;
  const approvalStore = options.approvalStore || new MemoryApprovalStore();
  const runConfigs = new Map<string, ConstructiveAgentRunConfig>();
  const activeRunIds = new Set<string>();
  const activeRunMeta = new Map<
    string,
    {
      actorId: string;
      tenantId?: string;
    }
  >();
  const abortControllers = new Map<string, AbortController>();
  const metrics = ensureMetricsRecorder(options.metrics);
  const traceSink = ensureTraceSink(options.traceSink);
  const releaseActive = (runId: string): void => {
    activeRunIds.delete(runId);
    activeRunMeta.delete(runId);
    abortControllers.delete(runId);
  };
  const controller = new RunController(
    runStore,
    eventStore,
    approvalStore,
    {
      onTerminalStatus: (runId) => {
        releaseActive(runId);
      },
    },
  );

  const getActiveCountByActor = (actorId: string): number => {
    let count = 0;

    for (const runId of activeRunIds) {
      const meta = activeRunMeta.get(runId);
      if (meta?.actorId === actorId) {
        count += 1;
      }
    }

    return count;
  };

  const getActiveCountByTenant = (tenantId?: string): number => {
    if (!tenantId) {
      return 0;
    }

    let count = 0;

    for (const runId of activeRunIds) {
      const meta = activeRunMeta.get(runId);
      if (meta?.tenantId === tenantId) {
        count += 1;
      }
    }

    return count;
  };

  const assertConcurrency = (
    actorId: string,
    tenantId?: string,
    ignoreRunId?: string,
  ): void => {
    const globalLimit = options.concurrency?.maxGlobalRuns;
    const actorLimit = options.concurrency?.maxRunsPerActor;
    const tenantLimit = options.concurrency?.maxRunsPerTenant;

    const activeGlobal =
      ignoreRunId && activeRunIds.has(ignoreRunId)
        ? activeRunIds.size - 1
        : activeRunIds.size;

    if (globalLimit && activeGlobal >= globalLimit) {
      metrics.increment(
        'constructive_agent.run.concurrency.rejected',
        1,
        toMetricTags({
          scope: 'global',
        }),
      );

      throw new Error(`Global run concurrency limit exceeded (${globalLimit})`);
    }

    if (actorLimit) {
      const activeByActor =
        getActiveCountByActor(actorId) -
        (ignoreRunId && activeRunMeta.get(ignoreRunId)?.actorId === actorId ? 1 : 0);

      if (activeByActor >= actorLimit) {
        metrics.increment(
          'constructive_agent.run.concurrency.rejected',
          1,
          toMetricTags({
            scope: 'actor',
          }),
        );

        throw new Error(
          `Actor run concurrency limit exceeded (${actorLimit}) for actor ${actorId}`,
        );
      }
    }

    if (tenantLimit && tenantId) {
      const activeByTenant =
        getActiveCountByTenant(tenantId) -
        (ignoreRunId && activeRunMeta.get(ignoreRunId)?.tenantId === tenantId ? 1 : 0);

      if (activeByTenant >= tenantLimit) {
        metrics.increment(
          'constructive_agent.run.concurrency.rejected',
          1,
          toMetricTags({
            scope: 'tenant',
          }),
        );

        throw new Error(
          `Tenant run concurrency limit exceeded (${tenantLimit}) for tenant ${tenantId}`,
        );
      }
    }
  };

  const markActive = (run: AgentRunRecord): void => {
    activeRunIds.add(run.id);
    activeRunMeta.set(run.id, {
      actorId: run.actorId,
      tenantId: run.tenantId,
    });
  };

  const maybeRelease = async (runId: string): Promise<void> => {
    const run = await controller.getRun(runId);
    if (!run || isTerminalStatus(run.status)) {
      releaseActive(runId);
    }
  };

  const executeRun = async (
    run: AgentRunRecord,
    config: ConstructiveAgentRunConfig,
    signal?: AbortSignal,
  ): Promise<void> => {
    if (!options.runtimeAdapter) {
      return;
    }

    const startedAt = Date.now();

    metrics.increment(
      'constructive_agent.run.execute.started',
      1,
      toMetricTags({
        actor_id: run.actorId,
        tenant_id: run.tenantId,
      }),
    );

    try {
      await options.runtimeAdapter.execute(run, controller, config, signal);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown runtime adapter error';
      metrics.increment('constructive_agent.run.execute.errors', 1);
      await controller.recordError(run.id, 'RUNTIME_ADAPTER_ERROR', message);
    } finally {
      const latest = await controller.getRun(run.id);
      const status = latest?.status || 'unknown';

      metrics.increment(
        'constructive_agent.run.execute.finished',
        1,
        toMetricTags({
          status,
        }),
      );
      metrics.timing(
        'constructive_agent.run.execute.duration_ms',
        Date.now() - startedAt,
        toMetricTags({
          status,
        }),
      );

      if (latest && isTerminalStatus(latest.status)) {
        traceSink.record({
          type: 'run_end',
          timestamp: Date.now(),
          context: {
            runId: latest.id,
          },
          attributes: {
            status: latest.status,
          },
        });
      }

      await maybeRelease(run.id);
    }
  };

  const findApprovalToDecide = async (
    runId: string,
    requestId?: string,
  ): Promise<ApprovalRequestRecord> => {
    const approvals = await controller.listApprovals(runId);

    if (requestId) {
      const matched = approvals.find((approval) => approval.id === requestId);
      if (!matched) {
        throw new Error(`Approval ${requestId} not found for run ${runId}`);
      }
      if (matched.status !== 'pending') {
        throw new Error(`Approval ${requestId} for run ${runId} is not pending`);
      }
      return matched;
    }

    const pending = approvals
      .filter((approval) => approval.status === 'pending')
      .sort((a, b) => a.requestedAt - b.requestedAt)[0];

    if (!pending) {
      throw new Error(`No pending approval found for run ${runId}`);
    }

    return pending;
  };

  const resumeRun = async (
    runId: string,
    resumeOptions: ResumeRunOptions = {},
  ): Promise<AgentRunRecord> => {
    if (!options.runtimeAdapter) {
      throw new Error('Cannot resume run without runtime adapter');
    }

    const run = await controller.getRun(runId);
    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }

    if (isTerminalStatus(run.status)) {
      await maybeRelease(run.id);
      return run;
    }

    const config = runConfigs.get(runId);
    if (!config) {
      throw new Error(`Run config not found for ${runId}`);
    }

    if (!activeRunIds.has(runId)) {
      assertConcurrency(run.actorId, run.tenantId, runId);
      markActive(run);
    }

    if (run.status !== 'running') {
      await controller.transitionStatus(runId, 'running');
    }

    const runAbortController = new AbortController();
    bindAbortSignal(runAbortController, resumeOptions.signal);
    abortControllers.set(runId, runAbortController);

    traceSink.record({
      type: 'run_resume',
      timestamp: Date.now(),
      context: {
        runId,
      },
    });

    const currentRun = (await controller.getRun(runId)) as AgentRunRecord;
    await executeRun(currentRun, config, runAbortController.signal);

    return (await controller.getRun(runId)) as AgentRunRecord;
  };

  const abortRun = async (
    runId: string,
    abortOptions: AbortRunOptions = {},
  ): Promise<AgentRunRecord> => {
    const run = await controller.getRun(runId);
    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }

    if (isTerminalStatus(run.status)) {
      await maybeRelease(runId);
      return run;
    }

    const abortController = abortControllers.get(runId);
    abortController?.abort(abortOptions.reason || 'aborted');

    await controller.transitionStatus(runId, 'aborted');
    metrics.increment('constructive_agent.run.aborted', 1);

    traceSink.record({
      type: 'run_abort',
      timestamp: Date.now(),
      context: {
        runId,
      },
      attributes: {
        reason: abortOptions.reason,
      },
    });

    await maybeRelease(runId);

    return (await controller.getRun(runId)) as AgentRunRecord;
  };

  return {
    controller,

    async startRun(
      config: ConstructiveAgentRunConfig,
      runtimeOptions: StartRunOptions = {},
    ): Promise<AgentRunRecord> {
      assertConcurrency(config.identity.actorId, config.identity.tenantId);

      const run = await controller.startRun({
        runId: config.runId,
        actorId: config.identity.actorId,
        tenantId: config.identity.tenantId,
        modelProvider: config.model.provider,
        modelName: config.model.model,
        metadata: config.metadata,
      });
      runConfigs.set(run.id, config);
      markActive(run);

      metrics.increment(
        'constructive_agent.run.started',
        1,
        toMetricTags({
          actor_id: run.actorId,
          tenant_id: run.tenantId,
          model_provider: run.modelProvider,
          model_name: run.modelName,
        }),
      );

      traceSink.record({
        type: 'run_start',
        timestamp: Date.now(),
        context: {
          runId: run.id,
        },
        attributes: {
          actorId: run.actorId,
          tenantId: run.tenantId,
          modelProvider: run.modelProvider,
          modelName: run.modelName,
        },
      });

      if (!options.runtimeAdapter) {
        if (runtimeOptions.completeWhenNoAdapter) {
          await controller.transitionStatus(run.id, 'completed');
          await maybeRelease(run.id);
          return (await controller.getRun(run.id)) as AgentRunRecord;
        }
        return run;
      }

      const runAbortController = new AbortController();
      bindAbortSignal(runAbortController, runtimeOptions.signal);
      abortControllers.set(run.id, runAbortController);

      await executeRun(run, config, runAbortController.signal);

      return (await controller.getRun(run.id)) as AgentRunRecord;
    },

    resumeRun,

    abortRun,

    async listApprovals(runId: string): Promise<ApprovalRequestRecord[]> {
      return controller.listApprovals(runId);
    },

    async approvePending(
      runId: string,
      decision: DecideApprovalOptions,
    ): Promise<AgentRunRecord> {
      const approval = await findApprovalToDecide(runId, decision.requestId);
      const run = await controller.getRun(runId);

      await assertApprovalAuthorized(options.approvalAuthorizer, {
        runId,
        requestId: approval.id,
        decision: 'approved',
        decidedBy: decision.decidedBy,
        reason: decision.reason,
        actorId: run?.actorId,
        tenantId: run?.tenantId,
        toolName: approval.toolName,
        capability: approval.capability,
        riskClass: approval.riskClass,
      });

      await controller.decideApproval(runId, {
        requestId: approval.id,
        decision: 'approved',
        decidedBy: decision.decidedBy,
        reason: decision.reason,
      });

      metrics.increment(
        'constructive_agent.approval.decision',
        1,
        toMetricTags({
          decision: 'approved',
          capability: approval.capability,
          risk_class: approval.riskClass,
        }),
      );
      metrics.timing(
        'constructive_agent.approval.latency_ms',
        Math.max(0, Date.now() - approval.requestedAt),
        toMetricTags({
          decision: 'approved',
        }),
      );

      traceSink.record({
        type: 'approval_decision',
        timestamp: Date.now(),
        context: {
          runId,
          requestId: approval.id,
        },
        attributes: {
          decision: 'approved',
          decidedBy: decision.decidedBy,
          toolName: approval.toolName,
          capability: approval.capability,
          riskClass: approval.riskClass,
        },
      });

      if (decision.autoResume === false) {
        return (await controller.getRun(runId)) as AgentRunRecord;
      }

      return resumeRun(runId, {
        signal: decision.signal,
      });
    },

    async rejectPending(
      runId: string,
      decision: Omit<DecideApprovalOptions, 'autoResume'>,
    ): Promise<AgentRunRecord> {
      const approval = await findApprovalToDecide(runId, decision.requestId);
      const run = await controller.getRun(runId);

      await assertApprovalAuthorized(options.approvalAuthorizer, {
        runId,
        requestId: approval.id,
        decision: 'rejected',
        decidedBy: decision.decidedBy,
        reason: decision.reason,
        actorId: run?.actorId,
        tenantId: run?.tenantId,
        toolName: approval.toolName,
        capability: approval.capability,
        riskClass: approval.riskClass,
      });

      await controller.decideApproval(runId, {
        requestId: approval.id,
        decision: 'rejected',
        decidedBy: decision.decidedBy,
        reason: decision.reason,
      });

      metrics.increment(
        'constructive_agent.approval.decision',
        1,
        toMetricTags({
          decision: 'rejected',
          capability: approval.capability,
          risk_class: approval.riskClass,
        }),
      );
      metrics.timing(
        'constructive_agent.approval.latency_ms',
        Math.max(0, Date.now() - approval.requestedAt),
        toMetricTags({
          decision: 'rejected',
        }),
      );

      traceSink.record({
        type: 'approval_decision',
        timestamp: Date.now(),
        context: {
          runId,
          requestId: approval.id,
        },
        attributes: {
          decision: 'rejected',
          decidedBy: decision.decidedBy,
          toolName: approval.toolName,
          capability: approval.capability,
          riskClass: approval.riskClass,
        },
      });

      const message = decision.reason || `Approval rejected for ${approval.toolName}`;
      await controller.recordError(runId, 'APPROVAL_REJECTED', message);
      await maybeRelease(runId);

      return (await controller.getRun(runId)) as AgentRunRecord;
    },

    getRun(runId: string): Promise<AgentRunRecord | null> {
      return controller.getRun(runId);
    },

    getEvents(runId: string) {
      return controller.getEvents(runId);
    },
  };
}
