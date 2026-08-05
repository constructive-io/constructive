'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const { TENANTS } = require('./lib.cjs');
const {
  provisionAttestationSha256: provisionerAttestationSha256,
} = require('../physical-database-density/provision.cjs');

const {
  INSTALLED_RUNTIME_ARTIFACT_SPECS,
  PREPARED_STATEMENT_ATTESTATION_KIND,
  RELEASE_BUILD_STATE_AFTER_VALIDATION,
  RUNTIME_ARTIFACT_PATHS,
  credentialFreeContractEvidence,
  fixtureConfigurationIdentity,
  hostileControlEnabledFor,
  installedRuntimeArtifactManifest,
  makeRuntimePoolStats,
  matchTenantUpgradePath,
  parseRuntimePoolMaxUses,
  parseServerOptions,
  preparedResetBackendEvidence,
  preparedStatementCacheRequestFromEnvironment,
  provisionAttestationSha256,
  realtimeSchemaFor,
  resolvedLocalRuntimeArtifactManifest,
  runtimeArtifactManifest,
  runtimeArtifactFingerprint,
  runtimeDependencySchemasFor,
  runtimePoolContractEvidence,
  timingSafeTokenEqual,
} = require('./server.cjs');

const environment = () => ({
  CTF_RUNTIME_A_PGPASSWORD: 'runtime-a-value',
  CTF_RUNTIME_B_PGPASSWORD: 'runtime-b-value',
  CTF_RUNTIME_C_PGPASSWORD: 'runtime-c-value',
});

const roleArgs = (roles = ['ctf_runtime_a', 'ctf_runtime_b', 'ctf_runtime_c']) => [
  '--runtime-role-a', roles[0],
  '--runtime-role-b', roles[1],
  '--runtime-role-c', roles[2],
];

test('server accepts only loopback with three distinct credentialed runtime roles', () => {
  const options = parseServerOptions([
    '--host', '127.0.0.1',
    '--port', '3392',
    '--mode', 'stock',
    ...roleArgs(),
  ], environment());
  assert.deepEqual(options.runtimeRoles, {
    a: 'ctf_runtime_a',
    b: 'ctf_runtime_b',
    c: 'ctf_runtime_c',
  });
  assert.equal(options.port, 3392);
  assert.equal(options.mode, 'stock');
  assert.equal(options.introspectionClientReleaseMode, 'destroy');
  assert.equal(options.runtimePoolMax, 1);
  assert.equal(options.runtimePoolMaxUses, null);
  assert.equal(options.enableRealtime, false);
  const serialized = JSON.stringify(options);
  assert.doesNotMatch(serialized, /runtime-[abc]-value/);

  assert.throws(
    () => parseServerOptions(['--host', '0.0.0.0', ...roleArgs()], environment()),
    /CTF_SERVER_LOOPBACK_REQUIRED/,
  );
  assert.throws(
    () => parseServerOptions(roleArgs(['same', 'same', 'third']), environment()),
    /CTF_RUNTIME_ROLES_MUST_BE_DISTINCT/,
  );
  assert.throws(
    () => parseServerOptions(roleArgs(), {
      CTF_RUNTIME_A_PGPASSWORD: 'only-one',
    }),
    /CTF_RUNTIME_PASSWORD_REQUIRED:CTF_RUNTIME_B_PGPASSWORD/,
  );
});

test('server accepts explicit runtime pool capacity and realtime opt-in', () => {
  const options = parseServerOptions([
    '--runtime-pool-max', '4',
    '--runtime-pool-max-uses', '1',
    '--enable-realtime',
    ...roleArgs(),
  ], environment());
  assert.equal(options.runtimePoolMax, 4);
  assert.equal(options.runtimePoolMaxUses, 1);
  assert.equal(options.enableRealtime, true);

  assert.throws(
    () => parseServerOptions(['--runtime-pool-max', '0', ...roleArgs()], environment()),
    /CTF_INVALID_POSITIVE_INTEGER:runtime-pool-max/,
  );
  assert.throws(
    () => parseServerOptions([
      '--runtime-pool-max-uses', '0',
      ...roleArgs(),
    ], environment()),
    /CTF_INVALID_MAX_USES:runtime-pool-max-uses/,
  );
  for (const value of ['01', '1e2', '0x1', ' 1', '1 ', '', true]) {
    assert.throws(
      () => parseRuntimePoolMaxUses(value),
      /CTF_INVALID_MAX_USES:runtime-pool-max-uses/,
    );
  }
  assert.throws(
    () => parseServerOptions(['--enable-realtime', 'sometimes', ...roleArgs()], environment()),
    /CTF_INVALID_BOOLEAN:enable-realtime/,
  );
  assert.throws(
    () => parseServerOptions([
      '--runtime-pool-max', '1',
      '--enable-realtime',
      ...roleArgs(),
    ], environment()),
    /CTF_REALTIME_REQUIRES_RUNTIME_POOL_MAX_2/,
  );
});

test('fixture configuration and contract evidence are deterministic and credential-free', () => {
  const input = {
    databaseName: 'ctf_customer_0001',
    mode: 'scoped-required',
    introspectionClientReleaseMode: 'destroy',
    enableRealtime: true,
    realtimeNotificationMode: 'shared-exact',
    realtimeCursorPollIntervalMs: 30_000,
    realtimeCursorHeartbeatIntervalMs: 30_000,
    runtimeFingerprint: `sha256:${'a'.repeat(64)}`,
  };
  const configurationIdentity = fixtureConfigurationIdentity(input);
  assert.match(
    configurationIdentity,
    /^graphile-configuration:ctf:v1:[a-f0-9]{64}$/,
  );
  assert.equal(fixtureConfigurationIdentity({ ...input }), configurationIdentity);
  assert.notEqual(
    fixtureConfigurationIdentity({ ...input, databaseName: 'ctf_customer_0002' }),
    configurationIdentity,
  );

  const pool = runtimePoolContractEvidence({
    databaseName: input.databaseName,
    role: 'ctf_runtime_a',
    poolMax: 1,
    poolMaxUses: null,
    runtimeFingerprint: input.runtimeFingerprint,
  });
  assert.match(pool.fingerprint, /^pg-contract-evidence:v1:[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(pool).includes('runtime-password-value'), false);
  assert.deepEqual(
    credentialFreeContractEvidence('fixture-evidence', { a: 1 }),
    credentialFreeContractEvidence('fixture-evidence', { a: 1 }),
  );
  assert.throws(
    () => fixtureConfigurationIdentity({ ...input, runtimeFingerprint: '' }),
    /CTF_CONFIGURATION_IDENTITY_INPUT_INVALID/,
  );
});

test('prepared reset PID evidence distinguishes sanitation reuse from maxUses rotation', () => {
  assert.deepEqual(preparedResetBackendEvidence(101, 101, null), {
    firstBackendPid: 101,
    secondBackendPid: 101,
    observed: 'same-client',
    expected: 'same-client',
    exact: true,
  });
  assert.deepEqual(preparedResetBackendEvidence(101, 202, 1), {
    firstBackendPid: 101,
    secondBackendPid: 202,
    observed: 'rotated-client',
    expected: 'rotated-client',
    exact: true,
  });
  assert.equal(preparedResetBackendEvidence(101, 202, null).exact, false);
  assert.equal(preparedResetBackendEvidence(101, 101, 1).exact, false);
  assert.deepEqual(preparedResetBackendEvidence(101, 202, 2), {
    firstBackendPid: 101,
    secondBackendPid: 202,
    observed: 'rotated-client',
    expected: 'unsupported',
    exact: false,
  });
});

test('runtime pool telemetry follows exact runtime identities and proves native maxUses', () => {
  const nativePool = (maxUses, totalCount, idleCount) => ({
    options: { maxUses },
    totalCount,
    idleCount,
    waitingCount: 0,
  });
  const runtimeA = nativePool(1, 0, 0);
  const runtimeB = nativePool(1, 1, 0);
  const notification = nativePool(Number.POSITIVE_INFINITY, 1, 1);
  const pgCache = {
    records: new Map([
      ['runtime-a', { pool: runtimeA }],
      ['runtime-b', { pool: runtimeB }],
      ['notification', { pool: notification }],
    ]),
  };
  assert.deepEqual(
    makeRuntimePoolStats(pgCache, ['runtime-a', 'runtime-b'], 1),
    {
      scope: 'runtime-only-exact-identities',
      available: true,
      requestedMaxUses: 1,
      effectiveMaxUses: 1,
      effectiveMaxUsesKnown: true,
      maxUsesExact: true,
      identitiesUnique: true,
      poolObjectsUnique: true,
      expectedPools: 2,
      observedPools: 2,
      totalClients: 1,
      idleClients: 0,
      waitingClients: 0,
    },
  );

  const unlimited = makeRuntimePoolStats(
    { records: new Map([['runtime', { pool: notification }]]) },
    ['runtime'],
    null,
  );
  assert.equal(unlimited.available, true);
  assert.equal(unlimited.effectiveMaxUsesKnown, true);
  assert.equal(unlimited.effectiveMaxUses, null);
  assert.equal(unlimited.maxUsesExact, true);

  const missing = makeRuntimePoolStats(pgCache, ['runtime-a', 'missing'], 1);
  assert.equal(missing.available, false);
  assert.equal(missing.observedPools, 1);
  assert.equal(missing.maxUsesExact, false);

  const duplicateIdentity = makeRuntimePoolStats(
    pgCache,
    ['runtime-a', 'runtime-a'],
    1,
  );
  assert.equal(duplicateIdentity.available, false);
  assert.equal(duplicateIdentity.identitiesUnique, false);
  assert.equal(duplicateIdentity.observedPools, 1);
  assert.equal(duplicateIdentity.maxUsesExact, false);

  const duplicatePoolObject = makeRuntimePoolStats({
    records: new Map([
      ['runtime-a', { pool: runtimeA }],
      ['runtime-b', { pool: runtimeA }],
    ]),
  }, ['runtime-a', 'runtime-b'], 1);
  assert.equal(duplicatePoolObject.available, false);
  assert.equal(duplicatePoolObject.identitiesUnique, true);
  assert.equal(duplicatePoolObject.poolObjectsUnique, false);
  assert.equal(duplicatePoolObject.observedPools, 1);
});

test('prepared statement cache request accepts only a canonical bounded integer', () => {
  assert.deepEqual(
    preparedStatementCacheRequestFromEnvironment({
      DATAPLAN_PG_PREPARED_STATEMENT_CACHE_SIZE: '0',
    }),
    {
      environmentValue: '0',
      requestedSize: 0,
      environmentCanonical: true,
    },
  );
  assert.deepEqual(preparedStatementCacheRequestFromEnvironment({}), {
    environmentValue: null,
    requestedSize: 100,
    environmentCanonical: false,
  });
  for (const value of ['01', '1e2', '-1', '10001', 'not-a-number', ' 1', '1 ']) {
    assert.throws(
      () => preparedStatementCacheRequestFromEnvironment({
        DATAPLAN_PG_PREPARED_STATEMENT_CACHE_SIZE: value,
      }),
      /CTF_PREPARED_STATEMENT_CACHE_SIZE_INVALID/,
    );
  }
});

test('prepared statement cache telemetry attests the loaded Dataplan adaptor behavior', () => {
  const serverFile = path.join(__dirname, 'server.cjs');
  const inspect = (size) => JSON.parse(execFileSync(process.execPath, ['-e', `
const fixture = require(${JSON.stringify(serverFile)});
(async () => {
  const request = fixture.preparedStatementCacheRequestFromEnvironment(process.env);
  const adaptor = fixture.loadInstalledDataplanPgAdaptor();
  const proof = await fixture.attestDataplanPreparedStatementCache(adaptor, request);
  process.stdout.write(JSON.stringify(proof));
})().catch((error) => {
  process.stderr.write(String(error && error.stack || error));
  process.exit(1);
});
`], {
    cwd: path.resolve(__dirname, '../../..'),
    encoding: 'utf8',
    env: {
      ...process.env,
      GRAPHILE_ENV: 'production',
      DATAPLAN_PG_PREPARED_STATEMENT_CACHE_SIZE: String(size),
    },
  }));

  const disabled = inspect(0);
  assert.equal(disabled.attestation, PREPARED_STATEMENT_ATTESTATION_KIND);
  assert.equal(disabled.effectiveSizeKnown, true);
  assert.equal(disabled.effectiveSize, 0);
  assert.equal(disabled.exact, true);
  assert.equal(disabled.namedQueriesObserved, 0);
  assert.equal(disabled.firstEvictionAfterNamedQueries, null);

  const bounded = inspect(3);
  assert.equal(bounded.attestation, PREPARED_STATEMENT_ATTESTATION_KIND);
  assert.equal(bounded.effectiveSizeKnown, true);
  assert.equal(bounded.effectiveSize, 3);
  assert.equal(bounded.exact, true);
  assert.equal(bounded.namedQueriesObserved, 4);
  assert.equal(bounded.firstEvictionAfterNamedQueries, 3);
});

test('shared exact realtime permits a one-client runtime pool only with a distinct listener login', () => {
  const options = parseServerOptions([
    '--runtime-pool-max', '1',
    '--enable-realtime',
    '--realtime-notification-mode', 'shared-exact',
    '--notification-role', 'ctf_notification',
    '--realtime-cursor-poll-ms', '30000',
    ...roleArgs(),
  ], {
    ...environment(),
    CTF_NOTIFICATION_PGPASSWORD: 'notification-password-value',
  });
  assert.equal(options.runtimePoolMax, 1);
  assert.equal(options.realtimeNotificationMode, 'shared-exact');
  assert.equal(options.notificationRole, 'ctf_notification');
  assert.equal(options.realtimeCursorPollIntervalMs, 30000);
  const serialized = JSON.stringify(options);
  assert.doesNotMatch(serialized, /notification-password-value/);
  assert.equal(options.takeNotificationPassword(), 'notification-password-value');
  assert.throws(
    () => options.takeNotificationPassword(),
    /CTF_NOTIFICATION_PASSWORD_ALREADY_CONSUMED/,
  );

  assert.throws(() => parseServerOptions([
    '--runtime-pool-max', '1',
    '--enable-realtime',
    '--realtime-notification-mode', 'shared-exact',
    '--notification-role', 'ctf_runtime_a',
    ...roleArgs(),
  ], {
    ...environment(),
    CTF_NOTIFICATION_PGPASSWORD: 'notification-password-value',
  }), /CTF_NOTIFICATION_ROLE_MUST_BE_DISTINCT/);
  assert.throws(() => parseServerOptions([
    '--runtime-pool-max', '1',
    '--enable-realtime',
    '--realtime-notification-mode', 'shared-exact',
    '--notification-role', 'ctf_notification',
    ...roleArgs(),
  ], environment()), /CTF_NOTIFICATION_PASSWORD_REQUIRED/);
});

test('realtime cursor schemas and runtime safety allowlists remain tenant-exact', () => {
  assert.deepEqual(TENANTS.map(realtimeSchemaFor), [
    'ctf_a_realtime',
    'ctf_b_realtime',
    'ctf_c_realtime',
  ]);

  for (const tenant of TENANTS) {
    const disabled = runtimeDependencySchemasFor(tenant, false);
    const enabled = runtimeDependencySchemasFor(tenant, true);
    assert.deepEqual(disabled, ['ctf_extensions', 'jwt_private']);
    assert.deepEqual(enabled, [
      'ctf_extensions',
      'jwt_private',
      realtimeSchemaFor(tenant),
    ]);
    for (const foreignTenant of TENANTS.filter((candidate) => candidate !== tenant)) {
      assert.ok(!enabled.includes(realtimeSchemaFor(foreignTenant)));
    }
  }
});

test('websocket upgrade paths select one exact tenant and reject ambiguous routes', () => {
  assert.equal(matchTenantUpgradePath('/tenant/a/graphql'), 'a');
  assert.equal(
    matchTenantUpgradePath(
      '/customer/physical-customer-0001/tenant/c/graphql',
      '/customer/physical-customer-0001',
    ),
    'c',
  );
  assert.equal(matchTenantUpgradePath('/tenant/a/graphql?tenant=b'), null);
  assert.equal(matchTenantUpgradePath('/tenant/a/graphql/extra'), null);
  assert.equal(matchTenantUpgradePath('/tenant/%61/graphql'), null);
  assert.equal(matchTenantUpgradePath('/tenant/a%2F..%2Fb/graphql'), null);
  assert.equal(matchTenantUpgradePath('/tenant/a/graphql', '/customer/other'), null);
  assert.equal(matchTenantUpgradePath('/tenant/a/graphql', '../customer'), null);
});

test('server rejects unknown introspection modes', () => {
  assert.throws(
    () => parseServerOptions(['--mode', 'fallback', ...roleArgs()], environment()),
    /CTF_INTROSPECTION_MODE_INVALID:fallback/,
  );
});

test('server validates the introspection-client release mode', () => {
  const options = parseServerOptions([
    '--introspection-client-release-mode', 'reuse',
    ...roleArgs(),
  ], environment());
  assert.equal(options.introspectionClientReleaseMode, 'reuse');
  assert.throws(
    () => parseServerOptions([
      '--introspection-client-release-mode', 'best-effort',
      ...roleArgs(),
    ], environment()),
    /CTF_INTROSPECTION_CLIENT_RELEASE_MODE_INVALID:best-effort/,
  );
});

test('control token comparison is exact and timing safe for equal-length values', () => {
  const token = 'a'.repeat(64);
  assert.equal(timingSafeTokenEqual(token, token), true);
  assert.equal(timingSafeTokenEqual(`${'a'.repeat(63)}b`, token), false);
  assert.equal(timingSafeTokenEqual('short', token), false);
  assert.equal(timingSafeTokenEqual('', token), false);
});

test('runtime fingerprint binds every executed built API artifact', () => {
  assert.match(runtimeArtifactFingerprint(), /^sha256:[0-9a-f]{64}$/);
  assert.equal(runtimeArtifactFingerprint(), runtimeArtifactFingerprint());
  const runtimeManifest = runtimeArtifactManifest();
  const localClosure = resolvedLocalRuntimeArtifactManifest();
  assert.equal(runtimeManifest.version, 2);
  assert.ok(localClosure.length > RUNTIME_ARTIFACT_PATHS.length);
  assert.deepEqual(runtimeManifest.localDistClosure, localClosure);
  assert.ok(localClosure.some((entry) =>
    entry.path === 'graphile/graphile-settings/dist/presets/constructive-preset.js'
  ));
  assert.ok(localClosure.some((entry) =>
    entry.path === 'graphile/graphile-search/dist/index.js'
  ));
  assert.ok(localClosure.every((entry) =>
    !path.isAbsolute(entry.path)
    && !entry.path.includes('node_modules')
    && /^sha256:[0-9a-f]{64}$/.test(entry.sha256)
  ));

  const expectedInstalledLabels = [
    'installed:@dataplan/pg:dist/index.js',
    'installed:@dataplan/pg:dist/adaptors/pg.js',
    'installed:@dataplan/pg:dist/pgServices.js',
    'installed:graphile-build-pg:dist/index.js',
    'installed:graphile-build-pg:dist/plugins/PgIntrospectionPlugin.js',
  ];
  const manifest = installedRuntimeArtifactManifest();
  assert.deepEqual(
    manifest.map((entry) => entry.label),
    expectedInstalledLabels,
  );
  assert.deepEqual(
    INSTALLED_RUNTIME_ARTIFACT_SPECS.map((entry) => entry.label),
    expectedInstalledLabels,
  );
  const installedSpecs = Object.fromEntries(
    INSTALLED_RUNTIME_ARTIFACT_SPECS.map((entry) => [entry.label, entry]),
  );
  assert.ok(installedSpecs['installed:@dataplan/pg:dist/index.js'].markers.includes(
    'exports.exactClientReleaseCapability = "dataplan-pg-exact-client-destroy-v1";',
  ));
  assert.ok(installedSpecs['installed:@dataplan/pg:dist/adaptors/pg.js'].markers.includes(
    'const supportsExactClientDestruction = typeof PgPool === "function" && pool instanceof PgPool;',
  ));
  assert.ok(installedSpecs['installed:@dataplan/pg:dist/adaptors/pg.js'].markers.includes(
    'Exact PostgreSQL client destruction requires a node-postgres Pool',
  ));
  assert.ok(installedSpecs['installed:graphile-build-pg:dist/index.js'].markers.includes(
    'exports.introspectionClientReleaseCapability = "graphile-build-pg-exact-client-destroy-v1";',
  ));
  assert.ok(manifest.every((entry) => /^sha256:[0-9a-f]{64}$/.test(entry.sha256)));
  assert.ok(manifest.every(
    (entry) => /^sha256:[0-9a-f]{64}$/.test(entry.markerSetSha256)
      && entry.markerCount > 0
  ));
  const serialized = JSON.stringify({
    specs: INSTALLED_RUNTIME_ARTIFACT_SPECS,
    manifest,
  });
  assert.equal(serialized.includes(process.cwd()), false);
  assert.doesNotMatch(serialized, /password|credential|secret|authorization|bearer/i);
});

test('provisioned measurement servers cannot enable hostile controls', () => {
  const attestation = {
    version: 1,
    cloneId: 'fixture-clone',
    purpose: 'measurement',
    sha256: `sha256:${'a'.repeat(64)}`,
  };
  assert.equal(hostileControlEnabledFor('measurement', attestation), false);
  assert.equal(hostileControlEnabledFor('hostile-preflight', {
    ...attestation,
    purpose: 'hostile-preflight',
  }), true);
  // The standalone complete fixture keeps its pre-existing local control lane;
  // physical runs always carry a database-backed attestation.
  assert.equal(hostileControlEnabledFor(undefined, null), true);
});

test('live server and provisioner compute the same context-bound attestation', () => {
  const input = {
    cloneId: 'fixture-clone',
    customerId: 'physical-customer-0001',
    database: 'pdc_fixture_db_0001',
    nonce: 'a'.repeat(64),
  };
  assert.equal(
    provisionAttestationSha256({ ...input, purpose: 'measurement' }),
    provisionerAttestationSha256({ ...input, runPurpose: 'measurement' }),
  );
});

test('complete fixture requires post-validation build-state retirement', () => {
  assert.equal(RELEASE_BUILD_STATE_AFTER_VALIDATION, true);
});
