'use strict';

const { execFileSync, spawn } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const {
  DEFAULT_IDLE_ARMS,
  DENSITY_TUNING_ARMS,
  FIXTURE_DIR,
  PROCESS_GLOBAL_POOL_MAX,
  REPO_ROOT,
  atomicWriteJson,
  loadProvision,
  makeCacheCapacityProofByHeapMiB,
  makeFleet,
  makePlan,
  cursorHeartbeatMsForArm,
  cursorPollMsForArm,
  notificationModeForArm,
  preparedStatementCacheSizeForArm,
  runtimePoolMaxForArm,
  runtimePoolMaxUsesForArm,
  validateCustomerCountMatrix,
} = require('./lib.cjs');
const {
  TENANTS,
  parseArgs,
  parsePositiveInteger,
  requireString,
} = require('../complete-tenant-fixture/lib.cjs');
const completeFixtureServer = require('../complete-tenant-fixture/server.cjs');
const { validateCacheCalibration } = require('./cache-calibration.cjs');
const {
  captureContainerTemplate,
  inspectDockerContainer,
} = require('./prepare-measurement-run.cjs');

const loadRealtimeDriver = () => require(path.join(
  REPO_ROOT,
  'packages/perf-harness/dist/realtime.js',
)).createRealtimeDriver;

const fileSha256 = (file) => crypto.createHash('sha256')
  .update(fs.readFileSync(file))
  .digest('hex');

const expectedHeapLimitBytes = (heapMiB) => {
  const output = execFileSync(process.execPath, [
    `--max-old-space-size=${heapMiB}`,
    '-e',
    'process.stdout.write(String(require("node:v8").getHeapStatistics().heap_size_limit))',
  ], {
    encoding: 'utf8',
    env: { ...process.env, NODE_OPTIONS: '' },
  }).trim();
  const value = Number(output);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`PDCF_EXPECTED_HEAP_LIMIT_INVALID:${heapMiB}:${output}`);
  }
  return value;
};

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [
    key,
    canonicalize(value[key]),
  ]));
};

const sha256Canonical = (value) => `sha256:${crypto.createHash('sha256')
  .update(JSON.stringify(canonicalize(value)))
  .digest('hex')}`;

const makeArmPreflightEnvironment = (arm, environment = process.env) => {
  const armEnvironment = { ...environment };
  armEnvironment.PG_POOL_IDLE_TIMEOUT_MS = String(arm.idleTimeoutMs);
  armEnvironment.PG_POOL_MAX = String(PROCESS_GLOBAL_POOL_MAX);
  // Keep process-global and notification pools reusable. The exact runtime
  // pool gets its arm-specific maxUses through the explicit server option.
  armEnvironment.PG_POOL_MAX_USES = '0';
  // This child receives the secret-file path and control-plane credentials.
  // Ambient preloads and module-resolution paths may execute unreviewed code
  // before the fixture can enforce its own boundary, so fail closed here.
  armEnvironment.NODE_OPTIONS = '';
  delete armEnvironment.NODE_PATH;
  const preparedStatementCacheSize = preparedStatementCacheSizeForArm(arm);
  if (preparedStatementCacheSize == null) {
    delete armEnvironment.DATAPLAN_PG_PREPARED_STATEMENT_CACHE_SIZE;
  } else {
    armEnvironment.DATAPLAN_PG_PREPARED_STATEMENT_CACHE_SIZE =
      String(preparedStatementCacheSize);
  }
  return armEnvironment;
};

const V8_PROFILE_FLAGS = Object.freeze({
  stock: Object.freeze([]),
  'optimize-for-size': Object.freeze(['--optimize-for-size']),
  'baseline-optimize-for-size': Object.freeze([
    '--max-opt=1',
    '--optimize-for-size',
  ]),
  'jitless-optimize-for-size': Object.freeze([
    '--jitless',
    '--optimize-for-size',
  ]),
});

const v8FlagsForArm = (arm) => {
  const profile = arm.v8Profile ?? 'stock';
  const flags = V8_PROFILE_FLAGS[profile];
  if (!flags) throw new Error(`PDCF_V8_PROFILE_INVALID:${profile}`);
  return [...flags];
};

const makeArmPreflightArgs = ({
  arm,
  port,
  manifestFile,
  secretsFile,
  customerCount,
  mode,
  provisionClone,
}) => [
  '--manifest', manifestFile,
  '--secrets', secretsFile,
  '--customers', String(customerCount),
  '--host', '127.0.0.1',
  '--port', String(port),
  '--arm', arm.name,
  '--mode', mode,
  '--introspection-client-release-mode', 'destroy',
  '--runtime-pool-max', String(runtimePoolMaxForArm(arm)),
  '--runtime-pool-max-uses', runtimePoolMaxUsesForArm(arm) == null
    ? 'unlimited'
    : String(runtimePoolMaxUsesForArm(arm)),
  '--realtime-notification-mode', notificationModeForArm(arm),
  '--realtime-cursor-poll-ms', String(cursorPollMsForArm(arm)),
  '--realtime-cursor-heartbeat-ms', String(cursorHeartbeatMsForArm(arm)),
  '--enable-realtime', 'true',
  '--run-purpose', provisionClone.purpose,
  '--clone-id', provisionClone.id,
];

const waitForArmPreflightReady = ({
  child,
  arm,
  port,
  customerCount,
  timeoutMs = 600_000,
}) => new Promise((resolve, reject) => {
  let buffer = '';
  let settled = false;
  const finish = (error, value) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    child.off('error', onError);
    child.off('exit', onExit);
    child.stdout?.off('data', onData);
    child.stdout?.resume();
    if (error) reject(error);
    else resolve(value);
  };
  const onError = () => finish(new Error(
    `PDCF_PREFLIGHT_CHILD_SPAWN_FAILED:${arm.name}`
  ));
  const onExit = (code, signal) => finish(new Error(
    `PDCF_PREFLIGHT_CHILD_EXITED_BEFORE_READY:${arm.name}:${code ?? 'signal'}:${signal ?? 'none'}`
  ));
  const onData = (chunk) => {
    buffer += chunk.toString('utf8');
    if (buffer.length > 64 * 1024) {
      finish(new Error(`PDCF_PREFLIGHT_CHILD_READY_OUTPUT_EXCEEDED:${arm.name}`));
      return;
    }
    let newline = buffer.indexOf('\n');
    while (newline >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) {
        let message;
        try {
          message = JSON.parse(line);
        } catch {
          message = null;
        }
        if (message?.status === 'ready') {
          if (
            message.fixture !== 'physical-database-density-v1'
            || message.host !== '127.0.0.1'
            || message.port !== port
            || message.arm !== arm.name
            || message.customers !== customerCount
          ) {
            finish(new Error(`PDCF_PREFLIGHT_CHILD_READY_INVALID:${arm.name}`));
          } else {
            finish(null, message);
          }
          return;
        }
      }
      newline = buffer.indexOf('\n');
    }
  };
  const timer = setTimeout(() => finish(new Error(
    `PDCF_PREFLIGHT_CHILD_READY_TIMEOUT:${arm.name}:${timeoutMs}`
  )), timeoutMs);
  timer.unref?.();
  child.once('error', onError);
  child.once('exit', onExit);
  child.stdout?.on('data', onData);
});

const waitForChildExit = (child, timeoutMs) => {
  if (child.exitCode != null || child.signalCode != null) {
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = (exited) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.off('exit', onExit);
      resolve(exited);
    };
    const onExit = () => finish(true);
    const timer = setTimeout(() => finish(false), timeoutMs);
    timer.unref?.();
    child.once('exit', onExit);
  });
};

const terminateArmPreflightChild = async ({
  child,
  arm,
  timeoutMs = 15_000,
}) => {
  if (child.exitCode != null || child.signalCode != null) return;
  child.kill('SIGTERM');
  if (await waitForChildExit(child, timeoutMs)) return;
  child.kill('SIGKILL');
  if (!await waitForChildExit(child, timeoutMs)) {
    throw new Error(`PDCF_PREFLIGHT_CHILD_TERMINATION_TIMEOUT:${arm.name}`);
  }
};

const startArmPreflightChild = async ({
  arm,
  port,
  manifestFile,
  secretsFile,
  customerCount,
  mode,
  provisionClone,
  environment = process.env,
  entryFile = path.join(FIXTURE_DIR, 'server.cjs'),
  spawnImpl = spawn,
  readinessTimeoutMs,
}) => {
  const armEnvironment = makeArmPreflightEnvironment(arm, environment);
  const child = spawnImpl(process.execPath, [
    ...v8FlagsForArm(arm),
    '--expose-gc',
    entryFile,
    ...makeArmPreflightArgs({
      arm,
      port,
      manifestFile,
      secretsFile,
      customerCount,
      mode,
      provisionClone,
    }),
  ], {
    cwd: REPO_ROOT,
    env: armEnvironment,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stderr?.resume();
  try {
    await waitForArmPreflightReady({
      child,
      arm,
      port,
      customerCount,
      timeoutMs: readinessTimeoutMs,
    });
    return child;
  } catch (error) {
    await terminateArmPreflightChild({ child, arm });
    throw error;
  }
};

const parseIntegerList = (value, label) => {
  const values = value.split(',').map((item) => parsePositiveInteger(item.trim(), label));
  if (values.length === 0 || new Set(values).size !== values.length) {
    throw new Error(`PDCF_INVALID_LIST:${label}`);
  }
  return values.sort((left, right) => left - right);
};

const parseTenantCountsByHeapMiB = (value, heapMiB) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('PDCF_TENANT_COUNTS_BY_HEAP_REQUIRED');
  }
  const result = {};
  for (const entry of value.split(';')) {
    const separator = entry.indexOf(':');
    if (separator <= 0 || separator === entry.length - 1) {
      throw new Error('PDCF_TENANT_COUNTS_BY_HEAP_INVALID');
    }
    const heap = parsePositiveInteger(entry.slice(0, separator).trim(), 'tenant-count-heap');
    const key = String(heap);
    if (result[key]) throw new Error(`PDCF_TENANT_COUNTS_BY_HEAP_DUPLICATE:${heap}`);
    result[key] = parseIntegerList(
      entry.slice(separator + 1),
      `tenant-counts-${heap}`,
    );
  }
  const configured = new Set(heapMiB.map(String));
  if (
    Object.keys(result).length !== configured.size
    || Object.keys(result).some((heap) => !configured.has(heap))
  ) {
    throw new Error('PDCF_TENANT_COUNTS_BY_HEAP_COVERAGE_INVALID');
  }
  return result;
};

const validateChildStatus = (status, { arm, customer, mode }) => {
  const expectedMaxUses = runtimePoolMaxUsesForArm(arm);
  const expectedPreparedStatementCacheSize = preparedStatementCacheSizeForArm(arm);
  const expectedPreparedNamedQueries = expectedPreparedStatementCacheSize === 0
    ? 0
    : expectedPreparedStatementCacheSize + 1;
  const expectedPreparedFirstEviction = expectedPreparedStatementCacheSize === 0
    ? null
    : expectedPreparedStatementCacheSize;
  if (
    status?.version !== 1
    || status.fixture !== 'complete-tenant-abc-v1'
    || status.arm !== arm.name
    || status.introspectionMode !== mode
    || status.introspectionClientReleaseMode !== 'destroy'
    || status.releaseBuildStateAfterValidation !== true
    || status.physicalDatabase !== customer.database
    || status.runtimePoolMax !== runtimePoolMaxForArm(arm)
    || status.runtimePoolMaxUses !== expectedMaxUses
    || status.runtimePools?.scope !== 'runtime-only-exact-identities'
    || status.runtimePools?.available !== true
    || status.runtimePools?.requestedMaxUses !== expectedMaxUses
    || status.runtimePools?.effectiveMaxUsesKnown !== true
    || status.runtimePools?.effectiveMaxUses !== expectedMaxUses
    || status.runtimePools?.maxUsesExact !== true
    || status.runtimePools?.identitiesUnique !== true
    || status.runtimePools?.poolObjectsUnique !== true
    || status.runtimePools?.expectedPools !== TENANTS.length
    || status.runtimePools?.observedPools !== TENANTS.length
    || status.preparedStatementCache?.requestedSize
      !== expectedPreparedStatementCacheSize
    || status.preparedStatementCache?.effectiveSize
      !== expectedPreparedStatementCacheSize
    || status.preparedStatementCache?.environmentValue
      !== String(expectedPreparedStatementCacheSize)
    || status.preparedStatementCache?.environmentCanonical !== true
    || status.preparedStatementCache?.attestation
      !== completeFixtureServer.PREPARED_STATEMENT_ATTESTATION_KIND
    || status.preparedStatementCache?.effectiveSizeKnown !== true
    || status.preparedStatementCache?.exact !== true
    || status.preparedStatementCache?.namedQueriesObserved
      !== expectedPreparedNamedQueries
    || status.preparedStatementCache?.firstEvictionAfterNamedQueries
      !== expectedPreparedFirstEviction
    || status.enableRealtime !== true
    || status.realtimeNotificationMode !== notificationModeForArm(arm)
    || status.realtimeCursorPollIntervalMs !== cursorPollMsForArm(arm)
    || status.realtimeCursorHeartbeatIntervalMs !== cursorHeartbeatMsForArm(arm)
    || status.runtimeSafety?.passed !== true
    || status.liveIdentityScope !== 'process-local-keyed-hmac-v1'
    || !/^graphile-configuration:ctf:v1:[a-f0-9]{64}$/.test(
      status.configurationIdentity ?? ''
    )
    || status.contractEvidence?.version !== 1
    || status.contractEvidence?.credentialFree !== true
    || status.contractEvidence?.configurationIdentity
      !== status.configurationIdentity
    || !/^sha256:[a-f0-9]{64}$/.test(status.runtimeArtifactFingerprint ?? '')
  ) {
    throw new Error(`PDCF_PREFLIGHT_STATUS_INVALID:${arm.name}:${customer.id}`);
  }
  if (
    notificationModeForArm(arm) === 'shared-exact'
    && !String(status.realtimeListenerIdentity ?? '')
      .startsWith('pg-notification-broker:v1:pg:v1:')
  ) {
    throw new Error(
      `PDCF_PREFLIGHT_LISTENER_IDENTITY_INVALID:${arm.name}:${customer.id}`
    );
  }
  for (const tenantId of ['a', 'b', 'c']) {
    if (!String(status.runtimePoolIdentities?.[tenantId] ?? '').startsWith('pg:v1:')) {
      throw new Error(`PDCF_PREFLIGHT_POOL_IDENTITY_INVALID:${arm.name}:${customer.id}:${tenantId}`);
    }
    if (!String(status.buildContracts?.[tenantId] ?? '').startsWith('graphile:v1:')) {
      throw new Error(`PDCF_PREFLIGHT_BUILD_CONTRACT_INVALID:${arm.name}:${customer.id}:${tenantId}`);
    }
    const poolEvidence = status.contractEvidence?.runtimePools?.[tenantId];
    const buildEvidence = status.contractEvidence?.graphileBuilds?.[tenantId];
    const binding = status.runtimeBindings?.[tenantId];
    if (
      !/^pg-contract-evidence:v1:[a-f0-9]{64}$/.test(
        poolEvidence?.fingerprint ?? ''
      )
      || !/^graphile-contract-evidence:v1:[a-f0-9]{64}$/.test(
        buildEvidence?.fingerprint ?? ''
      )
      || poolEvidence?.input?.databaseName !== customer.database
      || poolEvidence?.input?.role !== customer.roles?.[tenantId]
      || binding?.databaseName !== customer.database
      || binding?.role !== customer.roles?.[tenantId]
      || JSON.stringify(binding?.schemas) !== JSON.stringify([`ctf_${tenantId}`])
    ) {
      throw new Error(
        `PDCF_PREFLIGHT_CONTRACT_EVIDENCE_INVALID:${arm.name}:${customer.id}:${tenantId}`
      );
    }
    if (status.realtimeSchemas?.[tenantId] !== `ctf_${tenantId}_realtime`) {
      throw new Error(`PDCF_PREFLIGHT_REALTIME_SCHEMA_INVALID:${arm.name}:${customer.id}:${tenantId}`);
    }
    const expectedDependencies = [
      ...completeFixtureServer.RUNTIME_DEPENDENCY_SCHEMAS,
      `ctf_${tenantId}_realtime`,
    ];
    if (
      JSON.stringify(status.runtimeSafety?.dependencySchemasByTenant?.[tenantId])
      !== JSON.stringify(expectedDependencies)
    ) {
      throw new Error(
        `PDCF_PREFLIGHT_RUNTIME_DEPENDENCIES_INVALID:${arm.name}:${customer.id}:${tenantId}`
      );
    }
  }
  if (new Set(Object.values(status.runtimePoolIdentities)).size !== TENANTS.length) {
    throw new Error(`PDCF_PREFLIGHT_POOL_IDENTITIES_NOT_UNIQUE:${arm.name}:${customer.id}`);
  }
  return status;
};

const assertUniqueRuntimePoolIdentities = ({ statuses, customers, arm }) => {
  const identities = customers.flatMap((customer) =>
    Object.values(statuses?.[customer.id]?.runtimePoolIdentities ?? {})
  );
  if (
    identities.length !== customers.length * TENANTS.length
    || new Set(identities).size !== identities.length
  ) {
    throw new Error(`PDCF_PREFLIGHT_POOL_IDENTITIES_NOT_UNIQUE:${arm.name}`);
  }
};

const assertRepresentativeSharedRealtime = ({
  before,
  after,
  driverSnapshot,
  arm,
  customer,
}) => {
  const expectedContracts = Object.values(before.buildContracts).sort();
  const residentContracts = [...(after.residentBuildContracts ?? [])].sort();
  const buildCounts = after.builds?.byTenant ?? {};
  if (
    driverSnapshot?.expected !== TENANTS.length
    || driverSnapshot.active !== TENANTS.length
    || driverSnapshot.verified !== TENANTS.length
    || driverSnapshot.errors?.length !== 0
    || JSON.stringify(residentContracts) !== JSON.stringify(expectedContracts)
    || TENANTS.some((tenant) => buildCounts[tenant.id] !== 1)
  ) {
    throw new Error(
      `PDCF_SHARED_REALTIME_PREFLIGHT_INCOMPLETE:${arm.name}:${customer.id}`
    );
  }
  return {
    customerId: customer.id,
    surfacesBuilt: expectedContracts.length,
    subscriptionsActive: driverSnapshot.active,
    subscriptionsVerified: driverSnapshot.verified,
    residentBuildContracts: residentContracts,
  };
};

const verifyRepresentativeSharedRealtime = async ({
  arm,
  port,
  customer,
  status,
  fetchImpl = fetch,
  createRealtimeDriver = loadRealtimeDriver(),
}) => {
  const oneCustomerFleet = makeFleet({
    manifest: { customers: [customer] },
    statuses: { [arm.name]: { [customer.id]: status } },
    arms: [arm],
    port,
  });
  const tenants = oneCustomerFleet.tenants.map((tenant) => ({
    ...tenant,
    surfaces: tenant.surfaces.map((surface) => ({
      ...surface,
      url: surface.url.replace('{port}', String(port)),
    })),
  }));
  const driver = createRealtimeDriver(tenants, {
    concurrency: TENANTS.length,
    timeoutMs: 120_000,
  });
  try {
    await driver.startAndVerify();
    driver.assertHealthy();
    const response = await fetchImpl(
      `http://127.0.0.1:${port}/customer/${customer.id}/__ctf/status`
    );
    if (!response.ok) {
      throw new Error(
        `PDCF_SHARED_REALTIME_PREFLIGHT_STATUS_HTTP:${arm.name}:${response.status}`
      );
    }
    const after = await response.json();
    return assertRepresentativeSharedRealtime({
      before: status,
      after,
      driverSnapshot: driver.snapshot(),
      arm,
      customer,
    });
  } finally {
    await driver.dispose();
  }
};

const makeBlueprintCompatibility = ({
  manifest,
  statuses,
  mode,
  arms = DEFAULT_IDLE_ARMS,
}) => {
  const expectedCanonicalSchemas = [
    'ctf_extensions',
    ...TENANTS.flatMap((tenant) => [
      tenant.schema,
      completeFixtureServer.realtimeSchemaFor(tenant),
    ]),
    'jwt_private',
  ];
  if (JSON.stringify(manifest.canonicalSchemas) !== JSON.stringify(expectedCanonicalSchemas)) {
    throw new Error('PDCF_CANONICAL_SCHEMA_CLOSURE_MISMATCH');
  }
  const canonicalDatabaseContractFingerprint = manifest.canonicalDatabaseContractFingerprint;
  if (!/^sha256:[a-f0-9]{64}$/.test(canonicalDatabaseContractFingerprint ?? '')) {
    throw new Error('PDCF_CANONICAL_DATABASE_CONTRACT_REQUIRED');
  }
  if (manifest.customers.some(
    (customer) => customer.databaseContractFingerprint
      !== canonicalDatabaseContractFingerprint
  )) {
    throw new Error('PDCF_DATABASE_CONTRACT_MANIFEST_MISMATCH');
  }
  for (const arm of arms.filter(
    (candidate) => notificationModeForArm(candidate) === 'shared-exact'
  )) {
    const representative = manifest.customers[0];
    const evidence = statuses?.[arm.name]?.[representative.id]
      ?.sharedRealtimePreflight;
    if (
      evidence?.customerId !== representative.id
      || evidence.surfacesBuilt !== TENANTS.length
      || evidence.subscriptionsActive !== TENANTS.length
      || evidence.subscriptionsVerified !== TENANTS.length
      || !Array.isArray(evidence.residentBuildContracts)
      || evidence.residentBuildContracts.length !== TENANTS.length
    ) {
      throw new Error(`PDCF_SHARED_REALTIME_PREFLIGHT_REQUIRED:${arm.name}`);
    }
  }
  const runtimeArtifactFingerprints = new Set(Object.values(statuses).flatMap(
    (armStatuses) => Object.values(armStatuses).map(
      (status) => status.runtimeArtifactFingerprint
    )
  ));
  if (runtimeArtifactFingerprints.size !== 1) {
    throw new Error('PDCF_RUNTIME_ARTIFACT_FINGERPRINT_MISMATCH');
  }
  const runtimeArtifactFingerprint = [...runtimeArtifactFingerprints][0];
  const fixtureServerSha256 = `sha256:${fileSha256(path.join(
    FIXTURE_DIR,
    '../complete-tenant-fixture/server.cjs',
  ))}`;
  const pluginConfiguration = {
    settingsSource: 'fixture-static-no-control-plane-overrides',
    featureSettings: completeFixtureServer.FEATURE_SETTINGS,
    grafastCacheLimits: completeFixtureServer.GRAFAST_CACHE_LIMITS,
    introspectionDependencySchemas:
      completeFixtureServer.INTROSPECTION_DEPENDENCY_SCHEMAS,
    runtimeDependencySchemas: completeFixtureServer.RUNTIME_DEPENDENCY_SCHEMAS,
    introspectionMode: mode,
    introspectionClientReleaseMode: 'destroy',
    releaseBuildStateAfterValidation:
      completeFixtureServer.RELEASE_BUILD_STATE_AFTER_VALIDATION,
    runtimeProfiles: arms.map((arm) => ({
      name: arm.name,
      runtimePoolMax: runtimePoolMaxForArm(arm),
      runtimePoolMaxUses: runtimePoolMaxUsesForArm(arm),
      realtimeNotificationMode: notificationModeForArm(arm),
      realtimeCursorPollIntervalMs: cursorPollMsForArm(arm),
      realtimeCursorHeartbeatIntervalMs: cursorHeartbeatMsForArm(arm),
      preparedStatementCacheSize: preparedStatementCacheSizeForArm(arm),
      v8Profile: arm.v8Profile ?? 'stock',
    })),
    enableRealtime: true,
    tenantBindings: TENANTS.map((tenant) => ({
      id: tenant.id,
      schema: tenant.schema,
      realtimeSchema: completeFixtureServer.realtimeSchemaFor(tenant),
      databaseId: tenant.databaseId,
      apiId: tenant.apiId,
    })),
    fixtureServerSha256,
    runtimeArtifactFingerprint,
  };
  const pluginSettingsIdentity = sha256Canonical(pluginConfiguration);
  const compatibility = {
    version: 1,
    scope: 'blueprint-prerequisites-only',
    dedicatedInstancesRemainBaseline: true,
    sqlRewriteEnabled: false,
    releaseBuildStateAfterValidation:
      completeFixtureServer.RELEASE_BUILD_STATE_AFTER_VALIDATION,
    canonicalDatabaseContractFingerprint,
    canonicalSchemas: manifest.canonicalSchemas,
    pluginSettingsIdentity,
    runtimeArtifactFingerprint,
  };
  return {
    ...compatibility,
    sha256: sha256Canonical(compatibility),
  };
};

const collectArmStatuses = async ({
  arm,
  port,
  manifestFile,
  secretsFile,
  customerCount,
  mode,
  provisionClone,
  environment = process.env,
  verifySharedRealtime = verifyRepresentativeSharedRealtime,
  fetchImpl = fetch,
  entryFile,
  spawnImpl,
  readinessTimeoutMs,
  terminationTimeoutMs,
}) => {
  const { manifest } = loadProvision(manifestFile, secretsFile);
  if (
    manifest.provisionClone?.id !== provisionClone.id
    || manifest.provisionClone?.purpose !== provisionClone.purpose
  ) {
    throw new Error(`PDCF_PREFLIGHT_CLONE_MISMATCH:${arm.name}`);
  }
  const customers = manifest.customers.slice(0, customerCount);
  if (customers.length !== customerCount) {
    throw new Error(
      `PDCF_PREFLIGHT_CUSTOMER_COUNT_INVALID:${arm.name}:${customerCount}:${customers.length}`
    );
  }
  let child = null;
  try {
    child = await startArmPreflightChild({
      arm,
      port,
      manifestFile,
      secretsFile,
      customerCount,
      mode,
      provisionClone,
      environment,
      entryFile,
      spawnImpl,
      readinessTimeoutMs,
    });
    const statuses = Object.fromEntries(await Promise.all(customers.map(async (customer) => {
      const response = await fetchImpl(
        `http://127.0.0.1:${port}/customer/${customer.id}/__ctf/status`
      );
      if (!response.ok) {
        throw new Error(`PDCF_PREFLIGHT_STATUS_HTTP:${arm.name}:${customer.id}:${response.status}`);
      }
      const status = validateChildStatus(await response.json(), { arm, customer, mode });
      return [customer.id, status];
    })));
    assertUniqueRuntimePoolIdentities({ statuses, customers, arm });
    if (notificationModeForArm(arm) === 'shared-exact') {
      const customer = customers[0];
      const evidence = await verifySharedRealtime({
        arm,
        port,
        customer,
        status: statuses[customer.id],
      });
      statuses[customer.id] = {
        ...statuses[customer.id],
        sharedRealtimePreflight: evidence,
      };
    }
    return statuses;
  } finally {
    if (child) await terminateArmPreflightChild({
      child,
      arm,
      timeoutMs: terminationTimeoutMs,
    });
  }
};

const generateInputs = async ({
  manifestFile,
  secretsFile,
  outDir,
  postgresContainer,
  basePort,
  tenantCounts,
  tenantCountsByHeapMiB,
  heapMiB,
  repetitions,
  durationSec,
  mode,
  cacheCalibrationFile,
  arms = DEFAULT_IDLE_ARMS,
  environment = process.env,
  resolveHeapLimitBytes = expectedHeapLimitBytes,
  collectStatuses = collectArmStatuses,
  inspectContainer = inspectDockerContainer,
}) => {
  const { manifest } = loadProvision(manifestFile, secretsFile);
  const countMatrix = validateCustomerCountMatrix({
    tenantCounts,
    tenantCountsByHeapMiB,
    heapMiB,
  });
  const cacheCalibration = validateCacheCalibration(
    JSON.parse(fs.readFileSync(path.resolve(cacheCalibrationFile), 'utf8')),
    {
      databaseContractFingerprint: manifest.canonicalDatabaseContractFingerprint,
      introspectionMode: mode,
    },
  );
  if (Math.max(...countMatrix.all) !== manifest.customers.length) {
    throw new Error(
      `PDCF_MAX_COUNT_MANIFEST_REQUIRED:${countMatrix.all.join(',')}:${manifest.customers.length}`
    );
  }
  const maximumCustomers = Math.max(...countMatrix.all);
  if (maximumCustomers > manifest.customers.length) {
    throw new Error(
      `PDCF_COUNT_RAMP_EXCEEDS_PROVISIONED:${maximumCustomers}:${manifest.customers.length}`
    );
  }
  // Capacity is a pure, calibrated prerequisite. Resolve it before starting
  // any arm server so an impossible qualifying point cannot spend minutes on
  // database/runtime status collection before failing.
  const heapLimitBytesByHeapMiB = Object.fromEntries(heapMiB.map((value) => [
    String(value),
    resolveHeapLimitBytes(value),
  ]));
  const cacheCapacityByHeapMiB = makeCacheCapacityProofByHeapMiB({
    cacheCalibration,
    databaseContractFingerprint: manifest.canonicalDatabaseContractFingerprint,
    introspectionMode: mode,
    tenantCounts,
    tenantCountsByHeapMiB,
    heapMiB,
    heapLimitBytesByHeapMiB,
  });
  const statuses = {};
  for (let index = 0; index < arms.length; index += 1) {
    const arm = arms[index];
    statuses[arm.name] = await collectStatuses({
      arm,
      port: basePort + index,
      manifestFile,
      secretsFile,
      customerCount: maximumCustomers,
      mode,
      provisionClone: manifest.provisionClone,
      environment,
    });
  }
  const blueprintCompatibility = makeBlueprintCompatibility({
    manifest,
    statuses,
    mode,
    arms,
  });

  const pgHost = environment.PGHOST ?? 'localhost';
  const pgPort = parsePositiveInteger(
    String(environment.PGPORT ?? '5432'),
    'PGPORT',
  );
  const containerTemplate = captureContainerTemplate({
    inspection: inspectContainer(postgresContainer),
    container: postgresContainer,
    prefix: manifest.prefix,
    pgHost,
    pgPort,
    minimumMaxConnections: Math.max(
      100,
      maximumCustomers * TENANTS.length * 3 + 16,
    ),
  });
  const containerTemplateFile = path.join(outDir, 'postgres-container-template.json');
  atomicWriteJson(containerTemplateFile, containerTemplate);
  const containerTemplateSha256 = `sha256:${fileSha256(containerTemplateFile)}`;

  const entryFile = path.join(FIXTURE_DIR, 'server.cjs');
  const lockfile = path.join(REPO_ROOT, 'pnpm-lock.yaml');
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  }).trim();
  const fleet = makeFleet({ manifest, statuses, arms, port: basePort });
  const plan = makePlan({
    manifestFile: path.resolve(manifestFile),
    secretsFile: path.resolve(secretsFile),
    postgresContainer,
    commit,
    entrySha256: fileSha256(entryFile),
    lockfileSha256: fileSha256(lockfile),
    arms,
    basePort,
    heapMiB,
    tenantCounts,
    tenantCountsByHeapMiB,
    repetitions,
    durationSec,
    introspectionMode: mode,
    databaseContractFingerprint:
      blueprintCompatibility.canonicalDatabaseContractFingerprint,
    blueprintCompatibilityFingerprint: blueprintCompatibility.sha256,
    manifestSha256: `sha256:${fileSha256(manifestFile)}`,
    provisionClone: manifest.provisionClone,
    cacheCalibration,
    heapLimitBytesByHeapMiB,
    cacheCapacityByHeapMiB,
    postgresContainerTemplateFile: path.resolve(containerTemplateFile),
    postgresContainerTemplateSha256: containerTemplateSha256,
  });
  const fleetFile = path.join(outDir, 'fleet.json');
  const planFile = path.join(outDir, 'plan.json');
  const preflightFile = path.join(outDir, 'preflight-status.json');
  atomicWriteJson(fleetFile, fleet);
  atomicWriteJson(planFile, plan);
  atomicWriteJson(preflightFile, {
    version: 1,
    fixture: 'physical-database-density-v1',
    canonicalStructuralFingerprint:
      manifest.canonicalStructuralFingerprint?.combined?.sha256 ?? null,
    canonicalDatabaseContractFingerprint:
      manifest.canonicalDatabaseContractFingerprint ?? null,
    blueprintCompatibility,
    cacheCalibration,
    heapLimitBytesByHeapMiB,
    cacheCapacityByHeapMiB,
    statuses,
  });
  return {
    containerTemplateFile,
    fleet,
    fleetFile,
    plan,
    planFile,
    preflightFile,
  };
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const armProfile = requireString(args, 'arm-profile', 'idle');
  const arms = armProfile === 'idle'
    ? DEFAULT_IDLE_ARMS
    : armProfile === 'density-tuning'
      ? DENSITY_TUNING_ARMS
      : null;
  if (!arms) throw new Error(`PDCF_ARM_PROFILE_INVALID:${armProfile}`);
  const manifestFile = path.resolve(requireString(args, 'manifest'));
  const secretsFile = path.resolve(requireString(args, 'secrets'));
  const outDir = path.resolve(requireString(
    args,
    'out-dir',
    path.join(FIXTURE_DIR, '.local', 'inputs'),
  ));
  const heapMiB = parseIntegerList(
    requireString(args, 'heaps', '1024,2048,4096'),
    'heaps',
  );
  const tenantCountsByHeapMiB = args['tenant-counts-by-heap-mib'] == null
    ? undefined
    : parseTenantCountsByHeapMiB(
      requireString(args, 'tenant-counts-by-heap-mib'),
      heapMiB,
    );
  const tenantCounts = args['tenant-counts'] == null
    ? undefined
    : parseIntegerList(requireString(args, 'tenant-counts'), 'tenant-counts');
  if ((tenantCounts == null) === (tenantCountsByHeapMiB == null)) {
    throw new Error('PDCF_EXACTLY_ONE_TENANT_COUNT_MODE_REQUIRED');
  }
  const result = await generateInputs({
    manifestFile,
    secretsFile,
    outDir,
    postgresContainer: requireString(args, 'postgres-container'),
    basePort: parsePositiveInteger(args['base-port'] ?? '3410', 'base-port'),
    tenantCounts,
    tenantCountsByHeapMiB,
    heapMiB,
    repetitions: parsePositiveInteger(args.repetitions ?? '3', 'repetitions'),
    durationSec: parsePositiveInteger(args['duration-sec'] ?? '900', 'duration-sec'),
    mode: requireString(args, 'mode', 'scoped-required'),
    cacheCalibrationFile: path.resolve(requireString(args, 'cache-calibration')),
    arms,
  });
  process.stdout.write(`${JSON.stringify({
    status: 'generated',
    fleetFile: result.fleetFile,
    planFile: result.planFile,
    preflightFile: result.preflightFile,
    containerTemplateFile: result.containerTemplateFile,
  })}\n`);
};

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  collectArmStatuses,
  assertUniqueRuntimePoolIdentities,
  assertRepresentativeSharedRealtime,
  generateInputs,
  parseIntegerList,
  parseTenantCountsByHeapMiB,
  makeBlueprintCompatibility,
  expectedHeapLimitBytes,
  sha256Canonical,
  makeArmPreflightArgs,
  makeArmPreflightEnvironment,
  startArmPreflightChild,
  terminateArmPreflightChild,
  validateChildStatus,
  v8FlagsForArm,
  verifyRepresentativeSharedRealtime,
};
