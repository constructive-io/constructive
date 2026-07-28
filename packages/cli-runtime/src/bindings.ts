import { Static, TSchema } from '@sinclair/typebox';

import {
  BindArgumentsOptions,
  BindingSource,
  BoundArguments,
  CommandDefinition,
  InputBinding,
  OperationWarning,
  OptionBindingSource,
} from './contracts';
import { InvocationError } from './errors';
import { isSensitiveKey } from './redaction';
import type { CommandRegistry } from './registry';
import { compileSchema, SchemaIssue } from './schema';

interface OptionLookup {
  binding: InputBinding;
  source: OptionBindingSource;
  deprecated: boolean;
}

interface SuppliedValue {
  source: BindingSource;
  sourceKey: string;
  values: unknown[];
}

function parseBoolean(value: string, label: string): boolean {
  if (['true', '1', 'yes'].includes(value.toLowerCase())) return true;
  if (['false', '0', 'no'].includes(value.toLowerCase())) return false;
  throw new InvocationError(
    'CLI_OPTION_VALUE_INVALID',
    `${label} expects a boolean value.`
  );
}

function parseValue(
  value: string,
  binding: InputBinding,
  label: string
): unknown {
  switch (binding.valueType ?? 'string') {
    case 'string':
      return value;
    case 'number': {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        throw new InvocationError(
          'CLI_OPTION_VALUE_INVALID',
          `${label} expects a finite number.`
        );
      }
      return parsed;
    }
    case 'boolean':
      return parseBoolean(value, label);
    case 'json':
      try {
        return JSON.parse(value) as unknown;
      } catch {
        throw new InvocationError(
          'CLI_OPTION_VALUE_INVALID',
          `${label} expects valid JSON.`
        );
      }
  }
}

function addOptionNames(
  lookup: Map<string, OptionLookup>,
  binding: InputBinding,
  source: OptionBindingSource
): void {
  lookup.set(source.name, { binding, source, deprecated: false });
  for (const alias of source.aliases ?? [])
    lookup.set(alias, { binding, source, deprecated: false });
  for (const alias of source.deprecatedAliases ?? [])
    lookup.set(alias, { binding, source, deprecated: true });
}

function validationMessage(
  command: CommandDefinition,
  issues: SchemaIssue[]
): InvocationError {
  const first = issues[0];
  return new InvocationError(
    'CLI_INPUT_INVALID',
    first === undefined
      ? `Input for "${command.path.join(' ')}" is invalid.`
      : `Input ${first.path} ${first.message}.`,
    { path: first?.path, details: { issues } }
  );
}

/** Strictly binds argv and an explicit environment snapshot into command input. */
export function bindArguments<
  TInput extends TSchema,
  TOutput extends TSchema,
  TEvent extends TSchema,
>(
  command: CommandDefinition<TInput, TOutput, TEvent>,
  options: BindArgumentsOptions,
  registry?: CommandRegistry
): BoundArguments<Static<TInput>> {
  const strict = options.strict ?? true;
  const env = options.env ?? {};
  const longOptionLookup = new Map<string, OptionLookup>();
  const shortOptionLookup = new Map<string, OptionLookup>();
  const positionals: string[] = [];
  const supplied = new Map<string, Map<string, SuppliedValue>>();
  const warnings: OperationWarning[] = options.warnings ?? [];
  const sensitiveValues: string[] = [];

  for (const binding of command.bindings) {
    for (const source of binding.sources) {
      if (source.kind === 'option') {
        addOptionNames(longOptionLookup, binding, source);
        if (source.short !== undefined) {
          shortOptionLookup.set(source.short, {
            binding,
            source,
            deprecated: false,
          });
        }
      }
    }
  }

  const addSupplied = (
    binding: InputBinding,
    source: BindingSource,
    sourceKey: string,
    value: unknown
  ): void => {
    let bySource = supplied.get(binding.property);
    if (bySource === undefined) {
      bySource = new Map();
      supplied.set(binding.property, bySource);
    }
    let entry = bySource.get(sourceKey);
    if (entry === undefined) {
      entry = { source, sourceKey, values: [] };
      bySource.set(sourceKey, entry);
    }
    entry.values.push(value);
  };

  let optionsEnded = false;
  for (let index = 0; index < options.argv.length; index += 1) {
    const token = options.argv[index];
    if (!optionsEnded && token === '--') {
      optionsEnded = true;
      continue;
    }
    if (optionsEnded || token === '-' || !token.startsWith('-')) {
      positionals.push(token);
      continue;
    }

    const isLong = token.startsWith('--');
    const withoutDashes = token.slice(isLong ? 2 : 1);
    const equalsIndex = withoutDashes.indexOf('=');
    let optionName =
      equalsIndex === -1 ? withoutDashes : withoutDashes.slice(0, equalsIndex);
    let inlineValue =
      equalsIndex === -1 ? undefined : withoutDashes.slice(equalsIndex + 1);
    let negated = false;
    let matched = (isLong ? longOptionLookup : shortOptionLookup).get(
      optionName
    );

    if (matched === undefined && isLong && optionName.startsWith('no-')) {
      const positiveName = optionName.slice(3);
      const candidate = longOptionLookup.get(positiveName);
      if (candidate?.source.negatable) {
        optionName = positiveName;
        matched = candidate;
        negated = true;
      }
    }

    if (matched === undefined) {
      if (strict) {
        const safeOption = token.split('=', 1)[0];
        throw new InvocationError(
          'CLI_OPTION_UNKNOWN',
          `Unknown option "${safeOption}".`,
          {
            details: { option: safeOption },
          }
        );
      }
      positionals.push(token);
      continue;
    }

    const label = `--${matched.source.name}`;
    let value: unknown;
    if ((matched.binding.valueType ?? 'string') === 'boolean') {
      if (negated) {
        if (inlineValue !== undefined) {
          throw new InvocationError(
            'CLI_OPTION_VALUE_INVALID',
            `Negated option "${token}" cannot have a value.`
          );
        }
        value = false;
      } else if (inlineValue !== undefined) {
        value = parseBoolean(inlineValue, label);
      } else {
        value = true;
      }
    } else {
      if (negated) {
        throw new InvocationError(
          'CLI_OPTION_VALUE_INVALID',
          `Option "${label}" cannot be negated.`
        );
      }
      if (inlineValue === undefined) {
        index += 1;
        inlineValue = options.argv[index];
      }
      if (inlineValue === undefined) {
        throw new InvocationError(
          'CLI_OPTION_VALUE_MISSING',
          `Option "${label}" requires a value.`
        );
      }
      value = parseValue(inlineValue, matched.binding, label);
    }

    addSupplied(
      matched.binding,
      matched.source,
      `option:${matched.source.name}`,
      value
    );
    if (matched.source.sensitive) {
      const secret = typeof value === 'string' ? value : inlineValue;
      if (secret !== undefined && secret.length > 0)
        sensitiveValues.push(secret);
    }
    if (matched.deprecated) {
      warnings.push({
        code: 'CLI_DEPRECATED',
        message: `Option "${token.split('=')[0]}" is deprecated; use "--${matched.source.name}".`,
      });
    }
  }

  for (const binding of command.bindings) {
    for (const source of binding.sources) {
      if (source.kind === 'positional') {
        const rawValues = source.variadic
          ? positionals.slice(source.index)
          : positionals.slice(source.index, source.index + 1);
        for (const rawValue of rawValues) {
          addSupplied(
            binding,
            source,
            `positional:${source.index}`,
            parseValue(rawValue, binding, source.name ?? binding.property)
          );
        }
      }
      if (source.kind === 'environment') {
        const rawValue = env[source.name];
        if (rawValue !== undefined) {
          addSupplied(
            binding,
            source,
            `environment:${source.name}`,
            parseValue(rawValue, binding, source.name)
          );
          if (source.sensitive || isSensitiveKey(source.name))
            sensitiveValues.push(rawValue);
        }
      }
      if (source.kind === 'constant')
        addSupplied(
          binding,
          source,
          `constant:${binding.property}`,
          source.value
        );
    }
  }

  const positionalSources = command.bindings.flatMap((binding) =>
    binding.sources.filter(
      (source): source is Extract<BindingSource, { kind: 'positional' }> =>
        source.kind === 'positional'
    )
  );
  const variadic = positionalSources.find((source) => source.variadic);
  const acceptedPositionals =
    variadic === undefined
      ? positionalSources.reduce(
          (maximum, source) => Math.max(maximum, source.index + 1),
          0
        )
      : Number.POSITIVE_INFINITY;
  if (strict && positionals.length > acceptedPositionals) {
    throw new InvocationError(
      'CLI_ARGUMENT_SURPLUS',
      'Unexpected positional arguments were provided.',
      {
        details: {
          firstUnexpectedIndex: acceptedPositionals,
          count: positionals.length - acceptedPositionals,
        },
      }
    );
  }

  const input: Record<string, unknown> = Object.create(null) as Record<
    string,
    unknown
  >;
  for (const binding of command.bindings) {
    const bySource = supplied.get(binding.property);
    if (bySource === undefined || bySource.size === 0) continue;
    const ordered = binding.sources
      .map((source) => {
        const key =
          source.kind === 'option'
            ? `option:${source.name}`
            : source.kind === 'positional'
              ? `positional:${source.index}`
              : source.kind === 'environment'
                ? `environment:${source.name}`
                : `constant:${binding.property}`;
        return bySource.get(key);
      })
      .filter((entry): entry is SuppliedValue => entry !== undefined);

    const explicitlySupplied = ordered.filter(
      (entry) => entry.source.kind !== 'constant'
    );
    if (binding.conflict === 'error' && explicitlySupplied.length > 1) {
      throw new InvocationError(
        'CLI_INPUT_SOURCE_CONFLICT',
        `Input "${binding.property}" was supplied by more than one source.`,
        {
          details: {
            sources: explicitlySupplied.map((entry) => entry.sourceKey),
          },
        }
      );
    }
    const selected = ordered[0];
    if (!binding.repeated && selected.values.length > 1) {
      throw new InvocationError(
        'CLI_OPTION_REPEATED',
        `Input "${binding.property}" may only be supplied once.`
      );
    }
    input[binding.property] = binding.repeated
      ? selected.values
      : selected.values[0];
  }

  if (options.validate !== false) {
    const issues =
      registry === undefined
        ? (() => {
            const validator = compileSchema<Static<TInput>>(command.input);
            return validator.validate(input) ? [] : validator.issues();
          })()
        : registry.validateInput(command.id, input);
    if (issues.length > 0) throw validationMessage(command, issues);
  }

  return {
    input: input as Static<TInput>,
    warnings,
    sensitiveValues: [...new Set(sensitiveValues)],
  };
}
