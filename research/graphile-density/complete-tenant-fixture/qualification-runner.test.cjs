'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  installProcessEnvironment,
  runQualification,
  summarizeQualification,
} = require('./qualification-runner.cjs');

test('offline success remains explicitly unqualified for customers', () => {
  const localEvidence = {
    hostilePassed: true,
    repositorySuites: [{ id: 'suite', passed: true }],
    densityResults: [{ accepted: true }],
  };
  assert.deepEqual(summarizeQualification({
    qualificationClass: 'offline-research',
    providerState: { customerQualified: false, unresolved: ['provider'] },
    ...localEvidence,
  }), {
    localPassed: true,
    customerQualified: false,
    unresolvedExternalGates: ['provider'],
  });
  assert.equal(summarizeQualification({
    qualificationClass: 'production',
    providerState: { customerQualified: true, unresolved: [] },
    ...localEvidence,
  }).customerQualified, false);
  assert.equal(summarizeQualification({
    qualificationClass: 'production',
    providerState: { customerQualified: true, unresolved: [] },
    productionEquivalent: true,
    ...localEvidence,
  }).customerQualified, true);
});

test('temporary in-process environment installation is exactly reversible', () => {
  const key = `CTF_TEST_ENV_${process.pid}`;
  delete process.env[key];
  const restore = installProcessEnvironment({ [key]: 'fixture-value' }, [key]);
  assert.equal(process.env[key], 'fixture-value');
  restore();
  assert.equal(Object.prototype.hasOwnProperty.call(process.env, key), false);
  restore();
});

test('production preflight failure still writes a fail-closed report', async (context) => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctf-qualification-'));
  context.after(() => fs.rmSync(outputDir, { recursive: true, force: true }));
  await assert.rejects(() => runQualification({
    qualificationClass: 'production',
    arm: 'fixture-arm',
    mode: 'scoped-required',
    port: 3391,
    postgresContainer: 'ctf-postgres',
    runtimeRoles: { a: 'ctf_runtime_a', b: 'ctf_runtime_b', c: 'ctf_runtime_c' },
    durationSec: 60,
    outputDir,
    providerArguments: {},
    environment: {},
  }), /CTF_EXTERNAL_PROVIDER_GATES_UNSATISFIED/);
  const report = JSON.parse(fs.readFileSync(path.join(outputDir, 'qualification.json'), 'utf8'));
  assert.equal(report.localPassed, false);
  assert.equal(report.customerQualified, false);
  assert.equal(report.startedLocally, false);
  assert.match(report.failure, /^CTF_EXTERNAL_PROVIDER_GATES_UNSATISFIED:/);
  assert.equal(report.generatedInputs, null);
});
