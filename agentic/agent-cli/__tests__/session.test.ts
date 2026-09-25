import path from 'path';
import { PassThrough } from 'stream';

import { ClaudeCodeAdapter, runAgentCliSession } from '../src';

const fixtures = path.join(__dirname, 'fixtures', 'bin');
const env = { ...process.env, PATH: `${fixtures}:${process.env.PATH}` };

const collect = (stream: PassThrough): string[] => {
  const chunks: string[] = [];
  stream.on('data', chunk => chunks.push(String(chunk)));
  return chunks;
};

describe('runAgentCliSession', () => {
  it('runs the prompt through the CLI and reports its exit', async () => {
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    const out = collect(stdout);
    collect(stderr);
    const abort = new AbortController();
    const done = runAgentCliSession({
      adapter: new ClaudeCodeAdapter(),
      io: { stdin, stdout, stderr },
      env,
      abort: abort.signal
    });
    stdin.write('hello\n');
    await new Promise<void>(resolve => {
      stdout.on('data', () => {
        if (out.join('').includes('"kind":"result"')) resolve();
      });
    });
    abort.abort();
    expect((await done).signal).toBe('SIGTERM');
    const kinds = out.join('').trim().split('\n').map(line => JSON.parse(line).kind);
    expect(kinds).toContain('session');
    expect(kinds).toContain('text');
  });

  it('starts nothing once the session has concluded', async () => {
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    const out = collect(stdout);
    collect(stderr);
    const abort = new AbortController();
    const done = runAgentCliSession({
      adapter: new ClaudeCodeAdapter(),
      io: { stdin, stdout, stderr },
      env,
      abort: abort.signal
    });
    abort.abort();
    expect(await done).toEqual({ exitCode: -1, signal: 'SIGTERM' });
    stdin.write('hello\n');
    stdin.end();
    await new Promise(resolve => setTimeout(resolve, 300));
    expect(out).toEqual([]);
  });
});
