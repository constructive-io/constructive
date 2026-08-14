import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';

import { createUsageReportExtension, type UsageReport } from '../src';

type Handler = (event: any, ctx: any) => unknown;

const fakePi = () => {
  const handlers = new Map<string, Handler>();
  const pi = {
    on: (event: string, handler: Handler) => {
      handlers.set(event, handler);
    }
  } as unknown as ExtensionAPI;
  return {
    pi,
    emit: (event: string, payload: unknown) => handlers.get(event)?.(payload, {}),
    has: (event: string) => handlers.has(event)
  };
};

const assistant = (overrides: Record<string, unknown> = {}) => ({
  role: 'assistant',
  provider: 'openai',
  model: 'gpt-4o',
  stopReason: 'stop',
  usage: { input: 10, output: 5, cacheRead: 0, cacheWrite: 0, totalTokens: 15 },
  ...overrides
});

describe('createUsageReportExtension', () => {
  const identity = { databaseId: 'db-1' };

  const setup = (options: Record<string, unknown> = {}) => {
    const reports: UsageReport[] = [];
    const ext = createUsageReportExtension({
      identity,
      sink: async (report) => {
        reports.push(report);
      },
      ...options
    });
    const host = fakePi();
    ext.extension(host.pi);
    return { ext, host, reports };
  };

  it('reports the usage of each assistant message', async () => {
    const { ext, host, reports } = setup();

    host.emit('message_end', { type: 'message_end', message: assistant({ responseId: 'r1' }) });
    host.emit('message_end', { type: 'message_end', message: assistant({ responseId: 'r2', model: 'gpt-4o-mini' }) });
    await ext.flush();

    expect(reports.map((r) => r.model)).toEqual(['gpt-4o', 'gpt-4o-mini']);
    expect(reports[0]).toMatchObject({ provider: 'openai', input_tokens: 10, output_tokens: 5, status: 'ok' });
  });

  it('ignores user and tool-result messages', async () => {
    const { ext, host, reports } = setup();

    host.emit('message_end', { type: 'message_end', message: { role: 'user', content: 'hi' } });
    host.emit('message_end', { type: 'message_end', message: { role: 'toolResult', toolName: 'bash' } });
    await ext.flush();

    expect(reports).toEqual([]);
  });

  it('bills a response once even when pi ends the same message twice', async () => {
    const { ext, host, reports } = setup();
    const message = assistant({ responseId: 'r1' });

    host.emit('message_end', { type: 'message_end', message });
    host.emit('message_end', { type: 'message_end', message });
    await ext.flush();

    expect(reports).toHaveLength(1);
  });

  it('still reports messages that carry no responseId', async () => {
    const { ext, host, reports } = setup();

    host.emit('message_end', { type: 'message_end', message: assistant() });
    host.emit('message_end', { type: 'message_end', message: assistant() });
    await ext.flush();

    expect(reports).toHaveLength(2);
  });

  it('applies the configured operation label', async () => {
    const { ext, host, reports } = setup({ operation: 'pi/code-task' });

    host.emit('message_end', { type: 'message_end', message: assistant() });
    await ext.flush();

    expect(reports[0].operation).toBe('pi/code-task');
  });

  it('flushes on session_shutdown so a quitting host does not drop usage', async () => {
    const reports: UsageReport[] = [];
    let release = (): void => undefined;
    const inFlight = new Promise<void>((resolve) => {
      release = resolve;
    });
    const ext = createUsageReportExtension({
      identity,
      sink: async (report) => {
        await inFlight;
        reports.push(report);
      }
    });
    const host = fakePi();
    ext.extension(host.pi);

    host.emit('message_end', { type: 'message_end', message: assistant() });
    const shutdown = host.emit('session_shutdown', { type: 'session_shutdown', reason: 'quit' }) as Promise<void>;
    expect(reports).toEqual([]);

    release();
    await shutdown;
    expect(reports).toHaveLength(1);
  });

  it('surfaces delivery failures from the shutdown flush', async () => {
    const ext = createUsageReportExtension({
      identity,
      sink: () => Promise.reject(new Error('gateway down'))
    });
    const host = fakePi();
    ext.extension(host.pi);

    host.emit('message_end', { type: 'message_end', message: assistant() });
    await expect(host.emit('session_shutdown', { type: 'session_shutdown', reason: 'quit' })).rejects.toThrow(
      'gateway down'
    );
  });

  it('requires a gatewayUrl when no sink is supplied', () => {
    expect(() => createUsageReportExtension({ identity })).toThrow(/gatewayUrl is required/);
  });

  it('validates the gateway URL and identity up front, not on the first turn', () => {
    expect(() => createUsageReportExtension({ identity, gatewayUrl: 'agentic.example.com' })).toThrow(
      /absolute URL/
    );
    expect(() =>
      createUsageReportExtension({ identity: { databaseId: '  ' }, gatewayUrl: 'https://gw.example.com' })
    ).toThrow(/databaseId is required/);
  });
});
