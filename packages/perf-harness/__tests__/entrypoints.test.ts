import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { BenchmarkReport } from '../src/types';

describe('built package entry points', () => {
  const packageRoot = resolve(__dirname, '..');
  const artifactRoot = resolve(packageRoot, 'dist');
  let manifest: { main: string; module: string; bin: { cperf: string } };

  beforeAll(async () => {
    manifest = JSON.parse(
      await readFile(resolve(artifactRoot, 'package.json'), 'utf8')
    );
  });

  const node = (args: string[], input?: string) =>
    spawnSync(process.execPath, args, {
      cwd: packageRoot,
      encoding: 'utf8',
      input,
      timeout: 15_000,
    });

  test('imports the CommonJS library without running the CLI', () => {
    const entry = resolve(artifactRoot, manifest.main);
    const result = node([
      '--eval',
      `const assert = require('node:assert/strict');
       const library = require(${JSON.stringify(entry)});
       assert.equal(typeof library.runBenchmarkSuite, 'function');
       assert.equal(typeof library.prepareFixture, 'function');`,
    ]);
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
  });

  test('imports the emitted ESM library without CommonJS globals or CLI startup', () => {
    const entry = pathToFileURL(resolve(artifactRoot, manifest.module)).href;
    const result = node(
      [
        '--no-warnings',
        '--experimental-loader',
        pathToFileURL(resolve(__dirname, 'fixtures/esm-loader.mjs')).href,
        '--input-type=module',
      ],
      `import assert from 'node:assert/strict';
       import * as library from ${JSON.stringify(entry)};
       assert.equal(typeof require, 'undefined');
       assert.equal(typeof module, 'undefined');
       assert.equal(typeof library.runBenchmarkSuite, 'function');
       assert.equal(typeof library.prepareFixture, 'function');`
    );
    expect(result.error).toBeUndefined();
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
  });

  test('runs a benchmark through the built manifest bin and writes its report', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'cperf-entry-'));
    const output = resolve(directory, 'report.json');
    const databaseUrl = 'postgres://secret@example.test/database';
    const cases = [
      { name: 'baseline', workerConfig: { value: 1, schemaHash: 'same' } },
    ];
    try {
      const result = node([
        resolve(artifactRoot, manifest.bin.cperf),
        'run',
        '--database-url',
        databaseUrl,
        '--worker',
        resolve(__dirname, 'fixtures/fake-worker.js'),
        '--cases',
        Buffer.from(JSON.stringify(cases)).toString('base64url'),
        '--repetitions',
        '1',
        '--worker-timeout-ms',
        '5000',
        '--output',
        output,
      ]);
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(0);
      const report: BenchmarkReport = JSON.parse(
        await readFile(output, 'utf8')
      );
      expect(report.validation.allRunsSucceeded).toBe(true);
      expect(report.validation.freshProcessPerRun).toBe(true);
      expect(report.summaries.baseline.sampleCount).toBe(1);
      expect(JSON.stringify(report)).not.toContain(databaseUrl);
      expect(result.stdout + result.stderr).not.toContain(databaseUrl);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test('reports CLI argument errors with a nonzero exit', () => {
    const result = node([
      resolve(artifactRoot, manifest.bin.cperf),
      'prepare',
      '--schema',
      'cperf_example',
    ]);
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('--database-url is required');
  });
});
