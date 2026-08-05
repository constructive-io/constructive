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
const { provision } = require('./provision.cjs');

const TEMPLATE_KIND = 'physical-density-postgres-container-template-v1';
const PREPARE_KIND = 'physical-density-measurement-prepare-v1';
const CONTAINER_NAME = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/;
const CONTAINER_ID = /^[a-f0-9]{64}$/;
const IMAGE_ID = /^sha256:[a-f0-9]{64}$/;
const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', 'localhost']);
const LABEL_FIXTURE = 'io.constructive.graphile-density.fixture';
const LABEL_PREFIX = 'io.constructive.graphile-density.prefix';
const LABEL_PURPOSE = 'io.constructive.graphile-density.purpose';
const POSTGRES_SETTINGS = new Set([
  'effective_cache_size',
  'maintenance_work_mem',
  'max_connections',
  'max_locks_per_transaction',
  'shared_buffers',
  'shared_preload_libraries',
  'track_io_timing',
  'work_mem',
]);
const POSTGRES_DATA_DIRECTORY = '/var/lib/postgresql/data';

const readRegularFile = (file) => {
  const absolute = path.resolve(file);
  const before = fs.lstatSync(absolute);
  if (before.isSymbolicLink() || !before.isFile()) {
    throw new Error('PDCF_MEASUREMENT_TEMPLATE_FILE_INVALID');
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
      throw new Error('PDCF_MEASUREMENT_TEMPLATE_FILE_INVALID');
    }
    return fs.readFileSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
};

const fileSha256 = (file) => `sha256:${crypto.createHash('sha256')
  .update(readRegularFile(file))
  .digest('hex')}`;
const bufferSha256 = (value) => `sha256:${crypto.createHash('sha256')
  .update(value)
  .digest('hex')}`;

const inspectDockerContainer = (container) => {
  try {
    const output = execFileSync('docker', ['inspect', container], {
      encoding: 'utf8',
      timeout: 30_000,
      maxBuffer: 4 * 1024 * 1024,
    });
    const records = JSON.parse(output);
    return Array.isArray(records) && records.length === 1 ? records[0] : null;
  } catch {
    return null;
  }
};

const requireNonnegativeInteger = (value, label) => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`PDCF_CONTAINER_TEMPLATE_${label}_INVALID`);
  }
  return value;
};

const normalizePostgresCommand = (command, minimumMaxConnections) => {
  const source = Array.isArray(command) && command.length > 0
    ? [...command]
    : ['postgres'];
  if (
    source[0] !== 'postgres'
    || (source.length - 1) % 2 !== 0
    || !Number.isSafeInteger(minimumMaxConnections)
    || minimumMaxConnections <= 0
  ) {
    throw new Error('PDCF_CONTAINER_POSTGRES_COMMAND_INVALID');
  }
  const settings = new Map();
  for (let index = 1; index < source.length; index += 2) {
    const flag = source[index];
    const assignment = source[index + 1];
    const match = /^([a-z_]+)=([a-zA-Z0-9_.,:/+-]+)$/.exec(assignment ?? '');
    if (
      flag !== '-c'
      || !match
      || !POSTGRES_SETTINGS.has(match[1])
      || settings.has(match[1])
    ) {
      throw new Error('PDCF_CONTAINER_POSTGRES_COMMAND_INVALID');
    }
    settings.set(match[1], match[2]);
  }
  const configuredMax = Number(settings.get('max_connections'));
  if (settings.has('max_connections') && (
    !Number.isSafeInteger(configuredMax)
    || configuredMax < minimumMaxConnections
  )) {
    throw new Error('PDCF_CONTAINER_MAX_CONNECTIONS_INSUFFICIENT');
  }
  if (!settings.has('max_connections')) {
    settings.set('max_connections', String(minimumMaxConnections));
  }
  return [
    'postgres',
    ...[...settings].sort(([left], [right]) => left.localeCompare(right))
      .flatMap(([name, value]) => ['-c', `${name}=${value}`]),
  ];
};

const postgresSettingsFromCommand = (command) => Object.fromEntries(
  Array.from({ length: (command.length - 1) / 2 }, (_, index) => {
    const [name, value] = command[index * 2 + 2].split('=', 2);
    return [name, value];
  }),
);

const captureContainerTemplate = ({
  inspection,
  container,
  prefix,
  pgHost,
  pgPort,
  minimumMaxConnections,
}) => {
  const name = String(inspection?.Name ?? '').replace(/^\//, '');
  const bindings = inspection?.NetworkSettings?.Ports?.['5432/tcp'];
  const entrypoint = inspection?.Config?.Entrypoint ?? null;
  const mounts = inspection?.Mounts ?? [];
  if (
    !CONTAINER_NAME.test(container ?? '')
    || !/^[a-z][a-z0-9_]{0,47}$/.test(prefix ?? '')
    || !LOOPBACK_HOSTS.has(pgHost)
    || !Number.isSafeInteger(pgPort)
    || pgPort <= 0
    || pgPort > 65535
    || name !== container
    || !CONTAINER_ID.test(inspection?.Id ?? '')
    || !IMAGE_ID.test(inspection?.Image ?? '')
    || inspection?.State?.Running !== true
    || !Array.isArray(bindings)
    || !bindings.some((binding) =>
      String(binding?.HostPort) === String(pgPort)
      && LOOPBACK_HOSTS.has(binding?.HostIp ?? '')
    )
    || !Array.isArray(mounts)
    || mounts.some((mount) => mount?.Destination !== POSTGRES_DATA_DIRECTORY)
    || (
      entrypoint != null
      && (
        !Array.isArray(entrypoint)
        || entrypoint.length !== 1
        || !/^[a-zA-Z0-9_./-]+$/.test(entrypoint[0] ?? '')
      )
    )
  ) {
    throw new Error('PDCF_CONTAINER_TEMPLATE_SOURCE_INVALID');
  }
  const template = {
    version: 1,
    fixture: FIXTURE_ID,
    kind: TEMPLATE_KIND,
    containerName: container,
    sourceContainerId: inspection.Id,
    imageId: inspection.Image,
    prefix,
    pgHost,
    pgPort,
    entrypoint,
    postgresCommand: normalizePostgresCommand(
      inspection.Config?.Cmd,
      minimumMaxConnections,
    ),
    resourceLimits: {
      memoryBytes: requireNonnegativeInteger(
        inspection.HostConfig?.Memory ?? 0,
        'MEMORY',
      ),
      memorySwapBytes: requireNonnegativeInteger(
        inspection.HostConfig?.MemorySwap ?? 0,
        'MEMORY_SWAP',
      ),
      nanoCpus: requireNonnegativeInteger(
        inspection.HostConfig?.NanoCpus ?? 0,
        'NANO_CPUS',
      ),
      shmSizeBytes: requireNonnegativeInteger(
        inspection.HostConfig?.ShmSize ?? 0,
        'SHM_SIZE',
      ),
    },
  };
  return validateContainerTemplate(template);
};

const validateContainerTemplate = (template) => {
  if (
    JSON.stringify(Object.keys(template ?? {}).sort()) !== JSON.stringify([
      'containerName',
      'entrypoint',
      'fixture',
      'imageId',
      'kind',
      'pgHost',
      'pgPort',
      'postgresCommand',
      'prefix',
      'resourceLimits',
      'sourceContainerId',
      'version',
    ])
    || JSON.stringify(Object.keys(template?.resourceLimits ?? {}).sort())
      !== JSON.stringify([
        'memoryBytes',
        'memorySwapBytes',
        'nanoCpus',
        'shmSizeBytes',
      ])
    ||
    template?.version !== 1
    || template.fixture !== FIXTURE_ID
    || template.kind !== TEMPLATE_KIND
    || !CONTAINER_NAME.test(template.containerName ?? '')
    || !CONTAINER_ID.test(template.sourceContainerId ?? '')
    || !IMAGE_ID.test(template.imageId ?? '')
    || !/^[a-z][a-z0-9_]{0,47}$/.test(template.prefix ?? '')
    || !LOOPBACK_HOSTS.has(template.pgHost)
    || !Number.isSafeInteger(template.pgPort)
    || template.pgPort <= 0
    || template.pgPort > 65535
    || !template.resourceLimits
    || !Array.isArray(template.postgresCommand)
    || (
      template.entrypoint != null
      && (
        !Array.isArray(template.entrypoint)
        || template.entrypoint.length !== 1
        || !/^[a-zA-Z0-9_./-]+$/.test(template.entrypoint[0] ?? '')
      )
    )
  ) {
    throw new Error('PDCF_CONTAINER_TEMPLATE_INVALID');
  }
  for (const [key, value] of Object.entries(template.resourceLimits)) {
    requireNonnegativeInteger(value, key.toUpperCase());
  }
  normalizePostgresCommand(
    template.postgresCommand,
    Number(postgresSettingsFromCommand(template.postgresCommand).max_connections),
  );
  return template;
};

const validateExistingTarget = (inspection, template) => {
  if (!inspection) return null;
  const name = String(inspection.Name ?? '').replace(/^\//, '');
  const labels = inspection.Config?.Labels ?? {};
  const ownedReplacement = labels[LABEL_FIXTURE] === FIXTURE_ID
    && labels[LABEL_PREFIX] === template.prefix
    && labels[LABEL_PURPOSE] === 'measurement'
    && inspection.Image === template.imageId;
  if (
    name !== template.containerName
    || !CONTAINER_ID.test(inspection.Id ?? '')
    || (inspection.Id !== template.sourceContainerId && !ownedReplacement)
  ) {
    throw new Error('PDCF_CONTAINER_RECREATE_TARGET_NOT_OWNED');
  }
  return inspection.Id;
};

const dockerRunArgs = (template, environment) => {
  const pgUser = environment.PGUSER;
  const pgPassword = environment.PGPASSWORD;
  const maintenanceDatabase = environment.PGDATABASE ?? 'postgres';
  if (
    typeof pgUser !== 'string'
    || !pgUser
    || typeof pgPassword !== 'string'
    || !pgPassword
    || typeof maintenanceDatabase !== 'string'
    || !maintenanceDatabase
  ) {
    throw new Error('PDCF_CONTAINER_ADMIN_CREDENTIALS_REQUIRED');
  }
  const limits = template.resourceLimits;
  const args = [
    'run', '--detach',
    '--name', template.containerName,
    '--label', `${LABEL_FIXTURE}=${FIXTURE_ID}`,
    '--label', `${LABEL_PREFIX}=${template.prefix}`,
    '--label', `${LABEL_PURPOSE}=measurement`,
    '--publish', `127.0.0.1:${template.pgPort}:5432`,
    '--env', 'POSTGRES_USER',
    '--env', 'POSTGRES_PASSWORD',
    '--env', 'POSTGRES_DB',
  ];
  if (template.entrypoint) {
    args.push('--entrypoint', template.entrypoint[0]);
  }
  if (limits.memoryBytes > 0) args.push('--memory', String(limits.memoryBytes));
  if (limits.memorySwapBytes > 0) {
    args.push('--memory-swap', String(limits.memorySwapBytes));
  }
  if (limits.nanoCpus > 0) args.push('--cpus', String(limits.nanoCpus / 1e9));
  if (limits.shmSizeBytes > 0) args.push('--shm-size', String(limits.shmSizeBytes));
  args.push(template.imageId, ...template.postgresCommand);
  return args;
};

const validateRunningContainerAgainstTemplate = (inspection, template) => {
  const labels = inspection?.Config?.Labels ?? {};
  const bindings = inspection?.NetworkSettings?.Ports?.['5432/tcp'];
  if (
    !CONTAINER_ID.test(inspection?.Id ?? '')
    || inspection.Image !== template.imageId
    || inspection.State?.Running !== true
    || JSON.stringify(inspection.Config?.Cmd ?? [])
      !== JSON.stringify(template.postgresCommand)
    || JSON.stringify(inspection.Config?.Entrypoint ?? null)
      !== JSON.stringify(template.entrypoint)
    || inspection.HostConfig?.Memory !== template.resourceLimits.memoryBytes
    || inspection.HostConfig?.MemorySwap !== template.resourceLimits.memorySwapBytes
    || inspection.HostConfig?.NanoCpus !== template.resourceLimits.nanoCpus
    || inspection.HostConfig?.ShmSize !== template.resourceLimits.shmSizeBytes
    || !Array.isArray(bindings)
    || !bindings.some((binding) =>
      String(binding?.HostPort) === String(template.pgPort)
      && LOOPBACK_HOSTS.has(binding?.HostIp ?? '')
    )
    || labels[LABEL_FIXTURE] !== FIXTURE_ID
    || labels[LABEL_PREFIX] !== template.prefix
    || labels[LABEL_PURPOSE] !== 'measurement'
  ) {
    throw new Error('PDCF_FRESH_POSTGRES_CONTAINER_IDENTITY_INVALID');
  }
  return inspection;
};

const dockerExec = (args, environment = process.env) => {
  try {
    return execFileSync('docker', args, {
      encoding: 'utf8',
      timeout: 120_000,
      maxBuffer: 4 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: environment,
    });
  } catch {
    // Keep Docker diagnostics generic. The disposable admin password is passed
    // only through the child environment and must never enter cperf logs.
    throw new Error('PDCF_DOCKER_LIFECYCLE_COMMAND_FAILED');
  }
};

const waitForPostgres = ({ environment, timeoutMs = 120_000 }) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = spawnSync('psql', [
      '--no-psqlrc',
      '--no-align',
      '--tuples-only',
      '--quiet',
      '--set=ON_ERROR_STOP=1',
      '--command', 'SELECT 1',
    ], {
      cwd: __dirname,
      env: environment,
      encoding: 'utf8',
      timeout: 5_000,
    });
    if (result.status === 0 && String(result.stdout).trim() === '1') return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  }
  throw new Error('PDCF_FRESH_POSTGRES_READINESS_TIMEOUT');
};

const runBindingCloneId = (run, randomBytes = crypto.randomBytes) => {
  const coordinate = [
    run.arm,
    run.heapMiB,
    run.customerCount,
    run.repetition,
    run.runOrderIndex,
  ].join('\0');
  const coordinateHash = crypto.createHash('sha256').update(coordinate).digest('hex');
  return `measurement-${coordinateHash.slice(0, 20)}-${randomBytes(8).toString('hex')}`;
};

const publishExclusive = (source, destination, mode) => {
  fs.linkSync(source, destination);
  if (mode != null) fs.chmodSync(destination, mode);
  fs.unlinkSync(source);
};

const writeImmutableJson = (file, value, mode = 0o644) => {
  const temporary = `${file}.${process.pid}.${crypto.randomBytes(8).toString('hex')}.tmp`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, {
      flag: 'wx',
      mode,
    });
    publishExclusive(temporary, file, mode);
  } finally {
    try { fs.unlinkSync(temporary); } catch { /* Preserve the primary error. */ }
  }
};

const prepareMeasurementRun = ({
  containerTemplateFile,
  expectedContainerTemplateSha256,
  manifestTemplateFile,
  secretsTemplateFile,
  expectedManifestTemplateSha256,
  artifactDir,
  run,
  environment = process.env,
}, dependencies = {}) => {
  const containerTemplateBytes = readRegularFile(containerTemplateFile);
  if (
    !/^sha256:[a-f0-9]{64}$/.test(expectedContainerTemplateSha256 ?? '')
    || bufferSha256(containerTemplateBytes) !== expectedContainerTemplateSha256
  ) {
    throw new Error('PDCF_CONTAINER_TEMPLATE_SHA256_MISMATCH');
  }
  const template = validateContainerTemplate(JSON.parse(
    containerTemplateBytes.toString('utf8'),
  ));
  const manifestTemplateBytes = readRegularFile(manifestTemplateFile);
  if (
    !/^sha256:[a-f0-9]{64}$/.test(expectedManifestTemplateSha256 ?? '')
    || bufferSha256(manifestTemplateBytes) !== expectedManifestTemplateSha256
  ) {
    throw new Error('PDCF_MEASUREMENT_MANIFEST_TEMPLATE_SHA256_MISMATCH');
  }
  const absoluteArtifactDir = path.resolve(artifactDir);
  fs.mkdirSync(absoluteArtifactDir, { recursive: true, mode: 0o700 });
  const manifestOut = path.join(absoluteArtifactDir, 'provision.json');
  const secretsOut = path.join(absoluteArtifactDir, 'runtime-secrets.json');
  const prepareOut = path.join(absoluteArtifactDir, 'prepare-attestation.json');
  if ([manifestOut, secretsOut, prepareOut].some((file) => fs.existsSync(file))) {
    throw new Error('PDCF_FRESH_POSTGRES_ARTIFACT_ALREADY_EXISTS');
  }
  if (
    !run
    || typeof run.arm !== 'string'
    || !run.arm
    || !Number.isSafeInteger(run.heapMiB)
    || run.heapMiB <= 0
    || !Number.isSafeInteger(run.customerCount)
    || run.customerCount <= 0
    || !Number.isSafeInteger(run.repetition)
    || run.repetition <= 0
    || !Number.isSafeInteger(run.runOrderIndex)
    || run.runOrderIndex <= 0
  ) {
    throw new Error('PDCF_MEASUREMENT_PREPARE_RUN_BINDING_INVALID');
  }
  const { manifest: sourceManifest, secretResolver } = (
    dependencies.loadProvision ?? loadProvision
  )(manifestTemplateFile, secretsTemplateFile);
  if (fileSha256(manifestTemplateFile) !== expectedManifestTemplateSha256) {
    throw new Error('PDCF_MEASUREMENT_MANIFEST_TEMPLATE_SHA256_MISMATCH');
  }
  if (
    sourceManifest.prefix !== template.prefix
    || sourceManifest.customers.length < run.customerCount
    || sourceManifest.provisionClone?.purpose !== 'measurement'
  ) {
    throw new Error('PDCF_MEASUREMENT_PREPARE_TEMPLATE_MISMATCH');
  }
  const selectedCustomers = sourceManifest.customers.slice(0, run.customerCount);
  const credentialTemplate = {
    runtimePasswords: Object.fromEntries(selectedCustomers.flatMap((customer) =>
      Object.values(customer.roles).map((role) => [
        role,
        secretResolver.runtimePasswordFor(role),
      ])
    )),
    notificationPasswords: Object.fromEntries(selectedCustomers.map((customer) => [
      customer.notificationRole,
      secretResolver.notificationPasswordFor(customer.notificationRole),
    ])),
  };
  const inspect = dependencies.inspectDockerContainer ?? inspectDockerContainer;
  const removeContainer = dependencies.removeContainer
    ?? ((container) => dockerExec(['container', 'rm', '--force', '--volumes', container]));
  const startContainer = dependencies.startContainer
    ?? ((args) => dockerExec(args, {
      ...process.env,
      POSTGRES_USER: environment.PGUSER,
      POSTGRES_PASSWORD: environment.PGPASSWORD,
      POSTGRES_DB: environment.PGDATABASE ?? 'postgres',
    }));
  const existing = inspect(template.containerName);
  const existingTargetId = validateExistingTarget(existing, template);
  if (existingTargetId) {
    // Remove the immutable ID we just attested, not the mutable container name;
    // this closes the inspect/remove name-swap window around a destructive call.
    removeContainer(existingTargetId);
  }
  startContainer(dockerRunArgs(template, environment));
  const postgresEnvironment = {
    ...environment,
    PGHOST: template.pgHost,
    PGPORT: String(template.pgPort),
  };
  (dependencies.waitForPostgres ?? waitForPostgres)({
    environment: postgresEnvironment,
  });

  const cloneId = runBindingCloneId(run, dependencies.randomBytes);
  const stagingDir = fs.mkdtempSync(path.join(absoluteArtifactDir, '.prepare-'));
  let provisioned;
  try {
    provisioned = (dependencies.provision ?? provision)({
      prefix: template.prefix,
      customerCount: run.customerCount,
      outDir: stagingDir,
      maintenanceDatabase: environment.PGDATABASE ?? 'postgres',
      schemaFile: path.join(__dirname, '../complete-tenant-fixture/schema.sql'),
      identityFile: path.join(__dirname, 'physical-identity.sql'),
      attestationFile: path.join(__dirname, 'provision-attestation.sql'),
      cloneId,
      runPurpose: 'measurement',
      recreate: false,
      environment: postgresEnvironment,
      canonicalSchemas: sourceManifest.canonicalSchemas,
      credentialTemplate,
    });
    if (
      provisioned.manifest.canonicalDatabaseContractFingerprint
        !== sourceManifest.canonicalDatabaseContractFingerprint
      || JSON.stringify(provisioned.manifest.canonicalStructuralFingerprint)
        !== JSON.stringify(sourceManifest.canonicalStructuralFingerprint)
      || JSON.stringify(provisioned.manifest.canonicalSchemas)
        !== JSON.stringify(sourceManifest.canonicalSchemas)
    ) {
      throw new Error('PDCF_FRESH_POSTGRES_CONTRACT_DRIFT');
    }
    publishExclusive(provisioned.secretsFile, secretsOut, 0o600);
    publishExclusive(provisioned.manifestFile, manifestOut, 0o644);
    fs.rmdirSync(stagingDir);
  } catch (error) {
    try {
      if (fs.existsSync(stagingDir)) fs.rmSync(stagingDir, { recursive: true });
    } catch {
      // Preserve the primary preparation error.
    }
    throw error;
  }
  const current = validateRunningContainerAgainstTemplate(
    inspect(template.containerName),
    template,
  );
  if (
    current.Id === existing?.Id
  ) {
    throw new Error('PDCF_FRESH_POSTGRES_CONTAINER_IDENTITY_INVALID');
  }
  const result = {
    version: 1,
    fixture: FIXTURE_ID,
    kind: PREPARE_KIND,
    preparedAt: new Date().toISOString(),
    run,
    container: {
      name: template.containerName,
      id: current.Id,
      imageId: current.Image,
    },
    cloneId,
    manifestFile: manifestOut,
    manifestSha256: fileSha256(manifestOut),
    secretsFile: secretsOut,
    credentialTemplate: 'private-0600-reused-without-serialization',
  };
  writeImmutableJson(prepareOut, result);
  return result;
};

const main = () => {
  const args = parseArgs(process.argv.slice(2));
  const result = prepareMeasurementRun({
    containerTemplateFile: path.resolve(requireString(args, 'container-template')),
    expectedContainerTemplateSha256: requireString(
      args,
      'expected-container-template-sha256',
    ),
    manifestTemplateFile: path.resolve(requireString(args, 'manifest-template')),
    secretsTemplateFile: path.resolve(requireString(args, 'secrets-template')),
    expectedManifestTemplateSha256: requireString(
      args,
      'expected-manifest-template-sha256',
    ),
    artifactDir: path.resolve(requireString(args, 'artifact-dir')),
    run: {
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
    },
  });
  process.stdout.write(`${JSON.stringify({
    status: 'prepared',
    containerId: result.container.id,
    cloneId: result.cloneId,
    manifestSha256: result.manifestSha256,
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
  PREPARE_KIND,
  TEMPLATE_KIND,
  captureContainerTemplate,
  dockerRunArgs,
  inspectDockerContainer,
  normalizePostgresCommand,
  postgresSettingsFromCommand,
  prepareMeasurementRun,
  publishExclusive,
  runBindingCloneId,
  validateContainerTemplate,
  validateExistingTarget,
  validateRunningContainerAgainstTemplate,
  writeImmutableJson,
};
