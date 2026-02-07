import { CLIOptions, Inquirerer } from 'inquirerer';
import {
  generate,
  findConfigFile,
  loadConfigFile,
  codegenQuestions,
  printResult,
  buildGenerateOptions,
  seedArgvFromConfig,
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

  const hasSourceFlags = Boolean(
    argv.endpoint || argv['schema-file'] || argv.schemas || argv['api-names']
  );
  const configPath = (argv.config as string | undefined) ||
    (!hasSourceFlags ? findConfigFile() : undefined);

  let fileConfig: GraphQLSDKConfigTarget = {};

  if (configPath) {
    const loaded = await loadConfigFile(configPath);
    if (!loaded.success) {
      console.error('x', loaded.error);
      process.exit(1);
    }
    fileConfig = loaded.config as GraphQLSDKConfigTarget;
  }

  const seeded = seedArgvFromConfig(argv as Record<string, unknown>, fileConfig);
  const answers = await prompter.prompt(seeded, codegenQuestions);
  const options = buildGenerateOptions(answers, fileConfig);
  const result = await generate(options);
  printResult(result);
};
