/**
 * Execute command for running JSON protocol operations
 */

import * as fs from 'fs';
import { CLIOptions, Inquirerer, extractFirst } from 'inquirerer';
import chalk from 'yanse';
import {
  executeOperation,
  getExecutionContext,
  parseOperation,
  determineApi,
} from '../sdk';
import type { JsonOperation } from '../sdk';

const usage = `
Constructive Execute - Run JSON Protocol Operations:

  cnc execute [OPTIONS]

Options:
  --file <path>         Path to JSON file containing operation
  --json <json>         Inline JSON operation
  --model <name>        Model name (e.g., database, table, field)
  --action <action>     Action (findMany, findFirst, create, update, delete)
  --data <json>         Data for create/update (JSON string)
  --where <json>        Where clause (JSON string)
  --select <json>       Fields to select (JSON string)
  --first <n>           Limit to first N records
  --api <type>          API to use (public, admin, auth, private, app)
  --project <name>      Project to use (defaults to current)
  --verbose             Show generated GraphQL query
  --dry-run             Show what would be executed without running

Examples:
  # Execute from file
  cnc execute --file operation.json

  # Inline JSON
  cnc execute --json '{"model":"database","action":"findMany","select":{"id":true,"name":true}}'

  # Using flags
  cnc execute --model database --action findMany --select '{"id":true,"name":true}' --first 10

  # Create a database
  cnc execute --model database --action create --data '{"name":"my-app","ownerId":"uuid"}' --select '{"id":true}'

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

  let operation: JsonOperation;

  // Try to build operation from various sources
  if (argv.file) {
    // Load from file
    const filePath = argv.file as string;
    if (!fs.existsSync(filePath)) {
      console.error(chalk.red(`File not found: ${filePath}`));
      process.exit(1);
    }
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      operation = parseOperation(content);
    } catch (error) {
      console.error(chalk.red(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  } else if (argv.json) {
    // Parse inline JSON
    try {
      operation = parseOperation(argv.json as string);
    } catch (error) {
      console.error(chalk.red(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  } else if (argv.model && argv.action) {
    // Build from flags
    operation = buildOperationFromFlags(argv);
  } else {
    // Interactive mode
    operation = await buildOperationInteractively(argv, prompter);
  }

  // Validate operation
  if (!operation.model || !operation.action) {
    console.error(chalk.red('Operation must have model and action'));
    process.exit(1);
  }

  // Show what will be executed
  const api = operation.api || determineApi(operation.model);
  console.log(chalk.bold(`Executing: ${operation.model}.${operation.action}`));
  console.log(chalk.gray(`API: ${api}`));

  if (argv.dryRun || argv['dry-run']) {
    console.log();
    console.log(chalk.yellow('Dry run - operation not executed'));
    console.log();
    console.log(chalk.bold('Operation:'));
    console.log(JSON.stringify(operation, null, 2));
    return;
  }

  // Get execution context
  let context;
  try {
    context = await getExecutionContext(
      argv.project as string | undefined,
      argv.verbose as boolean | undefined
    );
  } catch (error) {
    console.error(chalk.red(error instanceof Error ? error.message : 'Failed to get execution context'));
    process.exit(1);
  }

  console.log(chalk.gray(`Project: ${context.project.name}`));
  console.log();

  // Execute the operation
  const result = await executeOperation(operation, context);

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

function buildOperationFromFlags(
  argv: Partial<Record<string, unknown>>
): JsonOperation {
  const model = argv.model as string;
  const action = argv.action as 'findMany' | 'findFirst' | 'create' | 'update' | 'delete';

  let data: Record<string, unknown> | undefined;
  let where: Record<string, unknown> | undefined;
  let select: Record<string, unknown> | undefined;

  if (argv.data) {
    try {
      data = JSON.parse(argv.data as string);
    } catch {
      throw new Error('Invalid JSON in --data');
    }
  }

  if (argv.where) {
    try {
      where = JSON.parse(argv.where as string);
    } catch {
      throw new Error('Invalid JSON in --where');
    }
  }

  if (argv.select) {
    try {
      select = JSON.parse(argv.select as string);
    } catch {
      throw new Error('Invalid JSON in --select');
    }
  }

  return {
    operation: action === 'findMany' || action === 'findFirst' ? 'query' : 'mutation',
    model,
    action,
    api: argv.api as 'public' | 'admin' | 'auth' | 'private' | 'app' | undefined,
    data,
    where,
    select: select || { id: true },
    first: argv.first as number | undefined,
    last: argv.last as number | undefined,
    offset: argv.offset as number | undefined,
    orderBy: argv.orderBy as string[] | undefined,
  };
}

async function buildOperationInteractively(
  argv: Partial<Record<string, unknown>>,
  prompter: Inquirerer
): Promise<JsonOperation> {
  const models = [
    'database',
    'schema',
    'table',
    'field',
    'policy',
    'checkConstraint',
    'foreignKeyConstraint',
    'api',
    'apiSchema',
    'domain',
    'site',
    'user',
    'membership',
    'permission',
    'databaseProvisionModule',
  ];

  const actions = ['findMany', 'findFirst', 'create', 'update', 'delete'];

  const answers = await prompter.prompt(argv, [
    {
      type: 'autocomplete',
      name: 'model',
      message: 'Model',
      options: models,
    },
    {
      type: 'autocomplete',
      name: 'action',
      message: 'Action',
      options: actions,
    },
  ]);

  const model = answers.model as string;
  const action = answers.action as 'findMany' | 'findFirst' | 'create' | 'update' | 'delete';

  let data: Record<string, unknown> | undefined;
  let where: Record<string, unknown> | undefined;

  if (action === 'create' || action === 'update') {
    const dataAnswer = await prompter.prompt(argv, [
      {
        type: 'text',
        name: 'data',
        message: 'Data (JSON)',
        required: true,
      },
    ]);
    try {
      data = JSON.parse(dataAnswer.data as string);
    } catch {
      throw new Error('Invalid JSON in data');
    }
  }

  if (action === 'update' || action === 'delete') {
    const whereAnswer = await prompter.prompt(argv, [
      {
        type: 'text',
        name: 'id',
        message: 'Record ID',
        required: true,
      },
    ]);
    where = { id: whereAnswer.id };
  } else if (action === 'findFirst' || action === 'findMany') {
    const whereAnswer = await prompter.prompt(argv, [
      {
        type: 'text',
        name: 'where',
        message: 'Where clause (JSON, optional)',
        required: false,
      },
    ]);
    if (whereAnswer.where) {
      try {
        where = JSON.parse(whereAnswer.where as string);
      } catch {
        throw new Error('Invalid JSON in where clause');
      }
    }
  }

  return {
    operation: action === 'findMany' || action === 'findFirst' ? 'query' : 'mutation',
    model,
    action,
    data,
    where,
    select: { id: true, name: true },
    first: action === 'findMany' ? 20 : undefined,
  };
}
