import { EventEmitter } from 'node:events';

import {
  installProcessShutdownHandlers,
  type ProcessShutdownTarget
} from '../server';

class FakeProcess extends EventEmitter implements ProcessShutdownTarget {
  readonly exit = jest.fn((_code?: number): void => undefined);
}

const flushPromises = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('GraphQL server process shutdown', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('drains once and exits cleanly on the first signal', async () => {
    const processTarget = new FakeProcess();
    const shutdown = jest.fn(async (): Promise<void> => undefined);

    installProcessShutdownHandlers(shutdown, { processTarget, timeoutMs: 1000 });
    processTarget.emit('SIGTERM');
    await flushPromises();

    expect(shutdown).toHaveBeenCalledTimes(1);
    expect(processTarget.exit).toHaveBeenCalledTimes(1);
    expect(processTarget.exit).toHaveBeenCalledWith(0);
    expect(processTarget.listenerCount('SIGINT')).toBe(0);
    expect(processTarget.listenerCount('SIGTERM')).toBe(0);
  });

  it('forces exit on a repeated signal without starting a second drain', async () => {
    let resolveShutdown!: () => void;
    const processTarget = new FakeProcess();
    const shutdown = jest.fn(() => new Promise<void>((resolve) => {
      resolveShutdown = resolve;
    }));

    installProcessShutdownHandlers(shutdown, { processTarget, timeoutMs: 1000 });
    processTarget.emit('SIGTERM');
    processTarget.emit('SIGINT');

    expect(shutdown).toHaveBeenCalledTimes(1);
    expect(processTarget.exit).toHaveBeenCalledTimes(1);
    expect(processTarget.exit).toHaveBeenCalledWith(1);

    resolveShutdown();
    await flushPromises();
    expect(processTarget.exit).toHaveBeenCalledTimes(1);
  });

  it('forces exit when graceful shutdown exceeds its deadline', () => {
    jest.useFakeTimers();
    const processTarget = new FakeProcess();
    const shutdown = jest.fn(() => new Promise<void>(() => undefined));

    installProcessShutdownHandlers(shutdown, { processTarget, timeoutMs: 1000 });
    processTarget.emit('SIGTERM');
    jest.advanceTimersByTime(1000);

    expect(shutdown).toHaveBeenCalledTimes(1);
    expect(processTarget.exit).toHaveBeenCalledTimes(1);
    expect(processTarget.exit).toHaveBeenCalledWith(1);
    expect(jest.getTimerCount()).toBe(0);
  });
});
