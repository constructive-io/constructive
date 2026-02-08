import { CLIOptions, Inquirerer } from 'inquirerer';
import {
  generate,
  findConfigFile,
  loadConfigFile,
  codegenQuestions,
  parseCodegenCliArgs,
  printResult,
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

  const parsedCliArgs = parseCodegenCliArgs(argv as Record<string, unknown>, {
    resolveConfigFile: findConfigFile
  });
  const { configPath, cliOverrides, hasNonInteractiveArgs } = parsedCliArgs;

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

  if (hasNonInteractiveArgs) {
    const result = await generate({ ...cliOverrides });
    printResult(result);
    return;
  }

  // No config file - prompt for options using shared questions
  const answers = await prompter.prompt<Record<string, unknown>>(
    argv as Record<string, unknown>,
    codegenQuestions
  );
  const promptArgs = parseCodegenCliArgs(answers);

  const result = await generate({
    ...promptArgs.cliOverrides
  });

  printResult(result);
};
