import { runGatePolicy } from '../src';

describe('runGatePolicy', () => {
  it('asks by default so an undeclared tool is never implicitly trusted', () => {
    expect(runGatePolicy().evaluate({ toolName: 'bash', input: {} })).toEqual({ decision: 'ask' });
  });

  it('lets the first matching rule win', () => {
    const policy = runGatePolicy({
      rules: [
        { tool: 'bash', decision: 'deny', reason: 'no shell in this run' },
        { tool: '*', decision: 'allow' }
      ]
    });

    expect(policy.evaluate({ toolName: 'bash', input: {} })).toMatchObject({
      decision: 'deny',
      reason: 'no shell in this run'
    });
    expect(policy.evaluate({ toolName: 'read', input: {} })).toMatchObject({ decision: 'allow' });
  });

  it('narrows a rule by tool arguments', () => {
    const policy = runGatePolicy({
      rules: [
        {
          tool: 'bash',
          decision: 'ask',
          reason: 'destructive command',
          match: ({ input }) => String(input.command ?? '').includes('rm ')
        },
        { tool: 'bash', decision: 'allow' }
      ],
      defaultDecision: 'deny'
    });

    expect(policy.evaluate({ toolName: 'bash', input: { command: 'rm -rf build' } })).toMatchObject({
      decision: 'ask',
      reason: 'destructive command'
    });
    expect(policy.evaluate({ toolName: 'bash', input: { command: 'ls' } })).toMatchObject({ decision: 'allow' });
  });

  it('falls through to the configured default', () => {
    const policy = runGatePolicy({
      rules: [{ tool: 'read', decision: 'allow' }],
      defaultDecision: 'deny',
      defaultReason: 'read-only run'
    });

    expect(policy.evaluate({ toolName: 'write', input: {} })).toEqual({
      decision: 'deny',
      reason: 'read-only run'
    });
  });

  it('reports the rule that decided, so an audit trail can name it', () => {
    const rule = { tool: 'write' as const, decision: 'deny' as const };
    const verdict = runGatePolicy({ rules: [rule] }).evaluate({ toolName: 'write', input: {} });
    expect(verdict.rule).toBe(rule);
  });

  it('rejects a rule with no tool name', () => {
    expect(() => runGatePolicy({ rules: [{ tool: '', decision: 'allow' }] })).toThrow(/needs a tool name/);
  });
});
