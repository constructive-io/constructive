import { parseRunnerConfig } from '../src';

const valid = {
  enrollments: [
    {
      machineId: 'laptop',
      relayUrl: 'wss://relay.example.com',
      token: 'tok',
      database: 'db-1'
    },
    {
      machineId: 'laptop',
      relayUrl: 'wss://relay.other.example.com',
      token: 'tok2',
      database: 'db-2'
    }
  ],
  policy: { allowedCommands: ['echo'], cwd: '/tmp' }
};

describe('runner config', () => {
  it('accepts a config with multiple enrollments', () => {
    const config = parseRunnerConfig(valid);
    expect(config.enrollments).toHaveLength(2);
    expect(config.enrollments[1].database).toBe('db-2');
  });

  it('rejects a non-object root', () => {
    expect(() => parseRunnerConfig([])).toThrow(/root must be an object/);
  });

  it('rejects an empty enrollment list', () => {
    expect(() => parseRunnerConfig({ ...valid, enrollments: [] })).toThrow(/non-empty array/);
  });

  it('rejects an enrollment missing a field', () => {
    const broken = {
      ...valid,
      enrollments: [{ machineId: 'laptop', relayUrl: 'wss://x', token: 'tok' }]
    };
    expect(() => parseRunnerConfig(broken)).toThrow(/missing 'database'/);
  });

  it('rejects a policy without allowedCommands', () => {
    expect(() => parseRunnerConfig({ ...valid, policy: { cwd: '/tmp' } })).toThrow(
      /allowedCommands/
    );
  });

  it('rejects a policy without cwd', () => {
    expect(() => parseRunnerConfig({ ...valid, policy: { allowedCommands: ['echo'] } })).toThrow(
      /cwd/
    );
  });
});
