import * as path from 'node:path';

import { CLIOptions, Inquirerer, extractFirst } from 'inquirerer';
import chalk from 'yanse';

import {
  ensureConstructiveExtensionInstalled,
  isConstructivePackageInstalledForProject,
  resolveConstructiveEnvironment,
  resolveConstructivePiExtension,
  buildPiArgs,
  ensurePiRuntime,
  getPiRuntimeStatus,
  launchPi,
  resetPiRuntime,
  runCommand,
} from '../agent';

const usage = `
Constructive Agent Wrapper (PI coding agent):

  cnc agent [OPTIONS]
  cnc agent setup [OPTIONS]
  cnc agent doctor [OPTIONS]
  cnc agent reset

Description:
  Runs PI coding-agent with Constructive extension defaults.

Subcommands:
  setup                  Ensure managed PI runtime + install Constructive PI package locally
  doctor                 Validate runtime, package wiring, and auth/context defaults
  reset                  Remove managed PI runtime cache

Launch Options:
  --context <name>       Use this cnc context (default: current context)
  --endpoint <url>       Override Constructive GraphQL endpoint
  --token <value>        Override Constructive access token for this run
  --operations-file <p>  Set CONSTRUCTIVE_OPERATIONS_FILE
  --no-context-defaults  Ignore cnc context/auth defaults
  --provider <name>      Forward to PI --provider
  --model <id>           Forward to PI --model
  --api-key <key>        Forward to PI --api-key
  --print <prompt>       Run PI in print mode
  --pi-arg <value>       Extra PI argument (repeatable)
  --ephemeral-extension  Use -e extension for this run (skip package registration)
  --verbose              Print runtime/setup details

Examples:
  cnc agent setup
  cnc agent --provider openai --model gpt-4.1-mini
  cnc agent --context local --operations-file ./ops.json
  cnc agent --print "List the available constructive tools"
  cnc agent doctor

  --help, -h             Show this help message
`;

type AgentSubcommand = 'setup' | 'doctor' | 'reset';

interface AgentLaunchOptions {
  cwd: string;
  contextName?: string;
  endpoint?: string;
  token?: string;
  operationsFile?: string;
  noContextDefaults: boolean;
  provider?: string;
  model?: string;
  apiKey?: string;
  printPrompt?: string;
  passthroughArgs: string[];
  ephemeralExtension: boolean;
  verbose: boolean;
}

type RawArgv = Partial<Record<string, unknown>>;

interface PositionalParseResult {
  argvWithoutPositionals: RawArgv;
  positionals: string[];
}

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const readBooleanFlag = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return false;
};

const readStringArray = (value: unknown): string[] => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeString(entry))
      .filter((entry): entry is string => Boolean(entry));
  }
  const singleValue = normalizeString(value);
  return singleValue ? [singleValue] : [];
};

const extractPositionals = (argv: RawArgv): PositionalParseResult => {
  let currentArgv: RawArgv = argv;
  const positionals: string[] = [];

  while (true) {
    const { first, newArgv } = extractFirst(currentArgv);
    const positional = normalizeString(first);
    if (!positional) {
      return {
        argvWithoutPositionals: newArgv,
        positionals,
      };
    }

    positionals.push(positional);
    currentArgv = newArgv;
  }
};

const parseLaunchOptions = (
  argv: RawArgv,
  seedPassthroughArgs: string[] = [],
): AgentLaunchOptions => {
  const { argvWithoutPositionals, positionals } = extractPositionals(argv);
  const cwdValue =
    normalizeString(argvWithoutPositionals.cwd as string | undefined) ||
    process.cwd();

  const piArgValues = [
    ...readStringArray(argvWithoutPositionals['pi-arg']),
    ...readStringArray(argvWithoutPositionals.piArg),
  ];

  return {
    cwd: path.resolve(cwdValue),
    contextName: normalizeString(argvWithoutPositionals.context),
    endpoint: normalizeString(argvWithoutPositionals.endpoint),
    token: normalizeString(argvWithoutPositionals.token),
    operationsFile:
      normalizeString(argvWithoutPositionals['operations-file']) ||
      normalizeString(argvWithoutPositionals.operationsFile),
    noContextDefaults:
      readBooleanFlag(argvWithoutPositionals['no-context-defaults']) ||
      readBooleanFlag(argvWithoutPositionals.noContextDefaults),
    provider: normalizeString(argvWithoutPositionals.provider),
    model: normalizeString(argvWithoutPositionals.model),
    apiKey:
      normalizeString(argvWithoutPositionals['api-key']) ||
      normalizeString(argvWithoutPositionals.apiKey),
    printPrompt: normalizeString(argvWithoutPositionals.print),
    passthroughArgs: [...piArgValues, ...seedPassthroughArgs, ...positionals],
    ephemeralExtension:
      readBooleanFlag(argvWithoutPositionals['ephemeral-extension']) ||
      readBooleanFlag(argvWithoutPositionals.ephemeralExtension),
    verbose: readBooleanFlag(argvWithoutPositionals.verbose),
  };
};

const isSubcommand = (value: string | undefined): value is AgentSubcommand => {
  return value === 'setup' || value === 'doctor' || value === 'reset';
};

const printInfo = (message: string) => {
  console.log(chalk.gray(message));
};

const printSuccess = (message: string) => {
  console.log(chalk.green(message));
};

const printWarning = (message: string) => {
  console.log(chalk.yellow(message));
};

const printFailure = (message: string) => {
  console.error(chalk.red(message));
};

const runSetup = async (argv: RawArgv) => {
  const options = parseLaunchOptions(argv);

  printInfo(`Working directory: ${options.cwd}`);
  const runtime = await ensurePiRuntime({ verbose: options.verbose });
  const extension = resolveConstructivePiExtension();

  const installResult = await ensureConstructiveExtensionInstalled({
    piBinaryPath: runtime.binaryPath,
    cwd: options.cwd,
    packageSourcePath: extension.packageSourcePath,
    verbose: options.verbose,
  });

  if (runtime.installedThisRun) {
    printSuccess(
      `Installed managed PI runtime ${runtime.installedVersion || ''}`.trim(),
    );
  } else {
    printInfo(
      `Managed PI runtime already available (${runtime.installedVersion}).`,
    );
  }

  if (installResult.installed) {
    printSuccess(
      `Installed Constructive PI package in project settings: ${installResult.packageSourcePath}`,
    );
  } else {
    printInfo('Constructive PI package already present in project settings.');
  }
};

const runDoctor = async (argv: RawArgv) => {
  const options = parseLaunchOptions(argv);
  let failed = false;
  let warned = false;

  const printCheck = (
    status: 'ok' | 'warn' | 'fail',
    label: string,
    details: string,
  ) => {
    if (status === 'ok') {
      console.log(`${chalk.green('[OK]')} ${label} - ${details}`);
      return;
    }
    if (status === 'warn') {
      warned = true;
      console.log(`${chalk.yellow('[WARN]')} ${label} - ${details}`);
      return;
    }
    failed = true;
    console.log(`${chalk.red('[FAIL]')} ${label} - ${details}`);
  };

  try {
    const npmVersion = await runCommand('npm', ['--version']);
    if (npmVersion.exitCode === 0) {
      const version = npmVersion.stdout.trim() || 'available';
      printCheck('ok', 'npm', `Detected npm ${version}`);
    } else {
      printCheck('fail', 'npm', 'npm command failed to run');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'npm not found';
    printCheck('fail', 'npm', message);
  }

  const runtimeStatus = getPiRuntimeStatus();
  if (runtimeStatus.isInstalled) {
    printCheck(
      'ok',
      'managed PI runtime',
      `Installed ${runtimeStatus.installedVersion} (${runtimeStatus.binaryPath})`,
    );
  } else {
    printCheck(
      'warn',
      'managed PI runtime',
      'Not installed yet. Run `cnc agent setup`.',
    );
  }

  try {
    const extension = resolveConstructivePiExtension();
    printCheck(
      'ok',
      'Constructive extension package',
      extension.packageSourcePath,
    );

    const installed = isConstructivePackageInstalledForProject(
      options.cwd,
      extension.packageSourcePath,
    );
    if (installed) {
      printCheck(
        'ok',
        'project PI package registration',
        'Constructive package is configured in .pi/settings.json',
      );
    } else {
      printCheck(
        'warn',
        'project PI package registration',
        'Constructive package is not yet configured. Run `cnc agent setup`.',
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to resolve package';
    printCheck('fail', 'Constructive extension package', message);
  }

  const resolved = resolveConstructiveEnvironment({
    contextName: options.contextName,
    endpoint: options.endpoint,
    token: options.token,
    operationsFile: options.operationsFile,
    noContextDefaults: options.noContextDefaults,
  });

  if (resolved.endpoint) {
    printCheck(
      'ok',
      'Constructive endpoint',
      `${resolved.endpoint} (source=${resolved.endpointSource})`,
    );
  } else {
    printCheck(
      'fail',
      'Constructive endpoint',
      'Missing endpoint. Provide --endpoint or configure cnc context.',
    );
  }

  if (resolved.token) {
    printCheck(
      'ok',
      'Constructive token',
      `Resolved token from ${resolved.tokenSource}`,
    );
  } else {
    printCheck(
      'warn',
      'Constructive token',
      'Missing token. Tools requiring backend auth will fail until token is provided.',
    );
  }

  if (resolved.warnings.length > 0) {
    for (const warning of resolved.warnings) {
      printCheck('warn', 'resolution warning', warning);
    }
  }

  if (failed) {
    process.exit(1);
  }

  if (warned) {
    process.exit(0);
  }

  printSuccess('Doctor checks passed.');
};

const runReset = () => {
  resetPiRuntime();
  printSuccess('Managed PI runtime cache removed.');
};

const runLaunch = async (argv: RawArgv, seedPassthroughArgs: string[] = []) => {
  const options = parseLaunchOptions(argv, seedPassthroughArgs);

  const runtime = await ensurePiRuntime({ verbose: options.verbose });
  const extension = resolveConstructivePiExtension();

  if (!options.ephemeralExtension) {
    await ensureConstructiveExtensionInstalled({
      piBinaryPath: runtime.binaryPath,
      cwd: options.cwd,
      packageSourcePath: extension.packageSourcePath,
      verbose: options.verbose,
    });
  }

  const resolvedEnv = resolveConstructiveEnvironment({
    contextName: options.contextName,
    endpoint: options.endpoint,
    token: options.token,
    operationsFile: options.operationsFile,
    noContextDefaults: options.noContextDefaults,
  });

  if (resolvedEnv.warnings.length > 0 && options.verbose) {
    for (const warning of resolvedEnv.warnings) {
      printWarning(warning);
    }
  }

  const env = {
    ...process.env,
    ...resolvedEnv.env,
  };

  const launchOptions = {
    piBinaryPath: runtime.binaryPath,
    cwd: options.cwd,
    env,
    provider: options.provider,
    model: options.model,
    apiKey: options.apiKey,
    printPrompt: options.printPrompt,
    extensionEntryPath: options.ephemeralExtension
      ? extension.extensionEntryPath
      : undefined,
    passthroughArgs: options.passthroughArgs,
  };

  if (options.verbose) {
    printInfo(`PI binary: ${runtime.binaryPath}`);
    printInfo(`PI args: ${buildPiArgs(launchOptions).join(' ') || '(none)'}`);
    printInfo(
      `Constructive endpoint source: ${resolvedEnv.endpointSource}; token source: ${resolvedEnv.tokenSource}`,
    );
  }

  const exitCode = await launchPi(launchOptions);
  if (exitCode !== 0) {
    process.exit(exitCode);
  }
};

export default async (
  argv: RawArgv,
  _prompter: Inquirerer,
  _options: CLIOptions,
) => {
  if (argv.help || argv.h) {
    console.log(usage);
    process.exit(0);
  }

  const { first: subcommand, newArgv } = extractFirst(argv);

  if (!subcommand) {
    return runLaunch(newArgv);
  }

  if (!isSubcommand(subcommand)) {
    return runLaunch(newArgv, [subcommand]);
  }

  switch (subcommand) {
    case 'setup':
      return runSetup(newArgv);
    case 'doctor':
      return runDoctor(newArgv);
    case 'reset':
      return runReset();
  }
};
