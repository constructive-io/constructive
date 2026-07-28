import * as kit from '../src';

describe('agentic-kit umbrella', () => {
  it('re-exports the chat API at the top level', () => {
    expect(typeof kit.complete).toBe('function');
    expect(typeof kit.stream).toBe('function');
    expect(typeof kit.AgentKit).toBe('function');
  });

  it('exposes the agent runtime under the agent namespace', () => {
    expect(kit.agent).toBeDefined();
    expect(Object.keys(kit.agent).length).toBeGreaterThan(0);
  });

  it('exposes the harness under the harness namespace', () => {
    expect(kit.harness).toBeDefined();
    expect(Object.keys(kit.harness).length).toBeGreaterThan(0);
  });
});
