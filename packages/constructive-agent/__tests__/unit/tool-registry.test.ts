import { ToolRegistry } from '../../src/tools/registry';
import { createEchoTool } from '../../src/testing/test-tools';

describe('ToolRegistry', () => {
  it('registers and returns tools', () => {
    const registry = new ToolRegistry();
    const tool = createEchoTool('echo_1');

    registry.register(tool);

    expect(registry.has('echo_1')).toBe(true);
    expect(registry.get('echo_1')?.name).toBe('echo_1');
    expect(registry.list()).toHaveLength(1);
  });

  it('throws on duplicate registration', () => {
    const registry = new ToolRegistry();
    const tool = createEchoTool('echo_dupe');

    registry.register(tool);

    expect(() => registry.register(tool)).toThrow(
      'Tool echo_dupe is already registered',
    );
  });
});
