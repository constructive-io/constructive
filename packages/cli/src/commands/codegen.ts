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
  --out <dir>                Output directory (default: codegen)
  --auth <token>             Authorization header value
  --dryRun                   Preview without writing files
  --verbose                  Verbose output

  --help, -h                 Show this help message
`;

const questions: Question[] = [
  {
    name: 'config',
    message: 'Path to config file',
    type: 'text',
    required: false,
  },
  {
    name: 'endpoint',
    message: 'GraphQL endpoint URL',
    type: 'text',
    required: false,
  },
  {
    name: 'out',
    message: 'Output directory',
    type: 'text',
    required: false,
    default: 'codegen',
    useDefault: true,
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
];

export default async (
  argv: Partial<Record<string, unknown>>,
  prompter: Inquirerer,
  _options: CLIOptions
) => {
  if (argv.help || argv.h) {
    console.log(usage);
    process.exit(0);
  }

  const normalizedArgv = {
    ...argv,
    config: argv.config || findConfigFile() || undefined,
    endpoint: argv.endpoint,
    out: argv.out,
    reactQuery: argv.reactQuery,
    orm: argv.orm,
  };

  const {
    config,
    endpoint,
    out,
    reactQuery,
    orm,
  } = await prompter.prompt(normalizedArgv, questions);

  const schemasArg = argv.schemas as string | undefined;
  const apiNamesArg = argv.apiNames as string | undefined;
  const db = (schemasArg || apiNamesArg) ? {
    schemas: schemasArg ? schemasArg.split(',').map((s) => s.trim()) : undefined,
    apiNames: apiNamesArg ? apiNamesArg.split(',').map((s) => s.trim()) : undefined,
  } : undefined;

  const result = await generate({
    endpoint: endpoint as string | undefined,
    schemaFile: argv.schemaFile as string | undefined,
    db,
    output: out as string | undefined,
    authorization: argv.auth as string | undefined,
    reactQuery: reactQuery as boolean,
    orm: orm as boolean,
    dryRun: !!argv.dryRun,
    verbose: !!argv.verbose,
  });

  if (result.success) {
    console.log('[ok]', result.message);
  } else {
    console.error('x', result.message);
    result.errors?.forEach((e) => console.error('  -', e));
    process.exit(1);
  }
};
