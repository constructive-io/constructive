import {
  bindArguments,
  CommandRegistry,
  ContractError,
  createCommandRegistry,
  defineCommand,
  InvocationError,
  Type,
} from '../src';

function createExampleCommand() {
  return defineCommand({
    id: 'example.run',
    path: ['example', 'run'],
    summary: 'Run the example.',
    input: Type.Object(
      {
        name: Type.String({ minLength: 1 }),
        count: Type.Optional(Type.Integer({ minimum: 1 })),
        force: Type.Optional(Type.Boolean()),
        tags: Type.Optional(Type.Array(Type.String())),
        token: Type.Optional(Type.String()),
      },
      { additionalProperties: false }
    ),
    output: Type.Object(
      { ok: Type.Boolean() },
      { additionalProperties: false }
    ),
    bindings: [
      {
        property: 'name',
        sources: [{ kind: 'positional', index: 0, name: 'name' }],
        description: 'Example name.',
      },
      {
        property: 'count',
        sources: [
          { kind: 'option', name: 'count', deprecatedAliases: ['Count'] },
        ],
        valueType: 'number' as const,
      },
      {
        property: 'force',
        sources: [
          { kind: 'option', name: 'force', short: 'f', negatable: true },
        ],
        valueType: 'boolean' as const,
      },
      {
        property: 'tags',
        sources: [{ kind: 'option', name: 'tag' }],
        repeated: true,
      },
      {
        property: 'token',
        sources: [
          { kind: 'option', name: 'token' },
          { kind: 'environment', name: 'CNC_TOKEN', sensitive: true },
        ],
        conflict: 'error' as const,
      },
    ],
    examples: [{ argv: ['example', 'run', 'demo'] }],
    lifecycle: 'finite' as const,
    effect: 'write' as const,
    async execute() {
      return { data: { ok: true } };
    },
  });
}

describe('command registry and argument bindings', () => {
  it('binds typed positional, option, repeated, negated, and environment sources', () => {
    const command = createExampleCommand();
    const registry = createCommandRegistry([command]);
    const bound = bindArguments(
      command,
      {
        argv: ['demo', '--count=2', '--force', '--tag', 'one', '--tag=two'],
        env: { CNC_TOKEN: 'very-secret-token' },
      },
      registry
    );

    expect(bound.input).toEqual({
      name: 'demo',
      count: 2,
      force: true,
      tags: ['one', 'two'],
      token: 'very-secret-token',
    });
    expect(bound.sensitiveValues).toEqual(['very-secret-token']);

    expect(
      bindArguments(command, { argv: ['demo', '--no-force'] }, registry).input
        .force
    ).toBe(false);
  });

  it('reports compatibility aliases without weakening strict parsing', () => {
    const command = createExampleCommand();
    const registry = createCommandRegistry([command]);
    const bound = bindArguments(
      command,
      { argv: ['demo', '--Count', '4'] },
      registry
    );
    expect(bound.input.count).toBe(4);
    expect(bound.warnings).toEqual([
      expect.objectContaining({
        code: 'CLI_DEPRECATED',
        message: expect.stringContaining('--count'),
      }),
    ]);
    expect(() =>
      bindArguments(command, { argv: ['demo', '--unknown'] }, registry)
    ).toThrow(InvocationError);
    expect(() =>
      bindArguments(command, { argv: ['demo', 'surplus'] }, registry)
    ).toThrow(expect.objectContaining({ code: 'CLI_ARGUMENT_SURPLUS' }));
  });

  it('rejects ambiguous and invalid values before execution', () => {
    const command = createExampleCommand();
    const registry = createCommandRegistry([command]);
    expect(() =>
      bindArguments(
        command,
        {
          argv: ['demo', '--token', 'flag-token'],
          env: { CNC_TOKEN: 'env-token' },
        },
        registry
      )
    ).toThrow(expect.objectContaining({ code: 'CLI_INPUT_SOURCE_CONFLICT' }));
    expect(() =>
      bindArguments(command, { argv: ['demo', '--count', 'NaN'] }, registry)
    ).toThrow(expect.objectContaining({ code: 'CLI_OPTION_VALUE_INVALID' }));
    expect(() => bindArguments(command, { argv: [] }, registry)).toThrow(
      expect.objectContaining({ code: 'CLI_INPUT_INVALID' })
    );
  });

  it('provides deterministic discovery and longest-path resolution', () => {
    const command = createExampleCommand();
    const registry = createCommandRegistry([command]);
    const resolved = registry.resolve(['example', 'run', 'demo']);
    expect(resolved).toEqual({
      command: registry.requireById(command.id),
      consumed: 2,
    });
    expect(resolved?.command).not.toBe(command);
    expect(Object.isFrozen(resolved?.command)).toBe(true);
    expect(registry.catalog()).toEqual([
      expect.objectContaining({
        id: 'example.run',
        path: ['example', 'run'],
        effect: 'write',
      }),
    ]);
    const schema = registry.schema('example.run');
    expect(schema.protocolVersion).toBe('constructive.dev/cli/v1');
    expect(schema.input).not.toBe(command.input);
    expect(schema.bindings).not.toBe(command.bindings);
  });

  it('fails registry construction for duplicate or malformed contracts', () => {
    const command = createExampleCommand();
    expect(() => new CommandRegistry([command, command])).toThrow(
      expect.objectContaining({ code: 'CLI_COMMAND_ID_DUPLICATE' })
    );

    const malformed = { ...command, id: 'Bad ID' };
    expect(() => createCommandRegistry([malformed])).toThrow(ContractError);

    const badEvents = {
      ...command,
      id: 'example.bad',
      path: ['example', 'bad'],
      events: Type.String(),
    };
    expect(() => createCommandRegistry([badEvents])).toThrow(
      expect.objectContaining({ code: 'CLI_EVENT_SCHEMA_INVALID' })
    );
  });

  it('enforces metadata and shell-bound requirements at registration', () => {
    const command = createExampleCommand();
    const malformedBinding = {
      ...command,
      bindings: [
        {
          ...command.bindings[0],
          description: 42,
        },
        ...command.bindings.slice(1),
      ],
    } as unknown as typeof command;
    expect(() => createCommandRegistry([malformedBinding])).toThrow(
      expect.objectContaining({ code: 'CLI_BINDING_SCHEMA_INVALID' })
    );

    const missingRequiredShellInput = defineCommand({
      id: 'adapter.run',
      path: ['adapter', 'run'],
      summary: 'Run with adapter input.',
      input: Type.Object(
        {
          name: Type.String({ minLength: 1 }),
          adapterValue: Type.Optional(Type.String()),
        },
        { additionalProperties: false }
      ),
      output: Type.Null(),
      bindings: [
        {
          property: 'name',
          sources: [{ kind: 'option', name: 'name' }],
        },
        { property: 'adapterValue', sources: [] },
      ],
      examples: [{ argv: ['adapter', 'run'] }],
      lifecycle: 'finite',
      effect: 'read',
      async execute() {
        return { data: null };
      },
    });
    expect(() => createCommandRegistry([missingRequiredShellInput])).toThrow(
      expect.objectContaining({ code: 'CLI_COMMAND_EXAMPLE_INVALID' })
    );
  });
});
