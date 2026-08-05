const acquirePgNotificationBroker = jest.fn();
const getPgNotificationBrokerStats = jest.fn();
const getPgNotificationBrokerIdentity = jest.fn((config: { password?: string }) =>
  config.password === 'rotated-secret'
    ? 'broker:v1:rotated'
    : 'broker:v1:expected');
const getPgNotificationDatabaseIdentity = jest.fn(() => 'database-target:v1:tenant-a');

jest.mock('pg-cache', () => ({
  acquirePgNotificationBroker,
  getPgNotificationBrokerStats,
  getPgNotificationBrokerIdentity,
  getPgNotificationDatabaseIdentity,
  PG_NOTIFICATION_LEASE_RELEASED_ERROR_CODE: 'PG_NOTIFICATION_LEASE_RELEASED'
}));

import {
  ActivatableGenerationScopedRealtimeSubscriber,
  RealtimeTopicCollector
} from 'graphile-realtime-subscriptions';

import {
  activateGraphileSharedRealtime,
  getGraphileRealtimeRoleAuditStats,
  GraphileSharedRealtimeDatabaseConflictError,
  GraphileSharedRealtimeIdentityError
} from '../shared-realtime';

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(reason: unknown): void;
}

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const listenerConfig = {
  host: 'db.internal',
  port: 5432,
  database: 'tenant_a',
  user: 'tenant_a_notify',
  password: 'never-log-this'
};

const successfulAudit = {
  version: 'pg-notification-role:v1' as const,
  role: 'tenant_a_notify',
  database: 'tenant_a',
  safe: true,
  violations: [] as const
};

let brokerAuditAttempts = 0;
let brokerAuditFailures = 0;

const makeCollector = (): RealtimeTopicCollector => {
  const collector = new RealtimeTopicCollector();
  collector.collect([{
    topic: 'realtime:tenant_a.contacts',
    schema: 'tenant_a',
    table: 'contacts'
  }]);
  return collector;
};

const makeBrokerLease = (
  revalidate = async () => successfulAudit
) => {
  const termination = deferred<Error | null>();
  const release = jest.fn(async (): Promise<void> => {
    termination.resolve(null);
  });
  const revalidateRole = jest.fn(async () => {
    brokerAuditAttempts++;
    try {
      return await revalidate();
    } catch (error) {
      brokerAuditFailures++;
      throw error;
    }
  });
  return {
    identity: 'broker:v1:expected',
    topics: ['realtime:tenant_a.contacts'],
    terminated: termination.promise,
    roleAudit: successfulAudit,
    revalidateRole,
    subscribe: jest.fn(() => {
      const iterator: AsyncIterableIterator<string> = {
        [Symbol.asyncIterator]: () => iterator,
        next: () => new Promise(() => undefined),
        return: async (): Promise<IteratorResult<string>> => ({
          done: true,
          value: undefined
        })
      };
      return iterator;
    }),
    release,
    termination
  };
};

const useBrokerLeases = (...leases: ReturnType<typeof makeBrokerLease>[]): void => {
  const pending = [...leases];
  acquirePgNotificationBroker.mockImplementation(async () => {
    brokerAuditAttempts++;
    const lease = pending.shift();
    if (!lease) throw new Error('No mocked notification broker lease remains');
    return lease;
  });
};

describe('shared exact realtime activation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    brokerAuditAttempts = 0;
    brokerAuditFailures = 0;
    getPgNotificationBrokerStats.mockImplementation(() => ({
      roleAuditAttempts: brokerAuditAttempts,
      roleAuditFailures: brokerAuditFailures
    }));
    acquirePgNotificationBroker.mockImplementation(async () => {
      brokerAuditAttempts++;
      return makeBrokerLease();
    });
  });

  it('installs exact topics only after the broker returns its pinned-client audit', async () => {
    const order: string[] = [];
    const broker = makeBrokerLease();
    acquirePgNotificationBroker.mockImplementation(async () => {
      brokerAuditAttempts++;
      order.push('broker');
      return broker;
    });
    const subscriber = new ActivatableGenerationScopedRealtimeSubscriber();
    const onFatalError = jest.fn();

    const attestation = await activateGraphileSharedRealtime({
      subscriber,
      topicCollector: makeCollector(),
      listenerPgConfig: listenerConfig,
      listenerIdentity: 'broker:v1:expected',
      allowedSourceSchemas: ['tenant_a'],
      roleRevalidationMs: 60_000,
      onFatalError
    });

    expect(order).toEqual(['broker']);
    expect(acquirePgNotificationBroker).toHaveBeenCalledWith(listenerConfig, {
      topics: ['realtime:tenant_a.contacts']
    });
    expect(attestation.snapshot()).toMatchObject({
      mode: 'shared-exact',
      listenerIdentity: 'broker:v1:expected',
      auditVersion: 'pg-notification-role:v1',
      role: 'tenant_a_notify',
      database: 'tenant_a',
      status: 'healthy',
      checks: 1
    });

    attestation.release();
    await subscriber.release();
    expect(broker.release).toHaveBeenCalledTimes(1);
  });

  it('latches broker termination into the exact generation health callback', async () => {
    const broker = makeBrokerLease();
    useBrokerLeases(broker);
    const subscriber = new ActivatableGenerationScopedRealtimeSubscriber();
    const onFatalError = jest.fn();
    const attestation = await activateGraphileSharedRealtime({
      subscriber,
      topicCollector: makeCollector(),
      listenerPgConfig: listenerConfig,
      listenerIdentity: 'broker:v1:expected',
      allowedSourceSchemas: ['tenant_a'],
      roleRevalidationMs: 60_000,
      onFatalError
    });
    const failure = Object.assign(new Error('listener ended'), {
      code: 'PG_NOTIFICATION_BROKER_FAILED'
    });

    broker.termination.resolve(failure);
    await Promise.resolve();
    await Promise.resolve();
    expect(onFatalError).toHaveBeenCalledWith(failure);

    attestation.release();
    await subscriber.release();
  });

  it('proactively revalidates once per identity and cancels its unref timer', async () => {
    jest.useFakeTimers();
    try {
      jest.setSystemTime(1_000);
      const firstBroker = makeBrokerLease();
      const secondBroker = makeBrokerLease();
      useBrokerLeases(firstBroker, secondBroker);
      const firstSubscriber = new ActivatableGenerationScopedRealtimeSubscriber();
      const secondSubscriber = new ActivatableGenerationScopedRealtimeSubscriber();
      const common = {
        topicCollector: makeCollector(),
        listenerPgConfig: listenerConfig,
        listenerIdentity: 'broker:v1:expected',
        allowedSourceSchemas: ['tenant_a'],
        roleRevalidationMs: 100,
        onFatalError: jest.fn()
      };
      const first = await activateGraphileSharedRealtime({
        ...common,
        subscriber: firstSubscriber
      });
      const second = await activateGraphileSharedRealtime({
        ...common,
        subscriber: secondSubscriber
      });

      expect(jest.getTimerCount()).toBe(1);
      await jest.advanceTimersByTimeAsync(99);
      expect(firstBroker.revalidateRole).not.toHaveBeenCalled();
      expect(secondBroker.revalidateRole).not.toHaveBeenCalled();
      await jest.advanceTimersByTimeAsync(1);
      expect(firstBroker.revalidateRole).toHaveBeenCalledTimes(1);
      expect(secondBroker.revalidateRole).not.toHaveBeenCalled();
      expect(first.snapshot()).toMatchObject({
        lastAttestedAt: 1_100,
        checks: 3,
        status: 'healthy'
      });
      expect(second.snapshot()).toMatchObject({ checks: 3, status: 'healthy' });
      expect(jest.getTimerCount()).toBe(1);

      first.release();
      expect(jest.getTimerCount()).toBe(1);
      second.release();
      expect(jest.getTimerCount()).toBe(0);
      await Promise.all([firstSubscriber.release(), secondSubscriber.release()]);
      await jest.advanceTimersByTimeAsync(100);
      expect(firstBroker.revalidateRole).toHaveBeenCalledTimes(1);
      expect(secondBroker.revalidateRole).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('retries another generation when the selected revalidator is released', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000);
    const selectedAudit = deferred<typeof successfulAudit>();
    const firstBroker = makeBrokerLease(() => selectedAudit.promise);
    const secondBroker = makeBrokerLease();
    const thirdBroker = makeBrokerLease();
    useBrokerLeases(firstBroker, secondBroker, thirdBroker);
    const firstSubscriber = new ActivatableGenerationScopedRealtimeSubscriber();
    const secondSubscriber = new ActivatableGenerationScopedRealtimeSubscriber();
    const thirdSubscriber = new ActivatableGenerationScopedRealtimeSubscriber();
    const firstFailure = jest.fn();
    const secondFailure = jest.fn();
    const thirdFailure = jest.fn();
    const common = {
      topicCollector: makeCollector(),
      listenerPgConfig: listenerConfig,
      listenerIdentity: 'broker:v1:expected',
      allowedSourceSchemas: ['tenant_a'],
      roleRevalidationMs: 60_000
    };
    const first = await activateGraphileSharedRealtime({
      ...common,
      subscriber: firstSubscriber,
      onFatalError: firstFailure
    });
    const second = await activateGraphileSharedRealtime({
      ...common,
      subscriber: secondSubscriber,
      onFatalError: secondFailure
    });
    const third = await activateGraphileSharedRealtime({
      ...common,
      subscriber: thirdSubscriber,
      onFatalError: thirdFailure
    });

    now.mockReturnValue(61_001);
    const refreshing = second.revalidateIfDue();
    await Promise.resolve();
    expect(firstBroker.revalidateRole).toHaveBeenCalledTimes(1);

    first.release();
    await firstSubscriber.release();
    selectedAudit.reject(Object.assign(new Error('lease released'), {
      code: 'PG_NOTIFICATION_LEASE_RELEASED'
    }));

    await expect(refreshing).resolves.toBe(true);
    expect(secondBroker.revalidateRole).toHaveBeenCalledTimes(1);
    expect(thirdBroker.revalidateRole).not.toHaveBeenCalled();
    expect(second.snapshot()).toMatchObject({ status: 'healthy', checks: 4 });
    expect(third.snapshot()).toMatchObject({ status: 'healthy', checks: 4 });
    expect(firstFailure).not.toHaveBeenCalled();
    expect(secondFailure).not.toHaveBeenCalled();
    expect(thirdFailure).not.toHaveBeenCalled();

    second.release();
    third.release();
    await Promise.all([secondSubscriber.release(), thirdSubscriber.release()]);
    now.mockRestore();
  });

  it('coalesces TTL refresh and fails every sharing generation closed on drift', async () => {
    const statsBefore = getGraphileRealtimeRoleAuditStats();
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000);
    const drift = Object.assign(new Error('role drift'), {
      code: 'PG_NOTIFICATION_ROLE_UNSAFE'
    });
    const firstBroker = makeBrokerLease(async () => {
      throw drift;
    });
    const secondBroker = makeBrokerLease();
    useBrokerLeases(firstBroker, secondBroker);
    const firstSubscriber = new ActivatableGenerationScopedRealtimeSubscriber();
    const secondSubscriber = new ActivatableGenerationScopedRealtimeSubscriber();
    const firstFailure = jest.fn();
    const secondFailure = jest.fn();
    const common = {
      topicCollector: makeCollector(),
      listenerPgConfig: listenerConfig,
      listenerIdentity: 'broker:v1:expected',
      allowedSourceSchemas: ['tenant_a'],
      roleRevalidationMs: 60_000
    };
    const first = await activateGraphileSharedRealtime({
      ...common,
      subscriber: firstSubscriber,
      onFatalError: firstFailure
    });
    const second = await activateGraphileSharedRealtime({
      ...common,
      subscriber: secondSubscriber,
      onFatalError: secondFailure
    });
    expect(acquirePgNotificationBroker).toHaveBeenCalledTimes(2);

    now.mockReturnValue(61_001);
    await expect(Promise.all([
      first.revalidateIfDue(),
      second.revalidateIfDue()
    ])).resolves.toEqual([false, false]);

    expect(firstBroker.revalidateRole).toHaveBeenCalledTimes(1);
    expect(secondBroker.revalidateRole).not.toHaveBeenCalled();
    expect(firstFailure).toHaveBeenCalledWith(drift);
    expect(secondFailure).toHaveBeenCalledWith(drift);
    expect(first.snapshot()).toMatchObject({
      status: 'failed',
      failureCode: 'PG_NOTIFICATION_ROLE_UNSAFE',
      failedAt: 61_001
    });
    expect(getGraphileRealtimeRoleAuditStats()).toMatchObject({
      identities: 1,
      failed: 1,
      activeIdentityAuditAttempts: 3,
      catalogAuditAttempts: statsBefore.catalogAuditAttempts + 3,
      catalogAuditFailures: statsBefore.catalogAuditFailures + 1,
      activeDatabaseTargets: 1
    });

    first.release();
    second.release();
    await Promise.all([firstSubscriber.release(), secondSubscriber.release()]);
    now.mockRestore();
  });

  it('rejects a second active listener identity for one physical database', async () => {
    const firstBroker = makeBrokerLease();
    const rotatedBroker = makeBrokerLease();
    useBrokerLeases(firstBroker, rotatedBroker);
    const firstSubscriber = new ActivatableGenerationScopedRealtimeSubscriber();
    const first = await activateGraphileSharedRealtime({
      subscriber: firstSubscriber,
      topicCollector: makeCollector(),
      listenerPgConfig: listenerConfig,
      listenerIdentity: 'broker:v1:expected',
      allowedSourceSchemas: ['tenant_a'],
      roleRevalidationMs: 60_000,
      onFatalError: jest.fn()
    });
    const rotatedConfig = {
      ...listenerConfig,
      password: 'rotated-secret'
    };
    const rotatedSubscriber = new ActivatableGenerationScopedRealtimeSubscriber();

    await expect(activateGraphileSharedRealtime({
      subscriber: rotatedSubscriber,
      topicCollector: makeCollector(),
      listenerPgConfig: rotatedConfig,
      listenerIdentity: 'broker:v1:rotated',
      allowedSourceSchemas: ['tenant_a'],
      roleRevalidationMs: 60_000,
      onFatalError: jest.fn()
    })).rejects.toBeInstanceOf(GraphileSharedRealtimeDatabaseConflictError);
    expect(acquirePgNotificationBroker).toHaveBeenCalledTimes(1);

    first.release();
    await firstSubscriber.release();
    const rotated = await activateGraphileSharedRealtime({
      subscriber: rotatedSubscriber,
      topicCollector: makeCollector(),
      listenerPgConfig: rotatedConfig,
      listenerIdentity: 'broker:v1:rotated',
      allowedSourceSchemas: ['tenant_a'],
      roleRevalidationMs: 60_000,
      onFatalError: jest.fn()
    });
    expect(acquirePgNotificationBroker).toHaveBeenCalledTimes(2);

    rotated.release();
    await rotatedSubscriber.release();
  });

  it('releases the physical-database reservation when the initial audit fails', async () => {
    const auditFailure = new Error('catalog unavailable');
    acquirePgNotificationBroker.mockRejectedValueOnce(auditFailure);
    const failedSubscriber = new ActivatableGenerationScopedRealtimeSubscriber();
    await expect(activateGraphileSharedRealtime({
      subscriber: failedSubscriber,
      topicCollector: makeCollector(),
      listenerPgConfig: listenerConfig,
      listenerIdentity: 'broker:v1:expected',
      allowedSourceSchemas: ['tenant_a'],
      roleRevalidationMs: 60_000,
      onFatalError: jest.fn()
    })).rejects.toBe(auditFailure);
    await failedSubscriber.release();

    const rotatedBroker = makeBrokerLease();
    useBrokerLeases(rotatedBroker);
    const rotatedSubscriber = new ActivatableGenerationScopedRealtimeSubscriber();
    const rotated = await activateGraphileSharedRealtime({
      subscriber: rotatedSubscriber,
      topicCollector: makeCollector(),
      listenerPgConfig: {
        ...listenerConfig,
        password: 'rotated-secret'
      },
      listenerIdentity: 'broker:v1:rotated',
      allowedSourceSchemas: ['tenant_a'],
      roleRevalidationMs: 60_000,
      onFatalError: jest.fn()
    });

    rotated.release();
    await rotatedSubscriber.release();
  });

  it('rejects a caller-supplied listener identity mismatch before audit', async () => {
    await expect(activateGraphileSharedRealtime({
      subscriber: new ActivatableGenerationScopedRealtimeSubscriber(),
      topicCollector: makeCollector(),
      listenerPgConfig: listenerConfig,
      listenerIdentity: 'broker:v1:wrong',
      allowedSourceSchemas: ['tenant_a'],
      roleRevalidationMs: 60_000,
      onFatalError: jest.fn()
    })).rejects.toBeInstanceOf(GraphileSharedRealtimeIdentityError);
    expect(acquirePgNotificationBroker).not.toHaveBeenCalled();
  });
});
