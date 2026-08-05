import { EventEmitter } from 'node:events';

import {
  DEFAULT_PG_NOTIFICATION_OPERATION_TIMEOUT_MS,
  getPgNotificationBrokerIdentity,
  getPgNotificationDatabaseIdentity,
  PgNotificationBrokerFailedError,
  PgNotificationBrokerRegistry,
  PgNotificationConnectionSource,
  PgNotificationOperationTimeoutError,
  PgNotificationQueueOverflowError,
  PgNotificationTopicError
} from '../notification-broker';
import {
  PG_NOTIFICATION_ROLE_AUDIT_SQL,
  UnsafePgNotificationRoleError
} from '../notification-role';

const roleContract = {
  role: 'tenant_a_notify',
  database: 'tenant_a'
};

const safeRoleAuditRow = {
  expected_role: roleContract.role,
  session_role: roleContract.role,
  active_role: roleContract.role,
  active_database: roleContract.database,
  rolcanlogin: true,
  rolinherit: false,
  rolsuper: false,
  rolbypassrls: false,
  rolcreaterole: false,
  rolcreatedb: false,
  rolreplication: false,
  membership_count: 0,
  target_database_exists: true,
  target_connect: true,
  other_database_connect_count: 0,
  target_database_owner: false,
  target_database_create: false,
  target_database_temp: false,
  schema_owner_count: 0,
  schema_create_count: 0,
  schema_usage_count: 0,
  relation_privilege_count: 0,
  function_privilege_count: 0,
  sequence_privilege_count: 0
};

class MockNotificationClient extends EventEmitter {
  readonly queries: string[] = [];
  roleAuditRow: Record<string, unknown> | undefined = safeRoleAuditRow;
  readonly query = jest.fn(async (
    text: string,
    _values?: readonly unknown[]
  ): Promise<unknown> => {
    this.queries.push(text);
    if (text === PG_NOTIFICATION_ROLE_AUDIT_SQL) {
      return { rows: this.roleAuditRow ? [this.roleAuditRow] : [] };
    }
    return { rows: [] };
  });
  readonly release = jest.fn(async (_error?: Error | boolean): Promise<void> => {});

  notification(channel: string, payload?: string): void {
    this.emit('notification', { channel, payload });
  }
}

const createSource = (client = new MockNotificationClient()) => {
  const source: PgNotificationConnectionSource = {
    connect: jest.fn(async () => client),
    release: jest.fn(async () => {})
  };
  return { client, source };
};

const deferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const flushMicrotasks = async (): Promise<void> => {
  for (let index = 0; index < 20; index++) await Promise.resolve();
};

describe('PgNotificationBrokerRegistry', () => {
  it('shares one dedicated listener and reference-counts exact topics', async () => {
    const registry = new PgNotificationBrokerRegistry(4);
    const { client, source } = createSource();
    const sourceFactory = jest.fn(() => source);

    const [first, second] = await Promise.all([
      registry.acquireForTests('opaque-a', sourceFactory, ['tenant.a', 'shared']),
      registry.acquireForTests('opaque-a', sourceFactory, ['shared', 'tenant.b'])
    ]);

    expect(sourceFactory).toHaveBeenCalledTimes(1);
    expect(source.connect).toHaveBeenCalledTimes(1);
    expect(client.queries).toEqual([
      'LISTEN "tenant.a"',
      'LISTEN "shared"',
      'LISTEN "tenant.b"'
    ]);
    expect(registry.stats()).toMatchObject({
      brokers: 1,
      listenerConnections: 1,
      leases: 2,
      topics: 3
    });

    await first.release();
    expect(client.queries).toContain('UNLISTEN "tenant.a"');
    expect(client.queries).not.toContain('UNLISTEN "shared"');
    expect(client.release).not.toHaveBeenCalled();

    await second.release();
    expect(client.queries.slice(-2)).toEqual([
      'UNLISTEN "shared"',
      'UNLISTEN "tenant.b"'
    ]);
    expect(client.release).toHaveBeenCalledWith(true);
    expect(source.release).toHaveBeenCalledTimes(1);
    expect(registry.stats()).toMatchObject({ brokers: 0, leases: 0, topics: 0 });
  });

  it('audits three generations on the one pinned listener before admission', async () => {
    const registry = new PgNotificationBrokerRegistry(4);
    const { client, source } = createSource();
    const sourceFactory = jest.fn(() => source);

    const first = await registry.acquireAttestedForTests(
      'opaque-attested', sourceFactory, ['tenant.a'], roleContract
    );
    const second = await registry.acquireAttestedForTests(
      'opaque-attested', sourceFactory, ['tenant.b'], roleContract
    );
    const third = await registry.acquireAttestedForTests(
      'opaque-attested', sourceFactory, ['tenant.c'], roleContract
    );

    expect(sourceFactory).toHaveBeenCalledTimes(1);
    expect(source.connect).toHaveBeenCalledTimes(1);
    expect(client.queries.filter(
      (query) => query === PG_NOTIFICATION_ROLE_AUDIT_SQL
    )).toHaveLength(3);
    expect(client.queries).toEqual([
      'BEGIN READ ONLY',
      'SET LOCAL jit TO off',
      PG_NOTIFICATION_ROLE_AUDIT_SQL,
      'COMMIT',
      'LISTEN "tenant.a"',
      'BEGIN READ ONLY',
      'SET LOCAL jit TO off',
      PG_NOTIFICATION_ROLE_AUDIT_SQL,
      'COMMIT',
      'LISTEN "tenant.b"',
      'BEGIN READ ONLY',
      'SET LOCAL jit TO off',
      PG_NOTIFICATION_ROLE_AUDIT_SQL,
      'COMMIT',
      'LISTEN "tenant.c"'
    ]);
    expect(first.roleAudit).toMatchObject({ ...roleContract, safe: true });
    expect(second.roleAudit).toMatchObject({ ...roleContract, safe: true });
    expect(third.roleAudit).toMatchObject({ ...roleContract, safe: true });
    expect(registry.stats()).toMatchObject({
      listenerConnections: 1,
      leases: 3,
      roleAuditAttempts: 3,
      roleAuditFailures: 0
    });

    await Promise.all([first.release(), second.release(), third.release()]);
  });

  it('serializes concurrent admission audits without another connection', async () => {
    const registry = new PgNotificationBrokerRegistry(4);
    const { client, source } = createSource();
    const firstCatalogAudit = deferred<void>();
    let catalogAuditsStarted = 0;
    let activeCatalogAudits = 0;
    let peakCatalogAudits = 0;
    client.query.mockImplementation(async (text: string) => {
      client.queries.push(text);
      if (text === PG_NOTIFICATION_ROLE_AUDIT_SQL) {
        catalogAuditsStarted++;
        activeCatalogAudits++;
        peakCatalogAudits = Math.max(peakCatalogAudits, activeCatalogAudits);
        if (catalogAuditsStarted === 1) await firstCatalogAudit.promise;
        activeCatalogAudits--;
        return { rows: [safeRoleAuditRow] };
      }
      return { rows: [] };
    });

    const acquisitions = [
      registry.acquireAttestedForTests(
        'opaque-attested', () => source, ['a'], roleContract
      ),
      registry.acquireAttestedForTests(
        'opaque-attested', () => source, ['b'], roleContract
      ),
      registry.acquireAttestedForTests(
        'opaque-attested', () => source, ['c'], roleContract
      )
    ];
    await flushMicrotasks();
    expect(catalogAuditsStarted).toBe(1);
    expect(source.connect).toHaveBeenCalledTimes(1);

    firstCatalogAudit.resolve();
    const leases = await Promise.all(acquisitions);
    expect(catalogAuditsStarted).toBe(3);
    expect(peakCatalogAudits).toBe(1);
    expect(source.connect).toHaveBeenCalledTimes(1);
    await Promise.all(leases.map((lease) => lease.release()));
  });

  it('bounds a never-resolving admission audit and destroys its client', async () => {
    jest.useFakeTimers();
    try {
      const registry = new PgNotificationBrokerRegistry(4, 25);
      const { client, source } = createSource();
      client.query.mockImplementation((text: string) => {
        client.queries.push(text);
        if (text === 'BEGIN READ ONLY') return new Promise(() => undefined);
        return Promise.resolve({ rows: [] });
      });

      const acquiring = registry.acquireAttestedForTests(
        'opaque-timeout',
        () => source,
        ['a'],
        roleContract
      );
      const rejected = expect(acquiring).rejects.toBeInstanceOf(
        PgNotificationOperationTimeoutError
      );
      await flushMicrotasks();
      await jest.advanceTimersByTimeAsync(25);
      await rejected;

      expect(client.queries).toEqual(['BEGIN READ ONLY']);
      expect(client.release).toHaveBeenCalledWith(
        expect.any(PgNotificationBrokerFailedError)
      );
      expect(source.release).toHaveBeenCalledTimes(1);
      expect(registry.stats()).toMatchObject({
        brokers: 0,
        listenerConnections: 0,
        leases: 0,
        fatalFailures: 1,
        roleAuditAttempts: 1,
        roleAuditFailures: 1
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('revalidates on the pinned listener and fails every lease closed on drift', async () => {
    const registry = new PgNotificationBrokerRegistry(4);
    const { client, source } = createSource();
    const first = await registry.acquireAttestedForTests(
      'opaque-attested', () => source, ['a'], roleContract
    );
    const second = await registry.acquireAttestedForTests(
      'opaque-attested', () => source, ['b'], roleContract
    );

    await expect(first.revalidateRole()).resolves.toMatchObject({ safe: true });
    expect(source.connect).toHaveBeenCalledTimes(1);
    expect(registry.stats()).toMatchObject({
      roleAuditAttempts: 3,
      roleAuditFailures: 0
    });

    const firstNext = first.subscribe('a').next();
    const secondNext = second.subscribe('b').next();
    client.roleAuditRow = { ...safeRoleAuditRow, rolsuper: true };
    await expect(second.revalidateRole()).rejects.toBeInstanceOf(
      UnsafePgNotificationRoleError
    );
    await expect(firstNext).rejects.toBeInstanceOf(PgNotificationBrokerFailedError);
    await expect(secondNext).rejects.toBeInstanceOf(PgNotificationBrokerFailedError);
    await expect(first.terminated).resolves.toBeInstanceOf(
      PgNotificationBrokerFailedError
    );
    await expect(second.terminated).resolves.toBeInstanceOf(
      PgNotificationBrokerFailedError
    );
    expect(source.connect).toHaveBeenCalledTimes(1);
    expect(client.release).toHaveBeenCalledWith(
      expect.any(PgNotificationBrokerFailedError)
    );
    expect(registry.stats()).toMatchObject({
      listenerConnections: 0,
      leases: 2,
      fatalFailures: 1,
      roleAuditAttempts: 4,
      roleAuditFailures: 1
    });

    await Promise.all([first.release(), second.release()]);
  });

  it('bounds a never-resolving TTL role refresh on the pinned listener', async () => {
    jest.useFakeTimers();
    try {
      const registry = new PgNotificationBrokerRegistry(4, 25);
      const { client, source } = createSource();
      const lease = await registry.acquireAttestedForTests(
        'opaque-refresh-timeout',
        () => source,
        ['a'],
        roleContract
      );
      client.query.mockImplementation((text: string) => {
        client.queries.push(text);
        if (text === 'BEGIN READ ONLY') return new Promise(() => undefined);
        return Promise.resolve({ rows: [] });
      });

      const refreshing = lease.revalidateRole();
      const rejected = expect(refreshing).rejects.toBeInstanceOf(
        PgNotificationOperationTimeoutError
      );
      await flushMicrotasks();
      await jest.advanceTimersByTimeAsync(25);
      await rejected;
      await expect(lease.terminated).resolves.toBeInstanceOf(
        PgNotificationBrokerFailedError
      );

      expect(client.release).toHaveBeenCalledWith(
        expect.any(PgNotificationBrokerFailedError)
      );
      expect(registry.stats()).toMatchObject({
        listenerConnections: 0,
        leases: 1,
        fatalFailures: 1,
        roleAuditAttempts: 2,
        roleAuditFailures: 1
      });
      await lease.release();
    } finally {
      jest.useRealTimers();
    }
  });

  it('uses exact topic equality for prefix and quoted-identifier channels', async () => {
    const registry = new PgNotificationBrokerRegistry(4);
    const { client, source } = createSource();
    const hostileButValid = 'tenant"; UNLISTEN *;--';
    const lease = await registry.acquireForTests(
      'opaque-a',
      () => source,
      ['tenant', 'tenant.longer', hostileButValid]
    );
    const exact = lease.subscribe('tenant');
    const longer = lease.subscribe('tenant.longer');
    const hostile = lease.subscribe(hostileButValid);

    expect(() => lease.subscribe('ten')).toThrow(PgNotificationTopicError);
    expect(client.queries).toContain(
      'LISTEN "tenant""; UNLISTEN *;--"'
    );

    client.notification('ten', 'wrong-prefix');
    client.notification('tenant.longer', 'longer');
    client.notification(hostileButValid, 'quoted');
    client.notification('tenant', 'exact');

    await expect(exact.next()).resolves.toEqual({ done: false, value: 'exact' });
    await expect(longer.next()).resolves.toEqual({ done: false, value: 'longer' });
    await expect(hostile.next()).resolves.toEqual({ done: false, value: 'quoted' });
    expect(registry.stats().ignoredNotifications).toBe(1);
    await lease.release();
  });

  it('rejects channels PostgreSQL would truncate, including multi-byte Unicode', async () => {
    const registry = new PgNotificationBrokerRegistry();
    const { source } = createSource();

    const ascii63 = 'a'.repeat(63);
    const unicode63 = '界'.repeat(21);
    const lease = await registry.acquireForTests(
      'opaque-a',
      () => source,
      [ascii63, unicode63]
    );
    expect(lease.topics).toEqual([ascii63, unicode63]);

    await expect(
      registry.acquireForTests('opaque-b', () => source, ['a'.repeat(64)])
    ).rejects.toBeInstanceOf(PgNotificationTopicError);
    await expect(
      registry.acquireForTests('opaque-b', () => source, ['界'.repeat(22)])
    ).rejects.toBeInstanceOf(PgNotificationTopicError);
    await expect(
      registry.acquireForTests(
        'opaque-b',
        () => source,
        [`bad${String.fromCharCode(0xd800)}`]
      )
    ).rejects.toBeInstanceOf(PgNotificationTopicError);
    await lease.release();
  });

  it('does not normalize canonically equivalent Unicode topics', async () => {
    const registry = new PgNotificationBrokerRegistry(4);
    const { client, source } = createSource();
    const composed = 'réaltime';
    const decomposed = 're\u0301altime';
    const lease = await registry.acquireForTests(
      'opaque-a',
      () => source,
      [composed, decomposed]
    );
    const composedStream = lease.subscribe(composed);
    const decomposedStream = lease.subscribe(decomposed);

    client.notification(composed, 'composed-only');
    client.notification(decomposed, 'decomposed-only');

    await expect(composedStream.next()).resolves.toMatchObject({ value: 'composed-only' });
    await expect(decomposedStream.next()).resolves.toMatchObject({ value: 'decomposed-only' });
    await lease.release();
  });

  it('fans out only to subscribers for the exact allowed topic', async () => {
    const registry = new PgNotificationBrokerRegistry(4);
    const { client, source } = createSource();
    const first = await registry.acquireForTests('opaque-a', () => source, ['a']);
    const second = await registry.acquireForTests('opaque-a', () => source, ['a', 'b']);
    const firstA = first.subscribe('a');
    const secondA = second.subscribe('a');
    const secondB = second.subscribe('b');

    client.notification('a', 'for-a');
    client.notification('b', 'for-b');

    await expect(firstA.next()).resolves.toMatchObject({ value: 'for-a' });
    await expect(secondA.next()).resolves.toMatchObject({ value: 'for-a' });
    await expect(secondB.next()).resolves.toMatchObject({ value: 'for-b' });
    await Promise.all([first.release(), second.release()]);
  });

  it('fails only the slow subscriber when its bounded queue overflows', async () => {
    const registry = new PgNotificationBrokerRegistry(1);
    const { client, source } = createSource();
    const lease = await registry.acquireForTests('opaque-a', () => source, ['events']);
    const slow = lease.subscribe('events');
    const fast = lease.subscribe('events');

    const fastFirst = fast.next();
    client.notification('events', 'one');
    const fastSecond = fast.next();
    client.notification('events', 'two');

    await expect(fastFirst).resolves.toMatchObject({ value: 'one' });
    await expect(fastSecond).resolves.toMatchObject({ value: 'two' });
    await expect(slow.next()).rejects.toBeInstanceOf(PgNotificationQueueOverflowError);
    expect(registry.stats()).toMatchObject({ subscribers: 1, queueOverflows: 1 });
    await lease.release();
  });

  it('fails every active subscriber and never silently reconnects', async () => {
    const registry = new PgNotificationBrokerRegistry(4);
    const { client, source } = createSource();
    const sourceFactory = jest.fn(() => source);
    const first = await registry.acquireForTests('opaque-a', sourceFactory, ['a']);
    const second = await registry.acquireForTests('opaque-a', sourceFactory, ['b']);
    const firstNext = first.subscribe('a').next();
    const secondNext = second.subscribe('b').next();

    client.emit('error', new Error('socket lost'));

    await expect(firstNext).rejects.toBeInstanceOf(PgNotificationBrokerFailedError);
    await expect(secondNext).rejects.toBeInstanceOf(PgNotificationBrokerFailedError);
    await expect(first.terminated).resolves.toBeInstanceOf(
      PgNotificationBrokerFailedError
    );
    await expect(
      registry.acquireForTests('opaque-a', sourceFactory, ['a'])
    ).rejects.toBeInstanceOf(PgNotificationBrokerFailedError);
    expect(source.connect).toHaveBeenCalledTimes(1);
    expect(client.release).toHaveBeenCalledWith(expect.any(PgNotificationBrokerFailedError));

    await Promise.all([first.release(), second.release()]);
    const replacement = createSource();
    const explicitReplacement = await registry.acquireForTests(
      'opaque-a',
      () => replacement.source,
      ['a']
    );
    expect(replacement.source.connect).toHaveBeenCalledTimes(1);
    await explicitReplacement.release();
  });

  it('bounds a never-resolving LISTEN and fails admission closed', async () => {
    jest.useFakeTimers();
    try {
      const registry = new PgNotificationBrokerRegistry(4, 25);
      const { client, source } = createSource();
      client.query.mockImplementation((text: string) => {
        client.queries.push(text);
        if (text.startsWith('LISTEN')) return new Promise(() => undefined);
        return Promise.resolve({ rows: [] });
      });

      const acquiring = registry.acquireForTests('opaque-listen-timeout', () => source, ['a']);
      const rejected = expect(acquiring).rejects.toMatchObject({
        code: 'PG_NOTIFICATION_BROKER_FAILED',
        cause: { code: 'PG_NOTIFICATION_OPERATION_TIMEOUT' }
      });
      await flushMicrotasks();
      await jest.advanceTimersByTimeAsync(25);
      await rejected;

      expect(client.release).toHaveBeenCalledWith(
        expect.any(PgNotificationBrokerFailedError)
      );
      expect(source.release).toHaveBeenCalledTimes(1);
      expect(registry.stats()).toMatchObject({
        brokers: 0,
        listenerConnections: 0,
        fatalFailures: 1
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('fails closed when a listener emits a malformed notification', async () => {
    const registry = new PgNotificationBrokerRegistry(4);
    const { client, source } = createSource();
    const lease = await registry.acquireForTests('opaque-a', () => source, ['a']);
    const next = lease.subscribe('a').next();

    client.emit('notification', { channel: 'a', payload: { hostile: true } });

    await expect(next).rejects.toBeInstanceOf(PgNotificationBrokerFailedError);
    await expect(lease.terminated).resolves.toBeInstanceOf(
      PgNotificationBrokerFailedError
    );
    await lease.release();
  });

  it('makes double release idempotent and awaits UNLISTEN plus both releases', async () => {
    const registry = new PgNotificationBrokerRegistry(4);
    const { client, source } = createSource();
    const unlisten = deferred<void>();
    const clientReleased = deferred<void>();
    const sourceReleased = deferred<void>();
    client.query.mockImplementation(async (text: string) => {
      client.queries.push(text);
      if (text.startsWith('UNLISTEN')) await unlisten.promise;
      return { rows: [] };
    });
    client.release.mockImplementation(async () => clientReleased.promise);
    (source.release as jest.Mock).mockImplementation(async () => sourceReleased.promise);
    const lease = await registry.acquireForTests('opaque-a', () => source, ['a']);

    const firstRelease = lease.release();
    const secondRelease = lease.release();
    expect(firstRelease).toBe(secondRelease);
    await flushMicrotasks();
    expect(client.queries).toContain('UNLISTEN "a"');

    let settled = false;
    void firstRelease.then(() => {
      settled = true;
    });
    unlisten.resolve();
    await flushMicrotasks();
    expect(settled).toBe(false);
    clientReleased.resolve();
    await flushMicrotasks();
    expect(settled).toBe(false);
    sourceReleased.resolve();
    await firstRelease;
    await expect(lease.terminated).resolves.toBeNull();
    expect(settled).toBe(true);
    expect(client.release).toHaveBeenCalledTimes(1);
    expect(source.release).toHaveBeenCalledTimes(1);
  });

  it('serializes a final release against a concurrent new acquisition', async () => {
    const registry = new PgNotificationBrokerRegistry(4);
    const firstSource = createSource();
    const unlisten = deferred<void>();
    firstSource.client.query.mockImplementation(async (text: string) => {
      firstSource.client.queries.push(text);
      if (text.startsWith('UNLISTEN')) await unlisten.promise;
      return { rows: [] };
    });
    const first = await registry.acquireForTests(
      'opaque-a',
      () => firstSource.source,
      ['a']
    );
    const releasing = first.release();
    await flushMicrotasks();

    const secondSource = createSource();
    const acquiring = registry.acquireForTests(
      'opaque-a',
      () => secondSource.source,
      ['a']
    );
    await flushMicrotasks();
    expect(secondSource.source.connect).not.toHaveBeenCalled();

    unlisten.resolve();
    await releasing;
    const second = await acquiring;
    expect(secondSource.source.connect).toHaveBeenCalledTimes(1);
    await second.release();
  });

  it('makes concurrent registry close calls await the same teardown', async () => {
    const registry = new PgNotificationBrokerRegistry(4);
    const { source } = createSource();
    const sourceReleased = deferred<void>();
    (source.release as jest.Mock).mockImplementation(async () => sourceReleased.promise);
    await registry.acquireForTests('opaque-a', () => source, ['a']);

    const firstClose = registry.close();
    const secondClose = registry.close();
    let firstSettled = false;
    let secondSettled = false;
    void firstClose.then(() => {
      firstSettled = true;
    });
    void secondClose.then(() => {
      secondSettled = true;
    });
    await flushMicrotasks();

    expect(firstSettled).toBe(false);
    expect(secondSettled).toBe(false);
    sourceReleased.resolve();
    await Promise.all([firstClose, secondClose]);
    expect(source.release).toHaveBeenCalledTimes(1);
    expect(registry.stats()).toMatchObject({ brokers: 0, leases: 0 });
  });

  it('bounds a never-resolving UNLISTEN so teardown cannot hang', async () => {
    jest.useFakeTimers();
    try {
      const registry = new PgNotificationBrokerRegistry(4, 25);
      const { client, source } = createSource();
      await registry.acquireForTests('opaque-unlisten-timeout', () => source, ['a']);
      client.query.mockImplementation((text: string) => {
        client.queries.push(text);
        if (text.startsWith('UNLISTEN')) return new Promise(() => undefined);
        return Promise.resolve({ rows: [] });
      });

      const closing = registry.close();
      const rejected = expect(closing).rejects.toMatchObject({
        code: 'PG_NOTIFICATION_BROKER_FAILED',
        cause: { code: 'PG_NOTIFICATION_OPERATION_TIMEOUT' }
      });
      await flushMicrotasks();
      await jest.advanceTimersByTimeAsync(25);
      await rejected;

      expect(client.release).toHaveBeenCalledWith(
        expect.any(PgNotificationBrokerFailedError)
      );
      expect(source.release).toHaveBeenCalledTimes(1);
      expect(registry.stats()).toMatchObject({
        brokers: 0,
        listenerConnections: 0,
        leases: 0,
        fatalFailures: 1
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('drains an in-flight acquisition before registry close resolves', async () => {
    const registry = new PgNotificationBrokerRegistry(4);
    const { client, source } = createSource();
    const connected = deferred<MockNotificationClient>();
    const sourceReleased = deferred<void>();
    (source.connect as jest.Mock).mockImplementation(async () => connected.promise);
    (source.release as jest.Mock).mockImplementation(async () => sourceReleased.promise);
    const acquiring = registry.acquireForTests('opaque-a', () => source, ['a']);
    await flushMicrotasks();
    expect(source.connect).toHaveBeenCalledTimes(1);

    const closing = registry.close();
    let closeSettled = false;
    void closing.then(() => {
      closeSettled = true;
    });
    connected.resolve(client);
    await flushMicrotasks();
    const closeSettledBeforeSourceRelease = closeSettled;
    const issuedListenDuringClose = client.queries.includes('LISTEN "a"');
    sourceReleased.resolve();
    await expect(acquiring).rejects.toThrow(
      'PostgreSQL notification broker registry is closed'
    );
    await closing;
    expect(closeSettledBeforeSourceRelease).toBe(false);
    expect(issuedListenDuringClose).toBe(false);
    expect(client.release).toHaveBeenCalledTimes(1);
    expect(source.release).toHaveBeenCalledTimes(1);
    expect(registry.stats()).toMatchObject({ brokers: 0, leases: 0 });
  });

  it('UNLISTENs a provisional topic when close races an in-flight LISTEN', async () => {
    const registry = new PgNotificationBrokerRegistry(4);
    const { client, source } = createSource();
    const listened = deferred<void>();
    client.query.mockImplementation(async (text: string) => {
      client.queries.push(text);
      if (text === 'LISTEN "a"') await listened.promise;
      return { rows: [] };
    });
    const acquiring = registry.acquireForTests('opaque-a', () => source, ['a']);
    await flushMicrotasks();
    expect(client.queries).toEqual(['LISTEN "a"']);

    const closing = registry.close();
    listened.resolve();
    await expect(acquiring).rejects.toThrow(
      'PostgreSQL notification broker registry is closed'
    );
    await closing;

    expect(client.queries).toEqual(['LISTEN "a"', 'UNLISTEN *']);
    expect(client.release).toHaveBeenCalledTimes(1);
    expect(source.release).toHaveBeenCalledTimes(1);
  });

  it('reports a failed UNLISTEN only after finishing registry teardown', async () => {
    const registry = new PgNotificationBrokerRegistry(4);
    const { client, source } = createSource();
    client.query.mockImplementation(async (text: string) => {
      client.queries.push(text);
      if (text.startsWith('UNLISTEN')) throw new Error('unlisten failed');
      return { rows: [] };
    });
    await registry.acquireForTests('opaque-a', () => source, ['a']);

    await expect(registry.close()).rejects.toBeInstanceOf(
      PgNotificationBrokerFailedError
    );
    expect(client.release).toHaveBeenCalledTimes(1);
    expect(source.release).toHaveBeenCalledTimes(1);
    expect(registry.stats()).toMatchObject({ brokers: 0, leases: 0 });
  });
});

describe('getPgNotificationBrokerIdentity', () => {
  const baseConfig = {
    host: 'db.internal',
    port: 5432,
    database: 'customer',
    user: 'listener',
    password: 'secret'
  };

  it('is versioned, opaque, stable, and includes the canonical SSL contract', () => {
    const first = getPgNotificationBrokerIdentity({
      ...baseConfig,
      ssl: { rejectUnauthorized: true, ca: 'ca-one' },
      pool: { connectionTimeoutMillis: DEFAULT_PG_NOTIFICATION_OPERATION_TIMEOUT_MS }
    });
    const reordered = getPgNotificationBrokerIdentity({
      ...baseConfig,
      ssl: { ca: 'ca-one', rejectUnauthorized: true },
      pool: { connectionTimeoutMillis: DEFAULT_PG_NOTIFICATION_OPERATION_TIMEOUT_MS }
    });
    const changedTls = getPgNotificationBrokerIdentity({
      ...baseConfig,
      ssl: { rejectUnauthorized: false, ca: 'ca-one' },
      pool: { connectionTimeoutMillis: DEFAULT_PG_NOTIFICATION_OPERATION_TIMEOUT_MS }
    });
    const changedDeadline = getPgNotificationBrokerIdentity({
      ...baseConfig,
      ssl: { rejectUnauthorized: true, ca: 'ca-one' },
      pool: {
        connectionTimeoutMillis:
          DEFAULT_PG_NOTIFICATION_OPERATION_TIMEOUT_MS + 1
      }
    });

    expect(first).toBe(reordered);
    expect(first).not.toBe(changedTls);
    expect(first).not.toBe(changedDeadline);
    expect(first).toMatch(/^pg-notification-broker:v1:pg:v1:[a-f0-9]{64}$/);
    expect(first).not.toContain('listener');
    expect(first).not.toContain('secret');
  });

  it.each([0, -1, 1.5, 2_147_483_648])(
    'rejects invalid notification operation timeout %p before identity publication',
    (connectionTimeoutMillis) => {
      expect(() => getPgNotificationBrokerIdentity({
        ...baseConfig,
        pool: { connectionTimeoutMillis }
      })).toThrow('notification operation timeout');
    }
  );

  it('uses one credential-free identity for the same physical database target', () => {
    const first = getPgNotificationDatabaseIdentity({
      ...baseConfig,
      ssl: { rejectUnauthorized: true, ca: 'ca-one' },
      pool: { max: 2 }
    });
    const rotated = getPgNotificationDatabaseIdentity({
      ...baseConfig,
      user: 'rotated-listener',
      password: 'rotated-secret',
      ssl: { ca: 'different-ca', rejectUnauthorized: false },
      pool: { max: 20, idleTimeoutMillis: 99_000 }
    });
    const otherHost = getPgNotificationDatabaseIdentity({
      ...baseConfig,
      host: 'other-db.internal'
    });
    const otherPort = getPgNotificationDatabaseIdentity({
      ...baseConfig,
      port: 5433
    });
    const otherDatabase = getPgNotificationDatabaseIdentity({
      ...baseConfig,
      database: 'other-customer',
      ssl: { rejectUnauthorized: true, ca: 'ca-one' }
    });

    expect(first).toBe(rotated);
    expect(first).not.toBe(otherHost);
    expect(first).not.toBe(otherPort);
    expect(first).not.toBe(otherDatabase);
    expect(first).toMatch(/^pg-notification-database:v1:pg-target:v1:[a-f0-9]{64}$/);
    expect(first).not.toContain('listener');
    expect(first).not.toContain('secret');
  });
});
