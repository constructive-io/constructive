import { buildPiArgs } from '../src/agent/pi-launcher';

describe('buildPiArgs', () => {
  it('builds expected PI argv including extension and passthrough flags', () => {
    const args = buildPiArgs({
      piBinaryPath: '/tmp/pi',
      cwd: '/tmp',
      env: {},
      extensionEntryPath: '/tmp/ext.ts',
      provider: 'openai',
      model: 'gpt-4.1-mini',
      apiKey: 'sk-test',
      printPrompt: 'hello',
      passthroughArgs: ['--thinking', 'high'],
    });

    expect(args).toEqual([
      '-e',
      '/tmp/ext.ts',
      '--provider',
      'openai',
      '--model',
      'gpt-4.1-mini',
      '--api-key',
      'sk-test',
      '--print',
      'hello',
      '--thinking',
      'high',
    ]);
  });
});
