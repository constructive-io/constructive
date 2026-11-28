import { z } from 'zod';

import { createCli } from '../src';

// With FIXTURE_TTY=1 the piped stdin and stdout pass for a terminal, so the layer prompts; no pty library is needed.
const tty = process.env.FIXTURE_TTY === '1';
if (tty) {
  Object.assign(process.stdin, { isTTY: true });
  Object.assign(process.stdout, { isTTY: true });
}

const cli = createCli({
  name: 'fixture',
  version: '1.0.0',
  commands: [
    {
      name: 'greet',
      summary: 'Greet someone',
      effect: 'read',
      positionals: ['name'],
      input: z.object({ name: z.string().describe('Who to greet') }),
      run: ({ name }) => ({ data: { greeting: `Hello, ${name}` } })
    },
    {
      name: 'wait',
      summary: 'Wait until interrupted',
      effect: 'read',
      run: (_input, ctx) => new Promise((resolve) => {
        const timer = setInterval(() => undefined, 1000);
        ctx.signal.addEventListener('abort', () => {
          clearInterval(timer);
          resolve({ data: null });
        });
        ctx.stderr.write('ready\n');
      })
    },
    {
      name: 'linger',
      summary: 'Clean up for a moment after an interrupt',
      effect: 'read',
      run: (_input, ctx) => new Promise((resolve) => {
        const timer = setInterval(() => undefined, 1000);
        ctx.signal.addEventListener('abort', () => setTimeout(() => {
          clearInterval(timer);
          ctx.stderr.write('settled\n');
          resolve({ data: null });
        }, 300));
        ctx.stderr.write('ready\n');
      })
    },
    {
      name: 'approve',
      summary: 'Change something after the approval of its plan',
      effect: 'write',
      plan: () => ({ plan: { title: 'Change it?', message: 'Change the fixture.', target: { kind: 'workspace', cwd: process.cwd() } } }),
      apply: (_input, _planned, ctx) => {
        ctx.stderr.write('applied\n');
        return { data: { applied: true } };
      }
    },
    {
      name: 'secret',
      summary: 'Ask for a secret',
      effect: 'read',
      input: z.object({ password: z.string().meta({ 'x-secret': true, description: 'Password' }) }),
      run: () => ({ data: { signedIn: true } })
    }
  ]
});

cli.run(process.argv.slice(2), tty ? { stdin: process.stdin } : {}).then((code) => {
  process.exitCode = code;
});
