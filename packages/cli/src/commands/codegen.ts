import { CLIOptions, Inquirerer } from 'inquirerer';
import {
  generate,
  findConfigFile,
  loadConfigFile,
  codegenQuestions,
  printResult,
  camelizeArgv,
  splitCommas,
  type CodegenAnswers,
  type GraphQLSDKConfigTarget,
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
  --browser-compatible       Deprecated no-op (retained for compatibility)
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

  const hasSourceCliFlags = Boolean(
    argv.endpoint ||
      argv['schema-file'] ||
      argv.schemaFile ||
      argv.schemas ||
      argv['api-names'] ||
      argv.apiNames
  );
  const explicitConfigPath = argv.config as string | undefined;
  const autoConfigPath = !explicitConfigPath && !hasSourceCliFlags
    ? findConfigFile()
    : undefined;
  const configPath = explicitConfigPath || autoConfigPath;

  const endpoint = argv.endpoint as string | undefined;
  const schemaFile = (argv['schema-file'] || argv.schemaFile) as string | undefined;
  const schemas = splitCommas(argv.schemas as string | undefined);
  const apiNames = splitCommas((argv['api-names'] || argv.apiNames) as string | undefined);

  const cliOverrides: Partial<GraphQLSDKConfigTarget> = {};
  if (endpoint) {
    cliOverrides.endpoint = endpoint;
    cliOverrides.schemaFile = undefined;
    cliOverrides.db = undefined;
  }
  if (schemaFile) {
    cliOverrides.schemaFile = schemaFile;
    cliOverrides.endpoint = undefined;
    cliOverrides.db = undefined;
  }
  if (schemas || apiNames) {
    cliOverrides.db = { schemas, apiNames };
    cliOverrides.endpoint = undefined;
    cliOverrides.schemaFile = undefined;
  }
  if (argv['react-query'] === true || argv.reactQuery === true) cliOverrides.reactQuery = true;
  if (argv.orm === true) cliOverrides.orm = true;
  if (argv.verbose === true) cliOverrides.verbose = true;
  if (argv['dry-run'] === true || argv.dryRun === true) cliOverrides.dryRun = true;
  if (argv.output) cliOverrides.output = argv.output as string;
  if (argv.authorization) cliOverrides.authorization = argv.authorization as string;
  if (argv['browser-compatible'] !== undefined) {
    cliOverrides.browserCompatible = argv['browser-compatible'] as boolean;
  } else if (argv.browserCompatible !== undefined) {
    cliOverrides.browserCompatible = argv.browserCompatible as boolean;
  }

  if (configPath) {
    const loaded = await loadConfigFile(configPath);
    if (!loaded.success) {
      console.error('x', loaded.error);
      process.exit(1);
    }
    const result = await generate({
      ...(loaded.config as GraphQLSDKConfigTarget),
      ...cliOverrides,
    });
    printResult(result);
    return;
  }

  const hasNonInteractiveArgs = Boolean(
    endpoint ||
      schemaFile ||
      schemas ||
      apiNames ||
      argv['react-query'] === true ||
      argv.reactQuery === true ||
      argv.orm === true ||
      argv.output ||
      argv.authorization ||
      argv['dry-run'] === true ||
      argv.dryRun === true ||
      argv.verbose === true ||
      argv['browser-compatible'] !== undefined ||
      argv.browserCompatible !== undefined
  );

  if (hasNonInteractiveArgs) {
    const result = await generate({ ...cliOverrides });
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
