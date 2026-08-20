import { Static, Type } from '@sinclair/typebox';

import {
  CommandDefinition,
  InputBinding,
  OptionBindingSource,
} from './contracts';
import {
  CommandCatalogEntrySchema,
  CommandRegistry,
  CommandSchemaDocumentSchema,
} from './registry';

export const GlobalOptionHelpSchema = Type.Object(
  {
    name: Type.String({ minLength: 1 }),
    description: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false }
);

/** Runtime schema for structured help generated from a command registry. */
export const HelpDocumentSchema = Type.Object(
  {
    tool: Type.String({ minLength: 1 }),
    usage: Type.String({ minLength: 1 }),
    command: Type.Optional(CommandSchemaDocumentSchema),
    commands: Type.Array(CommandCatalogEntrySchema),
    globalOptions: Type.Array(GlobalOptionHelpSchema),
  },
  { additionalProperties: false }
);

export type HelpDocument = Static<typeof HelpDocumentSchema>;

interface GlobalOptionDefinition {
  long: string;
  short?: string;
  valueName?: string;
  values?: readonly string[];
  description: string;
}

const GLOBAL_OPTION_DEFINITIONS: readonly GlobalOptionDefinition[] = [
  {
    long: 'agent',
    description: 'Use the strict noninteractive JSONL agent protocol.',
  },
  { long: 'interactive', description: 'Allow prompts when stdin is a TTY.' },
  { long: 'non-interactive', description: 'Disable all prompts.' },
  {
    long: 'format',
    valueName: 'human|json|jsonl',
    values: ['human', 'json', 'jsonl'],
    description: 'Select the output protocol.',
  },
  {
    long: 'cwd',
    valueName: 'path',
    description: 'Resolve the command from this working directory.',
  },
  {
    long: 'yes',
    description: 'Approve a command which declares confirmation support.',
  },
  { long: 'no-color', description: 'Disable ANSI terminal styling.' },
  { long: 'debug', description: 'Include redacted internal diagnostics.' },
  { long: 'help', short: 'h', description: 'Show help.' },
  { long: 'version', short: 'v', description: 'Show the CLI version.' },
];

const GLOBAL_OPTIONS = GLOBAL_OPTION_DEFINITIONS.map(
  ({ long, valueName, description }) => ({
    name: `--${long}${valueName === undefined ? '' : ` <${valueName}>`}`,
    description,
  })
);

function optionLabel(
  binding: InputBinding,
  source: OptionBindingSource
): string {
  const names = [`--${source.name}`];
  if (source.short !== undefined) names.unshift(`-${source.short}`);
  if ((binding.valueType ?? 'string') !== 'boolean')
    names.push(`<${binding.valueName ?? binding.property}>`);
  return names.join(', ');
}

function commandUsage(command: CommandDefinition, toolName: string): string {
  const positionals = command.bindings
    .flatMap((binding) =>
      binding.sources
        .filter((source) => source.kind === 'positional')
        .map(
          (source) =>
            `<${source.name ?? binding.property}${source.variadic ? '...' : ''}>`
        )
    )
    .join(' ');
  const hasOptions = command.bindings.some((binding) =>
    binding.sources.some((source) => source.kind === 'option')
  );
  return [toolName, ...command.path, positionals, hasOptions ? '[options]' : '']
    .filter(Boolean)
    .join(' ');
}

/** Quotes a single argv token for POSIX-compatible help and generated scripts. */
export function quoteShellArgument(value: string): string {
  if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(value) && value.length > 0) return value;
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

export function getHelpDocument(
  registry: CommandRegistry,
  path: readonly string[] = [],
  toolName = 'cnc'
): HelpDocument {
  const command = registry.getByPath(path);
  return {
    tool: toolName,
    usage:
      command === undefined
        ? `${toolName} <command> [options]`
        : commandUsage(command, toolName),
    ...(command === undefined ? {} : { command: registry.schema(command.id) }),
    commands: command === undefined ? registry.catalog(path) : [],
    globalOptions: GLOBAL_OPTIONS.map((option) => ({ ...option })),
  };
}

export function renderHelp(
  registry: CommandRegistry,
  path: readonly string[] = [],
  toolName = 'cnc'
): string {
  const document = getHelpDocument(registry, path, toolName);
  const command = path.length === 0 ? undefined : registry.getByPath(path);
  const lines = [`Usage: ${document.usage}`, ''];

  if (command !== undefined) {
    lines.push(command.summary);
    if (command.description !== undefined) lines.push('', command.description);

    const positionals = command.bindings.flatMap((binding) =>
      binding.sources
        .filter((source) => source.kind === 'positional')
        .map((source) => ({
          label: source.name ?? binding.property,
          description: binding.description ?? '',
        }))
    );
    if (positionals.length > 0) {
      lines.push('', 'Arguments:');
      for (const positional of positionals)
        lines.push(
          `  ${positional.label.padEnd(24)} ${positional.description}`.trimEnd()
        );
    }

    const options = command.bindings.flatMap((binding) =>
      binding.sources
        .filter(
          (source): source is OptionBindingSource => source.kind === 'option'
        )
        .map((source) => ({
          label: optionLabel(binding, source),
          description: binding.description ?? '',
        }))
    );
    if (options.length > 0) {
      lines.push('', 'Command options:');
      for (const option of options)
        lines.push(
          `  ${option.label.padEnd(24)} ${option.description}`.trimEnd()
        );
    }

    if (command.examples.length > 0) {
      lines.push('', 'Examples:');
      for (const example of command.examples) {
        if (example.description !== undefined)
          lines.push(`  # ${example.description}`);
        lines.push(
          `  ${[toolName, ...example.argv].map(quoteShellArgument).join(' ')}`
        );
      }
    }
  } else if (document.commands.length > 0) {
    lines.push('Commands:');
    for (const entry of document.commands) {
      lines.push(
        `  ${entry.path.join(' ').padEnd(28)} ${entry.summary}`.trimEnd()
      );
    }
  } else {
    lines.push(`No commands found below "${path.join(' ')}".`);
  }

  lines.push('', 'Global options:');
  for (const option of document.globalOptions)
    lines.push(`  ${option.name.padEnd(32)} ${option.description}`.trimEnd());
  return `${lines.join('\n').trimEnd()}\n`;
}

export type CompletionShell = 'bash' | 'zsh' | 'fish';

function validateToolName(toolName: string): void {
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(toolName))
    throw new Error(`Invalid completion tool name "${toolName}".`);
}

interface CompletionOption {
  token: string;
  requiresValue: boolean;
  values?: readonly string[];
}

const globalCompletionOptions = (): CompletionOption[] =>
  GLOBAL_OPTION_DEFINITIONS.flatMap((definition) => [
    {
      token: `--${definition.long}`,
      requiresValue: definition.valueName !== undefined,
      ...(definition.values === undefined ? {} : { values: definition.values }),
    },
    ...(definition.short === undefined
      ? []
      : [{ token: `-${definition.short}`, requiresValue: false }]),
  ]);

/**
 * Return only supported, non-deprecated command spellings. Compatibility
 * aliases still parse, but advertising deprecated spellings would keep them
 * alive indefinitely in generated shell configuration.
 */
function commandCompletionOptions(
  command: CommandDefinition
): CompletionOption[] {
  const options = new Map<string, CompletionOption>();
  for (const binding of command.bindings) {
    for (const source of binding.sources) {
      if (source.kind !== 'option') continue;
      const requiresValue = (binding.valueType ?? 'string') !== 'boolean';
      const longNames = [source.name, ...(source.aliases ?? [])];
      for (const name of longNames) {
        options.set(`--${name}`, { token: `--${name}`, requiresValue });
        if (source.negatable) {
          options.set(`--no-${name}`, {
            token: `--no-${name}`,
            requiresValue: false,
          });
        }
      }
      if (source.short !== undefined) {
        options.set(`-${source.short}`, {
          token: `-${source.short}`,
          requiresValue,
        });
      }
    }
  }
  return [...options.values()].sort((left, right) =>
    left.token.localeCompare(right.token)
  );
}

function commandChildren(
  registry: CommandRegistry,
  prefix: readonly string[]
): string[] {
  const candidates = new Set<string>();
  for (const command of registry.list(prefix)) {
    const next = command.path[prefix.length];
    if (next !== undefined) candidates.add(next);
  }
  return [...candidates].sort();
}

function completionPrefixes(registry: CommandRegistry): string[][] {
  const prefixes = new Map<string, string[]>();
  prefixes.set('', []);
  for (const command of registry.list()) {
    for (let length = 1; length <= command.path.length; length += 1) {
      const prefix = command.path.slice(0, length);
      prefixes.set(prefix.join(' '), prefix);
    }
  }
  return [...prefixes.values()];
}

function casePatterns(values: readonly string[]): string {
  return values
    .map((value) =>
      value.endsWith('=*')
        ? `${quoteShellArgument(value.slice(0, -1))}*`
        : quoteShellArgument(value)
    )
    .join('|');
}

function fishCasePatterns(values: readonly string[]): string {
  return values.map(quoteShellArgument).join(' ');
}

function bashCompletion(
  registry: CommandRegistry,
  shell: 'bash' | 'zsh',
  toolName: string
): string {
  const prefixes = completionPrefixes(registry);
  const prefixKeys = prefixes.map((prefix) => prefix.join(' ')).filter(Boolean);
  const globalOptions = globalCompletionOptions();
  const globalTokens = globalOptions.map(({ token }) => token);
  const globalValueOptions = globalOptions
    .filter(({ requiresValue }) => requiresValue)
    .map(({ token }) => token);
  const commandOptions = new Map(
    registry
      .list()
      .map(
        (command) =>
          [command.path.join(' '), commandCompletionOptions(command)] as const
      )
  );
  const localValueCases = [...commandOptions.entries()].flatMap(
    ([path, options]) =>
      options
        .filter(({ requiresValue }) => requiresValue)
        .map(({ token }) => `${path}|${token}`)
  );
  const childCases = prefixes
    .map((prefix) => {
      const candidates = commandChildren(registry, prefix);
      return `    ${quoteShellArgument(prefix.join(' '))}) children=${quoteShellArgument(candidates.join(' '))} ;;`;
    })
    .join('\n');
  const optionCases = [...commandOptions.entries()]
    .map(
      ([path, options]) =>
        `    ${quoteShellArgument(path)}) command_options=${quoteShellArgument(options.map(({ token }) => token).join(' '))} ;;`
    )
    .join('\n');
  const functionName = `_${toolName.replace(/-/g, '_')}_completion`;
  const globalFlagPatterns = globalOptions
    .filter(({ requiresValue }) => !requiresValue)
    .map(({ token }) => token);
  const globalInlinePatterns = globalValueOptions.map((token) => `${token}=*`);
  const validPrefixCase =
    prefixKeys.length === 0
      ? '      *) ;;'
      : `      ${casePatterns(prefixKeys)}) path="$candidate" ;;\n      *) ;;`;
  const localValueCase =
    localValueCases.length === 0
      ? '      *) ;;'
      : `      ${casePatterns(localValueCases)}) expect_value=1; value_option="$word"; continue ;;\n      *) ;;`;
  const globalFlagCase =
    [...globalFlagPatterns, ...globalInlinePatterns].length === 0
      ? ''
      : `      ${casePatterns([...globalFlagPatterns, ...globalInlinePatterns])}) continue ;;\n`;

  const body = `${functionName}() {
  local cur path word candidate children command_options candidates value_option
  local expect_value=0 options_ended=0 index
  cur="${'${COMP_WORDS[COMP_CWORD]}'}"
  path=""
  value_option=""

  for ((index=1; index<COMP_CWORD; index++)); do
    word="${'${COMP_WORDS[index]}'}"
    if (( expect_value )); then
      expect_value=0
      value_option=""
      continue
    fi
    if (( options_ended )); then
      continue
    fi
    if [[ "$word" == "--" ]]; then
      options_ended=1
      continue
    fi
    case "$word" in
      ${casePatterns(globalValueOptions)}) expect_value=1; value_option="$word"; continue ;;
${globalFlagCase}    esac
    case "$word" in
      --*=*) continue ;;
    esac
    case "$path|${'${word%%=*}'}" in
${localValueCase}    esac
    case "$word" in
      --*=*|--*|-*) continue ;;
    esac
    candidate="${'${path:+$path }'}$word"
    case "$candidate" in
${validPrefixCase}
    esac
  done

  if (( expect_value )); then
    if [[ "$value_option" == "--format" ]]; then
      COMPREPLY=($(compgen -W "human json jsonl" -- "$cur"))
    else
      COMPREPLY=()
    fi
    return
  fi
  if [[ "$cur" == --format=* ]]; then
    local format_value="${'${cur#--format=}'}"
    COMPREPLY=($(compgen -P "--format=" -W "human json jsonl" -- "$format_value"))
    return
  fi
  if (( options_ended )); then
    COMPREPLY=()
    return
  fi

  children=""
  command_options=""
  case "$path" in
${childCases}
    *) children="" ;;
  esac
  case "$path" in
${optionCases}
    *) command_options="" ;;
  esac
  if [[ -z "$cur" ]]; then
    candidates="$children $command_options ${globalTokens.join(' ')}"
  elif [[ "$cur" == -* ]]; then
    candidates="$command_options ${globalTokens.join(' ')}"
  else
    candidates="$children"
  fi
  COMPREPLY=($(compgen -W "$candidates" -- "$cur"))
}`;
  const registration = `complete -o default -F ${functionName} ${toolName}`;
  if (shell === 'zsh') {
    return `#compdef ${toolName}\nautoload -U +X bashcompinit && bashcompinit\n${body}\n${registration}\n`;
  }
  return `${body}\n${registration}\n`;
}

function fishCompletion(registry: CommandRegistry, toolName: string): string {
  const functionStem = toolName.replace(/-/g, '_');
  const pathFunction = `__${functionStem}_command_path`;
  const atPathFunction = `__${functionStem}_at_path`;
  const optionsActiveFunction = `__${functionStem}_options_active`;
  const prefixes = completionPrefixes(registry);
  const prefixKeys = prefixes.map((prefix) => prefix.join(' ')).filter(Boolean);
  const globalOptions = globalCompletionOptions();
  const globalValueOptions = globalOptions
    .filter(({ requiresValue }) => requiresValue)
    .map(({ token }) => token);
  const globalFlagPatterns = globalOptions
    .filter(({ requiresValue }) => !requiresValue)
    .map(({ token }) => token);
  const globalInlinePatterns = globalValueOptions.map((token) => `${token}=*`);
  const commandOptions = new Map(
    registry
      .list()
      .map(
        (command) =>
          [command.path.join(' '), commandCompletionOptions(command)] as const
      )
  );
  const localValueCases = [...commandOptions.entries()].flatMap(
    ([path, options]) =>
      options
        .filter(({ requiresValue }) => requiresValue)
        .map(({ token }) => `${path}|${token}`)
  );
  const validPrefixCase =
    prefixKeys.length === 0
      ? ''
      : `      case ${fishCasePatterns(prefixKeys)}\n        set path $path $word\n`;
  const localValueCase =
    localValueCases.length === 0
      ? ''
      : `      case ${fishCasePatterns(localValueCases)}\n        set expect_value 1\n        continue\n`;
  const globalFlagCase =
    [...globalFlagPatterns, ...globalInlinePatterns].length === 0
      ? ''
      : `      case ${fishCasePatterns([...globalFlagPatterns, ...globalInlinePatterns])}\n        continue\n`;
  const lines = [
    `function ${pathFunction}`,
    '  set -l words (commandline -opc)',
    '  set -e words[1]',
    '  set -l path',
    '  set -l expect_value 0',
    '  set -l options_ended 0',
    '  for word in $words',
    '    if test $expect_value -eq 1',
    '      set expect_value 0',
    '      continue',
    '    end',
    '    if test $options_ended -eq 1',
    '      continue',
    '    end',
    '    if test "$word" = --',
    '      set options_ended 1',
    '      continue',
    '    end',
    '    switch $word',
    `      case ${fishCasePatterns(globalValueOptions)}`,
    '        set expect_value 1',
    '        continue',
    globalFlagCase.trimEnd(),
    '    end',
    '    string match -q "*=*" -- $word; and continue',
    '    switch (string join " " $path)"|"(string replace -r "=.*$" "" -- $word)',
    localValueCase.trimEnd(),
    '    end',
    '    string match -qr "^-" -- $word; and continue',
    '    set -l candidate (string join " " $path $word)',
    '    switch $candidate',
    validPrefixCase.trimEnd(),
    '    end',
    '  end',
    '  if test $options_ended -eq 1',
    '    echo __options_ended__',
    '  else',
    '    string join " " $path',
    '  end',
    'end',
    '',
    `function ${atPathFunction} --argument-names expected`,
    `  test "(${pathFunction})" = "$expected"`,
    'end',
    '',
    `function ${optionsActiveFunction}`,
    `  test "(${pathFunction})" != __options_ended__`,
    'end',
    '',
    `complete -c ${quoteShellArgument(toolName)} -f`,
  ].filter((line, index, all) => line !== '' || all[index - 1] !== '');

  for (const definition of GLOBAL_OPTION_DEFINITIONS) {
    const parameters = [
      `complete -c ${quoteShellArgument(toolName)}`,
      `-n ${quoteShellArgument(optionsActiveFunction)}`,
      `-l ${quoteShellArgument(definition.long)}`,
      ...(definition.short === undefined
        ? []
        : [`-s ${quoteShellArgument(definition.short)}`]),
      ...(definition.valueName === undefined ? [] : ['-r']),
      ...(definition.values === undefined
        ? []
        : [`-a ${quoteShellArgument(definition.values.join(' '))}`]),
    ];
    lines.push(parameters.join(' '));
  }

  for (const prefix of prefixes) {
    const path = prefix.join(' ');
    const condition = `${atPathFunction} "${path}"`;
    for (const candidate of commandChildren(registry, prefix)) {
      lines.push(
        `complete -c ${quoteShellArgument(toolName)} -n ${quoteShellArgument(condition)} -a ${quoteShellArgument(candidate)}`
      );
    }
  }
  for (const [path, options] of commandOptions) {
    const condition = `${atPathFunction} "${path}"`;
    for (const option of options) {
      const spelling = option.token.startsWith('--')
        ? `-l ${quoteShellArgument(option.token.slice(2))}`
        : `-s ${quoteShellArgument(option.token.slice(1))}`;
      lines.push(
        [
          `complete -c ${quoteShellArgument(toolName)}`,
          `-n ${quoteShellArgument(condition)}`,
          spelling,
          ...(option.requiresValue ? ['-r'] : []),
        ].join(' ')
      );
    }
  }
  return `${lines.join('\n')}\n`;
}

export function generateCompletion(
  registry: CommandRegistry,
  shell: CompletionShell,
  toolName = 'cnc'
): string {
  validateToolName(toolName);
  return shell === 'fish'
    ? fishCompletion(registry, toolName)
    : bashCompletion(registry, shell, toolName);
}
