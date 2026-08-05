'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const {
  FIXTURE_DIR,
  REPO_ROOT,
  TENANTS,
  assertCredentialFree,
  assertLoopbackBaseUrl,
  makeFleet,
  makePlan,
  parseArgs,
  parsePositiveInteger,
  requireString,
  validateIntrospectionClientReleaseMode,
} = require('./lib.cjs');

const fetchJson = async (url, fetchImpl = fetch) => {
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`CTF_STATUS_HTTP_${response.status}`);
  return response.json();
};

const validateServerStatus = (
  status,
  { arm, mode, introspectionClientReleaseMode = 'destroy' },
) => {
  validateIntrospectionClientReleaseMode(introspectionClientReleaseMode);
  if (status?.version !== 1 || status?.fixture !== 'complete-tenant-abc-v1') {
    throw new Error('CTF_SERVER_STATUS_IDENTITY_MISMATCH');
  }
  if (status.arm !== arm) throw new Error(`CTF_SERVER_ARM_MISMATCH:${status.arm}`);
  if (status.introspectionMode !== mode) {
    throw new Error(`CTF_SERVER_MODE_MISMATCH:${status.introspectionMode}`);
  }
  if (status.introspectionClientReleaseMode !== introspectionClientReleaseMode) {
    throw new Error(
      'CTF_SERVER_INTROSPECTION_CLIENT_RELEASE_MODE_MISMATCH:'
      + `${status.introspectionClientReleaseMode ?? 'missing'}`
    );
  }
  if (status.releaseBuildStateAfterValidation !== true) {
    throw new Error('CTF_SERVER_BUILD_STATE_RETIREMENT_REQUIRED');
  }
  if (
    status.physicalIsolation !== 'dedicated-login-and-pool-per-tenant'
    || status.sharedRuntimePool !== false
    || status.runtimeSafety?.passed !== true
    || status.runtimeSafety?.rolesDistinct !== true
  ) {
    throw new Error('CTF_SERVER_RUNTIME_BOUNDARY_UNSAFE');
  }
  if (!/^sha256:[0-9a-f]{64}$/.test(status.runtimeArtifactFingerprint ?? '')) {
    throw new Error('CTF_SERVER_RUNTIME_FINGERPRINT_INVALID');
  }
  if (
    status.liveIdentityScope !== 'process-local-keyed-hmac-v1'
    || !/^graphile-configuration:ctf:v1:[a-f0-9]{64}$/.test(
      status.configurationIdentity ?? ''
    )
  ) {
    throw new Error('CTF_SERVER_CONFIGURATION_IDENTITY_INVALID');
  }
  const contracts = status.buildContracts;
  if (!contracts || typeof contracts !== 'object') {
    throw new Error('CTF_SERVER_CONTRACTS_MISSING');
  }
  const values = TENANTS.map((tenant) => contracts[tenant.id]);
  if (values.some((value) => typeof value !== 'string' || !value.startsWith('graphile:v1:'))) {
    throw new Error('CTF_SERVER_CONTRACT_INVALID');
  }
  if (new Set(values).size !== TENANTS.length) {
    throw new Error('CTF_SERVER_CONTRACT_COLLISION');
  }
  if (typeof status.physicalDatabase !== 'string' || !status.physicalDatabase.trim()) {
    throw new Error('CTF_SERVER_PHYSICAL_DATABASE_MISSING');
  }
  const runtimePoolIdentities = status.runtimePoolIdentities;
  const poolValues = TENANTS.map((tenant) => runtimePoolIdentities?.[tenant.id]);
  if (poolValues.some((value) =>
    typeof value !== 'string' || !/^pg:v1:[a-f0-9]{64}$/i.test(value)
  )) {
    throw new Error('CTF_SERVER_POOL_IDENTITY_INVALID');
  }
  if (new Set(poolValues).size !== TENANTS.length) {
    throw new Error('CTF_SERVER_POOL_IDENTITY_COLLISION');
  }
  const evidence = status.contractEvidence;
  if (
    evidence?.version !== 1
    || evidence.credentialFree !== true
    || evidence.configurationIdentity !== status.configurationIdentity
  ) {
    throw new Error('CTF_SERVER_CONTRACT_EVIDENCE_INVALID');
  }
  assertCredentialFree(evidence);
  for (const tenant of TENANTS) {
    const pool = evidence.runtimePools?.[tenant.id];
    const build = evidence.graphileBuilds?.[tenant.id];
    const binding = status.runtimeBindings?.[tenant.id];
    if (
      !/^pg-contract-evidence:v1:[a-f0-9]{64}$/.test(pool?.fingerprint ?? '')
      || !/^graphile-contract-evidence:v1:[a-f0-9]{64}$/.test(
        build?.fingerprint ?? ''
      )
      || pool?.input?.databaseName !== status.physicalDatabase
      || pool?.input?.role !== binding?.role
      || binding?.databaseId !== tenant.databaseId
      || binding?.databaseName !== status.physicalDatabase
      || JSON.stringify(binding?.schemas) !== JSON.stringify([tenant.schema])
    ) {
      throw new Error(`CTF_SERVER_CONTRACT_EVIDENCE_INVALID:${tenant.id}`);
    }
  }
  return Object.fromEntries(TENANTS.map((tenant) => [
    tenant.id,
    evidence.graphileBuilds[tenant.id].fingerprint,
  ]));
};

const atomicWriteJson = (file, value) => {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  assertCredentialFree(value);
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, serialized, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(temporary, file);
};

const currentCommit = () => execFileSync(
  'git',
  ['rev-parse', 'HEAD'],
  { cwd: REPO_ROOT, encoding: 'utf8' },
).trim();

const validateGeneratedInputs = (planFile, fleetFile) => {
  const perfConfigPath = path.join(REPO_ROOT, 'packages/perf-harness/dist/config.js');
  if (!fs.existsSync(perfConfigPath)) {
    throw new Error('CTF_BUILD_ARTIFACT_MISSING:packages/perf-harness/dist/config.js');
  }
  const { loadFleet, loadPlan, validateCoverage } = require(perfConfigPath);
  const plan = loadPlan(planFile);
  const fleet = loadFleet(fleetFile);
  validateCoverage(plan, fleet);
};

const generateInputs = async ({
  arm = 'local-complete-tenant',
  mode = 'scoped-required',
  introspectionClientReleaseMode = 'destroy',
  port = 3391,
  baseUrl = `http://127.0.0.1:${port}`,
  postgresContainer,
  runtimeRoles,
  durationSec = 900,
  outputDir = path.join(FIXTURE_DIR, 'generated'),
  commit = currentCommit(),
  fetchImpl = fetch,
  validate = true,
} = {}) => {
  if (!postgresContainer) throw new Error('CTF_ARGUMENT_REQUIRED:postgres-container');
  if (!['stock', 'scoped-required'].includes(mode)) {
    throw new Error(`CTF_INTROSPECTION_MODE_INVALID:${mode}`);
  }
  validateIntrospectionClientReleaseMode(introspectionClientReleaseMode);
  const localBaseUrl = assertLoopbackBaseUrl(baseUrl);
  const status = await fetchJson(`${localBaseUrl}/__ctf/status`, fetchImpl);
  const buildContracts = validateServerStatus(status, {
    arm,
    mode,
    introspectionClientReleaseMode,
  });
  const fleet = makeFleet({
    arm,
    port,
    buildContracts,
    runtimePoolIdentities: Object.fromEntries(TENANTS.map((tenant) => [
      tenant.id,
      status.contractEvidence.runtimePools[tenant.id].fingerprint,
    ])),
    physicalDatabase: status.physicalDatabase,
  });
  const plan = makePlan({
    arm,
    port,
    postgresContainer,
    commit,
    durationSec,
    cwd: REPO_ROOT,
    introspectionMode: mode,
    introspectionClientReleaseMode,
    runtimeRoles,
  });
  assertCredentialFree(fleet);
  assertCredentialFree(plan);
  fs.mkdirSync(outputDir, { recursive: true, mode: 0o700 });
  const fleetFile = path.join(outputDir, 'fleet.json');
  const planFile = path.join(outputDir, 'plan.json');
  atomicWriteJson(fleetFile, fleet);
  atomicWriteJson(planFile, plan);
  if (validate) validateGeneratedInputs(planFile, fleetFile);
  const provenance = {
    version: 1,
    generatedAt: new Date().toISOString(),
    arm,
    mode,
    introspectionClientReleaseMode,
    commit,
    customerQualified: false,
    reason: 'inputs-only; workload and external provider gates have not run',
    files: {
      fleet: path.relative(REPO_ROOT, fleetFile),
      plan: path.relative(REPO_ROOT, planFile),
    },
  };
  atomicWriteJson(path.join(outputDir, 'generation.json'), provenance);
  return { fleetFile, planFile, provenance };
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const port = parsePositiveInteger(args.port ?? '3391', 'port');
  const runtimeRoles = Object.fromEntries(TENANTS.map((tenant) => [
    tenant.id,
    requireString(args, tenant.runtimeRoleArgument),
  ]));
  const result = await generateInputs({
    arm: requireString(args, 'arm', 'local-complete-tenant'),
    mode: requireString(args, 'mode', 'scoped-required'),
    introspectionClientReleaseMode: requireString(
      args,
      'introspection-client-release-mode',
      'destroy',
    ),
    port,
    baseUrl: requireString(args, 'base-url', `http://127.0.0.1:${port}`),
    postgresContainer: requireString(args, 'postgres-container'),
    runtimeRoles,
    durationSec: parsePositiveInteger(args['duration-sec'] ?? '900', 'duration-sec'),
    outputDir: path.resolve(requireString(args, 'output-dir', path.join(FIXTURE_DIR, 'generated'))),
  });
  process.stdout.write(`${JSON.stringify(result.provenance)}\n`);
};

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  atomicWriteJson,
  generateInputs,
  validateGeneratedInputs,
  validateServerStatus,
};
