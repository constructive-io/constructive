import { CLIOptions, Inquirerer, Question } from 'inquirerer';
import { generate, findConfigFile } from '@constructive-io/graphql-codegen';

const usage = `
Constructive GraphQL Codegen:

  cnc codegen [OPTIONS]

Source Options (choose one):
  --config <path>            Path to graphql-codegen config file
  --endpoint <url>           GraphQL endpoint URL
  --schemaFile <path>        Path to GraphQL schema file

Database Options:
  --schemas <list>           Comma-separated PostgreSQL schemas
  --apiNames <list>          Comma-separated API names

Generator Options:
  --reactQuery               Generate React Query hooks (default)
  --orm                      Generate ORM client
  --output <dir>             Output directory (default: codegen)
  --authorization <token>    Authorization header value
  --dryRun                   Preview without writing files
  --verbose                  Verbose output

  --help, -h                 Show this help message
`;

const splitCommas = (input: string | undefined): string[] | undefined => {
  if (!input) return undefined;
  return input.split(',').map((s) => s.trim()).filter(Boolean);
};

const questions: Question[] = [
  {
    name: 'endpoint',
    message: 'GraphQL endpoint URL',
    type: 'text',
    required: false,
  },
  {
    name: 'schemaFile',
    message: 'Path to GraphQL schema file',
    type: 'text',
    required: false,
  },
  {
    name: 'output',
    message: 'Output directory',
    type: 'text',
    required: false,
    default: 'codegen',
    useDefault: true,
  },
  {
    name: 'schemas',
    message: 'PostgreSQL schemas (comma-separated)',
    type: 'text',
    required: false,
    sanitize: splitCommas,
  },
  {
    name: 'apiNames',
    message: 'API names (comma-separated)',
    type: 'text',
    required: false,
    sanitize: splitCommas,
  },
  {
    name: 'reactQuery',
    message: 'Generate React Query hooks?',
    type: 'confirm',
    required: false,
    default: true,
    useDefault: true,
  },
  {
    name: 'orm',
    message: 'Generate ORM client?',
    type: 'confirm',
    required: false,
    default: false,
    useDefault: true,
  },
  {
    name: 'authorization',
    message: 'Authorization header value',
    type: 'text',
    required: false,
  },
  {
    name: 'dryRun',
    message: 'Preview without writing files?',
    type: 'confirm',
    required: false,
    default: false,
    useDefault: true,
  },
  {
    name: 'verbose',
    message: 'Verbose output?',
    type: 'confirm',
    required: false,
    default: false,
    useDefault: true,
  },
];

interface CodegenAnswers {
  endpoint?: string;
  schemaFile?: string;
  output?: string;
  schemas?: string[];
  apiNames?: string[];
  reactQuery?: boolean;
  orm?: boolean;
  authorization?: string;
  dryRun?: boolean;
  verbose?: boolean;
}

export default async (
  argv: Partial<Record<string, unknown>>,
  prompter: Inquirerer,
  _options: CLIOptions
) => {
  if (argv.help || argv.h) {
    console.log(usage);
    process.exit(0);
  }

  // Auto-detect config file if not provided
  const config = argv.config || findConfigFile();
  if (config) {
    // If config file exists, just run generate with it (config file handles everything)
    const result = await generate({});
    printResult(result);
    return;
  }

  // No config file - prompt for options
  const answers = await prompter.prompt<CodegenAnswers>(argv as CodegenAnswers, questions);

  // Build db config if schemas or apiNames provided
  const db = (answers.schemas || answers.apiNames) ? {
    schemas: answers.schemas,
    apiNames: answers.apiNames,
  } : undefined;

  const result = await generate({
    endpoint: answers.endpoint,
    schemaFile: answers.schemaFile,
    db,
    output: answers.output,
    authorization: answers.authorization,
    reactQuery: answers.reactQuery,
    orm: answers.orm,
    dryRun: answers.dryRun,
    verbose: answers.verbose,
  });

  printResult(result);
};

function printResult(result: Awaited<ReturnType<typeof generate>>) {
  if (result.success) {
    console.log('[ok]', result.message);
  } else {
    console.error('x', result.message);
    result.errors?.forEach((e) => console.error('  -', e));
    process.exit(1);
  }
}
