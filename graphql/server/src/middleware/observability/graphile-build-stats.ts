export interface GraphileBuildEvent {
  type: 'start' | 'success' | 'failure';
  cacheKey: string;
  serviceKey: string | null;
  databaseId: string | null;
  durationMs?: number;
  error?: string;
  timestamp: string;
}

interface GraphileBuildAggregate {
  count: number;
  totalMs: number;
  maxMs: number;
  lastMs: number;
  lastAt: string | null;
}

interface GraphileBuildContext {
  cacheKey: string;
  serviceKey: string | null;
  databaseId: string | null;
}

const MAX_BUILD_EVENTS = 100;
const MAX_AGGREGATE_KEYS = 100;

const buildStats = {
  started: 0,
  succeeded: 0,
  failed: 0,
  totalMs: 0,
  maxMs: 0,
  lastMs: 0,
  lastKey: null as string | null,
  lastStartedAt: null as string | null,
  lastFinishedAt: null as string | null,
  lastError: null as string | null,
  lastServiceKey: null as string | null,
  lastDatabaseId: null as string | null,
  recentEvents: [] as GraphileBuildEvent[],
  byServiceKey: new Map<string, GraphileBuildAggregate>(),
};

const pushBuildEvent = (event: GraphileBuildEvent): void => {
  buildStats.recentEvents.push(event);
  if (buildStats.recentEvents.length > MAX_BUILD_EVENTS) {
    buildStats.recentEvents.splice(0, buildStats.recentEvents.length - MAX_BUILD_EVENTS);
  }
};

const updateAggregate = (
  map: Map<string, GraphileBuildAggregate>,
  key: string,
  durationMs: number,
): void => {
  const hasKey = map.has(key);
  if (!hasKey && map.size >= MAX_AGGREGATE_KEYS) {
    const oldestKey = map.keys().next().value;
    if (oldestKey) {
      map.delete(oldestKey);
    }
  }

  const current = map.get(key) ?? {
    count: 0,
    totalMs: 0,
    maxMs: 0,
    lastMs: 0,
    lastAt: null,
  };

  current.count += 1;
  current.totalMs += durationMs;
  current.maxMs = Math.max(current.maxMs, durationMs);
  current.lastMs = durationMs;
  current.lastAt = new Date().toISOString();

  // Keep LRU order by reinserting after each update.
  if (hasKey) {
    map.delete(key);
  }
  map.set(key, current);
};

const recordBuildStart = (context: GraphileBuildContext, startedAt: number): void => {
  buildStats.started += 1;
  buildStats.lastKey = context.cacheKey;
  buildStats.lastStartedAt = new Date(startedAt).toISOString();
  buildStats.lastServiceKey = context.serviceKey;
  buildStats.lastDatabaseId = context.databaseId;

  pushBuildEvent({
    type: 'start',
    cacheKey: context.cacheKey,
    serviceKey: context.serviceKey,
    databaseId: context.databaseId,
    timestamp: new Date(startedAt).toISOString(),
  });
};

const recordBuildSuccess = (context: GraphileBuildContext, startedAt: number): void => {
  const durationMs = Date.now() - startedAt;

  buildStats.succeeded += 1;
  buildStats.totalMs += durationMs;
  buildStats.maxMs = Math.max(buildStats.maxMs, durationMs);
  buildStats.lastMs = durationMs;
  buildStats.lastFinishedAt = new Date().toISOString();
  buildStats.lastError = null;
  buildStats.lastServiceKey = context.serviceKey;
  buildStats.lastDatabaseId = context.databaseId;

  if (context.serviceKey) {
    updateAggregate(buildStats.byServiceKey, context.serviceKey, durationMs);
  }

  pushBuildEvent({
    type: 'success',
    cacheKey: context.cacheKey,
    serviceKey: context.serviceKey,
    databaseId: context.databaseId,
    durationMs,
    timestamp: new Date().toISOString(),
  });
};

const recordBuildFailure = (
  context: GraphileBuildContext,
  startedAt: number,
  error: unknown,
): void => {
  const durationMs = Date.now() - startedAt;

  buildStats.failed += 1;
  buildStats.totalMs += durationMs;
  buildStats.maxMs = Math.max(buildStats.maxMs, durationMs);
  buildStats.lastMs = durationMs;
  buildStats.lastFinishedAt = new Date().toISOString();
  buildStats.lastError = error instanceof Error ? error.message : String(error);
  buildStats.lastServiceKey = context.serviceKey;
  buildStats.lastDatabaseId = context.databaseId;

  pushBuildEvent({
    type: 'failure',
    cacheKey: context.cacheKey,
    serviceKey: context.serviceKey,
    databaseId: context.databaseId,
    durationMs,
    error: error instanceof Error ? error.message : String(error),
    timestamp: new Date().toISOString(),
  });
};

export const observeGraphileBuild = async <T>(
  context: GraphileBuildContext,
  fn: () => Promise<T>,
  opts: { enabled: boolean },
): Promise<T> => {
  if (!opts.enabled) {
    return fn();
  }

  const startedAt = Date.now();
  recordBuildStart(context, startedAt);

  try {
    const result = await fn();
    recordBuildSuccess(context, startedAt);
    return result;
  } catch (error) {
    recordBuildFailure(context, startedAt, error);
    throw error;
  }
};

export const resetGraphileBuildStats = (): void => {
  buildStats.started = 0;
  buildStats.succeeded = 0;
  buildStats.failed = 0;
  buildStats.totalMs = 0;
  buildStats.maxMs = 0;
  buildStats.lastMs = 0;
  buildStats.lastKey = null;
  buildStats.lastStartedAt = null;
  buildStats.lastFinishedAt = null;
  buildStats.lastError = null;
  buildStats.lastServiceKey = null;
  buildStats.lastDatabaseId = null;
  buildStats.recentEvents = [];
  buildStats.byServiceKey.clear();
};

export function getGraphileBuildStats(): {
  started: number;
  succeeded: number;
  failed: number;
  totalMs: number;
  maxMs: number;
  lastMs: number;
  averageMs: number;
  lastKey: string | null;
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  lastError: string | null;
  lastServiceKey: string | null;
  lastDatabaseId: string | null;
  recentEvents: GraphileBuildEvent[];
  byServiceKey: Record<string, GraphileBuildAggregate & { averageMs: number }>;
} {
  const completed = buildStats.succeeded + buildStats.failed;
  const withAverages = (map: Map<string, GraphileBuildAggregate>) =>
    Object.fromEntries(
      [...map.entries()].map(([key, value]) => [
        key,
        {
          ...value,
          averageMs: value.count > 0 ? value.totalMs / value.count : 0,
        },
      ]),
    );

  return {
    started: buildStats.started,
    succeeded: buildStats.succeeded,
    failed: buildStats.failed,
    totalMs: buildStats.totalMs,
    maxMs: buildStats.maxMs,
    lastMs: buildStats.lastMs,
    averageMs: completed > 0 ? buildStats.totalMs / completed : 0,
    lastKey: buildStats.lastKey,
    lastStartedAt: buildStats.lastStartedAt,
    lastFinishedAt: buildStats.lastFinishedAt,
    lastError: buildStats.lastError,
    lastServiceKey: buildStats.lastServiceKey,
    lastDatabaseId: buildStats.lastDatabaseId,
    recentEvents: [...buildStats.recentEvents],
    byServiceKey: withAverages(buildStats.byServiceKey),
  };
}
