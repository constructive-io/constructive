'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, it } = require('node:test');

const {
  TENANTS,
  assertCredentialFree,
} = require('../complete-tenant-fixture/lib.cjs');
const { makeCustomers } = require('./lib.cjs');
const { provisionAttestationSha256 } = require('./provision.cjs');
const {
  ADMISSION_SCOPE,
  CLEANUP_AUDIT_KIND,
  PROBE_CAPABILITIES,
  PROBE_KIND,
  SAFE_CONTROL_CAPABILITY,
  assertExactWorkerEnvironment,
  buildLiveCloneAuditSql,
  buildUnsafeRoleAuditSql,
  buildUnsafeRoleCleanupAuditSql,
  buildUnsafeRoleCleanupSql,
  buildUnsafeRoleSetupSql,
  expectedAuditedProfiles,
  makeProbeWorkerEnvironment,
  makeWorkerEnvironment,
  parseWorkerResult,
  probeNames,
  runUnsafeRuntimeStartupMatrix,
  workerProbe,
} = require('./unsafe-runtime-startup-probe.cjs');

const digest = (character) => `sha256:${character.repeat(64)}`;
const runtimeArtifactFingerprint = digest('e');

const writeFixture = (directory) => {
  const nonce = '1'.repeat(64);
  const customer = {
    ...makeCustomers('unsafe_probe', 1)[0],
    provisionAttestation: {
      version: 1,
      cloneId: 'unsafe-probe-clone',
      purpose: 'hostile-preflight',
      sha256: provisionAttestationSha256({
        cloneId: 'unsafe-probe-clone',
        runPurpose: 'hostile-preflight',
        customerId: 'physical-customer-0001',
        database: 'unsafe_probe_db_0001',
        nonce,
      }),
    },
    structuralFingerprints: { combined: { sha256: digest('b') } },
    databaseContractFingerprint: digest('c'),
  };
  const manifest = {
    version: 1,
    fixture: 'physical-database-density-v1',
    prefix: 'unsafe_probe',
    provisionClone: {
      version: 1,
      id: 'unsafe-probe-clone',
      purpose: 'hostile-preflight',
      attestationSetSha256: digest('d'),
    },
    canonicalStructuralFingerprint: customer.structuralFingerprints,
    canonicalDatabaseContractFingerprint: customer.databaseContractFingerprint,
    customers: [customer],
  };
  const secrets = {
    version: 1,
    fixture: 'physical-database-density-v1',
    runtimePasswords: Object.fromEntries(Object.values(customer.roles).map((role) => [
      role,
      `safe-runtime-password-${role}`,
    ])),
    notificationPasswords: {
      [customer.notificationRole]:
        `safe-notification-password-${customer.notificationRole}`,
    },
  };
  const manifestFile = path.join(directory, 'provision.json');
  const secretsFile = path.join(directory, 'runtime-secrets.json');
  fs.writeFileSync(manifestFile, JSON.stringify(manifest));
  fs.writeFileSync(secretsFile, JSON.stringify(secrets), { mode: 0o600 });
  return { customer, manifestFile, nonce, secretsFile };
};

const liveCloneAuditFor = (customer, nonce) => ({
  version: 1,
  kind: 'unsafe-runtime-live-clone-audit-v1',
  cloneId: customer.provisionAttestation.cloneId,
  purpose: customer.provisionAttestation.purpose,
  customerId: customer.id,
  database: customer.database,
  nonce,
  sha256: customer.provisionAttestation.sha256,
});

const roleAuditFor = (customer, names) => ({
  version: 1,
  kind: 'unsafe-runtime-role-profile-audit-v1',
  database: customer.database,
  profiles: expectedAuditedProfiles().map((profile) => ({
    ...profile,
    roleName: names.roles[profile.capability],
  })),
});

const workerResultFor = (customer, input, accepted) => ({
  version: 2,
  kind: PROBE_KIND,
  admissionScope: ADMISSION_SCOPE,
  customerId: customer.id,
  tenantId: input.tenantId,
  capability: input.capability,
  cloneId: customer.provisionAttestation.cloneId,
  provisionAttestationSha256: customer.provisionAttestation.sha256,
  runtimeArtifactFingerprint,
  physicalDatabaseVerifiedBeforeRoleAudit: true,
  controlCredentialEnvironmentAbsent: true,
  accepted,
  rejectedCode: accepted ? null : 'GRAPHILE_UNSAFE_RUNTIME_ROLE',
  graphileBuildsStarted: 0,
  residentGraphileEntries: 0,
});

const cleanupAuditFor = (customer) => ({
  version: 1,
  kind: CLEANUP_AUDIT_KIND,
  database: customer.database,
  remainingRoles: 0,
  remainingSchemas: 0,
});

describe('unsafe runtime startup admission matrix', () => {
  it('builds five materially distinct PostgreSQL privilege profiles', () => {
    const names = probeNames('012345abcdef');
    const passwords = Object.fromEntries(PROBE_CAPABILITIES.map((capability) => [
      capability,
      `password-${capability}`,
    ]));
    const setup = buildUnsafeRoleSetupSql({
      database: 'unsafe_probe_db_0001',
      names,
      passwords,
    });
    assert.match(setup, /SUPERUSER NOBYPASSRLS/);
    assert.match(setup, /NOSUPERUSER BYPASSRLS/);
    assert.match(setup, /NOCREATEDB CREATEROLE/);
    assert.match(setup, /CREATE SCHEMA "ctf_unsafe_owner_012345abcdef"\s+AUTHORIZATION/);
    assert.match(setup, /GRANT CREATE ON SCHEMA "ctf_unsafe_create_012345abcdef"/);
    assert.equal((setup.match(/NOINHERIT/g) ?? []).length, 5);

    const audit = buildUnsafeRoleAuditSql({ names });
    assert.match(audit, /pg_catalog\.pg_roles/);
    assert.match(audit, /pg_catalog\.pg_auth_members/);
    assert.match(audit, /pg_catalog\.has_schema_privilege/);
    assert.match(audit, /pg_catalog\.has_database_privilege/);
    assert.match(buildLiveCloneAuditSql(), /ctf_provision_private\.clone_attestation/);

    const cleanup = buildUnsafeRoleCleanupSql({ names });
    assert.match(cleanup, /DROP SCHEMA IF EXISTS/);
    assert.equal((cleanup.match(/DROP OWNED BY/g) ?? []).length, 5);
    assert.equal((cleanup.match(/DROP ROLE IF EXISTS/g) ?? []).length, 5);
    assert.match(buildUnsafeRoleCleanupAuditSql({ names }), /remainingRoles/);
    assert.match(buildUnsafeRoleCleanupAuditSql({ names }), /remainingSchemas/);
  });

  it('requires all five capabilities to fail before publication on A, B, and C', (context) => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'pdc-unsafe-probe-'));
    context.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
    const { customer, manifestFile, nonce, secretsFile } = writeFixture(temporary);
    const sqlCalls = [];
    const cloneAuditCalls = [];
    const auditCalls = [];
    const workerCalls = [];
    const names = probeNames('012345abcdef');
    const report = runUnsafeRuntimeStartupMatrix({
      manifestFile,
      secretsFile,
      expectedRuntimeArtifactFingerprint: runtimeArtifactFingerprint,
      nonce: '012345abcdef',
      runSql: (input) => sqlCalls.push(input),
      runCloneAudit: (input) => {
        cloneAuditCalls.push(input);
        return liveCloneAuditFor(customer, nonce);
      },
      runRoleAudit: (input) => {
        auditCalls.push(input);
        return roleAuditFor(customer, names);
      },
      runCleanupAudit: () => cleanupAuditFor(customer),
      runWorker: (input) => {
        workerCalls.push(input);
        return workerResultFor(
          customer,
          input,
          input.capability === SAFE_CONTROL_CAPABILITY,
        );
      },
    });

    assert.equal(sqlCalls.length, 2);
    assert.equal(cloneAuditCalls.length, 1);
    assert.match(cloneAuditCalls[0].sql, /clone_attestation/);
    assert.match(sqlCalls[0].sql, /CREATE ROLE/);
    assert.match(sqlCalls[1].sql, /DROP ROLE IF EXISTS/);
    assert.equal(auditCalls.length, 1);
    assert.match(auditCalls[0].sql, /unsafe-runtime-role-profile-audit-v1/);
    assert.equal(workerCalls.length, 16);
    assert.equal(workerCalls[0].capability, SAFE_CONTROL_CAPABILITY);
    assert.deepEqual(
      new Set(workerCalls.slice(1).map((call) => call.capability)),
      new Set(PROBE_CAPABILITIES),
    );
    assert.deepEqual(
      new Set(workerCalls.slice(1).map((call) => call.tenantId)),
      new Set(TENANTS.map((tenant) => tenant.id)),
    );
    assert.equal(report.passed, true);
    assert.equal(report.expectedAttempts, 15);
    assert.equal(report.rejectedAttempts, 15);
    assert.equal(report.acceptedAttempts, 0);
    assert.equal(report.graphileBuildsStarted, 0);
    assert.equal(report.residentGraphileEntries, 0);
    assert.equal(report.safeStartupControl.passed, true);
    assert.equal(report.safeStartupControl.physicalDatabaseVerifiedBeforeRoleAudit, true);
    assert.equal(report.safeStartupControl.controlCredentialEnvironmentAbsent, true);
    assert.equal(report.liveProvisionAttestation.verified, true);
    assert.equal(report.roleProfileAudit.passed, true);
    assert.equal(report.cleanupAudit.passed, true);
    assert.equal(report.runtimeArtifactFingerprint, runtimeArtifactFingerprint);
    assert.equal(report.admissionScope, ADMISSION_SCOPE);
    assert.equal(report.provisionClone.id, 'unsafe-probe-clone');
    assert.equal(
      report.representativeProvisionAttestationSha256,
      customer.provisionAttestation.sha256,
    );
    assert.doesNotThrow(() => assertCredentialFree(JSON.stringify(report)));
    for (const call of workerCalls) {
      assert.equal(Object.hasOwn(call, 'secretsFile'), false);
      assert.deepEqual(Object.keys(call.runtimePasswords).sort(), ['a', 'b', 'c']);
      assert.doesNotMatch(JSON.stringify(report), new RegExp(call.password));
    }
  });

  it('cleans up and fails closed if any startup reaches publication admission', (context) => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'pdc-unsafe-accepted-'));
    context.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
    const { customer, manifestFile, nonce, secretsFile } = writeFixture(temporary);
    const sqlCalls = [];
    const names = probeNames('fedcba987654');
    assert.throws(() => runUnsafeRuntimeStartupMatrix({
      manifestFile,
      secretsFile,
      expectedRuntimeArtifactFingerprint: runtimeArtifactFingerprint,
      nonce: 'fedcba987654',
      runSql: (input) => sqlCalls.push(input),
      runCloneAudit: () => liveCloneAuditFor(customer, nonce),
      runRoleAudit: () => roleAuditFor(customer, names),
      runCleanupAudit: () => cleanupAuditFor(customer),
      runWorker: (input) => workerResultFor(customer, input, true),
    }), /PDCF_UNSAFE_ROLE_NOT_REJECTED/);
    assert.equal(sqlCalls.length, 2);
    assert.match(sqlCalls[1].sql, /DROP ROLE IF EXISTS/);
  });

  it('attempts idempotent cleanup and audits zero leftovers after ambiguous setup failure', (context) => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'pdc-unsafe-ambiguous-'));
    context.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
    const { customer, manifestFile, nonce, secretsFile } = writeFixture(temporary);
    const sqlCalls = [];
    assert.throws(() => runUnsafeRuntimeStartupMatrix({
      manifestFile,
      secretsFile,
      expectedRuntimeArtifactFingerprint: runtimeArtifactFingerprint,
      nonce: 'abcdef012345',
      runSql: (input) => {
        sqlCalls.push(input);
        if (sqlCalls.length === 1) throw new Error('PDCF_TEST_SETUP_RESULT_AMBIGUOUS');
      },
      runCloneAudit: () => liveCloneAuditFor(customer, nonce),
      runRoleAudit: () => assert.fail('role audit must not run'),
      runCleanupAudit: () => cleanupAuditFor(customer),
      runWorker: (input) => workerResultFor(customer, input, true),
    }), /PDCF_TEST_SETUP_RESULT_AMBIGUOUS/);
    assert.equal(sqlCalls.length, 2);
    assert.match(sqlCalls[0].sql, /CREATE ROLE/);
    assert.match(sqlCalls[1].sql, /DROP ROLE IF EXISTS/);
  });

  it('parses only the final exact worker envelope', () => {
    const customer = {
      id: 'physical-customer-0001',
      provisionAttestation: {
        cloneId: 'unsafe-probe-clone',
        sha256: digest('a'),
      },
    };
    const expected = workerResultFor(customer, {
      tenantId: 'a',
      capability: 'superuser',
    }, false);
    assert.deepEqual(parseWorkerResult(
      `runtime log\n${JSON.stringify(expected)}\n`,
    ), expected);
    assert.throws(
      () => parseWorkerResult('{"kind":"wrong"}\n'),
      /PDCF_UNSAFE_ROLE_WORKER_RESULT_INVALID/,
    );
    assert.throws(
      () => parseWorkerResult(`${JSON.stringify(expected)}\n${JSON.stringify(expected)}\n`),
      /PDCF_UNSAFE_ROLE_WORKER_RESULT_INVALID/,
    );
  });

  it('requires a private regular secrets file before any startup probe', (context) => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'pdc-unsafe-private-'));
    context.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
    const { manifestFile, secretsFile } = writeFixture(temporary);
    fs.chmodSync(secretsFile, 0o640);
    assert.throws(() => runUnsafeRuntimeStartupMatrix({
      manifestFile,
      secretsFile,
      runWorker: () => assert.fail('worker must not run'),
    }), /PDCF_UNSAFE_ROLE_SECRETS_NOT_PRIVATE/);
  });

  it('rejects a manifest containing credential-shaped fields before any worker starts', (context) => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'pdc-unsafe-manifest-secret-'));
    context.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
    const { manifestFile, secretsFile } = writeFixture(temporary);
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    manifest.password = 'credential-that-must-not-reach-the-worker';
    fs.writeFileSync(manifestFile, JSON.stringify(manifest));
    assert.throws(() => runUnsafeRuntimeStartupMatrix({
      manifestFile,
      secretsFile,
      runWorker: () => assert.fail('worker must not run'),
    }), /CTF_ARTIFACT_CONTAINS_CREDENTIAL_MARKER/);
  });

  it('passes only PostgreSQL transport, locale, and inert process settings to workers', () => {
    assert.deepEqual(makeWorkerEnvironment({
      PATH: '/bin',
      NODE_OPTIONS: '--require=/tmp/worker-injection.cjs',
      NODE_PATH: '/tmp/untrusted-modules',
      PGHOST: '127.0.0.1',
      PGPORT: '5432',
      PGSSLMODE: 'verify-full',
      PGPASSWORD: 'control-secret',
      PGUSER: 'control-user',
      PGSERVICE: 'control-service',
      PGSERVICEFILE: '/private/control-service-file',
      PGPASSFILE: '/private/control-passfile',
      PGSSLKEY: '/private/client-key',
      PGDATABASE: 'wrong-database',
      DATABASE_URL: 'postgresql://control:secret@database/control',
      GRAPHILE_CACHE_MAX: '5',
      GRAPHQL_OBSERVABILITY_TOKEN: 'must-not-cross-boundary',
      GRAPHQL_RUNTIME_PGUSER: 'must-not-cross-boundary',
      GRAPHQL_RUNTIME_PGPASSWORD: 'must-not-cross-boundary',
      CTF_CONTROL_TOKEN: 'must-not-cross-boundary',
      GITHUB_TOKEN: 'must-not-cross-boundary',
    }), {
      PATH: '/bin',
      PGHOST: '127.0.0.1',
      PGPORT: '5432',
      PGSSLMODE: 'verify-full',
    });
  });

  it('accepts only the exact worker environment key contract', () => {
    const valid = {
      PGDATABASE: 'unsafe_probe_db_0001',
      CTF_RUNTIME_A_PGPASSWORD: 'a'.repeat(24),
      CTF_RUNTIME_B_PGPASSWORD: 'b'.repeat(24),
      CTF_RUNTIME_C_PGPASSWORD: 'c'.repeat(24),
    };
    assert.equal(assertExactWorkerEnvironment(valid), true);
    assert.throws(() => assertExactWorkerEnvironment({
      ...valid,
      NODE_OPTIONS: '--require=/tmp/worker-injection.cjs',
    }), /PDCF_UNSAFE_ROLE_WORKER_ENVIRONMENT_INVALID/);
    assert.throws(() => assertExactWorkerEnvironment({
      ...valid,
      PGPASSWORD: 'control-secret',
    }), /PDCF_UNSAFE_ROLE_WORKER_ENVIRONMENT_INVALID/);
    assert.throws(() => assertExactWorkerEnvironment({
      ...valid,
      GRAPHILE_CACHE_MAX: '5',
    }), /PDCF_UNSAFE_ROLE_WORKER_ENVIRONMENT_INVALID/);
  });

  it('constructs exactly three customer-surface credentials and replaces the probe surface', () => {
    const environment = makeProbeWorkerEnvironment({
      environment: {
        PGHOST: '127.0.0.1',
        NODE_OPTIONS: '--require=/tmp/worker-injection.cjs',
        GRAPHILE_CACHE_MAX: '5',
      },
      database: 'unsafe_probe_db_0001',
      tenantId: 'b',
      password: 'probe-b-password'.repeat(2),
      runtimePasswords: {
        a: 'safe-a-password'.repeat(2),
        b: 'safe-b-password'.repeat(2),
        c: 'safe-c-password'.repeat(2),
      },
    });
    assert.deepEqual(Object.keys(environment).sort(), [
      'CTF_RUNTIME_A_PGPASSWORD',
      'CTF_RUNTIME_B_PGPASSWORD',
      'CTF_RUNTIME_C_PGPASSWORD',
      'PGDATABASE',
      'PGHOST',
    ]);
    assert.equal(environment.CTF_RUNTIME_A_PGPASSWORD, 'safe-a-password'.repeat(2));
    assert.equal(environment.CTF_RUNTIME_B_PGPASSWORD, 'probe-b-password'.repeat(2));
    assert.equal(environment.CTF_RUNTIME_C_PGPASSWORD, 'safe-c-password'.repeat(2));
    assert.equal(Object.hasOwn(environment, 'NODE_OPTIONS'), false);
    assert.equal(Object.hasOwn(environment, 'GRAPHILE_CACHE_MAX'), false);
  });

  it('fails before file or database access if an unexpected credential reaches a worker', async () => {
    await assert.rejects(() => workerProbe({
      environment: {
        PGPASSWORD: 'control-secret-that-must-not-reach-the-worker',
      },
    }), /PDCF_UNSAFE_ROLE_WORKER_ENVIRONMENT_INVALID/);
  });
});
