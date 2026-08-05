import { isDeepStrictEqual } from 'node:util';

import type {
  CanaryRoundSummary,
  CanaryResult,
  CanaryScheduleSummary,
  GraphqlOperation,
  GraphqlSurface,
  IsolationCanary,
  JsonPathInvariant,
  JsonPathMatch,
  PeriodicCanarySchedule,
  RequestSample,
  ResolvedOfferedLoad,
  TenantTarget,
  WorkloadPlan
} from './types';

export interface WorkloadResult {
  samples: RequestSample[];
  canaries: CanaryResult[];
  canarySchedule: CanaryScheduleSummary;
  warmedSurfaces: Map<string, Set<string>>;
  warmupLatencies: number[];
  capabilities: Set<string>;
  capabilitiesByTenantSurface: Map<string, Set<string>>;
  missedArrivals: number;
  workloadDurationMs: number;
  offeredLoad: ResolvedOfferedLoad;
  resolvedWarmupTimeoutMs: number;
  warmupSurfaceCount: number;
  warmupConcurrency: number;
}

export interface WorkloadCapture {
  samples: RequestSample[];
  canaries: CanaryResult[];
  canarySchedule: CanaryScheduleSummary | null;
  warmedSurfaces: Map<string, Set<string>>;
  warmupLatencies: number[];
  capabilities: Set<string>;
  capabilitiesByTenantSurface: Map<string, Set<string>>;
}

export const createWorkloadCapture = (): WorkloadCapture => ({
  samples: [],
  canaries: [],
  canarySchedule: null,
  warmedSurfaces: new Map(),
  warmupLatencies: [],
  capabilities: new Set(),
  capabilitiesByTenantSurface: new Map()
});

export const resolveOfferedLoad = (
  plan: Pick<WorkloadPlan, 'rps' | 'rpsPerTenant'>,
  tenantCount: number
): ResolvedOfferedLoad => {
  if (!Number.isSafeInteger(tenantCount) || tenantCount <= 0) {
    throw new Error('tenantCount must be a positive safe integer');
  }
  const fixed = plan.rps;
  const perTenant = plan.rpsPerTenant;
  if ((fixed == null) === (perTenant == null)) {
    throw new Error('workload must define exactly one of rps or rpsPerTenant');
  }
  const configuredRps = fixed ?? perTenant!;
  if (!Number.isFinite(configuredRps) || configuredRps <= 0) {
    throw new Error('configured workload RPS must be positive');
  }
  const totalRps = fixed ?? perTenant! * tenantCount;
  if (!Number.isFinite(totalRps) || totalRps <= 0) {
    throw new Error('resolved workload RPS must be positive');
  }
  return {
    mode: fixed == null ? 'per-tenant' : 'fixed-total',
    configuredRps,
    tenantCount,
    totalRps,
    rpsPerTenant: fixed == null ? perTenant! : fixed / tenantCount
  };
};

export const resolveWarmupTimeoutMs = (
  plan: Pick<
  WorkloadPlan,
  'warmupTimeoutMs' | 'warmupTimeoutPerSurfaceMs' | 'warmupConcurrency'
  >,
  surfaceCount: number
): number => {
  if (!Number.isSafeInteger(surfaceCount) || surfaceCount <= 0) {
    throw new Error('warmup surface count must be a positive safe integer');
  }
  const concurrency = plan.warmupConcurrency ?? 1;
  if (!Number.isSafeInteger(concurrency) || concurrency <= 0) {
    throw new Error('warmup concurrency must be a positive safe integer');
  }
  if (!Number.isFinite(plan.warmupTimeoutMs) || plan.warmupTimeoutMs <= 0) {
    throw new Error('warmupTimeoutMs must be positive');
  }
  if (
    !Number.isFinite(plan.warmupTimeoutPerSurfaceMs)
    || plan.warmupTimeoutPerSurfaceMs <= 0
  ) {
    throw new Error('warmupTimeoutPerSurfaceMs must be positive');
  }
  const waves = Math.ceil(surfaceCount / concurrency);
  return Math.max(plan.warmupTimeoutMs, waves * plan.warmupTimeoutPerSurfaceMs);
};

interface GraphqlResponse {
  status: number;
  latencyMs: number;
  body: unknown;
  text: string;
  ok: boolean;
  errorCode?: string;
  retryAfterMs: number;
  oracleConfigured: boolean;
  oracleConclusive: boolean;
  oracleViolation: boolean;
  oracleUnavailable: boolean;
  postCoverageVerification?: boolean;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const decodePointerSegment = (segment: string): string =>
  segment.replace(/~1/g, '/').replace(/~0/g, '~');

/** Resolve an RFC 6901 pointer; `*` selects every child at that segment. */
export const jsonPointerValues = (root: unknown, pointer: string): unknown[] => {
  if (pointer === '') return [root];
  if (!pointer.startsWith('/')) return [];
  let values: unknown[] = [root];
  for (const rawSegment of pointer.slice(1).split('/')) {
    const segment = decodePointerSegment(rawSegment);
    const next: unknown[] = [];
    for (const value of values) {
      if (segment === '*') {
        if (Array.isArray(value)) next.push(...value);
        else if (value && typeof value === 'object') next.push(...Object.values(value));
        continue;
      }
      if (Array.isArray(value)) {
        const index = /^(0|[1-9]\d*)$/.test(segment) ? Number(segment) : -1;
        if (index >= 0 && index < value.length) next.push(value[index]);
      } else if (
        value &&
        typeof value === 'object' &&
        Object.prototype.hasOwnProperty.call(value, segment)
      ) {
        next.push((value as Record<string, unknown>)[segment]);
      }
    }
    values = next;
    if (values.length === 0) break;
  }
  return values;
};

const matchesJsonPath = (body: unknown, match: JsonPathMatch): boolean =>
  jsonPointerValues(body, match.path).some((value) => isDeepStrictEqual(value, match.value));

const evaluateInvariant = (
  body: unknown,
  invariant: JsonPathInvariant
): 'missing' | 'unexpected' | null => {
  const values = jsonPointerValues(body, invariant.path);
  if (values.length < invariant.min) return 'missing';
  if (invariant.max != null && values.length > invariant.max) return 'unexpected';
  return values.every((value) => isDeepStrictEqual(value, invariant.everyEquals))
    ? null
    : 'unexpected';
};

const applyResponseOracle = (
  response: Omit<
  GraphqlResponse,
  'oracleConfigured' | 'oracleConclusive' | 'oracleViolation' | 'oracleUnavailable'
  >,
  operation: Pick<GraphqlOperation, 'requiredMatches' | 'forbiddenMatches' | 'invariants'>
): GraphqlResponse => {
  const configured = operation.requiredMatches != null
    || operation.forbiddenMatches != null
    || operation.invariants != null;
  if (!configured) {
    return {
      ...response,
      oracleConfigured: false,
      oracleConclusive: false,
      oracleViolation: false,
      oracleUnavailable: false
    };
  }
  if (
    !operation.requiredMatches?.length
    || !operation.forbiddenMatches?.length
    || (operation.invariants != null && operation.invariants.length === 0)
  ) {
    return {
      ...response,
      ok: false,
      errorCode: 'GRAPHQL_OPERATION_ORACLE_INVALID',
      oracleConfigured: true,
      oracleConclusive: false,
      oracleViolation: false,
      oracleUnavailable: false
    };
  }
  const forbidden = operation.forbiddenMatches.find((match) =>
    matchesJsonPath(response.body, match)
  );
  const missing = operation.requiredMatches.find((match) =>
    !matchesJsonPath(response.body, match)
  );
  const unexpectedInvariant = operation.invariants?.find((invariant) =>
    evaluateInvariant(response.body, invariant) === 'unexpected'
  );
  const missingInvariant = operation.invariants?.find((invariant) =>
    evaluateInvariant(response.body, invariant) === 'missing'
  );
  if (forbidden) {
    return {
      ...response,
      ok: false,
      errorCode: 'GRAPHQL_OPERATION_ORACLE_FORBIDDEN',
      oracleConfigured: true,
      oracleConclusive: true,
      oracleViolation: true,
      oracleUnavailable: false
    };
  }
  if (unexpectedInvariant) {
    return {
      ...response,
      ok: false,
      errorCode: 'GRAPHQL_OPERATION_ORACLE_INVARIANT_UNEXPECTED',
      oracleConfigured: true,
      oracleConclusive: true,
      oracleViolation: true,
      oracleUnavailable: false
    };
  }
  if (!response.ok) {
    return {
      ...response,
      oracleConfigured: true,
      oracleConclusive: false,
      oracleViolation: false,
      oracleUnavailable: true
    };
  }
  if (missing || missingInvariant) {
    return {
      ...response,
      ok: false,
      errorCode: missingInvariant
        ? 'GRAPHQL_OPERATION_ORACLE_INVARIANT_MISSING'
        : 'GRAPHQL_OPERATION_ORACLE_MISSING',
      oracleConfigured: true,
      oracleConclusive: false,
      oracleViolation: false,
      oracleUnavailable: false
    };
  }
  return {
    ...response,
    oracleConfigured: true,
    oracleConclusive: true,
    oracleViolation: false,
    oracleUnavailable: false
  };
};

export const mapWithConcurrency = async <T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> => {
  if (items.length === 0) return;
  let cursor = 0;
  const workers = Array.from({ length: Math.min(items.length, Math.max(1, concurrency)) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await worker(items[index], index);
    }
  });
  await Promise.all(workers);
};

const requestGraphql = async (
  surface: GraphqlSurface,
  operation: Pick<
    GraphqlOperation,
    'query' | 'variables' | 'requiredMatches' | 'forbiddenMatches' | 'invariants'
  >,
  timeoutMs: number
): Promise<GraphqlResponse> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = performance.now();
  try {
    const response = await fetch(surface.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(surface.headers ?? {})
      },
      body: JSON.stringify({ query: operation.query, variables: operation.variables ?? {} }),
      signal: controller.signal
    });
    const text = await response.text();
    let body: any = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
    const graphqlError = Array.isArray(body?.errors) && body.errors.length > 0;
    const errorCode = graphqlError
      ? body.errors[0]?.extensions?.code ?? 'GRAPHQL_ERROR'
      : undefined;
    const retryAfter = Number.parseInt(response.headers.get('retry-after') ?? '', 10);
    return applyResponseOracle({
      status: response.status,
      latencyMs: performance.now() - startedAt,
      body,
      text,
      ok: response.ok && !graphqlError,
      errorCode,
      retryAfterMs: Number.isFinite(retryAfter) ? retryAfter * 1000 : 0
    }, operation);
  } catch (error) {
    return applyResponseOracle({
      status: 0,
      latencyMs: performance.now() - startedAt,
      body: null,
      text: error instanceof Error ? error.message : String(error),
      ok: false,
      errorCode: error instanceof Error && error.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR',
      retryAfterMs: 0
    }, operation);
  } finally {
    clearTimeout(timer);
  }
};

const warmSurface = async (
  surface: GraphqlSurface,
  deadline: number,
  requestTimeoutMs: number
): Promise<GraphqlResponse> => {
  let last: GraphqlResponse | null = null;
  while (Date.now() < deadline) {
    const remainingMs = Math.max(1, deadline - Date.now());
    last = await requestGraphql(
      surface,
      surface.warmup,
      Math.min(requestTimeoutMs, remainingMs)
    );
    if (last.ok) return last;
    if (last.status !== 503) return last;
    const retryDelayMs = Math.min(
      Math.max(100, last.retryAfterMs),
      Math.max(0, deadline - Date.now())
    );
    if (retryDelayMs > 0) await sleep(retryDelayMs);
  }
  return last ?? {
    status: 0,
    latencyMs: 0,
    body: null,
    text: 'global warmup deadline elapsed before this surface could start',
    ok: false,
    errorCode: 'WARMUP_DEADLINE',
    retryAfterMs: 0,
    oracleConfigured: surface.warmup.requiredMatches != null
      || surface.warmup.forbiddenMatches != null
      || surface.warmup.invariants != null,
    oracleConclusive: false,
    oracleViolation: false,
    oracleUnavailable: true
  };
};

const runCanary = async (
  tenant: TenantTarget,
  surface: GraphqlSurface,
  configuredCanaries: readonly IsolationCanary[],
  timeoutMs: number,
  metadata: {
    phase: CanaryResult['phase'];
    periodicRound?: number;
    scheduledAt: string;
    onCheckStarted?: () => void;
  }
): Promise<CanaryResult[]> => {
  const results: CanaryResult[] = [];
  // A physical-density surface may have one pool slot permanently leased by
  // realtime. Queueing every hostile probe at once behind the remaining slot
  // lets the validation rig create head-of-line blocking for customer traffic.
  // Submit probes one at a time so workload requests can interleave while the
  // exact same fail-closed canary set is still exercised.
  for (const canary of configuredCanaries) {
    metadata.onCheckStarted?.();
    const startedAt = new Date().toISOString();
    const response = await requestGraphql(surface, canary, timeoutMs);
    const completedAt = new Date().toISOString();
    const evidence = {
      tenantId: tenant.id,
      surface: surface.name,
      canary: canary.name,
      phase: metadata.phase,
      ...(metadata.periodicRound != null
        ? { periodicRound: metadata.periodicRound }
        : {}),
      scheduledAt: metadata.scheduledAt,
      startedAt,
      completedAt,
      latencyMs: response.latencyMs
    };
    results.push({
      ...evidence,
      conclusive: response.oracleConclusive,
      violation: response.oracleViolation,
      ...(!response.ok ? {
        detail: response.errorCode ?? `HTTP_${response.status}`
      } : {})
    });
  }
  return results;
};

/**
 * Timed slots are strictly inside the workload window. A 15-minute workload
 * with a 60-second interval therefore has rounds 1..14, never one at t=0 or
 * exactly at the deadline (those boundaries belong to the full sweeps).
 */
export const periodicCanaryRoundCount = (
  durationMs: number,
  intervalMs: number
): number => {
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    throw new Error('canary schedule duration must be non-negative');
  }
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    throw new Error('canary schedule interval must be positive');
  }
  return Math.max(0, Math.ceil(durationMs / intervalMs) - 1);
};

const stableOffset = (namespace: string, values: readonly string[], count: number): number => {
  if (!Number.isSafeInteger(count) || count <= 0) return 0;
  let hash = 0x811c9dc5;
  for (const character of [namespace, ...values].join('\0')) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % count;
};

export const deterministicCanaryOffset = (
  tenantId: string,
  surfaceName: string,
  canaryCount: number
): number => stableOffset('canary', [tenantId, surfaceName], canaryCount);

/** Return the selected zero-based canary index for a one-based periodic round. */
export const rotatingCanaryIndex = (
  tenantId: string,
  surfaceName: string,
  canaryCount: number,
  periodicRound: number
): number => {
  if (!Number.isSafeInteger(canaryCount) || canaryCount <= 0) {
    throw new Error('rotating canary selection requires at least one canary');
  }
  if (!Number.isSafeInteger(periodicRound) || periodicRound <= 0) {
    throw new Error('periodic canary round must be a positive safe integer');
  }
  return (
    deterministicCanaryOffset(tenantId, surfaceName, canaryCount)
    + periodicRound - 1
  ) % canaryCount;
};

const weightedOperations = (surface: GraphqlSurface): GraphqlOperation[] => {
  const expanded: GraphqlOperation[] = [];
  for (const operation of surface.operations) {
    const weight = Math.max(1, Math.round((operation.weight ?? 1) * 10));
    for (let index = 0; index < weight; index++) expanded.push(operation);
  }
  return expanded;
};

/**
 * Give each tenant/surface a reproducible position in its weighted operation
 * schedule. Starting every surface at index zero creates fleet-wide operation
 * waves that exaggerate one query shape at a time instead of exercising a
 * mixed customer workload.
 */
export const deterministicOperationOffset = (
  tenantId: string,
  surfaceName: string,
  operationCount: number
): number => {
  if (!Number.isSafeInteger(operationCount) || operationCount <= 0) return 0;
  let hash = 0x811c9dc5;
  for (const character of `${tenantId}\0${surfaceName}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % operationCount;
};

export const runWorkload = async (
  tenants: TenantTarget[],
  plan: WorkloadPlan,
  onWarmBoundary?: () => void | Promise<void>,
  capture: WorkloadCapture = createWorkloadCapture()
): Promise<WorkloadResult> => {
  const {
    warmedSurfaces,
    warmupLatencies,
    capabilities,
    capabilitiesByTenantSurface,
    samples,
    canaries
  } = capture;
  const surfaceTargets = tenants.flatMap((tenant) => tenant.surfaces.map((surface) => {
    const operations = weightedOperations(surface);
    return {
      tenant,
      surface,
      operations,
      cursor: deterministicOperationOffset(tenant.id, surface.name, operations.length)
    };
  }));

  const warmupConcurrency = plan.warmupConcurrency ?? 1;
  const resolvedWarmupTimeoutMs = resolveWarmupTimeoutMs(plan, surfaceTargets.length);
  const warmupDeadline = Date.now() + resolvedWarmupTimeoutMs;
  await mapWithConcurrency(surfaceTargets, warmupConcurrency, async ({ tenant, surface }) => {
    const response = await warmSurface(
      surface,
      warmupDeadline,
      plan.requestTimeoutMs
    );
    warmupLatencies.push(response.latencyMs);
    if (response.ok) {
      const warmed = warmedSurfaces.get(tenant.id) ?? new Set<string>();
      warmed.add(surface.name);
      warmedSurfaces.set(tenant.id, warmed);
    }
  });
  let missedArrivals = 0;

  const recordResponse = (
    target: typeof surfaceTargets[number],
    operation: GraphqlOperation,
    response: GraphqlResponse,
    phase: RequestSample['phase'],
    scheduledAtMs?: number
  ): void => {
    if (response.ok) {
      capabilities.add(operation.capability);
      const capabilityKey = `${target.tenant.id}/${target.surface.name}`;
      const localCapabilities = capabilitiesByTenantSurface.get(capabilityKey) ?? new Set<string>();
      localCapabilities.add(operation.capability);
      capabilitiesByTenantSurface.set(capabilityKey, localCapabilities);
    }
    samples.push({
      tenantId: target.tenant.id,
      surface: target.surface.name,
      operation: operation.name,
      capability: operation.capability,
      // Workload latency starts at the scheduled open-loop arrival, not when
      // fetch happened to begin. This includes scheduler/event-loop delay and
      // prevents coordinated omission from making a saturated arm look fast.
      latencyMs: phase === 'workload' && scheduledAtMs != null
        ? Math.max(response.latencyMs, performance.now() - scheduledAtMs)
        : response.latencyMs,
      status: response.status,
      ok: response.ok,
      phase,
      oracleConfigured: response.oracleConfigured,
      oracleConclusive: response.oracleConclusive,
      oracleViolation: response.oracleViolation,
      oracleUnavailable: response.oracleUnavailable,
      ...(response.postCoverageVerification
        ? { postCoverageVerification: true }
        : {}),
      ...(scheduledAtMs != null ? { scheduledAtMs } : {}),
      ...(!response.ok ? { errorCode: response.errorCode ?? `HTTP_${response.status}` } : {})
    });
  };

  const coverage = surfaceTargets.flatMap((target) =>
    target.surface.operations.map((operation) => ({ target, operation }))
  );
  await mapWithConcurrency(coverage, warmupConcurrency, async ({ target, operation }) => {
    const primary = await requestGraphql(
      target.surface,
      operation,
      plan.requestTimeoutMs
    );
    if (!primary.ok || !operation.postCoverageVerification) {
      recordResponse(target, operation, primary, 'coverage');
      return;
    }
    const responseVariables: Record<string, unknown> = {};
    for (const [name, pointer] of Object.entries(
      operation.postCoverageVerification.variablesFromResponse ?? {}
    )) {
      const values = jsonPointerValues(primary.body, pointer);
      if (values.length !== 1) {
        recordResponse(target, operation, {
          ...primary,
          ok: false,
          errorCode: values.length === 0
            ? 'GRAPHQL_POST_COVERAGE_VARIABLE_MISSING'
            : 'GRAPHQL_POST_COVERAGE_VARIABLE_AMBIGUOUS',
          oracleConfigured: true,
          oracleConclusive: false,
          oracleViolation: false,
          oracleUnavailable: false,
          postCoverageVerification: true
        }, 'coverage');
        return;
      }
      responseVariables[name] = values[0];
    }
    const verification = await requestGraphql(
      target.surface,
      {
        ...operation.postCoverageVerification,
        variables: {
          ...(operation.postCoverageVerification.variables ?? {}),
          ...responseVariables
        }
      },
      plan.requestTimeoutMs
    );
    recordResponse(target, operation, {
      ...verification,
      latencyMs: primary.latencyMs + verification.latencyMs,
      postCoverageVerification: true
    }, 'coverage');
  });

  const canaryConcurrency = plan.canaryConcurrency
    ?? Math.min(plan.maxInFlight, warmupConcurrency);
  const runFullCanarySweep = async (
    phase: 'initial' | 'final'
  ): Promise<void> => {
    const scheduledAt = new Date().toISOString();
    await mapWithConcurrency(
      surfaceTargets,
      canaryConcurrency,
      async ({ tenant, surface }) => {
        canaries.push(...await runCanary(
          tenant,
          surface,
          surface.canaries,
          plan.requestTimeoutMs,
          { phase, scheduledAt }
        ));
      }
    );
  };
  await runFullCanarySweep('initial');
  // The warm boundary is the first point at which every resident surface has
  // been built, every configured capability has been exercised, and the
  // initial isolation sweep has completed. The caller may perform additional
  // awaited setup (for example, establishing realtime transports) before it
  // marks memory warm. A callback failure must prevent timed traffic.
  await onWarmBoundary?.();

  const startedAt = performance.now();
  const startedWallMs = Date.now();
  const durationMs = plan.durationSec * 1000;
  const deadline = startedAt + durationMs;
  const deadlineWallMs = startedWallMs + durationMs;
  const canaryIntervalMs = plan.canaryIntervalSec * 1000;
  const periodicSchedule: PeriodicCanarySchedule =
    plan.periodicCanarySchedule ?? 'full-sweep';
  const plannedPeriodicRounds = periodicCanaryRoundCount(
    durationMs,
    canaryIntervalMs
  );
  const checksPerFullSweep = surfaceTargets.reduce(
    (sum, target) => sum + target.surface.canaries.length,
    0
  );
  const checksPerRound = periodicSchedule === 'rotating-one'
    ? surfaceTargets.length
    : checksPerFullSweep;
  const canarySchedule: CanaryScheduleSummary = {
    schedule: periodicSchedule,
    intervalMs: canaryIntervalMs,
    durationMs,
    canaryConcurrency,
    startedAt: new Date(startedWallMs).toISOString(),
    deadlineAt: new Date(deadlineWallMs).toISOString(),
    planned: plannedPeriodicRounds,
    started: 0,
    completed: 0,
    missed: plannedPeriodicRounds,
    overlapped: 0,
    deadlineLate: 0,
    checksPlanned: plannedPeriodicRounds * checksPerRound,
    checksStarted: 0,
    checksCompleted: 0,
    rounds: Array.from({ length: plannedPeriodicRounds }, (_unused, index): CanaryRoundSummary => ({
      periodicRound: index + 1,
      plannedAt: new Date(startedWallMs + (index + 1) * canaryIntervalMs).toISOString(),
      startedAt: null,
      completedAt: null,
      targetsPlanned: surfaceTargets.length,
      targetsStarted: 0,
      targetsCompleted: 0,
      checksPlanned: checksPerRound,
      checksStarted: 0,
      checksCompleted: 0,
      overlapped: false,
      deadlineLate: false,
      startDelayMs: null,
      durationMs: null
    }))
  };
  capture.canarySchedule = canarySchedule;

  // This is a finite serialized schedule, not a setInterval callback. If a
  // round overlaps the next slot it is recorded and drained before the next
  // round starts; no validation round disappears behind a boolean guard. Each
  // request has requestTimeoutMs, so the finite set of planned probes also
  // gives the post-deadline drain a deterministic upper bound.
  const periodicCanaries = (async (): Promise<void> => {
    let previousCompletedAt = startedAt;
    for (const round of canarySchedule.rounds) {
      const plannedAt = startedAt + round.periodicRound * canaryIntervalMs;
      const waitMs = plannedAt - performance.now();
      if (waitMs > 0) await sleep(waitMs);
      const roundStartedAt = performance.now();
      round.overlapped = round.periodicRound > 1 && previousCompletedAt > plannedAt;
      round.startedAt = new Date().toISOString();
      round.startDelayMs = Math.max(0, roundStartedAt - plannedAt);
      canarySchedule.started++;
      if (round.overlapped) canarySchedule.overlapped++;

      await mapWithConcurrency(
        surfaceTargets,
        canaryConcurrency,
        async ({ tenant, surface }) => {
          round.targetsStarted++;
          const selectedCanaries = periodicSchedule === 'rotating-one'
            ? [surface.canaries[rotatingCanaryIndex(
              tenant.id,
              surface.name,
              surface.canaries.length,
              round.periodicRound
            )]]
            : surface.canaries;
          const results = await runCanary(
            tenant,
            surface,
            selectedCanaries,
            plan.requestTimeoutMs,
            {
              phase: 'periodic',
              periodicRound: round.periodicRound,
              scheduledAt: round.plannedAt,
              onCheckStarted: () => {
                round.checksStarted++;
                canarySchedule.checksStarted++;
              }
            }
          );
          canaries.push(...results);
          round.checksCompleted += results.length;
          canarySchedule.checksCompleted += results.length;
          round.targetsCompleted++;
        }
      );

      previousCompletedAt = performance.now();
      round.completedAt = new Date().toISOString();
      round.durationMs = previousCompletedAt - roundStartedAt;
      round.deadlineLate = previousCompletedAt > deadline;
      canarySchedule.completed++;
      canarySchedule.missed = canarySchedule.planned - canarySchedule.completed;
      if (round.deadlineLate) canarySchedule.deadlineLate++;
    }
  })();

  const offeredLoad = resolveOfferedLoad(plan, tenants.length);
  const intervalMs = 1000 / offeredLoad.totalRps;
  let nextAt = startedAt;
  let sequence = 0;
  const inFlight = new Set<Promise<void>>();

  const nextScheduledOperation = (): {
    target: typeof surfaceTargets[number];
    operation: GraphqlOperation;
  } => {
    const target = surfaceTargets[sequence % surfaceTargets.length];
    sequence++;
    const operation = target.operations[target.cursor % target.operations.length];
    target.cursor++;
    return { target, operation };
  };

  const dispatch = (
    target: typeof surfaceTargets[number],
    operation: GraphqlOperation,
    scheduledAtMs: number
  ): void => {
    const pending = requestGraphql(target.surface, operation, plan.requestTimeoutMs)
      .then((response) => recordResponse(
        target,
        operation,
        response,
        'workload',
        scheduledAtMs
      ))
      .finally(() => inFlight.delete(pending));
    inFlight.add(pending);
  };

  while (performance.now() < deadline) {
    const now = performance.now();
    if (now >= nextAt) {
      // Advance directly to the next future arrival. Overdue arrivals become
      // explicit failed samples, so saturation/event-loop stalls cannot hide
      // latency through coordinated omission and never trigger a catch-up burst.
      const due = Math.floor((now - nextAt) / intervalMs) + 1;
      const canDispatchLatest = inFlight.size < plan.maxInFlight;
      for (let slot = 0; slot < due; slot++) {
        const scheduledAtMs = nextAt + slot * intervalMs;
        const { target, operation } = nextScheduledOperation();
        if (canDispatchLatest && slot === due - 1) {
          dispatch(target, operation, scheduledAtMs);
          continue;
        }
        missedArrivals++;
        recordResponse(target, operation, {
          status: 0,
          latencyMs: Math.max(plan.requestTimeoutMs, now - scheduledAtMs),
          body: null,
          text: 'scheduled arrival missed before dispatch',
          ok: false,
          errorCode: 'LOAD_GENERATOR_MISSED_ARRIVAL',
          retryAfterMs: 0,
          oracleConfigured: operation.requiredMatches != null
            || operation.forbiddenMatches != null
            || operation.invariants != null,
          oracleConclusive: false,
          oracleViolation: false,
          oracleUnavailable: true
        }, 'workload', scheduledAtMs);
      }
      nextAt += due * intervalMs;
      continue;
    }
    await sleep(Math.min(20, Math.max(1, nextAt - now)));
  }
  const workloadDurationMs = performance.now() - startedAt;
  await Promise.all(inFlight);
  await periodicCanaries;
  await runFullCanarySweep('final');

  return {
    samples,
    canaries,
    canarySchedule,
    warmedSurfaces,
    warmupLatencies,
    capabilities,
    capabilitiesByTenantSurface,
    missedArrivals,
    workloadDurationMs,
    offeredLoad,
    resolvedWarmupTimeoutMs,
    warmupSurfaceCount: surfaceTargets.length,
    warmupConcurrency
  };
};
