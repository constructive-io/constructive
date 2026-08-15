import { MemoryRunLogStore } from '@agentic-kit/run-log';
import type {
  CreateAgentSessionOptions,
  CreateAgentSessionResult,
  ResourceLoader
} from '@earendil-works/pi-coding-agent';

import { type PiModule, startRun } from '../src';

const fakeLoader = {} as ResourceLoader;

const gatewayMetering = {
  mode: 'gateway' as const,
  gatewayUrl: 'https://agentic.example.com',
  identity: { databaseId: 'db-1' },
  models: [{ id: 'deepseek/deepseek-chat', contextWindow: 128_000, maxTokens: 8_192 }]
};

const fakePi = (model?: { provider: string; id: string }) => {
  const session = {
    dispose: jest.fn(),
    bindExtensions: jest.fn(() => Promise.resolve()),
    model
  };
  const createAgentSession = jest.fn(
    (_options: CreateAgentSessionOptions): Promise<CreateAgentSessionResult> =>
      Promise.resolve({
        session: session as unknown as CreateAgentSessionResult['session'],
        extensionsResult: { extensions: [], errors: [], runtime: {} as never } as never
      })
  );
  const loaderOptions: unknown[] = [];
  const reload = jest.fn(() => Promise.resolve());
  class DefaultResourceLoader {
    constructor(options: unknown) {
      loaderOptions.push(options);
    }
    reload = reload;
  }

  const pi = {
    createAgentSession,
    DefaultResourceLoader: DefaultResourceLoader as unknown as PiModule['DefaultResourceLoader'],
    getAgentDir: () => '/default-agent-dir'
  } satisfies PiModule;

  return { pi, session, createAgentSession, loaderOptions, reload };
};

const meteredSession = () => fakePi({ provider: 'constructive-gateway', id: 'deepseek/deepseek-chat' });

describe('startRun', () => {
  it('hands the composed lanes to the resource loader, since that is how pi takes extensions', async () => {
    const { pi, createAgentSession } = fakePi();
    const createResourceLoader = jest.fn().mockReturnValue(fakeLoader);

    const embedded = await startRun({
      runId: 'run-1',
      pi,
      cwd: '/workspace',
      agentDir: '/agent',
      log: { store: new MemoryRunLogStore() },
      createResourceLoader
    });

    expect(createResourceLoader).toHaveBeenCalledWith({
      extensionFactories: embedded.run.extensions,
      cwd: '/workspace',
      agentDir: '/agent'
    });
    expect(createAgentSession).toHaveBeenCalledWith(
      expect.objectContaining({ cwd: '/workspace', agentDir: '/agent', resourceLoader: fakeLoader })
    );
    expect(embedded.resourceLoader).toBe(fakeLoader);
  });

  it('builds pi’s default loader with the lanes and reloads it, since it discovers nothing until then', async () => {
    const { pi, loaderOptions, reload } = fakePi();

    const embedded = await startRun({ runId: 'run-1', pi, cwd: '/workspace', log: { store: new MemoryRunLogStore() } });

    expect(loaderOptions).toEqual([
      { cwd: '/workspace', agentDir: '/default-agent-dir', extensionFactories: embedded.run.extensions }
    ]);
    expect(reload).toHaveBeenCalled();
  });

  it('binds the extensions, since pi emits session_start from there and not from createAgentSession', async () => {
    const { pi, session } = fakePi();

    await startRun({ runId: 'run-1', pi, log: { store: new MemoryRunLogStore() }, createResourceLoader: () => fakeLoader });

    expect(session.bindExtensions).toHaveBeenCalledWith({});
  });

  it('refuses a metered run whose session did not end up on the gateway model', async () => {
    const { pi } = fakePi({ provider: 'deepseek', id: 'deepseek-chat' });

    await expect(
      startRun({ runId: 'run-1', pi, metering: gatewayMetering, createResourceLoader: () => fakeLoader })
    ).rejects.toThrow(/would leave outside the gateway and go unmetered/);
  });

  it('refuses a metered run that selected no model at all', async () => {
    const { pi } = fakePi();

    await expect(
      startRun({ runId: 'run-1', pi, metering: gatewayMetering, createResourceLoader: () => fakeLoader })
    ).rejects.toThrow(/no model/);
  });

  it('accepts a metered run once the session is on the gateway model', async () => {
    const { pi } = meteredSession();

    const embedded = await startRun({
      runId: 'run-1',
      pi,
      metering: gatewayMetering,
      createResourceLoader: () => fakeLoader
    });

    expect(embedded.run.lanes.meteredModel?.selectedModel).toBe('deepseek/deepseek-chat');
  });

  it('demands an agentDir when the injected pi module cannot supply one', async () => {
    const { pi } = fakePi();
    const withoutAgentDir: PiModule = {
      createAgentSession: pi.createAgentSession,
      DefaultResourceLoader: pi.DefaultResourceLoader
    };

    await expect(startRun({ runId: 'run-1', pi: withoutAgentDir })).rejects.toThrow(/agentDir is required/);
  });

  it('awaits an async loader builder, which a host layering its own resources needs', async () => {
    const { pi } = fakePi();
    const embedded = await startRun({
      runId: 'run-1',
      pi,
      createResourceLoader: () => Promise.resolve(fakeLoader)
    });

    expect(embedded.resourceLoader).toBe(fakeLoader);
  });

  it('passes the host’s session options through without letting them override the embedding', async () => {
    const { pi, createAgentSession } = fakePi();
    await startRun({
      runId: 'run-1',
      pi,
      cwd: '/workspace',
      session: { tools: ['read'], noTools: 'builtin' },
      createResourceLoader: () => fakeLoader
    });

    const options = createAgentSession.mock.calls[0][0];
    expect(options.tools).toEqual(['read']);
    expect(options.noTools).toBe('builtin');
    expect(options.cwd).toBe('/workspace');
  });

  it('flushes the lanes before disposing the session', async () => {
    const { pi, session } = fakePi();
    const embedded = await startRun({
      runId: 'run-1',
      pi,
      log: { store: new MemoryRunLogStore() },
      createResourceLoader: () => fakeLoader
    });

    const order: string[] = [];
    jest.spyOn(embedded.run, 'flush').mockImplementation(async () => {
      order.push('flush');
    });
    session.dispose.mockImplementation(() => order.push('dispose'));

    await embedded.close();
    expect(order).toEqual(['flush', 'dispose']);
  });

  it('still disposes the session when the flush fails, then reports the failure', async () => {
    const { pi, session } = fakePi();
    const embedded = await startRun({
      runId: 'run-1',
      pi,
      log: { store: new MemoryRunLogStore() },
      createResourceLoader: () => fakeLoader
    });
    jest.spyOn(embedded.run, 'flush').mockRejectedValue(new Error('store unreachable'));

    await expect(embedded.close()).rejects.toThrow('store unreachable');
    expect(session.dispose).toHaveBeenCalled();
  });
});
