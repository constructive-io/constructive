/**
 * Execute command for running GraphQL queries
 */

import * as fs from 'fs';
import { CLIOptions, Inquirerer } from 'inquirerer';
import chalk from 'yanse';
import { execute, getExecutionContext } from '../sdk';

const usage = `
Constructive Execute - Run GraphQL Queries:

  cnc execute [OPTIONS]

Options:
  --query <graphql>     GraphQL query/mutation string
  --file <path>         Path to file containing GraphQL query
  --variables <json>    Variables as JSON string
  --project <name>      Project to use (defaults to current)

Examples:
  # Execute inline query
  cnc execute --query 'query { databases { nodes { id name } } }'

  # Execute from file
  cnc execute --file query.graphql

  # With variables
  cnc execute --query 'query($id: UUID!) { database(id: $id) { name } }' --variables '{"id":"..."}'

  --help, -h            Show this help message
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

  let query: string | undefined;
  let variables: Record<string, unknown> | undefined;

  if (argv.file) {
    const filePath = argv.file as string;
    if (!fs.existsSync(filePath)) {
      console.error(chalk.red(`File not found: ${filePath}`));
      process.exit(1);
    }
    query = fs.readFileSync(filePath, 'utf8');
  } else if (argv.query) {
    query = argv.query as string;
  } else {
    const answers = await prompter.prompt(argv, [
      {
        type: 'text',
        name: 'query',
        message: 'GraphQL query',
        required: true,
      },
    ]);
    query = answers.query as string;
  }

  if (argv.variables) {
    try {
      variables = JSON.parse(argv.variables as string);
    } catch {
      console.error(chalk.red('Invalid JSON in --variables'));
      process.exit(1);
    }
  }

  let context;
  try {
    context = await getExecutionContext(argv.project as string | undefined);
  } catch (error) {
    console.error(
      chalk.red(
        error instanceof Error ? error.message : 'Failed to get execution context'
      )
    );
    process.exit(1);
  }

  console.log(chalk.gray(`Project: ${context.project.name}`));
  console.log(chalk.gray(`Endpoint: ${context.project.endpoint}`));
  console.log();

  const result = await execute(query, variables, context);

  if (result.ok) {
    console.log(chalk.green('Success!'));
    console.log();
    console.log(JSON.stringify(result.data, null, 2));
  } else {
    console.error(chalk.red('Failed!'));
    console.log();
    if (result.errors) {
      for (const error of result.errors) {
        console.error(chalk.red(`  - ${error.message}`));
        if (error.path) {
          console.error(chalk.gray(`    Path: ${error.path.join('.')}`));
        }
      }
    }
    process.exit(1);
  }
};
