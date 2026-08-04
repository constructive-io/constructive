'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const {
  FIXTURE_DIR,
  REPO_ROOT,
  loadProvision,
} = require('./lib.cjs');
const {
  TENANTS,
  parseArgs,
  parsePositiveInteger,
  requireString,
} = require('../complete-tenant-fixture/lib.cjs');
const completeServer = require('../complete-tenant-fixture/server.cjs');
const {
  inspectCustomerContract,
  provisionAttestationSetSha256,
  requireCloneId,
  requireRunPurpose,
} = require('./provision.cjs');

const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', 'localhost']);
const RETAINED_MEMORY_GC_ROUNDS = 8;
const RETAINED_MEMORY_STABLE_SAMPLES = 3;
const MIB = 1024 ** 2;
const SECURITY_ENVIRONMENT_KEYS = Object.freeze([
  'PGDATABASE',
  'PG_POOL_MAX_USES',
  'CTF_RUNTIME_A_PGUSER',
  'CTF_RUNTIME_B_PGUSER',
  'CTF_RUNTIME_C_PGUSER',
  'CTF_RUNTIME_A_PGPASSWORD',
  'CTF_RUNTIME_B_PGPASSWORD',
  'CTF_RUNTIME_C_PGPASSWORD',
  'CTF_NOTIFICATION_PGUSER',
  'CTF_NOTIFICATION_PGPASSWORD',
]);

const requireBuilt = (relativePath) => require(path.join(REPO_ROOT, relativePath));

const matchPhysicalUpgradeRoute = (rawUrl) => {
  if (typeof rawUrl !== 'string' || rawUrl.includes('?')) return null;
  const match = /^\/customer\/([a-z0-9-]+)\/tenant\/([a-z0-9-]+)\/graphql$/.exec(rawUrl);
  return match ? { customerId: match[1], tenantId: match[2] } : null;
};

const matchPhysicalUpgradeCustomer = (rawUrl) =>
  matchPhysicalUpgradeRoute(rawUrl)?.customerId ?? null;

const createRealtimeConnectionRegistry = (surfaceKeys) => {
  const states = new Map(surfaceKeys.map((key) => [key, {
    key,
    accepted: 0,
    active: 0,
    peakActive: 0,
    drops: 0,
    errors: 0,
  }]));
  const snapshot = () => {
    const surfaces = [...states.values()].map((state) => ({ ...state }));
    return {
      connectionsExpected: states.size,
      connectionsAccepted: surfaces.reduce((sum, state) => sum + state.accepted, 0),
      connectionsActive: surfaces.reduce((sum, state) => sum + state.active, 0),
      connectionDrops: surfaces.reduce((sum, state) => sum + state.drops, 0),
      connectionErrors: surfaces.reduce((sum, state) => sum + state.errors, 0),
      connectionsPerSurface: surfaces,
    };
  };
  const trackAccepted = (key, socket) => {
    const state = states.get(key);
    if (!state) {
      socket.destroy();
      return false;
    }
    state.accepted += 1;
    state.active += 1;
    state.peakActive = Math.max(state.peakActive, state.active);
    let released = false;
    const release = (errored) => {
      if (released) return;
      released = true;
      state.active = Math.max(0, state.active - 1);
      state.drops += 1;
      if (errored) state.errors += 1;
    };
    socket.once('error', () => release(true));
    socket.once('close', () => release(false));
    if (socket.destroyed) release(false);
    return true;
  };
  const assertResident = () => {
    const current = snapshot();
    const exact = current.connectionsPerSurface.every((state) =>
      state.accepted === 1
      && state.active === 1
      && state.peakActive === 1
      && state.drops === 0
      && state.errors === 0
    );
    if (!exact || current.connectionsActive !== current.connectionsExpected) {
      throw new Error(
        `PDCF_REALTIME_CONNECTIONS_NOT_RESIDENT:${current.connectionsActive}:${current.connectionsExpected}:${current.connectionDrops}:${current.connectionErrors}`
      );
    }
    return current;
  };
  return { assertResident, snapshot, trackAccepted };
};

const parseBoolean = (value, label) => {
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0' || value == null) return false;
  throw new Error(`PDCF_INVALID_BOOLEAN:${label}`);
};

const parseRuntimePoolMaxUses = (value) => {
  if (value === 'unlimited') return null;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw new Error('PDCF_INVALID_MAX_USES:runtime-pool-max-uses');
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error('PDCF_INVALID_MAX_USES:runtime-pool-max-uses');
  }
  return parsed;
};

const optionalSha256 = (value, label) => {
  if (value == null) return null;
  if (typeof value !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(value)) {
    throw new Error(`PDCF_INVALID_SHA256:${label}`);
  }
  return value;
};

const assertProvisionCloneManifest = (manifest, { cloneId, runPurpose }) => {
  const provisionClone = manifest?.provisionClone;
  if (
    JSON.stringify(Object.keys(provisionClone ?? {}).sort())
      !== JSON.stringify(['attestationSetSha256', 'id', 'purpose', 'version'])
    ||
    provisionClone?.version !== 1
    || provisionClone.id !== cloneId
    || provisionClone.purpose !== runPurpose
    || !/^sha256:[a-f0-9]{64}$/.test(provisionClone.attestationSetSha256 ?? '')
  ) {
    throw new Error('PDCF_PROVISION_CLONE_MISMATCH');
  }
  for (const customer of manifest.customers ?? []) {
    const attestation = customer.provisionAttestation;
    if (
      JSON.stringify(Object.keys(attestation ?? {}).sort())
        !== JSON.stringify(['cloneId', 'purpose', 'sha256', 'version'])
      ||
      attestation?.version !== 1
      || attestation.cloneId !== cloneId
      || attestation.purpose !== runPurpose
      || !/^sha256:[a-f0-9]{64}$/.test(attestation.sha256 ?? '')
    ) {
      throw new Error(`PDCF_PROVISION_ATTESTATION_INVALID:${customer.id ?? 'unknown'}`);
    }
  }
  if (provisionAttestationSetSha256(manifest.customers) !== provisionClone.attestationSetSha256) {
    throw new Error('PDCF_PROVISION_ATTESTATION_SET_MISMATCH');
  }
  return provisionClone;
};

const assertCustomerContract = (customer, contract) => {
  if (
    contract.databaseContractFingerprint !== customer.databaseContractFingerprint
    || JSON.stringify(contract.structuralFingerprints)
      !== JSON.stringify(customer.structuralFingerprints)
  ) {
    throw new Error(`PDCF_LIVE_DATABASE_CONTRACT_MISMATCH:${customer.id}`);
  }
  return contract;
};

const parseServerOptions = (argv, environment = process.env) => {
  const args = parseArgs(argv);
  const host = requireString(args, 'host', '127.0.0.1');
  if (!LOOPBACK_HOSTS.has(host)) throw new Error('PDCF_SERVER_LOOPBACK_REQUIRED');
  const mode = requireString(args, 'mode', 'scoped-required');
  if (!['stock', 'scoped-required'].includes(mode)) {
    throw new Error(`PDCF_INTROSPECTION_MODE_INVALID:${mode}`);
  }
  const introspectionClientReleaseMode = requireString(
    args,
    'introspection-client-release-mode',
    'destroy',
  );
  if (!['reuse', 'destroy'].includes(introspectionClientReleaseMode)) {
    throw new Error(
      `PDCF_INTROSPECTION_CLIENT_RELEASE_MODE_INVALID:${introspectionClientReleaseMode}`
    );
  }
  const realtimeNotificationMode = requireString(
    args,
    'realtime-notification-mode',
    'dedicated',
  );
  if (!['dedicated', 'shared-exact'].includes(realtimeNotificationMode)) {
    throw new Error(
      `PDCF_REALTIME_NOTIFICATION_MODE_INVALID:${realtimeNotificationMode}`
    );
  }
  const enableRealtime = parseBoolean(args['enable-realtime'], 'enable-realtime');
  if (!enableRealtime && realtimeNotificationMode !== 'dedicated') {
    throw new Error('PDCF_SHARED_REALTIME_REQUIRES_REALTIME');
  }
  return {
    host,
    port: parsePositiveInteger(args.port ?? '3410', 'port'),
    arm: requireString(args, 'arm', 'physical-db-idle-30s'),
    runPurpose: requireRunPurpose(requireString(args, 'run-purpose')),
    cloneId: requireCloneId(requireString(args, 'clone-id')),
    mode,
    introspectionClientReleaseMode,
    manifestFile: path.resolve(requireString(args, 'manifest')),
    secretsFile: path.resolve(requireString(args, 'secrets')),
    customerCount: parsePositiveInteger(args.customers ?? '1', 'customers'),
    runtimePoolMax: parsePositiveInteger(args['runtime-pool-max'] ?? '2', 'runtime-pool-max'),
    runtimePoolMaxUses: parseRuntimePoolMaxUses(
      args['runtime-pool-max-uses'] ?? 'unlimited',
    ),
    enableRealtime,
    realtimeNotificationMode,
    realtimeCursorPollIntervalMs: parsePositiveInteger(
      args['realtime-cursor-poll-ms'] ?? '5000',
      'realtime-cursor-poll-ms',
    ),
    realtimeCursorHeartbeatIntervalMs: parsePositiveInteger(
      args['realtime-cursor-heartbeat-ms'] ?? '30000',
      'realtime-cursor-heartbeat-ms',
    ),
    expectedDatabaseContractFingerprint: optionalSha256(
      args['expected-database-contract'],
      'expected-database-contract',
    ),
    blueprintCompatibilityFingerprint: optionalSha256(
      args['blueprint-compatibility'],
      'blueprint-compatibility',
    ),
    expectedManifestSha256: optionalSha256(
      args['expected-manifest-sha256'],
      'expected-manifest-sha256',
    ),
    observabilityToken: environment.GRAPHQL_OBSERVABILITY_TOKEN ?? '',
    benchmarkRetainedHeapEnabled: parseBoolean(
      environment.GRAPHQL_CPERF_RETAINED_HEAP_ENABLED,
      'GRAPHQL_CPERF_RETAINED_HEAP_ENABLED',
    ),
  };
};

const withProcessEnvironment = async (overrides, callback) => {
  const previous = Object.fromEntries(SECURITY_ENVIRONMENT_KEYS.map((key) => [
    key,
    Object.prototype.hasOwnProperty.call(process.env, key) ? process.env[key] : undefined,
  ]));
  try {
    for (const [key, value] of Object.entries(overrides)) {
      if (value == null) delete process.env[key];
      else process.env[key] = value;
    }
    return await callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value == null) delete process.env[key];
      else process.env[key] = value;
    }
  }
};

const isLoopbackRequest = (request) => {
  const address = request.socket?.remoteAddress ?? '';
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
};

const bearerToken = (request) => {
  const value = request.get('authorization');
  return value?.startsWith('Bearer ') ? value.slice('Bearer '.length) : '';
};

const tokenEqual = (left, right) => {
  if (!left || !right) return false;
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length
    && crypto.timingSafeEqual(leftBytes, rightBytes);
};

const canonicalJson = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`
    ).join(',')}}`;
  }
  return JSON.stringify(value);
};

const makeGraphileActivityVector = (entries) => entries.map((entry) => {
  const inflight = entry.inflight ?? 0;
  const websocketSockets = entry.websocketSockets?.size ?? 0;
  const transientHttpInFlight = inflight - websocketSockets;
  if (
    !Number.isSafeInteger(inflight)
    || inflight < 0
    || !Number.isSafeInteger(websocketSockets)
    || websocketSockets < 0
    || transientHttpInFlight < 0
  ) {
    throw new Error(`PDCF_GRAPHILE_ACTIVITY_ACCOUNTING_INVALID:${entry.cacheKey}`);
  }
  return {
    buildContract: entry.cacheKey,
    inflight,
    websocketSockets,
    transientHttpInFlight,
  };
}).sort((left, right) => left.buildContract.localeCompare(right.buildContract));

const counterValue = (value, label) => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`PDCF_RETAINED_MEMORY_COUNTER_INVALID:${label}`);
  }
  return value;
};

const makeRetainedMemoryGuard = (state) => {
  const residentBuildContracts = [...state.residentBuildContracts].sort();
  const graphileActivityByBuildContract = [
    ...(state.graphileActivityByBuildContract ?? []),
  ].sort((left, right) => left.buildContract.localeCompare(right.buildContract));
  const realtime = state.realtime ?? {};
  const cacheCounters = state.cacheCounters ?? {};
  const graphileWebsocketSockets = graphileActivityByBuildContract.reduce(
    (sum, entry) => sum + entry.websocketSockets,
    0,
  );
  const graphileTransientHttpInFlight = graphileActivityByBuildContract.reduce(
    (sum, entry) => sum + entry.transientHttpInFlight,
    0,
  );
  const httpRequestsOutstanding =
    counterValue(cacheCounters.httpRequestsStarted, 'httpRequestsStarted')
    - counterValue(cacheCounters.httpRequestsCompleted, 'httpRequestsCompleted');
  const websocketUpgradesOutstanding =
    counterValue(cacheCounters.websocketUpgradesStarted, 'websocketUpgradesStarted')
    - counterValue(cacheCounters.websocketUpgradesCompleted, 'websocketUpgradesCompleted');
  const realtimeConnectionsExpected = counterValue(
    realtime.connectionsExpected,
    'realtime.connectionsExpected',
  );
  const realtimeConnectionsActive = counterValue(
    realtime.connectionsActive,
    'realtime.connectionsActive',
  );
  const realtimeConnectionsAccepted = counterValue(
    realtime.connectionsAccepted,
    'realtime.connectionsAccepted',
  );
  const realtimeConnectionDrops = counterValue(
    realtime.connectionDrops,
    'realtime.connectionDrops',
  );
  const realtimeConnectionErrors = counterValue(
    realtime.connectionErrors,
    'realtime.connectionErrors',
  );
  const realtimeManagersExpected = counterValue(
    realtime.managersExpected,
    'realtime.managersExpected',
  );
  const realtimeManagersActive = counterValue(
    realtime.managersActive,
    'realtime.managersActive',
  );
  const realtimePerSurface = realtime.connectionsPerSurface ?? [];
  const activityContractsExact =
    graphileActivityByBuildContract.length === residentBuildContracts.length
    && graphileActivityByBuildContract.every(
      (entry, index) => entry.buildContract === residentBuildContracts[index],
    );
  const realtimeSocketsExactPerContract = realtimeConnectionsExpected === 0
    ? graphileActivityByBuildContract.every((entry) => entry.websocketSockets === 0)
    : realtimeConnectionsExpected === graphileActivityByBuildContract.length
      && graphileActivityByBuildContract.every((entry) => entry.websocketSockets === 1);
  const realtimePerSurfaceExact = realtimePerSurface.length === realtimeConnectionsExpected
    && realtimePerSurface.every((surface) =>
      surface.accepted === 1
      && surface.active === 1
      && surface.peakActive === 1
      && surface.drops === 0
      && surface.errors === 0
    );
  const realtimeResident =
    realtimeManagersExpected === realtimeConnectionsExpected
    && realtimeManagersActive === realtimeManagersExpected
    && realtimeConnectionsAccepted === realtimeConnectionsExpected
    && realtimeConnectionsActive === realtimeConnectionsExpected
    && realtimeConnectionDrops === 0
    && realtimeConnectionErrors === 0
    && graphileWebsocketSockets === realtimeConnectionsExpected
    && realtimeSocketsExactPerContract
    && websocketUpgradesOutstanding === graphileWebsocketSockets
    && realtimePerSurfaceExact;
  const handlerAccountingExact =
    activityContractsExact
    && httpRequestsOutstanding === graphileTransientHttpInFlight
    && websocketUpgradesOutstanding === graphileWebsocketSockets;
  const normalizedState = {
    ...state,
    residentBuildContracts,
    graphileActivityByBuildContract,
  };
  return {
    pid: state.pid,
    graphileInFlight: state.graphileInFlight,
    residentBuildContracts,
    graphileActivityByBuildContract,
    graphileTransientHttpInFlight,
    graphileWebsocketSockets,
    activityContractsExact,
    httpRequestsOutstanding,
    websocketUpgradesOutstanding,
    handlerAccountingExact,
    realtimeConnectionsExpected,
    realtimeConnectionsActive,
    realtimeResident,
    stateSha256: `sha256:${crypto.createHash('sha256')
      .update(canonicalJson(normalizedState))
      .digest('hex')}`,
    state: normalizedState,
  };
};

const retainedMemoryGuardErrors = (guard) => {
  const errors = [];
  if (guard.graphileInFlight !== 0) {
    errors.push(`PDCF_RETAINED_MEMORY_IN_FLIGHT:${guard.graphileInFlight}`);
  }
  if (!guard.handlerAccountingExact) {
    errors.push(
      `PDCF_RETAINED_MEMORY_HANDLER_ACCOUNTING_MISMATCH:`
      + `${guard.httpRequestsOutstanding}:${guard.graphileTransientHttpInFlight}:`
      + `${guard.websocketUpgradesOutstanding}:${guard.graphileWebsocketSockets}`
    );
  }
  if (!guard.realtimeResident) {
    errors.push(
      `PDCF_RETAINED_MEMORY_REALTIME_NOT_RESIDENT:`
      + `${guard.graphileWebsocketSockets}:${guard.realtimeConnectionsActive}:`
      + `${guard.realtimeConnectionsExpected}`
    );
  }
  return errors;
};

const memoryRange = (samples, field) => {
  const values = samples.map((sample) => sample[field]);
  return Math.max(...values) - Math.min(...values);
};

const memoryConvergenceThreshold = (samples, field) => Math.max(
  MIB,
  Math.ceil(Math.max(...samples.map((sample) => sample[field])) * 0.0025),
);

const collectRetainedMemoryCheckpoint = async ({
  forceGc,
  readMemory = () => process.memoryUsage(),
  readGuard,
  monotonicNow = () => process.hrtime.bigint(),
  yieldTurn = () => new Promise((resolve) => setImmediate(resolve)),
  rounds = RETAINED_MEMORY_GC_ROUNDS,
}) => {
  if (typeof forceGc !== 'function') {
    throw new Error('PDCF_RETAINED_MEMORY_GC_UNAVAILABLE');
  }
  if (!Number.isSafeInteger(rounds) || rounds < 5 || rounds > 8) {
    throw new Error('PDCF_RETAINED_MEMORY_GC_ROUNDS_INVALID');
  }
  const guardBefore = readGuard();
  const beforeErrors = retainedMemoryGuardErrors(guardBefore);
  if (beforeErrors.length > 0) throw new Error(beforeErrors[0]);
  const samples = [];
  for (let index = 0; index < rounds; index++) {
    forceGc();
    await yieldTurn();
    const memory = readMemory();
    samples.push({
      timestamp: new Date().toISOString(),
      monotonicNs: String(monotonicNow()),
      heapUsedBytes: memory.heapUsed,
      externalBytes: memory.external,
      arrayBuffersBytes: memory.arrayBuffers,
      rssBytes: memory.rss,
    });
  }
  const guardAfter = readGuard();
  const stableSamples = samples.slice(-RETAINED_MEMORY_STABLE_SAMPLES);
  const heapSpreadBytes = memoryRange(stableSamples, 'heapUsedBytes');
  const externalSpreadBytes = memoryRange(stableSamples, 'externalBytes');
  const heapThresholdBytes = memoryConvergenceThreshold(
    stableSamples,
    'heapUsedBytes',
  );
  const externalThresholdBytes = memoryConvergenceThreshold(
    stableSamples,
    'externalBytes',
  );
  const errors = [];
  errors.push(...retainedMemoryGuardErrors(guardAfter));
  if (guardBefore.pid !== guardAfter.pid) {
    errors.push('PDCF_RETAINED_MEMORY_PID_CHANGED');
  }
  if (guardBefore.stateSha256 !== guardAfter.stateSha256) {
    errors.push('PDCF_RETAINED_MEMORY_RESIDENCY_OR_COUNTERS_CHANGED');
  }
  if (heapSpreadBytes > heapThresholdBytes) {
    errors.push(
      `PDCF_RETAINED_HEAP_NOT_CONVERGED:${heapSpreadBytes}:${heapThresholdBytes}`
    );
  }
  if (externalSpreadBytes > externalThresholdBytes) {
    errors.push(
      `PDCF_RETAINED_EXTERNAL_NOT_CONVERGED:${externalSpreadBytes}:${externalThresholdBytes}`
    );
  }
  return {
    version: 1,
    fixture: 'physical-database-density-v1',
    pid: guardBefore.pid,
    gcRounds: rounds,
    stableSampleCount: RETAINED_MEMORY_STABLE_SAMPLES,
    stable: errors.length === 0,
    samples,
    guardBefore,
    guardAfter,
    errors,
  };
};

const authorizeRetainedMemoryCheckpoint = (request, options) =>
  options.benchmarkRetainedHeapEnabled === true
  && isLoopbackRequest(request)
  && tokenEqual(bearerToken(request), options.observabilityToken);

const classifyDatabaseScope = (present, controlDatabase, fixtureDatabases) => {
  const expected = new Set([controlDatabase, ...fixtureDatabases]);
  const unexpected = present.filter((database) => !expected.has(database));
  const presentSet = new Set(present);
  const missingFixture = fixtureDatabases.filter((database) => !presentSet.has(database));
  return {
    dedicated: unexpected.length === 0 && missingFixture.length === 0,
    databasesPresent: present.length,
    fixtureDatabasesExpected: fixtureDatabases.length,
    fixtureDatabasesPresent: fixtureDatabases.length - missingFixture.length,
    unexpectedDatabases: unexpected.length,
    missingFixtureDatabases: missingFixture.length,
    unexpectedDatabaseSetSha256: unexpected.length === 0
      ? null
      : `sha256:${crypto.createHash('sha256').update(unexpected.join('\0')).digest('hex')}`,
  };
};

const aggregateRuntimePoolStats = (children, requestedMaxUses) => {
  const childStats = children.map(({ child }) => child.runtimePoolStats());
  const identitiesUnique = childStats.every((stats) => stats?.identitiesUnique === true);
  const runtimePoolObjects = children.flatMap(({ child }) =>
    typeof child.runtimePoolObjects === 'function'
      ? child.runtimePoolObjects()
      : []
  );
  const effectiveKnown = childStats.every((stats) =>
    stats?.effectiveMaxUsesKnown === true
  );
  const effectiveValues = effectiveKnown
    ? [...new Set(childStats.map((stats) => stats.effectiveMaxUses))]
    : [];
  const effectiveMaxUsesKnown = effectiveValues.length === 1;
  const effectiveMaxUses = effectiveMaxUsesKnown ? effectiveValues[0] : null;
  const expectedPools = childStats.reduce(
    (sum, stats) => sum + (Number.isSafeInteger(stats?.expectedPools) ? stats.expectedPools : 0),
    0,
  );
  const observedPools = childStats.reduce(
    (sum, stats) => sum + (Number.isSafeInteger(stats?.observedPools) ? stats.observedPools : 0),
    0,
  );
  const poolObjectsUnique = childStats.every((stats) => stats?.poolObjectsUnique === true)
    && runtimePoolObjects.length === expectedPools
    && runtimePoolObjects.every(Boolean)
    && new Set(runtimePoolObjects).size === runtimePoolObjects.length;
  const available = childStats.length > 0
    && childStats.every((stats) =>
      stats?.scope === 'runtime-only-exact-identities'
      && stats.available === true
      && stats.identitiesUnique === true
      && stats.poolObjectsUnique === true
      && stats.requestedMaxUses === requestedMaxUses
      && stats.maxUsesExact === true
    )
    && observedPools === expectedPools
    && poolObjectsUnique
    && effectiveMaxUsesKnown;
  const sum = (key) => available
    ? childStats.reduce((total, stats) => total + stats[key], 0)
    : null;
  return {
    scope: 'runtime-only-exact-identities',
    available,
    requestedMaxUses,
    effectiveMaxUses,
    effectiveMaxUsesKnown,
    maxUsesExact: available && effectiveMaxUses === requestedMaxUses,
    identitiesUnique,
    poolObjectsUnique,
    expectedPools,
    observedPools,
    totalClients: sum('totalClients'),
    idleClients: sum('idleClients'),
    waitingClients: sum('waitingClients'),
  };
};

const runtimeEnvironmentFor = (
  environment,
  customer,
  secretResolver,
  includeNotification = false,
) => ({
  ...environment,
  PGDATABASE: customer.database,
  // Runtime maxUses is supplied through the explicit per-pool config. Keep
  // every ambient/control/notification pool on unlimited reuse.
  PG_POOL_MAX_USES: '0',
  ...Object.fromEntries(TENANTS.flatMap((tenant) => [
    [`CTF_RUNTIME_${tenant.id.toUpperCase()}_PGUSER`, customer.roles[tenant.id]],
    [
      `CTF_RUNTIME_${tenant.id.toUpperCase()}_PGPASSWORD`,
      secretResolver.runtimePasswordFor(customer.roles[tenant.id]),
    ],
  ])),
  ...(includeNotification ? {
    CTF_NOTIFICATION_PGUSER: customer.notificationRole,
    CTF_NOTIFICATION_PGPASSWORD:
      secretResolver.notificationPasswordFor(customer.notificationRole),
  } : {}),
});

const completeServerOptionsFor = (options, customer, environment) => ({
  ...completeServer.parseServerOptions([
    '--host', options.host,
    '--port', String(options.port),
    '--arm', options.arm,
    '--mode', options.mode,
    '--introspection-client-release-mode', options.introspectionClientReleaseMode,
    '--runtime-pool-max', String(options.runtimePoolMax),
    '--runtime-pool-max-uses', options.runtimePoolMaxUses == null
      ? 'unlimited'
      : String(options.runtimePoolMaxUses),
    '--enable-realtime', String(options.enableRealtime),
    '--realtime-notification-mode', options.realtimeNotificationMode,
    '--realtime-cursor-poll-ms', String(options.realtimeCursorPollIntervalMs),
    '--realtime-cursor-heartbeat-ms',
    String(options.realtimeCursorHeartbeatIntervalMs),
    ...(options.realtimeNotificationMode === 'shared-exact' ? [
      '--notification-role', customer.notificationRole,
    ] : []),
    ...TENANTS.flatMap((tenant) => [
      `--${tenant.runtimeRoleArgument}`,
      customer.roles[tenant.id],
    ]),
  ], environment),
  runPurpose: options.runPurpose,
  cloneId: options.cloneId,
  provisionCustomerId: customer.id,
  provisionAttestation: customer.provisionAttestation,
});

const createPhysicalDatabaseServer = async (options, environment = process.env) => {
  if (
    options.benchmarkRetainedHeapEnabled
    && typeof global.gc !== 'function'
  ) {
    throw new Error('PDCF_RETAINED_MEMORY_REQUIRES_EXPOSE_GC');
  }
  if (options.expectedManifestSha256) {
    const actual = `sha256:${crypto.createHash('sha256')
      .update(fs.readFileSync(options.manifestFile))
      .digest('hex')}`;
    if (actual !== options.expectedManifestSha256) {
      throw new Error('PDCF_EXPECTED_MANIFEST_SHA256_MISMATCH');
    }
  }
  const { manifest, secretResolver } = loadProvision(
    options.manifestFile,
    options.secretsFile,
  );
  const provisionClone = assertProvisionCloneManifest(manifest, options);
  if (
    options.expectedDatabaseContractFingerprint
    && manifest.canonicalDatabaseContractFingerprint
      !== options.expectedDatabaseContractFingerprint
  ) {
    throw new Error('PDCF_EXPECTED_DATABASE_CONTRACT_MISMATCH');
  }
  if (options.customerCount !== manifest.customers.length) {
    throw new Error(
      `PDCF_CUSTOMER_COUNT_MUST_EQUAL_PROVISIONED:${options.customerCount}:${manifest.customers.length}`
    );
  }
  if (
    options.enableRealtime
    && options.realtimeNotificationMode === 'dedicated'
    && options.runtimePoolMax < 2
  ) {
    throw new Error('PDCF_REALTIME_REQUIRES_RUNTIME_POOL_MAX_2');
  }
  const customers = manifest.customers.slice(0, options.customerCount);
  const verifiedContracts = new Map(customers.map((customer) => {
    const contract = options.runPurpose === 'hostile-preflight'
      ? assertCustomerContract(customer, inspectCustomerContract({
        customer,
        canonicalSchemas: manifest.canonicalSchemas,
        environment,
      }))
      : {
        structuralFingerprints: customer.structuralFingerprints,
        databaseContractFingerprint: customer.databaseContractFingerprint,
      };
    return [customer.id, {
      ...contract,
      verification: options.runPurpose === 'hostile-preflight'
        ? 'live-recomputed'
        : 'provision-manifest',
    }];
  }));
  const children = [];
  for (const customer of customers) {
    const childEnvironment = runtimeEnvironmentFor(
      environment,
      customer,
      secretResolver,
      options.realtimeNotificationMode === 'shared-exact',
    );
    const childOptions = completeServerOptionsFor(options, customer, childEnvironment);
    const processOverrides = Object.fromEntries(SECURITY_ENVIRONMENT_KEYS.map((key) => [
      key,
      childEnvironment[key],
    ]));
    const child = await withProcessEnvironment(processOverrides, () =>
      completeServer.createFixtureServer(childOptions, childEnvironment)
    );
    children.push({ customer, child });
  }

  const express = require(path.join(REPO_ROOT, 'graphql/server/node_modules/express'));
  const { Pool } = require(path.join(REPO_ROOT, 'graphql/server/node_modules/pg'));
  const { getDebugMemorySnapshot } = requireBuilt(
    'graphql/server/dist/diagnostics/debug-memory-snapshot.js'
  );
  const {
    getGraphileRealtimeRoleAuditStats,
    deleteGraphileCacheEntry,
    getCacheCounters,
    graphileCache,
  } = requireBuilt('graphile/graphile-cache/dist/index.js');
  const { getInFlightCount } = requireBuilt(
    'graphql/server/dist/middleware/graphile.js'
  );
  const { getGraphileGovernorCounters } = requireBuilt(
    'graphql/server/dist/middleware/graphile-build-governor.js'
  );
  const { getGraphileBuildStats } = requireBuilt(
    'graphql/server/dist/middleware/observability/graphile-build-stats.js'
  );
  const {
    getPgCacheStats,
    getPgNotificationBrokerStats,
  } = requireBuilt('postgres/pg-cache/dist/index.js');
  const pgEnv = require(path.join(REPO_ROOT, 'graphql/server/node_modules/pg-env'));
  const controlConfig = pgEnv.getPgEnvOptions({
    database: environment.PGDATABASE ?? 'postgres',
  });
  const observerPool = new Pool({
    host: controlConfig.host,
    port: Number(controlConfig.port),
    database: controlConfig.database,
    user: controlConfig.user,
    password: controlConfig.password,
    application_name: 'cperf-physical-database-observer',
    max: 1,
    idleTimeoutMillis: 0,
    connectionTimeoutMillis: 5_000,
  });
  observerPool.on('error', () => undefined);

  const realtimeConnections = createRealtimeConnectionRegistry(
    options.enableRealtime
      ? customers.flatMap((customer) => TENANTS.map((tenant) =>
        `${customer.id}:${tenant.id}`
      ))
      : []
  );
  let httpServer = null;
  let closing = false;
  let retainedMemoryCheckpointRunning = false;

  const cacheEntries = () => [...graphileCache.values()];
  const realtimeStats = () => {
    const entries = cacheEntries();
    const connections = realtimeConnections.snapshot();
    const notificationBrokers = getPgNotificationBrokerStats();
    const notificationRoleAudits = getGraphileRealtimeRoleAuditStats();
    return {
      managersExpected: connections.connectionsExpected,
      managersActive: entries.filter((entry) => entry.realtimeManager?.isRunning).length,
      ...connections,
      // Compatibility names consumed by the v3 scorer. These now describe
      // server-side accepted connections, never client objects in this process.
      transportsExpected: connections.connectionsExpected,
      transportsActive: connections.connectionsActive,
      transportErrors: connections.connectionErrors > 0
        ? ['PDCF_REALTIME_SERVER_CONNECTION_ERROR']
        : [],
      notificationMode: options.realtimeNotificationMode,
      notificationBrokers,
      notificationRoleAudits,
    };
  };

  const poolStats = () => aggregateRuntimePoolStats(
    children,
    options.runtimePoolMaxUses,
  );

  const buildContractFingerprintForLiveIdentity = (cacheKey) => {
    const matches = children
      .map(({ child }) => child.buildContractFingerprintForLiveIdentity(cacheKey))
      .filter(Boolean);
    if (matches.length !== 1) {
      throw new Error(`PDCF_BUILD_CONTRACT_EVIDENCE_MAPPING_INVALID:${matches.length}`);
    }
    return matches[0];
  };

  const contractEvidence = () => ({
    version: 1,
    credentialFree: true,
    liveIdentityScope: 'process-local-keyed-hmac-v1',
    customers: Object.fromEntries(children.map(({ customer, child }) => [
      customer.id,
      child.contractEvidence(),
    ])),
    residentGraphileBuildFingerprints: [...graphileCache.keys()]
      .map(buildContractFingerprintForLiveIdentity)
      .sort(),
  });

  const retainedMemoryGuard = () => {
    const residentBuildContracts = [...graphileCache.keys()].sort();
    const residentBuildContractFingerprints = residentBuildContracts
      .map(buildContractFingerprintForLiveIdentity)
      .sort();
    const graphileActivityByBuildContract = makeGraphileActivityVector(cacheEntries());
    const graphileTransientHttpInFlight = graphileActivityByBuildContract.reduce(
      (sum, entry) => sum + entry.transientHttpInFlight,
      0,
    );
    const graphileBuildsInFlight = getInFlightCount();
    const builds = getGraphileBuildStats();
    const pgCacheStats = getPgCacheStats();
    const realtime = realtimeStats();
    return makeRetainedMemoryGuard({
      pid: process.pid,
      // Long-lived GraphQL WebSocket sockets are the expected resident state,
      // so only build work and transient HTTP handlers block a full-GC sample.
      graphileInFlight: graphileBuildsInFlight + graphileTransientHttpInFlight,
      graphileBuildsInFlight,
      graphileTransientHttpInFlight,
      graphileActivityByBuildContract,
      residentBuildContracts,
      residentBuildContractFingerprints,
      cacheCounters: getCacheCounters(),
      governorCounters: getGraphileGovernorCounters(),
      buildCounters: {
        started: builds.started,
        succeeded: builds.succeeded,
        failed: builds.failed,
      },
      pgCacheMonotonicCounters: {
        capacityEvictions: pgCacheStats.capacityEvictions,
        capacityRefusals: pgCacheStats.capacityRefusals,
        disposalFailures: pgCacheStats.disposalFailures,
      },
      realtime: {
        managersExpected: realtime.managersExpected,
        managersActive: realtime.managersActive,
        connectionsExpected: realtime.connectionsExpected,
        connectionsAccepted: realtime.connectionsAccepted,
        connectionsActive: realtime.connectionsActive,
        connectionDrops: realtime.connectionDrops,
        connectionErrors: realtime.connectionErrors,
        connectionsPerSurface: realtime.connectionsPerSurface,
      },
    });
  };

  const backendStats = async () => {
    const result = await observerPool.query(`
      SELECT datname,
             COALESCE(state, 'unknown') AS state,
             count(*)::integer AS count
      FROM pg_catalog.pg_stat_activity
      WHERE backend_type = 'client backend'
        AND datname = ANY($1::text[])
      GROUP BY datname, COALESCE(state, 'unknown')
      ORDER BY datname, state
    `, [customers.map((customer) => customer.database)]);
    const byDatabase = Object.fromEntries(customers.map((customer) => [
      customer.database,
      { total: 0, active: 0, idle: 0, idleInTransaction: 0, other: 0 },
    ]));
    for (const row of result.rows) {
      const state = byDatabase[row.datname];
      if (!state) continue;
      state.total += row.count;
      if (row.state === 'active') state.active += row.count;
      else if (row.state === 'idle') state.idle += row.count;
      else if (row.state === 'idle in transaction') state.idleInTransaction += row.count;
      else state.other += row.count;
    }
    return {
      total: Object.values(byDatabase).reduce((sum, value) => sum + value.total, 0),
      active: Object.values(byDatabase).reduce((sum, value) => sum + value.active, 0),
      idle: Object.values(byDatabase).reduce((sum, value) => sum + value.idle, 0),
      idleInTransaction: Object.values(byDatabase)
        .reduce((sum, value) => sum + value.idleInTransaction, 0),
      other: Object.values(byDatabase).reduce((sum, value) => sum + value.other, 0),
      byDatabase,
      observerExcluded: true,
    };
  };

  const databaseScope = async () => {
    const result = await observerPool.query(`
      SELECT datname
      FROM pg_catalog.pg_database
      WHERE NOT datistemplate
      ORDER BY datname
    `);
    const present = result.rows.map((row) => row.datname);
    const fixtureDatabases = customers.map((customer) => customer.database);
    return classifyDatabaseScope(present, controlConfig.database, fixtureDatabases);
  };

  const assertRealtimeResident = () => {
    const realtime = realtimeStats();
    if (realtime.managersActive !== realtime.managersExpected) {
      throw new Error(
        `PDCF_REALTIME_MANAGERS_NOT_READY:${realtime.managersActive}:${realtime.managersExpected}`
      );
    }
    if (options.realtimeNotificationMode === 'shared-exact') {
      const expectedBrokers = customers.length;
      const expectedLeases = customers.length * TENANTS.length;
      const brokers = realtime.notificationBrokers;
      const audits = realtime.notificationRoleAudits;
      if (
        brokers.brokers !== expectedBrokers
        || brokers.listenerConnections !== expectedBrokers
        || brokers.leases !== expectedLeases
        || brokers.topics !== expectedLeases
        || brokers.subscribers !== expectedLeases
        || brokers.queueOverflows !== 0
        || brokers.fatalFailures !== 0
        || audits.identities !== expectedBrokers
        || audits.healthy !== expectedBrokers
        || audits.failed !== 0
        || audits.stale !== 0
        || audits.catalogAuditAttempts < expectedLeases
        || audits.catalogAuditFailures !== 0
        || audits.activeDatabaseTargets !== expectedBrokers
        || audits.databaseConfigurationConflicts !== 0
      ) {
        throw new Error(
          `PDCF_SHARED_REALTIME_NOT_EXACT:${JSON.stringify({ brokers, audits })}`
        );
      }
    }
    realtimeConnections.assertResident();
    return realtime;
  };

  const app = express();
  app.disable('x-powered-by');

  app.get('/healthz', (_request, response) => {
    response.json({
      status: 'ok',
      fixture: 'physical-database-density-v1',
      customers: customers.length,
      physicalDatabases: customers.length,
    });
  });

  app.get('/debug/memory', async (request, response) => {
    if (!isLoopbackRequest(request)) {
      response.status(404).send('Not found');
      return;
    }
    if (
      environment.NODE_ENV !== 'development'
      && !tokenEqual(bearerToken(request), options.observabilityToken)
    ) {
      response.status(401).json({ error: { code: 'PDCF_OBSERVABILITY_UNAUTHORIZED' } });
      return;
    }
    try {
      const [backends, containerScope] = await Promise.all([
        backendStats(),
        databaseScope(),
      ]);
      response.json({
        ...getDebugMemorySnapshot(),
        physicalDatabaseFixture: {
          fixture: 'physical-database-density-v1',
          customers: customers.length,
          physicalDatabases: customers.length,
          canonicalStructuralFingerprint:
            manifest.canonicalStructuralFingerprint?.combined?.sha256 ?? null,
          canonicalDatabaseContractFingerprint:
            manifest.canonicalDatabaseContractFingerprint ?? null,
          blueprintCompatibilityFingerprint:
            options.blueprintCompatibilityFingerprint,
          pools: poolStats(),
          contractEvidence: contractEvidence(),
          backends,
          containerScope,
          realtime: realtimeStats(),
        },
      });
    } catch (error) {
      response.status(503).json({
        error: {
          code: 'PDCF_TELEMETRY_UNAVAILABLE',
          message: error instanceof Error ? error.message : String(error),
        },
      });
    }
  });

  app.post('/__cperf/post-warmup', async (request, response) => {
    if (
      !isLoopbackRequest(request)
      || !tokenEqual(bearerToken(request), options.observabilityToken)
    ) {
      response.status(404).send('Not found');
      return;
    }
    try {
      // The perf-harness process owns and verifies graphql-ws clients. This
      // measured process only proves its managers and accepted inbound sockets
      // are resident at the exact warm boundary.
      response.json({ ok: true, realtime: assertRealtimeResident() });
    } catch (error) {
      response.status(503).json({
        error: {
          code: 'PDCF_REALTIME_NOT_RESIDENT',
          message: error instanceof Error ? error.message : String(error),
        },
      });
    }
  });

  app.post('/__cperf/retained-memory-checkpoint', async (request, response) => {
    if (!authorizeRetainedMemoryCheckpoint(request, options)) {
      response.status(404).send('Not found');
      return;
    }
    if (retainedMemoryCheckpointRunning) {
      response.status(409).json({
        error: { code: 'PDCF_RETAINED_MEMORY_CHECKPOINT_RUNNING' },
      });
      return;
    }
    retainedMemoryCheckpointRunning = true;
    try {
      const checkpoint = await collectRetainedMemoryCheckpoint({
        forceGc: global.gc,
        readGuard: retainedMemoryGuard,
      });
      response.status(checkpoint.stable ? 200 : 503).json(checkpoint);
    } catch (error) {
      response.status(503).json({
        error: {
          code: error instanceof Error
            ? error.message.split(':', 1)[0]
            : 'PDCF_RETAINED_MEMORY_CHECKPOINT_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      });
    } finally {
      retainedMemoryCheckpointRunning = false;
    }
  });

  app.get('/__physical/status', async (request, response) => {
    if (!isLoopbackRequest(request)) {
      response.status(404).send('Not found');
      return;
    }
    try {
      const liveAttestations = await Promise.all(children.map(({ child }) =>
        child.readProvisionAttestation()
      ));
      const attestedCustomers = customers.map((customer, index) => ({
        ...customer,
        provisionAttestation: liveAttestations[index],
      }));
      if (
        provisionAttestationSetSha256(attestedCustomers)
        !== provisionClone.attestationSetSha256
      ) {
        throw new Error('PDCF_LIVE_PROVISION_ATTESTATION_SET_MISMATCH');
      }
      response.json({
        version: 1,
        fixture: 'physical-database-density-v1',
        arm: options.arm,
        runPurpose: options.runPurpose,
        cloneId: options.cloneId,
        provisionClone: {
          ...provisionClone,
          verified: true,
        },
        introspectionMode: options.mode,
        introspectionClientReleaseMode: options.introspectionClientReleaseMode,
        runtimePoolMax: options.runtimePoolMax,
        runtimePoolMaxUses: options.runtimePoolMaxUses,
        runtimePools: poolStats(),
        contractEvidence: contractEvidence(),
        customers: customers.map((customer, index) => {
          const contract = verifiedContracts.get(customer.id);
          return {
            id: customer.id,
            physicalDatabase: customer.database,
            provisionAttestation: liveAttestations[index],
            structuralFingerprints: contract.structuralFingerprints,
            canonicalStructuralFingerprint:
              contract.structuralFingerprints?.combined?.sha256 ?? null,
            databaseContractFingerprint: contract.databaseContractFingerprint ?? null,
            contractVerification: contract.verification,
          };
        }),
        canonicalStructuralFingerprint:
          manifest.canonicalStructuralFingerprint ?? null,
        canonicalDatabaseContractFingerprint:
          manifest.canonicalDatabaseContractFingerprint ?? null,
        blueprintCompatibilityFingerprint: options.blueprintCompatibilityFingerprint,
        retainedMemoryCheckpoint: {
          enabled: options.benchmarkRetainedHeapEnabled,
          gcExposed: typeof global.gc === 'function',
        },
        realtime: realtimeStats(),
      });
    } catch (error) {
      response.status(503).json({
        error: {
          code: error instanceof Error
            ? error.message.split(':', 1)[0]
            : 'PDCF_STATUS_ATTESTATION_FAILED',
        },
      });
    }
  });

  for (const { customer, child } of children) {
    app.use(`/customer/${customer.id}`, child.app);
  }

  let upgradeListener = null;
  const listen = () => new Promise((resolve, reject) => {
    httpServer = app.listen(options.port, options.host, () => resolve(httpServer));
    httpServer.once('error', reject);
    if (options.enableRealtime) {
      upgradeListener = (request, socket, head) => {
        const rawUrl = request.url ?? '';
        const route = matchPhysicalUpgradeRoute(rawUrl);
        const child = route
          ? children.find(({ customer }) => customer.id === route.customerId)
          : null;
        if (!child) {
          socket.destroy();
          return;
        }
        void child.child.handleUpgrade(request, socket, head, {
          pathPrefix: `/customer/${child.customer.id}`,
        }).then((handled) => {
          if (handled) {
            realtimeConnections.trackAccepted(
              `${route.customerId}:${route.tenantId}`,
              socket
            );
          } else if (!socket.destroyed) socket.destroy();
        }).catch(() => socket.destroy());
      };
      httpServer.on('upgrade', upgradeListener);
    }
  });

  const close = async () => {
    if (closing) return;
    closing = true;
    if (httpServer && upgradeListener) httpServer.off('upgrade', upgradeListener);
    if (httpServer?.listening) {
      await new Promise((resolve) => httpServer.close(resolve));
    }
    // Dispose every customer's realtime manager while its pool is still live.
    // Each child owns the process-global pool registry, so allowing the first
    // child close to tear it down would strand later managers on ended pools.
    await Promise.all([...graphileCache.keys()].map((key) =>
      deleteGraphileCacheEntry(key)
    ));
    for (const { child } of children) await child.close();
    await observerPool.end();
  };

  return {
    app,
    children,
    close,
    customers,
    listen,
    options,
    realtimeStats,
    assertRealtimeResident,
  };
};

const main = async () => {
  const options = parseServerOptions(process.argv.slice(2));
  const server = await createPhysicalDatabaseServer(options);
  await server.listen();
  process.stdout.write(`${JSON.stringify({
    status: 'ready',
    fixture: 'physical-database-density-v1',
    host: options.host,
    port: options.port,
    arm: options.arm,
    customers: server.customers.length,
  })}\n`);
  let stopping = false;
  const shutdown = async (code) => {
    if (stopping) return;
    stopping = true;
    await server.close();
    process.exitCode = code;
  };
  process.once('SIGTERM', () => void shutdown(0));
  process.once('SIGINT', () => void shutdown(130));
};

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  authorizeRetainedMemoryCheckpoint,
  assertCustomerContract,
  assertProvisionCloneManifest,
  aggregateRuntimePoolStats,
  collectRetainedMemoryCheckpoint,
  completeServerOptionsFor,
  classifyDatabaseScope,
  createRealtimeConnectionRegistry,
  createPhysicalDatabaseServer,
  makeGraphileActivityVector,
  makeRetainedMemoryGuard,
  matchPhysicalUpgradeCustomer,
  matchPhysicalUpgradeRoute,
  parseServerOptions,
  parseRuntimePoolMaxUses,
  runtimeEnvironmentFor,
  tokenEqual,
};
