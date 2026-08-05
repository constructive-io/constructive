'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { describe, it } = require('node:test');

const {
  DEFAULT_IDLE_ARMS,
  DENSITY_TUNING_ARMS,
  PHYSICAL_DATABASE_CANARY,
  makeCustomers,
  makeCacheCapacityProofByHeapMiB,
  makeFleet,
  makePlan,
  validateProvisionManifest,
} = require('./lib.cjs');
const {
  DEFAULT_CANONICAL_SCHEMAS,
  normalizeSchemaDump,
} = require('./provision.cjs');
const {
  CALIBRATION_KIND,
  sha256Canonical,
} = require('./cache-calibration.cjs');

const MIB = 1024 ** 2;
const databaseContractFingerprint = `sha256:${'d'.repeat(64)}`;
const calibrationPayload = {
  kind: CALIBRATION_KIND,
  databaseContractFingerprint,
  introspectionMode: 'scoped-required',
  introspectionClientReleaseMode: 'destroy',
  releaseBuildStateAfterValidation: true,
  introspectionBackendRetirementConclusive: true,
  fixtureFingerprint: 'fixture-v1',
  schemaContract: {
    schemaSets: [['ctf_a']],
    allowedDependencySchemas: ['ctf_extensions'],
  },
  safetyFactor: 1.25,
  measured: {
    repetitions: 3,
    retainedHeapPerSurfaceBytes: 12 * MIB,
    serverBaselineHeapBytes: 48 * MIB,
    buildTransientHeapBytes: 96 * MIB,
    buildTransientRssBytes: 96 * MIB,
  },
  configured: {
    instanceHeapBytes: 15 * MIB,
    serverReserveBytes: 60 * MIB,
    buildReserveBytes: 120 * MIB,
    rssBuildReserveBytes: 120 * MIB,
  },
  sourceWorktreesClean: true,
  sources: ['1', '2', '3'].map((value) => ({
    sourceSha256: `sha256:${value.repeat(64)}`,
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
const cacheCalibration = {
  version: 2,
  ...calibrationPayload,
  calibrationId: sha256Canonical(calibrationPayload),
};
const heapLimitBytesByHeapMiB = {
  '1024': 1024 * MIB,
  '2048': 2048 * MIB,
  '4096': 4096 * MIB,
};

const manifest = (count = 2) => ({
  version: 1,
  fixture: 'physical-database-density-v1',
  prefix: 'pdc_test',
  provisionClone: {
    version: 1,
    id: 'measurement-clone-test',
    purpose: 'measurement',
    attestationSetSha256: `sha256:${'9'.repeat(64)}`,
  },
  customers: makeCustomers('pdc_test', count),
});

const statuses = (value) => Object.fromEntries(DEFAULT_IDLE_ARMS.map((arm) => [
  arm.name,
  Object.fromEntries(value.customers.map((customer) => [customer.id, {
    physicalDatabase: customer.database,
    runtimePoolIdentities: {
      a: `pg:v1:${arm.name}:${customer.id}:a`,
      b: `pg:v1:${arm.name}:${customer.id}:b`,
      c: `pg:v1:${arm.name}:${customer.id}:c`,
    },
    buildContracts: {
      a: `graphile:v1:${arm.name}:${customer.id}:a`,
      b: `graphile:v1:${arm.name}:${customer.id}:b`,
      c: `graphile:v1:${arm.name}:${customer.id}:c`,
    },
    contractEvidence: {
      runtimePools: Object.fromEntries(['a', 'b', 'c'].map((tenantId) => [
        tenantId,
        {
          fingerprint: `pg-contract-evidence:v1:${sha256Canonical({
            kind: 'pool',
            arm: arm.name,
            customer: customer.id,
            tenantId,
          }).slice('sha256:'.length)}`,
        },
      ])),
      graphileBuilds: Object.fromEntries(['a', 'b', 'c'].map((tenantId) => [
        tenantId,
        {
          fingerprint: `graphile-contract-evidence:v1:${sha256Canonical({
            kind: 'build',
            arm: arm.name,
            customer: customer.id,
            tenantId,
          }).slice('sha256:'.length)}`,
        },
      ])),
    },
  }])),
]));

describe('physical database density fixture', () => {
  it('stamps realtime physical identity inside PostgreSQL before every write', () => {
    const sql = fs.readFileSync(path.join(__dirname, 'physical-identity.sql'), 'utf8');
    for (const schema of ['ctf_a', 'ctf_b', 'ctf_c']) {
      assert.match(
        sql,
        new RegExp(`ALTER TABLE ${schema}\\.realtime_items[\\s\\S]*ADD COLUMN physical_database_identity text`)
      );
      assert.match(
        sql,
        new RegExp(`BEFORE INSERT OR UPDATE ON ${schema}\\.realtime_items`)
      );
      assert.match(
        sql,
        new RegExp(`CREATE FUNCTION ${schema}\\.stamp_realtime_physical_database_identity\\(\\)[\\s\\S]*NEW\\.physical_database_identity := pg_catalog\\.current_database\\(\\)::text`)
      );
    }
    for (const table of [
      'documents',
      'posts',
      'posts_translations',
      'articles',
      'articles_chunks',
      'bulk_items',
      'app_files',
      'function_invocations',
    ]) {
      assert.match(sql, new RegExp(`'${table}'`));
    }
    assert.match(
      sql,
      /NEW\.physical_database_identity := pg_catalog\.current_database\(\)::text/
    );
    assert.equal(
      (sql.match(/physical_database_mutation_identity\(\)[\s\S]*?LANGUAGE sql[\s\S]*?VOLATILE/g) ?? []).length,
      3,
    );
    assert.match(
      sql,
      /GRANT EXECUTE ON FUNCTION ctf_a\.physical_database_mutation_identity\(\) TO :"runtime_role_a"/,
    );
    assert.match(sql, /posts_translations SET title = title \|\|/);
    assert.match(sql, /articles_chunks SET content = content \|\|/);
  });

  it('generates distinct databases and cluster-wide least-privilege role identities', () => {
    const customers = makeCustomers('pdc_test', 2);
    assert.deepEqual(customers.map((customer) => customer.database), [
      'pdc_test_db_0001',
      'pdc_test_db_0002',
    ]);
    assert.equal(new Set(customers.flatMap((customer) => Object.values(customer.roles))).size, 6);
    assert.equal(new Set(customers.map((customer) => customer.notificationRole)).size, 2);
    assert.ok(customers.every((customer) =>
      !Object.values(customer.roles).includes(customer.notificationRole)
    ));
    assert.equal(customers[0].physicalIdentity, customers[0].database);
    assert.equal(validateProvisionManifest(manifest()).customers.length, 2);
  });

  it('binds every unique physical identity to its exact database label', () => {
    const swapped = manifest();
    swapped.customers[0] = {
      ...swapped.customers[0],
      physicalIdentity: swapped.customers[1].database,
    };
    assert.throws(
      () => validateProvisionManifest(swapped),
      /PDCF_PHYSICAL_IDENTITY_DATABASE_MISMATCH/,
    );

    const duplicate = manifest();
    duplicate.customers[1] = {
      ...duplicate.customers[1],
      database: duplicate.customers[0].database,
      physicalIdentity: duplicate.customers[0].physicalIdentity,
    };
    assert.throws(
      () => validateProvisionManifest(duplicate),
      /PDCF_DATABASE_DUPLICATE|PDCF_PHYSICAL_IDENTITY_DUPLICATE/,
    );
  });

  it('maps one complete customer to one physical database and three resident realtime APIs', () => {
    const provision = manifest();
    const armStatuses = statuses(provision);
    const fleet = makeFleet({ manifest: provision, statuses: armStatuses });
    assert.equal(fleet.tenants.length, 2);
    assert.equal(fleet.tenants[0].databases.length, 1);
    assert.equal(fleet.tenants[0].databases[0].physicalDatabase, 'pdc_test_db_0001');
    assert.equal(fleet.tenants[0].databases[0].apis.length, 3);
    assert.ok(fleet.tenants[0].databases[0].apis.every((api) => api.realtime));
    assert.equal(fleet.tenants[0].surfaces.length, 3);
    assert.ok(fleet.tenants[0].surfaces.every((surface) =>
      surface.realtime?.subscription?.query.includes('PhysicalDensityRealtimeResident')
      && surface.realtime?.prime?.query.includes('PhysicalDensityRealtimePrime')
      && surface.realtime.subscription.requiredMatches.length === 2
      && surface.realtime.subscription.forbiddenMatches.length === 3
      && surface.realtime.correlation.primeVariable === 'payload'
      && surface.realtime.correlation.primeResponsePath
        === '/data/updateRealtimeItem/realtimeItem/payload'
      && surface.realtime.correlation.subscriptionEventPath
        === '/data/onRealtimeItemChanged/realtimeItem/payload'
    ));
    assert.ok(fleet.tenants[0].surfaces.every((surface) =>
      surface.warmup.requiredMatches.some((match) =>
        match.value === 'pdc_test_db_0001'
      )
      && surface.operations.every((operation) => {
        const oracle = operation.postCoverageVerification ?? operation;
        return oracle.requiredMatches.some((match) =>
          match.value === 'pdc_test_db_0001'
        ) && oracle.forbiddenMatches.some((match) =>
          match.value === 'pdc_test_db_0002'
        );
      })
    ));
    const operations = new Map(
      fleet.tenants[0].surfaces[0].operations.map((operation) => [operation.name, operation])
    );
    assert.match(
      operations.get('deterministic-rag').query,
      /physicalDatabaseIdentity.*ragQuery/
    );
    assert.ok(
      operations.get('deterministic-rag').requiredMatches.some((match) =>
        match.path.includes('/sources/')
        && match.value.endsWith('@pdc_test_db_0001')
      )
    );
    assert.match(operations.get('bulk-upsert').query, /returning \{ tenantId name physicalDatabaseIdentity \}/);
    assert.match(operations.get('realtime-tagged-update').query, /physicalDatabaseIdentity/);
    assert.match(operations.get('bound-function-invocation').query, /invocation \{ tenantId physicalDatabaseIdentity/);
    assert.match(
      operations.get('presigned-upload').postCoverageVerification.query,
      /appFiles.*physicalDatabaseIdentity/
    );
    assert.match(
      operations.get('presigned-upload').query,
      /physicalDatabaseMutationIdentity\(input: \{\}\) \{ result \}/,
    );
    assert.deepEqual(
      operations.get('presigned-upload').postCoverageVerification.variablesFromResponse,
      { fileId: '/data/uploadAppFile/fileId' },
    );
    assert.match(
      operations.get('presigned-upload').postCoverageVerification.query,
      /id: \{ equalTo: \$fileId \}/,
    );
    for (const operationName of [
      'generated-document-read',
      'bm25-search',
      'tsvector-search',
      'trigram-search',
      'vector-search',
      'postgis-read',
      'ltree-filter',
    ]) {
      assert.ok(
        operations.get(operationName).invariants.some((invariant) =>
          invariant.path === '/data/documents/nodes/*/physicalDatabaseIdentity'
          && invariant.everyEquals === 'pdc_test_db_0001'
          && invariant.min === 1
          && invariant.max === 1
        ),
      );
    }
    assert.ok(operations.get('deterministic-embed').requiredMatches.some((match) =>
      match.path === '/data/embedText/vector'
      && JSON.stringify(match.value) === '[1,0,0]'
    ));
    assert.ok(operations.get('deterministic-rag').requiredMatches.some((match) =>
      match.path === '/data/ragQuery/answer'
      && match.value === 'Deterministic fixture answer: machine learning tenant fixture'
    ));
    assert.ok(operations.get('postgis-read').requiredMatches.some((match) =>
      match.path.endsWith('/location/geojson')
      && match.value.type === 'Point'
    ));
    assert.ok(operations.get('ltree-filter').requiredMatches.some((match) =>
      match.path.endsWith('/path') && match.value === '/root/a'
    ));
    const rawSqlCanary = fleet.tenants[0].surfaces[0].canaries.find(
      (candidate) => candidate.name === 'plugin-raw-sql'
    );
    assert.equal(
      rawSqlCanary.requiredMatches[0].value,
      'tenant-a-canary español @pdc_test_db_0001',
    );
    assert.deepEqual(
      fleet.tenants[0].surfaces[0].realtime.subscription.requiredMatches,
      [
        {
          path: '/data/onRealtimeItemChanged/realtimeItem/tenantId',
          value: 'tenant-a-canary',
        },
        {
          path: '/data/onRealtimeItemChanged/realtimeItem/physicalDatabaseIdentity',
          value: 'pdc_test_db_0001',
        },
      ]
    );
    assert.ok(
      fleet.tenants[0].surfaces[0].realtime.subscription.forbiddenMatches.some(
        (match) => match.path.endsWith('/physicalDatabaseIdentity')
          && match.value === 'pdc_test_db_0002'
      )
    );
    const canary = fleet.tenants[0].surfaces[0].canaries.find(
      (candidate) => candidate.name === PHYSICAL_DATABASE_CANARY
    );
    assert.deepEqual(canary.requiredMatches, [{
      path: '/data/physicalDatabaseIdentity',
      value: 'pdc_test_db_0001',
    }]);
    assert.deepEqual(canary.forbiddenMatches, [
      {
        path: '/data/physicalDatabaseIdentity',
        value: null,
      },
      {
        path: '/data/physicalDatabaseIdentity',
        value: 'pdc_test_db_0002',
      },
    ]);
    assert.equal(
      fleet.tenants[0].surfaces[0].buildContracts[DEFAULT_IDLE_ARMS[2].name],
      armStatuses[DEFAULT_IDLE_ARMS[2].name]['physical-customer-0001']
        .contractEvidence.graphileBuilds.a.fingerprint
    );
  });

  it('keeps a conclusive negative routing oracle for a one-customer smoke', () => {
    const provision = manifest();
    provision.customers = provision.customers.slice(0, 1);
    const fleet = makeFleet({ manifest: provision, statuses: statuses(provision) });
    const canary = fleet.tenants[0].surfaces[0].canaries.find(
      (candidate) => candidate.name === PHYSICAL_DATABASE_CANARY
    );
    assert.deepEqual(canary.forbiddenMatches, [{
      path: '/data/physicalDatabaseIdentity',
      value: null,
    }]);
  });

  it('emits explicit 30s, 5s, and 1s arms with a post-warmup realtime hook', () => {
    const plan = makePlan({
      manifestFile: '/tmp/pdc/provision.json',
      secretsFile: '/tmp/pdc/runtime-secrets.json',
      postgresContainer: 'postgres-density',
      postgresContainerTemplateFile: '/tmp/pdc/postgres-container-template.json',
      postgresContainerTemplateSha256: `sha256:${'1'.repeat(64)}`,
      commit: 'a'.repeat(40),
      entrySha256: 'b'.repeat(64),
      lockfileSha256: 'c'.repeat(64),
      databaseContractFingerprint,
      blueprintCompatibilityFingerprint: `sha256:${'e'.repeat(64)}`,
      manifestSha256: `sha256:${'f'.repeat(64)}`,
      provisionClone: manifest().provisionClone,
      tenantCounts: [2],
      cacheCalibration,
      heapLimitBytesByHeapMiB,
    });
    assert.deepEqual(
      plan.arms.map((arm) => arm.env.PG_POOL_IDLE_TIMEOUT_MS),
      ['30000', '5000', '1000']
    );
    assert.ok(plan.arms.every((arm) => arm.requirePostgresCgroupV2));
    assert.ok(plan.arms.every((arm) => arm.v8Profile === 'stock'));
    assert.ok(plan.arms.every((arm) => arm.postWarmupUrl.endsWith('/__cperf/post-warmup')));
    assert.ok(plan.arms.every((arm) =>
      arm.retainedHeapCheckpointUrl
        .endsWith('/__cperf/retained-memory-checkpoint')
    ));
    assert.ok(plan.arms.every((arm) => arm.command.includes('--expose-gc')));
    assert.ok(plan.arms.every((arm) => arm.command.includes('{tenantCount}')));
    assert.ok(plan.arms.every((arm) => {
      const index = arm.command.indexOf('--introspection-client-release-mode');
      return index >= 0 && arm.command[index + 1] === 'destroy';
    }));
    assert.ok(plan.arms.every((arm) => arm.command.includes(`sha256:${'d'.repeat(64)}`)));
    assert.ok(plan.arms.every((arm) => {
      const purposeIndex = arm.command.indexOf('--run-purpose');
      const cloneIndex = arm.command.indexOf('--clone-id');
      return purposeIndex >= 0
        && arm.command[purposeIndex + 1] === 'measurement'
        && cloneIndex >= 0
        && arm.command[cloneIndex + 1] === '{postgresCloneId}';
    }));
    assert.ok(plan.arms.every((arm) =>
      arm.command.includes('{postgresManifestFile}')
      && arm.command.includes('{postgresSecretsFile}')
      && arm.command.includes('{postgresManifestSha256}')
      && arm.postgresRunAttestation.prepareCommand
        .includes('{postgresFixtureDir}')
    ));
    assert.ok(plan.arms.every((arm) =>
      arm.envByHeapMiB['1024'].GRAPHILE_CACHE_CALIBRATION_ID
        === cacheCalibration.calibrationId
    ));
    assert.ok(plan.arms.every((arm) =>
      Number(arm.envByHeapMiB['1024'].GRAPHILE_CACHE_MAX)
        === arm.cacheCalibrationByHeapMiB['1024'].budgetCapacity
    ));
    assert.ok(plan.arms.every((arm) =>
      arm.envByHeapMiB['1024'].GRAPHILE_CACHE_ADMISSION_MODE === 'preserve-resident'
    ));
    assert.ok(plan.arms.every((arm) =>
      arm.envByHeapMiB['1024'].GRAPHQL_CPERF_RETAINED_HEAP_ENABLED === 'true'
    ));
    assert.equal(plan.gates.requireRetainedMemoryCheckpoints, true);
    assert.equal(plan.gates.requireConclusiveOperationOracles, true);
    assert.equal(plan.gates.requiredCacheAdmissionMode, 'preserve-resident');
    assert.equal(plan.gates.requireCompletePeriodicCanaryCoverage, true);
    assert.equal(plan.workload.periodicCanarySchedule, 'rotating-one');
    assert.equal(plan.workload.canaryConcurrency, 16);
    assert.equal(
      Math.max(
        0,
        Math.ceil(plan.workload.durationSec / plan.workload.canaryIntervalSec) - 1,
      ),
      14,
    );
    assert.equal(plan.requiredCanaries.length, 14);
    const capacityProof = plan.arms[0].cacheCalibrationByHeapMiB['1024'];
    assert.equal(capacityProof.requiredResidentInstances, 6);
    assert.equal(capacityProof.configuredResidentCapacity, capacityProof.budgetCapacity);
    assert.equal(
      capacityProof.residentHeadroomInstances,
      capacityProof.budgetCapacity - capacityProof.requiredResidentInstances,
    );
    assert.equal(capacityProof.capacityRefusalReason, 'resident_capacity');
    assert.equal(capacityProof.capacityResponseCode, 'GRAPHILE_BUILD_RESIDENT_CAPACITY');
    assert.equal(capacityProof.preservesExistingResidentsAtCapacity, true);
    const oversizedPayload = {
      ...calibrationPayload,
      measured: {
        ...calibrationPayload.measured,
        buildTransientHeapBytes: 720 * MIB,
      },
      configured: {
        ...calibrationPayload.configured,
        buildReserveBytes: 900 * MIB,
      },
    };
    const rampPlan = makePlan({
      manifestFile: '/tmp/pdc/provision.json',
      secretsFile: '/tmp/pdc/runtime-secrets.json',
      postgresContainer: 'postgres-density',
      postgresContainerTemplateFile: '/tmp/pdc/postgres-container-template.json',
      postgresContainerTemplateSha256: `sha256:${'1'.repeat(64)}`,
      commit: 'a'.repeat(40),
      entrySha256: 'b'.repeat(64),
      lockfileSha256: 'c'.repeat(64),
      databaseContractFingerprint,
      blueprintCompatibilityFingerprint: `sha256:${'e'.repeat(64)}`,
      manifestSha256: `sha256:${'f'.repeat(64)}`,
      provisionClone: manifest().provisionClone,
      tenantCounts: [1, 2],
      cacheCalibration,
      heapLimitBytesByHeapMiB,
    });
    assert.deepEqual(rampPlan.tenantCounts, [1, 2]);
    assert.equal(
      rampPlan.arms[0].cacheCalibrationByHeapMiB['1024'].requiredResidentInstances,
      6,
    );
    const perHeapPlan = makePlan({
      manifestFile: '/tmp/pdc/provision.json',
      secretsFile: '/tmp/pdc/runtime-secrets.json',
      postgresContainer: 'postgres-density',
      postgresContainerTemplateFile: '/tmp/pdc/postgres-container-template.json',
      postgresContainerTemplateSha256: `sha256:${'1'.repeat(64)}`,
      commit: 'a'.repeat(40),
      entrySha256: 'b'.repeat(64),
      lockfileSha256: 'c'.repeat(64),
      databaseContractFingerprint,
      blueprintCompatibilityFingerprint: `sha256:${'e'.repeat(64)}`,
      manifestSha256: `sha256:${'f'.repeat(64)}`,
      provisionClone: manifest().provisionClone,
      tenantCountsByHeapMiB: {
        '1024': [1],
        '2048': [1, 2],
      },
      heapMiB: [1024, 2048],
      cacheCalibration,
      heapLimitBytesByHeapMiB,
    });
    assert.deepEqual(perHeapPlan.tenantCountsByHeapMiB, {
      '1024': [1],
      '2048': [1, 2],
    });
    assert.equal(
      perHeapPlan.arms[0].cacheCalibrationByHeapMiB['1024'].requiredResidentInstances,
      3,
    );
    assert.equal(
      perHeapPlan.arms[0].cacheCalibrationByHeapMiB['2048'].requiredResidentInstances,
      6,
    );
    assert.throws(() => makePlan({
      manifestFile: '/tmp/pdc/provision.json',
      secretsFile: '/tmp/pdc/runtime-secrets.json',
      postgresContainer: 'postgres-density',
      postgresContainerTemplateFile: '/tmp/pdc/postgres-container-template.json',
      postgresContainerTemplateSha256: `sha256:${'1'.repeat(64)}`,
      commit: 'a'.repeat(40),
      entrySha256: 'b'.repeat(64),
      lockfileSha256: 'c'.repeat(64),
      databaseContractFingerprint,
      blueprintCompatibilityFingerprint: `sha256:${'e'.repeat(64)}`,
      manifestSha256: `sha256:${'f'.repeat(64)}`,
      provisionClone: manifest().provisionClone,
      tenantCounts: [2, 1],
      cacheCalibration,
      heapLimitBytesByHeapMiB,
    }), /CUSTOMER_COUNT_RAMP_INVALID/);
    assert.throws(() => makePlan({
      manifestFile: '/tmp/pdc/provision.json',
      secretsFile: '/tmp/pdc/runtime-secrets.json',
      postgresContainer: 'postgres-density',
      postgresContainerTemplateFile: '/tmp/pdc/postgres-container-template.json',
      postgresContainerTemplateSha256: `sha256:${'1'.repeat(64)}`,
      commit: 'a'.repeat(40),
      entrySha256: 'b'.repeat(64),
      lockfileSha256: 'c'.repeat(64),
      databaseContractFingerprint,
      blueprintCompatibilityFingerprint: `sha256:${'e'.repeat(64)}`,
      manifestSha256: `sha256:${'f'.repeat(64)}`,
      provisionClone: manifest().provisionClone,
      tenantCounts: [2],
      heapMiB: [1024],
      cacheCalibration: {
        version: 2,
        ...oversizedPayload,
        calibrationId: sha256Canonical(oversizedPayload),
      },
      heapLimitBytesByHeapMiB: { '1024': 1024 * MIB },
    }), /CALIBRATED_CAPACITY_INSUFFICIENT/);
    assert.throws(() => makePlan({
      manifestFile: '/tmp/pdc/provision.json',
      secretsFile: '/tmp/pdc/runtime-secrets.json',
      postgresContainer: 'postgres-density',
      postgresContainerTemplateFile: '/tmp/pdc/postgres-container-template.json',
      postgresContainerTemplateSha256: `sha256:${'1'.repeat(64)}`,
      commit: 'a'.repeat(40),
      entrySha256: 'b'.repeat(64),
      lockfileSha256: 'c'.repeat(64),
      databaseContractFingerprint,
      blueprintCompatibilityFingerprint: `sha256:${'e'.repeat(64)}`,
      manifestSha256: `sha256:${'f'.repeat(64)}`,
      provisionClone: {
        ...manifest().provisionClone,
        purpose: 'hostile-preflight',
      },
      tenantCounts: [2],
      cacheCalibration,
      heapLimitBytesByHeapMiB,
    }), /MEASUREMENT_PROVISION_CLONE_REQUIRED/);
  });

  it('emits secure shared-listener density arms with one-client runtime pools', () => {
    const plan = makePlan({
      manifestFile: '/tmp/pdc/provision.json',
      secretsFile: '/tmp/pdc/runtime-secrets.json',
      postgresContainer: 'postgres-density',
      postgresContainerTemplateFile: '/tmp/pdc/postgres-container-template.json',
      postgresContainerTemplateSha256: `sha256:${'1'.repeat(64)}`,
      commit: 'a'.repeat(40),
      entrySha256: 'b'.repeat(64),
      lockfileSha256: 'c'.repeat(64),
      databaseContractFingerprint,
      blueprintCompatibilityFingerprint: `sha256:${'e'.repeat(64)}`,
      manifestSha256: `sha256:${'f'.repeat(64)}`,
      provisionClone: manifest().provisionClone,
      tenantCounts: [2],
      cacheCalibration,
      heapLimitBytesByHeapMiB,
      arms: DENSITY_TUNING_ARMS,
    });
    const shared = plan.arms.filter((arm) => arm.name.includes('-shared-'));
    assert.equal(shared.length, 7);
    for (const arm of shared) {
      const poolIndex = arm.command.indexOf('--runtime-pool-max');
      const maxUsesIndex = arm.command.indexOf('--runtime-pool-max-uses');
      const modeIndex = arm.command.indexOf('--realtime-notification-mode');
      const pollIndex = arm.command.indexOf('--realtime-cursor-poll-ms');
      assert.equal(arm.command[poolIndex + 1], '1');
      assert.equal(
        arm.command[maxUsesIndex + 1],
        arm.name.includes('-maxuses-1') ? '1' : 'unlimited',
      );
      assert.equal(arm.env.PG_POOL_MAX_USES, '0');
      assert.equal(arm.env.PG_POOL_MAX, '1');
      assert.equal(arm.command[modeIndex + 1], 'shared-exact');
      assert.equal(arm.command[pollIndex + 1], '30000');
      assert.equal(arm.env.PG_CACHE_MAX, '16');
    }
    assert.ok(plan.arms.every((arm) => arm.env.PG_POOL_MAX === '1'));
    assert.ok(plan.arms.every((arm) => arm.env.NODE_OPTIONS === ''));
    assert.ok(plan.arms.every((arm) => arm.env.NODE_PATH === ''));
    assert.equal(plan.arms[0].env.PG_CACHE_MAX, '14');
    assert.deepEqual(plan.arms.map((arm) => arm.v8Profile), [
      'stock',
      'stock',
      'stock',
      'stock',
      'optimize-for-size',
      'baseline-optimize-for-size',
      'jitless-optimize-for-size',
      'optimize-for-size',
    ]);
    assert.equal(
      plan.arms.find((arm) => arm.name === 'physical-db-shared-stock')
        .env.DATAPLAN_PG_PREPARED_STATEMENT_CACHE_SIZE,
      '100',
    );
    assert.equal(
      plan.arms.find((arm) => arm.name === 'physical-db-shared-no-prepare')
        .env.DATAPLAN_PG_PREPARED_STATEMENT_CACHE_SIZE,
      '0',
    );
  });

  it('computes the qualifying capacity proof without runtime status inputs', () => {
    const proof = makeCacheCapacityProofByHeapMiB({
      cacheCalibration,
      databaseContractFingerprint,
      tenantCounts: [2],
      heapMiB: [1024],
      heapLimitBytesByHeapMiB: { '1024': 1024 * MIB },
    })['1024'];
    assert.equal(proof.admissionMode, 'preserve-resident');
    assert.equal(proof.requiredResidentInstances, 6);
    assert.ok(proof.budgetCapacity > proof.requiredResidentInstances);
  });

  it('normalizes nondeterministic pg_dump guard and version lines before fingerprinting', () => {
    const left = normalizeSchemaDump([
      '-- Dumped from database version 17.1',
      '-- Dumped by pg_dump version 17.1',
      '\\restrict random-left',
      'CREATE TABLE ctf_a.example(id integer);',
      '\\unrestrict random-left',
    ].join('\n'));
    const right = normalizeSchemaDump([
      '-- Dumped from database version 17.2',
      '-- Dumped by pg_dump version 17.2',
      '\\restrict random-right',
      'CREATE TABLE ctf_a.example(id integer);',
      '\\unrestrict random-right',
    ].join('\n'));
    assert.equal(left, right);
  });

  it('fingerprints build-visible dependency schemas and normalizes equivalent role ACLs', () => {
    assert.ok(DEFAULT_CANONICAL_SCHEMAS.includes('ctf_extensions'));
    assert.ok(DEFAULT_CANONICAL_SCHEMAS.includes('jwt_private'));
    const left = normalizeSchemaDump(
      'GRANT SELECT ON TABLE ctf_a.item TO pdc_test_c0001_a;\n',
      { pdc_test_c0001_a: '__runtime_a__' },
    );
    const right = normalizeSchemaDump(
      'GRANT SELECT ON TABLE ctf_a.item TO pdc_test_c0002_a;\n',
      { pdc_test_c0002_a: '__runtime_a__' },
    );
    assert.equal(left, right);
    assert.match(left, /__runtime_a__/);
  });
});
