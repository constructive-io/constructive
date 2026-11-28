import { spawn } from 'child_process';
import { join } from 'path';

const fixture = join(__dirname, 'fixtures', 'stdio-server.ts');

const requests = [
  { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'probe', version: '1.0.0' } } },
  { jsonrpc: '2.0', method: 'notifications/initialized' },
  { jsonrpc: '2.0', id: 2, method: 'tools/list' },
  { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'noisy_read', arguments: {} } }
];

/** Runs the fixture server, sends the requests one line each, and returns its stdout and stderr once every request has an answer. */
function exchange(): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['-r', 'ts-node/register/transpile-only', fixture], {
      cwd: join(__dirname, '..'),
      stdio: ['pipe', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`The fixture did not answer every request. stdout: ${stdout} stderr: ${stderr}`));
    }, 25_000);
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      const answered = stdout.split('\n').filter(Boolean).flatMap((line) => {
        try {
          return [JSON.parse(line).id];
        } catch {
          return [];
        }
      });
      if ([1, 2, 3].every((id) => answered.includes(id))) child.stdin.end();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', () => {
      clearTimeout(timer);
      resolve({ stdout, stderr });
    });
    for (const request of requests) child.stdin.write(`${JSON.stringify(request)}\n`);
  });
}

describe('serveStdio', () => {
  it('answers initialize, tools/list and a read, writes nothing to stdout but the protocol, and closes with stdin', async () => {
    const { stdout, stderr } = await exchange();
    expect(stdout.endsWith('\n')).toBe(true);
    const messages = stdout.slice(0, -1).split('\n').map((line) => JSON.parse(line));
    for (const message of messages) expect(message.jsonrpc).toBe('2.0');
    const byId = Object.fromEntries(messages.map((message) => [message.id, message]));
    expect(byId[1].result.serverInfo).toMatchObject({ name: 'fixture', version: '1.0.0' });
    expect(byId[2].result.tools.map((tool: { name: string }) => tool.name)).toEqual(['noisy_read']);
    expect(byId[3].result.structuredContent).toEqual({ ok: true, data: { done: true } });
    for (const noise of ['console noise', 'info noise', 'direct noise']) expect(stderr).toContain(noise);
    expect(stderr).toContain('server closed');
  }, 30_000);
});
