import { CLIOptions, Inquirerer } from 'inquirerer';
import {
  generate,
  generateMulti,
  expandApiNamesToMultiTarget,
  findConfigFile,
  loadConfigFile,
  codegenQuestions,
  printResult,
  buildGenerateOptions,
  buildDbConfig,
  camelizeArgv,
  normalizeCodegenListOptions,
  seedArgvFromConfig,
  hasResolvedCodegenSource,
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
  --target <name>            Target name (for multi-target configs)
  --authorization <token>    Authorization header value
  --dry-run                  Preview without writing files
  --verbose                  Verbose output

Schema Export:
  --schema-only              Export GraphQL SDL instead of running full codegen.
                             Works with any source (endpoint, file, database, PGPM).
                             With multiple apiNames, writes one .graphql per API.

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

  const args = camelizeArgv(argv as Record<string, any>);

  const schemaOnly = Boolean(args.schemaOnly);

  const hasSourceFlags = Boolean(
    args.endpoint || args.schemaFile || args.schemas || args.apiNames
  );
  const configPath = (args.config as string | undefined) ||
    (!hasSourceFlags ? findConfigFile() : undefined);

  let fileConfig: GraphQLSDKConfigTarget = {};

  if (configPath) {
    const loaded = await loadConfigFile(configPath);
    if (!loaded.success) {
      console.error('x', loaded.error);
      process.exit(1);
    }

    const config = loaded.config as Record<string, unknown>;
    const isMulti = !(
      'endpoint' in config ||
      'schemaFile' in config ||
      'db' in config
    );

    if (isMulti) {
      const targets = config as Record<string, GraphQLSDKConfigTarget>;
      const targetName = args.target as string | undefined;

      if (targetName && !targets[targetName]) {
        console.error(
          'x',
          `Target "${targetName}" not found. Available: ${Object.keys(targets).join(', ')}`,
        );
        process.exit(1);
      }

      const cliOptions = buildDbConfig(
        normalizeCodegenListOptions(args),
      );

      const selectedTargets = targetName
        ? { [targetName]: targets[targetName] }
        : targets;

      const { results, hasError } = await generateMulti({
        configs: selectedTargets,
        cliOverrides: cliOptions as Partial<GraphQLSDKConfigTarget>,
        schemaOnly,
      });

      for (const { name, result } of results) {
        console.log(`\n[${name}]`);
        printResult(result);
      }

      if (hasError) process.exit(1);
      return;
    }

    fileConfig = config as GraphQLSDKConfigTarget;
  }

  const seeded = seedArgvFromConfig(args, fileConfig);
  const answers = hasResolvedCodegenSource(seeded)
    ? seeded
    : await prompter.prompt(seeded, codegenQuestions);
  const options = buildGenerateOptions(answers, fileConfig);

  const expanded = expandApiNamesToMultiTarget(options);
  if (expanded) {
    const { results, hasError } = await generateMulti({
      configs: expanded,
      schemaOnly,
    });
    for (const { name, result } of results) {
      console.log(`\n[${name}]`);
      printResult(result);
    }
    if (hasError) process.exit(1);
    return;
  }

  const result = await generate({ ...options, schemaOnly });
  printResult(result);
};
