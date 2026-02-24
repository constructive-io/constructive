import {
  createAgentRunner,
} from '../../src/runtime/create-agent-runner';
import type { AgentRuntimeAdapter } from '../../src/runtime/create-agent-runner';
import type { ConstructiveAgentRunConfig } from '../../src/types/config';

const createConfig = (
  actorId: string,
  tenantId?: string,
): ConstructiveAgentRunConfig => {
  return {
    model: {
      provider: 'openai',
      model: 'fake-model',
      systemPrompt: 'You are a test assistant.',
      thinkingLevel: 'off',
    },
    identity: {
      actorId,
      tenantId,
      accessToken: 'token',
    },
    prompt: 'No-op prompt',
    tools: [],
  };
};

const waitForNextTick = async (): Promise<void> => {
  await new Promise<void>((resolve) => setTimeout(() => resolve(), 10));
};

describe('createAgentRunner concurrency controls', () => {
  it('enforces maxGlobalRuns', async () => {
    let releaseFirst: (() => void) | null = null;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const runtimeAdapter: AgentRuntimeAdapter = {
      async execute(run, controller) {
        if (run.actorId === 'actor-1') {
          await firstGate;
        }
        await controller.transitionStatus(run.id, 'completed');
      },
    };

    const runner = createAgentRunner({
      runtimeAdapter,
      concurrency: {
        maxGlobalRuns: 1,
      },
    });

    const firstRunPromise = runner.startRun(createConfig('actor-1', 'tenant-1'));
    await waitForNextTick();

    await expect(
      runner.startRun(createConfig('actor-2', 'tenant-2')),
    ).rejects.toThrow('Global run concurrency limit exceeded');

    if (!releaseFirst) {
      throw new Error('release gate not initialized');
    }
    releaseFirst();
    const firstRun = await firstRunPromise;
    expect(firstRun.status).toBe('completed');
  });

  it('enforces maxRunsPerActor but allows different actors', async () => {
    let releaseActorOne: (() => void) | null = null;
    const actorOneGate = new Promise<void>((resolve) => {
      releaseActorOne = resolve;
    });

    const runtimeAdapter: AgentRuntimeAdapter = {
      async execute(run, controller) {
        if (run.actorId === 'actor-1') {
          await actorOneGate;
        }
        await controller.transitionStatus(run.id, 'completed');
      },
    };

    const runner = createAgentRunner({
      runtimeAdapter,
      concurrency: {
        maxRunsPerActor: 1,
      },
    });

    const firstActorRun = runner.startRun(createConfig('actor-1', 'tenant-1'));
    await waitForNextTick();

    await expect(
      runner.startRun(createConfig('actor-1', 'tenant-1')),
    ).rejects.toThrow('Actor run concurrency limit exceeded');

    const secondActorRun = await runner.startRun(createConfig('actor-2', 'tenant-1'));
    expect(secondActorRun.status).toBe('completed');

    if (!releaseActorOne) {
      throw new Error('release gate not initialized');
    }
    releaseActorOne();
    const resolvedFirst = await firstActorRun;
    expect(resolvedFirst.status).toBe('completed');
  });

  it('releases active slot when no-adapter run is later completed manually', async () => {
    const runner = createAgentRunner({
      concurrency: {
        maxGlobalRuns: 1,
      },
    });

    const run = await runner.startRun(createConfig('actor-1', 'tenant-1'));
    expect(run.status).toBe('running');

    await runner.controller.transitionStatus(run.id, 'completed');

    await expect(
      runner.startRun(createConfig('actor-2', 'tenant-2')),
    ).resolves.toMatchObject({
      status: 'running',
      actorId: 'actor-2',
    });
  });
});
