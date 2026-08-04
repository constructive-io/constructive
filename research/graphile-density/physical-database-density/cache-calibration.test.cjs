'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, it } = require('node:test');

const {
  computeCalibratedCapacity,
  deriveCacheCalibration,
  validateCacheCalibration,
} = require('./cache-calibration.cjs');

const MIB = 1024 ** 2;
const databaseContractFingerprint = `sha256:${'d'.repeat(64)}`;

const result = (ordinal) => ({
  version: 1,
  status: 'performance-only',
  mode: 'scoped-required',
  introspectionClientReleaseMode: 'destroy',
  releaseBuildStateAfterValidation: true,
  worktreeDirty: false,
  schemaSets: [['ctf_a']],
  allowedDependencySchemas: ['ctf_extensions'],
  fixtureFingerprint: 'fixture-fingerprint-v1',
  sourceStateSha256: String(ordinal).repeat(64),
  executedEntrySha256: String(ordinal).repeat(64),
  tokenCanariesConclusive: true,
  tokenCanariesPassed: true,
  bleedViolations: 0,
  builds: [{
    introspectionBackendPid: 1000 + ordinal,
    steadyBackendPid: 2000 + ordinal,
    introspectionBackendRetired: true,
    buildTransientSampleCount: 2,
    buildBaselineHeapUsedBytes: (40 + ordinal) * MIB,
    sampledBuildPeakHeapDeltaBytes: (80 + ordinal) * MIB,
    sampledBuildPeakRssDeltaBytes: (90 + ordinal) * MIB,
    processBuildPeakRssDeltaBytes: (100 + ordinal) * MIB,
  }],
  snapshots: [{
    instances: 1,
    heapDeltaBytes: (10 + ordinal) * MIB,
  }],
  postgresBackendMeasurement: {
    expectedRetirementChecks: 1,
    completedRetirementChecks: 1,
    allExpectedRetirementsProven: true,
  },
});

describe('physical density cache calibration', () => {
  it('derives a safety-factored, source-bound calibration from three clean results', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pdc-calibration-'));
    const files = [1, 2, 3].map((ordinal) => {
      const file = path.join(directory, `result-${ordinal}.json`);
      fs.writeFileSync(file, JSON.stringify(result(ordinal)));
      return file;
    });
    const calibration = deriveCacheCalibration({
      resultFiles: files,
      databaseContractFingerprint,
      safetyFactor: 1.25,
    });
    assert.equal(calibration.measured.repetitions, 3);
    assert.equal(calibration.sourceWorktreesClean, true);
    assert.equal(calibration.introspectionClientReleaseMode, 'destroy');
    assert.equal(calibration.releaseBuildStateAfterValidation, true);
    assert.equal(calibration.introspectionBackendRetirementConclusive, true);
    assert.equal(calibration.measured.retainedHeapPerSurfaceBytes, 13 * MIB);
    assert.equal(calibration.configured.instanceHeapBytes, Math.ceil(13 * MIB * 1.25));
    assert.equal(calibration.configured.buildReserveBytes, Math.ceil(83 * MIB * 1.25));
    assert.equal(calibration.configured.rssBuildReserveBytes, Math.ceil(103 * MIB * 1.25));
    assert.equal(validateCacheCalibration(calibration, {
      databaseContractFingerprint,
      introspectionMode: 'scoped-required',
    }), calibration);
    assert.throws(() => validateCacheCalibration({
      ...calibration,
      configured: { ...calibration.configured, buildReserveBytes: 1 },
    }), /CALIBRATION_FORMULA_MISMATCH|CALIBRATION_ID_MISMATCH/);
  });

  it('fails closed on inconclusive or mismatched source measurements', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pdc-calibration-bad-'));
    const values = [result(1), result(2), result(3)];
    values[1].tokenCanariesPassed = false;
    const files = values.map((value, index) => {
      const file = path.join(directory, `result-${index}.json`);
      fs.writeFileSync(file, JSON.stringify(value));
      return file;
    });
    assert.throws(() => deriveCacheCalibration({
      resultFiles: files,
      databaseContractFingerprint,
    }), /RESULT_NOT_CONCLUSIVE/);
    assert.throws(() => deriveCacheCalibration({
      resultFiles: files.slice(0, 2),
      databaseContractFingerprint,
    }), /THREE_RESULTS_REQUIRED/);
  });

  it('fails closed when build-state or PostgreSQL introspection retirement is unproven', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pdc-calibration-retire-'));
    const writeResults = (values, label) => values.map((value, index) => {
      const file = path.join(directory, `${label}-${index}.json`);
      fs.writeFileSync(file, JSON.stringify(value));
      return file;
    });
    const retained = [result(1), result(2), result(3)];
    retained[1].releaseBuildStateAfterValidation = false;
    assert.throws(() => deriveCacheCalibration({
      resultFiles: writeResults(retained, 'retained'),
      databaseContractFingerprint,
    }), /RESULT_NOT_CONCLUSIVE/);

    const reused = [result(1), result(2), result(3)];
    reused[1].builds[0].steadyBackendPid = reused[1].builds[0].introspectionBackendPid;
    assert.throws(() => deriveCacheCalibration({
      resultFiles: writeResults(reused, 'reused'),
      databaseContractFingerprint,
    }), /INTROSPECTION_RETIREMENT_UNPROVEN/);

    const unproven = [result(1), result(2), result(3)];
    unproven[1].postgresBackendMeasurement.allExpectedRetirementsProven = false;
    assert.throws(() => deriveCacheCalibration({
      resultFiles: writeResults(unproven, 'unproven'),
      databaseContractFingerprint,
    }), /INTROSPECTION_RETIREMENT_UNPROVEN/);
  });

  it('computes admission capacity with both resident and next-build budgets', () => {
    assert.equal(computeCalibratedCapacity(1024 * MIB, {
      instanceHeapBytes: 16 * MIB,
      serverReserveBytes: 64 * MIB,
      buildReserveBytes: 128 * MIB,
    }), 53);
    assert.equal(computeCalibratedCapacity(1024 * MIB, {
      instanceHeapBytes: 16 * MIB,
      serverReserveBytes: 256 * MIB,
      buildReserveBytes: 768 * MIB,
    }), 1);
  });
});
