import { createHash, randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

import { createClient } from 'graphql-ws';
import { WebSocket } from 'ws';

import { jsonPointerValues, mapWithConcurrency } from './http';
import { summarizeRealtimeReceiptEvidence } from './realtime-evidence';
import type {
  GraphqlSurface,
  JsonPathMatch,
  RealtimeCorrelationReceipt,
  RealtimeDeliveryCoverage,
  RealtimeGraphqlOperation,
  TenantTarget
} from './types';

interface RealtimeSink {
  next(value: any): void;
  error(error: unknown): void;
  complete(): void;
}

interface DriverRealtimeClient {
  subscribe(
    payload: { query: string; variables?: Record<string, unknown> },
    sink: RealtimeSink
  ): () => void;
  dispose(): Promise<void>;
}

export interface RealtimeClientFactoryInput {
  url: string;
  headers: Readonly<Record<string, string>>;
  onConnected(): void;
  onClosed(): void;
  onError(): void;
}

export type RealtimeClientFactory = (
  input: RealtimeClientFactoryInput
) => DriverRealtimeClient;

export interface RealtimeDriverDependencies {
  clientFactory?: RealtimeClientFactory;
  fetch?: typeof fetch;
  environment?: Readonly<Record<string, string | undefined>>;
  sleep?: (ms: number) => Promise<void>;
  correlationFactory?: (surfaceKey: string, sequence: number) => string;
}

export interface RealtimeDriverOptions {
  concurrency: number;
  timeoutMs: number;
  deliveryIntervalMs?: number;
}

export interface RealtimeDriverSnapshot {
  expected: number;
  active: number;
  verified: number;
  deliveryIntervalMs: number;
  deliveryEvents: number;
  deliveryRoundsStarted: number;
  deliveryRoundsVerified: number;
  deliveryRoundsPending: number;
  timedCoverage: RealtimeDeliveryCoverage | null;
  errors: string[];
  surfaces: Array<{
    tenantId: string;
    surface: string;
    route: string;
    active: boolean;
    verified: boolean;
    deliveryEvents: number;
    deliveryRoundsStarted: number;
    deliveryRoundsVerified: number;
    deliveryRoundPending: boolean;
    timedRoundsExpected: number;
    timedRoundsStarted: number;
    timedRoundsVerified: number;
    timedRoundsDeadlineLate: number;
    correlationReceipts: RealtimeCorrelationReceipt[];
  }>;
}

interface RealtimeTargetState {
  tenantId: string;
  surface: GraphqlSurface;
  key: string;
  route: string;
  active: boolean;
  verified: boolean;
  deliveryEvents: number;
  deliveryRoundsStarted: number;
  deliveryRoundsVerified: number;
  deliveryRoundPending: boolean;
  timedRoundsExpected: number;
  timedRoundsStarted: number;
  timedRoundsVerified: number;
  timedRoundsDeadlineLate: number;
  correlationSequence: number;
  pendingCorrelation: {
    value: string;
    sha256: string;
    receipt: RealtimeCorrelationReceipt;
  } | null;
  correlationReceipts: RealtimeCorrelationReceipt[];
  client: DriverRealtimeClient | null;
  unsubscribe: (() => void) | null;
  errors: Set<string>;
}

const DEFAULT_SLEEP = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
const DEFAULT_DELIVERY_INTERVAL_MS = 60_000;

const matches = (body: unknown, match: JsonPathMatch): boolean =>
  jsonPointerValues(body, match.path).some((value) =>
    isDeepStrictEqual(value, match.value)
  );

const exactCorrelationValue = (
  body: unknown,
  path: string,
  expected: string
): string | null => {
  const selected = jsonPointerValues(body, path);
  return selected.length === 1
    && typeof selected[0] === 'string'
    && isDeepStrictEqual(selected[0], expected)
    ? selected[0]
    : null;
};

const firstForbiddenMatch = (
  body: unknown,
  operation: RealtimeGraphqlOperation
): JsonPathMatch | undefined => operation.forbiddenMatches.find((match) =>
  matches(body, match)
);

const firstMissingMatch = (
  body: unknown,
  operation: RealtimeGraphqlOperation
): JsonPathMatch | undefined => operation.requiredMatches.find((match) =>
  !matches(body, match)
);

export const realtimeWebSocketUrl = (surfaceUrl: string): string => {
  const parsed = new URL(surfaceUrl);
  if (
    !['http:', 'https:'].includes(parsed.protocol)
    || parsed.username
    || parsed.password
    || parsed.search
    || parsed.hash
  ) {
    throw new Error('CPERF_REALTIME_SURFACE_URL_INVALID');
  }
  parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
  return parsed.toString();
};

const surfaceRoute = (surfaceUrl: string): string => {
  const parsed = new URL(surfaceUrl);
  return parsed.pathname;
};

export const realtimeHeaders = (
  surface: GraphqlSurface,
  environment: Readonly<Record<string, string | undefined>> = process.env
): Record<string, string> => {
  const headers: Record<string, string> = { ...(surface.headers ?? {}) };
  for (const [name, environmentName] of Object.entries(
    surface.realtime?.headersFromEnvironment ?? {}
  )) {
    const value = environment[environmentName];
    if (!value) {
      throw new Error(
        `CPERF_REALTIME_HEADER_ENV_MISSING:${surface.name}:${environmentName}`
      );
    }
    headers[name] = value;
  }
  return headers;
};

const defaultClientFactory: RealtimeClientFactory = ({
  url,
  headers,
  onConnected,
  onClosed,
  onError
}) => {
  class HeaderWebSocket extends WebSocket {
    constructor(address: string | URL, protocols?: string | string[]) {
      super(address, protocols, { headers });
    }
  }
  const client = createClient({
    url,
    webSocketImpl: HeaderWebSocket,
    retryAttempts: 0,
    connectionAckWaitTimeout: 10_000,
    on: {
      connected: onConnected,
      closed: onClosed,
      error: onError
    }
  });
  return {
    subscribe: (payload, sink) => client.subscribe(payload, sink),
    dispose: async () => { await client.dispose(); }
  };
};

const stateFailure = (state: RealtimeTargetState): string | null =>
  state.errors.values().next().value ?? null;

export interface RealtimeDriver {
  startAndVerify(): Promise<void>;
  beginTimedCoverage(durationMs: number): void;
  finishTimedCoverage(): Promise<RealtimeDeliveryCoverage>;
  verifyDeliveryNow(): Promise<void>;
  assertHealthy(): void;
  snapshot(): RealtimeDriverSnapshot;
  dispose(): Promise<void>;
}

export const createRealtimeDriver = (
  tenants: TenantTarget[],
  options: RealtimeDriverOptions,
  dependencies: RealtimeDriverDependencies = {}
): RealtimeDriver => {
  if (!Number.isSafeInteger(options.concurrency) || options.concurrency <= 0) {
    throw new Error('CPERF_REALTIME_CONCURRENCY_INVALID');
  }
  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0) {
    throw new Error('CPERF_REALTIME_TIMEOUT_INVALID');
  }
  const deliveryIntervalMs = options.deliveryIntervalMs
    ?? DEFAULT_DELIVERY_INTERVAL_MS;
  if (
    !Number.isSafeInteger(deliveryIntervalMs)
    || deliveryIntervalMs <= 0
  ) {
    throw new Error('CPERF_REALTIME_DELIVERY_INTERVAL_INVALID');
  }
  const clientFactory = dependencies.clientFactory ?? defaultClientFactory;
  const fetchImpl = dependencies.fetch ?? fetch;
  const environment = dependencies.environment ?? process.env;
  const sleep = dependencies.sleep ?? DEFAULT_SLEEP;
  const correlationFactory = dependencies.correlationFactory
    ?? ((_surfaceKey: string, sequence: number) =>
      `cperf-realtime-v1:${sequence}:${randomUUID()}`);
  const states: RealtimeTargetState[] = tenants.flatMap((tenant) =>
    tenant.surfaces.filter((surface) => surface.realtime).map(
      (surface): RealtimeTargetState => ({
        tenantId: tenant.id,
        surface,
        key: `${tenant.id}/${surface.name}`,
        route: surfaceRoute(surface.url),
        active: false,
        verified: false,
        deliveryEvents: 0,
        deliveryRoundsStarted: 0,
        deliveryRoundsVerified: 0,
        deliveryRoundPending: false,
        timedRoundsExpected: 0,
        timedRoundsStarted: 0,
        timedRoundsVerified: 0,
        timedRoundsDeadlineLate: 0,
        correlationSequence: 0,
        pendingCorrelation: null,
        correlationReceipts: [],
        client: null,
        unsubscribe: null,
        errors: new Set<string>()
      })
    )
  );
  let started = false;
  let disposing = false;
  let disposed = false;
  let deliveryTimer: ReturnType<typeof setTimeout> | null = null;
  let deliveryRound: Promise<void> | null = null;
  let timedCoverage: {
    startedAtMs: number;
    deadlineAtMs: number;
    endedAtMs: number | null;
    expectedRounds: number;
    nextRound: number;
  } | null = null;
  const primeAbortControllers = new Set<AbortController>();
  const issuedCorrelations = new Set<string>();

  const recordError = (state: RealtimeTargetState, code: string): void => {
    if (!disposing) state.errors.add(`${code}:${state.key}`);
  };

  const assertState = (state: RealtimeTargetState): void => {
    const failure = stateFailure(state);
    if (failure) throw new Error(failure);
  };

  const waitUntil = async (
    state: RealtimeTargetState,
    predicate: () => boolean,
    deadline: number,
    timeoutCode: string
  ): Promise<void> => {
    while (!predicate() && Date.now() < deadline) {
      if (disposing || disposed) throw new Error('CPERF_REALTIME_DISPOSED');
      assertState(state);
      await sleep(Math.min(25, Math.max(1, deadline - Date.now())));
    }
    assertState(state);
    if (!predicate()) throw new Error(`${timeoutCode}:${state.key}`);
  };

  const startState = async (state: RealtimeTargetState): Promise<void> => {
    const probe = state.surface.realtime!;
    const headers = realtimeHeaders(state.surface, environment);
    state.client = clientFactory({
      url: realtimeWebSocketUrl(state.surface.url),
      headers,
      onConnected: () => { state.active = true; },
      onClosed: () => {
        state.active = false;
        recordError(state, 'CPERF_REALTIME_TRANSPORT_DROPPED');
      },
      onError: () => recordError(state, 'CPERF_REALTIME_TRANSPORT_ERROR')
    });
    state.unsubscribe = state.client.subscribe(
      { query: probe.subscription.query, variables: probe.subscription.variables },
      {
        next: (value) => {
          if (Array.isArray(value?.errors) && value.errors.length > 0) {
            recordError(state, 'CPERF_REALTIME_GRAPHQL_ERROR');
            return;
          }
          if (firstForbiddenMatch(value, probe.subscription)) {
            recordError(state, 'CPERF_REALTIME_FOREIGN_PAYLOAD');
            return;
          }
          if (firstMissingMatch(value, probe.subscription)) {
            recordError(state, 'CPERF_REALTIME_EVENT_INVARIANT_FAILED');
            return;
          }
          const pending = state.pendingCorrelation;
          const verifiedCorrelation = pending && exactCorrelationValue(
            value,
            probe.correlation.subscriptionEventPath,
            pending.value
          );
          if (!pending || !verifiedCorrelation) {
            // Cursor-backed delivery is at-least-once, so a valid replay for
            // this exact tenant/database may arrive before the event caused by
            // this round's fresh nonce. Permanent identity violations above
            // still fail closed, but an old event cannot satisfy this round.
            return;
          }
          pending.receipt.eventAt = new Date().toISOString();
          pending.receipt.eventSha256 = createHash('sha256')
            .update(verifiedCorrelation)
            .digest('hex');
          state.pendingCorrelation = null;
          state.deliveryEvents++;
          state.verified = true;
        },
        error: () => recordError(state, 'CPERF_REALTIME_GRAPHQL_ERROR'),
        complete: () => recordError(state, 'CPERF_REALTIME_SUBSCRIPTION_ENDED')
      }
    );
    await waitUntil(
      state,
      () => state.active,
      Date.now() + options.timeoutMs,
      'CPERF_REALTIME_CONNECT_TIMEOUT'
    );
  };

  const primeOnce = async (
    state: RealtimeTargetState,
    deadline: number,
    correlation: string,
    receipt: RealtimeCorrelationReceipt
  ): Promise<void> => {
    const probe = state.surface.realtime!;
    const controller = new AbortController();
    primeAbortControllers.add(controller);
    const timeout = setTimeout(
      () => controller.abort(),
      Math.max(1, deadline - Date.now())
    );
    try {
      const response = await fetchImpl(state.surface.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...realtimeHeaders(state.surface, environment)
        },
        body: JSON.stringify({
          query: probe.prime.query,
          variables: {
            ...(probe.prime.variables ?? {}),
            [probe.correlation.primeVariable]: correlation
          }
        }),
        signal: controller.signal
      });
      const body = await response.json().catch((): null => null);
      if (!response.ok || Array.isArray((body as any)?.errors)) {
        throw new Error(`CPERF_REALTIME_PRIME_FAILED:${state.key}:HTTP_${response.status}`);
      }
      if (firstForbiddenMatch(body, probe.prime)) {
        throw new Error(`CPERF_REALTIME_PRIME_FOREIGN_PAYLOAD:${state.key}`);
      }
      if (firstMissingMatch(body, probe.prime)) {
        throw new Error(`CPERF_REALTIME_PRIME_INCONCLUSIVE:${state.key}`);
      }
      const responseCorrelation = exactCorrelationValue(
        body,
        probe.correlation.primeResponsePath,
        correlation
      );
      if (!responseCorrelation) {
        throw new Error(`CPERF_REALTIME_PRIME_CORRELATION_MISMATCH:${state.key}`);
      }
      if (receipt.primeResponseAt == null) {
        receipt.primeResponseAt = new Date().toISOString();
        receipt.primeResponseSha256 = createHash('sha256')
          .update(responseCorrelation)
          .digest('hex');
      }
    } finally {
      clearTimeout(timeout);
      primeAbortControllers.delete(controller);
    }
  };

  const verifyStateDelivery = async (
    state: RealtimeTargetState,
    deadline = Date.now() + options.timeoutMs,
    timed = false
  ): Promise<void> => {
    const requiredEventCount = state.deliveryEvents + 1;
    const correlation = correlationFactory(state.key, ++state.correlationSequence);
    if (
      typeof correlation !== 'string'
      || correlation.length < 24
      || correlation.length > 1024
    ) {
      throw new Error(`CPERF_REALTIME_CORRELATION_INVALID:${state.key}`);
    }
    const correlationSha256 = createHash('sha256').update(correlation).digest('hex');
    if (issuedCorrelations.has(correlationSha256)) {
      throw new Error(`CPERF_REALTIME_CORRELATION_REUSED:${state.key}`);
    }
    issuedCorrelations.add(correlationSha256);
    const receipt: RealtimeCorrelationReceipt = {
      sequence: state.correlationSequence,
      timed,
      deadlineAt: new Date(deadline).toISOString(),
      issuedAt: new Date().toISOString(),
      issuedSha256: correlationSha256,
      primeResponseAt: null,
      primeResponseSha256: null,
      eventAt: null,
      eventSha256: null
    };
    state.correlationReceipts.push(receipt);
    state.pendingCorrelation = {
      value: correlation,
      sha256: correlationSha256,
      receipt
    };
    state.deliveryRoundsStarted++;
    if (timed) state.timedRoundsStarted++;
    state.deliveryRoundPending = true;
    try {
      assertState(state);
      await primeOnce(state, deadline, correlation, receipt);
      await waitUntil(
        state,
        () => state.deliveryEvents >= requiredEventCount,
        deadline,
        'CPERF_REALTIME_EVENT_TIMEOUT'
      );
      state.deliveryRoundsVerified++;
      if (timed) {
        state.timedRoundsVerified++;
        if (Date.now() > deadline) state.timedRoundsDeadlineLate++;
      }
    } finally {
      if (state.pendingCorrelation?.sha256 === correlationSha256) {
        state.pendingCorrelation = null;
      }
      state.deliveryRoundPending = false;
    }
  };

  const runDeliveryRound = async (
    deadline = Date.now() + options.timeoutMs,
    timed = false
  ): Promise<void> => {
    const failures: Error[] = [];
    await mapWithConcurrency(states, options.concurrency, async (state) => {
      try {
        await verifyStateDelivery(
          state,
          timed ? Math.min(deadline, Date.now() + options.timeoutMs) : deadline,
          timed
        );
      } catch (error) {
        const failure = error instanceof Error
          ? error
          : new Error(`CPERF_REALTIME_DELIVERY_FAILED:${state.key}`);
        if (!disposing) state.errors.add(failure.message);
        failures.push(failure);
      }
    });
    if (failures.length > 0) throw failures[0];
  };

  const clearDeliveryTimer = (): void => {
    if (deliveryTimer) clearTimeout(deliveryTimer);
    deliveryTimer = null;
  };

  const scheduleDeliveryRound = (): void => {
    if (
      disposing
      || disposed
      || states.length === 0
      || deliveryTimer
      || deliveryRound
    ) return;
    const coverage = timedCoverage;
    if (!coverage || coverage.nextRound > coverage.expectedRounds) return;
    const scheduledAt = coverage.startedAtMs
      + coverage.nextRound * deliveryIntervalMs;
    deliveryTimer = setTimeout(() => {
      deliveryTimer = null;
      const current = timedCoverage;
      if (!current || current.nextRound > current.expectedRounds) return;
      current.nextRound++;
      const deadline = Math.min(
        current.deadlineAtMs,
        scheduledAt + deliveryIntervalMs
      );
      if (Date.now() >= deadline) {
        for (const state of states) {
          state.timedRoundsStarted++;
          state.timedRoundsDeadlineLate++;
        }
        scheduleDeliveryRound();
        return;
      }
      void launchDeliveryRound(deadline, true).catch((): void => undefined);
    }, Math.max(0, scheduledAt - Date.now()));
  };

  const launchDeliveryRound = (
    deadline = Date.now() + options.timeoutMs,
    timed = false
  ): Promise<void> => {
    if (deliveryRound) return deliveryRound;
    if (disposing || disposed) {
      return Promise.reject(new Error('CPERF_REALTIME_DISPOSED'));
    }
    const round = runDeliveryRound(deadline, timed);
    deliveryRound = round;
    void round.then(
      () => {
        if (deliveryRound === round) deliveryRound = null;
        scheduleDeliveryRound();
      },
      () => {
        if (deliveryRound === round) deliveryRound = null;
      }
    );
    return round;
  };

  const coverageSnapshot = (): RealtimeDeliveryCoverage | null => {
    if (!timedCoverage) return null;
    return summarizeRealtimeReceiptEvidence({
      deliveryIntervalMs,
      workloadStartedAt: new Date(timedCoverage.startedAtMs).toISOString(),
      workloadDeadlineAt: new Date(timedCoverage.deadlineAtMs).toISOString(),
      workloadEndedAt: timedCoverage.endedAtMs == null
        ? null
        : new Date(timedCoverage.endedAtMs).toISOString(),
      surfaces: states.map((state) => ({
        tenantId: state.tenantId,
        surface: state.surface.name,
        route: state.route,
        expectedRecurringRounds: state.timedRoundsExpected,
        startedRecurringRounds: state.timedRoundsStarted,
        verifiedRecurringRounds: state.timedRoundsVerified,
        deadlineLateRecurringRounds: state.timedRoundsDeadlineLate,
        receipts: state.correlationReceipts
      }))
    }).coverage;
  };

  const snapshot = (): RealtimeDriverSnapshot => ({
    expected: states.length,
    active: states.filter((state) => state.active).length,
    verified: states.filter((state) => state.verified).length,
    deliveryIntervalMs,
    deliveryEvents: states.reduce((sum, state) => sum + state.deliveryEvents, 0),
    deliveryRoundsStarted: states.reduce(
      (sum, state) => sum + state.deliveryRoundsStarted,
      0
    ),
    deliveryRoundsVerified: states.reduce(
      (sum, state) => sum + state.deliveryRoundsVerified,
      0
    ),
    deliveryRoundsPending: states.filter((state) =>
      state.deliveryRoundPending
    ).length,
    timedCoverage: coverageSnapshot(),
    errors: states.flatMap((state) => [...state.errors]).sort(),
    surfaces: states.map((state) => ({
      tenantId: state.tenantId,
      surface: state.surface.name,
      route: state.route,
      active: state.active,
      verified: state.verified,
      deliveryEvents: state.deliveryEvents,
      deliveryRoundsStarted: state.deliveryRoundsStarted,
      deliveryRoundsVerified: state.deliveryRoundsVerified,
      deliveryRoundPending: state.deliveryRoundPending,
      timedRoundsExpected: state.timedRoundsExpected,
      timedRoundsStarted: state.timedRoundsStarted,
      timedRoundsVerified: state.timedRoundsVerified,
      timedRoundsDeadlineLate: state.timedRoundsDeadlineLate,
      correlationReceipts: state.correlationReceipts.map((receipt) => ({
        ...receipt
      }))
    }))
  });

  const assertHealthy = (): void => {
    const current = snapshot();
    if (current.errors.length > 0) throw new Error(current.errors[0]);
    if (
      current.active !== current.expected
      || current.verified !== current.expected
    ) {
      throw new Error(
        `CPERF_REALTIME_NOT_HEALTHY:${current.active}:${current.verified}:${current.expected}`
      );
    }
  };

  return {
    async startAndVerify(): Promise<void> {
      if (started) throw new Error('CPERF_REALTIME_ALREADY_STARTED');
      started = true;
      const failures: Error[] = [];
      await mapWithConcurrency(states, options.concurrency, async (state) => {
        try {
          await startState(state);
        } catch (error) {
          failures.push(error instanceof Error ? error : new Error(String(error)));
        }
      });
      if (failures.length > 0) throw failures[0];
      await runDeliveryRound();
      assertHealthy();
    },
    beginTimedCoverage(durationMs: number): void {
      if (!started) throw new Error('CPERF_REALTIME_NOT_STARTED');
      if (timedCoverage) throw new Error('CPERF_REALTIME_TIMED_COVERAGE_ALREADY_STARTED');
      if (!Number.isSafeInteger(durationMs) || durationMs <= 0) {
        throw new Error('CPERF_REALTIME_TIMED_DURATION_INVALID');
      }
      const startedAtMs = Date.now();
      const expectedRounds = Math.max(
        0,
        Math.ceil(durationMs / deliveryIntervalMs) - 1
      );
      timedCoverage = {
        startedAtMs,
        deadlineAtMs: startedAtMs + durationMs,
        endedAtMs: null,
        expectedRounds,
        nextRound: 1
      };
      for (const state of states) state.timedRoundsExpected = expectedRounds;
      scheduleDeliveryRound();
    },
    async finishTimedCoverage(): Promise<RealtimeDeliveryCoverage> {
      if (!timedCoverage) throw new Error('CPERF_REALTIME_TIMED_COVERAGE_NOT_STARTED');
      clearDeliveryTimer();
      if (deliveryRound) await deliveryRound;
      clearDeliveryTimer();
      while (timedCoverage.nextRound <= timedCoverage.expectedRounds) {
        timedCoverage.nextRound++;
        for (const state of states) {
          state.timedRoundsStarted++;
          state.timedRoundsDeadlineLate++;
        }
      }
      timedCoverage.endedAtMs = Date.now();
      const coverage = coverageSnapshot()!;
      return coverage;
    },
    async verifyDeliveryNow(): Promise<void> {
      if (!started) throw new Error('CPERF_REALTIME_NOT_STARTED');
      if (disposing || disposed) throw new Error('CPERF_REALTIME_DISPOSED');
      clearDeliveryTimer();
      const pendingRound = deliveryRound;
      if (pendingRound) {
        await pendingRound;
      } else {
        assertHealthy();
        await launchDeliveryRound();
      }
      assertHealthy();
    },
    assertHealthy,
    snapshot,
    async dispose(): Promise<void> {
      if (disposed) return;
      disposing = true;
      clearDeliveryTimer();
      for (const controller of primeAbortControllers) controller.abort();
      const pendingRound = deliveryRound;
      if (pendingRound) {
        try {
          await pendingRound;
        } catch {
          // Disposal intentionally aborts an in-flight prime or event wait.
        }
      }
      for (const state of states) {
        try {
          state.unsubscribe?.();
        } catch {
          state.errors.add(`CPERF_REALTIME_UNSUBSCRIBE_FAILED:${state.key}`);
        }
      }
      const results = await Promise.allSettled(states.map((state) => state.client?.dispose()));
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          states[index].errors.add(`CPERF_REALTIME_DISPOSE_FAILED:${states[index].key}`);
        }
      });
      disposed = true;
      for (const state of states) state.active = false;
      const disposalFailure = states.flatMap((state) => [...state.errors]).find((error) =>
        error.startsWith('CPERF_REALTIME_UNSUBSCRIBE_FAILED:')
        || error.startsWith('CPERF_REALTIME_DISPOSE_FAILED:')
      );
      if (disposalFailure) throw new Error(disposalFailure);
    }
  };
};
