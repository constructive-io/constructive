import { existsSync } from 'fs';
import { resolve } from 'path';
import {
  CombinedServer,
  CombinedServerOptions,
  FunctionName,
  FunctionServiceConfig
} from '@constructive-io/server';
import { cliExitWithError, extractFirst } from '@inquirerer/utils';
import { CLIOptions, Inquirerer, Question } from 'inquirerer';

const jobsUsageText = `
Constructive Jobs:

  cnc jobs <subcommand> [OPTIONS]

  Start or manage Constructive jobs services.

Subcommands:
  up                  Start combined server (jobs runtime)

Options:
  --help, -h           Show this help message
  --cwd <directory>    Working directory (default: current directory)
  --with-graphql-server  Enable GraphQL server (default: disabled; flag-only)
  --with-jobs-svc         Enable jobs service (default: disabled; flag-only)
  --functions <list>   Comma-separated functions, optionally with ports (e.g. "fn=8080")

Examples:
  cnc jobs up
  cnc jobs up --cwd /path/to/constructive
  cnc jobs up --with-graphql-server --functions simple-email,send-email-link=8082
`;

const questions: Question[] = [
  {
    name: 'withGraphqlServer',
    alias: 'with-graphql-server',
    message: 'Enable GraphQL server?',
    type: 'confirm',
    required: false,
    default: false,
    useDefault: true
  },
  {
    name: 'withJobsSvc',
    alias: 'with-jobs-svc',
    message: 'Enable jobs service?',
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

const buildCombinedServerOptions = (
  args: Partial<Record<string, any>>
): CombinedServerOptions => {
  const parsedFunctions = parseFunctionsArg(args.functions);

  let functions: CombinedServerOptions['functions'];
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
    graphql: { enabled: args.withGraphqlServer === true },
    jobs: { enabled: args.withJobsSvc === true },
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
      await CombinedServer(buildCombinedServerOptions(promptAnswers));
    } catch (error) {
      await cliExitWithError(
        `Failed to start combined server: ${(error as Error).message}`
      );
    }
    break;
  }

  default:
    console.log(jobsUsageText);
    await cliExitWithError(`Unknown subcommand: ${subcommand}. Use "up".`);
  }
};
