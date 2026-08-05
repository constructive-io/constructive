'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, it } = require('node:test');

const { TENANTS, assertCredentialFree } = require('../complete-tenant-fixture/lib.cjs');
const { makeCustomers } = require('./lib.cjs');
const {
  provisionAttestationSetSha256,
  provisionAttestationSha256,
} = require('./provision.cjs');
const {
  assertProvisionCloneManifest,
  parseServerOptions,
} = require('./server.cjs');
const {
  assertOutputDoesNotAliasInputs,
  canonicalSha256,
  runPhysicalHostilePreflight,
  validateUnsafeRuntimeStartupAdmission,
  validatePhysicalStatus,
} = require('./physical-hostile-preflight.cjs');
const {
  ADMISSION_SCOPE,
  CLEANUP_AUDIT_KIND,
  PROBE_CAPABILITIES,
  PROBE_KIND,
  expectedAuditedProfiles,
} = require('./unsafe-runtime-startup-probe.cjs');

const digest = (character) => `sha256:${character.repeat(64)}`;
const arm = 'physical-db-idle-1s';
const mode = 'scoped-required';
const preflightCloneId = 'fresh-preflight-clone-20260802-a';

const makeManifest = () => {
  const canonicalDatabaseContractFingerprint = digest('b');
  const canonicalStructuralFingerprint = {
    combined: { sha256: digest('c') },
  };
  const customers = makeCustomers('pdc_preflight', 2).map((customer, index) => ({
    ...customer,
    provisionAttestation: {
      version: 1,
      cloneId: preflightCloneId,
      purpose: 'hostile-preflight',
      sha256: digest(String(index + 3)),
    },
    structuralFingerprints: canonicalStructuralFingerprint,
    databaseContractFingerprint: canonicalDatabaseContractFingerprint,
  }));
  return {
    version: 1,
    fixture: 'physical-database-density-v1',
    prefix: 'pdc_preflight',
    createdAt: '2026-08-02T00:00:00.000Z',
    provisionClone: {
      version: 1,
      id: preflightCloneId,
      purpose: 'hostile-preflight',
      attestationSetSha256: provisionAttestationSetSha256(customers),
    },
    canonicalStructuralFingerprint,
    canonicalDatabaseContractFingerprint,
    customers,
  };
};

const physicalStatusFor = (manifest) => ({
  version: 1,
  fixture: 'physical-database-density-v1',
  arm,
  runPurpose: 'hostile-preflight',
  cloneId: preflightCloneId,
  provisionClone: {
    ...manifest.provisionClone,
    verified: true,
  },
  introspectionMode: mode,
  introspectionClientReleaseMode: 'destroy',
  runtimePoolMax: 2,
  runtimePoolMaxUses: null,
  canonicalDatabaseContractFingerprint:
    manifest.canonicalDatabaseContractFingerprint,
  blueprintCompatibilityFingerprint: digest('d'),
  canonicalStructuralFingerprint: manifest.canonicalStructuralFingerprint,
  realtime: {
    managersExpected: manifest.customers.length * TENANTS.length,
    connectionsExpected: manifest.customers.length * TENANTS.length,
    transportsExpected: manifest.customers.length * TENANTS.length,
    notificationMode: 'dedicated',
  },
  customers: manifest.customers.map((customer) => ({
    id: customer.id,
    physicalDatabase: customer.database,
    provisionAttestation: {
      ...customer.provisionAttestation,
      customerId: customer.id,
      database: customer.database,
      verified: true,
    },
    structuralFingerprints: customer.structuralFingerprints,
    canonicalStructuralFingerprint:
      customer.structuralFingerprints.combined.sha256,
    databaseContractFingerprint: customer.databaseContractFingerprint,
    contractVerification: 'live-recomputed',
  })),
});

const childStatusFor = (manifest, customer, buildCounts) => ({
  version: 1,
  fixture: 'complete-tenant-abc-v1',
  arm,
  introspectionMode: mode,
  introspectionClientReleaseMode: 'destroy',
  releaseBuildStateAfterValidation: true,
  runtimeArtifactFingerprint: digest('e'),
  physicalIsolation: 'dedicated-login-and-pool-per-tenant',
  sharedRuntimePool: false,
  runtimePoolMax: 2,
  runtimePoolMaxUses: null,
  enableRealtime: true,
  realtimeNotificationMode: 'dedicated',
  realtimeCursorPollIntervalMs: 5_000,
  realtimeCursorHeartbeatIntervalMs: 30_000,
  realtimeSchemas: Object.fromEntries(TENANTS.map((tenant) => [
    tenant.id,
    `${tenant.schema}_realtime`,
  ])),
  physicalDatabase: customer.physicalIdentity,
  runPurpose: 'hostile-preflight',
  provisionAttestation: {
    ...customer.provisionAttestation,
    customerId: customer.id,
    database: customer.database,
    verified: true,
  },
  controlAvailable: true,
  runtimePoolIdentities: Object.fromEntries(TENANTS.map((tenant, index) => [
    tenant.id,
    `pg:v1:${String(index + 1).repeat(64)}`,
  ])),
  buildContracts: Object.fromEntries(TENANTS.map((tenant) => [
    tenant.id,
    `graphile:v1:${customer.id}:${tenant.id}`,
  ])),
  configurationIdentity: `graphile-configuration:ctf:v1:${'e'.repeat(64)}`,
  liveIdentityScope: 'process-local-keyed-hmac-v1',
  runtimeBindings: Object.fromEntries(TENANTS.map((tenant) => [
    tenant.id,
    {
      databaseName: customer.database,
      role: customer.roles[tenant.id],
      schemas: [tenant.schema],
    },
  ])),
  contractEvidence: {
    version: 1,
    credentialFree: true,
    configurationIdentity: `graphile-configuration:ctf:v1:${'e'.repeat(64)}`,
    runtimePools: Object.fromEntries(TENANTS.map((tenant) => [
      tenant.id,
      {
        version: 1,
        fingerprint: `pg-contract-evidence:v1:${tenant.id.repeat(64)}`,
        input: {
          databaseName: customer.database,
          role: customer.roles[tenant.id],
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
  },
  builds: { byTenant: { ...buildCounts } },
  runtimeSafety: { passed: true, rolesDistinct: true },
});

const response = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const makeProvenance = () => {
  const provenance = {
    git: {
      commit: 'a'.repeat(40),
      worktreeDirty: false,
      worktreeStateSha256: digest('f'),
    },
    lockfileSha256: digest('1'),
    runtime: {
      node: 'v24.0.0',
      v8: '13.6',
      platform: 'linux',
      architecture: 'x64',
    },
    validatorEntries: [{ path: 'validator.cjs', sha256: digest('2') }],
  };
  return {
    ...provenance,
    sourceStateSha256: canonicalSha256(provenance),
  };
};

const writeSecrets = (directory, manifest) => {
  const secretsFile = path.join(directory, 'runtime-secrets.json');
  fs.writeFileSync(secretsFile, JSON.stringify({
    version: 1,
    fixture: 'physical-database-density-v1',
    runtimePasswords: Object.fromEntries(manifest.customers.flatMap((customer) =>
      Object.values(customer.roles).map((role) => [
        role,
        `test-runtime-password-${role}`,
      ])
    )),
    notificationPasswords: Object.fromEntries(manifest.customers.map((customer) => [
      customer.notificationRole,
      `test-notification-password-${customer.notificationRole}`,
    ])),
  }), { mode: 0o600 });
  return secretsFile;
};

const unsafeStartupAdmissionFor = (manifest) => {
  const attempts = PROBE_CAPABILITIES.flatMap((capability) => TENANTS.map((tenant) => ({
    capability,
    tenantId: tenant.id,
    rejectedCode: 'GRAPHILE_UNSAFE_RUNTIME_ROLE',
    controlCredentialEnvironmentAbsent: true,
    graphileBuildsStarted: 0,
    residentGraphileEntries: 0,
  })));
  return {
    version: 2,
    kind: PROBE_KIND,
    admissionScope: ADMISSION_SCOPE,
    provisionClone: { ...manifest.provisionClone },
    representativeCustomerId: manifest.customers[0].id,
    representativePhysicalDatabase: manifest.customers[0].physicalIdentity,
    representativeProvisionAttestationSha256:
      manifest.customers[0].provisionAttestation.sha256,
    canonicalDatabaseContractFingerprint:
      manifest.canonicalDatabaseContractFingerprint,
    runtimeArtifactFingerprint: digest('e'),
    liveProvisionAttestation: {
      ...manifest.customers[0].provisionAttestation,
      customerId: manifest.customers[0].id,
      database: manifest.customers[0].database,
      verified: true,
    },
    safeStartupControl: {
      tenantId: TENANTS[0].id,
      accepted: true,
      physicalDatabaseVerifiedBeforeRoleAudit: true,
      controlCredentialEnvironmentAbsent: true,
      graphileBuildsStarted: 0,
      residentGraphileEntries: 0,
      passed: true,
    },
    roleProfileAudit: {
      version: 1,
      kind: 'unsafe-runtime-role-profile-audit-v1',
      database: manifest.customers[0].database,
      profiles: expectedAuditedProfiles(),
      passed: true,
    },
    cleanupAudit: {
      version: 1,
      kind: CLEANUP_AUDIT_KIND,
      database: manifest.customers[0].database,
      remainingRoles: 0,
      remainingSchemas: 0,
      passed: true,
    },
    capabilities: [...PROBE_CAPABILITIES],
    surfaces: TENANTS.map((tenant) => tenant.id),
    attempts,
    expectedAttempts: attempts.length,
    rejectedAttempts: attempts.length,
    acceptedAttempts: 0,
    graphileBuildsStarted: 0,
    residentGraphileEntries: 0,
    passed: true,
  };
};

describe('aggregate physical hostile preflight', () => {
  it('binds clone purpose and identity to opaque per-database nonce digests', () => {
    const base = {
      cloneId: preflightCloneId,
      runPurpose: 'hostile-preflight',
      customerId: 'physical-customer-0001',
      database: 'pdc_preflight_db_0001',
      nonce: '1'.repeat(64),
    };
    const sha256 = provisionAttestationSha256(base);
    assert.match(sha256, /^sha256:[a-f0-9]{64}$/);
    assert.equal(sha256, provisionAttestationSha256(base));
    assert.notEqual(sha256, provisionAttestationSha256({
      ...base,
      nonce: '2'.repeat(64),
    }));
    assert.notEqual(sha256, provisionAttestationSha256({
      ...base,
      runPurpose: 'measurement',
    }));

    const sql = fs.readFileSync(path.join(__dirname, 'provision-attestation.sql'), 'utf8');
    assert.match(sql, /CREATE SCHEMA ctf_provision_private/);
    assert.match(sql, /REVOKE ALL ON SCHEMA ctf_provision_private FROM PUBLIC/);
    assert.match(sql, /REVOKE ALL ON TABLE ctf_provision_private\.clone_attestation FROM PUBLIC/);
    assert.doesNotMatch(sql, /GRANT .*runtime_role/i);
  });

  it('requires explicit purpose and clone identity on every physical server', () => {
    const options = parseServerOptions([
      '--manifest', '/tmp/provision.json',
      '--secrets', '/tmp/runtime-secrets.json',
      '--run-purpose', 'hostile-preflight',
      '--clone-id', preflightCloneId,
    ]);
    assert.equal(options.runPurpose, 'hostile-preflight');
    assert.equal(options.cloneId, preflightCloneId);
    assert.throws(() => parseServerOptions([
      '--manifest', '/tmp/provision.json',
      '--secrets', '/tmp/runtime-secrets.json',
      '--run-purpose', 'diagnostic',
      '--clone-id', preflightCloneId,
    ]), /PDCF_RUN_PURPOSE_INVALID/);
    assert.throws(() => parseServerOptions([
      '--manifest', '/tmp/provision.json',
      '--secrets', '/tmp/runtime-secrets.json',
      '--run-purpose', 'measurement',
    ]), /CTF_ARGUMENT_REQUIRED:clone-id/);

    const manifest = makeManifest();
    assert.equal(assertProvisionCloneManifest(manifest, options), manifest.provisionClone);
    assert.throws(() => assertProvisionCloneManifest(manifest, {
      ...options,
      runPurpose: 'measurement',
    }), /PDCF_PROVISION_CLONE_MISMATCH/);
  });

  it('runs every mounted customer sequentially and rebuilds only after fleet invalidation', async (context) => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'pdc-hostile-preflight-'));
    context.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
    const manifest = makeManifest();
    const manifestFile = path.join(temporary, 'provision.json');
    const outputFile = path.join(temporary, 'hostile-preflight.json');
    fs.writeFileSync(manifestFile, JSON.stringify(manifest));
    const secretsFile = writeSecrets(temporary, manifest);

    const counts = Object.fromEntries(manifest.customers.map((customer) => [
      customer.id,
      { a: 3, b: 4, c: 5 },
    ]));
    const pendingRebuilds = new Map();
    const customerOrder = [];
    let activeCustomerValidations = 0;
    let maxActiveCustomerValidations = 0;
    const fetchImpl = async (url, options = {}) => {
      const parsed = new URL(url);
      if (parsed.pathname === '/__physical/status') {
        return response(physicalStatusFor(manifest));
      }
      const route = /^\/customer\/([^/]+)(.*)$/.exec(parsed.pathname);
      assert.ok(route, `unexpected route ${parsed.pathname}`);
      const customer = manifest.customers.find((candidate) => candidate.id === route[1]);
      assert.ok(customer);
      if (route[2] === '/__ctf/status') {
        return response(childStatusFor(manifest, customer, counts[customer.id]));
      }
      if (route[2] === '/__ctf/control') {
        const body = JSON.parse(options.body);
        assert.equal(body.action, 'invalidate-all');
        pendingRebuilds.set(customer.id, new Set(TENANTS.map((tenant) => tenant.id)));
        return response({
          ok: true,
          action: body.action,
          physicalDatabaseIdentity: customer.physicalIdentity,
        });
      }
      const graphqlRoute = /^\/tenant\/([abc])\/graphql$/.exec(route[2]);
      assert.ok(graphqlRoute, `unexpected child route ${route[2]}`);
      const tenant = TENANTS.find((candidate) => candidate.id === graphqlRoute[1]);
      const pending = pendingRebuilds.get(customer.id);
      if (pending?.delete(tenant.id)) counts[customer.id][tenant.id] += 1;
      return response({
        data: {
          tenantIdentity: tenant.token,
          requestIdentity: `${tenant.token}:${tenant.databaseId}`,
          physicalDatabaseIdentity: customer.physicalIdentity,
        },
      });
    };
    const controlToken = 'preflight-control-value-that-is-never-persisted';
    const report = await runPhysicalHostilePreflight({
      manifestFile,
      secretsFile,
      baseUrl: 'http://127.0.0.1:3410',
      controlToken,
      arm,
      mode,
      preflightCloneId,
      outputFile,
      fetchImpl,
      provenanceProvider: makeProvenance,
      runUnsafeRoleMatrix: () => unsafeStartupAdmissionFor(manifest),
      runCustomerValidation: async (options) => {
        activeCustomerValidations += 1;
        maxActiveCustomerValidations = Math.max(
          maxActiveCustomerValidations,
          activeCustomerValidations,
        );
        customerOrder.push(options.expectedCustomerId);
        assert.equal(
          options.pathPrefix,
          `/customer/${options.expectedCustomerId}`,
        );
        const customer = manifest.customers.find(
          (candidate) => candidate.id === options.expectedCustomerId,
        );
        assert.equal(options.expectedPhysicalDatabaseIdentity, customer.physicalIdentity);
        await Promise.resolve();
        activeCustomerValidations -= 1;
        return {
          passed: true,
          checks: TENANTS.map((tenant) => ({
            name: `bad-role-expected-failure:${tenant.id}`,
            passed: true,
          })),
        };
      },
    });

    assert.equal(maxActiveCustomerValidations, 1);
    assert.deepEqual(customerOrder, manifest.customers.map((customer) => customer.id));
    assert.equal(report.passed, true);
    assert.equal(report.customerQualified, false);
    assert.equal(report.performanceEvidence, false);
    assert.equal(report.fleetInvalidateAndRebuild.invalidatedCustomers, 2);
    assert.equal(report.fleetInvalidateAndRebuild.rebuiltSurfaces, 6);
    assert.equal(report.observedRuntimeArtifactFingerprint, digest('e'));
    assert.equal(report.observedBlueprintCompatibilityFingerprint, digest('d'));
    assert.equal(report.unsafeRuntimeStartupAdmission.rejectedAttempts, 15);
    assert.equal(report.unsafeRuntimeStartupAdmission.graphileBuildsStarted, 0);
    assert.equal(
      report.unsafeRuntimeStartupAdmission.runtimeArtifactFingerprint,
      digest('e'),
    );
    assert.equal(report.unsafeRuntimeStartupAdmission.cleanupAudit.passed, true);
    assert.equal(report.provisionClone.id, preflightCloneId);
    assert.equal(report.provisionClone.verifiedByServer, true);
    assert.match(report.manifest.sha256, /^sha256:[a-f0-9]{64}$/);
    assert.match(report.artifactSha256, /^sha256:[a-f0-9]{64}$/);

    const artifact = fs.readFileSync(outputFile, 'utf8');
    assert.doesNotMatch(artifact, new RegExp(controlToken));
    assert.doesNotThrow(() => assertCredentialFree(artifact));
  });

  it('fails closed when the mounted server customer set or mode differs', () => {
    const manifest = makeManifest();
    const status = physicalStatusFor(manifest);
    assert.equal(validatePhysicalStatus(status, {
      manifest,
      arm,
      mode,
      preflightCloneId,
    }), status);
    assert.throws(() => validatePhysicalStatus({
      ...status,
      introspectionMode: 'stock',
    }, { manifest, arm, mode, preflightCloneId }), /PDCF_HOSTILE_PHYSICAL_STATUS_MISMATCH/);
    assert.throws(() => validatePhysicalStatus({
      ...status,
      customers: status.customers.slice(0, 1),
    }, { manifest, arm, mode, preflightCloneId }), /PDCF_HOSTILE_CUSTOMER_SET_MISMATCH/);
    assert.throws(() => validatePhysicalStatus({
      ...status,
      customers: [...status.customers].reverse(),
    }, { manifest, arm, mode, preflightCloneId }), /PDCF_HOSTILE_CUSTOMER_SET_MISMATCH/);
    assert.throws(() => validatePhysicalStatus({
      ...status,
      realtime: {
        ...status.realtime,
        managersExpected: 0,
      },
    }, {
      manifest,
      arm,
      mode,
      preflightCloneId,
    }), /PDCF_HOSTILE_PHYSICAL_STATUS_MISMATCH/);

    assert.throws(() => validatePhysicalStatus({
      ...status,
      provisionClone: {
        ...status.provisionClone,
        verified: false,
      },
    }, {
      manifest,
      arm,
      mode,
      preflightCloneId,
    }), /PDCF_HOSTILE_PHYSICAL_STATUS_MISMATCH/);
  });

  it('persists a credential-free failure skeleton before any customer mutation', async (context) => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'pdc-hostile-failure-'));
    context.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
    const manifest = makeManifest();
    const manifestFile = path.join(temporary, 'provision.json');
    const outputFile = path.join(temporary, 'hostile-preflight.json');
    fs.writeFileSync(manifestFile, JSON.stringify(manifest));
    const secretsFile = writeSecrets(temporary, manifest);
    const controlToken = 'failure-control-value-that-is-never-persisted';
    let customerValidationStarted = false;

    await assert.rejects(() => runPhysicalHostilePreflight({
      manifestFile,
      secretsFile,
      baseUrl: 'http://127.0.0.1:3410',
      controlToken,
      arm,
      mode,
      preflightCloneId,
      outputFile,
      fetchImpl: async () => response({
        ...physicalStatusFor(manifest),
        introspectionMode: 'stock',
      }),
      provenanceProvider: makeProvenance,
      runUnsafeRoleMatrix: () => unsafeStartupAdmissionFor(manifest),
      runCustomerValidation: async () => {
        customerValidationStarted = true;
      },
    }), /PDCF_HOSTILE_PHYSICAL_STATUS_MISMATCH/);

    assert.equal(customerValidationStarted, false);
    const artifactText = fs.readFileSync(outputFile, 'utf8');
    const artifact = JSON.parse(artifactText);
    assert.equal(artifact.passed, false);
    assert.equal(artifact.customerQualified, false);
    assert.equal(artifact.performanceEvidence, false);
    assert.equal(artifact.failureCode, 'PDCF_HOSTILE_PHYSICAL_STATUS_MISMATCH');
    assert.deepEqual(artifact.customerValidations, []);
    assert.doesNotMatch(artifactText, new RegExp(controlToken));
    assert.doesNotThrow(() => assertCredentialFree(artifact));
  });

  it('rejects partial or post-publication unsafe-role evidence', () => {
    const manifest = makeManifest();
    const valid = unsafeStartupAdmissionFor(manifest);
    assert.equal(validateUnsafeRuntimeStartupAdmission(valid, manifest, digest('e')), valid);
    assert.throws(() => validateUnsafeRuntimeStartupAdmission({
      ...valid,
      attempts: valid.attempts.slice(1),
      rejectedAttempts: valid.rejectedAttempts - 1,
    }, manifest, digest('e')), /PDCF_UNSAFE_RUNTIME_STARTUP_ADMISSION_INVALID/);
    assert.throws(() => validateUnsafeRuntimeStartupAdmission({
      ...valid,
      graphileBuildsStarted: 1,
    }, manifest, digest('e')), /PDCF_UNSAFE_RUNTIME_STARTUP_ADMISSION_INVALID/);
    assert.throws(() => validateUnsafeRuntimeStartupAdmission({
      ...valid,
      runtimeArtifactFingerprint: digest('f'),
    }, manifest, digest('e')), /PDCF_UNSAFE_RUNTIME_STARTUP_ADMISSION_INVALID/);
    assert.throws(() => validateUnsafeRuntimeStartupAdmission({
      ...valid,
      cleanupAudit: {
        ...valid.cleanupAudit,
        remainingRoles: 1,
        passed: false,
      },
    }, manifest, digest('e')), /PDCF_UNSAFE_RUNTIME_STARTUP_ADMISSION_INVALID/);
    assert.throws(() => validateUnsafeRuntimeStartupAdmission({
      ...valid,
      safeStartupControl: {
        ...valid.safeStartupControl,
        accepted: false,
      },
    }, manifest, digest('e')), /PDCF_UNSAFE_RUNTIME_STARTUP_ADMISSION_INVALID/);
    assert.throws(() => validateUnsafeRuntimeStartupAdmission({
      ...valid,
      roleProfileAudit: {
        ...valid.roleProfileAudit,
        profiles: valid.roleProfileAudit.profiles.map((profile) =>
          profile.capability === 'bypassrls'
            ? { ...profile, bypassRls: false }
            : profile
        ),
      },
    }, manifest, digest('e')), /PDCF_UNSAFE_RUNTIME_STARTUP_ADMISSION_INVALID/);
  });

  it('rejects a non-private runtime secrets input before network access', async (context) => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'pdc-hostile-secrets-'));
    context.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
    const manifest = makeManifest();
    const manifestFile = path.join(temporary, 'provision.json');
    fs.writeFileSync(manifestFile, JSON.stringify(manifest));
    const secretsFile = writeSecrets(temporary, manifest);
    fs.chmodSync(secretsFile, 0o644);
    let fetched = false;
    await assert.rejects(() => runPhysicalHostilePreflight({
      manifestFile,
      secretsFile,
      baseUrl: 'http://127.0.0.1:3410',
      controlToken: 'private-secret-test-control-token-value',
      arm,
      mode,
      preflightCloneId,
      fetchImpl: async () => {
        fetched = true;
        return response({});
      },
      provenanceProvider: makeProvenance,
    }), /PDCF_UNSAFE_ROLE_SECRETS_NOT_PRIVATE/);
    assert.equal(fetched, false);
  });

  it('rejects output paths that alias manifest or secrets inputs', (context) => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'pdc-hostile-output-alias-'));
    context.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
    const manifestFile = path.join(temporary, 'provision.json');
    const secretsFile = path.join(temporary, 'runtime-secrets.json');
    fs.writeFileSync(manifestFile, '{}');
    fs.writeFileSync(secretsFile, '{}', { mode: 0o600 });
    assert.throws(
      () => assertOutputDoesNotAliasInputs(manifestFile, [manifestFile, secretsFile]),
      /PDCF_HOSTILE_OUTPUT_ALIASES_INPUT/,
    );
    assert.throws(
      () => assertOutputDoesNotAliasInputs(secretsFile, [manifestFile, secretsFile]),
      /PDCF_HOSTILE_OUTPUT_ALIASES_INPUT/,
    );
    assert.equal(
      assertOutputDoesNotAliasInputs(
        path.join(temporary, 'hostile-preflight.json'),
        [manifestFile, secretsFile],
      ),
      path.join(temporary, 'hostile-preflight.json'),
    );
  });
});
