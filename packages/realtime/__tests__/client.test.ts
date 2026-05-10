import { RealtimeClient } from '../src/client';
import { buildSubscriptionDocument, buildSubscriptionVariables } from '../src/document';
import type {
  SubscriptionEvent,
  SubscriptionFieldMeta,
  RealtimeClientConfig,
  ConnectionState,
} from '../src/types';

// Mock graphql-ws
const mockSubscribe = jest.fn();
const mockDispose = jest.fn();
const mockOn = jest.fn();

jest.mock('graphql-ws', () => ({
  createClient: jest.fn(() => ({
    subscribe: mockSubscribe,
    dispose: mockDispose,
    on: mockOn,
  })),
}));

const TEST_META: SubscriptionFieldMeta = {
  fieldName: 'onContactChanged',
  tableName: 'contact',
  dataFieldName: 'contact',
};

describe('RealtimeClient', () => {
  let client: RealtimeClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscribe.mockReturnValue(jest.fn());
    client = new RealtimeClient({
      url: 'wss://test.example.com/graphql',
    });
  });

  afterEach(() => {
    client.dispose();
  });

  it('starts in disconnected state', () => {
    expect(client.getConnectionState()).toBe('disconnected');
  });

  it('starts with zero active subscriptions', () => {
    expect(client.getActiveSubscriptionCount()).toBe(0);
  });

  it('increments active subscriptions on subscribe', () => {
    client.subscribe(
      TEST_META,
      'subscription { onContactChanged { event contact { id } } }',
      {},
      { onEvent: jest.fn() }
    );
    expect(client.getActiveSubscriptionCount()).toBe(1);
  });

  it('decrements active subscriptions on unsubscribe', () => {
    const unsubscribe = client.subscribe(
      TEST_META,
      'subscription { onContactChanged { event contact { id } } }',
      {},
      { onEvent: jest.fn() }
    );
    expect(client.getActiveSubscriptionCount()).toBe(1);

    unsubscribe();
    expect(client.getActiveSubscriptionCount()).toBe(0);
  });

  it('passes query and variables to graphql-ws', () => {
    const doc = 'subscription { onContactChanged { event } }';
    const vars = { filter: { id: { equalTo: '123' } } };

    client.subscribe(TEST_META, doc, vars, { onEvent: jest.fn() });

    expect(mockSubscribe).toHaveBeenCalledWith(
      { query: doc, variables: vars },
      expect.objectContaining({
        next: expect.any(Function),
        error: expect.any(Function),
        complete: expect.any(Function),
      })
    );
  });

  it('parses subscription events from graphql-ws payloads', () => {
    const onEvent = jest.fn();

    client.subscribe(TEST_META, 'subscription {}', {}, { onEvent });

    // Get the observer that was passed to wsClient.subscribe
    const observer = mockSubscribe.mock.calls[0][1];

    // Simulate a graphql-ws result
    observer.next({
      data: {
        onContactChanged: {
          event: 'INSERT',
          contact: { id: '1', name: 'Alice' },
          timestamp: '2026-01-01T00:00:00Z',
        },
      },
    });

    expect(onEvent).toHaveBeenCalledWith({
      operation: 'INSERT',
      data: { id: '1', name: 'Alice' },
      previousValues: undefined,
      timestamp: '2026-01-01T00:00:00Z',
    });
  });

  it('calls onError when graphql-ws returns errors', () => {
    const onError = jest.fn();

    client.subscribe(TEST_META, 'subscription {}', {}, {
      onEvent: jest.fn(),
      onError,
    });

    const observer = mockSubscribe.mock.calls[0][1];

    observer.next({
      errors: [{ message: 'Subscription denied' }],
    });

    expect(onError).toHaveBeenCalledWith(
      new Error('Subscription denied')
    );
  });

  it('calls onError when graphql-ws emits an error event', () => {
    const onError = jest.fn();

    client.subscribe(TEST_META, 'subscription {}', {}, {
      onEvent: jest.fn(),
      onError,
    });

    const observer = mockSubscribe.mock.calls[0][1];
    observer.error(new Error('Connection lost'));

    expect(onError).toHaveBeenCalledWith(new Error('Connection lost'));
  });

  it('calls onComplete when subscription ends', () => {
    const onComplete = jest.fn();

    client.subscribe(TEST_META, 'subscription {}', {}, {
      onEvent: jest.fn(),
      onComplete,
    });

    const observer = mockSubscribe.mock.calls[0][1];
    observer.complete();

    expect(onComplete).toHaveBeenCalled();
  });

  it('does not emit after unsubscribe', () => {
    const onEvent = jest.fn();

    const unsubscribe = client.subscribe(
      TEST_META, 'subscription {}', {}, { onEvent }
    );

    const observer = mockSubscribe.mock.calls[0][1];
    unsubscribe();

    observer.next({
      data: {
        onContactChanged: {
          event: 'UPDATE',
          contact: { id: '1' },
          timestamp: '2026-01-01T00:00:00Z',
        },
      },
    });

    expect(onEvent).not.toHaveBeenCalled();
  });

  it('notifies connection state listeners', () => {
    const listener = jest.fn();
    client.onConnectionStateChange(listener);

    // Access the on handlers from the createClient call
    const { createClient } = require('graphql-ws');
    const createClientCall = createClient.mock.calls[0][0];

    createClientCall.on.connecting();
    expect(listener).toHaveBeenCalledWith('connecting');

    createClientCall.on.connected();
    expect(listener).toHaveBeenCalledWith('connected');

    createClientCall.on.closed({});
    expect(listener).toHaveBeenCalledWith('disconnected');
  });

  it('removes state listener on unsubscribe', () => {
    const listener = jest.fn();
    const unsub = client.onConnectionStateChange(listener);
    unsub();

    const { createClient } = require('graphql-ws');
    const createClientCall = createClient.mock.calls[0][0];
    createClientCall.on.connecting();

    expect(listener).not.toHaveBeenCalled();
  });

  it('disposes the underlying ws client', () => {
    client.dispose();
    expect(mockDispose).toHaveBeenCalled();
  });

  describe('createSubscriptionModel', () => {
    it('returns a model with a subscribe method', () => {
      const model = client.createSubscriptionModel(
        TEST_META,
        (filter) => ({
          document: 'subscription { onContactChanged { event } }',
          variables: filter ? { filter } : {},
        })
      );

      expect(model).toHaveProperty('subscribe');
      expect(typeof model.subscribe).toBe('function');
    });

    it('delegates to client.subscribe with built document', () => {
      const onEvent = jest.fn();
      const model = client.createSubscriptionModel<
        { id: string; name: string },
        { id: { equalTo: string } }
      >(
        TEST_META,
        (filter) => ({
          document: 'subscription($filter: ContactFilter) { onContactChanged(filter: $filter) { event contact { id name } } }',
          variables: filter ? { filter } : {},
        })
      );

      model.subscribe({
        filter: { id: { equalTo: '42' } },
        onEvent,
      });

      expect(mockSubscribe).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: { filter: { id: { equalTo: '42' } } },
        }),
        expect.any(Object)
      );
    });
  });
});

describe('buildSubscriptionDocument', () => {
  it('builds a document with fields and no filter', () => {
    const doc = buildSubscriptionDocument(
      { fieldName: 'onContactChanged', tableName: 'contact', dataFieldName: 'contact' },
      ['id', 'name', 'email']
    );

    expect(doc).toContain('subscription OnContactChanged');
    expect(doc).toContain('onContactChanged');
    expect(doc).toContain('contact { id name email }');
    expect(doc).toContain('event');
    expect(doc).toContain('timestamp');
    expect(doc).not.toContain('$filter');
  });

  it('builds a document with a filter type', () => {
    const doc = buildSubscriptionDocument(
      { fieldName: 'onContactChanged', tableName: 'contact', dataFieldName: 'contact' },
      ['id', 'name'],
      'ContactFilter'
    );

    expect(doc).toContain('($filter: ContactFilter)');
    expect(doc).toContain('(filter: $filter)');
  });
});

describe('buildSubscriptionVariables', () => {
  it('returns empty object when no filter', () => {
    expect(buildSubscriptionVariables()).toEqual({});
    expect(buildSubscriptionVariables(undefined)).toEqual({});
  });

  it('wraps filter in variables object', () => {
    const filter = { id: { equalTo: '123' } };
    expect(buildSubscriptionVariables(filter)).toEqual({ filter });
  });
});
