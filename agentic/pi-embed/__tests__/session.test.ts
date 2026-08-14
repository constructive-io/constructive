import { MemoryRunLogStore } from '@agentic-kit/run-log';
import type {
  CreateAgentSessionOptions,
  CreateAgentSessionResult,
  ResourceLoader
} from '@earendil-works/pi-coding-agent';

import { type PiModule, startRun } from '../src';

const fakeLoader = {} as ResourceLoader;

const fakePi = () => {
  const session = { dispose: jest.fn() };
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
