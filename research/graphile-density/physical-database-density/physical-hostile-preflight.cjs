'use strict';

const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const {
  REPO_ROOT,
  TENANTS,
  assertCredentialFree,
  assertLoopbackBaseUrl,
  parseArgs,
  requireString,
} = require('../complete-tenant-fixture/lib.cjs');
const {
  assertCustomerPathPrefix,
  assertIdentity,
  control,
  identityOperation,
  postGraphql,
  requestJson,
  runHostileValidation,
} = require('../complete-tenant-fixture/hostile-validation.cjs');
const {
  FIXTURE_ID,
  atomicWriteJson,
} = require('./lib.cjs');
const { provisionAttestationSetSha256 } = require('./provision.cjs');
const {
  ADMISSION_SCOPE,
  CLEANUP_AUDIT_KIND,
  PROBE_CAPABILITIES,
  PROBE_KIND,
  expectedAuditedProfiles,
  loadPrivateProvision,
  runUnsafeRuntimeStartupMatrix,
} = require('./unsafe-runtime-startup-probe.cjs');

const FIXTURE_DIR = __dirname;
const SHA256_PATTERN = /^sha256:[a-f0-9]{64}$/;
const VALIDATOR_ENTRY_FILES = Object.freeze([
  'research/graphile-density/physical-database-density/physical-hostile-preflight.cjs',
  'research/graphile-density/physical-database-density/lib.cjs',
  'research/graphile-density/complete-tenant-fixture/hostile-validation.cjs',
  'research/graphile-density/complete-tenant-fixture/generate-inputs.cjs',
  'research/graphile-density/complete-tenant-fixture/lib.cjs',
  'research/graphile-density/complete-tenant-fixture/server.cjs',
  'research/graphile-density/complete-tenant-fixture/schema.sql',
  'research/graphile-density/physical-database-density/server.cjs',
  'research/graphile-density/physical-database-density/physical-identity.sql',
  'research/graphile-density/physical-database-density/provision.cjs',
  'research/graphile-density/physical-database-density/provision-attestation.sql',
  'research/graphile-density/physical-database-density/unsafe-runtime-startup-probe.cjs',
]);

const sha256Buffer = (value) => `sha256:${crypto.createHash('sha256')
  .update(value)
  .digest('hex')}`;

const fileSha256 = (file) => sha256Buffer(fs.readFileSync(file));

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [
    key,
    canonicalize(value[key]),
  ]));
};

const canonicalSha256 = (value) => sha256Buffer(JSON.stringify(canonicalize(value)));
const canonicalEqual = (left, right) =>
  JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));

const exactKeys = (value, expected) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
};

const requireSha256 = (value, code) => {
  if (!SHA256_PATTERN.test(value ?? '')) throw new Error(code);
  return value;
};

const requireArtifactLabel = (value, code) => {
  if (
    typeof value !== 'string'
    || !/^[a-z0-9][a-z0-9._-]{0,127}$/i.test(value)
  ) {
    throw new Error(code);
  }
  return value;
};

const assertOutputDoesNotAliasInputs = (outputFile, inputFiles) => {
  if (!outputFile) return null;
  const absoluteOutputFile = path.resolve(outputFile);
  let outputStat = null;
  try {
    outputStat = fs.statSync(absoluteOutputFile);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  for (const inputFile of inputFiles) {
    const absoluteInputFile = path.resolve(inputFile);
    if (absoluteInputFile === absoluteOutputFile) {
      throw new Error('PDCF_HOSTILE_OUTPUT_ALIASES_INPUT');
    }
    if (outputStat) {
      const inputStat = fs.statSync(absoluteInputFile);
      if (inputStat.dev === outputStat.dev && inputStat.ino === outputStat.ino) {
        throw new Error('PDCF_HOSTILE_OUTPUT_ALIASES_INPUT');
      }
    }
  }
  return absoluteOutputFile;
};

const expectedLiveProvisionAttestation = (manifest, customer) => ({
  version: 1,
  cloneId: manifest.provisionClone.id,
  purpose: manifest.provisionClone.purpose,
  customerId: customer.id,
  database: customer.database,
  sha256: customer.provisionAttestation.sha256,
  verified: true,
});

const validatePreflightManifest = (manifest, preflightCloneId) => {
  if (
    !exactKeys(
      manifest.provisionClone,
      ['version', 'id', 'purpose', 'attestationSetSha256'],
    )
    ||
    manifest.provisionClone?.version !== 1
    || manifest.provisionClone.id !== preflightCloneId
    || manifest.provisionClone.purpose !== 'hostile-preflight'
    || !SHA256_PATTERN.test(manifest.provisionClone.attestationSetSha256 ?? '')
    || provisionAttestationSetSha256(manifest.customers)
      !== manifest.provisionClone.attestationSetSha256
    || !SHA256_PATTERN.test(
      manifest.canonicalStructuralFingerprint?.combined?.sha256 ?? ''
    )
    || !SHA256_PATTERN.test(manifest.canonicalDatabaseContractFingerprint ?? '')
  ) {
    throw new Error('PDCF_HOSTILE_PREFLIGHT_MANIFEST_MISMATCH');
  }
  for (const customer of manifest.customers) {
    if (
      !exactKeys(
        customer.provisionAttestation,
        ['version', 'cloneId', 'purpose', 'sha256'],
      )
      ||
      customer.provisionAttestation?.version !== 1
      || customer.provisionAttestation.cloneId !== preflightCloneId
      || customer.provisionAttestation.purpose !== 'hostile-preflight'
      || !SHA256_PATTERN.test(customer.provisionAttestation.sha256 ?? '')
      || !SHA256_PATTERN.test(customer.structuralFingerprints?.combined?.sha256 ?? '')
      || !SHA256_PATTERN.test(customer.databaseContractFingerprint ?? '')
    ) {
      throw new Error(`PDCF_HOSTILE_CUSTOMER_MANIFEST_INVALID:${customer.id}`);
    }
  }
  return manifest;
};

const validatePhysicalStatus = (status, {
  manifest,
  arm,
  mode,
  preflightCloneId = manifest.provisionClone?.id,
}) => {
  if (
    status?.version !== 1
    || status.fixture !== FIXTURE_ID
    || status.arm !== arm
    || status.introspectionMode !== mode
    || status.introspectionClientReleaseMode !== 'destroy'
    || status.runPurpose !== 'hostile-preflight'
    || status.cloneId !== preflightCloneId
    || status.provisionClone?.version !== 1
    || status.provisionClone.id !== preflightCloneId
    || status.provisionClone.purpose !== 'hostile-preflight'
    || status.provisionClone.attestationSetSha256
      !== manifest.provisionClone?.attestationSetSha256
    || status.provisionClone.verified !== true
    || !canonicalEqual(
      status.canonicalStructuralFingerprint,
      manifest.canonicalStructuralFingerprint,
    )
    || status.canonicalDatabaseContractFingerprint
      !== manifest.canonicalDatabaseContractFingerprint
    || status.realtime?.managersExpected !== manifest.customers.length * TENANTS.length
    || status.realtime?.connectionsExpected !== manifest.customers.length * TENANTS.length
    || status.realtime?.transportsExpected !== manifest.customers.length * TENANTS.length
    || status.realtime?.notificationMode !== 'dedicated'
    || status.runtimePoolMax !== 2
    || status.runtimePoolMaxUses !== null
  ) {
    throw new Error('PDCF_HOSTILE_PHYSICAL_STATUS_MISMATCH');
  }
  requireSha256(
    status.blueprintCompatibilityFingerprint,
    'PDCF_HOSTILE_BLUEPRINT_FINGERPRINT_REQUIRED',
  );
  requireSha256(
    manifest.canonicalDatabaseContractFingerprint,
    'PDCF_HOSTILE_CANONICAL_CONTRACT_REQUIRED',
  );
  if (!Array.isArray(status.customers)) {
    throw new Error('PDCF_HOSTILE_CUSTOMER_SET_MISMATCH');
  }
  if (
    status.customers.length !== manifest.customers.length
    || status.customers.some((observed, index) => {
      const customer = manifest.customers[index];
      return observed.id !== customer.id
        || observed.physicalDatabase !== customer.database
        || !canonicalEqual(
          observed.provisionAttestation,
          expectedLiveProvisionAttestation(manifest, customer),
        )
        || !canonicalEqual(
          observed.structuralFingerprints,
          customer.structuralFingerprints,
        )
        || observed.canonicalStructuralFingerprint
          !== customer.structuralFingerprints?.combined?.sha256
        || observed.databaseContractFingerprint !== customer.databaseContractFingerprint
        || observed.contractVerification !== 'live-recomputed';
    })
  ) {
    throw new Error('PDCF_HOSTILE_CUSTOMER_SET_MISMATCH');
  }
  return status;
};

const validateChildStatus = (status, { customer, manifest, arm, mode }) => {
  const tenantIds = TENANTS.map((tenant) => tenant.id);
  if (
    status?.version !== 1
    || status.fixture !== 'complete-tenant-abc-v1'
    || status.arm !== arm
    || status.introspectionMode !== mode
    || status.introspectionClientReleaseMode !== 'destroy'
    || status.releaseBuildStateAfterValidation !== true
    || status.physicalDatabase !== customer.physicalIdentity
    || status.runPurpose !== 'hostile-preflight'
    || !canonicalEqual(
      status.provisionAttestation,
      expectedLiveProvisionAttestation(manifest, customer),
    )
    || status.physicalIsolation !== 'dedicated-login-and-pool-per-tenant'
    || status.sharedRuntimePool !== false
    || status.runtimePoolMax !== 2
    || status.runtimePoolMaxUses !== null
    || status.enableRealtime !== true
    || status.realtimeNotificationMode !== 'dedicated'
    || status.realtimeCursorPollIntervalMs !== 5_000
    || status.realtimeCursorHeartbeatIntervalMs !== 30_000
    || !exactKeys(status.realtimeSchemas, tenantIds)
    || status.controlAvailable !== true
    || status.runtimeSafety?.passed !== true
    || status.runtimeSafety?.rolesDistinct !== true
    || status.liveIdentityScope !== 'process-local-keyed-hmac-v1'
    || !/^graphile-configuration:ctf:v1:[a-f0-9]{64}$/.test(
      status.configurationIdentity ?? ''
    )
    || status.contractEvidence?.version !== 1
    || status.contractEvidence?.credentialFree !== true
    || status.contractEvidence?.configurationIdentity
      !== status.configurationIdentity
    || !exactKeys(status.runtimePoolIdentities, tenantIds)
    || !exactKeys(status.buildContracts, tenantIds)
    || !exactKeys(status.builds?.byTenant, tenantIds)
  ) {
    throw new Error(`PDCF_HOSTILE_CHILD_STATUS_MISMATCH:${customer.id}`);
  }
  requireSha256(
    status.runtimeArtifactFingerprint,
    `PDCF_HOSTILE_RUNTIME_FINGERPRINT_REQUIRED:${customer.id}`,
  );
  for (const tenant of TENANTS) {
    if (status.realtimeSchemas[tenant.id] !== `${tenant.schema}_realtime`) {
      throw new Error(`PDCF_HOSTILE_CHILD_CONTRACT_MISMATCH:${customer.id}:${tenant.id}`);
    }
  }
  for (const tenantId of tenantIds) {
    const poolEvidence = status.contractEvidence?.runtimePools?.[tenantId];
    const buildEvidence = status.contractEvidence?.graphileBuilds?.[tenantId];
    const binding = status.runtimeBindings?.[tenantId];
    if (
      !/^pg:v1:[a-f0-9]{64}$/i.test(status.runtimePoolIdentities[tenantId])
      || !String(status.buildContracts[tenantId]).startsWith('graphile:v1:')
      || !/^pg-contract-evidence:v1:[a-f0-9]{64}$/.test(
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
      || !Number.isSafeInteger(status.builds.byTenant[tenantId])
      || status.builds.byTenant[tenantId] < 0
    ) {
      throw new Error(`PDCF_HOSTILE_CHILD_CONTRACT_MISMATCH:${customer.id}:${tenantId}`);
    }
  }
  return status;
};

const collectSourceProvenance = () => {
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  }).trim();
  const worktreeState = execFileSync(
    'git',
    ['status', '--porcelain=v1', '--untracked-files=all'],
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );
  const validatorEntries = VALIDATOR_ENTRY_FILES.map((relativePath) => ({
    path: relativePath,
    sha256: fileSha256(path.join(REPO_ROOT, relativePath)),
  }));
  const provenance = {
    git: {
      commit,
      worktreeDirty: worktreeState.length > 0,
      worktreeStateSha256: sha256Buffer(worktreeState),
    },
    lockfileSha256: fileSha256(path.join(REPO_ROOT, 'pnpm-lock.yaml')),
    runtime: {
      node: process.version,
      v8: process.versions.v8,
      platform: process.platform,
      architecture: process.arch,
    },
    validatorEntries,
  };
  return {
    ...provenance,
    sourceStateSha256: canonicalSha256(provenance),
  };
};

const validateSourceProvenance = (provenance) => {
  const {
    sourceStateSha256,
    ...sourceState
  } = provenance ?? {};
  if (
    !/^[a-f0-9]{40,64}$/.test(provenance?.git?.commit ?? '')
    || typeof provenance.git.worktreeDirty !== 'boolean'
    || !SHA256_PATTERN.test(provenance.git.worktreeStateSha256 ?? '')
    || !SHA256_PATTERN.test(provenance.lockfileSha256 ?? '')
    || !SHA256_PATTERN.test(sourceStateSha256 ?? '')
    || sourceStateSha256 !== canonicalSha256(sourceState)
    || typeof provenance.runtime?.node !== 'string'
    || typeof provenance.runtime?.v8 !== 'string'
    || typeof provenance.runtime?.platform !== 'string'
    || typeof provenance.runtime?.architecture !== 'string'
    || !Array.isArray(provenance.validatorEntries)
    || provenance.validatorEntries.length === 0
    || new Set(provenance.validatorEntries.map((entry) => entry?.path)).size
      !== provenance.validatorEntries.length
    || provenance.validatorEntries.some((entry) =>
      typeof entry?.path !== 'string'
      || !entry.path
      || !SHA256_PATTERN.test(entry.sha256 ?? '')
    )
  ) {
    throw new Error('PDCF_HOSTILE_SOURCE_PROVENANCE_INVALID');
  }
  return provenance;
};

const childStatusUrl = (baseUrl, customer) =>
  `${baseUrl}${assertCustomerPathPrefix(
    `/customer/${customer.id}`,
    customer.id,
  )}/__ctf/status`;

const readChildStatus = async (baseUrl, customer, fetchImpl) =>
  requestJson(childStatusUrl(baseUrl, customer), { fetchImpl });

const assertBadRoleCoverage = (report, customer) => {
  if (report?.passed !== true) {
    throw new Error(`PDCF_HOSTILE_CUSTOMER_VALIDATION_FAILED:${customer.id}`);
  }
  const checks = new Set((report.checks ?? []).map((check) => check.name));
  for (const tenant of TENANTS) {
    if (!checks.has(`bad-role-expected-failure:${tenant.id}`)) {
      throw new Error(`PDCF_HOSTILE_BAD_ROLE_CHECK_MISSING:${customer.id}:${tenant.id}`);
    }
  }
};

const validateUnsafeRuntimeStartupAdmission = (
  report,
  manifest,
  expectedRuntimeArtifactFingerprint,
) => {
  const expectedSurfaces = TENANTS.map((tenant) => tenant.id);
  const expectedAttempts = PROBE_CAPABILITIES.length * expectedSurfaces.length;
  const customer = manifest.customers[0];
  const expectedPairs = new Set(PROBE_CAPABILITIES.flatMap((capability) =>
    expectedSurfaces.map((tenantId) => `${capability}:${tenantId}`)
  ));
  const attempts = Array.isArray(report?.attempts) ? report.attempts : [];
  const observedPairs = new Set(attempts.map((attempt) =>
    `${attempt.capability}:${attempt.tenantId}`
  ));
  if (
    !exactKeys(report, [
      'version',
      'kind',
      'admissionScope',
      'provisionClone',
      'representativeCustomerId',
      'representativePhysicalDatabase',
      'representativeProvisionAttestationSha256',
      'canonicalDatabaseContractFingerprint',
      'runtimeArtifactFingerprint',
      'liveProvisionAttestation',
      'safeStartupControl',
      'roleProfileAudit',
      'cleanupAudit',
      'capabilities',
      'surfaces',
      'attempts',
      'expectedAttempts',
      'rejectedAttempts',
      'acceptedAttempts',
      'graphileBuildsStarted',
      'residentGraphileEntries',
      'passed',
    ])
    || report.version !== 2
    || report.kind !== PROBE_KIND
    || report.admissionScope !== ADMISSION_SCOPE
    || !exactKeys(
      report.provisionClone,
      ['version', 'id', 'purpose', 'attestationSetSha256'],
    )
    || !canonicalEqual(report.provisionClone, manifest.provisionClone)
    || report.representativeCustomerId !== customer?.id
    || report.representativePhysicalDatabase !== customer?.physicalIdentity
    || report.representativeProvisionAttestationSha256
      !== customer?.provisionAttestation?.sha256
    || report.canonicalDatabaseContractFingerprint
      !== manifest.canonicalDatabaseContractFingerprint
    || report.runtimeArtifactFingerprint !== expectedRuntimeArtifactFingerprint
    || !canonicalEqual(
      report.liveProvisionAttestation,
      expectedLiveProvisionAttestation(manifest, customer),
    )
    || !exactKeys(report.safeStartupControl, [
      'tenantId',
      'accepted',
      'physicalDatabaseVerifiedBeforeRoleAudit',
      'controlCredentialEnvironmentAbsent',
      'graphileBuildsStarted',
      'residentGraphileEntries',
      'passed',
    ])
    || report.safeStartupControl.tenantId !== expectedSurfaces[0]
    || report.safeStartupControl.accepted !== true
    || report.safeStartupControl.physicalDatabaseVerifiedBeforeRoleAudit !== true
    || report.safeStartupControl.controlCredentialEnvironmentAbsent !== true
    || report.safeStartupControl.graphileBuildsStarted !== 0
    || report.safeStartupControl.residentGraphileEntries !== 0
    || report.safeStartupControl.passed !== true
    || !exactKeys(
      report.roleProfileAudit,
      ['version', 'kind', 'database', 'profiles', 'passed'],
    )
    || report.roleProfileAudit.version !== 1
    || report.roleProfileAudit.kind !== 'unsafe-runtime-role-profile-audit-v1'
    || report.roleProfileAudit.database !== customer?.database
    || !canonicalEqual(
      report.roleProfileAudit.profiles,
      expectedAuditedProfiles(),
    )
    || report.roleProfileAudit.passed !== true
    || !exactKeys(report.cleanupAudit, [
      'version',
      'kind',
      'database',
      'remainingRoles',
      'remainingSchemas',
      'passed',
    ])
    || report.cleanupAudit.version !== 1
    || report.cleanupAudit.kind !== CLEANUP_AUDIT_KIND
    || report.cleanupAudit.database !== customer?.database
    || report.cleanupAudit.remainingRoles !== 0
    || report.cleanupAudit.remainingSchemas !== 0
    || report.cleanupAudit.passed !== true
    || JSON.stringify(report.capabilities) !== JSON.stringify(PROBE_CAPABILITIES)
    || JSON.stringify(report.surfaces) !== JSON.stringify(expectedSurfaces)
    || report.expectedAttempts !== expectedAttempts
    || report.rejectedAttempts !== expectedAttempts
    || report.acceptedAttempts !== 0
    || report.graphileBuildsStarted !== 0
    || report.residentGraphileEntries !== 0
    || report.passed !== true
    || !Array.isArray(report.attempts)
    || report.attempts.length !== expectedAttempts
    || observedPairs.size !== expectedPairs.size
    || [...expectedPairs].some((pair) => !observedPairs.has(pair))
    || report.attempts.some((attempt) =>
      !exactKeys(attempt, [
        'capability',
        'tenantId',
        'rejectedCode',
        'controlCredentialEnvironmentAbsent',
        'graphileBuildsStarted',
        'residentGraphileEntries',
      ])
      || attempt.rejectedCode !== 'GRAPHILE_UNSAFE_RUNTIME_ROLE'
      || attempt.controlCredentialEnvironmentAbsent !== true
      || attempt.graphileBuildsStarted !== 0
      || attempt.residentGraphileEntries !== 0
    )
  ) {
    throw new Error('PDCF_UNSAFE_RUNTIME_STARTUP_ADMISSION_INVALID');
  }
  return report;
};

const runFleetInvalidateAndRebuild = async ({
  baseUrl,
  controlToken,
  manifest,
  arm,
  mode,
  fetchImpl,
}) => {
  const before = {};
  for (const customer of manifest.customers) {
    before[customer.id] = validateChildStatus(
      await readChildStatus(baseUrl, customer, fetchImpl),
      { customer, manifest, arm, mode },
    );
  }

  for (const customer of manifest.customers) {
    const pathPrefix = `/customer/${customer.id}`;
    await control(
      baseUrl,
      pathPrefix,
      controlToken,
      'invalidate-all',
      null,
      customer.physicalIdentity,
      fetchImpl,
    );
  }

  for (const customer of manifest.customers) {
    const pathPrefix = `/customer/${customer.id}`;
    for (const tenant of TENANTS) {
      const response = await postGraphql(
        baseUrl,
        pathPrefix,
        tenant.id,
        identityOperation,
        fetchImpl,
      );
      assertIdentity(tenant, response, customer.physicalIdentity);
    }
  }

  const after = {};
  for (const customer of manifest.customers) {
    after[customer.id] = validateChildStatus(
      await readChildStatus(baseUrl, customer, fetchImpl),
      { customer, manifest, arm, mode },
    );
    for (const tenant of TENANTS) {
      const beforeCount = before[customer.id].builds.byTenant[tenant.id];
      const afterCount = after[customer.id].builds.byTenant[tenant.id];
      if (afterCount !== beforeCount + 1) {
        throw new Error(
          `PDCF_HOSTILE_FLEET_REBUILD_COUNT_MISMATCH:${customer.id}:${tenant.id}`,
        );
      }
    }
  }
  return {
    invalidatedCustomers: manifest.customers.length,
    rebuiltSurfaces: manifest.customers.length * TENANTS.length,
    physicalIdentityMismatches: 0,
  };
};

const failureCode = (error) => String(
  error instanceof Error ? error.message : error,
).split(':', 1)[0].replace(/[^A-Z0-9_-]/gi, '_').slice(0, 96);

const runPhysicalHostilePreflight = async ({
  manifestFile,
  secretsFile,
  baseUrl,
  controlToken,
  arm,
  mode,
  preflightCloneId,
  outputFile,
  fetchImpl = fetch,
  runCustomerValidation = runHostileValidation,
  runUnsafeRoleMatrix = runUnsafeRuntimeStartupMatrix,
  provenanceProvider = collectSourceProvenance,
} = {}) => {
  if (
    process.env.GRAPHQL_CPERF_MEASURED_RUN === 'true'
    || process.env.GRAPHQL_CPERF_RETAINED_HEAP_ENABLED === 'true'
  ) {
    throw new Error('PDCF_HOSTILE_MEASURED_PROCESS_FORBIDDEN');
  }
  if (typeof controlToken !== 'string' || Buffer.byteLength(controlToken) < 32) {
    throw new Error('PDCF_HOSTILE_CONTROL_TOKEN_REQUIRED');
  }
  preflightCloneId = requireArtifactLabel(
    preflightCloneId,
    'PDCF_HOSTILE_PREFLIGHT_CLONE_ID_REQUIRED',
  );
  arm = requireArtifactLabel(arm, 'PDCF_HOSTILE_ARM_REQUIRED');
  if (mode !== 'stock' && mode !== 'scoped-required') {
    throw new Error('PDCF_HOSTILE_MODE_INVALID');
  }
  if (preflightCloneId === controlToken) {
    throw new Error('PDCF_HOSTILE_PREFLIGHT_CLONE_ID_INVALID');
  }
  const localBaseUrl = assertLoopbackBaseUrl(baseUrl);
  const absoluteManifestFile = path.resolve(manifestFile);
  const absoluteSecretsFile = path.resolve(requireString(
    { secrets: secretsFile },
    'secrets',
  ));
  const absoluteOutputFile = assertOutputDoesNotAliasInputs(outputFile, [
    absoluteManifestFile,
    absoluteSecretsFile,
  ]);
  const manifest = validatePreflightManifest(
    loadPrivateProvision(absoluteManifestFile, absoluteSecretsFile).manifest,
    preflightCloneId,
  );
  const startedAt = new Date().toISOString();
  const sourceProvenance = validateSourceProvenance(provenanceProvider());
  const report = {
    version: 1,
    kind: 'physical-hostile-preflight-v1',
    fixture: FIXTURE_ID,
    startedAt,
    endedAt: null,
    passed: false,
    customerQualified: false,
    performanceEvidence: false,
    arm,
    mode,
    preflightCloneId,
    provisionClone: {
      ...manifest.provisionClone,
      verifiedByServer: false,
    },
    measuredCloneRequirement: {
      mustBeFresh: true,
      mustBeDistinctFromPreflight: true,
      mustMatchCanonicalDatabaseContract: true,
    },
    manifest: {
      sha256: fileSha256(absoluteManifestFile),
      canonicalStructuralFingerprint:
        manifest.canonicalStructuralFingerprint?.combined?.sha256 ?? null,
      canonicalDatabaseContractFingerprint:
        manifest.canonicalDatabaseContractFingerprint ?? null,
      customerIds: manifest.customers.map((customer) => customer.id),
    },
    sourceProvenance,
    observedRuntimeArtifactFingerprint: null,
    observedBlueprintCompatibilityFingerprint: null,
    unsafeRuntimeStartupAdmission: null,
    customerValidations: [],
    fleetInvalidateAndRebuild: null,
    unsupportedChecks: [],
  };

  try {
    const physicalStatus = validatePhysicalStatus(
      await requestJson(`${localBaseUrl}/__physical/status`, { fetchImpl }),
      { manifest, arm, mode, preflightCloneId },
    );
    report.provisionClone.verifiedByServer = true;
    report.observedBlueprintCompatibilityFingerprint =
      physicalStatus.blueprintCompatibilityFingerprint;
    const representativeCustomer = manifest.customers[0];
    const representativeChildStatus = validateChildStatus(
      await readChildStatus(localBaseUrl, representativeCustomer, fetchImpl),
      { customer: representativeCustomer, manifest, arm, mode },
    );
    report.unsafeRuntimeStartupAdmission = validateUnsafeRuntimeStartupAdmission(
      await runUnsafeRoleMatrix({
        manifestFile: absoluteManifestFile,
        secretsFile: absoluteSecretsFile,
        expectedRuntimeArtifactFingerprint:
          representativeChildStatus.runtimeArtifactFingerprint,
        mode,
      }),
      manifest,
      representativeChildStatus.runtimeArtifactFingerprint,
    );

    const runtimeFingerprints = new Set();
    for (const customer of manifest.customers) {
      const childStatus = validateChildStatus(
        await readChildStatus(localBaseUrl, customer, fetchImpl),
        { customer, manifest, arm, mode },
      );
      runtimeFingerprints.add(childStatus.runtimeArtifactFingerprint);
      const customerReport = await runCustomerValidation({
        baseUrl: localBaseUrl,
        pathPrefix: `/customer/${customer.id}`,
        expectedCustomerId: customer.id,
        expectedPhysicalDatabaseIdentity: customer.physicalIdentity,
        controlToken,
        arm,
        mode,
        fetchImpl,
      });
      assertBadRoleCoverage(customerReport, customer);
      report.customerValidations.push({
        customerId: customer.id,
        physicalDatabaseIdentity: customer.physicalIdentity,
        provisionAttestationSha256: customer.provisionAttestation.sha256,
        checks: customerReport.checks.length,
        reportSha256: canonicalSha256(customerReport),
        passed: true,
      });
    }
    if (
      runtimeFingerprints.size !== 1
      || !runtimeFingerprints.has(
        report.unsafeRuntimeStartupAdmission.runtimeArtifactFingerprint,
      )
    ) {
      throw new Error('PDCF_HOSTILE_RUNTIME_FINGERPRINT_MISMATCH');
    }
    report.observedRuntimeArtifactFingerprint = [...runtimeFingerprints][0];
    report.fleetInvalidateAndRebuild = await runFleetInvalidateAndRebuild({
      baseUrl: localBaseUrl,
      controlToken,
      manifest,
      arm,
      mode,
      fetchImpl,
    });
    report.passed = true;
    report.endedAt = new Date().toISOString();
    report.artifactSha256 = canonicalSha256({
      ...report,
      artifactSha256: undefined,
    });
    assertCredentialFree(report);
    if (absoluteOutputFile) atomicWriteJson(absoluteOutputFile, report, 0o600);
    return report;
  } catch (error) {
    report.endedAt = new Date().toISOString();
    report.failureCode = failureCode(error);
    report.artifactSha256 = canonicalSha256({
      ...report,
      artifactSha256: undefined,
    });
    assertCredentialFree(report);
    if (absoluteOutputFile) atomicWriteJson(absoluteOutputFile, report, 0o600);
    throw error;
  }
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const report = await runPhysicalHostilePreflight({
    manifestFile: path.resolve(requireString(args, 'manifest')),
    secretsFile: path.resolve(requireString(args, 'secrets')),
    baseUrl: requireString(args, 'base-url'),
    controlToken: process.env.CTF_CONTROL_TOKEN,
    arm: requireString(args, 'arm'),
    mode: requireString(args, 'mode', 'scoped-required'),
    preflightCloneId: requireString(args, 'preflight-clone-id'),
    outputFile: path.resolve(requireString(
      args,
      'output',
      path.join(FIXTURE_DIR, '.local', `hostile-preflight-${timestamp}.json`),
    )),
  });
  process.stdout.write(`${JSON.stringify({
    passed: report.passed,
    customers: report.customerValidations.length,
    artifactSha256: report.artifactSha256,
  })}\n`);
};

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${failureCode(error)}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  VALIDATOR_ENTRY_FILES,
  assertBadRoleCoverage,
  assertOutputDoesNotAliasInputs,
  canonicalSha256,
  collectSourceProvenance,
  runFleetInvalidateAndRebuild,
  runPhysicalHostilePreflight,
  validateUnsafeRuntimeStartupAdmission,
  validateSourceProvenance,
  validateChildStatus,
  validatePreflightManifest,
  validatePhysicalStatus,
};
