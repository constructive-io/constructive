import { toKebabCase } from 'komoji';

import type { CleanTable, CleanOperation } from '../../../types/schema';
import {
  formatArgType,
  getEditableFields,
  getReadmeHeader,
  getReadmeFooter,
  gqlTypeToJsonSchemaType,
  buildSkillFile,
} from '../docs-utils';
import type { GeneratedDocFile, McpTool } from '../docs-utils';
import {
  getScalarFields,
  getTableNames,
  getPrimaryKeyInfo,
} from '../utils';

export { resolveDocsConfig } from '../docs-utils';
export type { GeneratedDocFile, McpTool } from '../docs-utils';

export function generateReadme(
  tables: CleanTable[],
  customOperations: CleanOperation[],
  toolName: string,
): GeneratedDocFile {
  const lines: string[] = [];

  lines.push(...getReadmeHeader(`${toolName} CLI`));
  lines.push('## Setup');
  lines.push('');
  lines.push('```bash');
  lines.push(`# Create a context pointing at your GraphQL endpoint`);
  lines.push(`${toolName} context create production --endpoint https://api.example.com/graphql`);
  lines.push('');
  lines.push(`# Set the active context`);
  lines.push(`${toolName} context use production`);
  lines.push('');
  lines.push(`# Authenticate`);
  lines.push(`${toolName} auth set-token <your-token>`);
  lines.push('```');
  lines.push('');

  lines.push('## Commands');
  lines.push('');
  lines.push('| Command | Description |');
  lines.push('|---------|-------------|');
  lines.push('| `context` | Manage API contexts (endpoints) |');
  lines.push('| `auth` | Manage authentication tokens |');
  for (const table of tables) {
    const { singularName } = getTableNames(table);
    const kebab = toKebabCase(singularName);
    lines.push(`| \`${kebab}\` | ${singularName} CRUD operations |`);
  }
  for (const op of customOperations) {
    const kebab = toKebabCase(op.name);
    lines.push(`| \`${kebab}\` | ${op.description || op.name} |`);
  }
  lines.push('');

  lines.push('## Infrastructure Commands');
  lines.push('');
  lines.push('### `context`');
  lines.push('');
  lines.push('Manage named API contexts (kubectl-style).');
  lines.push('');
  lines.push('| Subcommand | Description |');
  lines.push('|------------|-------------|');
  lines.push('| `create <name> --endpoint <url>` | Create a new context |');
  lines.push('| `list` | List all contexts |');
  lines.push('| `use <name>` | Set the active context |');
  lines.push('| `current` | Show current context |');
  lines.push('| `delete <name>` | Delete a context |');
  lines.push('');
  lines.push(`Configuration is stored at \`~/.${toolName}/config/\`.`);
  lines.push('');
  lines.push('### `auth`');
  lines.push('');
  lines.push('Manage authentication tokens per context.');
  lines.push('');
  lines.push('| Subcommand | Description |');
  lines.push('|------------|-------------|');
  lines.push('| `set-token <token>` | Store bearer token for current context |');
  lines.push('| `status` | Show auth status across all contexts |');
  lines.push('| `logout` | Remove credentials for current context |');
  lines.push('');

  if (tables.length > 0) {
    lines.push('## Table Commands');
    lines.push('');
    for (const table of tables) {
      const { singularName } = getTableNames(table);
      const kebab = toKebabCase(singularName);
      const pk = getPrimaryKeyInfo(table)[0];
      const scalarFields = getScalarFields(table);
      const editableFields = getEditableFields(table);

      lines.push(`### \`${kebab}\``);
      lines.push('');
      lines.push(`CRUD operations for ${table.name} records.`);
      lines.push('');
      lines.push('| Subcommand | Description |');
      lines.push('|------------|-------------|');
      lines.push(`| \`list\` | List all ${singularName} records |`);
      lines.push(`| \`get\` | Get a ${singularName} by ${pk.name} |`);
      lines.push(`| \`create\` | Create a new ${singularName} |`);
      lines.push(`| \`update\` | Update an existing ${singularName} |`);
      lines.push(`| \`delete\` | Delete a ${singularName} |`);
      lines.push('');
      lines.push('**Fields:**');
      lines.push('');
      lines.push('| Field | Type |');
      lines.push('|-------|------|');
      for (const f of scalarFields) {
        lines.push(`| \`${f.name}\` | ${f.type.gqlType} |`);
      }
      lines.push('');
      lines.push(`**Create fields:** ${editableFields.map((f) => `\`${f.name}\``).join(', ')}`);
      lines.push('');
    }
  }

  if (customOperations.length > 0) {
    lines.push('## Custom Operations');
    lines.push('');
    for (const op of customOperations) {
      const kebab = toKebabCase(op.name);
      lines.push(`### \`${kebab}\``);
      lines.push('');
      lines.push(op.description || op.name);
      lines.push('');
      lines.push(`- **Type:** ${op.kind}`);
      if (op.args.length > 0) {
        lines.push('- **Arguments:**');
        lines.push('');
        lines.push('  | Argument | Type |');
        lines.push('  |----------|------|');
        for (const arg of op.args) {
          lines.push(`  | \`${arg.name}\` | ${formatArgType(arg)} |`);
        }
      } else {
        lines.push('- **Arguments:** none');
      }
      lines.push('');
    }
  }

  lines.push('## Output');
  lines.push('');
  lines.push('All commands output JSON to stdout. Pipe to `jq` for formatting:');
  lines.push('');
  lines.push('```bash');
  lines.push(`${toolName} car list | jq '.[]'`);
  lines.push(`${toolName} car get --id <uuid> | jq '.'`);
  lines.push('```');
  lines.push('');

  lines.push(...getReadmeFooter());

  return {
    fileName: 'README.md',
    content: lines.join('\n'),
  };
}

export function generateAgentsDocs(
  tables: CleanTable[],
  customOperations: CleanOperation[],
  toolName: string,
): GeneratedDocFile {
  const lines: string[] = [];

  lines.push(`# ${toolName} CLI - Agent Reference`);
  lines.push('');
  lines.push('> @generated by @constructive-io/graphql-codegen - DO NOT EDIT');
  lines.push('> This document is structured for LLM/agent consumption.');
  lines.push('');

  lines.push('## OVERVIEW');
  lines.push('');
  lines.push(`\`${toolName}\` is a CLI tool for interacting with a GraphQL API.`);
  lines.push('All commands output JSON to stdout. All commands accept `--help` or `-h` for usage.');
  lines.push(`Configuration is stored at \`~/.${toolName}/config/\` via appstash.`);
  lines.push('');

  lines.push('## PREREQUISITES');
  lines.push('');
  lines.push('Before running any data commands, you must:');
  lines.push('');
  lines.push(`1. Create a context: \`${toolName} context create <name> --endpoint <url>\``);
  lines.push(`2. Activate it: \`${toolName} context use <name>\``);
  lines.push(`3. Authenticate: \`${toolName} auth set-token <token>\``);
  lines.push('');

  lines.push('## TOOLS');
  lines.push('');

  lines.push('### TOOL: context');
  lines.push('');
  lines.push('Manage named API endpoint contexts (like kubectl contexts).');
  lines.push('');
  lines.push('```');
  lines.push('SUBCOMMANDS:');
  lines.push(`  ${toolName} context create <name> --endpoint <url>   Create a new context`);
  lines.push(`  ${toolName} context list                              List all contexts`);
  lines.push(`  ${toolName} context use <name>                        Set active context`);
  lines.push(`  ${toolName} context current                           Show active context`);
  lines.push(`  ${toolName} context delete <name>                     Delete a context`);
  lines.push('');
  lines.push('INPUT:');
  lines.push('  name:     string (required) - Context identifier');
  lines.push('  endpoint: string (required for create) - GraphQL endpoint URL');
  lines.push('');
  lines.push('OUTPUT: JSON');
  lines.push('  create:  { name, endpoint }');
  lines.push('  list:    [{ name, endpoint, isCurrent, hasCredentials }]');
  lines.push('  use:     { name, endpoint }');
  lines.push('  current: { name, endpoint }');
  lines.push('  delete:  { deleted: name }');
  lines.push('```');
  lines.push('');

  lines.push('### TOOL: auth');
  lines.push('');
  lines.push('Manage authentication tokens per context.');
  lines.push('');
  lines.push('```');
  lines.push('SUBCOMMANDS:');
  lines.push(`  ${toolName} auth set-token <token>   Store bearer token for current context`);
  lines.push(`  ${toolName} auth status               Show auth status for all contexts`);
  lines.push(`  ${toolName} auth logout                Remove credentials for current context`);
  lines.push('');
  lines.push('INPUT:');
  lines.push('  token: string (required for set-token) - Bearer token value');
  lines.push('');
  lines.push('OUTPUT: JSON');
  lines.push('  set-token: { context, status: "authenticated" }');
  lines.push('  status:    [{ context, authenticated: boolean }]');
  lines.push('  logout:    { context, status: "logged out" }');
  lines.push('```');
  lines.push('');

  for (const table of tables) {
    const { singularName } = getTableNames(table);
    const kebab = toKebabCase(singularName);
    const pk = getPrimaryKeyInfo(table)[0];
    const scalarFields = getScalarFields(table);
    const editableFields = getEditableFields(table);

    lines.push(`### TOOL: ${kebab}`);
    lines.push('');
    lines.push(`CRUD operations for ${table.name} records.`);
    lines.push('');
    lines.push('```');
    lines.push('SUBCOMMANDS:');
    lines.push(`  ${toolName} ${kebab} list                               List all records`);
    lines.push(`  ${toolName} ${kebab} get --${pk.name} <value>              Get one record`);
    lines.push(`  ${toolName} ${kebab} create ${editableFields.map((f) => `--${f.name} <value>`).join(' ')}`);
    lines.push(`  ${toolName} ${kebab} update --${pk.name} <value> ${editableFields.map((f) => `[--${f.name} <value>]`).join(' ')}`);
    lines.push(`  ${toolName} ${kebab} delete --${pk.name} <value>           Delete one record`);
    lines.push('');
    lines.push('INPUT FIELDS:');
    for (const f of scalarFields) {
      const isPk = f.name === pk.name;
      lines.push(`  ${f.name}: ${f.type.gqlType}${isPk ? ' (primary key)' : ''}`);
    }
    lines.push('');
    lines.push('EDITABLE FIELDS (for create/update):');
    for (const f of editableFields) {
      lines.push(`  ${f.name}: ${f.type.gqlType}`);
    }
    lines.push('');
    lines.push('OUTPUT: JSON');
    lines.push(`  list:   [{ ${scalarFields.map((f) => f.name).join(', ')} }]`);
    lines.push(`  get:    { ${scalarFields.map((f) => f.name).join(', ')} }`);
    lines.push(`  create: { ${scalarFields.map((f) => f.name).join(', ')} }`);
    lines.push(`  update: { ${scalarFields.map((f) => f.name).join(', ')} }`);
    lines.push(`  delete: { ${pk.name} }`);
    lines.push('```');
    lines.push('');
  }

  for (const op of customOperations) {
    const kebab = toKebabCase(op.name);

    lines.push(`### TOOL: ${kebab}`);
    lines.push('');
    lines.push(op.description || op.name);
    lines.push('');
    lines.push('```');
    lines.push(`TYPE: ${op.kind}`);
    if (op.args.length > 0) {
      const flags = op.args.map((a) => `--${a.name} <value>`).join(' ');
      lines.push(`USAGE: ${toolName} ${kebab} ${flags}`);
      lines.push('');
      lines.push('INPUT:');
      for (const arg of op.args) {
        lines.push(`  ${arg.name}: ${formatArgType(arg)}`);
      }
    } else {
      lines.push(`USAGE: ${toolName} ${kebab}`);
      lines.push('');
      lines.push('INPUT: none');
    }
    lines.push('');
    lines.push('OUTPUT: JSON');
    lines.push('```');
    lines.push('');
  }

  lines.push('## WORKFLOWS');
  lines.push('');
  lines.push('### Initial setup');
  lines.push('');
  lines.push('```bash');
  lines.push(`${toolName} context create dev --endpoint http://localhost:5000/graphql`);
  lines.push(`${toolName} context use dev`);
  lines.push(`${toolName} auth set-token eyJhbGciOiJIUzI1NiIs...`);
  lines.push('```');
  lines.push('');

  if (tables.length > 0) {
    const firstTable = tables[0];
    const { singularName } = getTableNames(firstTable);
    const kebab = toKebabCase(singularName);
    const editableFields = getEditableFields(firstTable);
    const pk = getPrimaryKeyInfo(firstTable)[0];

    lines.push(`### CRUD workflow (${kebab})`);
    lines.push('');
    lines.push('```bash');
    lines.push(`# List all`);
    lines.push(`${toolName} ${kebab} list`);
    lines.push('');
    lines.push(`# Create`);
    lines.push(`${toolName} ${kebab} create ${editableFields.map((f) => `--${f.name} "value"`).join(' ')}`);
    lines.push('');
    lines.push(`# Get by ${pk.name}`);
    lines.push(`${toolName} ${kebab} get --${pk.name} <value>`);
    lines.push('');
    lines.push(`# Update`);
    lines.push(`${toolName} ${kebab} update --${pk.name} <value> --${editableFields[0]?.name || 'field'} "new-value"`);
    lines.push('');
    lines.push(`# Delete`);
    lines.push(`${toolName} ${kebab} delete --${pk.name} <value>`);
    lines.push('```');
    lines.push('');
  }

  lines.push('### Piping output');
  lines.push('');
  lines.push('```bash');
  lines.push(`# Pretty print`);
  lines.push(`${toolName} car list | jq '.'`);
  lines.push('');
  lines.push(`# Extract field`);
  lines.push(`${toolName} car list | jq '.[].id'`);
  lines.push('');
  lines.push(`# Count results`);
  lines.push(`${toolName} car list | jq 'length'`);
  lines.push('```');
  lines.push('');

  lines.push('## ERROR HANDLING');
  lines.push('');
  lines.push('All errors are written to stderr. Exit codes:');
  lines.push('- `0`: Success');
  lines.push('- `1`: Error (auth failure, not found, validation error, network error)');
  lines.push('');
  lines.push('Common errors:');
  lines.push('- "No active context": Run `context use <name>` first');
  lines.push('- "Not authenticated": Run `auth set-token <token>` first');
  lines.push('- "Record not found": The requested ID does not exist');
  lines.push('');

  return {
    fileName: 'AGENTS.md',
    content: lines.join('\n'),
  };
}

export function getCliMcpTools(
  tables: CleanTable[],
  customOperations: CleanOperation[],
  toolName: string,
): McpTool[] {
  const tools: McpTool[] = [];

  tools.push({
    name: `${toolName}_context_create`,
    description: 'Create a named API context pointing at a GraphQL endpoint',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Context name' },
        endpoint: { type: 'string', description: 'GraphQL endpoint URL' },
      },
      required: ['name', 'endpoint'],
    },
  });

  tools.push({
    name: `${toolName}_context_list`,
    description: 'List all configured API contexts',
    inputSchema: { type: 'object', properties: {} },
  });

  tools.push({
    name: `${toolName}_context_use`,
    description: 'Set the active API context',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Context name to activate' },
      },
      required: ['name'],
    },
  });

  tools.push({
    name: `${toolName}_context_current`,
    description: 'Show the currently active API context',
    inputSchema: { type: 'object', properties: {} },
  });

  tools.push({
    name: `${toolName}_context_delete`,
    description: 'Delete an API context',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Context name to delete' },
      },
      required: ['name'],
    },
  });

  tools.push({
    name: `${toolName}_auth_set_token`,
    description: 'Store a bearer token for the current context',
    inputSchema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'Bearer token value' },
      },
      required: ['token'],
    },
  });

  tools.push({
    name: `${toolName}_auth_status`,
    description: 'Show authentication status for all contexts',
    inputSchema: { type: 'object', properties: {} },
  });

  tools.push({
    name: `${toolName}_auth_logout`,
    description: 'Remove credentials for the current context',
    inputSchema: { type: 'object', properties: {} },
  });

  for (const table of tables) {
    const { singularName } = getTableNames(table);
    const kebab = toKebabCase(singularName);
    const pk = getPrimaryKeyInfo(table)[0];
    const scalarFields = getScalarFields(table);
    const editableFields = getEditableFields(table);

    tools.push({
      name: `${toolName}_${kebab}_list`,
      description: `List all ${table.name} records`,
      inputSchema: { type: 'object', properties: {} },
    });

    tools.push({
      name: `${toolName}_${kebab}_get`,
      description: `Get a single ${table.name} record by ${pk.name}`,
      inputSchema: {
        type: 'object',
        properties: {
          [pk.name]: {
            type: gqlTypeToJsonSchemaType(pk.gqlType),
            description: `${table.name} ${pk.name}`,
          },
        },
        required: [pk.name],
      },
    });

    const createProps: Record<string, unknown> = {};
    for (const f of editableFields) {
      createProps[f.name] = {
        type: gqlTypeToJsonSchemaType(f.type.gqlType),
        description: `${table.name} ${f.name}`,
      };
    }
    tools.push({
      name: `${toolName}_${kebab}_create`,
      description: `Create a new ${table.name} record`,
      inputSchema: {
        type: 'object',
        properties: createProps,
        required: editableFields.map((f) => f.name),
      },
    });

    const updateProps: Record<string, unknown> = {
      [pk.name]: {
        type: gqlTypeToJsonSchemaType(pk.gqlType),
        description: `${table.name} ${pk.name}`,
      },
    };
    for (const f of editableFields) {
      updateProps[f.name] = {
        type: gqlTypeToJsonSchemaType(f.type.gqlType),
        description: `${table.name} ${f.name}`,
      };
    }
    tools.push({
      name: `${toolName}_${kebab}_update`,
      description: `Update an existing ${table.name} record`,
      inputSchema: {
        type: 'object',
        properties: updateProps,
        required: [pk.name],
      },
    });

    tools.push({
      name: `${toolName}_${kebab}_delete`,
      description: `Delete a ${table.name} record by ${pk.name}`,
      inputSchema: {
        type: 'object',
        properties: {
          [pk.name]: {
            type: gqlTypeToJsonSchemaType(pk.gqlType),
            description: `${table.name} ${pk.name}`,
          },
        },
        required: [pk.name],
      },
    });

    tools.push({
      name: `${toolName}_${kebab}_fields`,
      description: `List available fields for ${table.name}`,
      inputSchema: { type: 'object', properties: {} },
      _meta: {
        fields: scalarFields.map((f) => ({
          name: f.name,
          type: f.type.gqlType,
          editable: editableFields.some((ef) => ef.name === f.name),
          primaryKey: f.name === pk.name,
        })),
      },
    });
  }

  for (const op of customOperations) {
    const kebab = toKebabCase(op.name);
    const props: Record<string, unknown> = {};
    const required: string[] = [];

    for (const arg of op.args) {
      const isRequired = arg.type.kind === 'NON_NULL';
      const baseType = isRequired && arg.type.ofType ? arg.type.ofType : arg.type;
      props[arg.name] = {
        type: gqlTypeToJsonSchemaType(baseType.name ?? 'String'),
        description: arg.description || arg.name,
      };
      if (isRequired) {
        required.push(arg.name);
      }
    }

    tools.push({
      name: `${toolName}_${kebab}`,
      description: op.description || op.name,
      inputSchema: {
        type: 'object',
        properties: props,
        ...(required.length > 0 ? { required } : {}),
      },
    });
  }

  return tools;
}

export function generateSkills(
  tables: CleanTable[],
  customOperations: CleanOperation[],
  toolName: string,
): GeneratedDocFile[] {
  const files: GeneratedDocFile[] = [];

  files.push({
    fileName: 'skills/context.md',
    content: buildSkillFile({
      name: `${toolName}-context`,
      description: `Manage API endpoint contexts for ${toolName}`,
      usage: [
        `${toolName} context create <name> --endpoint <url>`,
        `${toolName} context list`,
        `${toolName} context use <name>`,
        `${toolName} context current`,
        `${toolName} context delete <name>`,
      ],
      examples: [
        {
          description: 'Create and activate a context',
          code: [
            `${toolName} context create production --endpoint https://api.example.com/graphql`,
            `${toolName} context use production`,
          ],
        },
        {
          description: 'List all contexts',
          code: [`${toolName} context list`],
        },
      ],
    }),
  });

  files.push({
    fileName: 'skills/auth.md',
    content: buildSkillFile({
      name: `${toolName}-auth`,
      description: `Manage authentication tokens for ${toolName}`,
      usage: [
        `${toolName} auth set-token <token>`,
        `${toolName} auth status`,
        `${toolName} auth logout`,
      ],
      examples: [
        {
          description: 'Authenticate with a token',
          code: [`${toolName} auth set-token eyJhbGciOiJIUzI1NiIs...`],
        },
        {
          description: 'Check auth status',
          code: [`${toolName} auth status`],
        },
      ],
    }),
  });

  for (const table of tables) {
    const { singularName } = getTableNames(table);
    const kebab = toKebabCase(singularName);
    const pk = getPrimaryKeyInfo(table)[0];
    const editableFields = getEditableFields(table);

    files.push({
      fileName: `skills/${kebab}.md`,
      content: buildSkillFile({
        name: `${toolName}-${kebab}`,
        description: `CRUD operations for ${table.name} records via ${toolName} CLI`,
        usage: [
          `${toolName} ${kebab} list`,
          `${toolName} ${kebab} get --${pk.name} <value>`,
          `${toolName} ${kebab} create ${editableFields.map((f) => `--${f.name} <value>`).join(' ')}`,
          `${toolName} ${kebab} update --${pk.name} <value> ${editableFields.map((f) => `[--${f.name} <value>]`).join(' ')}`,
          `${toolName} ${kebab} delete --${pk.name} <value>`,
        ],
        examples: [
          {
            description: `List all ${singularName} records`,
            code: [`${toolName} ${kebab} list`],
          },
          {
            description: `Create a ${singularName}`,
            code: [
              `${toolName} ${kebab} create ${editableFields.map((f) => `--${f.name} "value"`).join(' ')}`,
            ],
          },
          {
            description: `Get a ${singularName} by ${pk.name}`,
            code: [`${toolName} ${kebab} get --${pk.name} <value>`],
          },
          {
            description: `Update a ${singularName}`,
            code: [
              `${toolName} ${kebab} update --${pk.name} <value> --${editableFields[0]?.name || 'field'} "new-value"`,
            ],
          },
          {
            description: `Delete a ${singularName}`,
            code: [`${toolName} ${kebab} delete --${pk.name} <value>`],
          },
        ],
      }),
    });
  }

  for (const op of customOperations) {
    const kebab = toKebabCase(op.name);
    const usage =
      op.args.length > 0
        ? `${toolName} ${kebab} ${op.args.map((a) => `--${a.name} <value>`).join(' ')}`
        : `${toolName} ${kebab}`;

    files.push({
      fileName: `skills/${kebab}.md`,
      content: buildSkillFile({
        name: `${toolName}-${kebab}`,
        description: op.description || `Execute the ${op.name} ${op.kind}`,
        usage: [usage],
        examples: [
          {
            description: `Run ${op.name}`,
            code: [usage],
          },
        ],
      }),
    });
  }

  return files;
}

export interface MultiTargetDocsInput {
  toolName: string;
  builtinNames: { auth: string; context: string };
  targets: Array<{
    name: string;
    endpoint: string;
    tables: CleanTable[];
    customOperations: CleanOperation[];
    isAuthTarget?: boolean;
  }>;
}

export function generateMultiTargetReadme(
  input: MultiTargetDocsInput,
): GeneratedDocFile {
  const { toolName, builtinNames, targets } = input;
  const lines: string[] = [];

  lines.push(...getReadmeHeader(`${toolName} CLI`));

  lines.push('## Setup');
  lines.push('');
  lines.push('### Create a context');
  lines.push('');
  lines.push('A context stores per-target endpoint overrides for an environment (dev, staging, production).');
  lines.push('Default endpoints are baked in from the codegen config, so local development works with zero configuration.');
  lines.push('');
  lines.push('```bash');
  lines.push(`# Interactive - prompts for each target endpoint (defaults shown)`);
  lines.push(`${toolName} ${builtinNames.context} create local`);
  lines.push('');
  lines.push(`# Non-interactive`);
  lines.push(`${toolName} ${builtinNames.context} create production \\`);
  for (let i = 0; i < targets.length; i++) {
    const tgt = targets[i];
    const continuation = i < targets.length - 1 ? ' \\' : '';
    lines.push(`  --${tgt.name}-endpoint https://${tgt.name}.prod.example.com/graphql${continuation}`);
  }
  lines.push('```');
  lines.push('');
  lines.push('### Activate a context');
  lines.push('');
  lines.push('```bash');
  lines.push(`${toolName} ${builtinNames.context} use production`);
  lines.push('```');
  lines.push('');
  lines.push('### Authenticate');
  lines.push('');
  lines.push('```bash');
  lines.push(`${toolName} ${builtinNames.auth} set-token <your-token>`);
  lines.push('```');
  lines.push('');

  const authTarget = targets.find((t) => t.isAuthTarget);
  if (authTarget) {
    const authMutation = authTarget.customOperations.find(
      (op) => op.kind === 'mutation' && /login|sign.?in|auth/i.test(op.name),
    );
    if (authMutation) {
      const kebab = toKebabCase(authMutation.name);
      lines.push('Or authenticate via a login mutation (auto-saves token):');
      lines.push('');
      lines.push('```bash');
      const flags = authMutation.args.map((a) => `--${a.name} <value>`).join(' ');
      lines.push(`${toolName} ${authTarget.name}:${kebab} ${flags} --save-token`);
      lines.push('```');
      lines.push('');
    }
  }

  lines.push('## API Targets');
  lines.push('');
  lines.push('| Target | Default Endpoint | Tables | Custom Operations |');
  lines.push('|--------|-----------------|--------|-------------------|');
  for (const tgt of targets) {
    lines.push(`| \`${tgt.name}\` | ${tgt.endpoint} | ${tgt.tables.length} | ${tgt.customOperations.length} |`);
  }
  lines.push('');

  lines.push('## Commands');
  lines.push('');
  lines.push('### Infrastructure');
  lines.push('');
  lines.push('| Command | Description |');
  lines.push('|---------|-------------|');
  lines.push(`| \`${builtinNames.context}\` | Manage API contexts (per-target endpoints) |`);
  lines.push(`| \`${builtinNames.auth}\` | Manage authentication tokens |`);
  lines.push('');

  for (const tgt of targets) {
    lines.push(`### ${tgt.name}`);
    lines.push('');
    lines.push('| Command | Description |');
    lines.push('|---------|-------------|');
    for (const table of tgt.tables) {
      const { singularName } = getTableNames(table);
      const kebab = toKebabCase(singularName);
      lines.push(`| \`${tgt.name}:${kebab}\` | ${singularName} CRUD operations |`);
    }
    for (const op of tgt.customOperations) {
      const kebab = toKebabCase(op.name);
      lines.push(`| \`${tgt.name}:${kebab}\` | ${op.description || op.name} |`);
    }
    lines.push('');
  }

  lines.push('## Infrastructure Commands');
  lines.push('');
  lines.push(`### \`${builtinNames.context}\``);
  lines.push('');
  lines.push('Manage named API contexts (kubectl-style). Each context stores per-target endpoint overrides.');
  lines.push('');
  lines.push('| Subcommand | Description |');
  lines.push('|------------|-------------|');
  lines.push('| `create <name>` | Create a new context (prompts for per-target endpoints) |');
  lines.push('| `list` | List all contexts |');
  lines.push('| `use <name>` | Set the active context |');
  lines.push('| `current` | Show current context |');
  lines.push('| `delete <name>` | Delete a context |');
  lines.push('');
  lines.push('Create options:');
  lines.push('');
  for (const tgt of targets) {
    lines.push(`- \`--${tgt.name}-endpoint <url>\` (default: ${tgt.endpoint})`);
  }
  lines.push('');
  lines.push(`Configuration is stored at \`~/.${toolName}/config/\`.`);
  lines.push('');

  lines.push(`### \`${builtinNames.auth}\``);
  lines.push('');
  lines.push('Manage authentication tokens per context. One shared token is used across all targets.');
  lines.push('');
  lines.push('| Subcommand | Description |');
  lines.push('|------------|-------------|');
  lines.push('| `set-token <token>` | Store bearer token for current context |');
  lines.push('| `status` | Show auth status across all contexts |');
  lines.push('| `logout` | Remove credentials for current context |');
  lines.push('');

  for (const tgt of targets) {
    if (tgt.tables.length === 0 && tgt.customOperations.length === 0) continue;
    lines.push(`## ${tgt.name} Commands`);
    lines.push('');

    for (const table of tgt.tables) {
      const { singularName } = getTableNames(table);
      const kebab = toKebabCase(singularName);
      const pk = getPrimaryKeyInfo(table)[0];
      const scalarFields = getScalarFields(table);
      const editableFields = getEditableFields(table);

      lines.push(`### \`${tgt.name}:${kebab}\``);
      lines.push('');
      lines.push(`CRUD operations for ${table.name} records.`);
      lines.push('');
      lines.push('| Subcommand | Description |');
      lines.push('|------------|-------------|');
      lines.push(`| \`list\` | List all ${singularName} records |`);
      lines.push(`| \`get\` | Get a ${singularName} by ${pk.name} |`);
      lines.push(`| \`create\` | Create a new ${singularName} |`);
      lines.push(`| \`update\` | Update an existing ${singularName} |`);
      lines.push(`| \`delete\` | Delete a ${singularName} |`);
      lines.push('');
      lines.push('**Fields:**');
      lines.push('');
      lines.push('| Field | Type |');
      lines.push('|-------|------|');
      for (const f of scalarFields) {
        lines.push(`| \`${f.name}\` | ${f.type.gqlType} |`);
      }
      lines.push('');
      lines.push(`**Create fields:** ${editableFields.map((f) => `\`${f.name}\``).join(', ')}`);
      lines.push('');
    }

    for (const op of tgt.customOperations) {
      const kebab = toKebabCase(op.name);
      lines.push(`### \`${tgt.name}:${kebab}\``);
      lines.push('');
      lines.push(op.description || op.name);
      lines.push('');
      lines.push(`- **Type:** ${op.kind}`);
      if (op.args.length > 0) {
        lines.push('- **Arguments:**');
        lines.push('');
        lines.push('  | Argument | Type |');
        lines.push('  |----------|------|');
        for (const arg of op.args) {
          lines.push(`  | \`${arg.name}\` | ${formatArgType(arg)} |`);
        }
      } else {
        lines.push('- **Arguments:** none');
      }
      if (tgt.isAuthTarget && op.kind === 'mutation') {
        lines.push(`- **Flags:** \`--save-token\` auto-saves returned token to credentials`);
      }
      lines.push('');
    }
  }

  lines.push('## Output');
  lines.push('');
  lines.push('All commands output JSON to stdout. Pipe to `jq` for formatting:');
  lines.push('');
  lines.push('```bash');
  if (targets.length > 0 && targets[0].tables.length > 0) {
    const tgt = targets[0];
    const kebab = toKebabCase(getTableNames(tgt.tables[0]).singularName);
    lines.push(`${toolName} ${tgt.name}:${kebab} list | jq '.[]'`);
    lines.push(`${toolName} ${tgt.name}:${kebab} get --id <uuid> | jq '.'`);
  }
  lines.push('```');
  lines.push('');

  lines.push(...getReadmeFooter());

  return {
    fileName: 'README.md',
    content: lines.join('\n'),
  };
}

export function generateMultiTargetAgentsDocs(
  input: MultiTargetDocsInput,
): GeneratedDocFile {
  const { toolName, builtinNames, targets } = input;
  const lines: string[] = [];

  lines.push(`# ${toolName} CLI - Agent Reference`);
  lines.push('');
  lines.push('> @generated by @constructive-io/graphql-codegen - DO NOT EDIT');
  lines.push('> This document is structured for LLM/agent consumption.');
  lines.push('');

  lines.push('## OVERVIEW');
  lines.push('');
  lines.push(`\`${toolName}\` is a unified multi-target CLI for interacting with multiple GraphQL APIs.`);
  lines.push('All commands output JSON to stdout. All commands accept `--help` or `-h` for usage.');
  lines.push(`Configuration is stored at \`~/.${toolName}/config/\` via appstash.`);
  lines.push('');
  lines.push('TARGETS:');
  for (const tgt of targets) {
    lines.push(`  ${tgt.name}: ${tgt.endpoint}`);
  }
  lines.push('');
  lines.push('COMMAND FORMAT:');
  lines.push(`  ${toolName} <target>:<command> <subcommand> [flags]    Target-specific commands`);
  lines.push(`  ${toolName} ${builtinNames.context} <subcommand> [flags]              Context management`);
  lines.push(`  ${toolName} ${builtinNames.auth} <subcommand> [flags]                 Authentication`);
  lines.push('');

  lines.push('## PREREQUISITES');
  lines.push('');
  lines.push('Before running any data commands, you must:');
  lines.push('');
  lines.push(`1. Create a context: \`${toolName} ${builtinNames.context} create <name>\``);
  lines.push(`   (prompts for per-target endpoints, defaults baked from config)`);
  lines.push(`2. Activate it: \`${toolName} ${builtinNames.context} use <name>\``);
  lines.push(`3. Authenticate: \`${toolName} ${builtinNames.auth} set-token <token>\``);
  lines.push('');
  lines.push('For local development, create a context accepting all defaults:');
  lines.push('');
  lines.push('```bash');
  lines.push(`${toolName} ${builtinNames.context} create local`);
  lines.push(`${toolName} ${builtinNames.context} use local`);
  lines.push(`${toolName} ${builtinNames.auth} set-token <token>`);
  lines.push('```');
  lines.push('');

  lines.push('## TOOLS');
  lines.push('');

  lines.push(`### TOOL: ${builtinNames.context}`);
  lines.push('');
  lines.push('Manage named API endpoint contexts. Each context stores per-target endpoint overrides.');
  lines.push('');
  lines.push('```');
  lines.push('SUBCOMMANDS:');
  lines.push(`  ${toolName} ${builtinNames.context} create <name>   Create a new context`);
  lines.push(`  ${toolName} ${builtinNames.context} list              List all contexts`);
  lines.push(`  ${toolName} ${builtinNames.context} use <name>        Set active context`);
  lines.push(`  ${toolName} ${builtinNames.context} current           Show active context`);
  lines.push(`  ${toolName} ${builtinNames.context} delete <name>     Delete a context`);
  lines.push('');
  lines.push('CREATE OPTIONS:');
  for (const tgt of targets) {
    lines.push(`  --${tgt.name}-endpoint: string (default: ${tgt.endpoint})`);
  }
  lines.push('');
  lines.push('OUTPUT: JSON');
  lines.push('  create:  { name, endpoint, targets }');
  lines.push('  list:    [{ name, endpoint, isCurrent, hasCredentials }]');
  lines.push('  use:     { name, endpoint }');
  lines.push('  current: { name, endpoint }');
  lines.push('  delete:  { deleted: name }');
  lines.push('```');
  lines.push('');

  lines.push(`### TOOL: ${builtinNames.auth}`);
  lines.push('');
  lines.push('Manage authentication tokens per context. One shared token across all targets.');
  lines.push('');
  lines.push('```');
  lines.push('SUBCOMMANDS:');
  lines.push(`  ${toolName} ${builtinNames.auth} set-token <token>   Store bearer token for current context`);
  lines.push(`  ${toolName} ${builtinNames.auth} status               Show auth status for all contexts`);
  lines.push(`  ${toolName} ${builtinNames.auth} logout                Remove credentials for current context`);
  lines.push('');
  lines.push('INPUT:');
  lines.push('  token: string (required for set-token) - Bearer token value');
  lines.push('');
  lines.push('OUTPUT: JSON');
  lines.push('  set-token: { context, status: "authenticated" }');
  lines.push('  status:    [{ context, authenticated: boolean }]');
  lines.push('  logout:    { context, status: "logged out" }');
  lines.push('```');
  lines.push('');

  for (const tgt of targets) {
    for (const table of tgt.tables) {
      const { singularName } = getTableNames(table);
      const kebab = toKebabCase(singularName);
      const pk = getPrimaryKeyInfo(table)[0];
      const scalarFields = getScalarFields(table);
      const editableFields = getEditableFields(table);

      lines.push(`### TOOL: ${tgt.name}:${kebab}`);
      lines.push('');
      lines.push(`CRUD operations for ${table.name} records (${tgt.name} target).`);
      lines.push('');
      lines.push('```');
      lines.push('SUBCOMMANDS:');
      lines.push(`  ${toolName} ${tgt.name}:${kebab} list                               List all records`);
      lines.push(`  ${toolName} ${tgt.name}:${kebab} get --${pk.name} <value>              Get one record`);
      lines.push(`  ${toolName} ${tgt.name}:${kebab} create ${editableFields.map((f) => `--${f.name} <value>`).join(' ')}`);
      lines.push(`  ${toolName} ${tgt.name}:${kebab} update --${pk.name} <value> ${editableFields.map((f) => `[--${f.name} <value>]`).join(' ')}`);
      lines.push(`  ${toolName} ${tgt.name}:${kebab} delete --${pk.name} <value>           Delete one record`);
      lines.push('');
      lines.push('INPUT FIELDS:');
      for (const f of scalarFields) {
        const isPk = f.name === pk.name;
        lines.push(`  ${f.name}: ${f.type.gqlType}${isPk ? ' (primary key)' : ''}`);
      }
      lines.push('');
      lines.push('EDITABLE FIELDS (for create/update):');
      for (const f of editableFields) {
        lines.push(`  ${f.name}: ${f.type.gqlType}`);
      }
      lines.push('');
      lines.push('OUTPUT: JSON');
      lines.push(`  list:   [{ ${scalarFields.map((f) => f.name).join(', ')} }]`);
      lines.push(`  get:    { ${scalarFields.map((f) => f.name).join(', ')} }`);
      lines.push(`  create: { ${scalarFields.map((f) => f.name).join(', ')} }`);
      lines.push(`  update: { ${scalarFields.map((f) => f.name).join(', ')} }`);
      lines.push(`  delete: { ${pk.name} }`);
      lines.push('```');
      lines.push('');
    }

    for (const op of tgt.customOperations) {
      const kebab = toKebabCase(op.name);

      lines.push(`### TOOL: ${tgt.name}:${kebab}`);
      lines.push('');
      lines.push(op.description || op.name);
      lines.push('');
      lines.push('```');
      lines.push(`TYPE: ${op.kind}`);
      if (op.args.length > 0) {
        const flags = op.args.map((a) => `--${a.name} <value>`).join(' ');
        lines.push(`USAGE: ${toolName} ${tgt.name}:${kebab} ${flags}`);
        lines.push('');
        lines.push('INPUT:');
        for (const arg of op.args) {
          lines.push(`  ${arg.name}: ${formatArgType(arg)}`);
        }
      } else {
        lines.push(`USAGE: ${toolName} ${tgt.name}:${kebab}`);
        lines.push('');
        lines.push('INPUT: none');
      }
      if (tgt.isAuthTarget && op.kind === 'mutation') {
        lines.push('');
        lines.push('FLAGS:');
        lines.push('  --save-token: boolean - Auto-save returned token to credentials');
      }
      lines.push('');
      lines.push('OUTPUT: JSON');
      lines.push('```');
      lines.push('');
    }
  }

  lines.push('## WORKFLOWS');
  lines.push('');
  lines.push('### Initial setup');
  lines.push('');
  lines.push('```bash');
  lines.push(`${toolName} ${builtinNames.context} create dev`);
  lines.push(`${toolName} ${builtinNames.context} use dev`);
  lines.push(`${toolName} ${builtinNames.auth} set-token eyJhbGciOiJIUzI1NiIs...`);
  lines.push('```');
  lines.push('');

  lines.push('### Switch environment');
  lines.push('');
  lines.push('```bash');
  lines.push(`${toolName} ${builtinNames.context} create production \\`);
  for (let i = 0; i < targets.length; i++) {
    const tgt = targets[i];
    const continuation = i < targets.length - 1 ? ' \\' : '';
    lines.push(`  --${tgt.name}-endpoint https://${tgt.name}.prod.example.com/graphql${continuation}`);
  }
  lines.push(`${toolName} ${builtinNames.context} use production`);
  lines.push('```');
  lines.push('');

  if (targets.length > 0 && targets[0].tables.length > 0) {
    const tgt = targets[0];
    const table = tgt.tables[0];
    const { singularName } = getTableNames(table);
    const kebab = toKebabCase(singularName);
    const editableFields = getEditableFields(table);
    const pk = getPrimaryKeyInfo(table)[0];

    lines.push(`### CRUD workflow (${tgt.name}:${kebab})`);
    lines.push('');
    lines.push('```bash');
    lines.push(`${toolName} ${tgt.name}:${kebab} list`);
    lines.push(`${toolName} ${tgt.name}:${kebab} create ${editableFields.map((f) => `--${f.name} "value"`).join(' ')}`);
    lines.push(`${toolName} ${tgt.name}:${kebab} get --${pk.name} <value>`);
    lines.push(`${toolName} ${tgt.name}:${kebab} update --${pk.name} <value> --${editableFields[0]?.name || 'field'} "new-value"`);
    lines.push(`${toolName} ${tgt.name}:${kebab} delete --${pk.name} <value>`);
    lines.push('```');
    lines.push('');
  }

  lines.push('### Piping output');
  lines.push('');
  lines.push('```bash');
  if (targets.length > 0 && targets[0].tables.length > 0) {
    const tgt = targets[0];
    const kebab = toKebabCase(getTableNames(tgt.tables[0]).singularName);
    lines.push(`${toolName} ${tgt.name}:${kebab} list | jq '.'`);
    lines.push(`${toolName} ${tgt.name}:${kebab} list | jq '.[].id'`);
    lines.push(`${toolName} ${tgt.name}:${kebab} list | jq 'length'`);
  }
  lines.push('```');
  lines.push('');

  lines.push('## ERROR HANDLING');
  lines.push('');
  lines.push('All errors are written to stderr. Exit codes:');
  lines.push('- `0`: Success');
  lines.push('- `1`: Error (auth failure, not found, validation error, network error)');
  lines.push('');
  lines.push('Common errors:');
  lines.push(`- "No active context": Run \`${builtinNames.context} use <name>\` first`);
  lines.push(`- "Not authenticated": Run \`${builtinNames.auth} set-token <token>\` first`);
  lines.push('- "Unknown target": The target name is not recognized');
  lines.push('- "Record not found": The requested ID does not exist');
  lines.push('');

  return {
    fileName: 'AGENTS.md',
    content: lines.join('\n'),
  };
}

export function getMultiTargetCliMcpTools(
  input: MultiTargetDocsInput,
): McpTool[] {
  const { toolName, builtinNames, targets } = input;
  const tools: McpTool[] = [];

  const contextEndpointProps: Record<string, unknown> = {
    name: { type: 'string', description: 'Context name' },
  };
  for (const tgt of targets) {
    contextEndpointProps[`${tgt.name}_endpoint`] = {
      type: 'string',
      description: `${tgt.name} GraphQL endpoint (default: ${tgt.endpoint})`,
    };
  }
  tools.push({
    name: `${toolName}_${builtinNames.context}_create`,
    description: 'Create a named API context with per-target endpoint overrides',
    inputSchema: {
      type: 'object',
      properties: contextEndpointProps,
      required: ['name'],
    },
  });

  tools.push({
    name: `${toolName}_${builtinNames.context}_list`,
    description: 'List all configured API contexts',
    inputSchema: { type: 'object', properties: {} },
  });

  tools.push({
    name: `${toolName}_${builtinNames.context}_use`,
    description: 'Set the active API context (switches all targets at once)',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Context name to activate' },
      },
      required: ['name'],
    },
  });

  tools.push({
    name: `${toolName}_${builtinNames.context}_current`,
    description: 'Show the currently active API context',
    inputSchema: { type: 'object', properties: {} },
  });

  tools.push({
    name: `${toolName}_${builtinNames.context}_delete`,
    description: 'Delete an API context',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Context name to delete' },
      },
      required: ['name'],
    },
  });

  tools.push({
    name: `${toolName}_${builtinNames.auth}_set_token`,
    description: 'Store a bearer token for the current context (shared across all targets)',
    inputSchema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'Bearer token value' },
      },
      required: ['token'],
    },
  });

  tools.push({
    name: `${toolName}_${builtinNames.auth}_status`,
    description: 'Show authentication status for all contexts',
    inputSchema: { type: 'object', properties: {} },
  });

  tools.push({
    name: `${toolName}_${builtinNames.auth}_logout`,
    description: 'Remove credentials for the current context',
    inputSchema: { type: 'object', properties: {} },
  });

  for (const tgt of targets) {
    for (const table of tgt.tables) {
      const { singularName } = getTableNames(table);
      const kebab = toKebabCase(singularName);
      const pk = getPrimaryKeyInfo(table)[0];
      const scalarFields = getScalarFields(table);
      const editableFields = getEditableFields(table);
      const prefix = `${toolName}_${tgt.name}_${kebab}`;

      tools.push({
        name: `${prefix}_list`,
        description: `List all ${table.name} records (${tgt.name} target)`,
        inputSchema: { type: 'object', properties: {} },
      });

      tools.push({
        name: `${prefix}_get`,
        description: `Get a single ${table.name} record by ${pk.name} (${tgt.name} target)`,
        inputSchema: {
          type: 'object',
          properties: {
            [pk.name]: {
              type: gqlTypeToJsonSchemaType(pk.gqlType),
              description: `${table.name} ${pk.name}`,
            },
          },
          required: [pk.name],
        },
      });

      const createProps: Record<string, unknown> = {};
      for (const f of editableFields) {
        createProps[f.name] = {
          type: gqlTypeToJsonSchemaType(f.type.gqlType),
          description: `${table.name} ${f.name}`,
        };
      }
      tools.push({
        name: `${prefix}_create`,
        description: `Create a new ${table.name} record (${tgt.name} target)`,
        inputSchema: {
          type: 'object',
          properties: createProps,
          required: editableFields.map((f) => f.name),
        },
      });

      const updateProps: Record<string, unknown> = {
        [pk.name]: {
          type: gqlTypeToJsonSchemaType(pk.gqlType),
          description: `${table.name} ${pk.name}`,
        },
      };
      for (const f of editableFields) {
        updateProps[f.name] = {
          type: gqlTypeToJsonSchemaType(f.type.gqlType),
          description: `${table.name} ${f.name}`,
        };
      }
      tools.push({
        name: `${prefix}_update`,
        description: `Update an existing ${table.name} record (${tgt.name} target)`,
        inputSchema: {
          type: 'object',
          properties: updateProps,
          required: [pk.name],
        },
      });

      tools.push({
        name: `${prefix}_delete`,
        description: `Delete a ${table.name} record by ${pk.name} (${tgt.name} target)`,
        inputSchema: {
          type: 'object',
          properties: {
            [pk.name]: {
              type: gqlTypeToJsonSchemaType(pk.gqlType),
              description: `${table.name} ${pk.name}`,
            },
          },
          required: [pk.name],
        },
      });

      tools.push({
        name: `${prefix}_fields`,
        description: `List available fields for ${table.name} (${tgt.name} target)`,
        inputSchema: { type: 'object', properties: {} },
        _meta: {
          fields: scalarFields.map((f) => ({
            name: f.name,
            type: f.type.gqlType,
            editable: editableFields.some((ef) => ef.name === f.name),
            primaryKey: f.name === pk.name,
          })),
        },
      });
    }

    for (const op of tgt.customOperations) {
      const kebab = toKebabCase(op.name);
      const props: Record<string, unknown> = {};
      const required: string[] = [];

      for (const arg of op.args) {
        const isRequired = arg.type.kind === 'NON_NULL';
        const baseType = isRequired && arg.type.ofType ? arg.type.ofType : arg.type;
        props[arg.name] = {
          type: gqlTypeToJsonSchemaType(baseType.name ?? 'String'),
          description: arg.description || arg.name,
        };
        if (isRequired) {
          required.push(arg.name);
        }
      }

      if (tgt.isAuthTarget && op.kind === 'mutation') {
        props['save_token'] = {
          type: 'boolean',
          description: 'Auto-save returned token to credentials',
        };
      }

      tools.push({
        name: `${toolName}_${tgt.name}_${kebab}`,
        description: `${op.description || op.name} (${tgt.name} target)`,
        inputSchema: {
          type: 'object',
          properties: props,
          ...(required.length > 0 ? { required } : {}),
        },
      });
    }
  }

  return tools;
}

export function generateMultiTargetSkills(
  input: MultiTargetDocsInput,
): GeneratedDocFile[] {
  const { toolName, builtinNames, targets } = input;
  const files: GeneratedDocFile[] = [];

  const contextUsage = [
    `${toolName} ${builtinNames.context} create <name>`,
    `${toolName} ${builtinNames.context} list`,
    `${toolName} ${builtinNames.context} use <name>`,
    `${toolName} ${builtinNames.context} current`,
    `${toolName} ${builtinNames.context} delete <name>`,
  ];
  const contextCreateFlags = targets
    .map((t) => `--${t.name}-endpoint <url>`)
    .join(' ');
  files.push({
    fileName: `skills/${builtinNames.context}.md`,
    content: buildSkillFile({
      name: `${toolName}-${builtinNames.context}`,
      description: `Manage API endpoint contexts for ${toolName} (multi-target: ${targets.map((t) => t.name).join(', ')})`,
      usage: contextUsage,
      examples: [
        {
          description: 'Create a context for local development (accept all defaults)',
          code: [
            `${toolName} ${builtinNames.context} create local`,
            `${toolName} ${builtinNames.context} use local`,
          ],
        },
        {
          description: 'Create a production context with custom endpoints',
          code: [
            `${toolName} ${builtinNames.context} create production ${contextCreateFlags}`,
            `${toolName} ${builtinNames.context} use production`,
          ],
        },
        {
          description: 'List and switch contexts',
          code: [
            `${toolName} ${builtinNames.context} list`,
            `${toolName} ${builtinNames.context} use staging`,
          ],
        },
      ],
    }),
  });

  files.push({
    fileName: `skills/${builtinNames.auth}.md`,
    content: buildSkillFile({
      name: `${toolName}-${builtinNames.auth}`,
      description: `Manage authentication tokens for ${toolName} (shared across all targets)`,
      usage: [
        `${toolName} ${builtinNames.auth} set-token <token>`,
        `${toolName} ${builtinNames.auth} status`,
        `${toolName} ${builtinNames.auth} logout`,
      ],
      examples: [
        {
          description: 'Authenticate with a token',
          code: [`${toolName} ${builtinNames.auth} set-token eyJhbGciOiJIUzI1NiIs...`],
        },
        {
          description: 'Check auth status',
          code: [`${toolName} ${builtinNames.auth} status`],
        },
      ],
    }),
  });

  for (const tgt of targets) {
    for (const table of tgt.tables) {
      const { singularName } = getTableNames(table);
      const kebab = toKebabCase(singularName);
      const pk = getPrimaryKeyInfo(table)[0];
      const editableFields = getEditableFields(table);
      const cmd = `${tgt.name}:${kebab}`;

      files.push({
        fileName: `skills/${tgt.name}-${kebab}.md`,
        content: buildSkillFile({
          name: `${toolName}-${cmd}`,
          description: `CRUD operations for ${table.name} records via ${toolName} CLI (${tgt.name} target)`,
          usage: [
            `${toolName} ${cmd} list`,
            `${toolName} ${cmd} get --${pk.name} <value>`,
            `${toolName} ${cmd} create ${editableFields.map((f) => `--${f.name} <value>`).join(' ')}`,
            `${toolName} ${cmd} update --${pk.name} <value> ${editableFields.map((f) => `[--${f.name} <value>]`).join(' ')}`,
            `${toolName} ${cmd} delete --${pk.name} <value>`,
          ],
          examples: [
            {
              description: `List all ${singularName} records`,
              code: [`${toolName} ${cmd} list`],
            },
            {
              description: `Create a ${singularName}`,
              code: [
                `${toolName} ${cmd} create ${editableFields.map((f) => `--${f.name} "value"`).join(' ')}`,
              ],
            },
            {
              description: `Get a ${singularName} by ${pk.name}`,
              code: [`${toolName} ${cmd} get --${pk.name} <value>`],
            },
          ],
        }),
      });
    }

    for (const op of tgt.customOperations) {
      const kebab = toKebabCase(op.name);
      const cmd = `${tgt.name}:${kebab}`;
      const baseUsage =
        op.args.length > 0
          ? `${toolName} ${cmd} ${op.args.map((a) => `--${a.name} <value>`).join(' ')}`
          : `${toolName} ${cmd}`;
      const usageLines = [baseUsage];
      if (tgt.isAuthTarget && op.kind === 'mutation') {
        usageLines.push(`${baseUsage} --save-token`);
      }

      files.push({
        fileName: `skills/${tgt.name}-${kebab}.md`,
        content: buildSkillFile({
          name: `${toolName}-${cmd}`,
          description: `${op.description || `Execute the ${op.name} ${op.kind}`} (${tgt.name} target)`,
          usage: usageLines,
          examples: [
            {
              description: `Run ${op.name}`,
              code: [baseUsage],
            },
          ],
        }),
      });
    }
  }

  return files;
}
