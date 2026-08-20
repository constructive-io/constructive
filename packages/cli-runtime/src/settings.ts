import { ExecutionSettings, OperationWarning, OutputFormat } from './contracts';
import { InvocationError } from './errors';

/** Reserved by the process adapter and unavailable to command-local bindings. */
export const GLOBAL_LONG_OPTION_NAMES: readonly string[] = Object.freeze([
  'agent',
  'interactive',
  'non-interactive',
  'nonInteractive',
  'format',
  'cwd',
  'yes',
  'no-color',
  'noColor',
  'debug',
  'help',
  'version',
]);

export const GLOBAL_SHORT_OPTION_NAMES: readonly string[] = Object.freeze([
  'h',
  'v',
]);

export interface ResolveExecutionSettingsOptions {
  agent?: boolean;
  interactive?: boolean;
  nonInteractive?: boolean;
  format?: OutputFormat;
  noColor?: boolean;
  stdinIsTTY: boolean;
  stdoutIsTTY: boolean;
  ci?: boolean;
}

export function resolveExecutionSettings(
  options: ResolveExecutionSettingsOptions
): ExecutionSettings {
  if (options.interactive && options.nonInteractive) {
    throw new InvocationError(
      'CLI_MODE_CONFLICT',
      '--interactive and --non-interactive cannot be used together.'
    );
  }
  if (options.interactive && !options.stdinIsTTY) {
    throw new InvocationError(
      'CLI_INTERACTIVE_REQUIRES_TTY',
      '--interactive requires a TTY on stdin.'
    );
  }
  if (
    options.interactive &&
    (options.agent === true ||
      options.format === 'json' ||
      options.format === 'jsonl')
  ) {
    throw new InvocationError(
      'CLI_MODE_CONFLICT',
      '--interactive cannot be combined with agent mode or a structured output format.'
    );
  }
  if (options.agent && options.format === 'human') {
    throw new InvocationError(
      'CLI_MODE_CONFLICT',
      '--agent cannot be combined with --format human.'
    );
  }

  const format = options.format ?? (options.agent ? 'jsonl' : 'human');
  const structured = format === 'json' || format === 'jsonl';
  const automaticallyNonInteractive =
    options.ci === true || !options.stdinIsTTY || !options.stdoutIsTTY;
  const interactive =
    options.interactive === true
      ? true
      : options.agent === true ||
          options.nonInteractive === true ||
          structured ||
          automaticallyNonInteractive
        ? false
        : true;
  const mode =
    options.agent === true ? 'agent' : options.ci === true ? 'ci' : 'human';
  const terminalEffects =
    interactive &&
    format === 'human' &&
    !automaticallyNonInteractive &&
    options.noColor !== true;

  return {
    mode,
    format,
    interactive,
    terminalEffects,
    mayOpenBrowser:
      interactive && format === 'human' && !automaticallyNonInteractive,
    checkForUpdates:
      interactive && format === 'human' && !automaticallyNonInteractive,
  };
}

export interface ParsedGlobalArguments {
  argv: string[];
  options: {
    agent: boolean;
    interactive: boolean;
    nonInteractive: boolean;
    format?: OutputFormat;
    cwd?: string;
    yes: boolean;
    noColor: boolean;
    debug: boolean;
    help: boolean;
    version: boolean;
  };
  warnings: OperationWarning[];
}

/** Extracts only universal flags and leaves command-owned flags untouched. */
export function parseGlobalArguments(
  argv: readonly string[]
): ParsedGlobalArguments {
  const remaining: string[] = [];
  const warnings: OperationWarning[] = [];
  let commandStarted = false;
  const options: ParsedGlobalArguments['options'] = {
    agent: false,
    interactive: false,
    nonInteractive: false,
    yes: false,
    noColor: false,
    debug: false,
    help: false,
    version: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--') {
      remaining.push(...argv.slice(index));
      break;
    }
    const [name, inline] = token.startsWith('--')
      ? token.slice(2).split(/=(.*)/s, 2)
      : [undefined, undefined];
    const requireFlag = (label: string): void => {
      if (inline !== undefined)
        throw new InvocationError(
          'CLI_OPTION_VALUE_INVALID',
          `${label} does not accept a value.`
        );
    };
    const takeValue = (label: string): string => {
      if (inline !== undefined) return inline;
      index += 1;
      const value = argv[index];
      if (value === undefined)
        throw new InvocationError(
          'CLI_OPTION_VALUE_MISSING',
          `${label} requires a value.`
        );
      return value;
    };

    switch (name) {
    case 'agent':
      requireFlag('--agent');
      options.agent = true;
      break;
    case 'interactive':
      requireFlag('--interactive');
      options.interactive = true;
      break;
    case 'non-interactive':
      requireFlag('--non-interactive');
      options.nonInteractive = true;
      break;
    case 'nonInteractive':
      requireFlag('--nonInteractive');
      options.nonInteractive = true;
      warnings.push({
        code: 'CLI_DEPRECATED',
        message:
            'Option "--nonInteractive" is deprecated; use "--non-interactive".',
      });
      break;
    case 'format': {
      const value = takeValue('--format');
      if (!['human', 'json', 'jsonl'].includes(value)) {
        throw new InvocationError(
          'CLI_OPTION_VALUE_INVALID',
          '--format must be human, json, or jsonl.'
        );
      }
      options.format = value as OutputFormat;
      break;
    }
    case 'cwd':
      options.cwd = takeValue('--cwd');
      break;
    case 'yes':
      requireFlag('--yes');
      options.yes = true;
      break;
    case 'no-color':
      requireFlag('--no-color');
      options.noColor = true;
      break;
    case 'noColor':
      requireFlag('--noColor');
      options.noColor = true;
      warnings.push({
        code: 'CLI_DEPRECATED',
        message: 'Option "--noColor" is deprecated; use "--no-color".',
      });
      break;
    case 'debug':
      requireFlag('--debug');
      options.debug = true;
      break;
    case 'help':
      requireFlag('--help');
      options.help = true;
      break;
    case 'version':
      requireFlag('--version');
      options.version = true;
      break;
    default:
      if (token === '-h') options.help = true;
      else if (token === '-v') options.version = true;
      else {
        if (!commandStarted && token.startsWith('-')) {
          throw new InvocationError(
            'CLI_OPTION_UNKNOWN',
            `Unknown global option "${token.split('=')[0]}".`
          );
        }
        remaining.push(token);
        if (!token.startsWith('-')) commandStarted = true;
      }
    }
  }

  return { argv: remaining, options, warnings };
}
