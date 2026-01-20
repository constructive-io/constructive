import { existsSync } from 'fs';
import { resolve } from 'path';
import {
  KnativeJobsSvc,
  KnativeJobsSvcOptions,
  FunctionName,
  FunctionServiceConfig
} from '@constructive-io/knative-job-service';
import { CLIOptions, Inquirerer, Question, cliExitWithError, extractFirst } from 'inquirerer';

const jobsUsageText = `
Constructive Jobs:

  cnc jobs <subcommand> [OPTIONS]

  Start or manage Constructive jobs services.

Subcommands:
  up                  Start jobs runtime (jobs + functions)

Options:
  --help, -h           Show this help message
  --cwd <directory>    Working directory (default: current directory)
  --with-jobs-server      Enable jobs server (default: disabled; flag-only)
  --functions <list>   Comma-separated functions, optionally with ports (e.g. "fn=8080")

Examples:
  cnc jobs up
  cnc jobs up --cwd /path/to/constructive
  cnc jobs up --with-jobs-server --functions simple-email,send-email-link=8082
`;

const questions: Question[] = [
  {
    name: 'withJobsServer',
    alias: 'with-jobs-server',
    message: 'Enable jobs server?',
    type: 'confirm',
    required: false,
    default: false,
    useDefault: true
  }
];

const ensureCwd = (cwd: string): string => {
  const resolved = resolve(cwd);
  if (!existsSync(resolved)) {
    throw new Error(`Working directory does not exist: ${resolved}`);
  }
  process.chdir(resolved);
  return resolved;
};

type ParsedFunctionsArg = {
  mode: 'all' | 'list';
  names: string[];
  ports: Record<string, number>;
};

const parseFunctionsArg = (value: unknown): ParsedFunctionsArg | undefined => {
  if (value === undefined) return undefined;

  const values = Array.isArray(value) ? value : [value];

  const tokens: string[] = [];
  for (const value of values) {
    if (value === true) {
      tokens.push('all');
      continue;
    }
    if (value === false || value === undefined || value === null) continue;
    const raw = String(value);
    raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => tokens.push(part));
  }

  if (!tokens.length) {
    return { mode: 'list', names: [], ports: {} };
  }

  const hasAll = tokens.some((token) => {
    const normalized = token.trim().toLowerCase();
    return normalized === 'all' || normalized === '*';
  });

  if (hasAll) {
    if (tokens.length > 1) {
      throw new Error('Use "all" without other function names.');
    }
    return { mode: 'all', names: [], ports: {} };
  }

  const names: string[] = [];
  const ports: Record<string, number> = {};

  for (const token of tokens) {
    const trimmed = token.trim();
    if (!trimmed) continue;

    const separatorIndex = trimmed.search(/[:=]/);
    if (separatorIndex === -1) {
      names.push(trimmed);
      continue;
    }

    const name = trimmed.slice(0, separatorIndex).trim();
    const portText = trimmed.slice(separatorIndex + 1).trim();

    if (!name) {
      throw new Error(`Missing function name in "${token}".`);
    }
    if (!portText) {
      throw new Error(`Missing port for function "${name}".`);
    }

    const port = Number(portText);
    if (!Number.isFinite(port) || port <= 0) {
      throw new Error(`Invalid port "${portText}" for function "${name}".`);
    }

    names.push(name);
    ports[name] = port;
  }

  const uniqueNames: string[] = [];
  const seen = new Set<string>();
  for (const name of names) {
    if (seen.has(name)) continue;
    seen.add(name);
    uniqueNames.push(name);
  }

  return { mode: 'list', names: uniqueNames, ports };
};

const buildKnativeJobsSvcOptions = (
  args: Partial<Record<string, any>>
): KnativeJobsSvcOptions => {
  const parsedFunctions = parseFunctionsArg(args.functions);

  let functions: KnativeJobsSvcOptions['functions'];
  if (parsedFunctions) {
    if (parsedFunctions.mode === 'all') {
      functions = { enabled: true };
    } else if (parsedFunctions.names.length) {
      const services: FunctionServiceConfig[] = parsedFunctions.names.map(
        (name) => ({
          name: name as FunctionName,
          port: parsedFunctions.ports[name]
        })
      );
      functions = { enabled: true, services };
    } else {
      functions = undefined;
    }
  }

  return {
    jobs: { enabled: args.withJobsServer === true },
    functions
  };
};

export default async (
  argv: Partial<Record<string, any>>,
  prompter: Inquirerer,
  _options: CLIOptions
) => {
  if (argv.help || argv.h) {
    console.log(jobsUsageText);
    process.exit(0);
  }

  const { first: subcommand, newArgv } = extractFirst(argv);
  const args = newArgv as Partial<Record<string, any>>;

  if (!subcommand) {
    console.log(jobsUsageText);
    await cliExitWithError('No subcommand provided. Use "up".');
    return;
  }

  switch (subcommand) {
  case 'up': {
    try {
      ensureCwd((args.cwd as string) || process.cwd());
      const promptAnswers = await prompter.prompt(args, questions);
      const server = new KnativeJobsSvc(buildKnativeJobsSvcOptions(promptAnswers));
      await server.start();
    } catch (error) {
      await cliExitWithError(
        `Failed to start jobs runtime: ${(error as Error).message}`
      );
    }
    break;
  }

  default:
    console.log(jobsUsageText);
    await cliExitWithError(`Unknown subcommand: ${subcommand}. Use "up".`);
  }
};
