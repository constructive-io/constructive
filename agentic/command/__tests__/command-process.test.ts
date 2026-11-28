import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { join } from 'path';

const packageDir = join(__dirname, '..');
const fixture = join(packageDir, 'test-utils/command-fixture.ts');

interface Exit {
  code: number | null;
  stdout: string;
  stderr: string;
  ms: number;
}

interface FixtureOptions {
  stdin: 'closed' | 'open';
  /** Stdin and stdout pass for a terminal, so the layer prompts. */
  tty?: boolean;
  /** Called with all stderr text so far, for example to type an answer or send a signal. */
  onStderr?: (text: string, child: ChildProcessWithoutNullStreams) => void;
}

/** Runs the fixture CLI with stdout piped; a child still running after 5 seconds is killed and fails the test. */
function runFixture(args: string[], { stdin, tty, onStderr }: FixtureOptions): Promise<Exit> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const child = spawn(process.execPath, ['-r', 'ts-node/register/transpile-only', fixture, ...args], {
      cwd: packageDir,
      env: { ...process.env, TS_NODE_PROJECT: join(packageDir, 'tsconfig.json'), FIXTURE_TTY: tty ? '1' : '', CI: '' },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    if (stdin === 'closed') child.stdin.end();
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
      onStderr?.(stderr, child);
    });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`The fixture did not exit within 5 seconds. stderr: ${stderr}`));
    }, 5000);
    child.on('error', reject);
    child.on('close', (code) => {
      clearTimeout(timer);
      child.stdin.destroy();
      resolve({ code, stdout, stderr, ms: Date.now() - started });
    });
  });
}

/** Types `keys` once, when stderr first shows `prompt`, then closes stdin unless `keepOpen` is set. */
const answer = (prompt: string, keys: string, { keepOpen = false } = {}) => {
  let typed = false;
  return (stderr: string, child: ChildProcessWithoutNullStreams): void => {
    if (typed || !stderr.includes(prompt)) return;
    typed = true;
    if (keepOpen) child.stdin.write(keys);
    else child.stdin.end(keys);
  };
};

describe('the command layer in a child process', () => {
  it.each(['closed', 'open'] as const)('exits 2 with a missing-input envelope when stdin is %s and not a TTY', async (stdin) => {
    const exit = await runFixture(['greet'], { stdin });
    expect(exit.code).toBe(2);
    expect(JSON.parse(exit.stdout)).toMatchObject({ ok: false, error: { code: 'missing-input', details: { missing: ['--name'] } } });
    expect(exit.ms).toBeLessThan(5000);
  });

  it.each(['closed', 'open'] as const)('exits 3 with the plan, and waits for nothing, when a change has no --yes and stdin is %s', async (stdin) => {
    const exit = await runFixture(['approve'], { stdin });
    expect(exit.code).toBe(3);
    expect(JSON.parse(exit.stdout)).toMatchObject({ ok: false, error: { code: 'approval-required', details: { plan: { title: 'Change it?' } } } });
    expect(exit.stderr).not.toContain('applied');
  });

  it('exits 0 with a JSON envelope when all input is given', async () => {
    const exit = await runFixture(['greet', 'ann'], { stdin: 'closed' });
    expect(exit.code).toBe(0);
    expect(JSON.parse(exit.stdout)).toEqual({ ok: true, data: { greeting: 'Hello, ann' }, meta: { command: 'greet' } });
  });

  it('aborts the signal and exits 130 on SIGINT', async () => {
    const exit = await runFixture(['wait'], {
      stdin: 'closed',
      onStderr: (stderr, child) => {
        if (stderr.includes('ready')) child.kill('SIGINT');
      }
    });
    expect(exit.code).toBe(130);
    expect(JSON.parse(exit.stdout)).toMatchObject({ ok: false, error: { code: 'interrupted' } });
  });

  it('waits for the command to settle after SIGINT before it reports the interrupt', async () => {
    const exit = await runFixture(['linger', '--format', 'text'], {
      stdin: 'closed',
      onStderr: (stderr, child) => {
        if (stderr === 'ready\n') child.kill('SIGINT');
      }
    });
    expect(exit.code).toBe(130);
    expect(exit.stderr).toMatch(/^ready\nsettled\nError \(interrupted\)/);
  });

  it.each([
    ['approve', 'Apply?'],
    ['secret', 'Password']
  ])('cancels "%s" with exit 130 when Ctrl-C is pressed at the prompt', async (command, prompt) => {
    const exit = await runFixture([command], { stdin: 'open', tty: true, onStderr: answer(prompt, '\u0003') });
    expect(exit.code).toBe(130);
    expect(exit.stdout).toBe('');
    const errors = exit.stderr.split('\n').filter((line) => line.startsWith('Error'));
    expect(errors).toEqual(['Error (cancelled): Cancelled (Ctrl-C). Nothing changed.']);
    expect(exit.stderr).not.toContain('applied');
  });

  it.each([
    ['approve', 'Ctrl-D', 'Apply?', '\u0004'],
    ['approve', 'a closed stdin', 'Apply?', ''],
    ['secret', 'Ctrl-D', 'Password', '\u0004']
  ])('cancels "%s" with exit 1 when %s ends the input at the prompt', async (command, _end, prompt, keys) => {
    const exit = await runFixture([command], { stdin: 'open', tty: true, onStderr: answer(prompt, keys, { keepOpen: keys !== '' }) });
    expect(exit.code).toBe(1);
    expect(exit.stdout).toBe('');
    const errors = exit.stderr.split('\n').filter((line) => line.startsWith('Error'));
    expect(errors).toEqual(['Error (cancelled): No answer: the input ended. Nothing changed.']);
    expect(exit.stderr).not.toContain('applied');
  });

  it('reports a declined approval as cancelled with exit 1, and applies nothing', async () => {
    const exit = await runFixture(['approve'], { stdin: 'open', tty: true, onStderr: answer('Apply?', 'n\n') });
    expect(exit.code).toBe(1);
    expect(exit.stderr).toContain('Error (cancelled): Not approved. Nothing changed.');
    expect(exit.stderr).not.toContain('applied');
  });

  it('applies the change once the person approves it at the prompt', async () => {
    const exit = await runFixture(['approve'], { stdin: 'open', tty: true, onStderr: answer('Apply?', 'y\n') });
    expect(exit.code).toBe(0);
    expect(exit.stderr).toContain('Change the fixture.');
    expect(exit.stderr).toContain('applied');
  });
});
