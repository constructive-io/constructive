import { spawnSync } from 'node:child_process';

import {
  ArtifactSchema,
  assertJsonValue,
  bindArguments,
  CliError,
  CommandCatalogEntrySchema,
  CommandDefinition,
  CommandSchemaDocumentSchema,
  compileSchema,
  createCommandRegistry,
  createFailureOutcome,
  createRedactor,
  defineCommand,
  DomainProtocolEventSchema,
  ExecutionOutcomeSchema,
  generateCompletion,
  HelpDocumentSchema,
  NextActionSchema,
  OperationCancelledEventSchema,
  OperationCompletedEventSchema,
  OperationFailedEventSchema,
  OperationResultSchema,
  OperationStartedEventSchema,
  ProtocolEventSchema,
  renderExecution,
  renderHelp,
  resolveExecutionSettings,
  SafetyCapabilitiesSchema,
  StructuredErrorSchema,
  TerminalProtocolEventSchema,
  Type,
  WarningSchema,
  executeCommand,
} from '../src';

function baseCommand(overrides: Partial<CommandDefinition> = {}) {
  return defineCommand({
    id: 'safe.run',
    path: ['safe', 'run'],
    summary: 'Run safely.',
    input: Type.Object(
      { value: Type.Optional(Type.String()) },
      { additionalProperties: false }
    ),
    output: Type.Object(
      { ok: Type.Boolean() },
      { additionalProperties: false }
    ),
    bindings: [
      { property: 'value', sources: [{ kind: 'option', name: 'value' }] },
    ],
    examples: [{ argv: ['safe', 'run', '--value', 'demo'] }],
    lifecycle: 'finite' as const,
    effect: 'read' as const,
    async execute() {
      return { data: { ok: true } };
    },
    ...overrides,
  } as CommandDefinition);
}

describe('runtime protocol hardening', () => {
  it('exports compilable schemas for every public result and envelope', () => {
    for (const schema of [
      WarningSchema,
      ArtifactSchema,
      NextActionSchema,
      SafetyCapabilitiesSchema,
      CommandCatalogEntrySchema,
      CommandSchemaDocumentSchema,
      HelpDocumentSchema,
      OperationResultSchema,
      StructuredErrorSchema,
      OperationStartedEventSchema,
      DomainProtocolEventSchema,
      OperationCompletedEventSchema,
      OperationFailedEventSchema,
      OperationCancelledEventSchema,
      TerminalProtocolEventSchema,
      ProtocolEventSchema,
      ExecutionOutcomeSchema,
    ]) {
      expect(() => compileSchema(schema)).not.toThrow();
    }
  });

  it('validates redacted results and errors before publishing them', async () => {
    const command = defineCommand({
      id: 'redaction.contract',
      path: ['redaction', 'contract'],
      summary: 'Test redaction contracts.',
      input: Type.Object({}, { additionalProperties: false }),
      output: Type.Object(
        { secret: Type.Literal('allowed') },
        { additionalProperties: false }
      ),
      bindings: [],
      examples: [{ argv: ['redaction', 'contract'] }],
      lifecycle: 'finite' as const,
      effect: 'read' as const,
      async execute() {
        return { data: { secret: 'allowed' as const } };
      },
    });
    const registry = createCommandRegistry([command]);
    const outcome = await executeCommand(
      registry,
      command,
      {},
      { cwd: '/workspace', mode: 'agent' }
    );

    expect(outcome.status).toBe('failed');
    expect(outcome.error?.code).toBe('CLI_INTERNAL_ERROR');
    expect(
      compileSchema(ProtocolEventSchema).validate(outcome.terminalEvent)
    ).toBe(true);

    const malformedKnownError = new CliError({
      code: 'BAD_DETAILS',
      category: 'operation',
      message: 'Could not use env-secret.',
      details: { amount: BigInt(1) },
    });
    const failure = await createFailureOutcome({
      commandId: 'adapter.failure',
      error: malformedKnownError,
      redaction: { sensitiveValues: ['env-secret'] },
    });
    expect(failure.error?.code).toBe('CLI_INTERNAL_ERROR');
    expect(JSON.stringify(failure)).not.toContain('env-secret');
  });

  it('validates result and error next actions against the active registry', async () => {
    const recovery = defineCommand({
      id: 'recovery.inspect',
      path: ['recovery', 'inspect'],
      summary: 'Inspect recovery state.',
      input: Type.Object(
        { operationId: Type.String({ minLength: 1 }) },
        { additionalProperties: false }
      ),
      output: Type.Null(),
      bindings: [
        {
          property: 'operationId',
          sources: [{ kind: 'positional', index: 0 }],
        },
      ],
      examples: [{ argv: ['recovery', 'inspect', 'op_1'] }],
      lifecycle: 'finite' as const,
      effect: 'read' as const,
      async execute() {
        return { data: null };
      },
    });
    const commandWithAction = (
      id: string,
      nextAction: {
        commandId: string;
        input: Record<string, unknown>;
        reason: string;
      },
      asError = false
    ) =>
      defineCommand({
        id,
        path: id.split('.'),
        summary: 'Return a next action.',
        input: Type.Object({}, { additionalProperties: false }),
        output: Type.Null(),
        bindings: [],
        examples: [{ argv: id.split('.') }],
        lifecycle: 'finite' as const,
        effect: 'read' as const,
        async execute() {
          if (asError) {
            throw new CliError({
              code: 'RECOVERY_REQUIRED',
              category: 'operation',
              message: 'Recovery is required.',
              nextActions: [nextAction],
            });
          }
          return { data: null, nextActions: [nextAction] };
        },
      });

    const valid = commandWithAction('action.valid', {
      commandId: 'recovery.inspect',
      input: { operationId: 'op_1' },
      reason: 'Inspect the failed operation.',
    });
    const unknown = commandWithAction('action.unknown', {
      commandId: 'recovery.missing',
      input: {},
      reason: 'Try a missing command.',
    });
    const malformedError = commandWithAction(
      'action.error',
      {
        commandId: 'recovery.inspect',
        input: {},
        reason: 'Inspect without the required operation ID.',
      },
      true
    );
    const registry = createCommandRegistry([
      recovery,
      valid,
      unknown,
      malformedError,
    ]);

    const validOutcome = await executeCommand(
      registry,
      valid,
      {},
      {
        cwd: '/workspace',
        mode: 'agent',
      }
    );
    expect(validOutcome.status).toBe('completed');
    expect(validOutcome.result?.nextActions).toEqual([
      expect.objectContaining({ commandId: 'recovery.inspect' }),
    ]);

    for (const command of [unknown, malformedError]) {
      const outcome = await executeCommand(
        registry,
        command,
        {},
        {
          cwd: '/workspace',
          mode: 'agent',
        }
      );
      expect(outcome.status).toBe('failed');
      expect(outcome.error).toMatchObject({
        code: 'CLI_INTERNAL_ERROR',
        category: 'internal',
      });
    }
  });

  it('serializes, drains, and seals operation event reporting', async () => {
    type OrderedEvent = { event: 'ordered.progress'; index: number };
    let emitAfterCompletion:
      | ((event: OrderedEvent) => Promise<void>)
      | undefined;
    const ordered = defineCommand({
      id: 'ordered.run',
      path: ['ordered', 'run'],
      summary: 'Emit ordered progress.',
      input: Type.Object({}, { additionalProperties: false }),
      output: Type.Null(),
      events: Type.Object(
        {
          event: Type.Literal('ordered.progress'),
          index: Type.Integer(),
        },
        { additionalProperties: false }
      ),
      bindings: [],
      examples: [{ argv: ['ordered', 'run'] }],
      lifecycle: 'finite' as const,
      effect: 'read' as const,
      async execute(_input, context) {
        emitAfterCompletion = context.events.emit;
        void context.events.emit({ event: 'ordered.progress', index: 1 });
        void context.events.emit({ event: 'ordered.progress', index: 2 });
        return { data: null };
      },
    });
    const streamed: Array<{ event: string; index?: number }> = [];
    const registry = createCommandRegistry([ordered]);
    const outcome = await executeCommand(
      registry,
      ordered,
      {},
      {
        cwd: '/workspace',
        mode: 'agent',
        sink: async (event) => {
          if (event.event === 'ordered.progress' && event.index === 1) {
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
          streamed.push(event as { event: string; index?: number });
        },
      }
    );

    expect(outcome.status).toBe('completed');
    expect(
      streamed.map(({ event, index }) => `${event}:${index ?? ''}`)
    ).toEqual([
      'operation.started:',
      'ordered.progress:1',
      'ordered.progress:2',
      'operation.completed:',
    ]);
    const beforeLateEmit = JSON.stringify(outcome.protocolEvents);
    await expect(
      emitAfterCompletion!({ event: 'ordered.progress', index: 3 })
    ).rejects.toMatchObject({ code: 'CLI_EVENT_REPORTER_CLOSED' });
    expect(JSON.stringify(outcome.protocolEvents)).toBe(beforeLateEmit);
  });

  it('turns an unawaited invalid event into an internal terminal failure', async () => {
    const invalidEvent = defineCommand({
      id: 'event.invalid',
      path: ['event', 'invalid'],
      summary: 'Emit invalid progress.',
      input: Type.Object({}, { additionalProperties: false }),
      output: Type.Null(),
      events: Type.Object(
        {
          event: Type.Literal('event.progress'),
          index: Type.Integer(),
        },
        { additionalProperties: false }
      ),
      bindings: [],
      examples: [{ argv: ['event', 'invalid'] }],
      lifecycle: 'finite' as const,
      effect: 'read' as const,
      async execute(_input, context) {
        void context.events.emit({
          event: 'event.progress',
          index: 'invalid',
        } as never);
        return { data: null };
      },
    });
    const registry = createCommandRegistry([invalidEvent]);
    const outcome = await executeCommand(
      registry,
      invalidEvent,
      {},
      {
        cwd: '/workspace',
        mode: 'agent',
      }
    );

    expect(outcome).toMatchObject({
      status: 'failed',
      error: { code: 'CLI_INTERNAL_ERROR', category: 'internal' },
    });
    expect(outcome.protocolEvents.map(({ event }) => event)).toEqual([
      'operation.started',
      'operation.failed',
    ]);
  });

  it('always terminalizes invalid operation identity and clock failures', async () => {
    const command = baseCommand();
    const registry = createCommandRegistry([command]);

    const invalidIdentity = await executeCommand(
      registry,
      command,
      {},
      {
        cwd: '/workspace',
        mode: 'agent',
        operationId: '',
      }
    );
    expect(invalidIdentity).toMatchObject({
      status: 'failed',
      error: { code: 'CLI_OPERATION_ID_INVALID', category: 'invocation' },
    });
    expect(invalidIdentity.operationId.length).toBeGreaterThan(0);
    expect(invalidIdentity.protocolEvents.map(({ event }) => event)).toEqual([
      'operation.started',
      'operation.failed',
    ]);
    expect(
      invalidIdentity.protocolEvents.every(
        ({ operationId }) => operationId === invalidIdentity.operationId
      )
    ).toBe(true);

    let clockCalls = 0;
    const clockFailure = await executeCommand(
      registry,
      command,
      {},
      {
        cwd: '/workspace',
        mode: 'agent',
        now: () => {
          clockCalls += 1;
          if (clockCalls === 1) return new Date(0);
          throw new Error('clock implementation failed');
        },
      }
    );
    expect(clockFailure).toMatchObject({
      status: 'failed',
      error: { code: 'CLI_INTERNAL_ERROR', category: 'internal' },
    });
    expect(clockFailure.protocolEvents.map(({ event }) => event)).toEqual([
      'operation.started',
      'operation.failed',
    ]);

    const adapterFailure = await createFailureOutcome({
      commandId: 'adapter.failure',
      error: new Error('original adapter error'),
      now: () => new Date(Number.NaN),
    });
    expect(adapterFailure).toMatchObject({
      status: 'failed',
      error: { code: 'CLI_INTERNAL_ERROR', category: 'internal' },
    });
    expect(adapterFailure.protocolEvents.map(({ event }) => event)).toEqual([
      'operation.started',
      'operation.failed',
    ]);
  });

  it('redacts prototype-looking keys without prototype mutation and preserves sparse shape', () => {
    const input = JSON.parse(
      '{"__proto__":{"polluted":true},"accessToken":"secret-value"}'
    ) as Record<string, unknown>;
    const redacted = createRedactor()(input);
    expect(Object.getPrototypeOf(redacted)).toBe(Object.prototype);
    expect(Object.prototype.hasOwnProperty.call(redacted, '__proto__')).toBe(
      true
    );
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
    expect(redacted.accessToken).toBe('[REDACTED]');
    expect(
      createRedactor()({
        tokenCount: 3,
        credentials: {
          value: 'secret',
          pin: 1234,
          enabled: true,
          issuedAt: new Date('2026-07-20T00:00:00.000Z'),
        },
      })
    ).toEqual({
      tokenCount: '[REDACTED]',
      credentials: {
        value: '[REDACTED]',
        pin: '[REDACTED]',
        enabled: '[REDACTED]',
        issuedAt: '[REDACTED]',
      },
    });
    expect(
      createRedactor({ sensitiveValues: ['2468', 'false'] })({
        amount: 2468,
        enabled: false,
        safeAmount: 1357,
      })
    ).toEqual({
      amount: '[REDACTED]',
      enabled: '[REDACTED]',
      safeAmount: 1357,
    });

    const sparse = new Array(3);
    sparse[2] = 'value';
    const safeSparse = createRedactor()(sparse);
    expect(safeSparse).toHaveLength(3);
    expect(0 in safeSparse).toBe(false);
    expect(() => assertJsonValue(safeSparse)).toThrow(
      expect.objectContaining({ code: 'CLI_JSON_VALUE_INVALID' })
    );
  });

  it('deep-snapshots and freezes command contracts without freezing caller functions', () => {
    const original = baseCommand();
    const execute = original.execute;
    const registry = createCommandRegistry([original]);
    const stored = registry.requireById('safe.run');

    (original.path as string[])[0] = 'mutated';
    (original.bindings[0].sources[0] as { name: string }).name = 'mutated';
    (
      original.input as unknown as { properties: { value: { type: string } } }
    ).properties.value.type = 'number';

    expect(stored.path).toEqual(['safe', 'run']);
    expect((stored.bindings[0].sources[0] as { name: string }).name).toBe(
      'value'
    );
    expect(
      (stored.input as unknown as { properties: { value: { type: string } } })
        .properties.value.type
    ).toBe('string');
    expect(Object.isFrozen(stored.input)).toBe(true);
    expect(Object.isFrozen(stored.bindings[0])).toBe(true);
    expect(Object.isFrozen(execute)).toBe(false);
  });

  it('rejects malformed bindings and collisions with global flags', () => {
    const cases: Partial<CommandDefinition>[] = [
      {
        bindings: [
          { property: 'value', sources: [{ kind: 'option', name: 'Value' }] },
        ],
      },
      {
        bindings: [
          { property: 'value', sources: [{ kind: 'option', name: 'format' }] },
        ],
      },
      {
        bindings: [
          {
            property: 'value',
            sources: [{ kind: 'option', name: 'value', short: 'h' }],
          },
        ],
      },
      {
        bindings: [
          {
            property: 'value',
            sources: [{ kind: 'option', name: 'value', aliases: ['--legacy'] }],
          },
        ],
      },
      {
        bindings: [
          { property: 'value', sources: [{ kind: 'positional', index: 1 }] },
        ],
        examples: [{ argv: ['safe', 'run', 'value'] }],
      },
      {
        bindings: [
          {
            property: 'value',
            sources: [{ kind: 'option', name: 'value' }],
            repeated: true,
          },
        ],
      },
      {
        bindings: [
          {
            property: 'value',
            sources: [{ kind: 'option', name: 'value', negatable: true }],
          },
        ],
      },
    ];
    for (const contract of cases)
      expect(() => createCommandRegistry([baseCommand(contract)])).toThrow();
  });

  it('distinguishes long and short options and supports deferred validation and secret collection', () => {
    const command = defineCommand({
      id: 'binding.secrets',
      path: ['binding', 'secrets'],
      summary: 'Bind secrets.',
      input: Type.Object(
        {
          required: Type.String(),
          token: Type.Optional(Type.String()),
          password: Type.Optional(Type.String()),
        },
        { additionalProperties: false }
      ),
      output: Type.Null(),
      bindings: [
        { property: 'required', sources: [] },
        {
          property: 'token',
          sources: [
            {
              kind: 'option',
              name: 'token-value',
              short: 't',
              sensitive: true,
            },
          ],
        },
        {
          property: 'password',
          sources: [{ kind: 'environment', name: 'SERVICE_PASSWORD' }],
        },
      ],
      examples: [{ argv: ['binding', 'secrets', '--token-value', 'example'] }],
      lifecycle: 'finite' as const,
      effect: 'read' as const,
      async execute() {
        return { data: null };
      },
    });
    // The example intentionally relies on adapter-collected required input; the
    // registry validates its argv while deferring the adapter-owned field.
    const registry = createCommandRegistry([command]);
    const bound = bindArguments(command, {
      argv: ['-t', 'option-secret'],
      env: { SERVICE_PASSWORD: 'env-secret' },
      validate: false,
    });
    expect(bound.sensitiveValues).toEqual(['option-secret', 'env-secret']);
    expect(() =>
      bindArguments(command, { argv: ['--t', 'value'], validate: false })
    ).toThrow(expect.objectContaining({ code: 'CLI_OPTION_UNKNOWN' }));
    expect(() =>
      bindArguments(command, {
        argv: ['-token-value', 'value'],
        validate: false,
      })
    ).toThrow(expect.objectContaining({ code: 'CLI_OPTION_UNKNOWN' }));
    expect(() =>
      bindArguments(command, { argv: [], validate: true }, registry)
    ).toThrow(expect.objectContaining({ code: 'CLI_INPUT_INVALID' }));
  });

  it('quotes examples and emits parser-aware shell completions', () => {
    const command = defineCommand({
      id: 'quote.run',
      path: ['quote', 'run'],
      summary: 'Quote values.',
      input: Type.Object(
        {
          value: Type.String(),
          depth: Type.Optional(Type.Integer()),
          postgis: Type.Optional(Type.Boolean()),
        },
        { additionalProperties: false }
      ),
      output: Type.Null(),
      bindings: [
        { property: 'value', sources: [{ kind: 'positional', index: 0 }] },
        {
          property: 'depth',
          sources: [{ kind: 'option', name: 'depth', short: 'd' }],
          valueType: 'number',
        },
        {
          property: 'postgis',
          sources: [
            {
              kind: 'option',
              name: 'postgis',
              aliases: ['spatial'],
              deprecatedAliases: ['postGis'],
              negatable: true,
            },
          ],
          valueType: 'boolean',
        },
      ],
      examples: [{ argv: ['quote', 'run', '$(touch /tmp/runtime-owned)'] }],
      lifecycle: 'finite' as const,
      effect: 'read' as const,
      async execute() {
        return { data: null };
      },
    });
    const registry = createCommandRegistry([command]);
    expect(renderHelp(registry, command.path)).toContain(
      "'$(touch /tmp/runtime-owned)'"
    );
    for (const shell of ['bash', 'zsh'] as const) {
      const script = generateCompletion(registry, shell);
      const parsed = spawnSync('bash', ['-n'], {
        input: script,
        encoding: 'utf8',
      });
      expect(parsed.status).toBe(0);
    }

    const bash = generateCompletion(registry, 'bash');
    const complete = (words: string[]): string[] => {
      const quoted = words
        .map((word) => `'${word.replace(/'/g, `'"'"'`)}'`)
        .join(' ');
      const completed = spawnSync(
        'bash',
        [
          '-c',
          `${bash}\nCOMP_WORDS=(${quoted})\nCOMP_CWORD=$((${words.length} - 1))\n_cnc_completion\nprintf '%s\\n' "${'${COMPREPLY[@]}'}"`,
        ],
        { encoding: 'utf8' }
      );
      expect(completed.status).toBe(0);
      return completed.stdout
        .split('\n')
        .map((candidate) => candidate.trim())
        .filter(Boolean);
    };

    expect(complete(['cnc', ''])).toEqual(
      expect.arrayContaining(['quote', '--agent', '--format'])
    );
    expect(
      complete([
        'cnc',
        '--format',
        'json',
        'quote',
        'run',
        '--depth',
        '2',
        '--p',
      ])
    ).toEqual(expect.arrayContaining(['--postgis']));
    expect(complete(['cnc', 'quote', 'run', '--depth=2', '--no-s'])).toEqual(
      expect.arrayContaining(['--no-spatial'])
    );
    expect(complete(['cnc', 'quote', 'run', '-'])).toEqual(
      expect.arrayContaining(['-d'])
    );
    expect(complete(['cnc', 'quote', 'run', '--depth', ''])).toEqual([]);
    expect(complete(['cnc', '--format', ''])).toEqual([
      'human',
      'json',
      'jsonl',
    ]);
    expect(bash).not.toContain('--postGis');

    const fish = generateCompletion(registry, 'fish');
    expect(fish).toContain('-l agent');
    expect(fish).toContain('-l no-postgis');
    expect(fish).toContain('__cnc_at_path');
    expect(fish).toContain('-n __cnc_options_active -l agent');
    expect(fish).not.toContain('__fish_seen_subcommand_from');
    expect(fish).not.toContain('-l postGis');
  });

  it('bounds streaming memory and turns sink failures into deterministic internal outcomes', async () => {
    const command = defineCommand({
      id: 'stream.run',
      path: ['stream', 'run'],
      summary: 'Stream work.',
      input: Type.Object({}, { additionalProperties: false }),
      output: Type.Null(),
      events: Type.Object(
        { event: Type.Literal('stream.progress'), index: Type.Integer() },
        { additionalProperties: false }
      ),
      bindings: [],
      examples: [{ argv: ['stream', 'run'] }],
      lifecycle: 'long-running' as const,
      effect: 'service' as const,
      async execute(_input, context) {
        for (let index = 0; index < 100; index += 1) {
          await context.events.emit({ event: 'stream.progress', index });
        }
        return { data: null };
      },
    });
    const registry = createCommandRegistry([command]);
    let delivered = 0;
    const streamed = await executeCommand(
      registry,
      command,
      {},
      {
        cwd: '/workspace',
        mode: 'agent',
        captureEvents: false,
        sink: () => {
          delivered += 1;
        },
      }
    );
    expect(delivered).toBe(102);
    expect(streamed.protocolEvents).toEqual([]);
    expect(streamed.terminalEvent.event).toBe('operation.completed');
    expect(JSON.parse(renderExecution(streamed, 'json').stdout).event).toBe(
      'operation.completed'
    );
    expect(() => renderExecution(streamed, 'jsonl')).toThrow(
      /transcript capture/
    );

    let calls = 0;
    const failed = await executeCommand(
      registry,
      command,
      {},
      {
        cwd: '/workspace',
        mode: 'agent',
        sink: () => {
          calls += 1;
          if (calls === 2) throw new Error('writer closed');
        },
      }
    );
    expect(failed.status).toBe('failed');
    expect(failed.error?.code).toBe('CLI_PROTOCOL_SINK_FAILED');
    expect(
      failed.protocolEvents.filter(
        (event) =>
          event.event.startsWith('operation.') &&
          event.event !== 'operation.started'
      )
    ).toHaveLength(1);
  });

  it('preserves deprecation warnings on failures and redacts secrets inferred from env names', async () => {
    const command = defineCommand({
      id: 'warning.fail',
      path: ['warning', 'fail'],
      summary: 'Fail with a warning.',
      input: Type.Object({}, { additionalProperties: false }),
      output: Type.Null(),
      bindings: [],
      examples: [{ argv: ['warning', 'fail'] }],
      lifecycle: 'finite' as const,
      effect: 'read' as const,
      async execute(_input, context) {
        throw new CliError({
          code: 'EXPECTED_FAILURE',
          category: 'operation',
          message: `Rejected ${context.env.CNC_TOKEN}, ${context.env.PGPASSWORD}, ${context.env.PGPASSFILE}, and ${context.env.SUPABASE_SERVICE_ROLE_KEY} at ${context.env.DATABASE_URL}`,
        });
      },
    });
    const outcome = await executeCommand(
      createCommandRegistry([command]),
      command,
      {},
      {
        cwd: '/workspace',
        mode: 'agent',
        env: {
          CNC_TOKEN: 'automatic-secret',
          PGPASSWORD: 'delimiter-free-password',
          PGPASSFILE: '/private/credential-file',
          SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret',
          DATABASE_URL: 'postgres://user:database-secret@example.test/app',
        },
        initialWarnings: [{ code: 'CLI_DEPRECATED', message: 'Old spelling.' }],
      }
    );
    expect(outcome.warnings).toEqual([
      { code: 'CLI_DEPRECATED', message: 'Old spelling.' },
    ]);
    expect(outcome.terminalEvent).toEqual(
      expect.objectContaining({ warnings: outcome.warnings })
    );
    expect(outcome.error?.message).toBe(
      'Rejected [REDACTED], [REDACTED], [REDACTED], and [REDACTED] at [REDACTED]'
    );
    expect(JSON.stringify(outcome)).not.toContain('delimiter-free-password');
    expect(JSON.stringify(outcome)).not.toContain('/private/credential-file');
    expect(JSON.stringify(outcome)).not.toContain('service-role-secret');
    expect(renderExecution(outcome, 'human').stderr).toContain(
      'Warning [CLI_DEPRECATED]'
    );
  });

  it('recognizes cancellation errors created in another JavaScript realm', async () => {
    const outcome = await createFailureOutcome({
      commandId: 'adapter.cancelled',
      error: Object.create(
        { name: 'AbortError' },
        { message: { value: 'cross-realm cancellation', enumerable: false } }
      ),
    });

    expect(outcome.status).toBe('cancelled');
    expect(outcome.error?.code).toBe('OPERATION_CANCELLED');
    expect(outcome.terminalEvent.event).toBe('operation.cancelled');
  });

  it('keeps CI and non-TTY effects disabled when interactive prompts are explicitly enabled', () => {
    expect(
      resolveExecutionSettings({
        interactive: true,
        ci: true,
        stdinIsTTY: true,
        stdoutIsTTY: true,
      })
    ).toEqual(
      expect.objectContaining({
        interactive: true,
        terminalEffects: false,
        mayOpenBrowser: false,
        checkForUpdates: false,
      })
    );
    expect(
      resolveExecutionSettings({
        interactive: true,
        stdinIsTTY: true,
        stdoutIsTTY: false,
      })
    ).toEqual(
      expect.objectContaining({
        interactive: true,
        terminalEffects: false,
        mayOpenBrowser: false,
      })
    );
  });
});
