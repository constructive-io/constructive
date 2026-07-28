import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable, Writable } from 'node:stream';

import {
  renderHumanLifecycleEvent,
  runCli,
  type CliWritable,
} from '../src/commands';

const REAL_TMP_DIR = realpathSync(tmpdir());
const DEFAULT_TEST_HOME = join(REAL_TMP_DIR, 'cnc-runtime-cli-default-home');

class CaptureStream extends Writable implements CliWritable {
  readonly chunks: Buffer[] = [];
  isTTY?: boolean;

  constructor(isTTY = false) {
    super();
    this.isTTY = isTTY;
  }

  _write(
    chunk: Buffer | string,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  text(): string {
    return Buffer.concat(this.chunks).toString('utf8');
  }
}

const invoke = async (
  argv: string[],
  options: {
    stdinTTY?: boolean;
    stdoutTTY?: boolean;
    env?: Record<string, string>;
    cwd?: string;
  } = {}
) => {
  const stdin = Readable.from([]) as Readable & { isTTY?: boolean };
  stdin.isTTY = options.stdinTTY ?? false;
  const stdout = new CaptureStream(options.stdoutTTY ?? false);
  const stderr = new CaptureStream(false);
  const exitCode = await runCli(argv, {
    cwd: options.cwd ?? process.cwd(),
    env: { HOME: DEFAULT_TEST_HOME, ...(options.env ?? {}) },
    stdin,
    stdout,
    stderr,
    version: '7.30.4-test',
    now: (() => {
      let milliseconds = 0;
      return () => new Date(milliseconds++);
    })(),
  });
  return { exitCode, stdout: stdout.text(), stderr: stderr.text() };
};

describe('CNC agent protocol adapter', () => {
  it('renders validated service lifecycle events for human terminals', () => {
    expect(
      renderHumanLifecycleEvent({
        protocolVersion: 'constructive.dev/cli/v1',
        event: 'service.ready',
        operationId: 'op_1',
        commandId: 'server.start',
        timestamp: '2026-07-20T00:00:00.000Z',
        service: 'graphql',
        url: 'http://localhost:5555',
        port: 5555,
      })
    ).toBe('graphql: ready at http://localhost:5555');
  });

  it('emits protocol-only JSONL in agent mode', async () => {
    const result = await invoke(['version', '--agent']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    const events = result.stdout
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    expect(events.map(({ event }) => event)).toEqual([
      'operation.started',
      'operation.completed',
    ]);
    expect(events[1].protocolVersion).toBe('constructive.dev/cli/v1');
    expect(events[1].result.data.version).toBe('7.30.4-test');
  });

  it('emits exactly one JSON terminal envelope', async () => {
    const result = await invoke(['commands', '--format', 'json']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    const lines = result.stdout.trim().split('\n');
    expect(lines).toHaveLength(1);
    const terminal = JSON.parse(lines[0]);
    expect(terminal.event).toBe('operation.completed');
    expect(terminal.result.data.commands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'execute', path: ['execute'] }),
        expect.objectContaining({ id: 'codegen.generate', path: ['codegen'] }),
      ])
    );
  });

  it('discovers the token-stdin adapter contract through schema and help', async () => {
    const schemaResult = await invoke([
      'schema',
      'auth',
      'set-token',
      '--format',
      'json',
    ]);
    expect(schemaResult.exitCode).toBe(0);
    const schema = JSON.parse(schemaResult.stdout).result.data.schema;
    expect(schema.input.properties.readFromStdin).toEqual(
      expect.objectContaining({ type: 'boolean' })
    );
    expect(schema.bindings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'readFromStdin',
          sources: [
            expect.objectContaining({ kind: 'option', name: 'token-stdin' }),
          ],
        }),
      ])
    );

    const helpResult = await invoke(['help', 'auth', 'set-token']);
    expect(helpResult.exitCode).toBe(0);
    expect(helpResult.stdout).toContain('--token-stdin');
  });

  it('maps invalid mode combinations to exit 2 without prose leakage', async () => {
    const result = await invoke(['version', '--agent', '--format', 'human']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toBe('');
    const events = result.stdout
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    expect(events.at(-1)).toMatchObject({
      event: 'operation.failed',
      error: { code: 'CLI_MODE_CONFLICT', category: 'invocation' },
    });
  });

  it('honors explicit JSON format for agent invocation failures', async () => {
    const result = await invoke([
      'version',
      '--unknown',
      '--agent',
      '--format',
      'json',
    ]);

    expect(result).toEqual(
      expect.objectContaining({ exitCode: 2, stderr: '' })
    );
    expect(result.stdout.trim().split('\n')).toHaveLength(1);
    expect(JSON.parse(result.stdout)).toMatchObject({
      event: 'operation.failed',
      error: { code: 'CLI_OPTION_UNKNOWN' },
    });
  });

  it('rejects JSON buffering for long-running commands before startup', async () => {
    const result = await invoke(['server', '--format', 'json']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toBe('');
    const terminal = JSON.parse(result.stdout);
    expect(terminal).toMatchObject({
      event: 'operation.failed',
      error: { code: 'CLI_FORMAT_UNSUPPORTED' },
    });
  });

  it('rejects unknown agent flags and surplus positionals', async () => {
    const unknown = await invoke(['version', '--agent', '--wat']);
    const unknownInline = await invoke([
      'version',
      '--wat=secret-value',
      '--agent',
    ]);
    const unknownGlobal = await invoke([
      '--wat=secret-value',
      'version',
      '--agent',
    ]);
    const surplus = await invoke(['version', 'extra', '--agent']);
    const helpBypass = await invoke(['server', '--bogus', '--help', '--agent']);
    const versionOptionBypass = await invoke([
      'execute',
      '--bogus',
      '--version',
      '--agent',
    ]);
    const versionCommandBypass = await invoke([
      'not-a-command',
      '--version',
      '--agent',
    ]);

    expect(unknown.exitCode).toBe(2);
    expect(unknownInline.exitCode).toBe(2);
    expect(unknownGlobal.exitCode).toBe(2);
    expect(surplus.exitCode).toBe(2);
    expect(helpBypass.exitCode).toBe(2);
    expect(versionOptionBypass.exitCode).toBe(2);
    expect(versionCommandBypass.exitCode).toBe(2);
    expect(
      JSON.parse(unknown.stdout.trim().split('\n').at(-1)!).error.code
    ).toBe('CLI_OPTION_UNKNOWN');
    expect(unknownGlobal.stdout).not.toContain('secret-value');
    expect(unknownInline.stdout).not.toContain('secret-value');
    expect(
      JSON.parse(surplus.stdout.trim().split('\n').at(-1)!).error.code
    ).toBe('CLI_ARGUMENT_SURPLUS');
    expect(
      JSON.parse(helpBypass.stdout.trim().split('\n').at(-1)!).error.code
    ).toBe('CLI_OPTION_UNKNOWN');
    expect(
      JSON.parse(versionOptionBypass.stdout.trim().split('\n').at(-1)!).error
        .code
    ).toBe('CLI_OPTION_UNKNOWN');
    expect(
      JSON.parse(versionCommandBypass.stdout.trim().split('\n').at(-1)!).error
        .code
    ).toBe('CLI_COMMAND_NOT_FOUND');
  });

  it('retains deprecation warnings when strict command binding fails', async () => {
    const result = await invoke([
      'execute',
      '--unknown',
      '--nonInteractive',
      '--format',
      'json',
    ]);

    expect(result).toEqual(
      expect.objectContaining({ exitCode: 2, stderr: '' })
    );
    expect(JSON.parse(result.stdout)).toMatchObject({
      event: 'operation.failed',
      error: { code: 'CLI_OPTION_UNKNOWN' },
      warnings: [
        {
          code: 'CLI_DEPRECATED',
          message:
            'Option "--nonInteractive" is deprecated; use "--non-interactive".',
        },
      ],
    });
  });

  it('keeps structured stderr empty in CI and non-TTY execution', async () => {
    const result = await invoke(['help', '--format', 'json'], {
      env: { CI: 'true' },
    });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).not.toMatch(/\u001b\[/);
    expect(JSON.parse(result.stdout).event).toBe('operation.completed');
  });

  it('strips terminal styling from non-TTY human output', async () => {
    const result = await invoke(['help', '--\u001b[31munknown\u001b[0m']);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('CLI_OPTION_UNKNOWN');
    expect(result.stderr).not.toMatch(/\u001b\[/);
  });

  it('resolves relative, absolute, symlinked, and concurrent cwd values independently', async () => {
    const root = mkdtempSync(join(REAL_TMP_DIR, 'cnc cwd matrix-'));
    const first = join(root, 'first workspace');
    const second = join(root, 'second workspace');
    const linked = join(root, 'linked workspace');
    mkdirSync(first);
    mkdirSync(second);
    symlinkSync(first, linked, 'dir');

    try {
      const [relativeResult, absoluteResult, symlinkResult] = await Promise.all(
        [
          invoke(
            [
              'docs',
              'export',
              '--target',
              'agent docs',
              '--dry-run',
              '--cwd',
              'first workspace',
              '--format',
              'json',
            ],
            { cwd: root }
          ),
          invoke(
            [
              'docs',
              'export',
              '--target',
              'agent docs',
              '--dry-run',
              '--cwd',
              second,
              '--format',
              'json',
            ],
            { cwd: root }
          ),
          invoke(
            [
              'docs',
              'export',
              '--target',
              'agent docs',
              '--dry-run',
              '--cwd',
              linked,
              '--format',
              'json',
            ],
            { cwd: root }
          ),
        ]
      );

      for (const result of [relativeResult, absoluteResult, symlinkResult]) {
        expect(result).toEqual(
          expect.objectContaining({ exitCode: 0, stderr: '' })
        );
        expect(JSON.parse(result.stdout).result.artifacts).toEqual([]);
      }
      const targets = [relativeResult, absoluteResult, symlinkResult].map(
        ({ stdout }) => JSON.parse(stdout).result.data.target
      );
      expect(targets).toEqual([
        join(first, 'agent docs'),
        join(second, 'agent docs'),
        join(linked, 'agent docs'),
      ]);
      expect(process.cwd()).not.toBe(first);
      expect(process.cwd()).not.toBe(second);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('uses the adapter environment for state and never emits token material', async () => {
    const home = mkdtempSync(join(REAL_TMP_DIR, 'cnc-agent-home-'));
    const token = 'agent-token-that-must-not-leak';
    try {
      const created = await invoke(
        [
          'context',
          'create',
          'preview',
          '--endpoint',
          'https://preview.example.com/graphql',
          '--agent',
        ],
        { env: { HOME: home } }
      );
      const authenticated = await invoke(
        ['auth', 'set-token', '--context', 'preview', '--agent'],
        { env: { HOME: home, CNC_TOKEN: token } }
      );

      expect(created).toEqual(
        expect.objectContaining({ exitCode: 0, stderr: '' })
      );
      expect(authenticated).toEqual(
        expect.objectContaining({ exitCode: 0, stderr: '' })
      );
      expect(created.stdout).not.toContain(token);
      expect(authenticated.stdout).not.toContain(token);

      const statePath = join(home, '.cnc', 'config', 'state.json');
      expect(statSync(statePath).mode & 0o777).toBe(0o600);
      const state = JSON.parse(readFileSync(statePath, 'utf8'));
      expect(state).toMatchObject({
        settings: { currentContext: 'preview' },
        credentials: { tokens: { preview: { token } } },
      });
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  it('returns a safe JSON error for secret-bearing context endpoints', async () => {
    const home = mkdtempSync(join(REAL_TMP_DIR, 'cnc-endpoint-home-'));
    const endpointSecret = 'query-secret-that-must-not-leak';
    try {
      const result = await invoke(
        [
          'context',
          'create',
          'unsafe',
          '--endpoint',
          `https://api.example.com/graphql?authorization=${endpointSecret}`,
          '--format',
          'json',
        ],
        { env: { HOME: home } }
      );

      expect(result).toEqual(
        expect.objectContaining({ exitCode: 2, stderr: '' })
      );
      expect(result.stdout).not.toContain(endpointSecret);
      expect(JSON.parse(result.stdout)).toMatchObject({
        event: 'operation.failed',
        error: { code: 'CONTEXT_ENDPOINT_INVALID' },
      });
      expect(existsSync(join(home, '.cnc'))).toBe(false);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  it('cancels a token-stdin read without waiting for EOF', async () => {
    const stdin = new Readable({ read: () => undefined }) as Readable & {
      isTTY?: boolean;
    };
    stdin.isTTY = false;
    const stdout = new CaptureStream(false);
    const stderr = new CaptureStream(false);
    const controller = new AbortController();
    const pending = runCli(
      ['auth', 'set-token', '--context', 'preview', '--token-stdin', '--agent'],
      {
        cwd: process.cwd(),
        env: { HOME: DEFAULT_TEST_HOME },
        stdin,
        stdout,
        stderr,
        signal: controller.signal,
        version: '7.30.4-test',
      }
    );
    setImmediate(() =>
      controller.abort(new DOMException('Test cancellation.', 'AbortError'))
    );

    const exitCode = await pending;
    const terminal = JSON.parse(stdout.text().trim().split('\n').at(-1)!);
    expect(exitCode).toBe(130);
    expect(terminal).toMatchObject({ event: 'operation.cancelled' });
    expect(stderr.text()).toBe('');
  });
});
