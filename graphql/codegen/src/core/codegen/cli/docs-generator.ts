import { toKebabCase } from 'komoji';

import type { Table, Operation, TypeRegistry } from '../../../types/schema';
import {
  flattenArgs,
  flattenedArgsToFlags,
  cleanTypeName,
  fieldPlaceholder,
  getEditableFields,
  getSearchFields,
  categorizeSpecialFields,
  buildSpecialFieldsMarkdown,
  getReadmeHeader,
  getReadmeFooter,
  gqlTypeToJsonSchemaType,
  buildSkillFile,
  buildSkillReference,
} from '../docs-utils';
import type { GeneratedDocFile } from '../docs-utils';
import {
  getScalarFields,
  getTableNames,
  getPrimaryKeyInfo,
} from '../utils';
import { getFieldsWithDefaults } from './table-command-generator';

export { resolveDocsConfig } from '../docs-utils';
export type { GeneratedDocFile } from '../docs-utils';

export function generateReadme(
  tables: Table[],
  customOperations: Operation[],
  toolName: string,
  registry?: TypeRegistry,
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
  lines.push('| `config` | Manage config key-value store (per-context) |');
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
  lines.push('### `config`');
  lines.push('');
  lines.push('Manage per-context key-value configuration variables.');
  lines.push('');
  lines.push('| Subcommand | Description |');
  lines.push('|------------|-------------|');
  lines.push('| `get <key>` | Get a config value |');
  lines.push('| `set <key> <value>` | Set a config value |');
  lines.push('| `list` | List all config values |');
  lines.push('| `delete <key>` | Delete a config value |');
  lines.push('');
  lines.push(`Variables are scoped to the active context and stored at \`~/.${toolName}/config/\`.`);
  lines.push('');

  if (tables.length > 0) {
    lines.push('## Table Commands');
    lines.push('');
    for (const table of tables) {
      const { singularName } = getTableNames(table);
      const kebab = toKebabCase(singularName);
      const pk = getPrimaryKeyInfo(table)[0];
      const scalarFields = getScalarFields(table);
      const editableFields = getEditableFields(table, registry);

      lines.push(`### \`${kebab}\``);
      lines.push('');
      lines.push(`CRUD operations for ${table.name} records.`);
      lines.push('');
      lines.push('| Subcommand | Description |');
      lines.push('|------------|-------------|');
      lines.push(`| \`list\` | List all ${singularName} records |`);
      lines.push(`| \`find-first\` | Find first matching ${singularName} record |`);
      const readmeSpecialGroups = categorizeSpecialFields(table, registry);
      const readmeHasSearch = readmeSpecialGroups.some(
        (g) => g.category === 'search' || g.category === 'embedding',
      );
      if (readmeHasSearch) {
        lines.push(`| \`search <query>\` | Search ${singularName} records |`);
      }
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
        lines.push(`| \`${f.name}\` | ${cleanTypeName(f.type.gqlType)} |`);
      }
      lines.push('');
      const defaultFields = getFieldsWithDefaults(table, registry);
      const requiredCreate = editableFields.filter((f) => !defaultFields.has(f.name));
      const optionalCreate = editableFields.filter((f) => defaultFields.has(f.name));
      if (requiredCreate.length > 0) {
        lines.push(`**Required create fields:** ${requiredCreate.map((f) => `\`${f.name}\``).join(', ')}`);
      }
      if (optionalCreate.length > 0) {
        lines.push(`**Optional create fields (backend defaults):** ${optionalCreate.map((f) => `\`${f.name}\``).join(', ')}`);
      }
      if (requiredCreate.length === 0 && optionalCreate.length === 0) {
        lines.push(`**Create fields:** ${editableFields.map((f) => `\`${f.name}\``).join(', ')}`);
      }
      const specialGroups = categorizeSpecialFields(table, registry);
      lines.push(...buildSpecialFieldsMarkdown(specialGroups));
      lines.push('');
    }
  }

  if (customOperations.length > 0) {
    lines.push('## Custom Operations');
    lines.push('');
    for (const op of customOperations) {
      const kebab = toKebabCase(op.name);
      const flat = flattenArgs(op.args, registry);
      lines.push(`### \`${kebab}\``);
      lines.push('');
      lines.push(op.description || op.name);
      lines.push('');
      lines.push(`- **Type:** ${op.kind}`);
      if (flat.length > 0) {
        lines.push('- **Arguments:**');
        lines.push('');
        lines.push('  | Argument | Type |');
        lines.push('  |----------|------|');
        for (const a of flat) {
          const reqLabel = a.required ? ' (required)' : '';
          lines.push(`  | \`--${a.flag}\` | ${a.type}${reqLabel} |`);
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
  lines.push('## Non-Interactive Mode');
  lines.push('');
  lines.push('Use `--no-tty` to skip all interactive prompts (useful for scripts and CI):');
  lines.push('');
  lines.push('```bash');
  lines.push(`${toolName} --no-tty car create --name "Sedan" --year 2024`);
  lines.push('```');
  lines.push('');

  lines.push(...getReadmeFooter());

  return {
    fileName: 'README.md',
    content: lines.join('\n'),
  };
}

export function generateAgentsDocs(
  tables: Table[],
  customOperations: Operation[],
  toolName: string,
  _registry?: TypeRegistry,
): GeneratedDocFile {
  const lines: string[] = [];
  const tableCount = tables.length;
  const customOpCount = customOperations.length;

  lines.push(`# ${toolName} CLI`);
  lines.push('');
  lines.push('<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->');
  lines.push('');

  lines.push('## Stack');
  lines.push('');
  lines.push(`- Generated CLI for a GraphQL API (TypeScript)`);
  lines.push(`- ${tableCount} table${tableCount !== 1 ? 's' : ''}${customOpCount > 0 ? `, ${customOpCount} custom operation${customOpCount !== 1 ? 's' : ''}` : ''}`);
  lines.push(`- Config stored at \`~/.${toolName}/config/\` via appstash`);
  lines.push('');

  lines.push('## Quick Start');
  lines.push('');
  lines.push('```bash');
  lines.push(`${toolName} context create dev --endpoint <url>`);
  lines.push(`${toolName} context use dev`);
  lines.push(`${toolName} auth set-token <token>`);
  lines.push('```');
  lines.push('');

  lines.push('## Resources');
  lines.push('');
  lines.push(`- **Full API reference:** [README.md](./README.md) — CRUD docs for all ${tableCount} tables`);
  lines.push('- **Schema types:** [types.ts](./types.ts)');
  lines.push('');

  lines.push('## Conventions');
  lines.push('');
  lines.push('- All commands output JSON to stdout');
  lines.push('- Use `--help` on any command for usage');
  lines.push('- Exit 0 = success, 1 = error');
  lines.push('');

  lines.push('## Boundaries');
  lines.push('');
  lines.push('All files in this directory are generated. Do not edit manually.');
  lines.push('');

  return {
    fileName: 'AGENTS.md',
    content: lines.join('\n'),
  };
}

export function generateSkills(
  tables: Table[],
  customOperations: Operation[],
  toolName: string,
  targetName: string,
  registry?: TypeRegistry,
): GeneratedDocFile[] {
  const files: GeneratedDocFile[] = [];
  const skillName = `cli-${targetName}`;
  const referenceNames: string[] = [];

  // Context reference
  referenceNames.push('context');
  files.push({
    fileName: `${skillName}/references/context.md`,
    content: buildSkillReference({
      title: 'Context Management',
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

  // Auth reference
  referenceNames.push('auth');
  files.push({
    fileName: `${skillName}/references/auth.md`,
    content: buildSkillReference({
      title: 'Authentication',
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

  // Config reference
  referenceNames.push('config');
  files.push({
    fileName: `${skillName}/references/config.md`,
    content: buildSkillReference({
      title: 'Config Variables',
      description: `Manage per-context key-value configuration variables for ${toolName}`,
      usage: [
        `${toolName} config get <key>`,
        `${toolName} config set <key> <value>`,
        `${toolName} config list`,
        `${toolName} config delete <key>`,
      ],
      examples: [
        {
          description: 'Store and retrieve a config variable',
          code: [
            `${toolName} config set orgId abc-123`,
            `${toolName} config get orgId`,
          ],
        },
        {
          description: 'List all config variables',
          code: [`${toolName} config list`],
        },
      ],
    }),
  });

  // Table references
  for (const table of tables) {
    const { singularName } = getTableNames(table);
    const kebab = toKebabCase(singularName);
    const pk = getPrimaryKeyInfo(table)[0];
    const editableFields = getEditableFields(table, registry);
    const defaultFields = getFieldsWithDefaults(table, registry);
    const createFlags = [
      ...editableFields.filter((f) => !defaultFields.has(f.name)).map((f) => `--${f.name} <${cleanTypeName(f.type.gqlType)}>`),
      ...editableFields.filter((f) => defaultFields.has(f.name)).map((f) => `[--${f.name} <${cleanTypeName(f.type.gqlType)}>]`),
    ].join(' ');

    referenceNames.push(kebab);

    const skillSpecialGroups = categorizeSpecialFields(table, registry);
    const skillSpecialDesc = skillSpecialGroups.length > 0
      ? `CRUD operations for ${table.name} records via ${toolName} CLI\n\n` +
        skillSpecialGroups.map((g) => `**${g.label}:** ${g.fields.map((f) => `\`${f.name}\``).join(', ')}\n${g.description}`).join('\n\n')
      : `CRUD operations for ${table.name} records via ${toolName} CLI`;

    files.push({
      fileName: `${skillName}/references/${kebab}.md`,
      content: buildSkillReference({
        title: singularName,
        description: skillSpecialDesc,
        usage: [
          `${toolName} ${kebab} list`,
          `${toolName} ${kebab} list --where.<field>.<op> <value> --orderBy <values>`,
          `${toolName} ${kebab} list --limit 10 --after <cursor>`,
          `${toolName} ${kebab} find-first --where.<field>.<op> <value>`,
          ...(skillSpecialGroups.some((g) => g.category === 'search' || g.category === 'embedding')
            ? [`${toolName} ${kebab} search <query>`]
            : []),
          `${toolName} ${kebab} get --${pk.name} <${cleanTypeName(pk.gqlType)}>`,
          `${toolName} ${kebab} create ${createFlags}`,
          `${toolName} ${kebab} update --${pk.name} <${cleanTypeName(pk.gqlType)}> ${editableFields.map((f) => `[--${f.name} <${cleanTypeName(f.type.gqlType)}>]`).join(' ')}`,
          `${toolName} ${kebab} delete --${pk.name} <${cleanTypeName(pk.gqlType)}>`,
        ],
        examples: [
          {
            description: `List ${singularName} records`,
            code: [`${toolName} ${kebab} list`],
          },
          {
            description: `List ${singularName} records with pagination`,
            code: [`${toolName} ${kebab} list --limit 10 --offset 0`],
          },
          {
            description: `List ${singularName} records with cursor pagination`,
            code: [`${toolName} ${kebab} list --limit 10 --after <cursor>`],
          },
          {
            description: `Find first matching ${singularName}`,
            code: [`${toolName} ${kebab} find-first --where.${pk.name}.equalTo <value>`],
          },
          {
            description: `List ${singularName} records with field selection`,
            code: [`${toolName} ${kebab} list --fields id,${pk.name}`],
          },
          {
            description: `List ${singularName} records with filtering and ordering`,
            code: [`${toolName} ${kebab} list --where.${pk.name}.equalTo <value> --orderBy ${pk.name.replace(/([A-Z])/g, '_$1').toUpperCase()}_ASC`],
          },
          ...(skillSpecialGroups.some((g) => g.category === 'search' || g.category === 'embedding')
            ? [{
                description: `Search ${singularName} records`,
                code: [`${toolName} ${kebab} search "query text" --limit 10 --fields id,searchScore`],
              }]
            : []),
          {
            description: `Create a ${singularName}`,
            code: [
              `${toolName} ${kebab} create ${createFlags}`,
            ],
          },
          {
            description: `Get a ${singularName} by ${pk.name}`,
            code: [`${toolName} ${kebab} get --${pk.name} <value>`],
          },
        ],
      }),
    });
  }

  // Custom operation references
  for (const op of customOperations) {
    const kebab = toKebabCase(op.name);
    const flat = flattenArgs(op.args, registry);
    const usage =
      flat.length > 0
        ? `${toolName} ${kebab} ${flattenedArgsToFlags(flat)}`
        : `${toolName} ${kebab}`;

    referenceNames.push(kebab);

    files.push({
      fileName: `${skillName}/references/${kebab}.md`,
      content: buildSkillReference({
        title: op.name,
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

  // Overview SKILL.md
  const tableKebabs = tables.slice(0, 5).map((t) => toKebabCase(getTableNames(t).singularName));
  files.push({
    fileName: `${skillName}/SKILL.md`,
    content: buildSkillFile(
      {
        name: skillName,
        description: `CLI tool (${toolName}) for the ${targetName} API — provides CRUD commands for ${tables.length} tables and ${customOperations.length} custom operations`,
        usage: [
          `# Context management`,
          `${toolName} context create <name> --endpoint <url>`,
          `${toolName} context use <name>`,
          '',
          `# Authentication`,
          `${toolName} auth set-token <token>`,
          '',
          `# Config variables`,
          `${toolName} config set <key> <value>`,
          `${toolName} config get <key>`,
          '',
          `# CRUD for any table (e.g. ${tableKebabs[0] || 'model'})`,
          `${toolName} ${tableKebabs[0] || 'model'} list`,
          `${toolName} ${tableKebabs[0] || 'model'} get --id <value>`,
          `${toolName} ${tableKebabs[0] || 'model'} create --<field> <value>`,
          '',
          `# Non-interactive mode (skip all prompts, use flags only)`,
          `${toolName} --no-tty ${tableKebabs[0] || 'model'} list`,
        ],
        examples: [
          {
            description: 'Set up and query',
            code: [
              `${toolName} context create local --endpoint http://localhost:5000/graphql`,
              `${toolName} context use local`,
              `${toolName} auth set-token <token>`,
              `${toolName} ${tableKebabs[0] || 'model'} list`,
            ],
          },
          {
            description: 'Non-interactive mode (for scripts and CI)',
            code: [
              `${toolName} --no-tty ${tableKebabs[0] || 'model'} create --<field> <value>`,
            ],
          },
        ],
      },
      referenceNames,
    ),
  });

  return files;
}

export interface MultiTargetDocsInput {
  toolName: string;
  builtinNames: { auth: string; context: string; config: string };
  registry?: TypeRegistry;
  targets: Array<{
    name: string;
    endpoint: string;
    tables: Table[];
    customOperations: Operation[];
    isAuthTarget?: boolean;
  }>;
}

export function generateMultiTargetReadme(
  input: MultiTargetDocsInput,
): GeneratedDocFile {
  const { toolName, builtinNames, targets, registry } = input;
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
  lines.push(`| \`${builtinNames.config}\` | Manage config key-value store (per-context) |`);
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

  lines.push(`### \`${builtinNames.config}\``);
  lines.push('');
  lines.push('Manage per-context key-value configuration variables.');
  lines.push('');
  lines.push('| Subcommand | Description |');
  lines.push('|------------|-------------|');
  lines.push('| `get <key>` | Get a config value |');
  lines.push('| `set <key> <value>` | Set a config value |');
  lines.push('| `list` | List all config values |');
  lines.push('| `delete <key>` | Delete a config value |');
  lines.push('');
  lines.push(`Variables are scoped to the active context and stored at \`~/.${toolName}/config/\`.`);
  lines.push('');

  lines.push('## SDK Helpers');
  lines.push('');
  lines.push('The generated `helpers.ts` provides typed client factories for use in scripts and services:');
  lines.push('');
  lines.push('```typescript');
  for (const tgt of targets) {
    const pascalName = tgt.name.charAt(0).toUpperCase() + tgt.name.slice(1);
    lines.push(`import { create${pascalName}Client } from './helpers';`);
  }
  lines.push('');
  for (const tgt of targets) {
    const pascalName = tgt.name.charAt(0).toUpperCase() + tgt.name.slice(1);
    lines.push(`const ${tgt.name} = create${pascalName}Client();`);
  }
  lines.push('```');
  lines.push('');
  lines.push('Credential resolution order:');
  lines.push(`1. appstash store (\`~/.${toolName}/config/\`)`);
  lines.push(`2. Environment variables (\`${toolName.toUpperCase().replace(/-/g, '_')}_TOKEN\`, \`${toolName.toUpperCase().replace(/-/g, '_')}_<TARGET>_ENDPOINT\`)`);
  lines.push('3. Throws with actionable error message');
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
      const editableFields = getEditableFields(table, registry);
      const defaultFields = getFieldsWithDefaults(table, registry);

      lines.push(`### \`${tgt.name}:${kebab}\``);
      lines.push('');
      lines.push(`CRUD operations for ${table.name} records.`);
      lines.push('');
      lines.push('| Subcommand | Description |');
      lines.push('|------------|-------------|');
      lines.push(`| \`list\` | List all ${singularName} records |`);
      lines.push(`| \`find-first\` | Find first matching ${singularName} record |`);
      const mtReadmeSpecialGroups = categorizeSpecialFields(table, registry);
      const mtReadmeHasSearch = mtReadmeSpecialGroups.some(
        (g) => g.category === 'search' || g.category === 'embedding',
      );
      if (mtReadmeHasSearch) {
        lines.push(`| \`search <query>\` | Search ${singularName} records |`);
      }
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
        lines.push(`| \`${f.name}\` | ${cleanTypeName(f.type.gqlType)} |`);
      }
      lines.push('');
      const requiredCreate = editableFields.filter((f) => !defaultFields.has(f.name));
      const optionalCreate = editableFields.filter((f) => defaultFields.has(f.name));
      if (requiredCreate.length > 0) {
        lines.push(`**Required create fields:** ${requiredCreate.map((f) => `\`${f.name}\``).join(', ')}`);
      }
      if (optionalCreate.length > 0) {
        lines.push(`**Optional create fields (backend defaults):** ${optionalCreate.map((f) => `\`${f.name}\``).join(', ')}`);
      }
      if (requiredCreate.length === 0 && optionalCreate.length === 0) {
        lines.push(`**Create fields:** ${editableFields.map((f) => `\`${f.name}\``).join(', ')}`);
      }
      const mtSpecialGroups = categorizeSpecialFields(table, registry);
      lines.push(...buildSpecialFieldsMarkdown(mtSpecialGroups));
      lines.push('');
    }

    for (const op of tgt.customOperations) {
      const kebab = toKebabCase(op.name);
      const flat = flattenArgs(op.args, registry);
      lines.push(`### \`${tgt.name}:${kebab}\``);
      lines.push('');
      lines.push(op.description || op.name);
      lines.push('');
      lines.push(`- **Type:** ${op.kind}`);
      if (flat.length > 0) {
        lines.push('- **Arguments:**');
        lines.push('');
        lines.push('  | Argument | Type |');
        lines.push('  |----------|------|');
        for (const a of flat) {
          const reqLabel = a.required ? ' (required)' : '';
          lines.push(`  | \`--${a.flag}\` | ${a.type}${reqLabel} |`);
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
  lines.push('## Non-Interactive Mode');
  lines.push('');
  lines.push('Use `--no-tty` to skip all interactive prompts (useful for scripts and CI):');
  lines.push('');
  lines.push('```bash');
  if (targets.length > 0 && targets[0].tables.length > 0) {
    const tgt = targets[0];
    const kebab = toKebabCase(getTableNames(tgt.tables[0]).singularName);
    lines.push(`${toolName} --no-tty ${tgt.name}:${kebab} create --name "Example"`);
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
  const totalTables = targets.reduce((sum, t) => sum + t.tables.length, 0);
  const totalCustomOps = targets.reduce((sum, t) => sum + t.customOperations.length, 0);

  lines.push(`# ${toolName} CLI`);
  lines.push('');
  lines.push('<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->');
  lines.push('');

  lines.push('## Stack');
  lines.push('');
  lines.push(`- Unified multi-target CLI for GraphQL APIs (TypeScript)`);
  lines.push(`- ${targets.length} target${targets.length !== 1 ? 's' : ''}: ${targets.map((t) => t.name).join(', ')}`);
  lines.push(`- ${totalTables} table${totalTables !== 1 ? 's' : ''}${totalCustomOps > 0 ? `, ${totalCustomOps} custom operation${totalCustomOps !== 1 ? 's' : ''}` : ''}`);
  lines.push(`- Config stored at \`~/.${toolName}/config/\` via appstash`);
  lines.push('');

  lines.push('## Quick Start');
  lines.push('');
  lines.push('```bash');
  lines.push(`${toolName} ${builtinNames.context} create dev`);
  lines.push(`${toolName} ${builtinNames.context} use dev`);
  lines.push(`${toolName} ${builtinNames.auth} set-token <token>`);
  lines.push('```');
  lines.push('');

  lines.push('## Command Format');
  lines.push('');
  lines.push('```');
  lines.push(`${toolName} <target>:<command> <subcommand> [flags]`);
  lines.push('```');
  lines.push('');

  lines.push('## Resources');
  lines.push('');
  lines.push(`- **Full API reference:** [README.md](./README.md) — CRUD docs for all ${totalTables} tables across ${targets.length} targets`);
  lines.push('- **Schema types:** [types.ts](./types.ts)');
  lines.push('- **SDK helpers:** [helpers.ts](./helpers.ts) — typed client factories');
  lines.push('');

  lines.push('## Conventions');
  lines.push('');
  lines.push('- All commands output JSON to stdout');
  lines.push('- Use `--help` on any command for usage');
  lines.push('- Exit 0 = success, 1 = error');
  lines.push('');

  lines.push('## Boundaries');
  lines.push('');
  lines.push('All files in this directory are generated. Do not edit manually.');
  lines.push('');

  return {
    fileName: 'AGENTS.md',
    content: lines.join('\n'),
  };
}

export function generateMultiTargetSkills(
  input: MultiTargetDocsInput,
): GeneratedDocFile[] {
  const { toolName, builtinNames, targets, registry } = input;
  const files: GeneratedDocFile[] = [];

  // Generate one skill per target, plus a shared cli-common skill for context/auth
  const commonSkillName = 'cli-common';
  const commonReferenceNames: string[] = [];

  const contextCreateFlags = targets
    .map((t) => `--${t.name}-endpoint <url>`)
    .join(' ');

  // Context reference
  commonReferenceNames.push('context');
  files.push({
    fileName: `${commonSkillName}/references/context.md`,
    content: buildSkillReference({
      title: 'Context Management',
      description: `Manage API endpoint contexts for ${toolName} (multi-target: ${targets.map((t) => t.name).join(', ')})`,
      usage: [
        `${toolName} ${builtinNames.context} create <name>`,
        `${toolName} ${builtinNames.context} list`,
        `${toolName} ${builtinNames.context} use <name>`,
        `${toolName} ${builtinNames.context} current`,
        `${toolName} ${builtinNames.context} delete <name>`,
      ],
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
      ],
    }),
  });

  // Auth reference
  commonReferenceNames.push('auth');
  files.push({
    fileName: `${commonSkillName}/references/auth.md`,
    content: buildSkillReference({
      title: 'Authentication',
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

  // Config reference
  commonReferenceNames.push('config');
  files.push({
    fileName: `${commonSkillName}/references/config.md`,
    content: buildSkillReference({
      title: 'Config Variables',
      description: `Manage per-context key-value configuration variables for ${toolName}`,
      usage: [
        `${toolName} ${builtinNames.config} get <key>`,
        `${toolName} ${builtinNames.config} set <key> <value>`,
        `${toolName} ${builtinNames.config} list`,
        `${toolName} ${builtinNames.config} delete <key>`,
      ],
      examples: [
        {
          description: 'Store and retrieve a config variable',
          code: [
            `${toolName} ${builtinNames.config} set orgId abc-123`,
            `${toolName} ${builtinNames.config} get orgId`,
          ],
        },
        {
          description: 'List all config variables',
          code: [`${toolName} ${builtinNames.config} list`],
        },
      ],
    }),
  });

  // Common SKILL.md
  files.push({
    fileName: `${commonSkillName}/SKILL.md`,
    content: buildSkillFile(
      {
        name: commonSkillName,
        description: `Shared CLI utilities for ${toolName} — context management, authentication, and config across targets: ${targets.map((t) => t.name).join(', ')}`,
        usage: [
          `# Context management`,
          `${toolName} ${builtinNames.context} create <name>`,
          `${toolName} ${builtinNames.context} use <name>`,
          '',
          `# Authentication`,
          `${toolName} ${builtinNames.auth} set-token <token>`,
          `${toolName} ${builtinNames.auth} status`,
          '',
          `# Config variables`,
          `${toolName} ${builtinNames.config} set <key> <value>`,
          `${toolName} ${builtinNames.config} get <key>`,
          `${toolName} ${builtinNames.config} list`,
        ],
        examples: [
          {
            description: 'Set up and authenticate',
            code: [
              `${toolName} ${builtinNames.context} create local`,
              `${toolName} ${builtinNames.context} use local`,
              `${toolName} ${builtinNames.auth} set-token <token>`,
            ],
          },
          {
            description: 'Store a config variable',
            code: [
              `${toolName} ${builtinNames.config} set orgId abc-123`,
            ],
          },
        ],
      },
      commonReferenceNames,
    ),
  });

  // Generate one skill per target with table/op references
  for (const tgt of targets) {
    const tgtSkillName = `cli-${tgt.name}`;
    const tgtReferenceNames: string[] = [];

    for (const table of tgt.tables) {
      const { singularName } = getTableNames(table);
      const kebab = toKebabCase(singularName);
      const pk = getPrimaryKeyInfo(table)[0];
      const editableFields = getEditableFields(table, registry);
      const defaultFields = getFieldsWithDefaults(table, registry);
      const createFlags = [
        ...editableFields.filter((f) => !defaultFields.has(f.name)).map((f) => `--${f.name} <${cleanTypeName(f.type.gqlType)}>`),
        ...editableFields.filter((f) => defaultFields.has(f.name)).map((f) => `[--${f.name} <${cleanTypeName(f.type.gqlType)}>]`),
      ].join(' ');
      const cmd = `${tgt.name}:${kebab}`;

      tgtReferenceNames.push(kebab);

      const mtSkillSpecialGroups = categorizeSpecialFields(table, registry);
      const mtSkillSpecialDesc = mtSkillSpecialGroups.length > 0
        ? `CRUD operations for ${table.name} records via ${toolName} CLI (${tgt.name} target)\n\n` +
          mtSkillSpecialGroups.map((g) => `**${g.label}:** ${g.fields.map((f) => `\`${f.name}\``).join(', ')}\n${g.description}`).join('\n\n')
        : `CRUD operations for ${table.name} records via ${toolName} CLI (${tgt.name} target)`;

      files.push({
        fileName: `${tgtSkillName}/references/${kebab}.md`,
        content: buildSkillReference({
          title: singularName,
          description: mtSkillSpecialDesc,
          usage: [
            `${toolName} ${cmd} list`,
            `${toolName} ${cmd} list --where.<field>.<op> <value> --orderBy <values>`,
            `${toolName} ${cmd} list --limit 10 --after <cursor>`,
            `${toolName} ${cmd} find-first --where.<field>.<op> <value>`,
            ...(mtSkillSpecialGroups.some((g) => g.category === 'search' || g.category === 'embedding')
              ? [`${toolName} ${cmd} search <query>`]
              : []),
            `${toolName} ${cmd} get --${pk.name} <${cleanTypeName(pk.gqlType)}>`,
            `${toolName} ${cmd} create ${createFlags}`,
            `${toolName} ${cmd} update --${pk.name} <${cleanTypeName(pk.gqlType)}> ${editableFields.map((f) => `[--${f.name} <${cleanTypeName(f.type.gqlType)}>]`).join(' ')}`,
            `${toolName} ${cmd} delete --${pk.name} <${cleanTypeName(pk.gqlType)}>`,
          ],
          examples: [
            {
              description: `List ${singularName} records`,
              code: [`${toolName} ${cmd} list`],
            },
            {
              description: `List ${singularName} records with pagination`,
              code: [`${toolName} ${cmd} list --limit 10 --offset 0`],
            },
            {
              description: `List ${singularName} records with cursor pagination`,
              code: [`${toolName} ${cmd} list --limit 10 --after <cursor>`],
            },
            {
              description: `Find first matching ${singularName}`,
              code: [`${toolName} ${cmd} find-first --where.${pk.name}.equalTo <value>`],
            },
            {
              description: `List ${singularName} records with filtering and ordering`,
              code: [`${toolName} ${cmd} list --where.${pk.name}.equalTo <value> --orderBy ${pk.name.replace(/([A-Z])/g, '_$1').toUpperCase()}_ASC`],
            },
            ...(mtSkillSpecialGroups.some((g) => g.category === 'search' || g.category === 'embedding')
              ? [{
                  description: `Search ${singularName} records`,
                  code: [`${toolName} ${cmd} search "query text" --limit 10 --fields id,searchScore`],
                }]
              : []),
            {
              description: `Create a ${singularName}`,
              code: [
                `${toolName} ${cmd} create ${createFlags}`,
              ],
            },
          ],
        }),
      });
    }

    for (const op of tgt.customOperations) {
      const kebab = toKebabCase(op.name);
      const cmd = `${tgt.name}:${kebab}`;
      const flat = flattenArgs(op.args, registry);
      const baseUsage =
        flat.length > 0
          ? `${toolName} ${cmd} ${flattenedArgsToFlags(flat)}`
          : `${toolName} ${cmd}`;
      const usageLines = [baseUsage];
      if (tgt.isAuthTarget && op.kind === 'mutation') {
        usageLines.push(`${baseUsage} --save-token`);
      }

      tgtReferenceNames.push(kebab);

      files.push({
        fileName: `${tgtSkillName}/references/${kebab}.md`,
        content: buildSkillReference({
          title: op.name,
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

    // Target SKILL.md
    const firstKebab = tgt.tables.length > 0
      ? toKebabCase(getTableNames(tgt.tables[0]).singularName)
      : 'model';
    files.push({
      fileName: `${tgtSkillName}/SKILL.md`,
      content: buildSkillFile(
        {
          name: tgtSkillName,
          description: `CLI commands for the ${tgt.name} API target — ${tgt.tables.length} tables and ${tgt.customOperations.length} custom operations via ${toolName}`,
          usage: [
            `# CRUD for ${tgt.name} tables (e.g. ${firstKebab})`,
            `${toolName} ${tgt.name}:${firstKebab} list`,
            `${toolName} ${tgt.name}:${firstKebab} get --id <value>`,
            `${toolName} ${tgt.name}:${firstKebab} create --<field> <value>`,
            '',
            `# Non-interactive mode (skip all prompts, use flags only)`,
            `${toolName} --no-tty ${tgt.name}:${firstKebab} list`,
          ],
          examples: [
            {
              description: `Query ${tgt.name} records`,
              code: [`${toolName} ${tgt.name}:${firstKebab} list`],
            },
            {
              description: 'Non-interactive mode (for scripts and CI)',
              code: [
                `${toolName} --no-tty ${tgt.name}:${firstKebab} create --<field> <value>`,
              ],
            },
          ],
        },
        tgtReferenceNames,
      ),
    });
  }

  return files;
}
