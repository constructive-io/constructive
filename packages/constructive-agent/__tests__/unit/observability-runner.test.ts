import {
  InMemoryMetricsRecorder,
} from '../../src/observability/metrics';
import {
  InMemoryTraceSink,
} from '../../src/observability/tracing';
import {
  createAgentRunner,
  type AgentRuntimeAdapter,
} from '../../src/runtime/create-agent-runner';
import type { ConstructiveAgentRunConfig } from '../../src/types/config';

const createConfig = (): ConstructiveAgentRunConfig => {
  return {
    model: {
      provider: 'openai',
      model: 'fake-model',
      systemPrompt: 'You are a test assistant.',
      thinkingLevel: 'off',
    },
    identity: {
      actorId: 'actor-1',
      tenantId: 'tenant-1',
      accessToken: 'token',
    },
    prompt: 'Run task',
    tools: [],
  };
};

describe('runner observability', () => {
  it('records run metrics and trace events for successful execution', async () => {
    const runtimeAdapter: AgentRuntimeAdapter = {
      async execute(run, controller) {
        await controller.transitionStatus(run.id, 'completed');
      },
    };

    const metrics = new InMemoryMetricsRecorder();
    const traceSink = new InMemoryTraceSink();

    const runner = createAgentRunner({
      runtimeAdapter,
      metrics,
      traceSink,
    });

    const run = await runner.startRun(createConfig());
    expect(run.status).toBe('completed');

    const metricNames = metrics.list().map((metric) => metric.metric);
    expect(metricNames).toContain('constructive_agent.run.started');
    expect(metricNames).toContain('constructive_agent.run.execute.started');
    expect(metricNames).toContain('constructive_agent.run.execute.finished');
    expect(metricNames).toContain('constructive_agent.run.execute.duration_ms');

    const traceTypes = traceSink.list().map((event) => event.type);
    expect(traceTypes).toContain('run_start');
    expect(traceTypes).toContain('run_end');
  });

  it('records approval decision and latency metrics', async () => {
    const runtimeAdapter: AgentRuntimeAdapter = {
      async execute(run, controller) {
        const approvals = await controller.listApprovals(run.id);
        const approved = approvals.find((approval) => approval.status === 'approved');

        if (approved) {
          await controller.markApprovalApplied(run.id, approved.id);
          await controller.transitionStatus(run.id, 'completed');
          return;
        }

        await controller.requestApproval({
          runId: run.id,
          toolName: 'write_entity',
          capability: 'write',
          riskClass: 'low',
          argsHash: 'hash',
          argsRedacted: {
            id: 'entity-1',
          },
          reason: 'approval needed',
        });
        await controller.transitionStatus(run.id, 'needs_approval');
      },
    };

    const metrics = new InMemoryMetricsRecorder();
    const runner = createAgentRunner({
      runtimeAdapter,
      metrics,
    });

    const run = await runner.startRun(createConfig());
    expect(run.status).toBe('needs_approval');

    const resumed = await runner.approvePending(run.id, {
      decidedBy: 'operator-1',
    });
    expect(resumed.status).toBe('completed');

    const metricNames = metrics.list().map((metric) => metric.metric);
    expect(metricNames).toContain('constructive_agent.approval.decision');
    expect(metricNames).toContain('constructive_agent.approval.latency_ms');
  });
});
