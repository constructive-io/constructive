'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { TENANTS } = require('./lib.cjs');
const {
  atomicWriteJson,
  generateInputs,
  validateServerStatus,
} = require('./generate-inputs.cjs');

const contracts = () => Object.fromEntries(TENANTS.map((tenant) => [
  tenant.id,
  `graphile:v1:${tenant.id.repeat(64)}`,
]));

const poolIdentities = () => Object.fromEntries(TENANTS.map((tenant) => [
  tenant.id,
  `pg:v1:${tenant.id.repeat(64)}`,
]));

const configurationIdentity =
  `graphile-configuration:ctf:v1:${'e'.repeat(64)}`;

const runtimeBindings = () => Object.fromEntries(TENANTS.map((tenant) => [
  tenant.id,
  {
    databaseId: tenant.databaseId,
    databaseName: 'graphile_complete_tenant_spike',
    role: `ctf_runtime_${tenant.id}`,
    schemas: [tenant.schema],
  },
]));

const contractEvidence = () => ({
  version: 1,
  credentialFree: true,
  configurationIdentity,
  realtimeListener: null,
  runtimePools: Object.fromEntries(TENANTS.map((tenant) => [
    tenant.id,
    {
      version: 1,
      fingerprint: `pg-contract-evidence:v1:${tenant.id.repeat(64)}`,
      input: {
        databaseName: 'graphile_complete_tenant_spike',
        role: `ctf_runtime_${tenant.id}`,
      },
    },
  ])),
  graphileBuilds: Object.fromEntries(TENANTS.map((tenant) => [
    tenant.id,
    {
      version: 1,
      fingerprint: `graphile-contract-evidence:v1:${tenant.id.repeat(64)}`,
      input: {},
    },
  ])),
  residentGraphileBuildFingerprints: [],
});

const evidenceContracts = () => Object.fromEntries(TENANTS.map((tenant) => [
  tenant.id,
  `graphile-contract-evidence:v1:${tenant.id.repeat(64)}`,
]));

const evidencePoolIdentities = () => Object.fromEntries(TENANTS.map((tenant) => [
  tenant.id,
  `pg-contract-evidence:v1:${tenant.id.repeat(64)}`,
]));

const status = (overrides = {}) => ({
  version: 1,
  fixture: 'complete-tenant-abc-v1',
  arm: 'fixture-arm',
  introspectionMode: 'scoped-required',
  introspectionClientReleaseMode: 'destroy',
  releaseBuildStateAfterValidation: true,
  physicalIsolation: 'dedicated-login-and-pool-per-tenant',
  sharedRuntimePool: false,
  runtimeSafety: { passed: true, rolesDistinct: true },
  runtimeArtifactFingerprint: `sha256:${'f'.repeat(64)}`,
  configurationIdentity,
  liveIdentityScope: 'process-local-keyed-hmac-v1',
  physicalDatabase: 'graphile_complete_tenant_spike',
  runtimePoolIdentities: poolIdentities(),
  runtimeBindings: runtimeBindings(),
  buildContracts: contracts(),
  contractEvidence: contractEvidence(),
  ...overrides,
});

test('status validation requires strict physical isolation and unique exact contracts', () => {
  assert.deepEqual(
    validateServerStatus(status(), { arm: 'fixture-arm', mode: 'scoped-required' }),
    evidenceContracts(),
  );
  assert.throws(
    () => validateServerStatus(status({ introspectionMode: 'stock' }), {
      arm: 'fixture-arm',
      mode: 'scoped-required',
    }),
    /CTF_SERVER_MODE_MISMATCH:stock/,
  );
  assert.throws(
    () => validateServerStatus(status({ introspectionClientReleaseMode: 'reuse' }), {
      arm: 'fixture-arm',
      mode: 'scoped-required',
      introspectionClientReleaseMode: 'destroy',
    }),
    /CTF_SERVER_INTROSPECTION_CLIENT_RELEASE_MODE_MISMATCH:reuse/,
  );
  assert.throws(
    () => validateServerStatus(status({ sharedRuntimePool: true }), {
      arm: 'fixture-arm',
      mode: 'scoped-required',
    }),
    /CTF_SERVER_RUNTIME_BOUNDARY_UNSAFE/,
  );
  assert.throws(
    () => validateServerStatus(status({ releaseBuildStateAfterValidation: false }), {
      arm: 'fixture-arm',
      mode: 'scoped-required',
    }),
    /CTF_SERVER_BUILD_STATE_RETIREMENT_REQUIRED/,
  );
  const collided = contracts();
  collided.c = collided.a;
  assert.throws(
    () => validateServerStatus(status({ buildContracts: collided }), {
      arm: 'fixture-arm',
      mode: 'scoped-required',
    }),
    /CTF_SERVER_CONTRACT_COLLISION/,
  );
  const unresolved = contracts();
  unresolved.b = 'ctf:unresolved:v1:b';
  assert.throws(
    () => validateServerStatus(status({ buildContracts: unresolved }), {
      arm: 'fixture-arm',
      mode: 'scoped-required',
    }),
    /CTF_SERVER_CONTRACT_INVALID/,
  );
});

test('input generation writes exact credential-free contracts atomically', async (context) => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctf-inputs-'));
  context.after(() => fs.rmSync(outputDir, { recursive: true, force: true }));
  const runtimeRoles = { a: 'ctf_runtime_a', b: 'ctf_runtime_b', c: 'ctf_runtime_c' };
  const result = await generateInputs({
    arm: 'fixture-arm',
    mode: 'scoped-required',
    port: 3391,
    postgresContainer: 'ctf-postgres',
    runtimeRoles,
    durationSec: 60,
    outputDir,
    commit: '0123456789abcdef',
    validate: false,
    fetchImpl: async () => ({ ok: true, json: async () => status() }),
  });
  const fleet = JSON.parse(fs.readFileSync(result.fleetFile, 'utf8'));
  const plan = JSON.parse(fs.readFileSync(result.planFile, 'utf8'));
  assert.equal(fleet.tenants[0].surfaces[0].buildContract, evidenceContracts().a);
  assert.equal(
    fleet.tenants[0].databases[0].apis[0].runtimePoolIdentity,
    evidencePoolIdentities().a,
  );
  assert.equal(plan.arms[0].env.PG_POOL_MAX, '1');
  assert.equal(plan.arms[0].env.PG_POOL_MAX_USES, '0');
  assert.equal(plan.arms[0].env.DATAPLAN_PG_PREPARED_STATEMENT_CACHE_SIZE, '100');
  const releaseModeIndex = plan.arms[0].command.indexOf(
    '--introspection-client-release-mode',
  );
  assert.ok(releaseModeIndex >= 0);
  assert.equal(plan.arms[0].command[releaseModeIndex + 1], 'destroy');
  assert.equal(result.provenance.introspectionClientReleaseMode, 'destroy');
  assert.equal(result.provenance.customerQualified, false);
  assert.doesNotMatch(
    fs.readdirSync(outputDir).map((file) => fs.readFileSync(path.join(outputDir, file), 'utf8')).join('\n'),
    /password|secretAccessKey|authorization|bearer/i,
  );
});

test('input generation rejects unsupported introspection client release modes', async () => {
  await assert.rejects(() => generateInputs({
    introspectionClientReleaseMode: 'best-effort',
    postgresContainer: 'ctf-postgres',
    runtimeRoles: { a: 'ctf_runtime_a', b: 'ctf_runtime_b', c: 'ctf_runtime_c' },
    validate: false,
  }), /CTF_INTROSPECTION_CLIENT_RELEASE_MODE_INVALID:best-effort/);
});

test('atomic artifact writes reject credential markers', (context) => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctf-atomic-'));
  context.after(() => fs.rmSync(outputDir, { recursive: true, force: true }));
  assert.throws(
    () => atomicWriteJson(path.join(outputDir, 'unsafe.json'), { password: 'value' }),
    /CTF_ARTIFACT_CONTAINS_CREDENTIAL_MARKER/,
  );
  assert.equal(fs.existsSync(path.join(outputDir, 'unsafe.json')), false);
  assert.doesNotThrow(() => atomicWriteJson(path.join(outputDir, 'safe-error.json'), {
    failure: 'CTF_RUNTIME_PASSWORD_REQUIRED:CTF_RUNTIME_A_PGPASSWORD',
  }));
  assert.throws(
    () => atomicWriteJson(path.join(outputDir, 'unsafe-url.json'), {
      failure: 'postgres://runtime:credential@127.0.0.1/fixture',
    }),
    /CTF_ARTIFACT_CONTAINS_CREDENTIAL_MARKER/,
  );
});
