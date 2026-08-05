/**
 * Tests for the realtime subscriptions plugin.
 *
 * Covers:
 * - Table discovery via @realtime smart tag
 * - Subscription field generation (onXxxChanged)
 * - Payload type generation (XxxSubscriptionPayload) with rowId and overflow fields
 * - NOTIFY channel naming (realtime:{schema}.{table})
 * - Tables without @realtime tag are excluded
 * - Empty registry produces no fields
 * - Multiple realtime tables produce multiple fields
 * - NOTIFY payload parsing (TG_OP:id1,id2,... and INVALIDATE)
 * - Per-subscriber event throttling with configurable limit
 * - Sparse set subscriptions (ids: [UUID!]) with row ID intersection filtering
 * - RLS-aware event suppression and rowId masking
 */

jest.mock('@pgpmjs/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

const mockListen = jest.fn();
const mockConstant = jest.fn((val: any) => `constant(${val})`);
const mockLambda = jest.fn((input: any, fn: Function) => fn(input));
const mockGet = jest.fn((parent: any, key: string) =>
  typeof parent?.get === 'function' ? parent.get(key) : parent?.[key]
);
let mockPgSubscriber: any = 'mock-pgSubscriber';
const mockContext = jest.fn(() => ({
  get: jest.fn((key: string) => key === 'pgSubscriber' ? mockPgSubscriber : `mock-${key}`),
}));

jest.mock('grafast', () => ({
  context: mockContext,
  listen: mockListen,
  constant: mockConstant,
  get: mockGet,
  lambda: mockLambda,
}));

let capturedFactory: Function | null = null;
jest.mock('graphile-utils', () => ({
  extendSchema: jest.fn((factory: any, name: string) => {
    capturedFactory = factory;
    return {
      name,
      version: '0.1.0',
      schema: { hooks: {} },
    };
  }),
  gql: jest.fn((strings: TemplateStringsArray) => strings.join('')),
}));

import type { EventGateOptions } from '../src/event-gate';
import {
  createGatedSubscriber,
  createRealtimeSubscriptionsPlugin,
  DEFAULT_OVERFLOW_THRESHOLD,
  EventThrottle,
  MalformedNotifyPayloadError,
  parseNotifyPayload,
  RealtimeSubscriptionsPlugin,
  selectCandidateRowId,
} from '../src/plugin';

// --- Test helpers ---

function createMockCodec(
  name: string,
  opts: {
    realtime?: boolean;
    schemaName?: string;
    attributes?: Record<string, any>;
  } = {},
) {
  const { realtime = false, schemaName = 'app_public', attributes = { id: {} } } = opts;
  return {
    name,
    attributes,
    extensions: {
      tags: realtime ? { realtime: true } : {},
      pg: { schemaName, name },
    },
  };
}

function createMockExecutorContext(
  visibleIds: readonly string[] = [],
  pgSettings: Record<string, string> = { role: 'tenant_runtime' },
) {
  const visible = new Set(visibleIds);
  const query = jest.fn(async ({ values }: { text: string; values?: unknown[] }) => {
    const requestedIds = (values?.[0] ?? []) as string[];
    const rows = requestedIds
      .filter((rowId) => visible.has(rowId))
      .map((id) => ({ id }));
    return { rows };
  });
  const withPgClient = jest.fn(async (_settings: unknown, callback: Function) =>
    callback({ query })
  );

  return {
    executorContext: { pgSettings, withPgClient },
    query,
    withPgClient,
  };
}

function createMockResource(name: string, codec: any, executorContext?: any) {
  const context = executorContext ?? createMockExecutorContext().executorContext;
  return {
    codec,
    name,
    executor: {
      context: jest.fn(() => context),
    },
  };
}

async function* notifications(payloads: readonly string[]) {
  for (const payload of payloads) yield payload;
}

async function collectNotifications(iterable: AsyncIterable<unknown>) {
  const result: unknown[] = [];
  for await (const payload of iterable) result.push(payload);
  return result;
}

function createMockBuild(resources: Record<string, any>, inflectionOverrides: Record<string, any> = {}) {
  return {
    input: {
      pgRegistry: {
        pgResources: resources,
      },
    },
    inflection: {
      tableType: (codec: any) => {
        const name = codec.name;
        return name.charAt(0).toUpperCase() + name.slice(1).replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase());
      },
      ...inflectionOverrides,
    },
  };
}

// --- Tests ---

describe('parseNotifyPayload', () => {
  it('parses INSERT with single row ID', () => {
    const result = parseNotifyPayload('INSERT:abc-123');
    expect(result).toEqual({
      event: 'INSERT',
      rowIds: ['abc-123'],
      overflow: false,
    });
  });

  it('parses UPDATE with multiple row IDs', () => {
    const result = parseNotifyPayload('UPDATE:id1,id2,id3');
    expect(result).toEqual({
      event: 'UPDATE',
      rowIds: ['id1', 'id2', 'id3'],
      overflow: false,
    });
  });

  it('parses DELETE with single row ID', () => {
    const result = parseNotifyPayload('DELETE:uuid-456');
    expect(result).toEqual({
      event: 'DELETE',
      rowIds: ['uuid-456'],
      overflow: false,
    });
  });

  it('parses INVALIDATE as overflow', () => {
    const result = parseNotifyPayload('INVALIDATE');
    expect(result).toEqual({
      event: 'INVALIDATE',
      rowIds: [],
      overflow: true,
    });
  });

  // A payload this cannot read means emit_change and this plugin have
  // diverged. Inventing an event name for it hides a deployment fault behind
  // data the client acts on, so every unreadable shape is a hard failure.
  it.each([
    ['a payload with no colon', 'INSERT'],
    ['an empty payload', ''],
    ['an operation with no row ids', 'INSERT:'],
    ['an unknown operation', 'TRUNCATE:abc-123'],
  ])('throws on %s', (_label, raw) => {
    expect(() => parseNotifyPayload(raw)).toThrow(MalformedNotifyPayloadError);
  });

  it('names the offending payload in the error', () => {
    expect(() => parseNotifyPayload('TRUNCATE:abc')).toThrow(/"TRUNCATE:abc"/);
  });
});

describe('EventThrottle', () => {
  it('delivers events under threshold', () => {
    const throttle = new EventThrottle(3);

    expect(throttle.check()).toBe('deliver');
    expect(throttle.check()).toBe('deliver');
    expect(throttle.check()).toBe('deliver');
  });

  it('returns overflow on first event exceeding threshold', () => {
    const throttle = new EventThrottle(2);

    expect(throttle.check()).toBe('deliver');
    expect(throttle.check()).toBe('deliver');
    expect(throttle.check()).toBe('overflow');
  });

  it('returns drop for subsequent events after overflow', () => {
    const throttle = new EventThrottle(1);

    expect(throttle.check()).toBe('deliver');
    expect(throttle.check()).toBe('overflow');
    expect(throttle.check()).toBe('drop');
    expect(throttle.check()).toBe('drop');
  });

  it('resets after 1-second window', () => {
    const throttle = new EventThrottle(1);
    const originalDateNow = Date.now;

    let currentTime = 1000;
    Date.now = () => currentTime;

    try {
      expect(throttle.check()).toBe('deliver');
      expect(throttle.check()).toBe('overflow');

      currentTime += 1000;

      expect(throttle.check()).toBe('deliver');
      expect(throttle.check()).toBe('overflow');
    } finally {
      Date.now = originalDateNow;
    }
  });
});

describe('DEFAULT_OVERFLOW_THRESHOLD', () => {
  it('is 50', () => {
    expect(DEFAULT_OVERFLOW_THRESHOLD).toBe(50);
  });
});

describe('createRealtimeSubscriptionsPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedFactory = null;
    mockPgSubscriber = 'mock-pgSubscriber';
  });

  describe('plugin structure', () => {
    it('returns a plugin object with name', () => {
      const plugin = createRealtimeSubscriptionsPlugin();

      expect(plugin).toBeDefined();
      expect(plugin.name).toBe('RealtimeSubscriptionsPlugin');
    });

    it('exports RealtimeSubscriptionsPlugin as alias', () => {
      expect(RealtimeSubscriptionsPlugin).toBe(createRealtimeSubscriptionsPlugin);
    });
  });

  describe('table discovery', () => {
    it('reports sorted credential-free physical topic descriptors during build', () => {
      const onTopicsDiscovered = jest.fn();
      createRealtimeSubscriptionsPlugin({ onTopicsDiscovered });

      const zeta = createMockCodec('zeta', {
        realtime: true,
        schemaName: 'tenant_a'
      });
      const alpha = createMockCodec('alpha', {
        realtime: true,
        schemaName: 'tenant_a'
      });
      capturedFactory!(createMockBuild({
        zeta: createMockResource('zeta', zeta),
        alpha: createMockResource('alpha', alpha)
      }));

      expect(onTopicsDiscovered).toHaveBeenCalledTimes(1);
      expect(onTopicsDiscovered).toHaveBeenCalledWith([
        { topic: 'realtime:tenant_a.alpha', schema: 'tenant_a', table: 'alpha' },
        { topic: 'realtime:tenant_a.zeta', schema: 'tenant_a', table: 'zeta' }
      ]);
    });

    it('reports an explicit empty topic set', () => {
      const onTopicsDiscovered = jest.fn();
      createRealtimeSubscriptionsPlugin({ onTopicsDiscovered });
      capturedFactory!(createMockBuild({}));

      expect(onTopicsDiscovered).toHaveBeenCalledWith([]);
    });

    it('discovers tables with @realtime tag', () => {
      createRealtimeSubscriptionsPlugin();

      const codec = createMockCodec('projects', { realtime: true });
      const build = createMockBuild({
        projects: createMockResource('projects', codec),
      });

      const result = capturedFactory!(build);

      expect(result.typeDefs).toContain('onProjectsChanged');
      expect(result.typeDefs).toContain('ProjectsSubscriptionPayload');
    });

    it('skips tables without @realtime tag', () => {
      createRealtimeSubscriptionsPlugin();

      const codec = createMockCodec('users', { realtime: false });
      const build = createMockBuild({
        users: createMockResource('users', codec),
      });

      const result = capturedFactory!(build);

      expect(result.typeDefs).toBe('');
      expect(result.plans).toEqual({});
    });

    it('skips resources without codec attributes (functions, etc.)', () => {
      createRealtimeSubscriptionsPlugin();

      const build = createMockBuild({
        my_function: { codec: { name: 'my_function' }, name: 'my_function' },
      });

      const result = capturedFactory!(build);

      expect(result.typeDefs).toBe('');
      expect(result.plans).toEqual({});
    });

    it('returns empty when registry has no resources', () => {
      createRealtimeSubscriptionsPlugin();

      const build = createMockBuild({});
      const result = capturedFactory!(build);

      expect(result.typeDefs).toBe('');
      expect(result.plans).toEqual({});
    });

    it('discovers multiple realtime tables', () => {
      createRealtimeSubscriptionsPlugin();

      const projectsCodec = createMockCodec('projects', { realtime: true });
      const tasksCodec = createMockCodec('tasks', { realtime: true });
      const usersCodec = createMockCodec('users', { realtime: false });

      const build = createMockBuild({
        projects: createMockResource('projects', projectsCodec),
        tasks: createMockResource('tasks', tasksCodec),
        users: createMockResource('users', usersCodec),
      });

      const result = capturedFactory!(build);

      expect(result.typeDefs).toContain('onProjectsChanged');
      expect(result.typeDefs).toContain('onTasksChanged');
      expect(result.typeDefs).not.toContain('onUsersChanged');
    });
  });

  describe('type definitions', () => {
    it('generates subscription field with ids argument', () => {
      createRealtimeSubscriptionsPlugin();

      const codec = createMockCodec('documents', { realtime: true });
      const build = createMockBuild({
        documents: createMockResource('documents', codec),
      });

      const result = capturedFactory!(build);

      expect(result.typeDefs).toContain('onDocumentsChanged(ids: [UUID!]): DocumentsSubscriptionPayload');
    });

    it('generates payload type with event, row, rowId, and overflow fields', () => {
      createRealtimeSubscriptionsPlugin();

      const codec = createMockCodec('documents', { realtime: true });
      const build = createMockBuild({
        documents: createMockResource('documents', codec),
      });

      const result = capturedFactory!(build);

      expect(result.typeDefs).toContain('type DocumentsSubscriptionPayload');
      expect(result.typeDefs).toContain('event: String!');
      expect(result.typeDefs).toContain('documents: Documents');
      expect(result.typeDefs).toContain('rowId: UUID');
      expect(result.typeDefs).toContain('overflow: Boolean!');
      expect(result.typeDefs).toContain('after RLS authorization');
    });

    it('extends Subscription type', () => {
      createRealtimeSubscriptionsPlugin();

      const codec = createMockCodec('projects', { realtime: true });
      const build = createMockBuild({
        projects: createMockResource('projects', codec),
      });

      const result = capturedFactory!(build);

      expect(result.typeDefs).toMatch(/^extend type Subscription \{/);
    });
  });

  describe('NOTIFY channel naming', () => {
    it('uses realtime:{schema}.{table} format', () => {
      createRealtimeSubscriptionsPlugin();

      const codec = createMockCodec('projects', {
        realtime: true,
        schemaName: 'app_public',
      });
      const build = createMockBuild({
        projects: createMockResource('projects', codec),
      });

      const result = capturedFactory!(build);

      expect(result.plans).toBeDefined();
      expect(result.plans['Subscription']).toBeDefined();
      expect(result.plans['Subscription']['onProjectsChanged']).toBeDefined();

      const mockArgs = { getRaw: jest.fn(() => ['test-id']) };
      result.plans['Subscription']['onProjectsChanged'].subscribePlan(null, mockArgs);

      expect(mockConstant).toHaveBeenCalledWith('realtime:app_public.projects');
    });

    it('handles different schema names', () => {
      createRealtimeSubscriptionsPlugin();

      const codec = createMockCodec('items', {
        realtime: true,
        schemaName: 'inventory_public',
      });
      const build = createMockBuild({
        items: createMockResource('items', codec),
      });

      const result = capturedFactory!(build);

      const mockArgs = { getRaw: jest.fn(() => ['test-id']) };
      result.plans['Subscription']['onItemsChanged'].subscribePlan(null, mockArgs);

      expect(mockConstant).toHaveBeenCalledWith('realtime:inventory_public.items');
    });
  });

  describe('plan generation', () => {
    it('generates subscribePlan and plan for each table', () => {
      createRealtimeSubscriptionsPlugin();

      const codec = createMockCodec('projects', { realtime: true });
      const build = createMockBuild({
        projects: createMockResource('projects', codec),
      });

      const result = capturedFactory!(build);
      const subscriptionPlan = result.plans['Subscription']['onProjectsChanged'];

      expect(typeof subscriptionPlan.subscribePlan).toBe('function');
      expect(typeof subscriptionPlan.plan).toBe('function');
    });

    it('subscribePlan calls listen with pgSubscriber and topic', () => {
      createRealtimeSubscriptionsPlugin();

      const codec = createMockCodec('tasks', { realtime: true });
      const build = createMockBuild({
        tasks: createMockResource('tasks', codec),
      });

      const result = capturedFactory!(build);
      const mockArgs = { getRaw: jest.fn(() => ['some-id']) };

      result.plans['Subscription']['onTasksChanged'].subscribePlan(null, mockArgs);

      expect(mockContext).toHaveBeenCalled();
      expect(mockListen).toHaveBeenCalled();
    });

    it('plan function returns event as-is', () => {
      createRealtimeSubscriptionsPlugin();

      const codec = createMockCodec('tasks', { realtime: true });
      const build = createMockBuild({
        tasks: createMockResource('tasks', codec),
      });

      const result = capturedFactory!(build);
      const mockEvent = { get: jest.fn() };

      const planResult = result.plans['Subscription']['onTasksChanged'].plan(mockEvent);
      expect(planResult).toBe(mockEvent);
    });

    it('generates payload type plans with event, row, rowId, and overflow resolvers', () => {
      createRealtimeSubscriptionsPlugin();

      const codec = createMockCodec('tasks', { realtime: true });
      const mockResource = createMockResource('tasks', codec);
      const build = createMockBuild({
        tasks: mockResource,
      });

      const result = capturedFactory!(build);
      const payloadPlan = result.plans['TasksSubscriptionPayload'];

      expect(payloadPlan).toBeDefined();
      expect(typeof payloadPlan.event).toBe('function');
      expect(typeof payloadPlan.tasks).toBe('function');
      expect(typeof payloadPlan.rowId).toBe('function');
      expect(typeof payloadPlan.overflow).toBe('function');
    });

    it('payload event resolver reads from parsed field', () => {
      createRealtimeSubscriptionsPlugin();

      const codec = createMockCodec('tasks', { realtime: true });
      const build = createMockBuild({
        tasks: createMockResource('tasks', codec),
      });

      const result = capturedFactory!(build);
      const mockParent = { get: jest.fn(() => ({ event: 'INSERT', rowIds: ['id1'], overflow: false })) };

      result.plans['TasksSubscriptionPayload'].event(mockParent);
      expect(mockParent.get).toHaveBeenCalledWith('parsed');
    });

    it('payload row resolver uses the authorized row for full collection mode', () => {
      createRealtimeSubscriptionsPlugin();

      const codec = createMockCodec('tasks', { realtime: true });
      const mockResource = {
        ...createMockResource('tasks', codec),
        get: jest.fn(),
      };
      const build = createMockBuild({
        tasks: mockResource,
      });

      const result = capturedFactory!(build);
      const mockParent = { get: jest.fn((key: string) => {
        if (key === 'parsed') {
          return { event: 'INSERT', rowIds: ['row-uuid'], overflow: false };
        }
        if (key === 'subscribedIds') return null;
        return null;
      }) };

      result.plans['TasksSubscriptionPayload'].tasks(mockParent);
      expect(mockParent.get).toHaveBeenCalledWith('parsed');
      expect(mockParent.get).toHaveBeenCalledWith('subscribedIds');
      expect(mockResource.get).toHaveBeenCalledWith({ id: 'row-uuid' });
    });
  });

  describe('overflow threshold configuration', () => {
    it('uses default threshold of 50 when not specified', () => {
      createRealtimeSubscriptionsPlugin();

      const codec = createMockCodec('projects', { realtime: true });
      const build = createMockBuild({
        projects: createMockResource('projects', codec),
      });

      const result = capturedFactory!(build);
      expect(result.plans).toBeDefined();
    });

    it('accepts custom overflow threshold', () => {
      createRealtimeSubscriptionsPlugin({ overflowThreshold: 10 });

      const codec = createMockCodec('projects', { realtime: true });
      const build = createMockBuild({
        projects: createMockResource('projects', codec),
      });

      const result = capturedFactory!(build);
      expect(result.plans).toBeDefined();
    });
  });

  // These drive a real async iterable through the gate and assert on what the
  // stream *yields*. The previous versions re-implemented the intersection
  // inline and asserted on `.get()` call sites, which is why a filtered event
  // reaching the client as `event: 'UNKNOWN'` went unnoticed.
  describe('sparse set filtering (ids argument)', () => {
    function subscriberEmitting(...payloads: string[]) {
      return {
        // eslint-disable-next-line @typescript-eslint/require-await
        async *subscribe() {
          yield* payloads;
        },
      };
    }

    async function collect(subscriber: { subscribe(topic: string): any }) {
      const out = [];
      for await (const event of await subscriber.subscribe('realtime:app_public.tasks')) {
        out.push(event);
      }
      return out;
    }

    it('yields nothing at all for an unsubscribed row', async () => {
      const gated = createGatedSubscriber(subscriberEmitting('UPDATE:id-x,id-y'), {
        ids: ['id-a', 'id-b'],
        threshold: 50,
      });

      await expect(collect(gated)).resolves.toEqual([]);
    });

    it('narrows rowIds to the subscribed set so no consumer re-intersects', async () => {
      const gated = createGatedSubscriber(subscriberEmitting('UPDATE:id-x,id-b,id-a'), {
        ids: ['id-a', 'id-b'],
        threshold: 50,
      });

      await expect(collect(gated)).resolves.toEqual([
        { event: 'UPDATE', rowIds: ['id-b', 'id-a'], overflow: false },
      ]);
    });

    it('passes every event through in full collection mode', async () => {
      const gated = createGatedSubscriber(subscriberEmitting('INSERT:id-x', 'DELETE:id-y'), {
        ids: null,
        threshold: 50,
      });

      await expect(collect(gated)).resolves.toEqual([
        { event: 'INSERT', rowIds: ['id-x'], overflow: false },
        { event: 'DELETE', rowIds: ['id-y'], overflow: false },
      ]);
    });

    it('delivers INVALIDATE regardless of the sparse set', async () => {
      const gated = createGatedSubscriber(subscriberEmitting('INVALIDATE'), {
        ids: ['id-a'],
        threshold: 50,
      });

      await expect(collect(gated)).resolves.toEqual([
        { event: 'INVALIDATE', rowIds: [], overflow: true },
      ]);
    });

    it('collapses a burst to one INVALIDATE and then yields nothing', async () => {
      const gated = createGatedSubscriber(
        subscriberEmitting('INSERT:a', 'INSERT:b', 'INSERT:c', 'INSERT:d'),
        { ids: null, threshold: 2 }
      );

      await expect(collect(gated)).resolves.toEqual([
        { event: 'INSERT', rowIds: ['a'], overflow: false },
        { event: 'INSERT', rowIds: ['b'], overflow: false },
        { event: 'INVALIDATE', rowIds: [], overflow: true },
      ]);
    });

    it('throttles each subscription independently', async () => {
      const opts: EventGateOptions = { ids: null, threshold: 1 };
      const noisy = createGatedSubscriber(subscriberEmitting('INSERT:a', 'INSERT:b'), opts);
      await collect(noisy);

      const quiet = createGatedSubscriber(subscriberEmitting('INSERT:c'), opts);
      await expect(collect(quiet)).resolves.toEqual([
        { event: 'INSERT', rowIds: ['c'], overflow: false },
      ]);
    });

    it('surfaces a malformed payload instead of emitting an event for it', async () => {
      const gated = createGatedSubscriber(subscriberEmitting('TRUNCATE:a'), {
        ids: null,
        threshold: 50,
      });

      await expect(collect(gated)).rejects.toThrow(MalformedNotifyPayloadError);
    });

    it('threads ids into the pre-delivery authorization filter', async () => {
      createRealtimeSubscriptionsPlugin();

      const codec = createMockCodec('tasks', { realtime: true });
      const { executorContext, query } = createMockExecutorContext(['id-a']);
      mockPgSubscriber = {
        subscribe: jest.fn(() => notifications([
          'INSERT:id-other',
          'UPDATE:id-a',
        ])),
      };
      const build = createMockBuild({
        tasks: createMockResource('tasks', codec, executorContext),
      });

      const result = capturedFactory!(build);
      const mockArgs = { getRaw: jest.fn((key: string) => (key === 'ids' ? ['id-a'] : null)) };

      result.plans['Subscription']['onTasksChanged'].subscribePlan(null, mockArgs);

      expect(mockArgs.getRaw).toHaveBeenCalledWith('ids');
      expect(mockListen).toHaveBeenCalled();
      const authorizedSubscriber = mockListen.mock.calls[mockListen.mock.calls.length - 1][0];
      const events = await collectNotifications(
        authorizedSubscriber.subscribe('realtime:app_public.tasks'),
      );

      expect(events).toEqual([{
        parsed: { event: 'UPDATE', rowIds: ['id-a'], overflow: false },
        subscribedIds: ['id-a'],
      }]);
      expect(query).toHaveBeenCalledTimes(1);
      expect(query.mock.calls[0][0].values).toEqual([['id-a']]);
    });

    it('rowId resolver returns a sparse-set ID only when RLS exposes the row', () => {
      createRealtimeSubscriptionsPlugin();

      const codec = createMockCodec('tasks', { realtime: true });
      const getAuthorizedId = jest.fn(() => 'id-b');
      const get = jest.fn(() => ({ get: getAuthorizedId }));
      const build = createMockBuild({
        tasks: { ...createMockResource('tasks', codec), get },
      });

      const result = capturedFactory!(build);
      const payload = result.plans['TasksSubscriptionPayload'];

      const mockParent = { get: jest.fn((key: string) => {
        if (key === 'parsed') return { event: 'UPDATE', rowIds: ['id-x', 'id-b', 'id-a'], overflow: false };
        if (key === 'subscribedIds') return ['id-a', 'id-b'];
        return null;
      }) };

      expect(payload.rowId(mockParent)).toBe('id-b');
      expect(mockParent.get).toHaveBeenCalledWith('parsed');
      expect(mockParent.get).toHaveBeenCalledWith('subscribedIds');
      expect(get).toHaveBeenCalledWith({ id: 'id-b' });
      expect(getAuthorizedId).toHaveBeenCalledWith('id');
    });

    it('rowId resolver returns null when RLS hides a sparse-set row', () => {
      createRealtimeSubscriptionsPlugin();

      const codec = createMockCodec('tasks', { realtime: true });
      const getAuthorizedId = jest.fn((): null => null);
      const get = jest.fn(() => ({ get: getAuthorizedId }));
      const build = createMockBuild({
        tasks: { ...createMockResource('tasks', codec), get },
      });

      const result = capturedFactory!(build);
      const payload = result.plans['TasksSubscriptionPayload'];

      const mockParent = { get: jest.fn((key: string) => {
        if (key === 'parsed') return { event: 'INSERT', rowIds: ['id-a'], overflow: false };
        if (key === 'subscribedIds') return ['id-a', 'id-b'];
        return null;
      }) };

      expect(payload.rowId(mockParent)).toBeNull();
      expect(mockParent.get).toHaveBeenCalledWith('subscribedIds');
      expect(get).toHaveBeenCalledWith({ id: 'id-a' });
      expect(getAuthorizedId).toHaveBeenCalledWith('id');
    });

    it('rowId resolver never exposes IDs in collection mode', () => {
      createRealtimeSubscriptionsPlugin();

      const codec = createMockCodec('tasks', { realtime: true });
      const getAuthorizedId = jest.fn((): null => null);
      const get = jest.fn(() => ({ get: getAuthorizedId }));
      const build = createMockBuild({
        tasks: { ...createMockResource('tasks', codec), get },
      });

      const result = capturedFactory!(build);
      const payload = result.plans['TasksSubscriptionPayload'];

      const mockParent = { get: jest.fn((key: string) => {
        if (key === 'parsed') return { event: 'INSERT', rowIds: ['id-first', 'id-second'], overflow: false };
        if (key === 'subscribedIds') return null;
        return null;
      }) };

      expect(payload.rowId(mockParent)).toBeNull();
      expect(mockParent.get).toHaveBeenCalledWith('subscribedIds');
      expect(get).toHaveBeenCalledWith({ id: null });
      expect(getAuthorizedId).toHaveBeenCalledWith('id');
    });

    it.each(['DELETE', 'INVALIDATE'])('rowId resolver never exposes IDs for %s', (event) => {
      createRealtimeSubscriptionsPlugin();

      const codec = createMockCodec('tasks', { realtime: true });
      const getAuthorizedId = jest.fn((): null => null);
      const get = jest.fn(() => ({ get: getAuthorizedId }));
      const build = createMockBuild({
        tasks: { ...createMockResource('tasks', codec), get },
      });

      const result = capturedFactory!(build);
      const payload = result.plans['TasksSubscriptionPayload'];
      const mockParent = { get: jest.fn((key: string) => {
        if (key === 'parsed') {
          return {
            event,
            rowIds: event === 'INVALIDATE' ? [] : ['id-a'],
            overflow: event === 'INVALIDATE',
          };
        }
        if (key === 'subscribedIds') return ['id-a'];
        return null;
      }) };

      expect(payload.rowId(mockParent)).toBeNull();
      expect(get).toHaveBeenCalledWith({ id: null });
      expect(getAuthorizedId).toHaveBeenCalledWith('id');
    });
  });

  describe('RLS-aware event delivery', () => {
    it('suppresses an unauthorized collection event before Grafast can emit its timing or type', async () => {
      createRealtimeSubscriptionsPlugin();

      const codec = createMockCodec('items', { realtime: true });
      const { executorContext, query, withPgClient } = createMockExecutorContext(
        ['visible-id'],
        { role: 'tenant_a', 'jwt.claims.tenant_id': 'tenant-a' },
      );
      mockPgSubscriber = {
        subscribe: jest.fn(() => notifications([
          'INSERT:hidden-id',
          'UPDATE:hidden-id,visible-id',
        ])),
      };
      const build = createMockBuild({
        items: createMockResource('items', codec, executorContext),
      });

      const result = capturedFactory!(build);
      result.plans['Subscription']['onItemsChanged'].subscribePlan(
        null,
        { getRaw: jest.fn((): null => null) },
      );
      const authorizedSubscriber = mockListen.mock.calls[mockListen.mock.calls.length - 1][0];
      const events = await collectNotifications(
        authorizedSubscriber.subscribe('realtime:app_public.items'),
      );

      expect(events).toEqual([{
        parsed: { event: 'UPDATE', rowIds: ['visible-id'], overflow: false },
        subscribedIds: null,
      }]);
      expect(query.mock.calls.map(([request]) => request.values)).toEqual([
        [['hidden-id']],
        [['hidden-id', 'visible-id']],
      ]);
      expect(withPgClient).toHaveBeenCalledWith(
        { role: 'tenant_a', 'jwt.claims.tenant_id': 'tenant-a' },
        expect.any(Function),
      );
    });

    it('suppresses DELETE and database INVALIDATE before querying', async () => {
      createRealtimeSubscriptionsPlugin();

      const codec = createMockCodec('items', { realtime: true });
      const { executorContext, query } = createMockExecutorContext(['visible-id']);
      mockPgSubscriber = {
        subscribe: jest.fn(() => notifications([
          'DELETE:visible-id',
          'INVALIDATE',
          'INSERT:visible-id',
        ])),
      };
      const build = createMockBuild({
        items: createMockResource('items', codec, executorContext),
      });

      const result = capturedFactory!(build);
      result.plans['Subscription']['onItemsChanged'].subscribePlan(
        null,
        { getRaw: jest.fn((): null => null) },
      );
      const authorizedSubscriber = mockListen.mock.calls[mockListen.mock.calls.length - 1][0];
      const events = await collectNotifications(
        authorizedSubscriber.subscribe('realtime:app_public.items'),
      );

      expect(events).toEqual([{
        parsed: { event: 'INSERT', rowIds: ['visible-id'], overflow: false },
        subscribedIds: null,
      }]);
      expect(query).toHaveBeenCalledTimes(1);
    });

    it.each(['UPDATE', 'TRUNCATE:visible-id'])(
      'fails closed when the NOTIFY payload is malformed: %s',
      async (payload) => {
        createRealtimeSubscriptionsPlugin();

        const codec = createMockCodec('items', { realtime: true });
        const { executorContext, query } = createMockExecutorContext(['visible-id']);
        mockPgSubscriber = {
          subscribe: jest.fn(() => notifications([payload, 'INSERT:visible-id'])),
        };
        const build = createMockBuild({
          items: createMockResource('items', codec, executorContext),
        });

        const result = capturedFactory!(build);
        result.plans['Subscription']['onItemsChanged'].subscribePlan(
          null,
          { getRaw: jest.fn((): null => null) },
        );
        const authorizedSubscriber = mockListen.mock.calls[mockListen.mock.calls.length - 1][0];

        await expect(collectNotifications(
          authorizedSubscriber.subscribe('realtime:app_public.items'),
        )).rejects.toThrow(MalformedNotifyPayloadError);
        expect(query).not.toHaveBeenCalled();
      },
    );

    it('fails closed when the RLS visibility query errors', async () => {
      createRealtimeSubscriptionsPlugin();

      const codec = createMockCodec('items', { realtime: true });
      const withPgClient = jest.fn(async () => {
        throw new Error('database unavailable');
      });
      const executorContext = {
        pgSettings: { role: 'tenant_runtime' },
        withPgClient,
      };
      mockPgSubscriber = {
        subscribe: jest.fn(() => notifications(['INSERT:possibly-visible-id'])),
      };
      const build = createMockBuild({
        items: createMockResource('items', codec, executorContext),
      });

      const result = capturedFactory!(build);
      result.plans['Subscription']['onItemsChanged'].subscribePlan(
        null,
        { getRaw: jest.fn((): null => null) },
      );
      const authorizedSubscriber = mockListen.mock.calls[mockListen.mock.calls.length - 1][0];

      await expect(collectNotifications(
        authorizedSubscriber.subscribe('realtime:app_public.items'),
      )).resolves.toEqual([]);
      expect(withPgClient).toHaveBeenCalledTimes(1);
    });

    it('quotes physical identifiers and binds hostile row IDs as values', async () => {
      createRealtimeSubscriptionsPlugin();

      const hostileId = "00000000-0000-0000-0000-000000000000' OR true --";
      const codec = createMockCodec('tasks', {
        realtime: true,
        schemaName: 'tenant"; set role postgres; --',
      });
      codec.extensions.pg.name = 'tasks"; drop table audit; --';
      const { executorContext, query } = createMockExecutorContext([hostileId]);
      mockPgSubscriber = {
        subscribe: jest.fn(() => notifications([`INSERT:${hostileId}`])),
      };
      const build = createMockBuild({
        tasks: createMockResource('tasks', codec, executorContext),
      });

      const result = capturedFactory!(build);
      result.plans['Subscription']['onTasksChanged'].subscribePlan(
        null,
        { getRaw: jest.fn((): null => null) },
      );
      const authorizedSubscriber = mockListen.mock.calls[mockListen.mock.calls.length - 1][0];
      await collectNotifications(
        authorizedSubscriber.subscribe('realtime:hostile'),
      );

      const request = query.mock.calls[0][0];
      expect(request.text).toContain(
        '"tenant""; set role postgres; --"."tasks""; drop table audit; --"',
      );
      expect(request.text).toContain('any($1::text[])');
      expect(request.text).not.toContain(hostileId);
      expect(request.values).toEqual([[hostileId]]);
    });

    it('counts only authorized events toward the subscriber throttle', async () => {
      createRealtimeSubscriptionsPlugin({ overflowThreshold: 1 });

      const codec = createMockCodec('items', { realtime: true });
      const { executorContext } = createMockExecutorContext(['visible-a', 'visible-b']);
      mockPgSubscriber = {
        subscribe: jest.fn(() => notifications([
          'INSERT:hidden-id',
          'INSERT:visible-a',
          'UPDATE:visible-b',
        ])),
      };
      const build = createMockBuild({
        items: createMockResource('items', codec, executorContext),
      });

      const result = capturedFactory!(build);
      result.plans['Subscription']['onItemsChanged'].subscribePlan(
        null,
        { getRaw: jest.fn((): null => null) },
      );
      const authorizedSubscriber = mockListen.mock.calls[mockListen.mock.calls.length - 1][0];
      const events = await collectNotifications(
        authorizedSubscriber.subscribe('realtime:app_public.items'),
      );

      expect(events).toEqual([
        {
          parsed: { event: 'INSERT', rowIds: ['visible-a'], overflow: false },
          subscribedIds: null,
        },
        {
          parsed: { event: 'INVALIDATE', rowIds: [], overflow: true },
          subscribedIds: null,
        },
      ]);
    });

    it('rowId doc comment states the fail-closed visibility rules', () => {
      createRealtimeSubscriptionsPlugin();

      const codec = createMockCodec('items', { realtime: true });
      const build = createMockBuild({
        items: createMockResource('items', codec),
      });

      const result = capturedFactory!(build);
      expect(result.typeDefs).toContain('after RLS authorization');
      expect(result.typeDefs).toContain('Null for collection, INVALIDATE, or denied rows');
    });

    it('type defs include sparse set ids argument', () => {
      createRealtimeSubscriptionsPlugin();

      const codec = createMockCodec('items', { realtime: true });
      const build = createMockBuild({
        items: createMockResource('items', codec),
      });

      const result = capturedFactory!(build);
      expect(result.typeDefs).toContain('ids: [UUID!]');
    });

    it('type defs include description mentioning all subscription modes', () => {
      createRealtimeSubscriptionsPlugin();

      const codec = createMockCodec('items', { realtime: true });
      const build = createMockBuild({
        items: createMockResource('items', codec),
      });

      const result = capturedFactory!(build);
      expect(result.typeDefs).toContain('specific rows');
      expect(result.typeDefs).toContain('full collection');
    });
  });
});

describe('selectCandidateRowId', () => {
  const insert = { event: 'INSERT', rowIds: ['id-a', 'id-b'], overflow: false };

  it('allows collection row fetching without allowing collection rowId exposure', () => {
    expect(selectCandidateRowId(insert, null, true)).toBe('id-a');
    expect(selectCandidateRowId(insert, null, false)).toBeNull();
  });

  it('selects only a caller-supplied sparse ID', () => {
    expect(selectCandidateRowId(insert, ['id-b'], false)).toBe('id-b');
    expect(selectCandidateRowId(insert, ['id-x'], false)).toBeNull();
  });

  it.each(['DELETE', 'INVALIDATE', 'UNKNOWN'])('rejects %s before any row lookup', (event) => {
    expect(selectCandidateRowId({
      event,
      rowIds: ['id-a'],
      overflow: event === 'INVALIDATE',
    }, ['id-a'], false)).toBeNull();
  });
});
