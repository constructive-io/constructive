'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, it } = require('node:test');

const {
  captureContainerTemplate,
  dockerRunArgs,
  prepareMeasurementRun,
  validateExistingTarget,
} = require('./prepare-measurement-run.cjs');

const sha256 = (file) => `sha256:${crypto.createHash('sha256')
  .update(fs.readFileSync(file))
  .digest('hex')}`;

const sourceInspection = ({ id = '1'.repeat(64), labels = {} } = {}) => ({
  Id: id,
  Name: '/postgres-density-exact',
  Image: `sha256:${'2'.repeat(64)}`,
  State: { Running: true },
  Config: {
    Cmd: [
      'postgres',
      '-c', 'shared_buffers=256MB',
      '-c', 'max_connections=240',
    ],
    Labels: labels,
  },
  HostConfig: {
    Memory: 2 * 1024 ** 3,
    MemorySwap: 2 * 1024 ** 3,
    NanoCpus: 2_000_000_000,
    ShmSize: 256 * 1024 ** 2,
  },
  NetworkSettings: {
    Ports: { '5432/tcp': [{ HostIp: '127.0.0.1', HostPort: '55432' }] },
  },
});

const templateFrom = (inspection = sourceInspection()) => captureContainerTemplate({
  inspection,
  container: 'postgres-density-exact',
  prefix: 'pdc_test',
  pgHost: '127.0.0.1',
  pgPort: 55432,
  minimumMaxConnections: 120,
});

describe('fresh PostgreSQL measurement preparation', () => {
  it('preserves validated PostgreSQL settings and never falls back to default max_connections', () => {
    const template = templateFrom();
    assert.deepEqual(template.postgresCommand, [
      'postgres',
      '-c', 'max_connections=240',
      '-c', 'shared_buffers=256MB',
    ]);
    const args = dockerRunArgs(template, {
      PGUSER: 'fixture_admin',
      PGPASSWORD: 'private-admin-password',
      PGDATABASE: 'postgres',
    });
    assert.deepEqual(args.slice(args.indexOf(template.imageId)), [
      template.imageId,
      ...template.postgresCommand,
    ]);
    assert.ok(args.includes('max_connections=240'));
    assert.ok(args.includes('shared_buffers=256MB'));
    assert.equal(args.some((argument) => argument.includes('private-admin-password')), false);

    const defaultTemplate = templateFrom({
      ...sourceInspection(),
      Config: { Cmd: ['postgres'], Labels: {} },
    });
    assert.ok(defaultTemplate.postgresCommand.includes('max_connections=120'));
    assert.throws(() => templateFrom({
      ...sourceInspection(),
      Config: {
        Cmd: ['postgres', '-c', 'max_connections=80'],
        Labels: {},
      },
    }), /PDCF_CONTAINER_MAX_CONNECTIONS_INSUFFICIENT/);
  });

  it('will remove only the captured container or its exact owned replacement', () => {
    const template = templateFrom();
    assert.equal(validateExistingTarget(sourceInspection(), template), '1'.repeat(64));
    assert.throws(() => validateExistingTarget(sourceInspection({
      id: '3'.repeat(64),
    }), template), /PDCF_CONTAINER_RECREATE_TARGET_NOT_OWNED/);
    assert.equal(validateExistingTarget(sourceInspection({
      id: '3'.repeat(64),
      labels: {
        'io.constructive.graphile-density.fixture':
          'physical-database-density-v1',
        'io.constructive.graphile-density.prefix': 'pdc_test',
        'io.constructive.graphile-density.purpose': 'measurement',
      },
    }), template), '3'.repeat(64));
  });

  it('publishes run-local inputs with stable private credentials and a unique clone', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pdc-prepare-'));
    const artifactDir = path.join(directory, 'artifact');
    const containerTemplateFile = path.join(directory, 'container-template.json');
    const manifestTemplateFile = path.join(directory, 'provision.json');
    const secretsTemplateFile = path.join(directory, 'runtime-secrets.json');
    const template = templateFrom();
    fs.writeFileSync(containerTemplateFile, JSON.stringify(template));
    fs.writeFileSync(manifestTemplateFile, JSON.stringify({ template: true }));
    fs.writeFileSync(secretsTemplateFile, '{}', { mode: 0o600 });
    const customer = {
      id: 'physical-customer-0001',
      roles: { a: 'role_a', b: 'role_b', c: 'role_c' },
      notificationRole: 'role_notify',
    };
    const unselectedCustomer = {
      id: 'physical-customer-0002',
      roles: { a: 'role_2a', b: 'role_2b', c: 'role_2c' },
      notificationRole: 'role_2notify',
    };
    const sourceManifest = {
      prefix: 'pdc_test',
      canonicalSchemas: ['ctf_a'],
      canonicalStructuralFingerprint: { combined: { sha256: `sha256:${'4'.repeat(64)}` } },
      canonicalDatabaseContractFingerprint: `sha256:${'5'.repeat(64)}`,
      provisionClone: { purpose: 'measurement' },
      customers: [customer, unselectedCustomer],
    };
    const passwords = {
      role_a: 'stable-password-role-a-123456',
      role_b: 'stable-password-role-b-123456',
      role_c: 'stable-password-role-c-123456',
      role_notify: 'stable-password-notify-12345',
      role_2a: 'unselected-password-role-2a',
      role_2b: 'unselected-password-role-2b',
      role_2c: 'unselected-password-role-2c',
      role_2notify: 'unselected-password-notify-2',
    };
    let inspectionCount = 0;
    const replacementSource = sourceInspection({
      id: '6'.repeat(64),
      labels: {
        'io.constructive.graphile-density.fixture':
          'physical-database-density-v1',
        'io.constructive.graphile-density.prefix': 'pdc_test',
        'io.constructive.graphile-density.purpose': 'measurement',
      },
    });
    const replacement = {
      ...replacementSource,
      Config: {
        ...replacementSource.Config,
        Cmd: template.postgresCommand,
      },
    };
    const removed = [];
    const result = prepareMeasurementRun({
      containerTemplateFile,
      expectedContainerTemplateSha256: sha256(containerTemplateFile),
      manifestTemplateFile,
      secretsTemplateFile,
      expectedManifestTemplateSha256: sha256(manifestTemplateFile),
      artifactDir,
      run: {
        arm: 'candidate',
        heapMiB: 2048,
        customerCount: 1,
        repetition: 1,
        runOrderIndex: 3,
      },
      environment: {
        PGHOST: '127.0.0.1',
        PGPORT: '55432',
        PGUSER: 'fixture_admin',
        PGPASSWORD: 'admin-password',
        PGDATABASE: 'postgres',
      },
    }, {
      inspectDockerContainer: () => inspectionCount++ === 0
        ? sourceInspection()
        : replacement,
      removeContainer: (container) => removed.push(container),
      startContainer: () => undefined,
      waitForPostgres: () => undefined,
      randomBytes: () => Buffer.alloc(8, 7),
      loadProvision: () => ({
        manifest: sourceManifest,
        secretResolver: {
          runtimePasswordFor: (role) => passwords[role],
          notificationPasswordFor: (role) => passwords[role],
        },
      }),
      provision: (options) => {
        assert.equal(options.customerCount, 1);
        assert.deepEqual(options.credentialTemplate, {
          runtimePasswords: {
            role_a: passwords.role_a,
            role_b: passwords.role_b,
            role_c: passwords.role_c,
          },
          notificationPasswords: { role_notify: passwords.role_notify },
        });
        const manifestFile = path.join(options.outDir, 'provision.json');
        const secretsFile = path.join(options.outDir, 'runtime-secrets.json');
        fs.writeFileSync(manifestFile, JSON.stringify({ cloneId: options.cloneId }));
        fs.writeFileSync(secretsFile, JSON.stringify(passwords), { mode: 0o600 });
        return {
          manifest: {
            canonicalSchemas: sourceManifest.canonicalSchemas,
            canonicalStructuralFingerprint:
              sourceManifest.canonicalStructuralFingerprint,
            canonicalDatabaseContractFingerprint:
              sourceManifest.canonicalDatabaseContractFingerprint,
          },
          manifestFile,
          secretsFile,
        };
      },
    });
    assert.deepEqual(removed, ['1'.repeat(64)]);
    assert.equal(result.container.id, '6'.repeat(64));
    assert.match(result.cloneId, /^measurement-[a-f0-9]{20}-0707070707070707$/);
    assert.equal(fs.statSync(result.secretsFile).mode & 0o777, 0o600);
    const serialized = JSON.stringify({
      result,
      prepare: JSON.parse(fs.readFileSync(
        path.join(artifactDir, 'prepare-attestation.json'),
        'utf8',
      )),
    });
    for (const password of Object.values(passwords)) {
      assert.doesNotMatch(serialized, new RegExp(password));
    }
  });
});
