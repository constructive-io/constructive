import { Static, Type } from '@sinclair/typebox';

import {
  jsonSnapshot,
  snapshotCapabilities,
  snapshotCommand,
  validateCommandDefinition,
  validateCommandExamples,
} from './command-validation';
import {
  CommandDefinition,
  CommandEffectSchema,
  CommandExampleSchema,
  CommandLifecycleSchema,
  createJsonValueSchema,
  InputBindingSchema,
  OperationResult,
  OperationResultSchema,
  operationResultSchema,
  OperationWarning,
  PROTOCOL_VERSION,
  SafetyCapabilitiesSchema,
} from './contracts';
import { ContractError, InvocationError } from './errors';
import {
  assertJsonValue,
  cloneSchema,
  compileSchema,
  SchemaIssue,
  SchemaValidator,
} from './schema';

interface CompiledCommand {
  input: SchemaValidator;
  output: SchemaValidator;
  result: SchemaValidator;
  event?: SchemaValidator;
}

export const CommandCatalogEntrySchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    path: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
    summary: Type.String({ minLength: 1 }),
    lifecycle: CommandLifecycleSchema,
    effect: CommandEffectSchema,
    capabilities: SafetyCapabilitiesSchema,
  },
  { additionalProperties: false }
);

export type CommandCatalogEntry = Static<typeof CommandCatalogEntrySchema>;

/** Runtime schema for the registry's exported, versioned command contract. */
export const CommandSchemaDocumentSchema = Type.Object(
  {
    protocolVersion: Type.Literal(PROTOCOL_VERSION),
    id: Type.String({ minLength: 1 }),
    path: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
    summary: Type.String({ minLength: 1 }),
    description: Type.Optional(Type.String()),
    lifecycle: CommandLifecycleSchema,
    effect: CommandEffectSchema,
    capabilities: SafetyCapabilitiesSchema,
    input: Type.Record(
      Type.String(),
      createJsonValueSchema(
        'https://constructive.dev/cli/v1/schemas/command-schema/input-json-value'
      )
    ),
    output: Type.Record(
      Type.String(),
      createJsonValueSchema(
        'https://constructive.dev/cli/v1/schemas/command-schema/output-json-value'
      )
    ),
    events: Type.Optional(
      Type.Record(
        Type.String(),
        createJsonValueSchema(
          'https://constructive.dev/cli/v1/schemas/command-schema/events-json-value'
        )
      )
    ),
    bindings: Type.Array(InputBindingSchema),
    examples: Type.Array(CommandExampleSchema),
  },
  { additionalProperties: false }
);

export type CommandSchemaDocument = Static<typeof CommandSchemaDocumentSchema>;

const commandSchemaDocumentValidator = compileSchema<CommandSchemaDocument>(
  CommandSchemaDocumentSchema
);
export class CommandRegistry {
  private readonly byId = new Map<string, CommandDefinition>();
  private readonly byPath = new Map<string, CommandDefinition>();
  private readonly compiled = new Map<string, CompiledCommand>();

  constructor(commands: readonly CommandDefinition[]) {
    for (const sourceCommand of commands) {
      const command = snapshotCommand(sourceCommand);
      validateCommandDefinition(command);
      const pathKey = command.path.join(' ');
      if (this.byId.has(command.id)) {
        throw new ContractError(
          'CLI_COMMAND_ID_DUPLICATE',
          `Duplicate command id "${command.id}".`
        );
      }
      if (this.byPath.has(pathKey)) {
        throw new ContractError(
          'CLI_COMMAND_PATH_DUPLICATE',
          `Duplicate command path "${pathKey}".`
        );
      }

      this.byId.set(command.id, command);
      this.byPath.set(pathKey, command);
      this.compiled.set(command.id, {
        input: compileSchema(command.input),
        output: compileSchema(command.output),
        result: compileSchema(operationResultSchema(command.output)),
        ...(command.events === undefined
          ? {}
          : { event: compileSchema(command.events) }),
      });
    }
    for (const command of this.byId.values())
      validateCommandExamples(command);
  }

  list(prefix: readonly string[] = []): CommandDefinition[] {
    return [...this.byId.values()]
      .filter((command) =>
        prefix.every((part, index) => command.path[index] === part)
      )
      .sort((left, right) =>
        left.path.join(' ').localeCompare(right.path.join(' '))
      );
  }

  getById(id: string): CommandDefinition | undefined {
    return this.byId.get(id);
  }

  requireById(id: string): CommandDefinition {
    const command = this.getById(id);
    if (command === undefined) {
      throw new InvocationError(
        'CLI_COMMAND_NOT_FOUND',
        'No command is registered for the requested id.'
      );
    }
    return command;
  }

  getByPath(path: readonly string[]): CommandDefinition | undefined {
    return this.byPath.get(path.join(' '));
  }

  requireByPath(path: readonly string[]): CommandDefinition {
    const command = this.getByPath(path);
    if (command === undefined) {
      throw new InvocationError(
        'CLI_COMMAND_NOT_FOUND',
        'No command is registered for the requested path.'
      );
    }
    return command;
  }

  /** Resolves the longest command path at the beginning of argv. */
  resolve(
    argv: readonly string[]
  ): { command: CommandDefinition; consumed: number } | undefined {
    for (let length = argv.length; length > 0; length -= 1) {
      const command = this.getByPath(argv.slice(0, length));
      if (command !== undefined) return { command, consumed: length };
    }
    return undefined;
  }

  validateInput(commandId: string, value: unknown): SchemaIssue[] {
    const validator = this.requireCompiled(commandId).input;
    return validator.validate(value) ? [] : validator.issues();
  }

  validateOutput(commandId: string, value: unknown): SchemaIssue[] {
    const validator = this.requireCompiled(commandId).output;
    return validator.validate(value) ? [] : validator.issues();
  }

  validateResult(commandId: string, value: unknown): SchemaIssue[] {
    const validator = this.requireCompiled(commandId).result;
    return validator.validate(value) ? [] : validator.issues();
  }

  validateEvent(commandId: string, value: unknown): SchemaIssue[] {
    const validator = this.requireCompiled(commandId).event;
    if (validator === undefined) {
      return [
        {
          path: '/',
          keyword: 'events',
          message: 'command does not declare events',
          params: {},
        },
      ];
    }
    return validator.validate(value) ? [] : validator.issues();
  }

  catalog(prefix: readonly string[] = []): CommandCatalogEntry[] {
    return this.list(prefix).map((command) => ({
      id: command.id,
      path: [...command.path],
      summary: command.summary,
      lifecycle: command.lifecycle,
      effect: command.effect,
      capabilities: snapshotCapabilities(command.capabilities),
    }));
  }

  schema(commandId: string): CommandSchemaDocument {
    const command = this.requireById(commandId);
    const document: unknown = jsonSnapshot(
      {
        protocolVersion: 'constructive.dev/cli/v1',
        id: command.id,
        path: [...command.path],
        summary: command.summary,
        ...(command.description === undefined
          ? {}
          : { description: command.description }),
        lifecycle: command.lifecycle,
        effect: command.effect,
        capabilities: snapshotCapabilities(command.capabilities),
        input: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          ...cloneSchema(command.input),
        },
        output: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          ...cloneSchema(command.output),
        },
        ...(command.events === undefined
          ? {}
          : {
            events: {
              $schema: 'https://json-schema.org/draft/2020-12/schema',
              ...cloneSchema(command.events),
            },
          }),
        bindings: command.bindings,
        examples: command.examples.map((example) => ({
          ...(example.description === undefined
            ? {}
            : { description: example.description }),
          argv: [...example.argv],
        })),
      },
      `Schema document for "${command.id}"`
    );
    if (!commandSchemaDocumentValidator.validate(document)) {
      throw new ContractError(
        'CLI_COMMAND_SCHEMA_DOCUMENT_INVALID',
        'The exported command schema is invalid.',
        {
          commandId: command.id,
          issues: commandSchemaDocumentValidator.issues(),
        }
      );
    }
    return document;
  }

  private requireCompiled(commandId: string): CompiledCommand {
    const compiled = this.compiled.get(commandId);
    if (compiled === undefined)
      throw new ContractError(
        'CLI_COMMAND_NOT_REGISTERED',
        `Command "${commandId}" is not registered.`
      );
    return compiled;
  }
}

export function createCommandRegistry(
  commands: readonly CommandDefinition[]
): CommandRegistry {
  return new CommandRegistry(commands);
}

export function assertOperationResultMetadata(
  result: OperationResult<unknown>
): OperationWarning[] {
  assertJsonValue(result);
  const validator = compileSchema<OperationResult<unknown>>(
    OperationResultSchema
  );
  if (!validator.validate(result)) {
    throw new ContractError(
      'CLI_RESULT_INVALID',
      'Command returned invalid result metadata.',
      {
        issues: validator.issues(),
      }
    );
  }
  return [...(result.warnings ?? [])];
}
