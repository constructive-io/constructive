import {
  assertFormatAllowed,
  CliError,
  createCommandRegistry,
  createOperationContext,
  createRedactor,
  defineCommand,
  executeCommand,
  exitCodeForOutcome,
  renderExecution,
  resolveExecutionSettings,
  Type,
} from '../src';

function createProgressCommand() {
  return defineCommand({
    id: 'work.run',
    path: ['work', 'run'],
    summary: 'Run work.',
    input: Type.Object(
      { name: Type.String() },
      { additionalProperties: false }
    ),
    output: Type.Object(
      { token: Type.String(), note: Type.String() },
      { additionalProperties: false }
    ),
    events: Type.Object(
      {
        event: Type.Literal('work.progress'),
        percent: Type.Number({ minimum: 0, maximum: 100 }),
      },
      { additionalProperties: false }
    ),
    bindings: [
      { property: 'name', sources: [{ kind: 'positional', index: 0 }] },
    ],
    examples: [{ argv: ['work', 'run', 'test'] }],
    lifecycle: 'finite' as const,
    effect: 'write' as const,
    async execute(_input, context) {
      expect(context.cwd).toBe('/workspace');
      expect(context.env.CNC_CONTEXT).toBe('preview');
      await context.events.emit({ event: 'work.progress', percent: 50 });
      return { data: { token: 'top-secret', note: 'value=top-secret' } };
    },
  });
}

describe('operation execution and protocol rendering', () => {
  it('validates, redacts, and streams a single terminal protocol event', async () => {
    const command = createProgressCommand();
    const registry = createCommandRegistry([command]);
    const times = [new Date(1000), new Date(1500), new Date(2000)];
    const streamed: unknown[] = [];
    const outcome = await executeCommand(
      registry,
      command,
      { name: 'demo' },
      {
        cwd: '/workspace',
        mode: 'agent',
        env: { CNC_CONTEXT: 'preview' },
        operationId: 'run_1',
        now: () => times.shift()!,
        redaction: { sensitiveValues: ['top-secret'] },
        sink: (event) => {
          streamed.push(event);
        },
      }
    );

    expect(outcome.status).toBe('completed');
    expect(outcome.result).toEqual({
      data: { token: '[REDACTED]', note: 'value=[REDACTED]' },
    });
    expect(outcome.protocolEvents.map((event) => event.event)).toEqual([
      'operation.started',
      'work.progress',
      'operation.completed',
    ]);
    expect(streamed).toEqual(outcome.protocolEvents);
    expect(exitCodeForOutcome(outcome)).toBe(0);

    const json = renderExecution(outcome, 'json');
    expect(json.stderr).toBe('');
    expect(json.stdout.trim().split('\n')).toHaveLength(1);
    expect(JSON.parse(json.stdout).event).toBe('operation.completed');

    const jsonl = renderExecution(outcome, 'jsonl');
    expect(jsonl.stderr).toBe('');
    expect(
      jsonl.stdout
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line).event)
    ).toEqual(['operation.started', 'work.progress', 'operation.completed']);
  });

  it('redacts secrets registered after an operation starts', async () => {
    const command = defineCommand({
      id: 'secret.load',
      path: ['secret', 'load'],
      summary: 'Load a secret.',
      input: Type.Object({}, { additionalProperties: false }),
      output: Type.Object(
        { message: Type.String() },
        { additionalProperties: false }
      ),
      events: Type.Object(
        { event: Type.Literal('secret.loaded'), message: Type.String() },
        { additionalProperties: false }
      ),
      bindings: [],
      examples: [{ argv: ['secret', 'load'] }],
      lifecycle: 'finite' as const,
      effect: 'read' as const,
      async execute(_input, context) {
        const secret = 'loaded-during-execution';
        context.registerSensitiveValue(secret);
        await context.events.emit({
          event: 'secret.loaded',
          message: `saw ${secret}`,
        });
        return { data: { message: `saw ${secret}` } };
      },
    });
    const registry = createCommandRegistry([command]);
    const outcome = await executeCommand(
      registry,
      command,
      {},
      {
        cwd: '/workspace',
        mode: 'agent',
      }
    );

    expect(outcome.status).toBe('completed');
    expect(outcome.result).toEqual({ data: { message: 'saw [REDACTED]' } });
    expect(outcome.protocolEvents[1]).toEqual(
      expect.objectContaining({
        event: 'secret.loaded',
        message: 'saw [REDACTED]',
      })
    );
    expect(JSON.stringify(outcome)).not.toContain('loaded-during-execution');
  });

  it('maps known, internal, and cancelled failures to stable exit codes', async () => {
    const known = defineCommand({
      id: 'failure.known',
      path: ['failure', 'known'],
      summary: 'Fail safely.',
      input: Type.Object({}, { additionalProperties: false }),
      output: Type.Null(),
      bindings: [],
      examples: [{ argv: ['failure', 'known'] }],
      lifecycle: 'finite' as const,
      effect: 'read' as const,
      async execute() {
        throw new CliError({
          code: 'REMOTE_UNAVAILABLE',
          category: 'network',
          message: 'Remote unavailable.',
          retryable: true,
        });
      },
    });
    const invalid = defineCommand({
      ...known,
      id: 'failure.invalid',
      path: ['failure', 'invalid'],
      examples: [{ argv: ['failure', 'invalid'] }],
      async execute(): Promise<any> {
        return { data: 'wrong' };
      },
    });
    const cancelled = defineCommand({
      ...known,
      id: 'failure.cancelled',
      path: ['failure', 'cancelled'],
      examples: [{ argv: ['failure', 'cancelled'] }],
      async execute(_input, context) {
        await new Promise((resolve) =>
          context.signal.addEventListener('abort', resolve, { once: true })
        );
        return { data: null };
      },
    });
    const registry = createCommandRegistry([known, invalid, cancelled]);

    const knownOutcome = await executeCommand(
      registry,
      known,
      {},
      { cwd: '/workspace', mode: 'agent' }
    );
    expect(knownOutcome.error).toEqual(
      expect.objectContaining({ code: 'REMOTE_UNAVAILABLE', retryable: true })
    );
    expect(exitCodeForOutcome(knownOutcome)).toBe(1);

    const invalidOutcome = await executeCommand(
      registry,
      invalid,
      {},
      { cwd: '/workspace', mode: 'agent' }
    );
    expect(invalidOutcome.error?.code).toBe('CLI_INTERNAL_ERROR');
    expect(exitCodeForOutcome(invalidOutcome)).toBe(70);

    const controller = new AbortController();
    const promise = executeCommand(
      registry,
      cancelled,
      {},
      {
        cwd: '/workspace',
        mode: 'agent',
        signal: controller.signal,
      }
    );
    controller.abort('stop');
    const cancelledOutcome = await promise;
    expect(cancelledOutcome.status).toBe('cancelled');
    expect(exitCodeForOutcome(cancelledOutcome)).toBe(130);
  });

  it('enforces mode and long-running format rules', () => {
    expect(
      resolveExecutionSettings({
        agent: true,
        stdinIsTTY: true,
        stdoutIsTTY: true,
      })
    ).toEqual(
      expect.objectContaining({
        mode: 'agent',
        format: 'jsonl',
        interactive: false,
      })
    );
    expect(
      resolveExecutionSettings({ stdinIsTTY: true, stdoutIsTTY: false })
    ).toEqual(
      expect.objectContaining({
        mode: 'human',
        format: 'human',
        interactive: false,
        terminalEffects: false,
      })
    );
    expect(() =>
      resolveExecutionSettings({
        agent: true,
        format: 'human',
        stdinIsTTY: true,
        stdoutIsTTY: true,
      })
    ).toThrow(expect.objectContaining({ code: 'CLI_MODE_CONFLICT' }));

    const command = {
      ...createProgressCommand(),
      lifecycle: 'long-running' as const,
    };
    expect(() => assertFormatAllowed(command, 'json')).toThrow(
      expect.objectContaining({ code: 'CLI_FORMAT_UNSUPPORTED' })
    );
  });

  it('requires absolute operation directories and recursively handles cycles and shared values', () => {
    expect(() =>
      createOperationContext({
        cwd: 'relative',
        mode: 'agent',
        env: {},
        signal: new AbortController().signal,
      })
    ).toThrow(expect.objectContaining({ code: 'CLI_CWD_NOT_ABSOLUTE' }));

    const shared = { value: 'ok' };
    const input: Record<string, unknown> = {
      accessToken: 'hidden',
      first: shared,
      second: shared,
    };
    input.self = input;
    expect(createRedactor()(input)).toEqual({
      accessToken: '[REDACTED]',
      first: { value: 'ok' },
      second: { value: 'ok' },
      self: '[Circular]',
    });
  });
});
