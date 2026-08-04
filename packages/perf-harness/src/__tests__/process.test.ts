import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  collectArmProvenance,
  createObservabilityHeaders,
  expectedHeapLimitForNodeOptions,
  nodeFlagsForV8Profile,
  replaceMaxOldSpaceSize
} from '../process';

describe('arm process isolation and provenance', () => {
  it('creates a fresh, strong bearer header without a separately exposed token', () => {
    const first = createObservabilityHeaders();
    const second = createObservabilityHeaders();
    expect(Object.keys(first)).toEqual(['Authorization']);
    expect(/^Bearer [A-Za-z0-9_-]+$/.test(first.Authorization)).toBe(true);
    expect(Buffer.byteLength(first.Authorization.slice('Bearer '.length))).toBeGreaterThanOrEqual(32);
    expect(first.Authorization === second.Authorization).toBe(false);
  });

  it('replaces all inherited max-old-space aliases without dropping other options', () => {
    expect(replaceMaxOldSpaceSize(
      '--trace-warnings --max-old-space-size=256 --max_old_space_size 512',
      1024
    )).toBe('--trace-warnings --max-old-space-size=1024');
  });

  it('uses only the closed, named V8 profile flag combinations', () => {
    expect(nodeFlagsForV8Profile('stock')).toEqual([]);
    expect(nodeFlagsForV8Profile('optimize-for-size')).toEqual([
      '--optimize-for-size'
    ]);
    expect(nodeFlagsForV8Profile('baseline-optimize-for-size')).toEqual([
      '--max-opt=1',
      '--optimize-for-size'
    ]);
    expect(nodeFlagsForV8Profile('jitless-optimize-for-size')).toEqual([
      '--jitless',
      '--optimize-for-size'
    ]);
    expect(replaceMaxOldSpaceSize(
      '--jitless --max-opt=1 --optimize-for-size --trace-warnings',
      1024
    )).toBe('--trace-warnings --max-old-space-size=1024');
  });

  it('preserves quoted NODE_OPTIONS values while replacing the heap flag', () => {
    expect(replaceMaxOldSpaceSize(
      '--require "/tmp/a b.js" --max-old-space-size 128',
      2048
    )).toBe('--require "/tmp/a b.js" --max-old-space-size=2048');
  });

  it('derives the actual V8 heap limit produced by the sanitized options', () => {
    const nodeOptions = replaceMaxOldSpaceSize(undefined, 128);
    expect(expectedHeapLimitForNodeOptions(nodeOptions)).toBeGreaterThanOrEqual(128 * 1024 ** 2);
  });

  it('records git, lockfile, entry, command, cwd, and server pid provenance', () => {
    const cwd = path.resolve(__dirname, '../../../..');
    const entryPath = path.join(cwd, 'packages/perf-harness/src/index.ts');
    const result = collectArmProvenance(cwd, [process.execPath, entryPath], 9876);
    expect(result.errors).toEqual([]);
    expect(result.provenance).toMatchObject({
      cwd,
      command: [process.execPath, entryPath],
      serverPid: 9876,
      worktreeDirty: expect.any(Boolean),
      gitHead: expect.stringMatching(/^[0-9a-f]{40}$/),
      gitStatusSha256: expect.stringMatching(/^[0-9a-f]{64}$/),
      lockfilePath: path.join(cwd, 'pnpm-lock.yaml'),
      entryPath,
      v8Profile: 'stock',
      nodeOptions: null,
      nodeOptionsArgv: [],
      nodeExecArgv: [],
      effectiveNodeRuntimeFlags: []
    });
    expect(result.provenance.entrySha256).toBe(
      createHash('sha256').update(fs.readFileSync(entryPath)).digest('hex')
    );
    expect(result.provenance.lockfileSha256).toBe(
      createHash('sha256').update(fs.readFileSync(path.join(cwd, 'pnpm-lock.yaml'))).digest('hex')
    );
  });

  it('binds the exact direct and NODE_OPTIONS runtime flags to provenance', () => {
    const cwd = path.resolve(__dirname, '../../../..');
    const entryPath = path.join(cwd, 'packages/perf-harness/src/index.ts');
    const command = [
      process.execPath,
      '--jitless',
      '--optimize-for-size',
      '--expose-gc',
      entryPath
    ];
    const result = collectArmProvenance(cwd, command, 9876, {
      v8Profile: 'jitless-optimize-for-size',
      nodeOptions: '--trace-warnings --max-old-space-size=1024',
      nodeOptionsArgv: ['--trace-warnings', '--max-old-space-size=1024'],
      nodeExecArgv: ['--jitless', '--optimize-for-size', '--expose-gc']
    });
    expect(result.provenance).toMatchObject({
      v8Profile: 'jitless-optimize-for-size',
      nodeExecArgv: ['--jitless', '--optimize-for-size', '--expose-gc'],
      effectiveNodeRuntimeFlags: [
        '--trace-warnings',
        '--max-old-space-size=1024',
        '--jitless',
        '--optimize-for-size',
        '--expose-gc'
      ]
    });
  });
});
