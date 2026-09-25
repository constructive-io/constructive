import fs from 'fs';
import os from 'os';
import path from 'path';

import { DEFAULT_ENV_ALLOW, PolicyViolationError, resolveCwd, resolveSpawn, RunnerPolicy } from '../src';

const policy: RunnerPolicy = {
  allowedCommands: ['echo', 'ls'],
  cwd: '/tmp'
};

describe('runner policy', () => {
  it('allows listed commands', () => {
    const spec = resolveSpawn(policy, 'echo', ['hello']);
    expect(spec.command).toBe('echo');
    expect(spec.args).toEqual(['hello']);
    expect(spec.cwd).toBe('/tmp');
  });

  it('refuses unlisted commands', () => {
    expect(() => resolveSpawn(policy, 'rm', ['-rf', '/'])).toThrow(PolicyViolationError);
  });

  it('passes through only the allowed environment', () => {
    process.env.MACHINE_RUNNER_TEST_SECRET = 'leaky';
    try {
      const spec = resolveSpawn(policy, 'echo');
      expect(spec.env.MACHINE_RUNNER_TEST_SECRET).toBeUndefined();
      for (const name of Object.keys(spec.env)) {
        expect(DEFAULT_ENV_ALLOW).toContain(name);
      }
    } finally {
      delete process.env.MACHINE_RUNNER_TEST_SECRET;
    }
  });

  it('honors an explicit env allow list and set map', () => {
    const spec = resolveSpawn(
      { ...policy, env: { allow: ['PATH'], set: { MACHINE_SESSION: '1' } } },
      'echo'
    );
    expect(Object.keys(spec.env).sort()).toEqual(['MACHINE_SESSION', 'PATH']);
    expect(spec.env.MACHINE_SESSION).toBe('1');
  });
});

describe('cwd confinement', () => {
  let root: string;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()), 'runner-policy-'));
    fs.mkdirSync(path.join(root, 'inside'));
    fs.symlinkSync(os.tmpdir(), path.join(root, 'escape'));
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it('keeps a session inside the root, following symlinks', () => {
    const confined: RunnerPolicy = { allowedCommands: ['ls'], cwd: root };
    expect(resolveCwd(confined)).toBe(root);
    expect(resolveCwd(confined, 'inside')).toBe(path.join(root, 'inside'));
    expect(resolveCwd(confined, 'inside/not-yet-created')).toBe(path.join(root, 'inside/not-yet-created'));
    expect(() => resolveCwd(confined, '..')).toThrow(PolicyViolationError);
    expect(() => resolveCwd(confined, '/etc')).toThrow(PolicyViolationError);
    expect(() => resolveCwd(confined, 'escape')).toThrow(PolicyViolationError);
    expect(() => resolveCwd(confined, 'escape/anything')).toThrow(PolicyViolationError);
  });
});
