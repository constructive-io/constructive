import { toKebabCase } from 'komoji';

import {
  getScalarFields,
  getTableNames,
  getPrimaryKeyInfo,
} from '../utils';
import type { CleanTable, CleanOperation } from '../../../types/schema';
import type { GeneratedFile } from './executor-generator';

function formatArgType(arg: CleanOperation['args'][number]): string {
  const t = arg.type;
  if (t.kind === 'NON_NULL' && t.ofType) {
    return `${formatTypeRef(t.ofType)} (required)`;
  }
  return formatTypeRef(t);
}

function formatTypeRef(t: CleanOperation['args'][number]['type']): string {
  if (t.kind === 'LIST' && t.ofType) {
    return `[${formatTypeRef(t.ofType)}]`;
  }
  if (t.kind === 'NON_NULL' && t.ofType) {
    return `${formatTypeRef(t.ofType)}!`;
  }
  return t.name ?? 'unknown';
}

function buildTableSection(table: CleanTable): string {
  const { singularName } = getTableNames(table);
  const kebab = toKebabCase(singularName);
  const pk = getPrimaryKeyInfo(table)[0];
  const scalarFields = getScalarFields(table);
  const editableFields = scalarFields.filter(
    (f) =>
      f.name !== pk.name &&
      f.name !== 'nodeId' &&
      f.name !== 'createdAt' &&
      f.name !== 'updatedAt',
  );

  const lines: string[] = [];

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

  return lines.join('\n');
}

function buildCustomOpSection(op: CleanOperation): string {
  const kebab = toKebabCase(op.name);
  const lines: string[] = [];

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
    lines.push('');
  } else {
    lines.push('- **Arguments:** none');
    lines.push('');
  }

  return lines.join('\n');
}

function buildTableManPage(table: CleanTable): string {
  const { singularName } = getTableNames(table);
  const kebab = toKebabCase(singularName);
  const pk = getPrimaryKeyInfo(table)[0];
  const scalarFields = getScalarFields(table);
  const editableFields = scalarFields.filter(
    (f) =>
      f.name !== pk.name &&
      f.name !== 'nodeId' &&
      f.name !== 'createdAt' &&
      f.name !== 'updatedAt',
  );

  const lines: string[] = [];

  lines.push(`## ${kebab}(1)`);
  lines.push('');
  lines.push('### NAME');
  lines.push('');
  lines.push(`${kebab} - manage ${table.name} records`);
  lines.push('');
  lines.push('### SYNOPSIS');
  lines.push('');
  lines.push(`    ${kebab} <command> [options]`);
  lines.push('');
  lines.push('### COMMANDS');
  lines.push('');

  lines.push('**list**');
  lines.push('');
  lines.push(`    ${kebab} list`);
  lines.push('');
  lines.push(`List all ${singularName} records. Returns JSON array.`);
  lines.push('');
  lines.push(`Selected fields: ${scalarFields.map((f) => f.name).join(', ')}`);
  lines.push('');

  lines.push('**get**');
  lines.push('');
  lines.push(`    ${kebab} get --${pk.name} <value>`);
  lines.push('');
  lines.push(`Fetch a single ${singularName} by its ${pk.name}.`);
  lines.push('');

  lines.push('**create**');
  lines.push('');
  const createFlags = editableFields.map((f) => `--${f.name} <value>`).join(' ');
  lines.push(`    ${kebab} create ${createFlags}`);
  lines.push('');
  lines.push(`Create a new ${singularName}. All fields are required.`);
  lines.push('');
  lines.push('  Options:');
  for (const f of editableFields) {
    lines.push(`    --${f.name.padEnd(20)} ${f.type.gqlType} (required)`);
  }
  lines.push('');

  lines.push('**update**');
  lines.push('');
  const updateFlags = editableFields.map((f) => `[--${f.name} <value>]`).join(' ');
  lines.push(`    ${kebab} update --${pk.name} <value> ${updateFlags}`);
  lines.push('');
  lines.push(`Update an existing ${singularName}. Only provided fields are changed.`);
  lines.push('');
  lines.push('  Options:');
  lines.push(`    --${pk.name.padEnd(20)} ${pk.gqlType} (required)`);
  for (const f of editableFields) {
    lines.push(`    --${f.name.padEnd(20)} ${f.type.gqlType}`);
  }
  lines.push('');

  lines.push('**delete**');
  lines.push('');
  lines.push(`    ${kebab} delete --${pk.name} <value>`);
  lines.push('');
  lines.push(`Delete a ${singularName} by its ${pk.name}.`);
  lines.push('');

  return lines.join('\n');
}

function buildCustomOpManPage(op: CleanOperation): string {
  const kebab = toKebabCase(op.name);
  const lines: string[] = [];

  lines.push(`## ${kebab}(1)`);
  lines.push('');
  lines.push('### NAME');
  lines.push('');
  lines.push(`${kebab} - ${op.description || op.name}`);
  lines.push('');
  lines.push('### SYNOPSIS');
  lines.push('');

  if (op.args.length > 0) {
    const flags = op.args.map((a) => `--${a.name} <value>`).join(' ');
    lines.push(`    ${kebab} ${flags}`);
  } else {
    lines.push(`    ${kebab}`);
  }
  lines.push('');

  lines.push('### DESCRIPTION');
  lines.push('');
  lines.push(op.description || `Execute the ${op.name} ${op.kind}.`);
  lines.push('');

  if (op.args.length > 0) {
    lines.push('### OPTIONS');
    lines.push('');
    for (const arg of op.args) {
      lines.push(`**--${arg.name}** ${formatArgType(arg)}`);
      if (arg.description) {
        lines.push(`    ${arg.description}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

export function generateReadme(
  tables: CleanTable[],
  customOperations: CleanOperation[],
  toolName: string,
): GeneratedFile {
  const lines: string[] = [];

  lines.push(`# ${toolName} CLI`);
  lines.push('');
  lines.push('> Auto-generated CLI commands from GraphQL schema');
  lines.push('> @generated by @constructive-io/graphql-codegen - DO NOT EDIT');
  lines.push('');
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
      lines.push(buildTableSection(table));
    }
  }

  if (customOperations.length > 0) {
    lines.push('## Custom Operations');
    lines.push('');
    for (const op of customOperations) {
      lines.push(buildCustomOpSection(op));
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

  return {
    fileName: 'README.md',
    content: lines.join('\n'),
  };
}

export function generateCommandReference(
  tables: CleanTable[],
  customOperations: CleanOperation[],
  toolName: string,
): GeneratedFile {
  const lines: string[] = [];

  lines.push(`# ${toolName} - Command Reference`);
  lines.push('');
  lines.push('> @generated by @constructive-io/graphql-codegen - DO NOT EDIT');
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push('## context(1)');
  lines.push('');
  lines.push('### NAME');
  lines.push('');
  lines.push('context - manage API endpoint contexts');
  lines.push('');
  lines.push('### SYNOPSIS');
  lines.push('');
  lines.push(`    ${toolName} context <command> [options]`);
  lines.push('');
  lines.push('### COMMANDS');
  lines.push('');
  lines.push('**create** `<name>` `--endpoint <url>`');
  lines.push('');
  lines.push('    Create a named context pointing at a GraphQL endpoint.');
  lines.push(`    Config stored at ~/.${toolName}/config/contexts/<name>.json`);
  lines.push('');
  lines.push('**list**');
  lines.push('');
  lines.push('    List all configured contexts with auth status.');
  lines.push('');
  lines.push('**use** `<name>`');
  lines.push('');
  lines.push('    Set the active context for subsequent commands.');
  lines.push('');
  lines.push('**current**');
  lines.push('');
  lines.push('    Display the currently active context and its endpoint.');
  lines.push('');
  lines.push('**delete** `<name>`');
  lines.push('');
  lines.push('    Remove a context and its configuration.');
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push('## auth(1)');
  lines.push('');
  lines.push('### NAME');
  lines.push('');
  lines.push('auth - manage authentication tokens');
  lines.push('');
  lines.push('### SYNOPSIS');
  lines.push('');
  lines.push(`    ${toolName} auth <command> [options]`);
  lines.push('');
  lines.push('### COMMANDS');
  lines.push('');
  lines.push('**set-token** `<token>` `[--context <name>]`');
  lines.push('');
  lines.push('    Store a bearer token for the current (or specified) context.');
  lines.push(`    Credentials stored at ~/.${toolName}/config/credentials.json (mode 0600).`);
  lines.push('');
  lines.push('**status**');
  lines.push('');
  lines.push('    Show authentication status for all contexts.');
  lines.push('');
  lines.push('**logout** `[--context <name>]`');
  lines.push('');
  lines.push('    Remove stored credentials for the current (or specified) context.');
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const table of tables) {
    lines.push(buildTableManPage(table));
    lines.push('---');
    lines.push('');
  }

  for (const op of customOperations) {
    lines.push(buildCustomOpManPage(op));
    lines.push('---');
    lines.push('');
  }

  return {
    fileName: 'COMMANDS.md',
    content: lines.join('\n'),
  };
}
