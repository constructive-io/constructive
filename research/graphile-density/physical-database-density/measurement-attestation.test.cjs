'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, it } = require('node:test');

const {
  attestMeasurementRun,
  validateMeasurementAttestation,
} = require('./measurement-attestation.cjs');
const {
  captureContainerTemplate,
} = require('./prepare-measurement-run.cjs');
const {
  provisionAttestationSetSha256,
  provisionAttestationSha256,
} = require('./provision.cjs');

const digest = (character) => `sha256:${character.repeat(64)}`;
const fileSha256 = (file) => `sha256:${crypto.createHash('sha256')
  .update(fs.readFileSync(file))
  .digest('hex')}`;

const containerInspection = () => ({
  Id: '1'.repeat(64),
  Name: '/postgres-density-exact',
  Image: digest('2'),
  Created: '2026-08-02T00:00:00.001Z',
  State: {
    Running: true,
    StartedAt: '2026-08-02T00:00:00.010Z',
  },
  Config: {
    Cmd: ['postgres', '-c', 'max_connections=160'],
    Labels: {
      'io.constructive.graphile-density.fixture':
        'physical-database-density-v1',
      'io.constructive.graphile-density.prefix': 'pdc_test',
      'io.constructive.graphile-density.purpose': 'measurement',
    },
  },
  HostConfig: {
    Memory: 1024 ** 3,
    MemorySwap: 1024 ** 3,
    NanoCpus: 1_000_000_000,
    ShmSize: 128 * 1024 ** 2,
  },
  NetworkSettings: {
    Ports: { '5432/tcp': [{ HostIp: '127.0.0.1', HostPort: '55432' }] },
  },
});

describe('physical measurement attestation', () => {
  it('audits the live DDL/ACL contract outside Node and binds a fresh run epoch', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pdc-measurement-'));
    const manifestFile = path.join(directory, 'provision.json');
    const secretsFile = path.join(directory, 'runtime-secrets.json');
    const templateFile = path.join(directory, 'container-template.json');
    const outputFile = path.join(directory, 'attestation.json');
    const nonce = '3'.repeat(64);
    const customer = {
      id: 'physical-customer-0001',
      database: 'pdc_test_db_0001',
      provisionAttestation: {
        version: 1,
        cloneId: 'measurement-run-clone',
        purpose: 'measurement',
        sha256: provisionAttestationSha256({
          cloneId: 'measurement-run-clone',
          runPurpose: 'measurement',
          customerId: 'physical-customer-0001',
          database: 'pdc_test_db_0001',
          nonce,
        }),
      },
      databaseContractFingerprint: digest('4'),
      structuralFingerprints: { combined: { sha256: digest('5'), bytes: 100 } },
    };
    const manifest = {
      canonicalSchemas: ['ctf_a'],
      canonicalDatabaseContractFingerprint: digest('4'),
      canonicalStructuralFingerprint: customer.structuralFingerprints,
      provisionClone: {
        version: 1,
        id: 'measurement-run-clone',
        purpose: 'measurement',
        attestationSetSha256: provisionAttestationSetSha256([customer]),
      },
      customers: [customer],
    };
    fs.writeFileSync(manifestFile, JSON.stringify(manifest));
    fs.writeFileSync(secretsFile, '{}', { mode: 0o600 });
    const template = captureContainerTemplate({
      inspection: containerInspection(),
      container: 'postgres-density-exact',
      prefix: 'pdc_test',
      pgHost: '127.0.0.1',
      pgPort: 55432,
      minimumMaxConnections: 120,
    });
    fs.writeFileSync(templateFile, JSON.stringify(template));
    const run = {
      arm: 'candidate',
      heapMiB: 2048,
      customerCount: 1,
      repetition: 1,
      runOrderIndex: 2,
      planSha256: digest('6'),
      fleetSha256: digest('7'),
    };
    const liveContract = {
      databaseContractFingerprint: customer.databaseContractFingerprint,
      structuralFingerprints: customer.structuralFingerprints,
      roleSafetyProfile: { safe: true },
      notificationRoleSafetyProfile: { safe: true },
      extensionVersions: [{ name: 'vector', version: '1.0' }],
    };
    const attestation = attestMeasurementRun({
      manifestFile,
      secretsFile,
      postgresContainer: 'postgres-density-exact',
      containerTemplateFile: templateFile,
      expectedContainerTemplateSha256: fileSha256(templateFile),
      run,
      notBeforeEpochMs: Date.parse('2026-08-02T00:00:00.000Z'),
      outputFile,
      environment: {
        PGHOST: '127.0.0.1',
        PGPORT: '55432',
        PGDATABASE: 'postgres',
      },
    }, {
      loadProvision: () => ({ manifest }),
      inspectDockerContainer: containerInspection,
      inspectContainerCgroup: () => ({
        version: 1,
        source: 'container-cgroup-v2',
        identitySha256: digest('8'),
      }),
      inspectCustomerContract: () => liveContract,
      runPsqlJson: ({ database }) => database === 'postgres'
        ? {
          systemIdentifier: '7421234567890123456',
          postmasterStartedAt: '2026-08-02T00:00:00.020Z',
          serverVersionNum: '170000',
          databases: ['pdc_test_db_0001', 'postgres'],
          settings: {
            max_connections: { setting: '160', source: 'command line' },
          },
        }
        : {
          version: 1,
          kind: 'unsafe-runtime-live-clone-audit-v1',
          cloneId: customer.provisionAttestation.cloneId,
          purpose: customer.provisionAttestation.purpose,
          customerId: customer.id,
          database: customer.database,
          nonce,
          sha256: customer.provisionAttestation.sha256,
        },
    });
    assert.equal(attestation.payload.freshness.freshContainerForRun, true);
    assert.equal(attestation.payload.customerAudits.length, 1);
    assert.equal(
      attestation.payload.immutableEpoch.cloneAttestationSetSha256,
      manifest.provisionClone.attestationSetSha256,
    );
    assert.match(attestation.payload.epochId, /^sha256:[a-f0-9]{64}$/);
    assert.doesNotThrow(() => validateMeasurementAttestation(attestation));
    assert.deepEqual(JSON.parse(fs.readFileSync(outputFile, 'utf8')), attestation);
  });
});
