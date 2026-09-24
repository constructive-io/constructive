import { DEFAULT_ENV_ALLOW, PolicyViolationError, resolveSpawn, RunnerPolicy } from '../src';

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
