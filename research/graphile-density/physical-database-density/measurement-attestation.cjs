'use strict';

const { execFileSync, spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const {
  FIXTURE_ID,
  loadProvision,
} = require('./lib.cjs');
const {
  parseArgs,
  parsePositiveInteger,
  requireString,
} = require('../complete-tenant-fixture/lib.cjs');
const {
  inspectCustomerContract,
  provisionAttestationSetSha256,
} = require('./provision.cjs');
const {
  buildLiveCloneAuditSql,
  validateLiveCloneAudit,
} = require('./unsafe-runtime-startup-probe.cjs');
const {
  postgresSettingsFromCommand,
  validateContainerTemplate,
  validateRunningContainerAgainstTemplate,
} = require('./prepare-measurement-run.cjs');

const ATTESTATION_KIND = 'physical-density-measurement-attestation-v1';
const SHA256 = /^sha256:[a-f0-9]{64}$/;
const CONTAINER_ID = /^[a-f0-9]{64}$/;
const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', 'localhost']);
const START_TOLERANCE_MS = 0;

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [
    key,
    canonicalize(value[key]),
  ]));
};

const canonicalSha256 = (value) => `sha256:${crypto.createHash('sha256')
  .update(JSON.stringify(canonicalize(value)))
  .digest('hex')}`;

const readRegularFile = (file) => {
  const absolute = path.resolve(file);
  const before = fs.lstatSync(absolute);
  if (before.isSymbolicLink() || !before.isFile()) {
    throw new Error('PDCF_MEASUREMENT_EVIDENCE_FILE_INVALID');
  }
  const descriptor = fs.openSync(
    absolute,
    fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0),
  );
  try {
    const opened = fs.fstatSync(descriptor);
    if (
      !opened.isFile()
      || opened.dev !== before.dev
      || opened.ino !== before.ino
    ) {
      throw new Error('PDCF_MEASUREMENT_EVIDENCE_FILE_INVALID');
    }
    return fs.readFileSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
};

const bufferSha256 = (value) => `sha256:${crypto.createHash('sha256')
  .update(value)
  .digest('hex')}`;

const writeImmutableJson = (file, value) => {
  const absolute = path.resolve(file);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  const temporary = `${absolute}.${process.pid}.${crypto.randomBytes(8).toString('hex')}.tmp`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, {
      flag: 'wx',
      mode: 0o644,
    });
    fs.linkSync(temporary, absolute);
  } finally {
    try { fs.unlinkSync(temporary); } catch { /* Preserve the primary error. */ }
  }
};

const exactCanonical = (left, right) =>
  JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));

const runPsqlJson = ({ database, sql, environment = process.env }) => {
  const result = spawnSync('psql', [
    '--no-psqlrc',
    '--no-align',
    '--tuples-only',
    '--quiet',
    '--set=ON_ERROR_STOP=1',
    '--dbname', database,
  ], {
    cwd: __dirname,
    env: environment,
    encoding: 'utf8',
    input: `${sql}\n`,
    maxBuffer: 16 * 1024 * 1024,
    timeout: 120_000,
  });
  if (result.status !== 0) throw new Error('PDCF_MEASUREMENT_ATTESTATION_SQL_FAILED');
  const output = String(result.stdout ?? '').trim();
  if (!output || output.includes('\n')) {
    throw new Error('PDCF_MEASUREMENT_ATTESTATION_SQL_RESULT_INVALID');
  }
  try {
    return JSON.parse(output);
  } catch {
    throw new Error('PDCF_MEASUREMENT_ATTESTATION_SQL_RESULT_INVALID');
  }
};

const inspectDockerContainer = (container) => {
  const output = execFileSync('docker', ['inspect', container], {
    encoding: 'utf8',
    timeout: 30_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  const records = JSON.parse(output);
  if (!Array.isArray(records) || records.length !== 1) {
    throw new Error('PDCF_MEASUREMENT_CONTAINER_INSPECT_INVALID');
  }
  return records[0];
};

const inspectContainerCgroup = (container) => {
  const script = [
    'set -eu',
    'test -r /sys/fs/cgroup/memory.current',
    'test -r /sys/fs/cgroup/memory.events',
    'printf "membership="',
    'cat /proc/1/cgroup',
    'printf "mount="',
    'stat -c "%d:%i" /sys/fs/cgroup',
  ].join('\n');
  const dockerEnvironment = {
    PATH: process.env.PATH ?? '/usr/bin:/bin',
    ...(process.env.DOCKER_HOST ? { DOCKER_HOST: process.env.DOCKER_HOST } : {}),
    ...(process.env.DOCKER_CONTEXT
      ? { DOCKER_CONTEXT: process.env.DOCKER_CONTEXT }
      : {}),
  };
  const output = execFileSync('docker', [
    'exec',
    container,
    '/usr/bin/env', '-i', 'PATH=/usr/bin:/bin',
    'sh', '-ceu', script,
  ], {
    encoding: 'utf8',
    timeout: 30_000,
    env: dockerEnvironment,
  });
  return {
    version: 1,
    source: 'container-cgroup-v2',
    identitySha256: canonicalSha256(output.trim()),
  };
};

const clusterAuditSql = (settingNames = []) => `
SELECT pg_catalog.jsonb_build_object(
  'systemIdentifier', system_identifier::text,
  'postmasterStartedAt', pg_catalog.pg_postmaster_start_time(),
  'serverVersionNum', pg_catalog.current_setting('server_version_num'),
  'databases', (
    SELECT pg_catalog.jsonb_agg(datname ORDER BY datname)
    FROM pg_catalog.pg_database
    WHERE NOT datistemplate
  ),
  'settings', (
    SELECT pg_catalog.jsonb_object_agg(
      name,
      pg_catalog.jsonb_build_object('setting', setting, 'source', source)
      ORDER BY name
    )
    FROM pg_catalog.pg_settings
    WHERE name = ANY(ARRAY[${settingNames.map((name) => `'${name}'`).join(', ')}]::text[])
  )
)::text
FROM pg_catalog.pg_control_system();
`;

const validateContainer = ({
  inspection,
  container,
  environment,
  notBeforeEpochMs,
}) => {
  const id = inspection?.Id;
  const name = String(inspection?.Name ?? '').replace(/^\//, '');
  const startedAt = Date.parse(inspection?.State?.StartedAt ?? '');
  const createdAt = Date.parse(inspection?.Created ?? '');
  if (
    !CONTAINER_ID.test(id ?? '')
    || name !== container
    || inspection?.State?.Running !== true
    || !Number.isSafeInteger(startedAt)
    || !Number.isSafeInteger(createdAt)
    || startedAt < createdAt
  ) {
    throw new Error('PDCF_MEASUREMENT_CONTAINER_IDENTITY_INVALID');
  }
  const pgHost = environment.PGHOST ?? 'localhost';
  const pgPort = String(environment.PGPORT ?? '5432');
  if (!LOOPBACK_HOSTS.has(pgHost)) {
    throw new Error('PDCF_MEASUREMENT_POSTGRES_LOOPBACK_REQUIRED');
  }
  const bindings = inspection?.NetworkSettings?.Ports?.['5432/tcp'];
  if (
    !Array.isArray(bindings)
    || !bindings.some((binding) => String(binding?.HostPort) === pgPort)
  ) {
    throw new Error('PDCF_MEASUREMENT_CONTAINER_PORT_MISMATCH');
  }
  return {
    id,
    name,
    imageId: inspection.Image,
    createdAt: new Date(createdAt).toISOString(),
    startedAt: new Date(startedAt).toISOString(),
    freshForRun: startedAt >= notBeforeEpochMs,
  };
};

const validateRunBinding = (run) => {
  if (
    typeof run?.arm !== 'string'
    || !run.arm
    || !Number.isSafeInteger(run.heapMiB)
    || run.heapMiB <= 0
    || !Number.isSafeInteger(run.customerCount)
    || run.customerCount <= 0
    || !Number.isSafeInteger(run.repetition)
    || run.repetition <= 0
    || !Number.isSafeInteger(run.runOrderIndex)
    || run.runOrderIndex <= 0
    || !SHA256.test(run.planSha256 ?? '')
    || !SHA256.test(run.fleetSha256 ?? '')
  ) {
    throw new Error('PDCF_MEASUREMENT_RUN_BINDING_INVALID');
  }
  return run;
};

const validateMeasurementAttestation = (attestation, expected = {}) => {
  if (
    attestation?.version !== 1
    || attestation.kind !== ATTESTATION_KIND
    || !attestation.payload
    || !SHA256.test(attestation.payloadSha256 ?? '')
    || canonicalSha256(attestation.payload) !== attestation.payloadSha256
    || !SHA256.test(attestation.payload.epochId ?? '')
    || typeof attestation.payload.freshness?.freshContainerForRun !== 'boolean'
    || attestation.payload.freshness?.cgroupV2Verified !== true
    || attestation.payload.catalogCacheState !== 'warmed-by-live-contract-audit'
  ) {
    throw new Error('PDCF_MEASUREMENT_ATTESTATION_INVALID');
  }
  validateRunBinding(attestation.payload.run);
  for (const [key, value] of Object.entries(expected)) {
    if (!exactCanonical(attestation.payload[key], value)) {
      throw new Error(`PDCF_MEASUREMENT_ATTESTATION_MISMATCH:${key}`);
    }
  }
  return attestation;
};

const attestMeasurementRun = ({
  manifestFile,
  secretsFile,
  postgresContainer,
  containerTemplateFile,
  expectedContainerTemplateSha256,
  run,
  notBeforeEpochMs,
  outputFile,
  environment = process.env,
}, dependencies = {}) => {
  validateRunBinding(run);
  if (!Number.isSafeInteger(notBeforeEpochMs) || notBeforeEpochMs <= 0) {
    throw new Error('PDCF_MEASUREMENT_NOT_BEFORE_INVALID');
  }
  const containerTemplateBytes = readRegularFile(containerTemplateFile);
  if (
    !SHA256.test(expectedContainerTemplateSha256 ?? '')
    || bufferSha256(containerTemplateBytes) !== expectedContainerTemplateSha256
  ) {
    throw new Error('PDCF_MEASUREMENT_CONTAINER_TEMPLATE_MISMATCH');
  }
  const containerTemplate = validateContainerTemplate(JSON.parse(
    containerTemplateBytes.toString('utf8'),
  ));
  if (containerTemplate.containerName !== postgresContainer) {
    throw new Error('PDCF_MEASUREMENT_CONTAINER_TEMPLATE_MISMATCH');
  }
  const manifestBytesBeforeLoad = readRegularFile(manifestFile);
  const provision = (dependencies.loadProvision ?? loadProvision)(
    manifestFile,
    secretsFile,
  );
  const { manifest } = provision;
  const manifestBytesAfterLoad = readRegularFile(manifestFile);
  const manifestSha256 = bufferSha256(manifestBytesBeforeLoad);
  if (
    bufferSha256(manifestBytesAfterLoad) !== manifestSha256
    || !exactCanonical(
      JSON.parse(manifestBytesAfterLoad.toString('utf8')),
      manifest,
    )
  ) {
    throw new Error('PDCF_MEASUREMENT_MANIFEST_CHANGED_DURING_AUDIT');
  }
  if (
    manifest.provisionClone?.purpose !== 'measurement'
    || run.customerCount !== manifest.customers.length
  ) {
    throw new Error('PDCF_MEASUREMENT_PROVISION_MISMATCH');
  }
  const inspection = (dependencies.inspectDockerContainer ?? inspectDockerContainer)(
    postgresContainer,
  );
  validateRunningContainerAgainstTemplate(inspection, containerTemplate);
  const container = validateContainer({
    inspection,
    container: postgresContainer,
    environment,
    notBeforeEpochMs,
  });
  const cgroup = (dependencies.inspectContainerCgroup ?? inspectContainerCgroup)(
    postgresContainer,
  );
  if (!SHA256.test(cgroup?.identitySha256 ?? '')) {
    throw new Error('PDCF_MEASUREMENT_CGROUP_IDENTITY_INVALID');
  }
  const queryJson = dependencies.runPsqlJson ?? runPsqlJson;
  const maintenanceDatabase = environment.PGDATABASE ?? 'postgres';
  const expectedPostgresSettings = postgresSettingsFromCommand(
    containerTemplate.postgresCommand,
  );
  const cluster = queryJson({
    database: maintenanceDatabase,
    sql: clusterAuditSql(Object.keys(expectedPostgresSettings).sort()),
    environment,
  });
  const postmasterStartedAtMs = Date.parse(cluster?.postmasterStartedAt ?? '');
  const livePostgresSettings = cluster?.settings;
  const expectedSettingNames = Object.keys(expectedPostgresSettings).sort();
  if (
    typeof cluster?.systemIdentifier !== 'string'
    || !/^\d+$/.test(cluster.systemIdentifier)
    || !Number.isSafeInteger(postmasterStartedAtMs)
    || Math.abs(postmasterStartedAtMs - Date.parse(container.startedAt)) > 120_000
    || !Array.isArray(cluster.databases)
    || !livePostgresSettings
    || JSON.stringify(Object.keys(livePostgresSettings).sort())
      !== JSON.stringify(expectedSettingNames)
    || expectedSettingNames.some((name) =>
      typeof livePostgresSettings[name]?.setting !== 'string'
      || livePostgresSettings[name].source !== 'command line'
    )
    || Number(livePostgresSettings.max_connections?.setting)
      !== Number(expectedPostgresSettings.max_connections)
  ) {
    throw new Error('PDCF_MEASUREMENT_CLUSTER_IDENTITY_INVALID');
  }
  const expectedDatabases = [maintenanceDatabase, ...manifest.customers.map(
    (customer) => customer.database
  )].sort();
  if (JSON.stringify(cluster.databases) !== JSON.stringify(expectedDatabases)) {
    throw new Error('PDCF_MEASUREMENT_DATABASE_INVENTORY_INVALID');
  }

  const inspectContract = dependencies.inspectCustomerContract
    ?? inspectCustomerContract;
  const customerAudits = manifest.customers.map((customer) => {
    const liveContract = inspectContract({
      customer,
      canonicalSchemas: manifest.canonicalSchemas,
      environment,
    });
    if (
      liveContract.databaseContractFingerprint !== customer.databaseContractFingerprint
      || !exactCanonical(
        liveContract.structuralFingerprints,
        customer.structuralFingerprints,
      )
    ) {
      throw new Error(`PDCF_MEASUREMENT_LIVE_CONTRACT_MISMATCH:${customer.id}`);
    }
    const rawCloneAudit = queryJson({
      database: customer.database,
      sql: buildLiveCloneAuditSql(),
      environment,
    });
    validateLiveCloneAudit(rawCloneAudit, { manifest, customer });
    return {
      customerId: customer.id,
      database: customer.database,
      databaseContractFingerprint: liveContract.databaseContractFingerprint,
      structuralFingerprints: liveContract.structuralFingerprints,
      roleSafetyProfileSha256: canonicalSha256(liveContract.roleSafetyProfile),
      notificationRoleSafetyProfileSha256:
        canonicalSha256(liveContract.notificationRoleSafetyProfile),
      extensionVersions: liveContract.extensionVersions,
      cloneAttestationSha256: rawCloneAudit.sha256,
      cloneNonceSha256: canonicalSha256(rawCloneAudit.nonce),
    };
  }).sort((left, right) => left.customerId.localeCompare(right.customerId));
  const cloneAttestationSetSha256 = provisionAttestationSetSha256(
    manifest.customers,
  );
  if (cloneAttestationSetSha256 !== manifest.provisionClone.attestationSetSha256) {
    throw new Error('PDCF_MEASUREMENT_CLONE_SET_MISMATCH');
  }
  const immutableEpoch = {
    dockerContainerId: container.id,
    dockerStartedAt: container.startedAt,
    containerConfigurationSha256: canonicalSha256({
      imageId: containerTemplate.imageId,
      entrypoint: containerTemplate.entrypoint,
      pgHost: containerTemplate.pgHost,
      pgPort: containerTemplate.pgPort,
      postgresCommand: containerTemplate.postgresCommand,
      resourceLimits: containerTemplate.resourceLimits,
    }),
    cgroupIdentitySha256: cgroup.identitySha256,
    postgresSystemIdentifier: cluster.systemIdentifier,
    postgresStartedAt: new Date(postmasterStartedAtMs).toISOString(),
    cloneId: manifest.provisionClone.id,
    cloneAttestationSetSha256,
    cloneNonceSetSha256: canonicalSha256(customerAudits.map((audit) => ({
      customerId: audit.customerId,
      cloneNonceSha256: audit.cloneNonceSha256,
    }))),
    liveContractSetSha256: canonicalSha256(customerAudits.map((audit) => ({
      customerId: audit.customerId,
      databaseContractFingerprint: audit.databaseContractFingerprint,
      structuralFingerprint: audit.structuralFingerprints.combined.sha256,
    }))),
  };
  const payload = {
    fixture: FIXTURE_ID,
    observedAt: new Date().toISOString(),
    run,
    manifestSha256,
    containerTemplateSha256: expectedContainerTemplateSha256,
    provisionClone: manifest.provisionClone,
    canonicalDatabaseContractFingerprint:
      manifest.canonicalDatabaseContractFingerprint,
    canonicalStructuralFingerprint:
      manifest.canonicalStructuralFingerprint?.combined?.sha256 ?? null,
    container,
    cgroup,
    postgres: {
      systemIdentifier: cluster.systemIdentifier,
      postmasterStartedAt: new Date(postmasterStartedAtMs).toISOString(),
      serverVersionNum: cluster.serverVersionNum,
      databases: cluster.databases,
      settings: cluster.settings,
    },
    customerAudits,
    immutableEpoch,
    epochId: canonicalSha256(immutableEpoch),
    freshness: {
      freshContainerForRun: container.freshForRun,
      cgroupV2Verified: true,
      notBeforeEpochMs,
      startToleranceMs: START_TOLERANCE_MS,
    },
    // The required full pg_dump/ACL audit warms PostgreSQL catalogs before the
    // Graphile timer starts. Results using this evidence must not call their
    // build timing pristine-catalog cold start.
    catalogCacheState: 'warmed-by-live-contract-audit',
  };
  const attestation = validateMeasurementAttestation({
    version: 1,
    kind: ATTESTATION_KIND,
    payload,
    payloadSha256: canonicalSha256(payload),
  });
  if (outputFile) writeImmutableJson(outputFile, attestation);
  return attestation;
};

const main = () => {
  const args = parseArgs(process.argv.slice(2));
  const run = {
    arm: requireString(args, 'arm'),
    heapMiB: parsePositiveInteger(requireString(args, 'heap-mib'), 'heap-mib'),
    customerCount: parsePositiveInteger(
      requireString(args, 'customers'),
      'customers',
    ),
    repetition: parsePositiveInteger(
      requireString(args, 'repetition'),
      'repetition',
    ),
    runOrderIndex: parsePositiveInteger(
      requireString(args, 'run-order-index'),
      'run-order-index',
    ),
    planSha256: requireString(args, 'plan-sha256'),
    fleetSha256: requireString(args, 'fleet-sha256'),
  };
  const result = attestMeasurementRun({
    manifestFile: path.resolve(requireString(args, 'manifest')),
    secretsFile: path.resolve(requireString(args, 'secrets')),
    postgresContainer: requireString(args, 'postgres-container'),
    containerTemplateFile: path.resolve(requireString(args, 'container-template')),
    expectedContainerTemplateSha256: requireString(
      args,
      'expected-container-template-sha256',
    ),
    run,
    notBeforeEpochMs: Number(requireString(args, 'not-before-epoch-ms')),
    outputFile: path.resolve(requireString(args, 'out')),
  });
  process.stdout.write(`${JSON.stringify({
    status: 'attested',
    epochId: result.payload.epochId,
    payloadSha256: result.payloadSha256,
  })}\n`);
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  ATTESTATION_KIND,
  attestMeasurementRun,
  canonicalSha256,
  clusterAuditSql,
  inspectContainerCgroup,
  inspectDockerContainer,
  runPsqlJson,
  validateContainer,
  validateMeasurementAttestation,
  validateRunBinding,
  writeImmutableJson,
};
