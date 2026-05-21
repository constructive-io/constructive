import {
  RealtimeManager,
  subscribeAsAsyncIterable,
  type ConnectionState,
  type SubscriptionEvent,
  type Unsubscribe,
  type WsClient,
} from '../../core/codegen/templates/orm-realtime';

type Sink = Parameters<WsClient['subscribe']>[1];

class FakeWsClient implements WsClient {
  listeners = new Map<string, Set<(...args: any[]) => void>>();
  sink: Sink | null = null;
  sinks: Sink[] = [];
  disposed = false;
  unsubscribed = false;

  on(event: 'connecting', listener: (isRetry: boolean) => void): Unsubscribe;
  on(event: 'connected', listener: (...args: unknown[]) => void): Unsubscribe;
  on(event: 'closed', listener: (event: unknown) => void): Unsubscribe;
  on(event: 'error', listener: (error: unknown) => void): Unsubscribe;
  on(event: string, listener: (...args: any[]) => void): Unsubscribe {
    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(listener);
    this.listeners.set(event, listeners);
    return () => listeners.delete(listener);
  }

  emit(event: string, ...args: unknown[]): void {
    for (const listener of this.listeners.get(event) ?? []) {
      listener(...args);
    }
  }

  subscribe(
    _payload: { query: string; variables?: Record<string, unknown> },
    sink: Sink,
  ): Unsubscribe {
    this.sink = sink;
    this.sinks.push(sink);
    return () => {
      this.unsubscribed = true;
    };
  }

  dispose(): void {
    this.disposed = true;
  }
}

describe('generated RealtimeManager runtime', () => {
  it('maps graphql-ws lifecycle events to public connection states', () => {
    const ws = new FakeWsClient();
    const manager = new RealtimeManager({ client: ws });
    const states: ConnectionState[] = [];

    // onConnectionStateChange replays current state immediately on registration,
    // so the initial 'idle' state is pushed first.
    manager.onConnectionStateChange((state) => states.push(state));

    expect(manager.connectionState).toEqual({ status: 'idle' });
    ws.emit('connecting', false);
    ws.emit('connected');
    ws.emit('connecting', true);
    ws.emit('closed', { code: 1000, reason: 'Normal Closure', wasClean: true });

    expect(states).toEqual([
      { status: 'idle' },
      { status: 'connecting' },
      { status: 'connected' },
      { status: 'reconnecting' },
      { status: 'closed', code: 1000, reason: 'Normal Closure', wasClean: true },
    ]);
    expect(manager.connectionState).toEqual({
      status: 'closed',
      code: 1000,
      reason: 'Normal Closure',
      wasClean: true,
    });
  });

  it('normalizes server payloads and suppresses late events after unsubscribe', () => {
    const ws = new FakeWsClient();
    const manager = new RealtimeManager({ client: ws });
    const events: Array<{ operation: string; data: unknown; rowId: string | null; overflow: boolean }> = [];

    const unsubscribe = manager.subscribe(
      {
        fieldName: 'onContactChanged',
        tableName: 'contact',
        dataFieldName: 'contact',
      },
      'subscription { onContactChanged { event rowId overflow contact { id } } }',
      {},
      { onEvent: (event) => events.push(event) },
    );

    ws.sink?.next({
      data: {
        onContactChanged: {
          event: 'ARCHIVE',
          rowId: 'row-1',
          overflow: false,
          contact: { id: 'row-1' },
        },
      },
    });
    unsubscribe();
    ws.sink?.next({
      data: {
        onContactChanged: {
          event: 'UPDATE',
          rowId: 'row-2',
          overflow: false,
          contact: { id: 'row-2' },
        },
      },
    });

    expect(events).toEqual([
      {
        operation: 'UNKNOWN',
        data: { id: 'row-1' },
        rowId: 'row-1',
        overflow: false,
      },
    ]);
    expect(ws.unsubscribed).toBe(true);
    expect(manager.activeSubscriptionCount).toBe(0);
  });

  it('reports malformed payloads via onError without delivering an event', () => {
    const ws = new FakeWsClient();
    const manager = new RealtimeManager({ client: ws });
    const onEvent = jest.fn();
    const onError = jest.fn();

    manager.subscribe(
      {
        fieldName: 'onContactChanged',
        tableName: 'contact',
        dataFieldName: 'contact',
      },
      'subscription { onContactChanged { event rowId overflow contact { id } } }',
      {},
      { onEvent, onError },
    );

    ws.sink?.next({
      data: {
        onContactChanged: {
          event: 'UPDATE',
          contact: { id: 'row-1' },
        },
      },
    });

    expect(onEvent).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('exposes a distinct error state before close', () => {
    const ws = new FakeWsClient();
    const manager = new RealtimeManager({ client: ws });
    const states: ConnectionState[] = [];
    manager.onConnectionStateChange((state) => states.push(state));

    ws.emit('connecting', false);
    ws.emit('connected');
    ws.emit('error', new Error('boom'));
    ws.emit('closed', { code: 1006, reason: '', wasClean: false });

    // First entry is the replayed 'idle' state from registration
    expect(states).toEqual([
      { status: 'idle' },
      { status: 'connecting' },
      { status: 'connected' },
      { status: 'error', error: new Error('boom') },
      { status: 'closed', code: 1006, reason: '', wasClean: false },
    ]);
  });

  it('closes websocket listeners and notifies closed before clearing listeners', () => {
    const ws = new FakeWsClient();
    const manager = new RealtimeManager({ client: ws });
    const states: ConnectionState[] = [];

    manager.onConnectionStateChange((state) => states.push(state));
    manager.close();
    ws.emit('connecting', false);

    expect(ws.disposed).toBe(true);
    // First entry is the replayed 'idle' state, second is the 'closed' from close()
    expect(states).toEqual([
      { status: 'idle' },
      { status: 'closed', code: 1000, reason: 'Normal Closure', wasClean: true },
    ]);
    expect(manager.connectionState).toEqual({
      status: 'closed',
      code: 1000,
      reason: 'Normal Closure',
      wasClean: true,
    });
  });

  it('delivers overflow=true events with the INVALIDATE operation', () => {
    const ws = new FakeWsClient();
    const manager = new RealtimeManager({ client: ws });
    const events: Array<{ operation: string; data: unknown; rowId: string | null; overflow: boolean }> = [];

    manager.subscribe(
      { fieldName: 'onContactChanged', tableName: 'contact', dataFieldName: 'contact' },
      'subscription { onContactChanged { event rowId overflow contact { id } } }',
      {},
      { onEvent: (event) => events.push(event) },
    );

    ws.sink?.next({
      data: {
        onContactChanged: {
          event: 'INVALIDATE',
          rowId: null,
          overflow: true,
          contact: null,
        },
      },
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ operation: 'INVALIDATE', data: null, rowId: null, overflow: true });
  });

  it('reports error then closed when the connection drops with an active subscription', () => {
    const ws = new FakeWsClient();
    const manager = new RealtimeManager({ client: ws });
    const states: ConnectionState[] = [];
    const errors: unknown[] = [];
    const events: unknown[] = [];

    manager.onConnectionStateChange((state) => states.push(state));

    manager.subscribe(
      { fieldName: 'onContactChanged', tableName: 'contact', dataFieldName: 'contact' },
      'subscription { onContactChanged { event rowId overflow contact { id } } }',
      {},
      {
        onEvent: (event) => events.push(event),
        onError: (err) => errors.push(err),
      },
    );

    ws.emit('connecting', false);
    ws.emit('connected');

    // Deliver one valid event before the connection drops
    ws.sink?.next({
      data: {
        onContactChanged: {
          event: 'UPDATE',
          rowId: 'row-1',
          overflow: false,
          contact: { id: 'row-1' },
        },
      },
    });

    ws.emit('error', new Error('lost'));
    ws.emit('closed', { code: 1006, reason: '', wasClean: false });

    // First entry is the replayed 'idle' state from registration
    expect(states).toEqual([
      { status: 'idle' },
      { status: 'connecting' },
      { status: 'connected' },
      { status: 'error', error: new Error('lost') },
      { status: 'closed', code: 1006, reason: '', wasClean: false },
    ]);
    // The event delivered before the drop must not be lost
    expect(events).toHaveLength(1);
  });

  it('multiple concurrent subscriptions do not cross-contaminate', () => {
    const ws = new FakeWsClient();
    const manager = new RealtimeManager({ client: ws });
    const contactEvents: unknown[] = [];
    const projectEvents: unknown[] = [];

    manager.subscribe(
      { fieldName: 'onContactChanged', tableName: 'contact', dataFieldName: 'contact' },
      'subscription { onContactChanged { event rowId overflow contact { id } } }',
      {},
      { onEvent: (event) => contactEvents.push(event) },
    );

    manager.subscribe(
      { fieldName: 'onProjectChanged', tableName: 'project', dataFieldName: 'project' },
      'subscription { onProjectChanged { event rowId overflow project { id } } }',
      {},
      { onEvent: (event) => projectEvents.push(event) },
    );

    // Emit through the first sink only
    ws.sinks[0]?.next({
      data: {
        onContactChanged: {
          event: 'UPDATE',
          rowId: 'c-1',
          overflow: false,
          contact: { id: 'c-1' },
        },
      },
    });

    expect(contactEvents).toHaveLength(1);
    expect(projectEvents).toHaveLength(0);

    // Emit through the second sink only
    ws.sinks[1]?.next({
      data: {
        onProjectChanged: {
          event: 'INSERT',
          rowId: 'p-1',
          overflow: false,
          project: { id: 'p-1' },
        },
      },
    });

    expect(contactEvents).toHaveLength(1);
    expect(projectEvents).toHaveLength(1);
  });

  it('tracks active subscription count through subscribe/unsubscribe/dispose', () => {
    const ws = new FakeWsClient();
    const manager = new RealtimeManager({ client: ws });

    const unsub1 = manager.subscribe(
      { fieldName: 'onContactChanged', tableName: 'contact', dataFieldName: 'contact' },
      'subscription { onContactChanged { event rowId overflow contact { id } } }',
      {},
      { onEvent: () => {} },
    );
    const unsub2 = manager.subscribe(
      { fieldName: 'onContactChanged', tableName: 'contact', dataFieldName: 'contact' },
      'subscription { onContactChanged { event rowId overflow contact { id } } }',
      {},
      { onEvent: () => {} },
    );
    manager.subscribe(
      { fieldName: 'onContactChanged', tableName: 'contact', dataFieldName: 'contact' },
      'subscription { onContactChanged { event rowId overflow contact { id } } }',
      {},
      { onEvent: () => {} },
    );

    expect(manager.activeSubscriptionCount).toBe(3);

    unsub1();
    expect(manager.activeSubscriptionCount).toBe(2);

    unsub2();
    expect(manager.activeSubscriptionCount).toBe(1);

    manager.close();
    expect(manager.activeSubscriptionCount).toBe(0);
  });

  describe('dispose race conditions', () => {
    it('suppresses sink.next() calls that arrive after close() but before socket close', () => {
      const ws = new FakeWsClient();
      const manager = new RealtimeManager({ client: ws });
      const received: unknown[] = [];

      manager.subscribe(
        { fieldName: 'onContactChanged', tableName: 'contact', dataFieldName: 'contact' },
        'subscription { onContactChanged { event rowId overflow contact { id } } }',
        {},
        { onEvent: (event) => received.push(event) },
      );

      // Simulate: manager.close() is called, which flips all external disposers.
      // Then a sink.next() fires (from graphql-ws onmessage, which runs synchronously
      // before the socket actually closes). The callback must be suppressed.
      manager.close();

      // This simulates graphql-ws delivering a message after dispose() was called
      // but before the underlying WebSocket.onclose event fires.
      ws.sink?.next({
        data: {
          onContactChanged: {
            event: 'UPDATE',
            rowId: 'row-1',
            overflow: false,
            contact: { id: 'row-1' },
          },
        },
      });

      expect(received).toHaveLength(0);
    });
  });

  describe('close code capture', () => {
    it('captures close code, reason, and wasClean from the closed event', () => {
      const ws = new FakeWsClient();
      const manager = new RealtimeManager({ client: ws });
      const states: ConnectionState[] = [];

      manager.onConnectionStateChange((state) => states.push(state));

      // Simulate an auth failure close (4401 Unauthorized)
      ws.emit('closed', { code: 4401, reason: 'Unauthorized', wasClean: true });

      // states[0] is the replayed 'idle' state; states[1] is the closed event
      expect(states).toHaveLength(2);
      expect(states[1]).toEqual({
        status: 'closed',
        code: 4401,
        reason: 'Unauthorized',
        wasClean: true,
      });
    });

    it('defaults to code 1006 and wasClean=false when event has no code property', () => {
      const ws = new FakeWsClient();
      const manager = new RealtimeManager({ client: ws });
      const states: ConnectionState[] = [];

      manager.onConnectionStateChange((state) => states.push(state));

      // Simulate abnormal close — graphql-ws can emit with an empty/partial event
      ws.emit('closed', {});

      // states[0] is the replayed 'idle' state; states[1] is the closed event
      expect(states[1]).toEqual({
        status: 'closed',
        code: 1006,
        reason: '',
        wasClean: false,
      });
    });
  });

  describe('error capture', () => {
    it('wraps non-Error rejections in an Error and preserves Error instances', () => {
      const ws = new FakeWsClient();
      const manager = new RealtimeManager({ client: ws });
      const states: ConnectionState[] = [];

      manager.onConnectionStateChange((state) => states.push(state));

      const boom = new Error('boom');
      ws.emit('error', boom);

      // states[0] is the replayed 'idle' state; states[1] is the error state
      expect(states).toHaveLength(2);
      const state = states[1];
      expect(state.status).toBe('error');
      if (state.status === 'error') {
        expect(state.error).toBe(boom);
        expect(state.error.message).toBe('boom');
      }
    });

    it('wraps non-Error values in a new Error', () => {
      const ws = new FakeWsClient();
      const manager = new RealtimeManager({ client: ws });
      const states: ConnectionState[] = [];

      manager.onConnectionStateChange((state) => states.push(state));

      ws.emit('error', 'something went wrong');

      // states[0] is the replayed 'idle' state; states[1] is the error state
      const state = states[1];
      expect(state.status).toBe('error');
      if (state.status === 'error') {
        expect(state.error).toBeInstanceOf(Error);
        expect(state.error.message).toBe('something went wrong');
      }
    });
  });

  it('memory leak fix — server complete: cleans up activeDisposers and activeSubscriptions', () => {
    const ws = new FakeWsClient();
    const manager = new RealtimeManager({ client: ws });

    manager.subscribe(
      { fieldName: 'onContactChanged', tableName: 'contact', dataFieldName: 'contact' },
      'subscription { onContactChanged { event rowId overflow contact { id } } }',
      {},
      { onEvent: () => {} },
    );

    expect(manager.activeSubscriptionCount).toBe(1);

    // Server initiates completion
    ws.sink?.complete();

    expect(manager.activeSubscriptionCount).toBe(0);
  });

  it('memory leak fix — server error: cleans up activeDisposers and activeSubscriptions', () => {
    const ws = new FakeWsClient();
    const manager = new RealtimeManager({ client: ws });

    manager.subscribe(
      { fieldName: 'onContactChanged', tableName: 'contact', dataFieldName: 'contact' },
      'subscription { onContactChanged { event rowId overflow contact { id } } }',
      {},
      { onEvent: () => {}, onError: () => {} },
    );

    expect(manager.activeSubscriptionCount).toBe(1);

    // Server sends an error terminating the subscription
    ws.sink?.error(new Error('server error'));

    expect(manager.activeSubscriptionCount).toBe(0);
  });

  it('memory leak fix — consumer unsubscribe after server complete is a no-op (double-free safe)', () => {
    const ws = new FakeWsClient();
    const manager = new RealtimeManager({ client: ws });
    const completed: string[] = [];

    const unsubscribe = manager.subscribe(
      { fieldName: 'onContactChanged', tableName: 'contact', dataFieldName: 'contact' },
      'subscription { onContactChanged { event rowId overflow contact { id } } }',
      {},
      { onEvent: () => {}, onComplete: () => completed.push('done') },
    );

    ws.sink?.complete();
    expect(completed).toEqual(['done']);
    expect(manager.activeSubscriptionCount).toBe(0);

    // Calling unsubscribe after server complete must not double-decrement
    unsubscribe();
    expect(manager.activeSubscriptionCount).toBe(0);
  });
});

describe('onConnectionStateChange replay', () => {
  it('invokes listener synchronously with current state on registration', () => {
    const ws = new FakeWsClient();
    const manager = new RealtimeManager({ client: ws });
    const received: ConnectionState[] = [];

    manager.onConnectionStateChange((state) => received.push(state));

    // Should have been called immediately once with the current idle state
    expect(received).toEqual([{ status: 'idle' }]);

    // Then subsequent transitions should also fire
    ws.emit('connecting', false);
    expect(received).toEqual([{ status: 'idle' }, { status: 'connecting' }]);
  });

  it('replays current state to late-registered listeners after transition', () => {
    const ws = new FakeWsClient();
    const manager = new RealtimeManager({ client: ws });

    ws.emit('connecting', false);
    ws.emit('connected');

    const received: ConnectionState[] = [];
    manager.onConnectionStateChange((state) => received.push(state));

    // Listener registered after 'connected' — must see 'connected' immediately
    expect(received).toEqual([{ status: 'connected' }]);
  });
});

type TestRow = { id: string };

type SubscribeFnCallbacks = {
  onEvent: (event: SubscriptionEvent<TestRow>) => void;
  onError: (err: unknown) => void;
  onComplete: () => void;
};

describe('subscribeAsAsyncIterable', () => {
  function makeSubscribeFn(): {
    subscribeFn: (callbacks: SubscribeFnCallbacks) => Unsubscribe;
    emit: (event: SubscriptionEvent<TestRow>) => void;
    error: (err: unknown) => void;
    complete: () => void;
    unsubscribeCalled: () => boolean;
  } {
    let onEvent: ((e: SubscriptionEvent<TestRow>) => void) | null = null;
    let onError: ((err: unknown) => void) | null = null;
    let onComplete: (() => void) | null = null;
    let unsubscribeCalled = false;

    const subscribeFn = (cbs: SubscribeFnCallbacks): Unsubscribe => {
      onEvent = cbs.onEvent;
      onError = cbs.onError;
      onComplete = cbs.onComplete;
      return () => { unsubscribeCalled = true; };
    };

    return {
      subscribeFn,
      emit: (event) => onEvent?.(event),
      error: (err) => onError?.(err),
      complete: () => onComplete?.(),
      unsubscribeCalled: () => unsubscribeCalled,
    };
  }

  const makeEvent = (id: string): SubscriptionEvent<{ id: string }> => ({
    operation: 'UPDATE',
    data: { id },
    rowId: id,
    overflow: false,
  });

  it('yields events in order via AsyncIterableIterator', async () => {
    const { subscribeFn, emit } = makeSubscribeFn();
    const iter = subscribeAsAsyncIterable<{ id: string }>(subscribeFn);

    emit(makeEvent('a'));
    emit(makeEvent('b'));

    const r1 = await iter.next();
    const r2 = await iter.next();

    expect(r1).toEqual({ value: makeEvent('a'), done: false });
    expect(r2).toEqual({ value: makeEvent('b'), done: false });
  });

  it('resolves done:true when server sends complete', async () => {
    const { subscribeFn, complete } = makeSubscribeFn();
    const iter = subscribeAsAsyncIterable<{ id: string }>(subscribeFn);

    complete();
    const result = await iter.next();
    expect(result.done).toBe(true);
  });

  it('rejects next() when server sends error', async () => {
    const { subscribeFn, error } = makeSubscribeFn();
    const iter = subscribeAsAsyncIterable<{ id: string }>(subscribeFn);

    error(new Error('server boom'));
    await expect(iter.next()).rejects.toThrow('server boom');
  });

  it('resolves done:true and calls unsubscribe when AbortSignal is aborted', async () => {
    const { subscribeFn, unsubscribeCalled } = makeSubscribeFn();
    const controller = new AbortController();
    const iter = subscribeAsAsyncIterable<{ id: string }>(subscribeFn, controller.signal);

    // Abort before pulling — the cleanup runs synchronously
    controller.abort();

    const result = await iter.next();
    expect(result.done).toBe(true);
    expect(unsubscribeCalled()).toBe(true);
  });

  it('resolves done:true and calls unsubscribe when iter.return() is called', async () => {
    const { subscribeFn, unsubscribeCalled } = makeSubscribeFn();
    const iter = subscribeAsAsyncIterable<{ id: string }>(subscribeFn);

    await iter.return?.();
    const result = await iter.next();
    expect(result.done).toBe(true);
    expect(unsubscribeCalled()).toBe(true);
  });
});
