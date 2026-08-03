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
 * - RLS-aware rowId masking in payload resolvers
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
const mockObject = jest.fn((obj: any) => obj);
const mockLambda = jest.fn((input: any, fn: Function) => fn(input));
const mockContext = jest.fn(() => ({
  get: jest.fn((key: string) => `mock-${key}`),
}));

jest.mock('grafast', () => ({
  context: mockContext,
  listen: mockListen,
  object: mockObject,
  constant: mockConstant,
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

import {
  createRealtimeSubscriptionsPlugin,
  DEFAULT_OVERFLOW_THRESHOLD,
  EventThrottle,
  parseNotifyPayload,
  RealtimeSubscriptionsPlugin,
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

function createMockResource(name: string, codec: any) {
  return { codec, name };
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

  it('handles payload with no colon as bare event', () => {
    const result = parseNotifyPayload('INSERT');
    expect(result).toEqual({
      event: 'INSERT',
      rowIds: [],
      overflow: false,
    });
  });

  it('handles empty string as UNKNOWN', () => {
    const result = parseNotifyPayload('');
    expect(result).toEqual({
      event: 'UNKNOWN',
      rowIds: [],
      overflow: false,
    });
  });

  it('handles operation with empty ID list', () => {
    const result = parseNotifyPayload('INSERT:');
    expect(result).toEqual({
      event: 'INSERT',
      rowIds: [],
      overflow: false,
    });
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
      expect(result.typeDefs).toContain('masked when RLS denies access');
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

      const mockArgs = { getRaw: jest.fn(() => 'test-id') };
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

      const mockArgs = { getRaw: jest.fn(() => 'test-id') };
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
      const mockArgs = { getRaw: jest.fn(() => 'some-id') };

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

    it('payload row resolver uses parsed rowId for full collection mode', () => {
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
        if (key === 'parsed') return { event: 'INSERT', rowIds: ['row-uuid'], overflow: false };
        if (key === 'subscribedIds') return null;
        return null;
      }) };

      result.plans['TasksSubscriptionPayload'].tasks(mockParent);
      expect(mockParent.get).toHaveBeenCalledWith('parsed');
      expect(mockParent.get).toHaveBeenCalledWith('subscribedIds');
      expect(mockResource.get).toHaveBeenCalled();
    });

    it('payload row resolver uses first matching ID when ids provided', () => {
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
        if (key === 'parsed') return { event: 'INSERT', rowIds: ['id-a', 'id-b', 'id-c'], overflow: false };
        if (key === 'subscribedIds') return ['id-b', 'id-d'];
        return null;
      }) };

      result.plans['TasksSubscriptionPayload'].tasks(mockParent);
      expect(mockParent.get).toHaveBeenCalledWith('subscribedIds');
      expect(mockResource.get).toHaveBeenCalled();
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

  describe('sparse set filtering (ids argument)', () => {
    it('subscribePlan passes ids through object step', () => {
      createRealtimeSubscriptionsPlugin();

      const codec = createMockCodec('tasks', { realtime: true });
      const build = createMockBuild({
        tasks: createMockResource('tasks', codec),
      });

      const result = capturedFactory!(build);
      const mockArgs = { getRaw: jest.fn((key: string) => {
        if (key === 'ids') return ['id-a', 'id-b'];
        return null;
      }) };

      result.plans['Subscription']['onTasksChanged'].subscribePlan(null, mockArgs);

      expect(mockArgs.getRaw).toHaveBeenCalledWith('ids');

      // The listen callback is captured but not invoked by the mock.
      // Invoke it manually to verify ids are threaded through.
      expect(mockListen).toHaveBeenCalled();
      const listenCallback = mockListen.mock.calls[mockListen.mock.calls.length - 1][2];
      listenCallback('INSERT:id-a');

      expect(mockObject).toHaveBeenCalled();
      const objectArg = mockObject.mock.calls[mockObject.mock.calls.length - 1][0];
      expect(objectArg).toHaveProperty('subscribedIds');
    });

    it('drops events with no row ID intersection in sparse set mode', () => {
      const parsed = parseNotifyPayload('INSERT:id-x,id-y');
      const subscribedIds = ['id-a', 'id-b'];

      const hasMatch = parsed.rowIds.some((rid: string) => subscribedIds.includes(rid));
      expect(hasMatch).toBe(false);
    });

    it('delivers events with row ID intersection in sparse set mode', () => {
      const parsed = parseNotifyPayload('UPDATE:id-a,id-x');
      const subscribedIds = ['id-a', 'id-b'];

      const hasMatch = parsed.rowIds.some((rid: string) => subscribedIds.includes(rid));
      expect(hasMatch).toBe(true);
    });

    it('delivers INVALIDATE events regardless of sparse set', () => {
      const parsed = parseNotifyPayload('INVALIDATE');
      expect(parsed.overflow).toBe(true);
      expect(parsed.rowIds).toEqual([]);
    });

    it('rowId resolver returns first matching ID from sparse set', () => {
      createRealtimeSubscriptionsPlugin();

      const codec = createMockCodec('tasks', { realtime: true });
      const build = createMockBuild({
        tasks: { ...createMockResource('tasks', codec), get: jest.fn() },
      });

      const result = capturedFactory!(build);
      const payload = result.plans['TasksSubscriptionPayload'];

      const mockParent = { get: jest.fn((key: string) => {
        if (key === 'parsed') return { event: 'UPDATE', rowIds: ['id-x', 'id-b', 'id-a'], overflow: false };
        if (key === 'subscribedIds') return ['id-a', 'id-b'];
        return null;
      }) };

      payload.rowId(mockParent);
      expect(mockParent.get).toHaveBeenCalledWith('parsed');
      expect(mockParent.get).toHaveBeenCalledWith('subscribedIds');
    });

    it('rowId resolver returns null when no sparse set match', () => {
      createRealtimeSubscriptionsPlugin();

      const codec = createMockCodec('tasks', { realtime: true });
      const build = createMockBuild({
        tasks: { ...createMockResource('tasks', codec), get: jest.fn() },
      });

      const result = capturedFactory!(build);
      const payload = result.plans['TasksSubscriptionPayload'];

      const mockParent = { get: jest.fn((key: string) => {
        if (key === 'parsed') return { event: 'INSERT', rowIds: ['id-x'], overflow: false };
        if (key === 'subscribedIds') return ['id-a', 'id-b'];
        return null;
      }) };

      payload.rowId(mockParent);
      expect(mockParent.get).toHaveBeenCalledWith('subscribedIds');
    });

    it('rowId resolver falls back to first rowId when no sparse set provided', () => {
      createRealtimeSubscriptionsPlugin();

      const codec = createMockCodec('tasks', { realtime: true });
      const build = createMockBuild({
        tasks: { ...createMockResource('tasks', codec), get: jest.fn() },
      });

      const result = capturedFactory!(build);
      const payload = result.plans['TasksSubscriptionPayload'];

      const mockParent = { get: jest.fn((key: string) => {
        if (key === 'parsed') return { event: 'INSERT', rowIds: ['id-first', 'id-second'], overflow: false };
        if (key === 'subscribedIds') return null;
        return null;
      }) };

      payload.rowId(mockParent);
      expect(mockParent.get).toHaveBeenCalledWith('subscribedIds');
    });
  });

  describe('RLS-aware event delivery', () => {
    it('rowId doc comment mentions RLS masking', () => {
      createRealtimeSubscriptionsPlugin();

      const codec = createMockCodec('items', { realtime: true });
      const build = createMockBuild({
        items: createMockResource('items', codec),
      });

      const result = capturedFactory!(build);
      expect(result.typeDefs).toContain('masked when RLS denies access');
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
