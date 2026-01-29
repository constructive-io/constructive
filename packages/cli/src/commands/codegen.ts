import { CLIOptions, Inquirerer } from 'inquirerer';
import {
  generate,
  findConfigFile,
  codegenQuestions,
  printResult,
  camelizeArgv,
  type CodegenAnswers,
} from '@constructive-io/graphql-codegen';

const usage = `
Constructive GraphQL Codegen:

  cnc codegen [OPTIONS]

Source Options (choose one):
  --config <path>            Path to graphql-codegen config file
  --endpoint <url>           GraphQL endpoint URL
  --schema-file <path>       Path to GraphQL schema file

Database Options:
  --schemas <list>           Comma-separated PostgreSQL schemas
  --api-names <list>         Comma-separated API names

Generator Options:
  --react-query              Generate React Query hooks (default)
  --orm                      Generate ORM client
  --output <dir>             Output directory (default: codegen)
  --authorization <token>    Authorization header value
  --browser-compatible       Generate browser-compatible code (default: true)
                             Set to false for Node.js with localhost DNS fix
  --dry-run                  Preview without writing files
  --verbose                  Verbose output

  --help, -h                 Show this help message
`;

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

  // No config file - prompt for options using shared questions
  const answers = await prompter.prompt<CodegenAnswers>(argv as CodegenAnswers, codegenQuestions);
  // Convert kebab-case CLI args to camelCase for internal use
  const camelized = camelizeArgv(answers);

  // Build db config if schemas or apiNames provided
  const db = (camelized.schemas || camelized.apiNames) ? {
    schemas: camelized.schemas,
    apiNames: camelized.apiNames,
  } : undefined;

  const result = await generate({
    endpoint: camelized.endpoint,
    schemaFile: camelized.schemaFile,
    db,
    output: camelized.output,
    authorization: camelized.authorization,
    reactQuery: camelized.reactQuery,
    orm: camelized.orm,
    browserCompatible: camelized.browserCompatible,
    dryRun: camelized.dryRun,
    verbose: camelized.verbose,
  });

  printResult(result);
};
