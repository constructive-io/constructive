'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, it } = require('node:test');

const {
  DEFAULT_IDLE_ARMS,
  loadProvision,
  makeCustomers,
  makeSecretResolver,
} = require('./lib.cjs');
const {
  assertRepresentativeSharedRealtime,
  assertUniqueRuntimePoolIdentities,
  collectArmStatuses,
  generateInputs,
  makeArmPreflightEnvironment,
  makeBlueprintCompatibility,
  parseIntegerList,
  parseTenantCountsByHeapMiB,
  startArmPreflightChild,
  terminateArmPreflightChild,
  validateChildStatus,
  v8FlagsForArm,
} = require('./generate-inputs.cjs');
const {
  CALIBRATION_KIND,
  sha256Canonical,
} = require('./cache-calibration.cjs');
const {
  aggregateRuntimePoolStats,
  classifyDatabaseScope,
  matchPhysicalUpgradeCustomer,
  parseServerOptions,
  runtimeEnvironmentFor,
  tokenEqual,
} = require('./server.cjs');

const digest = (character) => `sha256:${character.repeat(64)}`;
const MIB = 1024 ** 2;

const customer = makeCustomers('pdc_test', 1)[0];
const childStatus = (armName, runtimeArtifactFingerprint = digest('a')) => ({
  version: 1,
  fixture: 'complete-tenant-abc-v1',
  arm: armName,
  introspectionMode: 'scoped-required',
  introspectionClientReleaseMode: 'destroy',
  releaseBuildStateAfterValidation: true,
  physicalDatabase: customer.database,
  runtimePoolMax: 2,
  runtimePoolMaxUses: null,
  runtimePools: {
    scope: 'runtime-only-exact-identities',
    available: true,
    requestedMaxUses: null,
    effectiveMaxUses: null,
    effectiveMaxUsesKnown: true,
    maxUsesExact: true,
    identitiesUnique: true,
    poolObjectsUnique: true,
    expectedPools: 3,
    observedPools: 3,
    totalClients: 0,
    idleClients: 0,
    waitingClients: 0,
  },
  preparedStatementCache: {
    environmentValue: '100',
    requestedSize: 100,
    environmentCanonical: true,
    attestation: 'loaded-dataplan-adaptor-behavior-v1',
    effectiveSize: 100,
    effectiveSizeKnown: true,
    exact: true,
    namedQueriesObserved: 101,
    firstEvictionAfterNamedQueries: 100,
  },
  enableRealtime: true,
  realtimeNotificationMode: 'dedicated',
  realtimeCursorPollIntervalMs: 5000,
  realtimeCursorHeartbeatIntervalMs: 30000,
  runtimeArtifactFingerprint,
  configurationIdentity: `graphile-configuration:ctf:v1:${'e'.repeat(64)}`,
  liveIdentityScope: 'process-local-keyed-hmac-v1',
  runtimePoolIdentities: {
    a: 'pg:v1:a',
    b: 'pg:v1:b',
    c: 'pg:v1:c',
  },
  buildContracts: {
    a: 'graphile:v1:a',
    b: 'graphile:v1:b',
    c: 'graphile:v1:c',
  },
  runtimeBindings: Object.fromEntries(['a', 'b', 'c'].map((tenantId) => [
    tenantId,
    {
      databaseName: customer.database,
      role: customer.roles[tenantId],
      schemas: [`ctf_${tenantId}`],
    },
  ])),
  contractEvidence: {
    version: 1,
    credentialFree: true,
    configurationIdentity: `graphile-configuration:ctf:v1:${'e'.repeat(64)}`,
    runtimePools: Object.fromEntries(['a', 'b', 'c'].map((tenantId) => [
      tenantId,
      {
        version: 1,
        fingerprint: `pg-contract-evidence:v1:${tenantId.repeat(64)}`,
        input: {
          databaseName: customer.database,
          role: customer.roles[tenantId],
        },
      },
    ])),
    graphileBuilds: Object.fromEntries(['a', 'b', 'c'].map((tenantId) => [
      tenantId,
      {
        version: 1,
        fingerprint: `graphile-contract-evidence:v1:${tenantId.repeat(64)}`,
        input: {},
      },
    ])),
  },
  realtimeSchemas: {
    a: 'ctf_a_realtime',
    b: 'ctf_b_realtime',
    c: 'ctf_c_realtime',
  },
  runtimeSafety: {
    passed: true,
    dependencySchemasByTenant: {
      a: ['ctf_extensions', 'jwt_private', 'ctf_a_realtime'],
      b: ['ctf_extensions', 'jwt_private', 'ctf_b_realtime'],
      c: ['ctf_extensions', 'jwt_private', 'ctf_c_realtime'],
    },
  },
});

const manifest = {
  version: 1,
  fixture: 'physical-database-density-v1',
  prefix: 'pdc_test',
  canonicalSchemas: [
    'ctf_extensions',
    'ctf_a',
    'ctf_a_realtime',
    'ctf_b',
    'ctf_b_realtime',
    'ctf_c',
    'ctf_c_realtime',
    'jwt_private',
  ],
  canonicalDatabaseContractFingerprint: digest('b'),
  customers: [{ ...customer, databaseContractFingerprint: digest('b') }],
};

const makeInsufficientCalibration = () => {
  const measured = {
    repetitions: 3,
    retainedHeapPerSurfaceBytes: 100 * MIB,
    serverBaselineHeapBytes: 400 * MIB,
    buildTransientHeapBytes: 400 * MIB,
    buildTransientRssBytes: 100 * MIB,
  };
  const safetyFactor = 1.25;
  const payload = {
    kind: CALIBRATION_KIND,
    databaseContractFingerprint: manifest.canonicalDatabaseContractFingerprint,
    introspectionMode: 'scoped-required',
    introspectionClientReleaseMode: 'destroy',
    releaseBuildStateAfterValidation: true,
    introspectionBackendRetirementConclusive: true,
    fixtureFingerprint: 'fixture-v1',
    schemaContract: {
      schemaSets: [['ctf_a']],
      allowedDependencySchemas: ['ctf_extensions'],
    },
    safetyFactor,
    measured,
    configured: {
      instanceHeapBytes: 125 * MIB,
      serverReserveBytes: 500 * MIB,
      buildReserveBytes: 500 * MIB,
      rssBuildReserveBytes: 125 * MIB,
    },
    sourceWorktreesClean: true,
    sources: ['1', '2', '3'].map((value) => ({
      sourceSha256: digest(value),
      sourceStateSha256: value.repeat(64),
      executedEntrySha256: value.repeat(64),
      worktreeDirty: false,
      introspectionBackendRetirement: {
        conclusive: true,
        introspectionBackendPid: Number(value),
        steadyBackendPid: Number(value) + 10,
      },
    })),
  };
  return {
    version: 2,
    ...payload,
    calibrationId: sha256Canonical(payload),
  };
};

describe('physical database density inputs', () => {
  it('maps every supported arm profile to the harness V8 flags', () => {
    assert.deepEqual(v8FlagsForArm({ v8Profile: 'stock' }), []);
    assert.deepEqual(v8FlagsForArm({ v8Profile: 'optimize-for-size' }), [
      '--optimize-for-size',
    ]);
    assert.deepEqual(v8FlagsForArm({ v8Profile: 'baseline-optimize-for-size' }), [
      '--max-opt=1',
      '--optimize-for-size',
    ]);
    assert.deepEqual(v8FlagsForArm({ v8Profile: 'jitless-optimize-for-size' }), [
      '--jitless',
      '--optimize-for-size',
    ]);
    assert.throws(
      () => v8FlagsForArm({ v8Profile: 'ambient-flags' }),
      /PDCF_V8_PROFILE_INVALID:ambient-flags/,
    );
  });

  it('preflights each arm in an isolated child and cleans up success and failure', async () => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'pdc-isolated-preflight-'));
    const entryFile = path.join(temporary, 'fake-physical-server.cjs');
    const cleanupFile = path.join(temporary, 'cleanup.log');
    const preloadFile = path.join(temporary, 'ambient-preload.cjs');
    const preloadMarker = path.join(temporary, 'ambient-preload-ran');
    const parentPreparedCache = process.env.DATAPLAN_PG_PREPARED_STATEMENT_CACHE_SIZE;
    const parentPoolMaxUses = process.env.PG_POOL_MAX_USES;
    try {
      fs.writeFileSync(entryFile, `'use strict';
const fs = require('node:fs');
const path = require('node:path');
const args = {};
for (let index = 2; index < process.argv.length; index += 2) {
  args[process.argv[index].slice(2)] = process.argv[index + 1];
}
const outputDirectory = process.env.PDCF_TEST_OUTPUT_DIRECTORY;
fs.writeFileSync(path.join(outputDirectory, args.arm + '.json'), JSON.stringify({
  preparedStatementCacheSize: process.env.DATAPLAN_PG_PREPARED_STATEMENT_CACHE_SIZE ?? null,
  processPoolMax: process.env.PG_POOL_MAX ?? null,
  processPoolMaxUses: process.env.PG_POOL_MAX_USES ?? null,
  runtimePoolMaxUses: args['runtime-pool-max-uses'],
  nodeOptions: process.env.NODE_OPTIONS ?? null,
  nodePath: process.env.NODE_PATH ?? null,
  execArgv: process.execArgv,
}));
process.once('SIGTERM', () => {
  fs.appendFileSync(path.join(outputDirectory, 'cleanup.log'), args.arm + '\\n');
  process.exit(0);
});
process.stdout.write(JSON.stringify({
  status: 'ready',
  fixture: 'physical-database-density-v1',
  host: '127.0.0.1',
  port: Number(args.port),
  arm: args.arm,
  customers: Number(args.customers),
}) + '\\n');
setInterval(() => {}, 1000);
`);
      fs.writeFileSync(preloadFile, `'use strict';
require('node:fs').writeFileSync(process.env.PDCF_TEST_PRELOAD_MARKER, 'loaded');
`);
      process.env.DATAPLAN_PG_PREPARED_STATEMENT_CACHE_SIZE = 'parent-contamination';
      process.env.PG_POOL_MAX_USES = '77';
      const stockArm = {
        name: 'isolated-stock',
        idleTimeoutMs: 1000,
        runtimePoolMax: 1,
      };
      const noPrepareArm = {
        ...stockArm,
        name: 'isolated-no-prepare',
        preparedStatementCacheSize: 0,
        runtimePoolMaxUses: 1,
        v8Profile: 'optimize-for-size',
      };
      const common = {
        manifestFile: '/not-read-by-fake/manifest.json',
        secretsFile: '/not-read-by-fake/secrets.json',
        customerCount: 1,
        mode: 'scoped-required',
        provisionClone: { id: 'measurement-clone', purpose: 'measurement' },
        environment: {
          ...process.env,
          PDCF_TEST_OUTPUT_DIRECTORY: temporary,
          PDCF_TEST_PRELOAD_MARKER: preloadMarker,
          NODE_OPTIONS: `--require=${preloadFile}`,
          NODE_PATH: '/tmp/pdc-untrusted-node-path',
          PG_POOL_MAX: '99',
        },
        entryFile,
        readinessTimeoutMs: 5000,
      };
      const stockChild = await startArmPreflightChild({
        ...common,
        arm: stockArm,
        port: 3491,
      });
      await terminateArmPreflightChild({ child: stockChild, arm: stockArm });
      const noPrepareChild = await startArmPreflightChild({
        ...common,
        arm: noPrepareArm,
        port: 3492,
      });
      await terminateArmPreflightChild({ child: noPrepareChild, arm: noPrepareArm });

      assert.deepEqual(
        JSON.parse(fs.readFileSync(path.join(temporary, 'isolated-stock.json'), 'utf8')),
        {
          preparedStatementCacheSize: '100',
          processPoolMax: '1',
          processPoolMaxUses: '0',
          runtimePoolMaxUses: 'unlimited',
          nodeOptions: '',
          nodePath: null,
          execArgv: ['--expose-gc'],
        },
      );
      assert.deepEqual(
        JSON.parse(fs.readFileSync(path.join(temporary, 'isolated-no-prepare.json'), 'utf8')),
        {
          preparedStatementCacheSize: '0',
          processPoolMax: '1',
          processPoolMaxUses: '0',
          runtimePoolMaxUses: '1',
          nodeOptions: '',
          nodePath: null,
          execArgv: ['--optimize-for-size', '--expose-gc'],
        },
      );
      assert.equal(
        process.env.DATAPLAN_PG_PREPARED_STATEMENT_CACHE_SIZE,
        'parent-contamination',
      );
      assert.equal(process.env.PG_POOL_MAX_USES, '77');
      assert.equal(fs.existsSync(preloadMarker), false);
      assert.deepEqual(
        fs.readFileSync(cleanupFile, 'utf8').trim().split('\n').sort(),
        ['isolated-no-prepare', 'isolated-stock'],
      );

      const manifestFile = path.join(temporary, 'provision.json');
      const secretsFile = path.join(temporary, 'runtime-secrets.json');
      const provisionClone = {
        version: 1,
        id: 'measurement-clone',
        purpose: 'measurement',
        attestationSetSha256: digest('e'),
      };
      fs.writeFileSync(manifestFile, JSON.stringify({ ...manifest, provisionClone }));
      fs.writeFileSync(secretsFile, JSON.stringify({
        version: 1,
        fixture: 'physical-database-density-v1',
        runtimePasswords: Object.fromEntries(Object.values(customer.roles).map(
          (role) => [role, `fixture-password-at-least-24-bytes-${role}`]
        )),
        notificationPasswords: {
          [customer.notificationRole]:
            `fixture-password-at-least-24-bytes-${customer.notificationRole}`,
        },
      }), { mode: 0o600 });
      const failingArm = { ...stockArm, name: 'isolated-fetch-failure' };
      await assert.rejects(collectArmStatuses({
        arm: failingArm,
        port: 3493,
        manifestFile,
        secretsFile,
        customerCount: 1,
        mode: 'scoped-required',
        provisionClone,
        environment: {
          ...process.env,
          PDCF_TEST_OUTPUT_DIRECTORY: temporary,
        },
        entryFile,
        readinessTimeoutMs: 5000,
        terminationTimeoutMs: 5000,
        fetchImpl: async () => {
          throw new Error('injected status failure');
        },
      }), /injected status failure/);
      assert.match(fs.readFileSync(cleanupFile, 'utf8'), /isolated-fetch-failure/);
      assert.deepEqual(
        makeArmPreflightEnvironment(noPrepareArm, {
          DATAPLAN_PG_PREPARED_STATEMENT_CACHE_SIZE: 'stale',
          NODE_OPTIONS: '--require=/tmp/ambient-preload.cjs',
          NODE_PATH: '/tmp/ambient-node-path',
          PG_POOL_MAX: '99',
          PG_POOL_MAX_USES: '99',
        }),
        {
          DATAPLAN_PG_PREPARED_STATEMENT_CACHE_SIZE: '0',
          NODE_OPTIONS: '',
          PG_POOL_IDLE_TIMEOUT_MS: '1000',
          PG_POOL_MAX: '1',
          PG_POOL_MAX_USES: '0',
        },
      );
    } finally {
      if (parentPreparedCache == null) {
        delete process.env.DATAPLAN_PG_PREPARED_STATEMENT_CACHE_SIZE;
      } else {
        process.env.DATAPLAN_PG_PREPARED_STATEMENT_CACHE_SIZE = parentPreparedCache;
      }
      if (parentPoolMaxUses == null) delete process.env.PG_POOL_MAX_USES;
      else process.env.PG_POOL_MAX_USES = parentPoolMaxUses;
      fs.rmSync(temporary, { recursive: true, force: true });
    }
  });

  it('rejects insufficient calibrated capacity before collecting arm statuses', async () => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'pdc-capacity-preflight-'));
    let statusCollectionStarted = false;
    try {
      const manifestFile = path.join(temporary, 'provision.json');
      const secretsFile = path.join(temporary, 'runtime-secrets.json');
      const calibrationFile = path.join(temporary, 'cache-calibration.json');
      fs.writeFileSync(manifestFile, JSON.stringify(manifest));
      fs.writeFileSync(secretsFile, JSON.stringify({
        version: 1,
        fixture: 'physical-database-density-v1',
        runtimePasswords: Object.fromEntries(Object.values(customer.roles).map(
          (role) => [role, `fixture-password-at-least-24-bytes-${role}`]
        )),
        notificationPasswords: {
          [customer.notificationRole]:
            `fixture-password-at-least-24-bytes-${customer.notificationRole}`,
        },
      }), { mode: 0o600 });
      fs.writeFileSync(calibrationFile, JSON.stringify(makeInsufficientCalibration()));

      await assert.rejects(generateInputs({
        manifestFile,
        secretsFile,
        outDir: path.join(temporary, 'inputs'),
        postgresContainer: 'postgres-density',
        basePort: 3410,
        tenantCounts: [1],
        heapMiB: [1024],
        repetitions: 1,
        durationSec: 5,
        mode: 'scoped-required',
        cacheCalibrationFile: calibrationFile,
        resolveHeapLimitBytes: () => 1024 * MIB,
        collectStatuses: async () => {
          statusCollectionStarted = true;
          throw new Error('status collection must not start');
        },
      }), /PDCF_CALIBRATED_CAPACITY_INSUFFICIENT:1024:1:3/);
      assert.equal(statusCollectionStarted, false);
    } finally {
      fs.rmSync(temporary, { recursive: true, force: true });
    }
  });

  it('parses only loopback server options and binds non-secret compatibility hashes', () => {
    const options = parseServerOptions([
      '--manifest', '/tmp/provision.json',
      '--secrets', '/tmp/runtime-secrets.json',
      '--host', '127.0.0.1',
      '--runtime-pool-max', '2',
      '--runtime-pool-max-uses', '1',
      '--enable-realtime', 'true',
      '--expected-database-contract', digest('b'),
      '--blueprint-compatibility', digest('c'),
      '--expected-manifest-sha256', digest('d'),
      '--run-purpose', 'measurement',
      '--clone-id', 'measurement-clone-test',
    ]);
    assert.equal(options.enableRealtime, true);
    assert.equal(options.runtimePoolMax, 2);
    assert.equal(options.runtimePoolMaxUses, 1);
    assert.equal(options.introspectionClientReleaseMode, 'destroy');
    assert.equal(options.expectedDatabaseContractFingerprint, digest('b'));
    assert.equal(options.blueprintCompatibilityFingerprint, digest('c'));
    assert.equal(options.expectedManifestSha256, digest('d'));
    assert.throws(() => parseServerOptions([
      '--manifest', '/tmp/provision.json',
      '--secrets', '/tmp/runtime-secrets.json',
      '--host', '0.0.0.0',
    ]), /PDCF_SERVER_LOOPBACK_REQUIRED/);
    assert.throws(() => parseServerOptions([
      '--manifest', '/tmp/provision.json',
      '--secrets', '/tmp/runtime-secrets.json',
      '--introspection-client-release-mode', 'best-effort',
    ]), /PDCF_INTROSPECTION_CLIENT_RELEASE_MODE_INVALID:best-effort/);
    assert.throws(() => parseServerOptions([
      '--manifest', '/tmp/provision.json',
      '--secrets', '/tmp/runtime-secrets.json',
      '--runtime-pool-max-uses', '0',
      '--run-purpose', 'measurement',
      '--clone-id', 'measurement-clone-test',
    ]), /PDCF_INVALID_MAX_USES:runtime-pool-max-uses/);
    for (const value of ['01', '1e2', '0x1', ' 1', '1 ', '']) {
      assert.throws(() => parseServerOptions([
        '--manifest', '/tmp/provision.json',
        '--secrets', '/tmp/runtime-secrets.json',
        '--runtime-pool-max-uses', value,
        '--run-purpose', 'measurement',
        '--clone-id', 'measurement-clone-test',
      ]), /PDCF_INVALID_MAX_USES:runtime-pool-max-uses/);
    }
  });

  it('maps one physical database to three exact least-privilege credentials', () => {
    const rawSecrets = {
      version: 1,
      fixture: 'physical-database-density-v1',
      runtimePasswords: Object.fromEntries(
        Object.values(customer.roles).map((role) => [role, `long-fixture-secret-${role}`])
      ),
      notificationPasswords: {
        [customer.notificationRole]: `long-fixture-secret-${customer.notificationRole}`,
      },
    };
    const secretResolver = makeSecretResolver(rawSecrets, manifest);
    const environment = runtimeEnvironmentFor(
      { PGHOST: 'fixture-host' },
      customer,
      secretResolver,
      true,
    );
    assert.equal(environment.PGDATABASE, customer.database);
    assert.equal(environment.PG_POOL_MAX_USES, '0');
    assert.equal(environment.CTF_RUNTIME_A_PGUSER, customer.roles.a);
    assert.equal(
      environment.CTF_RUNTIME_C_PGPASSWORD,
      `long-fixture-secret-${customer.roles.c}`,
    );
    assert.equal(environment.CTF_NOTIFICATION_PGUSER, customer.notificationRole);
    assert.equal(
      environment.CTF_NOTIFICATION_PGPASSWORD,
      `long-fixture-secret-${customer.notificationRole}`,
    );
    assert.equal(tokenEqual('same-token', 'same-token'), true);
    assert.equal(tokenEqual('same-token', 'different-token'), false);
    assert.doesNotMatch(JSON.stringify(secretResolver), /long-fixture-secret/);
  });

  it('aggregates only child runtime pools and preserves effective native maxUses evidence', () => {
    const runtimeStats = (overrides = {}) => ({
      scope: 'runtime-only-exact-identities',
      available: true,
      requestedMaxUses: 1,
      effectiveMaxUses: 1,
      effectiveMaxUsesKnown: true,
      maxUsesExact: true,
      identitiesUnique: true,
      poolObjectsUnique: true,
      expectedPools: 3,
      observedPools: 3,
      totalClients: 1,
      idleClients: 0,
      waitingClients: 0,
      ...overrides,
    });
    const firstPools = [{}, {}, {}];
    const secondPools = [{}, {}, {}];
    const stats = aggregateRuntimePoolStats([
      {
        child: {
          runtimePoolStats: () => runtimeStats(),
          runtimePoolObjects: () => firstPools,
        },
      },
      {
        child: {
          runtimePoolStats: () => runtimeStats({ totalClients: 2 }),
          runtimePoolObjects: () => secondPools,
        },
      },
    ], 1);
    assert.deepEqual(stats, {
      scope: 'runtime-only-exact-identities',
      available: true,
      requestedMaxUses: 1,
      effectiveMaxUses: 1,
      effectiveMaxUsesKnown: true,
      maxUsesExact: true,
      identitiesUnique: true,
      poolObjectsUnique: true,
      expectedPools: 6,
      observedPools: 6,
      totalClients: 3,
      idleClients: 0,
      waitingClients: 0,
    });

    const mismatch = aggregateRuntimePoolStats([
      {
        child: {
          runtimePoolStats: () => runtimeStats({
            effectiveMaxUses: null,
            maxUsesExact: false,
          }),
          runtimePoolObjects: () => [{}, {}, {}],
        },
      },
    ], 1);
    assert.equal(mismatch.available, false);
    assert.equal(mismatch.maxUsesExact, false);
    assert.equal(mismatch.totalClients, null);

    const sharedPool = {};
    const crossCustomerReuse = aggregateRuntimePoolStats([
      {
        child: {
          runtimePoolStats: () => runtimeStats(),
          runtimePoolObjects: () => [sharedPool, {}, {}],
        },
      },
      {
        child: {
          runtimePoolStats: () => runtimeStats(),
          runtimePoolObjects: () => [sharedPool, {}, {}],
        },
      },
    ], 1);
    assert.equal(crossCustomerReuse.poolObjectsUnique, false);
    assert.equal(crossCustomerReuse.available, false);
  });

  it('loads secrets only from a regular, non-symlink 0600 file', () => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'pdc-private-secrets-'));
    try {
      const manifestFile = path.join(temporary, 'provision.json');
      const secretsFile = path.join(temporary, 'runtime-secrets.json');
      const symlinkFile = path.join(temporary, 'runtime-secrets-link.json');
      fs.writeFileSync(manifestFile, JSON.stringify(manifest));
      const rawSecrets = {
        version: 1,
        fixture: 'physical-database-density-v1',
        runtimePasswords: Object.fromEntries(Object.values(customer.roles).map(
          (role) => [role, `fixture-password-at-least-24-bytes-${role}`]
        )),
        notificationPasswords: {
          [customer.notificationRole]:
            `fixture-password-at-least-24-bytes-${customer.notificationRole}`,
        },
      };
      fs.writeFileSync(secretsFile, JSON.stringify(rawSecrets), { mode: 0o600 });
      const loaded = loadProvision(manifestFile, secretsFile);
      assert.equal(loaded.manifest.fixture, 'physical-database-density-v1');
      assert.doesNotMatch(
        JSON.stringify(loaded),
        /fixture-password-at-least-24-bytes/,
      );

      fs.chmodSync(secretsFile, 0o640);
      assert.throws(
        () => loadProvision(manifestFile, secretsFile),
        /PDCF_SECRETS_FILE_MODE_MUST_BE_0600/,
      );
      fs.chmodSync(secretsFile, 0o600);
      fs.symlinkSync(secretsFile, symlinkFile);
      assert.throws(
        () => loadProvision(manifestFile, symlinkFile),
        /PDCF_SECRETS_FILE_MUST_BE_REGULAR/,
      );
    } finally {
      fs.rmSync(temporary, { recursive: true, force: true });
    }
  });

  it('routes websocket upgrades to one exact physical customer', () => {
    assert.equal(
      matchPhysicalUpgradeCustomer(
        '/customer/physical-customer-0001/tenant/a/graphql',
      ),
      'physical-customer-0001',
    );
    assert.equal(matchPhysicalUpgradeCustomer(
      '/customer/physical-customer-0001/tenant/a/graphql?customer=other',
    ), null);
    assert.equal(matchPhysicalUpgradeCustomer(
      '/customer/%70hysical-customer-0001/tenant/a/graphql',
    ), null);
    assert.equal(matchPhysicalUpgradeCustomer(
      '/customer/physical-customer-0001/tenant/a/graphql/extra',
    ), null);
  });

  it('marks shared or incomplete PostgreSQL database sets non-qualifying', () => {
    assert.deepEqual(
      classifyDatabaseScope(
        ['postgres', customer.database],
        'postgres',
        [customer.database],
      ),
      {
        dedicated: true,
        databasesPresent: 2,
        fixtureDatabasesExpected: 1,
        fixtureDatabasesPresent: 1,
        unexpectedDatabases: 0,
        missingFixtureDatabases: 0,
        unexpectedDatabaseSetSha256: null,
      },
    );
    const shared = classifyDatabaseScope(
      ['postgres', customer.database, 'unrelated_app'],
      'postgres',
      [customer.database],
    );
    assert.equal(shared.dedicated, false);
    assert.equal(shared.unexpectedDatabases, 1);
    assert.match(shared.unexpectedDatabaseSetSha256, /^sha256:[a-f0-9]{64}$/);
    assert.equal(classifyDatabaseScope(
      ['postgres'],
      'postgres',
      [customer.database],
    ).dedicated, false);
  });

  it('fails closed on status dependency drift and runtime artifact drift', () => {
    const arm = DEFAULT_IDLE_ARMS[0];
    const status = childStatus(arm.name);
    assert.equal(validateChildStatus(status, {
      arm,
      customer,
      mode: 'scoped-required',
    }), status);
    assert.throws(() => validateChildStatus({
      ...status,
      releaseBuildStateAfterValidation: false,
    }, { arm, customer, mode: 'scoped-required' }), /PDCF_PREFLIGHT_STATUS_INVALID/);
    assert.throws(() => validateChildStatus({
      ...status,
      runtimeSafety: {
        ...status.runtimeSafety,
        dependencySchemasByTenant: {
          ...status.runtimeSafety.dependencySchemasByTenant,
          a: ['ctf_extensions', 'ctf_a_realtime'],
        },
      },
    }, { arm, customer, mode: 'scoped-required' }), /RUNTIME_DEPENDENCIES_INVALID/);
    assert.throws(() => validateChildStatus({
      ...status,
      preparedStatementCache: {
        ...status.preparedStatementCache,
        attestation: 'environment-echo',
      },
    }, { arm, customer, mode: 'scoped-required' }), /PDCF_PREFLIGHT_STATUS_INVALID/);
    assert.throws(() => validateChildStatus({
      ...status,
      runtimePoolIdentities: {
        ...status.runtimePoolIdentities,
        c: status.runtimePoolIdentities.a,
      },
    }, { arm, customer, mode: 'scoped-required' }), /POOL_IDENTITIES_NOT_UNIQUE/);

    const secondCustomer = makeCustomers('pdc_test', 2)[1];
    assert.throws(() => assertUniqueRuntimePoolIdentities({
      arm,
      customers: [customer, secondCustomer],
      statuses: {
        [customer.id]: status,
        [secondCustomer.id]: {
          ...status,
          physicalDatabase: secondCustomer.database,
        },
      },
    }), /POOL_IDENTITIES_NOT_UNIQUE/);

    const statuses = Object.fromEntries(DEFAULT_IDLE_ARMS.map((candidate, index) => [
      candidate.name,
      { [customer.id]: childStatus(candidate.name, digest(index === 2 ? 'c' : 'a')) },
    ]));
    assert.throws(() => makeBlueprintCompatibility({
      manifest,
      statuses,
      mode: 'scoped-required',
    }), /RUNTIME_ARTIFACT_FINGERPRINT_MISMATCH/);
  });

  it('requires three built surfaces and three live verified shared subscriptions', () => {
    const arm = {
      name: 'physical-db-shared-stock',
      realtimeNotificationMode: 'shared-exact',
    };
    const before = childStatus(arm.name);
    const after = {
      ...before,
      residentBuildContracts: Object.values(before.buildContracts),
      builds: { byTenant: { a: 1, b: 1, c: 1 } },
    };
    const snapshot = {
      expected: 3,
      active: 3,
      verified: 3,
      errors: [],
    };
    assert.deepEqual(assertRepresentativeSharedRealtime({
      before,
      after,
      driverSnapshot: snapshot,
      arm,
      customer,
    }), {
      customerId: customer.id,
      surfacesBuilt: 3,
      subscriptionsActive: 3,
      subscriptionsVerified: 3,
      residentBuildContracts: Object.values(before.buildContracts).sort(),
    });
    assert.throws(() => assertRepresentativeSharedRealtime({
      before,
      after,
      driverSnapshot: { ...snapshot, active: 2 },
      arm,
      customer,
    }), /PDCF_SHARED_REALTIME_PREFLIGHT_INCOMPLETE/);
    assert.throws(() => assertRepresentativeSharedRealtime({
      before,
      after: {
        ...after,
        builds: { byTenant: { a: 1, b: 1, c: 0 } },
      },
      driverSnapshot: snapshot,
      arm,
      customer,
    }), /PDCF_SHARED_REALTIME_PREFLIGHT_INCOMPLETE/);
  });

  it('emits a deterministic prerequisite fingerprint without enabling blueprint sharing', () => {
    const statuses = Object.fromEntries(DEFAULT_IDLE_ARMS.map((arm) => [
      arm.name,
      { [customer.id]: childStatus(arm.name) },
    ]));
    const compatibility = makeBlueprintCompatibility({
      manifest,
      statuses,
      mode: 'scoped-required',
    });
    assert.match(compatibility.sha256, /^sha256:[a-f0-9]{64}$/);
    assert.equal(compatibility.scope, 'blueprint-prerequisites-only');
    assert.equal(compatibility.dedicatedInstancesRemainBaseline, true);
    assert.equal(compatibility.sqlRewriteEnabled, false);
    assert.equal(compatibility.releaseBuildStateAfterValidation, true);
    assert.deepEqual(parseIntegerList('4,1,2', 'counts'), [1, 2, 4]);
    assert.deepEqual(
      parseTenantCountsByHeapMiB(
        '1024:2,1;2048:4,2;4096:8,4',
        [1024, 2048, 4096],
      ),
      {
        '1024': [1, 2],
        '2048': [2, 4],
        '4096': [4, 8],
      },
    );
    assert.throws(() => parseTenantCountsByHeapMiB(
      '1024:1,2;2048:2,4',
      [1024, 2048, 4096],
    ), /PDCF_TENANT_COUNTS_BY_HEAP_COVERAGE_INVALID/);
  });
});
