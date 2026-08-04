'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const CALIBRATION_KIND = 'graphile-cache-measured-calibration-v2';
const SHA256 = /^sha256:[a-f0-9]{64}$/;

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

const fileSha256 = (file) => `sha256:${crypto.createHash('sha256')
  .update(fs.readFileSync(file))
  .digest('hex')}`;

const positiveSafeInteger = (value, label) => {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`PDCF_CALIBRATION_POSITIVE_INTEGER_REQUIRED:${label}`);
  }
  return value;
};

const validateSafetyFactor = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1 || value > 3) {
    throw new Error('PDCF_CALIBRATION_SAFETY_FACTOR_INVALID');
  }
  return value;
};

const validateCatalogResult = (result, sourceFile) => {
  if (
    !result
    || result.version !== 1
    || result.status !== 'performance-only'
    || !['stock', 'scoped-required'].includes(result.mode)
    || result.introspectionClientReleaseMode !== 'destroy'
    || result.releaseBuildStateAfterValidation !== true
    || typeof result.worktreeDirty !== 'boolean'
    || !Array.isArray(result.schemaSets)
    || result.schemaSets.length !== 1
    || !Array.isArray(result.schemaSets[0])
    || result.schemaSets[0].length === 0
    || !Array.isArray(result.allowedDependencySchemas)
    || !Array.isArray(result.builds)
    || result.builds.length !== 1
    || !Array.isArray(result.snapshots)
    || result.tokenCanariesConclusive !== true
    || result.tokenCanariesPassed !== true
    || result.bleedViolations !== 0
    || typeof result.fixtureFingerprint !== 'string'
    || result.fixtureFingerprint.length === 0
    || !/^[a-f0-9]{64}$/.test(result.sourceStateSha256 ?? '')
    || !/^[a-f0-9]{64}$/.test(result.executedEntrySha256 ?? '')
  ) {
    throw new Error(`PDCF_CALIBRATION_RESULT_NOT_CONCLUSIVE:${sourceFile}`);
  }
  const snapshot = result.snapshots.find((candidate) => candidate.instances === 1);
  if (!snapshot) throw new Error(`PDCF_CALIBRATION_ONE_SURFACE_SNAPSHOT_REQUIRED:${sourceFile}`);
  const build = result.builds[0];
  const introspectionBackendPid = positiveSafeInteger(
    build.introspectionBackendPid,
    `${sourceFile}:introspectionBackendPid`,
  );
  const steadyBackendPid = positiveSafeInteger(
    build.steadyBackendPid,
    `${sourceFile}:steadyBackendPid`,
  );
  if (
    build.introspectionBackendRetired !== true
    || introspectionBackendPid === steadyBackendPid
    || result.postgresBackendMeasurement?.expectedRetirementChecks !== result.builds.length
    || result.postgresBackendMeasurement?.completedRetirementChecks !== result.builds.length
    || result.postgresBackendMeasurement?.allExpectedRetirementsProven !== true
  ) {
    throw new Error(`PDCF_CALIBRATION_INTROSPECTION_RETIREMENT_UNPROVEN:${sourceFile}`);
  }
  if (!Number.isSafeInteger(build.buildTransientSampleCount) || build.buildTransientSampleCount <= 0) {
    throw new Error(`PDCF_CALIBRATION_BUILD_SAMPLES_REQUIRED:${sourceFile}`);
  }
  const retainedHeapBytes = positiveSafeInteger(
    Math.ceil(snapshot.heapDeltaBytes),
    `${sourceFile}:retainedHeapBytes`,
  );
  const serverBaselineHeapBytes = positiveSafeInteger(
    Math.ceil(build.buildBaselineHeapUsedBytes),
    `${sourceFile}:serverBaselineHeapBytes`,
  );
  const buildTransientHeapBytes = positiveSafeInteger(
    Math.ceil(Math.max(
      build.sampledBuildPeakHeapDeltaBytes ?? 0,
      retainedHeapBytes,
    )),
    `${sourceFile}:buildTransientHeapBytes`,
  );
  const buildTransientRssBytes = positiveSafeInteger(
    Math.ceil(Math.max(
      build.sampledBuildPeakRssDeltaBytes ?? 0,
      build.processBuildPeakRssDeltaBytes ?? 0,
    )),
    `${sourceFile}:buildTransientRssBytes`,
  );
  return {
    mode: result.mode,
    introspectionClientReleaseMode: result.introspectionClientReleaseMode,
    releaseBuildStateAfterValidation: result.releaseBuildStateAfterValidation,
    introspectionBackendRetirement: {
      conclusive: true,
      introspectionBackendPid,
      steadyBackendPid,
    },
    fixtureFingerprint: result.fixtureFingerprint,
    schemaSets: result.schemaSets,
    allowedDependencySchemas: result.allowedDependencySchemas,
    sourceStateSha256: result.sourceStateSha256,
    executedEntrySha256: result.executedEntrySha256,
    worktreeDirty: result.worktreeDirty,
    retainedHeapBytes,
    serverBaselineHeapBytes,
    buildTransientHeapBytes,
    buildTransientRssBytes,
  };
};

const deriveCacheCalibration = ({
  resultFiles,
  databaseContractFingerprint,
  safetyFactor = 1.25,
}) => {
  if (!Array.isArray(resultFiles) || resultFiles.length < 3) {
    throw new Error('PDCF_CALIBRATION_THREE_RESULTS_REQUIRED');
  }
  if (!SHA256.test(databaseContractFingerprint ?? '')) {
    throw new Error('PDCF_CALIBRATION_DATABASE_CONTRACT_REQUIRED');
  }
  validateSafetyFactor(safetyFactor);
  const sources = resultFiles.map((sourceFile) => {
    const absolute = path.resolve(sourceFile);
    const result = JSON.parse(fs.readFileSync(absolute, 'utf8'));
    return {
      fileSha256: fileSha256(absolute),
      measurement: validateCatalogResult(result, absolute),
    };
  });
  const modes = new Set(sources.map((source) => source.measurement.mode));
  const releaseModes = new Set(sources.map(
    (source) => source.measurement.introspectionClientReleaseMode
  ));
  const buildStateRetirementModes = new Set(sources.map(
    (source) => source.measurement.releaseBuildStateAfterValidation
  ));
  const fixtureFingerprints = new Set(
    sources.map((source) => source.measurement.fixtureFingerprint)
  );
  const schemaContracts = new Set(sources.map((source) => JSON.stringify({
    schemaSets: source.measurement.schemaSets,
    allowedDependencySchemas: source.measurement.allowedDependencySchemas,
  })));
  if (
    modes.size !== 1
    || releaseModes.size !== 1
    || !releaseModes.has('destroy')
    || buildStateRetirementModes.size !== 1
    || !buildStateRetirementModes.has(true)
    || fixtureFingerprints.size !== 1
    || schemaContracts.size !== 1
  ) {
    throw new Error('PDCF_CALIBRATION_RESULT_SCOPE_MISMATCH');
  }
  const maximum = (field) => Math.max(...sources.map(
    (source) => source.measurement[field]
  ));
  const measured = {
    repetitions: sources.length,
    retainedHeapPerSurfaceBytes: maximum('retainedHeapBytes'),
    serverBaselineHeapBytes: maximum('serverBaselineHeapBytes'),
    buildTransientHeapBytes: maximum('buildTransientHeapBytes'),
    buildTransientRssBytes: maximum('buildTransientRssBytes'),
  };
  const configured = {
    instanceHeapBytes: Math.ceil(measured.retainedHeapPerSurfaceBytes * safetyFactor),
    serverReserveBytes: Math.ceil(measured.serverBaselineHeapBytes * safetyFactor),
    buildReserveBytes: Math.ceil(measured.buildTransientHeapBytes * safetyFactor),
    rssBuildReserveBytes: Math.ceil(measured.buildTransientRssBytes * safetyFactor),
  };
  const identityPayload = {
    kind: CALIBRATION_KIND,
    databaseContractFingerprint,
    introspectionMode: [...modes][0],
    introspectionClientReleaseMode: [...releaseModes][0],
    releaseBuildStateAfterValidation: [...buildStateRetirementModes][0],
    introspectionBackendRetirementConclusive: sources.every(
      (source) => source.measurement.introspectionBackendRetirement.conclusive === true
    ),
    fixtureFingerprint: [...fixtureFingerprints][0],
    schemaContract: JSON.parse([...schemaContracts][0]),
    safetyFactor,
    measured,
    configured,
    sourceWorktreesClean: sources.every(
      (source) => source.measurement.worktreeDirty === false
    ),
    sources: sources.map(({ fileSha256: sourceSha256, measurement }) => ({
      sourceSha256,
      sourceStateSha256: measurement.sourceStateSha256,
      executedEntrySha256: measurement.executedEntrySha256,
      worktreeDirty: measurement.worktreeDirty,
      introspectionBackendRetirement: measurement.introspectionBackendRetirement,
    })),
  };
  return {
    version: 2,
    ...identityPayload,
    calibrationId: sha256Canonical(identityPayload),
  };
};

const validateCacheCalibration = (
  calibration,
  { databaseContractFingerprint, introspectionMode } = {},
) => {
  if (
    !calibration
    || calibration.version !== 2
    || calibration.kind !== CALIBRATION_KIND
    || !SHA256.test(calibration.calibrationId ?? '')
    || !SHA256.test(calibration.databaseContractFingerprint ?? '')
    || !Array.isArray(calibration.sources)
    || calibration.sources.length < 3
    || !['stock', 'scoped-required'].includes(calibration.introspectionMode)
    || calibration.introspectionClientReleaseMode !== 'destroy'
    || calibration.releaseBuildStateAfterValidation !== true
    || calibration.introspectionBackendRetirementConclusive !== true
    || typeof calibration.fixtureFingerprint !== 'string'
    || calibration.fixtureFingerprint.length === 0
    || typeof calibration.sourceWorktreesClean !== 'boolean'
  ) {
    throw new Error('PDCF_CACHE_CALIBRATION_INVALID');
  }
  validateSafetyFactor(calibration.safetyFactor);
  for (const field of [
    'retainedHeapPerSurfaceBytes',
    'serverBaselineHeapBytes',
    'buildTransientHeapBytes',
    'buildTransientRssBytes',
  ]) positiveSafeInteger(calibration.measured?.[field], `measured.${field}`);
  for (const field of [
    'instanceHeapBytes',
    'serverReserveBytes',
    'buildReserveBytes',
    'rssBuildReserveBytes',
  ]) positiveSafeInteger(calibration.configured?.[field], `configured.${field}`);
  if (calibration.measured?.repetitions !== calibration.sources.length) {
    throw new Error('PDCF_CACHE_CALIBRATION_REPETITION_MISMATCH');
  }
  if (calibration.sources.some((source) => (
    !SHA256.test(source?.sourceSha256 ?? '')
    || !/^[a-f0-9]{64}$/.test(source?.sourceStateSha256 ?? '')
    || !/^[a-f0-9]{64}$/.test(source?.executedEntrySha256 ?? '')
    || source?.introspectionBackendRetirement?.conclusive !== true
    || !Number.isSafeInteger(
      source?.introspectionBackendRetirement?.introspectionBackendPid
    )
    || source.introspectionBackendRetirement.introspectionBackendPid <= 0
    || !Number.isSafeInteger(source?.introspectionBackendRetirement?.steadyBackendPid)
    || source.introspectionBackendRetirement.steadyBackendPid <= 0
    || source.introspectionBackendRetirement.introspectionBackendPid
      === source.introspectionBackendRetirement.steadyBackendPid
  ))) {
    throw new Error('PDCF_CACHE_CALIBRATION_SOURCE_INVALID');
  }
  if (
    calibration.sourceWorktreesClean
    !== calibration.sources.every((source) => source.worktreeDirty === false)
  ) {
    throw new Error('PDCF_CACHE_CALIBRATION_SOURCE_CLEANLINESS_MISMATCH');
  }
  const expectedConfigured = {
    instanceHeapBytes: Math.ceil(
      calibration.measured.retainedHeapPerSurfaceBytes * calibration.safetyFactor
    ),
    serverReserveBytes: Math.ceil(
      calibration.measured.serverBaselineHeapBytes * calibration.safetyFactor
    ),
    buildReserveBytes: Math.ceil(
      calibration.measured.buildTransientHeapBytes * calibration.safetyFactor
    ),
    rssBuildReserveBytes: Math.ceil(
      calibration.measured.buildTransientRssBytes * calibration.safetyFactor
    ),
  };
  if (JSON.stringify(expectedConfigured) !== JSON.stringify(calibration.configured)) {
    throw new Error('PDCF_CACHE_CALIBRATION_FORMULA_MISMATCH');
  }
  const { calibrationId: _calibrationId, version: _version, ...identityPayload } = calibration;
  if (sha256Canonical(identityPayload) !== calibration.calibrationId) {
    throw new Error('PDCF_CACHE_CALIBRATION_ID_MISMATCH');
  }
  if (
    databaseContractFingerprint
    && calibration.databaseContractFingerprint !== databaseContractFingerprint
  ) {
    throw new Error('PDCF_CACHE_CALIBRATION_DATABASE_CONTRACT_MISMATCH');
  }
  if (introspectionMode && calibration.introspectionMode !== introspectionMode) {
    throw new Error('PDCF_CACHE_CALIBRATION_MODE_MISMATCH');
  }
  return calibration;
};

const computeCalibratedCapacity = (heapLimitBytes, configured) => {
  positiveSafeInteger(heapLimitBytes, 'heapLimitBytes');
  const instance = positiveSafeInteger(configured?.instanceHeapBytes, 'instanceHeapBytes');
  const server = positiveSafeInteger(configured?.serverReserveBytes, 'serverReserveBytes');
  const build = positiveSafeInteger(configured?.buildReserveBytes, 'buildReserveBytes');
  if (server + build > heapLimitBytes) return 0;
  const backingCapacity = Math.max(
    1024,
    Math.min(65_536, Math.floor(heapLimitBytes / (256 * 1024))),
  );
  const byResidency = Math.floor((heapLimitBytes - server) / instance);
  const byRebuild = Math.floor((heapLimitBytes - server - build) / instance) + 1;
  return Math.max(0, Math.min(backingCapacity, byResidency, byRebuild));
};

const parseArgs = (argv) => {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index];
    if (!name.startsWith('--') || index + 1 >= argv.length) {
      throw new Error(`PDCF_CALIBRATION_ARGUMENT_INVALID:${name}`);
    }
    result[name.slice(2)] = argv[++index];
  }
  return result;
};

const main = () => {
  const args = parseArgs(process.argv.slice(2));
  if (!args.results || !args.out) throw new Error('PDCF_CALIBRATION_ARGUMENTS_REQUIRED');
  if (Boolean(args.manifest) === Boolean(args['database-contract'])) {
    throw new Error('PDCF_CALIBRATION_REQUIRES_ONE_DATABASE_CONTRACT_SOURCE');
  }
  const manifest = args.manifest
    ? JSON.parse(fs.readFileSync(path.resolve(args.manifest), 'utf8'))
    : null;
  const calibration = deriveCacheCalibration({
    resultFiles: args.results.split(',').map((value) => value.trim()).filter(Boolean),
    databaseContractFingerprint: manifest?.canonicalDatabaseContractFingerprint
      ?? args['database-contract'],
    safetyFactor: Number(args['safety-factor'] ?? '1.25'),
  });
  const output = path.resolve(args.out);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  if (fs.existsSync(output)) throw new Error(`PDCF_CALIBRATION_REFUSES_OVERWRITE:${output}`);
  fs.writeFileSync(output, `${JSON.stringify(calibration, null, 2)}\n`, { mode: 0o644 });
  process.stdout.write(`${JSON.stringify({
    status: 'calibrated',
    calibrationId: calibration.calibrationId,
    output,
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
  CALIBRATION_KIND,
  computeCalibratedCapacity,
  deriveCacheCalibration,
  sha256Canonical,
  validateCacheCalibration,
  validateCatalogResult,
};
