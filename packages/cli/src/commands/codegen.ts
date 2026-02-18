import type { CLIOptions, Inquirerer } from 'inquirerer';
import { runCodegenHandler } from '@constructive-io/graphql-codegen';

const usage = `
Constructive GraphQL Codegen:

  cnc codegen [OPTIONS]

Source Options (choose one):
  --config <path>            Path to graphql-codegen config file
  --endpoint <url>           GraphQL endpoint URL
  --schema-file <path>       Path to GraphQL schema file
  --schema-dir <dir>         Directory of .graphql files (auto-expands to multi-target)

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

  await runCodegenHandler(argv as Record<string, unknown>, prompter);
};
