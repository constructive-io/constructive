import type { PgConfig, PgPoolConfig } from 'pg-env';

import {
  assertPgNotificationRoleClient,
  type PgNotificationRoleAudit,
  type PgNotificationRoleClient,
  type PgNotificationRoleContract,
} from './notification-role';
import {
  acquirePgPool,
  getPgDatabaseTargetIdentity,
  getPgPoolConfig,
  getPgPoolIdentity,
} from './pg';

export const PG_NOTIFICATION_BROKER_IDENTITY_VERSION =
  'pg-notification-broker:v1';
export const PG_NOTIFICATION_DATABASE_IDENTITY_VERSION =
  'pg-notification-database:v1';
export const PG_NOTIFICATION_QUEUE_CAPACITY = 256;
export const DEFAULT_PG_NOTIFICATION_OPERATION_TIMEOUT_MS = 5_000;

export const PG_NOTIFICATION_TOPIC_ERROR_CODE = 'PG_NOTIFICATION_TOPIC_INVALID';
export const PG_NOTIFICATION_BROKER_FAILED_ERROR_CODE =
  'PG_NOTIFICATION_BROKER_FAILED';
export const PG_NOTIFICATION_QUEUE_OVERFLOW_ERROR_CODE =
  'PG_NOTIFICATION_QUEUE_OVERFLOW';
export const PG_NOTIFICATION_LEASE_RELEASED_ERROR_CODE =
  'PG_NOTIFICATION_LEASE_RELEASED';
export const PG_NOTIFICATION_OPERATION_TIMEOUT_ERROR_CODE =
  'PG_NOTIFICATION_OPERATION_TIMEOUT';

type PromiseOrDirect<T> = T | Promise<T>;

export interface PgNotification {
  channel: string;
  payload?: string;
}

export interface PgNotificationClient {
  query(text: string, values?: readonly unknown[]): Promise<unknown>;
  on(event: string, listener: (...args: any[]) => void): unknown;
  off(event: string, listener: (...args: any[]) => void): unknown;
  release(error?: Error | boolean): PromiseOrDirect<void>;
}

export interface PgNotificationConnectionSource {
  connect(): Promise<PgNotificationClient>;
  release(): PromiseOrDirect<void>;
}

export interface PgNotificationBrokerLease {
  /** Versioned digest of the complete listener connection contract. */
  readonly identity: string;
  /** Frozen, exact PostgreSQL channels this lease may subscribe to. */
  readonly topics: readonly string[];
  /** Resolves on fatal broker failure or with null after graceful release. */
  readonly terminated: Promise<PgNotificationBrokerFailedError | null>;
  subscribe(topic: string): AsyncIterableIterator<string>;
  /** Idempotent and awaited through UNLISTEN and connection release. */
  release(): Promise<void>;
}

/**
 * A production lease whose login was audited on the same pinned PostgreSQL
 * client before admission. Arbitrary SQL and the client itself stay private.
 */
export interface PgAttestedNotificationBrokerLease extends PgNotificationBrokerLease {
  readonly roleAudit: PgNotificationRoleAudit;
  revalidateRole(): Promise<PgNotificationRoleAudit>;
}

export interface AcquirePgNotificationBrokerOptions {
  /** Every channel this generation may observe. Prefix matching is never used. */
  topics: readonly string[];
}

export type PgNotificationListenerConfig = PgConfig & { pool?: PgPoolConfig };

export interface PgNotificationBrokerStats {
  brokers: number;
  listenerConnections: number;
  leases: number;
  topics: number;
  subscribers: number;
  acquisitions: number;
  releases: number;
  notifications: number;
  ignoredNotifications: number;
  queueOverflows: number;
  fatalFailures: number;
  roleAuditAttempts: number;
  roleAuditFailures: number;
}

type PgNotificationBrokerSnapshot = Pick<
  PgNotificationBrokerStats,
  'listenerConnections' | 'leases' | 'topics' | 'subscribers'
>;

interface MutableBrokerCounters {
  acquisitions: number;
  releases: number;
  notifications: number;
  ignoredNotifications: number;
  queueOverflows: number;
  fatalFailures: number;
  roleAuditAttempts: number;
  roleAuditFailures: number;
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
}

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

export class PgNotificationTopicError extends Error {
  readonly code = PG_NOTIFICATION_TOPIC_ERROR_CODE;

  constructor(
    readonly topic: unknown,
    reason: string
  ) {
    super(`Invalid PostgreSQL notification topic: ${reason}`);
    this.name = 'PgNotificationTopicError';
  }
}

export class PgNotificationBrokerFailedError extends Error {
  readonly code = PG_NOTIFICATION_BROKER_FAILED_ERROR_CODE;

  constructor(reason: unknown) {
    const cause = reason instanceof Error ? reason : new Error(String(reason));
    super(
      'PostgreSQL notification broker failed; all subscribers were terminated',
      {
        cause,
      }
    );
    this.name = 'PgNotificationBrokerFailedError';
  }
}

export class PgNotificationQueueOverflowError extends Error {
  readonly code = PG_NOTIFICATION_QUEUE_OVERFLOW_ERROR_CODE;

  constructor(
    readonly topic: string,
    readonly capacity: number
  ) {
    super(
      `PostgreSQL notification subscriber queue for ${JSON.stringify(topic)} ` +
        `exceeded its fixed capacity of ${capacity}`
    );
    this.name = 'PgNotificationQueueOverflowError';
  }
}

export class PgNotificationLeaseReleasedError extends Error {
  readonly code = PG_NOTIFICATION_LEASE_RELEASED_ERROR_CODE;

  constructor() {
    super('PostgreSQL notification broker lease has been released');
    this.name = 'PgNotificationLeaseReleasedError';
  }
}

export class PgNotificationOperationTimeoutError extends Error {
  readonly code = PG_NOTIFICATION_OPERATION_TIMEOUT_ERROR_CODE;

  constructor(
    readonly operation: 'role-audit' | 'listen' | 'unlisten',
    readonly timeoutMs: number
  ) {
    super(
      `PostgreSQL notification ${operation} exceeded its fixed ${timeoutMs}ms deadline`
    );
    this.name = 'PgNotificationOperationTimeoutError';
  }
}

class BrokerClosedError extends Error {}

const containsUnpairedSurrogate = (value: string): boolean => {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index++;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
};

/**
 * PostgreSQL identifiers are limited to 63 UTF-8 bytes. PostgreSQL truncates
 * longer identifiers, so accepting them here could collapse distinct tenant
 * topics onto one physical LISTEN channel.
 */
export function assertValidPgNotificationTopic(
  topic: unknown
): asserts topic is string {
  if (typeof topic !== 'string') {
    throw new PgNotificationTopicError(topic, 'the topic must be a string');
  }
  if (topic.length === 0) {
    throw new PgNotificationTopicError(topic, 'the topic must not be empty');
  }
  if (topic.includes('\0')) {
    throw new PgNotificationTopicError(topic, 'NUL bytes are not allowed');
  }
  if (containsUnpairedSurrogate(topic)) {
    throw new PgNotificationTopicError(
      topic,
      'unpaired UTF-16 surrogates are not allowed'
    );
  }
  const bytes = Buffer.byteLength(topic, 'utf8');
  if (bytes > 63) {
    throw new PgNotificationTopicError(
      topic,
      `the UTF-8 encoding is ${bytes} bytes; PostgreSQL allows at most 63`
    );
  }
}

const normalizeTopics = (topics: readonly string[]): readonly string[] => {
  if (!Array.isArray(topics) || topics.length === 0) {
    throw new PgNotificationTopicError(
      topics,
      'at least one exact topic is required'
    );
  }
  for (const topic of topics) assertValidPgNotificationTopic(topic);
  return Object.freeze([...new Set(topics)]);
};

const quoteIdentifier = (identifier: string): string =>
  `"${identifier.replace(/"/g, '""')}"`;

class BoundedNotificationQueue implements AsyncIterableIterator<string> {
  private readonly buffered: string[] = [];
  private readonly waiting: Deferred<IteratorResult<string>>[] = [];
  private terminal: 'open' | 'complete' | 'failed' = 'open';
  private failure: Error | null = null;

  constructor(
    private readonly topic: string,
    private readonly capacity: number,
    private readonly onClose: () => void,
    private readonly onOverflow: () => void
  ) {}

  [Symbol.asyncIterator](): AsyncIterableIterator<string> {
    return this;
  }

  next(): Promise<IteratorResult<string>> {
    const buffered = this.buffered.shift();
    if (buffered !== undefined) {
      return Promise.resolve({ done: false, value: buffered });
    }
    if (this.terminal === 'failed') return Promise.reject(this.failure);
    if (this.terminal === 'complete') {
      return Promise.resolve({ done: true, value: undefined });
    }

    const result = deferred<IteratorResult<string>>();
    this.waiting.push(result);
    return result.promise;
  }

  return(value?: unknown): Promise<IteratorResult<string>> {
    this.complete();
    return Promise.resolve({ done: true, value: value as string });
  }

  throw(error?: unknown): Promise<IteratorResult<string>> {
    const failure = error instanceof Error ? error : new Error(String(error));
    this.fail(failure);
    return Promise.reject(failure);
  }

  push(payload: string): void {
    if (this.terminal !== 'open') return;
    const waiter = this.waiting.shift();
    if (waiter) {
      waiter.resolve({ done: false, value: payload });
      return;
    }
    if (this.buffered.length >= this.capacity) {
      this.onOverflow();
      this.fail(
        new PgNotificationQueueOverflowError(this.topic, this.capacity)
      );
      return;
    }
    this.buffered.push(payload);
  }

  complete(): void {
    if (this.terminal !== 'open') return;
    this.terminal = 'complete';
    this.buffered.length = 0;
    for (const waiter of this.waiting.splice(0)) {
      waiter.resolve({ done: true, value: undefined });
    }
    this.onClose();
  }

  fail(error: Error): void {
    if (this.terminal !== 'open') return;
    this.terminal = 'failed';
    this.failure = error;
    this.buffered.length = 0;
    for (const waiter of this.waiting.splice(0)) waiter.reject(error);
    this.onClose();
  }
}

type BrokerState = 'new' | 'active' | 'failed' | 'closing' | 'closed';
type ConnectionSourceFactory =
  () => PromiseOrDirect<PgNotificationConnectionSource>;
type NotificationOperation = PgNotificationOperationTimeoutError['operation'];

const MAX_TIMER_DELAY_MS = 2_147_483_647;

const assertNotificationOperationTimeoutMs = (timeoutMs: number): number => {
  if (
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs <= 0 ||
    timeoutMs > MAX_TIMER_DELAY_MS
  ) {
    throw new TypeError(
      'PostgreSQL notification operation timeout must be an integer ' +
        `between 1 and ${MAX_TIMER_DELAY_MS}`
    );
  }
  return timeoutMs;
};

const getNotificationOperationTimeoutMs = (
  listenerPgConfig: PgNotificationListenerConfig
): number => {
  // Preserve this API's narrower deadline contract and stable error before the
  // generic pool validator runs as part of identity construction.
  const configured = listenerPgConfig.pool?.connectionTimeoutMillis;
  return assertNotificationOperationTimeoutMs(
    configured ??
      getPgPoolConfig(listenerPgConfig.pool).connectionTimeoutMillis ??
      DEFAULT_PG_NOTIFICATION_OPERATION_TIMEOUT_MS
  );
};

class NotificationBrokerLease implements PgAttestedNotificationBrokerLease {
  readonly topics: readonly string[];
  readonly terminated: Promise<PgNotificationBrokerFailedError | null>;
  private readonly allowedTopics: ReadonlySet<string>;
  private readonly termination =
    deferred<PgNotificationBrokerFailedError | null>();
  private readonly queues = new Map<string, Set<BoundedNotificationQueue>>();
  private audit: PgNotificationRoleAudit | null = null;
  private released = false;
  private releasePromise: Promise<void> | null = null;

  constructor(
    readonly identity: string,
    topics: readonly string[],
    private readonly broker: NotificationBrokerRecord,
    private readonly queueCapacity: number,
    private readonly counters: MutableBrokerCounters,
    readonly roleContract: Readonly<PgNotificationRoleContract> | null
  ) {
    this.topics = topics;
    this.terminated = this.termination.promise;
    this.allowedTopics = new Set(topics);
  }

  get subscriberCount(): number {
    let count = 0;
    for (const topicQueues of this.queues.values()) count += topicQueues.size;
    return count;
  }

  get isReleased(): boolean {
    return this.released;
  }

  get roleAudit(): PgNotificationRoleAudit {
    if (!this.audit) {
      throw new Error(
        'PostgreSQL notification broker lease is not role-attested'
      );
    }
    return this.audit;
  }

  setRoleAudit(audit: PgNotificationRoleAudit): void {
    this.audit = audit;
  }

  revalidateRole(): Promise<PgNotificationRoleAudit> {
    if (this.released)
      return Promise.reject(new PgNotificationLeaseReleasedError());
    if (!this.roleContract) {
      return Promise.reject(
        new Error('PostgreSQL notification broker lease is not role-attested')
      );
    }
    return this.broker.revalidateLeaseRole(this);
  }

  subscribe(topic: string): AsyncIterableIterator<string> {
    if (this.released) throw new PgNotificationLeaseReleasedError();
    this.broker.assertAvailable();
    if (!this.allowedTopics.has(topic)) {
      throw new PgNotificationTopicError(
        topic,
        "the topic is not in this lease's exact allowlist"
      );
    }

    let topicQueues = this.queues.get(topic);
    if (!topicQueues) {
      topicQueues = new Set();
      this.queues.set(topic, topicQueues);
    }
    let queue!: BoundedNotificationQueue;
    queue = new BoundedNotificationQueue(
      topic,
      this.queueCapacity,
      () => {
        topicQueues!.delete(queue);
        if (topicQueues!.size === 0) this.queues.delete(topic);
      },
      () => {
        this.counters.queueOverflows++;
      }
    );
    topicQueues.add(queue);
    return queue;
  }

  dispatch(topic: string, payload: string): void {
    const queues = this.queues.get(topic);
    if (!queues) return;
    for (const queue of [...queues]) queue.push(payload);
  }

  fail(error: PgNotificationBrokerFailedError): void {
    this.termination.resolve(error);
    for (const queues of [...this.queues.values()]) {
      for (const queue of [...queues]) queue.fail(error);
    }
  }

  release(): Promise<void> {
    if (this.releasePromise) return this.releasePromise;
    this.released = true;
    for (const queues of [...this.queues.values()]) {
      for (const queue of [...queues]) queue.complete();
    }
    this.releasePromise = this.broker.releaseLease(this);
    void this.releasePromise.then(
      () => this.termination.resolve(null),
      (error) =>
        this.termination.resolve(
          error instanceof PgNotificationBrokerFailedError
            ? error
            : new PgNotificationBrokerFailedError(error)
        )
    );
    return this.releasePromise;
  }
}

class NotificationBrokerRecord {
  private state: BrokerState = 'new';
  private acceptingLeases = true;
  private operation: Promise<void> = Promise.resolve();
  private source: PgNotificationConnectionSource | null = null;
  private client: PgNotificationClient | null = null;
  private clientCleanup: Promise<void> | null = null;
  private sourceCleanup: Promise<void> | null = null;
  private fatalError: PgNotificationBrokerFailedError | null = null;
  private readonly leases = new Set<NotificationBrokerLease>();
  private readonly topicReferences = new Map<string, number>();
  /** Includes provisional LISTENs whose lease admission has not committed yet. */
  private readonly listenedTopics = new Set<string>();

  private readonly onNotification = (notification: PgNotification): void => {
    if (this.state !== 'active') return;
    if (
      !notification ||
      typeof notification.channel !== 'string' ||
      (notification.payload !== undefined &&
        typeof notification.payload !== 'string')
    ) {
      this.markFailed(
        new Error('PostgreSQL listener emitted a malformed notification')
      );
      return;
    }
    if (!this.topicReferences.has(notification.channel)) {
      this.counters.ignoredNotifications++;
      return;
    }
    this.counters.notifications++;
    const payload = notification.payload ?? '';
    for (const lease of [...this.leases]) {
      lease.dispatch(notification.channel, payload);
    }
  };

  private readonly onClientError = (error: unknown): void => {
    this.markFailed(error);
  };

  private readonly onClientEnd = (): void => {
    this.markFailed(
      new Error('PostgreSQL notification listener connection ended')
    );
  };

  constructor(
    readonly identity: string,
    private readonly sourcePromise: Promise<PgNotificationConnectionSource>,
    private readonly queueCapacity: number,
    private readonly operationTimeoutMs: number,
    private readonly counters: MutableBrokerCounters,
    private readonly onTerminal: (record: NotificationBrokerRecord) => void
  ) {}

  get snapshot(): PgNotificationBrokerSnapshot {
    let subscribers = 0;
    for (const lease of this.leases) subscribers += lease.subscriberCount;
    return {
      listenerConnections: this.client ? 1 : 0,
      leases: this.leases.size,
      topics: this.topicReferences.size,
      subscribers,
    };
  }

  assertAvailable(): void {
    if (this.state === 'failed') throw this.fatalError!;
    if (this.state !== 'active') throw new PgNotificationLeaseReleasedError();
  }

  async acquire(
    topics: readonly string[],
    roleContract: Readonly<PgNotificationRoleContract> | null = null
  ): Promise<NotificationBrokerLease> {
    const lease = new NotificationBrokerLease(
      this.identity,
      topics,
      this,
      this.queueCapacity,
      this.counters,
      roleContract
    );
    await this.enqueue(async () => {
      if (!this.acceptingLeases) throw new BrokerClosedError();
      if (this.state === 'failed') throw this.fatalError!;
      if (this.state === 'closing' || this.state === 'closed') {
        throw new BrokerClosedError();
      }
      const client = await this.ensureClient();
      if (!this.acceptingLeases) throw new BrokerClosedError();
      if (roleContract) {
        lease.setRoleAudit(await this.auditRole(client, roleContract));
      }
      if (!this.acceptingLeases) throw new BrokerClosedError();
      for (const topic of topics) {
        if ((this.topicReferences.get(topic) ?? 0) === 0) {
          await this.executeListenerQuery(
            client,
            `LISTEN ${quoteIdentifier(topic)}`
          );
          this.listenedTopics.add(topic);
        }
      }
      if (!this.acceptingLeases || this.state !== 'active') {
        if (this.fatalError) throw this.fatalError;
        throw new BrokerClosedError();
      }
      for (const topic of topics) {
        this.topicReferences.set(
          topic,
          (this.topicReferences.get(topic) ?? 0) + 1
        );
      }
      this.leases.add(lease);
      this.counters.acquisitions++;
    });
    return lease;
  }

  async revalidateLeaseRole(
    lease: NotificationBrokerLease
  ): Promise<PgNotificationRoleAudit> {
    return this.enqueue(async () => {
      if (lease.isReleased || !this.leases.has(lease)) {
        throw new PgNotificationLeaseReleasedError();
      }
      if (this.state === 'failed') throw this.fatalError!;
      if (this.state !== 'active' || !this.client || !lease.roleContract) {
        throw new PgNotificationLeaseReleasedError();
      }
      const audit = await this.auditRole(this.client, lease.roleContract);
      lease.setRoleAudit(audit);
      return audit;
    });
  }

  async releaseLease(lease: NotificationBrokerLease): Promise<void> {
    return this.enqueue(async () => {
      if (!this.leases.delete(lease)) return;
      this.counters.releases++;

      const topicsToUnlisten: string[] = [];
      for (const topic of lease.topics) {
        const next = (this.topicReferences.get(topic) ?? 0) - 1;
        if (next <= 0) {
          this.topicReferences.delete(topic);
          topicsToUnlisten.push(topic);
        } else {
          this.topicReferences.set(topic, next);
        }
      }

      let releaseError: Error | null = null;
      if (this.state === 'active' && this.client) {
        for (const topic of topicsToUnlisten) {
          try {
            await this.executeListenerQuery(
              this.client,
              `UNLISTEN ${quoteIdentifier(topic)}`
            );
            this.listenedTopics.delete(topic);
          } catch (error) {
            releaseError =
              this.fatalError ?? new PgNotificationBrokerFailedError(error);
            break;
          }
        }
      }

      if (this.leases.size === 0) await this.closeUnused();
      if (releaseError) throw releaseError;
    });
  }

  async closeAll(): Promise<void> {
    this.acceptingLeases = false;
    // Cross the serialized-operation barrier before snapshotting leases. This
    // either rejects an acquisition already waiting on connect/LISTEN or makes
    // its completed lease visible to the release snapshot below.
    await this.enqueue((): void => undefined);
    const releases = [...this.leases].map((lease) => lease.release());
    const releaseResults = await Promise.allSettled(releases);
    const closeErrors = releaseResults
      .filter(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected'
      )
      .map((result) => result.reason);
    try {
      await this.enqueue(() => this.closeUnused());
    } catch (error) {
      closeErrors.push(error);
    }
    if (closeErrors.length === 1) throw closeErrors[0];
    if (closeErrors.length > 1) {
      throw new PgNotificationBrokerFailedError(
        new AggregateError(
          closeErrors,
          'Multiple PostgreSQL notification broker close operations failed'
        )
      );
    }
  }

  async closeIfUnused(): Promise<void> {
    await this.enqueue(() => this.closeUnused());
  }

  private enqueue<T>(operation: () => PromiseOrDirect<T>): Promise<T> {
    const pending = this.operation.then(operation, operation);
    this.operation = pending.then(
      (): void => undefined,
      (): void => undefined
    );
    return pending;
  }

  private async ensureClient(): Promise<PgNotificationClient> {
    if (this.client) return this.client;
    try {
      this.source = await this.sourcePromise;
      if (this.fatalError) throw this.fatalError;
      const client = await this.source.connect();
      this.client = client;
      client.on('notification', this.onNotification);
      client.on('error', this.onClientError);
      client.on('end', this.onClientEnd);
      this.state = 'active';
      return client;
    } catch (error) {
      this.markFailed(error);
      await this.awaitFailedClientCleanup();
      throw this.fatalError!;
    }
  }

  private async executeListenerQuery(
    client: PgNotificationClient,
    text: string
  ): Promise<void> {
    try {
      await this.runWithOperationDeadline(
        text.startsWith('UNLISTEN') ? 'unlisten' : 'listen',
        () => client.query(text)
      );
      if (this.state === 'failed') throw this.fatalError!;
    } catch (error) {
      this.markFailed(error);
      await this.awaitFailedClientCleanup();
      throw this.fatalError!;
    }
  }

  private async auditRole(
    client: PgNotificationClient,
    contract: Readonly<PgNotificationRoleContract>
  ): Promise<PgNotificationRoleAudit> {
    this.counters.roleAuditAttempts++;
    try {
      const audit = await this.runWithOperationDeadline('role-audit', () =>
        assertPgNotificationRoleClient(
          client as unknown as PgNotificationRoleClient,
          contract
        )
      );
      if (this.state === 'failed') throw this.fatalError!;
      return audit;
    } catch (error) {
      this.counters.roleAuditFailures++;
      this.markFailed(error);
      await this.awaitFailedClientCleanup();
      // Preserve the stable unsafe-role error for startup and attestation
      // diagnostics. Active leases separately observe the broker-failed latch.
      throw error;
    }
  }

  private async runWithOperationDeadline<T>(
    operation: NotificationOperation,
    task: () => PromiseOrDirect<T>
  ): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        const error = new PgNotificationOperationTimeoutError(
          operation,
          this.operationTimeoutMs
        );
        // Latch failure and start client destruction at the exact deadline. The
        // driver promise remains observed below, so a later rejection is safe.
        this.markFailed(error);
        reject(error);
      }, this.operationTimeoutMs);
      timer.unref?.();
    });
    // Promise.race installs a rejection handler on the driver query. If the
    // deadline wins, destroying the client may settle that abandoned query
    // later without producing an unhandled rejection.
    const operationPromise = Promise.resolve().then(task);
    try {
      return await Promise.race([operationPromise, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private markFailed(reason: unknown): void {
    if (
      this.state === 'failed' ||
      this.state === 'closing' ||
      this.state === 'closed'
    )
      return;
    this.state = 'failed';
    this.fatalError =
      reason instanceof PgNotificationBrokerFailedError
        ? reason
        : new PgNotificationBrokerFailedError(reason);
    this.counters.fatalFailures++;
    for (const lease of [...this.leases]) lease.fail(this.fatalError);

    const client = this.client;
    this.client = null;
    if (client) {
      this.clientCleanup = this.releaseClient(client, this.fatalError);
      // Event-driven failures may not have an immediate waiter. Keep the
      // cleanup rejection observed; release/teardown still await and report it.
      void this.clientCleanup.catch(() => {});
    }
  }

  private async awaitFailedClientCleanup(): Promise<void> {
    try {
      if (this.clientCleanup) await this.clientCleanup;
    } catch (cleanupError) {
      throw new PgNotificationBrokerFailedError(
        new AggregateError(
          [this.fatalError, cleanupError],
          'PostgreSQL notification failure cleanup did not complete safely',
          { cause: this.fatalError ?? undefined }
        )
      );
    }
  }

  private async releaseClient(
    client: PgNotificationClient,
    error?: Error,
    destroy = false
  ): Promise<void> {
    client.off('notification', this.onNotification);
    client.off('end', this.onClientEnd);
    try {
      await client.release(error ?? (destroy ? true : undefined));
    } catch (releaseError) {
      if (error) {
        throw new AggregateError(
          [error, releaseError],
          'PostgreSQL notification failure and client cleanup both failed',
          { cause: error }
        );
      }
      throw releaseError;
    } finally {
      client.off('error', this.onClientError);
    }
  }

  private async closeUnused(): Promise<void> {
    if (this.leases.size > 0 || this.state === 'closed') return;

    const cleanupErrors: unknown[] = [];
    if (this.client && this.listenedTopics.size > 0) {
      try {
        // This also covers a shutdown racing between a successful LISTEN and
        // lease admission, where no committed topic reference exists yet.
        await this.executeListenerQuery(this.client, 'UNLISTEN *');
        this.listenedTopics.clear();
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    if (this.state !== 'failed') this.state = 'closing';

    const client = this.client;
    this.client = null;
    if (client) {
      const releaseError =
        cleanupErrors.length > 0
          ? new PgNotificationBrokerFailedError(cleanupErrors[0])
          : undefined;
      // Once the last exact-generation lease is gone, retaining an idle
      // listener backend only delays PostgreSQL memory reclamation. Destroy it
      // after UNLISTEN; the identity-only pool can create a fresh client later.
      this.clientCleanup = this.releaseClient(client, releaseError, true);
    }
    try {
      if (this.clientCleanup) await this.clientCleanup;
    } catch (error) {
      cleanupErrors.push(error);
    }

    if (this.source && !this.sourceCleanup) {
      const source = this.source;
      this.source = null;
      this.sourceCleanup = Promise.resolve(source.release());
    }
    try {
      if (this.sourceCleanup) await this.sourceCleanup;
    } catch (error) {
      cleanupErrors.push(error);
    }

    this.state = 'closed';
    this.onTerminal(this);
    if (cleanupErrors.length === 1) {
      const [error] = cleanupErrors;
      throw error instanceof PgNotificationBrokerFailedError
        ? error
        : new PgNotificationBrokerFailedError(error);
    }
    if (cleanupErrors.length > 1) {
      throw new PgNotificationBrokerFailedError(
        new AggregateError(
          cleanupErrors,
          'Multiple PostgreSQL notification cleanup operations failed'
        )
      );
    }
  }
}

/**
 * Registry implementation exposed for deterministic unit tests. Production
 * callers must use acquirePgNotificationBroker so identity and pool ownership
 * always come from the canonical PgConfig path.
 *
 * @internal
 */
export class PgNotificationBrokerRegistry {
  private readonly records = new Map<string, NotificationBrokerRecord>();
  private closed = false;
  private closePromise: Promise<void> | null = null;
  private readonly counters: MutableBrokerCounters = {
    acquisitions: 0,
    releases: 0,
    notifications: 0,
    ignoredNotifications: 0,
    queueOverflows: 0,
    fatalFailures: 0,
    roleAuditAttempts: 0,
    roleAuditFailures: 0,
  };

  constructor(
    private readonly queueCapacity = PG_NOTIFICATION_QUEUE_CAPACITY,
    private readonly defaultOperationTimeoutMs = DEFAULT_PG_NOTIFICATION_OPERATION_TIMEOUT_MS
  ) {
    if (!Number.isSafeInteger(queueCapacity) || queueCapacity <= 0) {
      throw new Error(
        'PostgreSQL notification queue capacity must be a positive safe integer'
      );
    }
    assertNotificationOperationTimeoutMs(defaultOperationTimeoutMs);
  }

  async acquireForTests(
    identity: string,
    sourceFactory: ConnectionSourceFactory,
    topics: readonly string[],
    operationTimeoutMs = this.defaultOperationTimeoutMs
  ): Promise<PgNotificationBrokerLease> {
    return this.acquireInternal(
      identity,
      sourceFactory,
      topics,
      null,
      operationTimeoutMs
    );
  }

  /** @internal Exercise production attestation without constructing PgConfig. */
  async acquireAttestedForTests(
    identity: string,
    sourceFactory: ConnectionSourceFactory,
    topics: readonly string[],
    roleContract: PgNotificationRoleContract,
    operationTimeoutMs = this.defaultOperationTimeoutMs
  ): Promise<PgAttestedNotificationBrokerLease> {
    return this.acquireInternal(
      identity,
      sourceFactory,
      topics,
      roleContract,
      operationTimeoutMs
    );
  }

  private async acquireInternal(
    identity: string,
    sourceFactory: ConnectionSourceFactory,
    topics: readonly string[],
    roleContract: PgNotificationRoleContract | null,
    operationTimeoutMs: number
  ): Promise<NotificationBrokerLease> {
    if (this.closed)
      throw new Error('PostgreSQL notification broker registry is closed');
    if (typeof identity !== 'string' || identity.length === 0) {
      throw new Error(
        'PostgreSQL notification broker identity must be a non-empty string'
      );
    }
    const normalizedTopics = normalizeTopics(topics);
    const normalizedOperationTimeoutMs =
      assertNotificationOperationTimeoutMs(operationTimeoutMs);

    for (;;) {
      let record = this.records.get(identity);
      if (!record) {
        const sourcePromise = Promise.resolve(sourceFactory());
        // Acquisition consumes this immediately, but guard the small interval
        // before its serialized operation attaches a rejection handler.
        void sourcePromise.catch(() => {});
        record = new NotificationBrokerRecord(
          identity,
          sourcePromise,
          this.queueCapacity,
          normalizedOperationTimeoutMs,
          this.counters,
          (terminal) => {
            if (this.records.get(identity) === terminal)
              this.records.delete(identity);
          }
        );
        this.records.set(identity, record);
      }
      try {
        const lease = await record.acquire(normalizedTopics, roleContract);
        if (this.closed) {
          await lease.release();
          throw new Error('PostgreSQL notification broker registry is closed');
        }
        return lease;
      } catch (error) {
        if (error instanceof BrokerClosedError && !this.closed) continue;
        // A failed broker remains pinned until every existing owner explicitly
        // releases it. This prevents an acquisition attempt from silently
        // replacing a listener after a possible notification gap.
        await record.closeIfUnused();
        if (error instanceof BrokerClosedError && this.closed) {
          throw new Error('PostgreSQL notification broker registry is closed');
        }
        throw error;
      }
    }
  }

  stats(): PgNotificationBrokerStats {
    let listenerConnections = 0;
    let leases = 0;
    let topics = 0;
    let subscribers = 0;
    for (const record of this.records.values()) {
      const snapshot = record.snapshot;
      listenerConnections += snapshot.listenerConnections;
      leases += snapshot.leases;
      topics += snapshot.topics;
      subscribers += snapshot.subscribers;
    }
    return {
      brokers: this.records.size,
      listenerConnections,
      leases,
      topics,
      subscribers,
      ...this.counters,
    };
  }

  close(): Promise<void> {
    if (this.closePromise) return this.closePromise;
    this.closed = true;
    this.closePromise = (async () => {
      const closeResults = await Promise.allSettled(
        [...this.records.values()].map((record) => record.closeAll())
      );
      this.records.clear();
      const closeErrors = closeResults
        .filter(
          (result): result is PromiseRejectedResult =>
            result.status === 'rejected'
        )
        .map((result) => result.reason);
      if (closeErrors.length === 1) throw closeErrors[0];
      if (closeErrors.length > 1) {
        throw new PgNotificationBrokerFailedError(
          new AggregateError(
            closeErrors,
            'Multiple PostgreSQL notification registries failed to close'
          )
        );
      }
    })();
    return this.closePromise;
  }
}

let brokerRegistry = new PgNotificationBrokerRegistry();
let brokerTeardownTail: Promise<void> = Promise.resolve();

/** Opaque identity over the complete canonical listener pool contract. */
export const getPgNotificationBrokerIdentity = (
  listenerPgConfig: PgNotificationListenerConfig
): string => {
  // The operation deadline is represented by the pool connection timeout in
  // the identity below. Validate it before publishing an apparently usable key.
  getNotificationOperationTimeoutMs(listenerPgConfig);
  const poolIdentity = getPgPoolIdentity(listenerPgConfig, {
    purpose: 'notification-broker',
  });
  return `${PG_NOTIFICATION_BROKER_IDENTITY_VERSION}:${poolIdentity}`;
};

/**
 * Opaque identity for one physical database target, deliberately excluding
 * credentials, TLS policy, pool sizing, and checkout behavior. Those inputs
 * split listener pools, but must not let two active listener contracts silently
 * fragment one database's broker.
 */
export const getPgNotificationDatabaseIdentity = (
  listenerPgConfig: PgNotificationListenerConfig
): string => {
  const targetIdentity = getPgDatabaseTargetIdentity(listenerPgConfig);
  return `${PG_NOTIFICATION_DATABASE_IDENTITY_VERSION}:${targetIdentity}`;
};

/**
 * Acquire a generation lease over one process-local listener. The supplied
 * config must name the dedicated least-privilege notification login; this API
 * never falls back to a request runtime or control-plane credential.
 */
export const acquirePgNotificationBroker = async (
  listenerPgConfig: PgNotificationListenerConfig,
  options: AcquirePgNotificationBrokerOptions
): Promise<PgAttestedNotificationBrokerLease> => {
  const operationTimeoutMs =
    getNotificationOperationTimeoutMs(listenerPgConfig);
  const identity = getPgNotificationBrokerIdentity(listenerPgConfig);
  return brokerRegistry.acquireAttestedForTests(
    identity,
    () => {
      const poolLease = acquirePgPool(listenerPgConfig, {
        purpose: 'notification-broker',
      });
      return {
        connect: () =>
          poolLease.pool.connect() as Promise<PgNotificationClient>,
        release: () => poolLease.release(),
      };
    },
    options.topics,
    {
      role: listenerPgConfig.user,
      database: listenerPgConfig.database,
    },
    operationTimeoutMs
  );
};

export const getPgNotificationBrokerStats = (): PgNotificationBrokerStats =>
  brokerRegistry.stats();

/** Await every UNLISTEN and checked-out connection release, then reset. */
export const teardownPgNotificationBrokers = (): Promise<void> => {
  const closing = brokerRegistry;
  brokerRegistry = new PgNotificationBrokerRegistry();
  const teardown = brokerTeardownTail.then(() => closing.close());
  // A later teardown must wait until this registry has fully drained even when
  // this caller observes a cleanup failure.
  brokerTeardownTail = teardown.then(
    (): void => undefined,
    (): void => undefined
  );
  return teardown;
};
