import { CLIOptions, Inquirerer } from 'inquirerer';
import {
  generate,
  findConfigFile,
  codegenQuestions,
  printResult,
  type CodegenAnswers,
} from '@constructive-io/graphql-codegen';

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
