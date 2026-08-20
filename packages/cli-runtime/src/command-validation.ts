import { Static, TSchema } from '@sinclair/typebox';

import { bindArguments } from './bindings';
import {
  CommandDefinition,
  CommandExampleSchema,
  InputBinding,
  InputBindingSchema,
  OptionBindingSource,
  SafetyCapabilities,
  SafetyCapabilitiesSchema,
} from './contracts';
import { ContractError, InvocationError } from './errors';
import { assertJsonValue, cloneSchema, compileSchema } from './schema';
import {
  GLOBAL_LONG_OPTION_NAMES,
  GLOBAL_SHORT_OPTION_NAMES,
  parseGlobalArguments,
} from './settings';

const inputBindingMetadataValidator = compileSchema(InputBindingSchema);
const commandExampleMetadataValidator = compileSchema(CommandExampleSchema);
const safetyCapabilitiesMetadataValidator = compileSchema(
  SafetyCapabilitiesSchema
);

function validateMetadata(command: CommandDefinition): void {
  for (const [index, binding] of command.bindings.entries()) {
    if (!inputBindingMetadataValidator.validate(binding)) {
      throw new ContractError(
        'CLI_BINDING_SCHEMA_INVALID',
        `Binding ${index + 1} in "${command.id}" violates the command metadata schema.`,
        { issues: inputBindingMetadataValidator.issues() }
      );
    }
  }
  for (const [index, example] of command.examples.entries()) {
    if (!commandExampleMetadataValidator.validate(example)) {
      throw new ContractError(
        'CLI_COMMAND_EXAMPLE_INVALID',
        `Example ${index + 1} for "${command.id}" violates the command metadata schema.`,
        { issues: commandExampleMetadataValidator.issues() }
      );
    }
  }
  if (
    command.capabilities !== undefined &&
    !safetyCapabilitiesMetadataValidator.validate(command.capabilities)
  ) {
    throw new ContractError(
      'CLI_COMMAND_CAPABILITY_INVALID',
      `Capabilities for "${command.id}" violate the command metadata schema.`,
      { issues: safetyCapabilitiesMetadataValidator.issues() }
    );
  }
}

export function snapshotCapabilities(
  capabilities: SafetyCapabilities | undefined
): Static<typeof SafetyCapabilitiesSchema> {
  if (capabilities === undefined) return {};
  return {
    ...(capabilities.dryRun === undefined
      ? {}
      : { dryRun: capabilities.dryRun }),
    ...(capabilities.idempotencyKey === undefined
      ? {}
      : { idempotencyKey: capabilities.idempotencyKey }),
    ...(capabilities.confirmation === undefined
      ? {}
      : { confirmation: capabilities.confirmation }),
    ...(capabilities.destructiveAcknowledgements === undefined
      ? {}
      : {
        destructiveAcknowledgements: [
          ...capabilities.destructiveAcknowledgements,
        ],
      }),
  };
}

function validateIdentifier(command: CommandDefinition): void {
  if (
    typeof command.id !== 'string' ||
    !/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/.test(command.id)
  ) {
    throw new ContractError(
      'CLI_COMMAND_ID_INVALID',
      `Invalid command id "${command.id}".`
    );
  }
  if (
    !Array.isArray(command.path) ||
    command.path.length === 0 ||
    command.path.some(
      (part) =>
        typeof part !== 'string' ||
        !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(part)
    )
  ) {
    throw new ContractError(
      'CLI_COMMAND_PATH_INVALID',
      `Invalid command path for "${command.id}".`,
      {
        path: command.path,
      }
    );
  }
  if (
    typeof command.summary !== 'string' ||
    command.summary.trim().length === 0
  ) {
    throw new ContractError(
      'CLI_COMMAND_SUMMARY_REQUIRED',
      `Command "${command.id}" needs a summary.`
    );
  }
  if (
    command.description !== undefined &&
    typeof command.description !== 'string'
  ) {
    throw new ContractError(
      'CLI_COMMAND_DESCRIPTION_INVALID',
      `Description for "${command.id}" must be a string.`
    );
  }
  if (!['finite', 'long-running'].includes(command.lifecycle)) {
    throw new ContractError(
      'CLI_COMMAND_LIFECYCLE_INVALID',
      `Lifecycle for "${command.id}" is invalid.`
    );
  }
  if (!['read', 'write', 'destructive', 'service'].includes(command.effect)) {
    throw new ContractError(
      'CLI_COMMAND_EFFECT_INVALID',
      `Effect for "${command.id}" is invalid.`
    );
  }
  if (!Array.isArray(command.bindings) || !Array.isArray(command.examples)) {
    throw new ContractError(
      'CLI_COMMAND_CONTRACT_INVALID',
      `Bindings and examples for "${command.id}" must be arrays.`
    );
  }
  if (command.capabilities !== undefined) {
    const capabilities = command.capabilities;
    for (const key of ['dryRun', 'idempotencyKey', 'confirmation'] as const) {
      if (
        capabilities[key] !== undefined &&
        typeof capabilities[key] !== 'boolean'
      ) {
        throw new ContractError(
          'CLI_COMMAND_CAPABILITY_INVALID',
          `Capability "${key}" in "${command.id}" is invalid.`
        );
      }
    }
    if (
      capabilities.destructiveAcknowledgements !== undefined &&
      (!Array.isArray(capabilities.destructiveAcknowledgements) ||
        capabilities.destructiveAcknowledgements.some(
          (risk) => typeof risk !== 'string' || risk.length === 0
        ) ||
        new Set(capabilities.destructiveAcknowledgements).size !==
          capabilities.destructiveAcknowledgements.length)
    ) {
      throw new ContractError(
        'CLI_COMMAND_CAPABILITY_INVALID',
        `Destructive acknowledgements in "${command.id}" must be unique non-empty strings.`
      );
    }
  }
  if (
    command.effect === 'destructive' &&
    command.capabilities?.confirmation !== true
  ) {
    throw new ContractError(
      'CLI_DESTRUCTIVE_CONFIRMATION_REQUIRED',
      `Destructive command "${command.id}" must declare confirmation support.`
    );
  }
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  // Functions are retained as operation entry points but are not part of the
  // serializable contract snapshot; freezing them would mutate caller-owned state.
  if (typeof value !== 'object' || value === null) return value;
  const object = value as object;
  if (seen.has(object)) return value;
  seen.add(object);
  for (const key of Reflect.ownKeys(object)) {
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    if (descriptor !== undefined && 'value' in descriptor)
      deepFreeze(descriptor.value, seen);
  }
  return Object.freeze(value);
}

export function jsonSnapshot<T>(value: T, label: string): T {
  try {
    assertJsonValue(value);
    return JSON.parse(JSON.stringify(value)) as T;
  } catch (error) {
    if (error instanceof ContractError) {
      throw new ContractError(
        'CLI_COMMAND_CONTRACT_INVALID',
        `${label} must be a JSON value.`,
        {
          cause: error.message,
        }
      );
    }
    throw error;
  }
}

export function snapshotCommand(command: CommandDefinition): CommandDefinition {
  if (typeof command.execute !== 'function') {
    throw new ContractError(
      'CLI_COMMAND_EXECUTE_REQUIRED',
      `Command "${command.id}" needs an execute function.`
    );
  }
  const snapshot: CommandDefinition = {
    id: command.id,
    path: jsonSnapshot([...command.path], `Path for "${command.id}"`),
    summary: command.summary,
    ...(command.description === undefined
      ? {}
      : { description: command.description }),
    input: cloneSchema(command.input),
    output: cloneSchema(command.output),
    ...(command.events === undefined
      ? {}
      : { events: cloneSchema(command.events) }),
    bindings: jsonSnapshot(command.bindings, `Bindings for "${command.id}"`),
    examples: jsonSnapshot(command.examples, `Examples for "${command.id}"`),
    lifecycle: command.lifecycle,
    effect: command.effect,
    ...(command.capabilities === undefined
      ? {}
      : {
        capabilities: jsonSnapshot(
          command.capabilities,
          `Capabilities for "${command.id}"`
        ),
      }),
    execute: command.execute,
  };
  return deepFreeze(snapshot);
}

function validateEventSchema(command: CommandDefinition): void {
  if (command.events === undefined) return;
  const hasEventProperty = (
    schema: TSchema & {
      type?: unknown;
      properties?: Record<string, TSchema>;
      anyOf?: TSchema[];
      oneOf?: TSchema[];
    }
  ): boolean => {
    if (schema.type === 'object' && schema.properties?.event !== undefined)
      return true;
    const branches = schema.anyOf ?? schema.oneOf;
    return (
      branches !== undefined &&
      branches.length > 0 &&
      branches.every((branch) => hasEventProperty(branch))
    );
  };
  if (!hasEventProperty(command.events)) {
    throw new ContractError(
      'CLI_EVENT_SCHEMA_INVALID',
      `Event schema for "${command.id}" must describe an object with an event property.`
    );
  }
}

function validateBindings(command: CommandDefinition): void {
  const input = command.input as TSchema & {
    type?: unknown;
    properties?: Record<string, TSchema>;
  };
  if (input.type !== 'object' || input.properties === undefined) {
    throw new ContractError(
      'CLI_INPUT_SCHEMA_INVALID',
      `Input schema for "${command.id}" must be an object.`
    );
  }

  const properties = new Set<string>();
  const longOptionNames = new Map<string, string>();
  const shortOptionNames = new Map<string, string>();
  const positionalIndexes = new Map<number, string>();
  let variadicIndex: number | undefined;
  let variadicCount = 0;

  const registerLongOption = (
    name: string,
    binding: InputBinding,
    source: OptionBindingSource
  ): void => {
    const owner = longOptionNames.get(name);
    if (owner !== undefined) {
      throw new ContractError(
        'CLI_OPTION_DUPLICATE',
        `Option "${name}" is bound to both "${owner}" and "${binding.property}" in "${command.id}".`
      );
    }
    if (GLOBAL_LONG_OPTION_NAMES.includes(name)) {
      throw new ContractError(
        'CLI_OPTION_GLOBAL_COLLISION',
        `Option "${name}" in "${command.id}" collides with a global option.`
      );
    }
    longOptionNames.set(name, binding.property);

    if (source.negatable) {
      const negated = `no-${name}`;
      const negatedOwner = longOptionNames.get(negated);
      if (negatedOwner !== undefined) {
        throw new ContractError(
          'CLI_OPTION_DUPLICATE',
          `Generated negated option "${negated}" collides with "${negatedOwner}" in "${command.id}".`
        );
      }
      if (GLOBAL_LONG_OPTION_NAMES.includes(negated)) {
        throw new ContractError(
          'CLI_OPTION_GLOBAL_COLLISION',
          `Generated negated option "${negated}" in "${command.id}" collides with a global option.`
        );
      }
      longOptionNames.set(negated, binding.property);
    }
  };

  for (const binding of command.bindings) {
    if (
      binding === null ||
      typeof binding !== 'object' ||
      typeof binding.property !== 'string'
    ) {
      throw new ContractError(
        'CLI_BINDING_INVALID',
        `Command "${command.id}" contains an invalid binding.`
      );
    }
    if (!Array.isArray(binding.sources)) {
      throw new ContractError(
        'CLI_BINDING_SOURCES_INVALID',
        `Binding "${binding.property}" in "${command.id}" must declare a sources array.`
      );
    }
    if (
      binding.valueType !== undefined &&
      !['string', 'number', 'boolean', 'json'].includes(binding.valueType)
    ) {
      throw new ContractError(
        'CLI_BINDING_VALUE_TYPE_INVALID',
        `Binding "${binding.property}" in "${command.id}" has an invalid value type.`
      );
    }
    if (
      binding.repeated !== undefined &&
      typeof binding.repeated !== 'boolean'
    ) {
      throw new ContractError(
        'CLI_BINDING_INVALID',
        `Binding "${binding.property}" has an invalid repeated value.`
      );
    }
    if (
      binding.conflict !== undefined &&
      !['first', 'error'].includes(binding.conflict)
    ) {
      throw new ContractError(
        'CLI_BINDING_INVALID',
        `Binding "${binding.property}" has an invalid conflict policy.`
      );
    }
    if (['__proto__', 'prototype', 'constructor'].includes(binding.property)) {
      throw new ContractError(
        'CLI_BINDING_PROPERTY_UNSAFE',
        `Binding property "${binding.property}" is not allowed in "${command.id}".`
      );
    }
    if (
      !Object.prototype.hasOwnProperty.call(input.properties, binding.property)
    ) {
      throw new ContractError(
        'CLI_BINDING_PROPERTY_UNKNOWN',
        `Binding references unknown input property "${binding.property}" in "${command.id}".`
      );
    }
    if (properties.has(binding.property)) {
      throw new ContractError(
        'CLI_BINDING_PROPERTY_DUPLICATE',
        `Input property "${binding.property}" has multiple bindings in "${command.id}".`
      );
    }
    properties.add(binding.property);

    for (const source of binding.sources) {
      if (
        source === null ||
        typeof source !== 'object' ||
        !['option', 'positional', 'environment', 'constant'].includes(
          source.kind
        )
      ) {
        throw new ContractError(
          'CLI_BINDING_SOURCE_INVALID',
          `Binding "${binding.property}" in "${command.id}" contains an invalid source.`
        );
      }
      if (source.kind === 'option') {
        if (
          typeof source.name !== 'string' ||
          !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(source.name)
        ) {
          throw new ContractError(
            'CLI_OPTION_NAME_INVALID',
            `Canonical option "${source.name}" in "${command.id}" must be kebab-case without dashes.`
          );
        }
        if (source.negatable && binding.valueType !== 'boolean') {
          throw new ContractError(
            'CLI_OPTION_NEGATABLE_INVALID',
            `Negatable option "${source.name}" in "${command.id}" must bind a boolean value.`
          );
        }
        if (
          (source.aliases !== undefined && !Array.isArray(source.aliases)) ||
          (source.deprecatedAliases !== undefined &&
            !Array.isArray(source.deprecatedAliases)) ||
          (source.negatable !== undefined &&
            typeof source.negatable !== 'boolean') ||
          (source.sensitive !== undefined &&
            typeof source.sensitive !== 'boolean')
        ) {
          throw new ContractError(
            'CLI_OPTION_SOURCE_INVALID',
            `Option source "${source.name}" in "${command.id}" is invalid.`
          );
        }
        const aliases = [
          ...(source.aliases ?? []),
          ...(source.deprecatedAliases ?? []),
        ];
        for (const alias of aliases) {
          if (
            typeof alias !== 'string' ||
            !/^[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*$/.test(alias)
          ) {
            throw new ContractError(
              'CLI_OPTION_ALIAS_INVALID',
              `Alias "${alias}" for "${source.name}" in "${command.id}" is invalid.`
            );
          }
        }
        registerLongOption(source.name, binding, source);
        for (const alias of aliases) registerLongOption(alias, binding, source);

        if (source.short !== undefined) {
          if (!/^[A-Za-z0-9]$/.test(source.short)) {
            throw new ContractError(
              'CLI_OPTION_SHORT_INVALID',
              `Short option "${source.short}" in "${command.id}" must be one alphanumeric character.`
            );
          }
          const owner = shortOptionNames.get(source.short);
          if (owner !== undefined) {
            throw new ContractError(
              'CLI_OPTION_DUPLICATE',
              `Short option "${source.short}" is bound to both "${owner}" and "${binding.property}" in "${command.id}".`
            );
          }
          if (GLOBAL_SHORT_OPTION_NAMES.includes(source.short)) {
            throw new ContractError(
              'CLI_OPTION_GLOBAL_COLLISION',
              `Short option "${source.short}" in "${command.id}" collides with a global option.`
            );
          }
          shortOptionNames.set(source.short, binding.property);
        }
      }
      if (source.kind === 'positional') {
        if (!Number.isInteger(source.index) || source.index < 0) {
          throw new ContractError(
            'CLI_POSITIONAL_INDEX_INVALID',
            `Position ${source.index} for "${binding.property}" in "${command.id}" is invalid.`
          );
        }
        if (
          (source.name !== undefined && typeof source.name !== 'string') ||
          (source.variadic !== undefined &&
            typeof source.variadic !== 'boolean')
        ) {
          throw new ContractError(
            'CLI_POSITIONAL_SOURCE_INVALID',
            `Position ${source.index} for "${binding.property}" in "${command.id}" is invalid.`
          );
        }
        const owner = positionalIndexes.get(source.index);
        if (owner !== undefined) {
          throw new ContractError(
            'CLI_POSITIONAL_DUPLICATE',
            `Position ${source.index} is bound to both "${owner}" and "${binding.property}" in "${command.id}".`
          );
        }
        positionalIndexes.set(source.index, binding.property);
        if (source.variadic) {
          variadicCount += 1;
          variadicIndex = source.index;
          if (binding.repeated !== true) {
            throw new ContractError(
              'CLI_VARIADIC_BINDING_INVALID',
              `Variadic positional "${binding.property}" in "${command.id}" must be repeated.`
            );
          }
        }
      }
      if (source.kind === 'environment') {
        if (
          typeof source.name !== 'string' ||
          !/^[A-Za-z_][A-Za-z0-9_]*$/.test(source.name)
        ) {
          throw new ContractError(
            'CLI_ENVIRONMENT_NAME_INVALID',
            `Environment binding "${source.name}" in "${command.id}" is invalid.`
          );
        }
        if (
          source.sensitive !== undefined &&
          typeof source.sensitive !== 'boolean'
        ) {
          throw new ContractError(
            'CLI_ENVIRONMENT_SOURCE_INVALID',
            `Environment binding "${source.name}" in "${command.id}" has invalid sensitivity metadata.`
          );
        }
      }
      if (source.kind === 'constant') {
        jsonSnapshot(
          source.value,
          `Constant binding for "${binding.property}" in "${command.id}"`
        );
      }
    }

    const propertySchema = input.properties[binding.property] as TSchema & {
      type?: unknown;
    };
    if (binding.repeated === true && propertySchema.type !== 'array') {
      throw new ContractError(
        'CLI_REPEATED_BINDING_INVALID',
        `Repeated binding "${binding.property}" in "${command.id}" must target an array property.`
      );
    }
  }

  if (variadicCount > 1) {
    throw new ContractError(
      'CLI_POSITIONAL_VARIADIC_DUPLICATE',
      `Command "${command.id}" has multiple variadic positionals.`
    );
  }
  if (variadicIndex !== undefined) {
    for (const index of positionalIndexes.keys()) {
      if (index > variadicIndex) {
        throw new ContractError(
          'CLI_POSITIONAL_AFTER_VARIADIC',
          `Command "${command.id}" declares a positional after its variadic positional.`
        );
      }
    }
  }

  const sortedIndexes = [...positionalIndexes.keys()].sort(
    (left, right) => left - right
  );
  for (let expected = 0; expected < sortedIndexes.length; expected += 1) {
    if (sortedIndexes[expected] !== expected) {
      throw new ContractError(
        'CLI_POSITIONAL_GAP',
        `Command "${command.id}" must use contiguous positional indexes beginning at zero.`
      );
    }
  }

  for (const property of Object.keys(input.properties)) {
    if (!properties.has(property)) {
      throw new ContractError(
        'CLI_BINDING_PROPERTY_MISSING',
        `Input property "${property}" does not have a binding in "${command.id}".`
      );
    }
  }
}

function validateExamples(command: CommandDefinition): void {
  const sourceLessProperties = new Set(
    command.bindings
      .filter((binding) => binding.sources.length === 0)
      .map((binding) => binding.property)
  );
  const exampleInputSchema = cloneSchema(command.input) as TSchema & {
    required?: unknown;
  };
  if (Array.isArray(exampleInputSchema.required)) {
    exampleInputSchema.required = exampleInputSchema.required.filter(
      (property): property is string =>
        typeof property === 'string' && !sourceLessProperties.has(property)
    );
  }
  const exampleInputValidator = compileSchema(exampleInputSchema);

  for (const [index, example] of command.examples.entries()) {
    if (
      example === null ||
      typeof example !== 'object' ||
      !Array.isArray(example.argv) ||
      example.argv.some((value) => typeof value !== 'string') ||
      (example.description !== undefined &&
        typeof example.description !== 'string')
    ) {
      throw new ContractError(
        'CLI_COMMAND_EXAMPLE_INVALID',
        `Example ${index + 1} for "${command.id}" has invalid argv.`
      );
    }
    const commandPath = example.argv.slice(0, command.path.length);
    if (
      commandPath.length !== command.path.length ||
      commandPath.some((part, partIndex) => part !== command.path[partIndex])
    ) {
      throw new ContractError(
        'CLI_COMMAND_EXAMPLE_INVALID',
        `Example ${index + 1} for "${command.id}" must begin with "${command.path.join(' ')}".`
      );
    }
    try {
      // Parse the full invocation so command-local options occur after the
      // command path. Parsing only the suffix makes the global parser mistake a
      // valid command option for an unknown leading global option.
      const parsed = parseGlobalArguments(example.argv);
      const parsedCommandPath = parsed.argv.slice(0, command.path.length);
      if (
        parsedCommandPath.length !== command.path.length ||
        parsedCommandPath.some(
          (part, partIndex) => part !== command.path[partIndex]
        )
      ) {
        throw new InvocationError(
          'CLI_COMMAND_EXAMPLE_PATH_INVALID',
          `The example does not resolve to "${command.path.join(' ')}" after global options are parsed.`
        );
      }
      const bound = bindArguments(command, {
        argv: parsed.argv.slice(command.path.length),
        env: {},
        strict: true,
        validate: false,
      });
      if (!exampleInputValidator.validate(bound.input)) {
        throw new InvocationError(
          'CLI_INPUT_INVALID',
          'The example does not satisfy the command input schema.',
          { details: { issues: exampleInputValidator.issues() } }
        );
      }
    } catch (error) {
      throw new ContractError(
        'CLI_COMMAND_EXAMPLE_INVALID',
        `Example ${index + 1} for "${command.id}" does not satisfy its command contract.`,
        { cause: error instanceof Error ? error.message : String(error) }
      );
    }
  }
}


export function validateCommandDefinition(command: CommandDefinition): void {
  validateIdentifier(command);
  validateMetadata(command);
  validateBindings(command);
  validateEventSchema(command);
}

export function validateCommandExamples(command: CommandDefinition): void {
  validateExamples(command);
}
