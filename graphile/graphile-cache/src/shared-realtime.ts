import {
  ActivatableGenerationScopedRealtimeSubscriber,
  type RealtimeTopicCollector
} from 'graphile-realtime-subscriptions';
import {
  acquirePgNotificationBroker,
  getPgNotificationBrokerIdentity,
  getPgNotificationBrokerStats,
  getPgNotificationDatabaseIdentity,
  PG_NOTIFICATION_LEASE_RELEASED_ERROR_CODE,
  type PgAttestedNotificationBrokerLease,
  type PgNotificationListenerConfig,
  type PgNotificationRoleAudit
} from 'pg-cache';

export const GRAPHILE_SHARED_REALTIME_IDENTITY_ERROR_CODE =
  'GRAPHILE_SHARED_REALTIME_IDENTITY_MISMATCH';
export const GRAPHILE_SHARED_REALTIME_DATABASE_CONFLICT_ERROR_CODE =
  'GRAPHILE_SHARED_REALTIME_DATABASE_CONFLICT';

export class GraphileSharedRealtimeIdentityError extends Error {
  readonly code = GRAPHILE_SHARED_REALTIME_IDENTITY_ERROR_CODE;

  constructor() {
    super('Shared realtime listener identity does not match its connection contract');
    this.name = 'GraphileSharedRealtimeIdentityError';
  }
}

export class GraphileSharedRealtimeDatabaseConflictError extends Error {
  readonly code = GRAPHILE_SHARED_REALTIME_DATABASE_CONFLICT_ERROR_CODE;

  constructor(database: string) {
    super(
      `Physical database ${JSON.stringify(database)} already has a different active `
      + 'shared realtime listener contract'
    );
    this.name = 'GraphileSharedRealtimeDatabaseConflictError';
  }
}

export interface GraphileRealtimeRoleAttestationSnapshot {
  readonly version: 1;
  readonly mode: 'shared-exact';
  readonly listenerIdentity: string;
  readonly auditVersion: string;
  readonly role: string;
  readonly database: string;
  readonly lastAttestedAt: number;
  readonly validUntil: number;
  readonly checks: number;
  readonly status: 'healthy' | 'failed';
  readonly failureCode: string | null;
  readonly failedAt: number | null;
}

export interface GraphileRealtimeRoleAttestation {
  snapshot(): Readonly<GraphileRealtimeRoleAttestationSnapshot>;
  /** Re-audit once this generation's explicit validity window has elapsed. */
  revalidateIfDue(): Promise<boolean>;
  release(): void;
}

interface SharedAttestationRecord {
  readonly identity: string;
  readonly role: string;
  readonly database: string;
  audit: PgNotificationRoleAudit;
  lastAttestedAt: number;
  revalidationMs: number;
  checks: number;
  refreshPromise: Promise<boolean> | null;
  refreshTimer: ReturnType<typeof setTimeout> | null;
  failure: { code: string | null; failedAt: number } | null;
  bindings: Set<SharedAttestationBinding>;
}

interface SharedAttestationBinding {
  readonly revalidationMs: number;
  readonly onFailure: (error: Error) => void;
  readonly revalidateRole: () => Promise<PgNotificationRoleAudit>;
}

interface ActiveDatabaseListenerContract {
  readonly listenerIdentity: string;
  readonly role: string;
  references: number;
}

const attestationRecords = new Map<string, SharedAttestationRecord>();
const activeDatabaseListenerContracts = new Map<
string,
ActiveDatabaseListenerContract
>();
let databaseConfigurationConflicts = 0;

export interface GraphileRealtimeRoleAuditStats {
  readonly identities: number;
  readonly healthy: number;
  readonly failed: number;
  readonly stale: number;
  readonly activeIdentityAuditAttempts: number;
  readonly catalogAuditAttempts: number;
  readonly catalogAuditFailures: number;
  readonly activeDatabaseTargets: number;
  readonly databaseConfigurationConflicts: number;
  readonly oldestLastAttestedAt: number | null;
}

/** Process-level unique identity counts plus monotonic catalog-audit counters. */
export const getGraphileRealtimeRoleAuditStats = (
  now = Date.now()
): Readonly<GraphileRealtimeRoleAuditStats> => {
  const records = [...attestationRecords.values()];
  const brokerStats = getPgNotificationBrokerStats();
  return Object.freeze({
    identities: records.length,
    healthy: records.filter(({ failure }) => !failure).length,
    failed: records.filter(({ failure }) => Boolean(failure)).length,
    stale: records.filter(
      ({ lastAttestedAt, revalidationMs }) => now >= lastAttestedAt + revalidationMs
    ).length,
    activeIdentityAuditAttempts: records.reduce(
      (sum, { checks }) => sum + checks,
      0
    ),
    catalogAuditAttempts: brokerStats.roleAuditAttempts,
    catalogAuditFailures: brokerStats.roleAuditFailures,
    activeDatabaseTargets: activeDatabaseListenerContracts.size,
    databaseConfigurationConflicts,
    oldestLastAttestedAt: records.length === 0
      ? null
      : Math.min(...records.map(({ lastAttestedAt }) => lastAttestedAt))
  });
};

const errorCode = (error: unknown): string | null => {
  if (!error || typeof error !== 'object') return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' && code.length > 0 ? code : null;
};

const reserveDatabaseListenerContract = (options: {
  databaseIdentity: string;
  listenerIdentity: string;
  role: string;
  database: string;
}): (() => void) => {
  const { databaseIdentity, listenerIdentity, role, database } = options;
  let record = activeDatabaseListenerContracts.get(databaseIdentity);
  if (
    record
    && (record.listenerIdentity !== listenerIdentity || record.role !== role)
  ) {
    databaseConfigurationConflicts++;
    throw new GraphileSharedRealtimeDatabaseConflictError(database);
  }
  if (record) {
    record.references++;
  } else {
    record = { listenerIdentity, role, references: 1 };
    activeDatabaseListenerContracts.set(databaseIdentity, record);
  }
  let released = false;
  return (): void => {
    if (released) return;
    released = true;
    record!.references--;
    if (
      record!.references === 0
      && activeDatabaseListenerContracts.get(databaseIdentity) === record
    ) {
      activeDatabaseListenerContracts.delete(databaseIdentity);
    }
  };
};

const withDatabaseContractReservation = (
  source: PgAttestedNotificationBrokerLease,
  releaseReservation: () => void
): PgAttestedNotificationBrokerLease => {
  let releasePromise: Promise<void> | null = null;
  return Object.freeze({
    identity: source.identity,
    topics: source.topics,
    terminated: source.terminated,
    get roleAudit(): PgNotificationRoleAudit {
      return source.roleAudit;
    },
    revalidateRole(): Promise<PgNotificationRoleAudit> {
      return source.revalidateRole();
    },
    subscribe(topic: string): AsyncIterableIterator<string> {
      return source.subscribe(topic);
    },
    release(): Promise<void> {
      if (releasePromise) return releasePromise;
      releasePromise = (async () => {
        try {
          await source.release();
        } finally {
          releaseReservation();
        }
      })();
      return releasePromise;
    }
  });
};

const MAX_TIMER_DELAY_MS = 2_147_483_647;

const clearRefreshTimer = (record: SharedAttestationRecord): void => {
  if (!record.refreshTimer) return;
  clearTimeout(record.refreshTimer);
  record.refreshTimer = null;
};

function scheduleRefresh(record: SharedAttestationRecord): void {
  clearRefreshTimer(record);
  if (record.failure || record.bindings.size === 0) return;
  const dueAt = record.lastAttestedAt + record.revalidationMs;
  const delay = Math.max(
    0,
    Math.min(MAX_TIMER_DELAY_MS, dueAt - Date.now())
  );
  record.refreshTimer = setTimeout(() => {
    record.refreshTimer = null;
    if (record.failure || record.bindings.size === 0) return;
    // Very large TTLs are scheduled in safe setTimeout-sized chunks.
    if (Date.now() < record.lastAttestedAt + record.revalidationMs) {
      scheduleRefresh(record);
      return;
    }
    void refreshRecord(record);
  }, delay);
  record.refreshTimer.unref?.();
}

const revalidateWithActiveBinding = async (
  record: SharedAttestationRecord
): Promise<PgNotificationRoleAudit> => {
  const attempted = new Set<SharedAttestationBinding>();
  for (;;) {
    const binding = [...record.bindings].find((candidate) => !attempted.has(candidate));
    if (!binding) {
      throw new Error('Shared realtime role attestation has no active broker lease');
    }
    attempted.add(binding);
    try {
      return await binding.revalidateRole();
    } catch (error) {
      if (
        errorCode(error) === PG_NOTIFICATION_LEASE_RELEASED_ERROR_CODE
        && !record.bindings.has(binding)
      ) {
        continue;
      }
      throw error;
    }
  }
};

function refreshRecord(record: SharedAttestationRecord): Promise<boolean> {
  if (record.failure) return Promise.resolve(false);
  if (record.refreshPromise) return record.refreshPromise;
  record.checks++;
  const pending = (async (): Promise<boolean> => {
    try {
      const audit = await revalidateWithActiveBinding(record);
      record.audit = audit;
      record.lastAttestedAt = Date.now();
      return true;
    } catch (reason) {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      record.failure = {
        code: errorCode(error),
        failedAt: Date.now()
      };
      clearRefreshTimer(record);
      for (const binding of [...record.bindings]) {
        try {
          binding.onFailure(error);
        } catch {
          // Every observer is advisory; the failed record remains latched.
        }
      }
      return false;
    }
  })();
  record.refreshPromise = pending;
  void pending.then(() => {
    if (record.refreshPromise === pending) record.refreshPromise = null;
    if (record.bindings.size === 0) {
      clearRefreshTimer(record);
      if (attestationRecords.get(record.identity) === record) {
        attestationRecords.delete(record.identity);
      }
    } else if (!record.failure) {
      scheduleRefresh(record);
    }
  });
  return pending;
}

const registerAttestation = (options: {
  identity: string;
  audit: PgNotificationRoleAudit;
  attestedAt: number;
  revalidationMs: number;
  onFailure(error: Error): void;
  revalidateRole(): Promise<PgNotificationRoleAudit>;
}): GraphileRealtimeRoleAttestation => {
  const {
    identity,
    audit,
    attestedAt,
    revalidationMs,
    onFailure,
    revalidateRole
  } = options;
  let record = attestationRecords.get(identity);
  if (!record) {
    record = {
      identity,
      role: audit.role,
      database: audit.database,
      audit,
      lastAttestedAt: attestedAt,
      revalidationMs,
      checks: 1,
      refreshPromise: null,
      refreshTimer: null,
      failure: null,
      bindings: new Set()
    };
    attestationRecords.set(identity, record);
  } else {
    // Broker identity covers credentials, database, pool, TLS, and driver.
    // A freshly successful acquisition audit supersedes older provenance.
    record.audit = audit;
    record.lastAttestedAt = attestedAt;
    record.checks++;
    record.failure = null;
  }
  const binding: SharedAttestationBinding = {
    revalidationMs,
    onFailure,
    revalidateRole
  };
  record.bindings.add(binding);
  record.revalidationMs = Math.min(
    ...[...record.bindings].map((active) => active.revalidationMs)
  );
  scheduleRefresh(record);
  let released = false;

  return Object.freeze({
    snapshot(): Readonly<GraphileRealtimeRoleAttestationSnapshot> {
      const failure = record!.failure;
      return Object.freeze({
        version: 1,
        mode: 'shared-exact',
        listenerIdentity: identity,
        auditVersion: record!.audit.version,
        role: record!.role,
        database: record!.database,
        lastAttestedAt: record!.lastAttestedAt,
        validUntil: record!.lastAttestedAt + revalidationMs,
        checks: record!.checks,
        status: failure ? 'failed' : 'healthy',
        failureCode: failure?.code ?? null,
        failedAt: failure?.failedAt ?? null
      });
    },
    async revalidateIfDue(): Promise<boolean> {
      if (released || record!.failure) return false;
      if (Date.now() < record!.lastAttestedAt + revalidationMs) return true;
      return refreshRecord(record!);
    },
    release(): void {
      if (released) return;
      released = true;
      record!.bindings.delete(binding);
      if (record!.bindings.size === 0) {
        clearRefreshTimer(record!);
        if (!record!.refreshPromise) attestationRecords.delete(identity);
      } else {
        record!.revalidationMs = Math.min(
          ...[...record!.bindings].map((active) => active.revalidationMs)
        );
        scheduleRefresh(record!);
      }
    }
  });
};

export interface ActivateGraphileSharedRealtimeOptions {
  subscriber: ActivatableGenerationScopedRealtimeSubscriber;
  topicCollector: RealtimeTopicCollector;
  listenerPgConfig: PgNotificationListenerConfig;
  listenerIdentity: string;
  allowedSourceSchemas: readonly string[];
  roleRevalidationMs: number;
  onFatalError(error: Error): void;
}

/**
 * Cross the shared-listener publication boundary. Topic validation and a fresh
 * role audit finish before the broker lease is installed into PostGraphile.
 */
export const activateGraphileSharedRealtime = async (
  options: ActivateGraphileSharedRealtimeOptions
): Promise<GraphileRealtimeRoleAttestation> => {
  const {
    subscriber,
    topicCollector,
    listenerPgConfig,
    listenerIdentity,
    allowedSourceSchemas,
    roleRevalidationMs,
    onFatalError
  } = options;
  const expectedIdentity = getPgNotificationBrokerIdentity(listenerPgConfig);
  if (expectedIdentity !== listenerIdentity) {
    throw new GraphileSharedRealtimeIdentityError();
  }
  if (!Number.isSafeInteger(roleRevalidationMs) || roleRevalidationMs <= 0) {
    throw new Error('Shared realtime role revalidation interval must be positive');
  }
  const topics = topicCollector.exactTopics(allowedSourceSchemas);
  const role = listenerPgConfig.user;
  const database = listenerPgConfig.database;
  const databaseIdentity = getPgNotificationDatabaseIdentity(listenerPgConfig);
  const releaseDatabaseReservation = reserveDatabaseListenerContract({
    databaseIdentity,
    listenerIdentity,
    role,
    database
  });

  // This audit is intentionally fresh for every generation acquisition. The
  // role may have drifted since an older generation joined the same broker.
  let brokerLease: Awaited<ReturnType<typeof acquirePgNotificationBroker>>;
  try {
    // Broker admission serializes this generation's fresh role audit and LISTEN
    // on the same pinned client, which remains safe with pool max=1.
    brokerLease = await acquirePgNotificationBroker(listenerPgConfig, { topics });
  } catch (error) {
    releaseDatabaseReservation();
    throw error;
  }

  const reservedBrokerLease = withDatabaseContractReservation(
    brokerLease,
    releaseDatabaseReservation
  );

  const reportBrokerTermination = (failure: Error): void => {
    try {
      onFatalError(failure);
    } catch {
      // The subscriber still fails all streams even if an observer throws.
    }
  };
  void reservedBrokerLease.terminated.then((failure) => {
    if (failure) reportBrokerTermination(failure);
  });

  try {
    await subscriber.activate({
      source: reservedBrokerLease,
      allowedTopics: topics
    });
  } catch (error) {
    try {
      await reservedBrokerLease.release();
    } catch {
      // Preserve the activation failure; reservation release runs in finally.
    }
    throw error;
  }
  return registerAttestation({
    identity: listenerIdentity,
    audit: reservedBrokerLease.roleAudit,
    attestedAt: Date.now(),
    revalidationMs: roleRevalidationMs,
    onFailure: reportBrokerTermination,
    revalidateRole: () => reservedBrokerLease.revalidateRole()
  });
};
