import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { type Readable,Writable } from 'node:stream';

import {
  assertFormatAllowed,
  bindArguments,
  CliError,
  type CommandDefinition,
  createFailureOutcome,
  createJsonlSink,
  type ExecutionOutcome,
  type ExecutionSettings,
  exitCodeForOutcome,
  InvocationError,
  type OperationWarning,
  type OutputFormat,
  parseGlobalArguments,
  type ProtocolEvent,
  renderExecution,
  resolveExecutionSettings,
  sensitiveEnvironmentValues,
} from '@constructive-io/cli-runtime';
import { checkForUpdates } from '@inquirerer/utils';
import { Inquirerer } from 'inquirerer';
import { stripColor } from 'yanse';

import { withOperationOutputSuppressed } from './console-isolation';

export interface CliReadable extends Readable {
  isTTY?: boolean;
}

export interface CliWritable extends Writable {
  isTTY?: boolean;
}

class PlainTextWritable extends Writable implements CliWritable {
  readonly isTTY?: boolean;

  constructor(private readonly destination: CliWritable) {
    super();
    this.isTTY = destination.isTTY;
  }

  override _write(
    chunk: Buffer | string,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    const value = Buffer.isBuffer(chunk)
      ? chunk.toString('utf8')
      : String(chunk);
    this.destination.write(stripColor(value), callback);
  }
}

export interface RunCliOptions {
  cwd: string;
  env: Readonly<Record<string, string | undefined>>;
  stdin: CliReadable;
  stdout: CliWritable;
  stderr: CliWritable;
  signal?: AbortSignal;
  version: string;
  now?: () => Date;
}

const withoutTerminalStyling = (options: RunCliOptions): RunCliOptions => ({
  ...options,
  stdout: new PlainTextWritable(options.stdout),
  stderr: new PlainTextWritable(options.stderr),
});

const ciEnabled = (value: string | undefined): boolean =>
  value !== undefined &&
  !['', '0', 'false', 'no'].includes(value.toLowerCase());

const write = async (stream: CliWritable, content: string): Promise<void> => {
  if (!content) return;
  await new Promise<void>((resolveWrite, rejectWrite) => {
    stream.write(content, (error) =>
      error ? rejectWrite(error) : resolveWrite()
    );
  });
};

const inferFailureFormat = (argv: readonly string[]): OutputFormat => {
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--format') {
      const candidate = argv[index + 1];
      if (candidate === 'json' || candidate === 'jsonl') return candidate;
    }
    if (token === '--format=json') return 'json';
    if (token === '--format=jsonl') return 'jsonl';
  }
  if (argv.includes('--agent')) return 'jsonl';
  return 'human';
};

const isolated = async <T>(
  settings: ExecutionSettings,
  callback: () => Promise<T>
): Promise<T> => {
  if (settings.format === 'human') return callback();
  return withOperationOutputSuppressed(callback);
};

const readToken = async (
  stdin: CliReadable,
  signal: AbortSignal
): Promise<string> => {
  const chunks: Buffer[] = [];
  let length = 0;
  const iterator = stdin[Symbol.asyncIterator]();
  try {
    while (true) {
      if (signal.aborted) {
        throw (
          signal.reason ??
          new DOMException('The operation was cancelled.', 'AbortError')
        );
      }
      const item = await new Promise<IteratorResult<unknown>>(
        (resolveItem, rejectItem) => {
          const onAbort = () => {
            cleanup();
            rejectItem(
              signal.reason ??
                new DOMException('The operation was cancelled.', 'AbortError')
            );
          };
          const cleanup = () => signal.removeEventListener('abort', onAbort);
          signal.addEventListener('abort', onAbort, { once: true });
          if (signal.aborted) {
            onAbort();
            return;
          }
          void iterator.next().then(
            (value) => {
              cleanup();
              resolveItem(value);
            },
            (error) => {
              cleanup();
              rejectItem(error);
            }
          );
        }
      );
      if (item.done) break;
      const chunk = item.value;
      const buffer = Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(String(chunk));
      length += buffer.length;
      if (length > 1024 * 1024) {
        throw new InvocationError(
          'AUTH_TOKEN_TOO_LARGE',
          'The token supplied on stdin exceeds 1 MiB.'
        );
      }
      chunks.push(buffer);
    }
  } catch (error) {
    await iterator.return?.();
    throw error;
  }
  const token = Buffer.concat(chunks)
    .toString('utf8')
    .replace(/\r?\n$/, '');
  if (!token.trim()) {
    throw new InvocationError(
      'AUTH_TOKEN_REQUIRED',
      '--token-stdin did not receive a token.'
    );
  }
  return token;
};

const requiredProperties = (command: CommandDefinition): string[] => {
  const schema = command.input as { required?: unknown };
  return Array.isArray(schema.required)
    ? schema.required.filter((item): item is string => typeof item === 'string')
    : [];
};

const collectRequiredInput = async (
  command: CommandDefinition,
  input: Record<string, unknown>,
  prompter: Inquirerer
): Promise<Record<string, unknown>> => {
  const missing = requiredProperties(command).filter(
    (property) => input[property] === undefined
  );
  if (missing.length === 0) return input;
  const properties =
    (
      command.input as {
        properties?: Record<string, { type?: string }>;
      }
    ).properties ?? {};
  const questions = missing.map((property) => {
    const binding = command.bindings.find(
      (candidate) => candidate.property === property
    );
    const type = properties[property]?.type;
    return {
      name: property,
      type:
        type === 'boolean'
          ? ('confirm' as const)
          : type === 'number' || type === 'integer'
            ? ('number' as const)
            : ('text' as const),
      message: binding?.description ?? property,
      required: true,
      ...(type === 'array'
        ? {
          sanitize: (value: string) =>
            value
              .split(/\s+/)
              .map((part) => part.trim())
              .filter(Boolean),
        }
        : {}),
    };
  });
  return prompter.prompt(input, questions as never);
};

const chooseCommand = async (
  paths: string[],
  prompter: Inquirerer
): Promise<string[]> => {
  const selected = await prompter.prompt<Record<string, unknown>>({}, [
    {
      type: 'autocomplete',
      name: 'command',
      message: 'What do you want to do?',
      options: paths,
    },
  ]);
  return String(selected.command).split(' ');
};

const confirmCommand = async (
  command: CommandDefinition,
  prompter: Inquirerer
): Promise<boolean> => {
  const answer = await prompter.prompt<Record<string, unknown>>({}, [
    {
      type: 'confirm',
      name: 'confirmed',
      message: `Run ${command.path.join(' ')}?`,
      default: false,
    },
  ]);
  if (answer.confirmed !== true) {
    throw new DOMException(
      'The operation was cancelled by the user.',
      'AbortError'
    );
  }
  return true;
};

const renderOutcome = async (
  outcome: ExecutionOutcome,
  format: OutputFormat,
  stdout: CliWritable,
  stderr: CliWritable,
  humanRenderer?: (result: NonNullable<ExecutionOutcome['result']>) => string
): Promise<void> => {
  const rendered = renderExecution(outcome, format, humanRenderer);
  await write(stdout, rendered.stdout);
  await write(stderr, rendered.stderr);
};

export const renderHumanLifecycleEvent = (
  event: ProtocolEvent
): string | undefined => {
  if (!event.event.startsWith('service.')) return undefined;
  const fields = event as Record<string, unknown>;
  const service =
    typeof fields.service === 'string' && fields.service.length > 0
      ? fields.service
      : 'service';
  switch (event.event) {
  case 'service.starting':
    return `${service}: starting`;
  case 'service.ready': {
    const location =
        typeof fields.url === 'string'
          ? ` at ${fields.url}`
          : typeof fields.port === 'number'
            ? ` on port ${fields.port}`
            : '';
    return `${service}: ready${location}`;
  }
  case 'service.stopping':
    return `${service}: stopping`;
  case 'service.stopped':
    return `${service}: stopped`;
  default:
    return undefined;
  }
};

const failure = async (
  error: unknown,
  format: OutputFormat,
  options: RunCliOptions,
  commandId = 'cli.invocation',
  debug = false,
  warnings?: OperationWarning[]
): Promise<number> => {
  const sink =
    format === 'jsonl'
      ? createJsonlSink((line) => write(options.stdout, line))
      : undefined;
  const outcome = await createFailureOutcome({
    commandId,
    error,
    now: options.now,
    sink,
    debug,
    warnings,
    redaction: { sensitiveValues: sensitiveEnvironmentValues(options.env) },
  });
  if (format !== 'jsonl') {
    await renderOutcome(outcome, format, options.stdout, options.stderr);
  }
  return exitCodeForOutcome(outcome);
};

export async function runCli(
  rawArgv: readonly string[],
  options: RunCliOptions
): Promise<number> {
  let globals: ReturnType<typeof parseGlobalArguments>;
  let settings: ExecutionSettings;
  try {
    globals = parseGlobalArguments(rawArgv);
    settings = resolveExecutionSettings({
      agent: globals.options.agent,
      interactive: globals.options.interactive,
      nonInteractive: globals.options.nonInteractive,
      format: globals.options.format,
      noColor: globals.options.noColor,
      stdinIsTTY: options.stdin.isTTY === true,
      stdoutIsTTY: options.stdout.isTTY === true,
      ci: ciEnabled(options.env.CI),
    });
  } catch (error) {
    const failureOptions =
      options.stdout.isTTY === true &&
      !ciEnabled(options.env.CI) &&
      !rawArgv.includes('--no-color') &&
      !rawArgv.includes('--noColor')
        ? options
        : withoutTerminalStyling(options);
    return failure(
      error,
      inferFailureFormat(rawArgv),
      failureOptions,
      'cli.invocation',
      rawArgv.includes('--debug')
    );
  }

  const adapterOptions = settings.terminalEffects
    ? options
    : withoutTerminalStyling(options);

  const signal = options.signal ?? new AbortController().signal;
  const operationCwd = resolve(options.cwd, globals.options.cwd ?? '.');
  try {
    const cwdStat = await stat(operationCwd);
    if (!cwdStat.isDirectory()) {
      throw new InvocationError(
        'CLI_CWD_INVALID',
        '--cwd must resolve to a directory.'
      );
    }
  } catch (error) {
    const known =
      error instanceof CliError
        ? error
        : new InvocationError(
          'CLI_CWD_NOT_FOUND',
          `Working directory not found: ${operationCwd}`
        );
    return failure(
      known,
      settings.format,
      adapterOptions,
      'cli.invocation',
      globals.options.debug,
      globals.warnings
    );
  }

  return isolated(settings, async () => {
    const adapterWarnings = [...globals.warnings];
    let registryBundle: Awaited<
      ReturnType<(typeof import('./runtime/registry'))['createCncRegistry']>
    >;
    try {
      const { createCncRegistry } = await import('./runtime/registry');
      const { createConfigStoreForEnvironment } = await import('./config');
      registryBundle = createCncRegistry({
        version: options.version,
        store: createConfigStoreForEnvironment(options.env),
      });
    } catch (error) {
      return failure(
        error,
        settings.format,
        adapterOptions,
        'cli.startup',
        globals.options.debug,
        adapterWarnings
      );
    }

    const { registry } = registryBundle;
    const prompter = new Inquirerer({
      input: adapterOptions.stdin,
      output: adapterOptions.stderr,
      noTty: !settings.interactive,
    });

    try {
      let argv = globals.argv;
      if (globals.options.version) {
        if (argv.length > 0) {
          const resolved = registry.resolve(argv);
          if (!resolved) {
            throw new InvocationError(
              'CLI_COMMAND_NOT_FOUND',
              'Unknown command. Use "cnc commands --format json" to discover commands.'
            );
          }
          bindArguments(
            resolved.command,
            {
              argv: argv.slice(resolved.consumed),
              env: options.env,
              strict: true,
              warnings: adapterWarnings,
              validate: false,
            },
            registry
          );
        }
        argv = ['version'];
      }
      if (globals.options.help) {
        const resolved = registry.resolve(argv);
        if (resolved) {
          bindArguments(
            resolved.command,
            {
              argv: argv.slice(resolved.consumed),
              env: options.env,
              strict: true,
              warnings: adapterWarnings,
              validate: false,
            },
            registry
          );
          argv = ['help', ...resolved.command.path];
        } else {
          const path = argv.filter((token) => !token.startsWith('-'));
          const unknownOption = argv.find((token) => token.startsWith('-'));
          if (registry.list(path).length > 0 && unknownOption !== undefined) {
            throw new InvocationError(
              'CLI_OPTION_UNKNOWN',
              `Unknown option "${unknownOption.split('=', 1)[0]}".`
            );
          }
          argv = ['help', ...path];
        }
      }
      if (argv.length === 0) {
        if (!settings.interactive) {
          throw new InvocationError(
            'CLI_COMMAND_REQUIRED',
            'A command is required. Use "cnc commands --format json" to discover commands.'
          );
        }
        argv = await chooseCommand(
          registry.list().map((command) => command.path.join(' ')),
          prompter
        );
      }

      let resolvedCommand = registry.resolve(argv);
      if (
        !resolvedCommand &&
        settings.interactive &&
        argv.length > 0 &&
        argv.every((token) => !token.startsWith('-'))
      ) {
        const descendants = registry.list(argv);
        if (descendants.length > 0) {
          argv = await chooseCommand(
            descendants.map((command) => command.path.join(' ')),
            prompter
          );
          resolvedCommand = registry.resolve(argv);
        }
      }
      if (!resolvedCommand) {
        throw new InvocationError(
          'CLI_COMMAND_NOT_FOUND',
          'Unknown command. Use "cnc commands --format json" to discover commands.'
        );
      }
      const command = resolvedCommand.command;
      assertFormatAllowed(command, settings.format);
      const bound = bindArguments(
        command,
        {
          argv: argv.slice(resolvedCommand.consumed),
          env: options.env,
          strict: true,
          warnings: adapterWarnings,
          validate: !settings.interactive,
        },
        registry
      );
      let input = bound.input as Record<string, unknown>;
      const sensitiveValues = [...bound.sensitiveValues];
      const terminalInput = await registryBundle.prepareTerminalInput({
        commandId: command.id,
        input,
        readSecretFromStdin: () => readToken(adapterOptions.stdin, signal),
      });
      input = terminalInput.input;
      sensitiveValues.push(...terminalInput.sensitiveValues);

      const hooks = registryBundle.createHooks(prompter);
      if (settings.interactive) {
        const collected = hooks[command.id]?.collectInteractiveInput;
        if (collected) {
          input = (await collected(input, {
            cwd: operationCwd,
            env: options.env,
            signal,
            operationId: 'interactive-input',
          })) as Record<string, unknown>;
        }
        input = await collectRequiredInput(command, input, prompter);
      }

      let yes = globals.options.yes;
      if (command.effect === 'destructive' && !yes && settings.interactive) {
        yes = await confirmCommand(command, prompter);
      }
      const dryRun = input.dryRun === true ? true : undefined;
      const sink =
        settings.format === 'jsonl'
          ? createJsonlSink((line) => write(adapterOptions.stdout, line))
          : settings.format === 'human' && command.lifecycle === 'long-running'
            ? async (event: ProtocolEvent): Promise<void> => {
              const message = renderHumanLifecycleEvent(event);
              if (message !== undefined) {
                await write(adapterOptions.stderr, `${message}\n`);
              }
            }
            : undefined;
      const { executeCommand } = await import('@constructive-io/cli-runtime');
      const outcome = await executeCommand(registry, command, input, {
        cwd: operationCwd,
        mode: settings.mode,
        env: options.env,
        signal,
        now: options.now,
        capabilities: {
          yes,
          ...(dryRun === undefined ? {} : { dryRun }),
        },
        sink,
        redaction: { sensitiveValues },
        initialWarnings: bound.warnings,
        debug: globals.options.debug,
        captureEvents:
          command.lifecycle !== 'long-running' || settings.format !== 'jsonl',
      });

      if (settings.format !== 'jsonl') {
        const renderHuman = hooks[command.id]?.renderHuman;
        await renderOutcome(
          outcome,
          settings.format,
          adapterOptions.stdout,
          adapterOptions.stderr,
          renderHuman
        );
      }
      if (settings.checkForUpdates) {
        try {
          const update = await checkForUpdates({
            pkgName: '@constructive-io/cli',
            pkgVersion: options.version,
            toolName: 'constructive',
          });
          if (update.hasUpdate && update.message) {
            await write(
              adapterOptions.stderr,
              `${update.message}\nRun npm i -g @constructive-io/cli@latest to upgrade.\n`
            );
          }
        } catch {
          // Update checks never affect command completion.
        }
      }
      return exitCodeForOutcome(outcome);
    } catch (error) {
      return failure(
        error,
        settings.format,
        adapterOptions,
        'cli.invocation',
        globals.options.debug,
        adapterWarnings
      );
    } finally {
      prompter.close();
    }
  });
}
