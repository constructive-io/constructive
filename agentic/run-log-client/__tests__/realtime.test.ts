import { runLogNames } from '../src/names';
import {
  changedSubscriptionDocument,
  changedSubscriptionField,
  createRealtimeWakeup,
  type RunLogWsClient,
} from '../src/realtime';

const names = runLogNames();

interface FakeWs extends RunLogWsClient {
  push: () => void;
  fail: (error: Error) => void;
  closed: boolean;
  query?: string;
  variables?: Record<string, unknown>;
}

const fakeWs = (): FakeWs => {
  const ws: FakeWs = {
    closed: false,
    push: () => undefined,
    fail: () => undefined,
    subscribe: (payload, sink) => {
      ws.query = payload.query;
      ws.variables = payload.variables;
      ws.push = () => sink.next({ data: {} });
      ws.fail = (error) => sink.error(error);
      return () => {
        ws.closed = true;
      };
    },
  };
  return ws;
};

describe('the realtime wakeup', () => {
  it("subscribes to the event table's generated change field", () => {
    expect(changedSubscriptionField(names)).toBe('onAgentEventChanged');
    const ws = fakeWs();
    createRealtimeWakeup({ client: ws, names });
    expect(ws.query).toBe(changedSubscriptionDocument(names));
    expect(ws.query).toContain('onAgentEventChanged');
    // The generated subscription is argument-free; scoping happens on the read.
    expect(ws.variables).toBeUndefined();
  });

  it('lets a host override the field it resolved from _meta', () => {
    const ws = fakeWs();
    createRealtimeWakeup({
      client: ws,
      names,
      subscriptionField: 'onOrgAgentEventChanged',
    });
    expect(ws.query).toContain('onOrgAgentEventChanged');
  });

  it('carries no records — a notification only says to read again', () => {
    expect(changedSubscriptionDocument(names)).not.toMatch(/entry|seq/);
  });

  it('resolves the next wait when a change arrives', async () => {
    const ws = fakeWs();
    const wakeup = createRealtimeWakeup({ client: ws, names });
    const waiting = wakeup.waitForChange();
    ws.push();
    await expect(waiting).resolves.toBeUndefined();
  });

  it('does not lose a change that lands while the follower is reading', async () => {
    const ws = fakeWs();
    const wakeup = createRealtimeWakeup({ client: ws, names });
    ws.push();
    await expect(wakeup.waitForChange()).resolves.toBeUndefined();
    // The pending change is consumed, so the next wait blocks again.
    let resolved = false;
    void wakeup.waitForChange().then(() => {
      resolved = true;
    });
    await Promise.resolve();
    expect(resolved).toBe(false);
    wakeup.close();
  });

  it('reports a socket failure and falls back to polling instead of going silent', async () => {
    const ws = fakeWs();
    const errors: Error[] = [];
    const wakeup = createRealtimeWakeup({
      client: ws,
      names,
      onError: (error) => errors.push(error),
    });
    const waiting = wakeup.waitForChange();
    ws.fail(new Error('socket closed'));
    await expect(waiting).resolves.toBeUndefined();
    expect(errors.map((e) => e.message)).toEqual(['socket closed']);
  });

  it('closing unsubscribes and stops blocking', async () => {
    const ws = fakeWs();
    const wakeup = createRealtimeWakeup({ client: ws, names });
    wakeup.close();
    expect(ws.closed).toBe(true);
    await expect(wakeup.waitForChange()).resolves.toBeUndefined();
  });
});
