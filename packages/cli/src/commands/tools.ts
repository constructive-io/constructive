import {
  CliError,
  type CommandContext,
  type CommandDefinition,
  ExitCode,
  type NextStep,
  toCliCommands,
  toolCommand,
  type ToolCommandEntry
} from '@agentic-kit/command';
import {
  type AccessPolicy,
  addRelationTool,
  applyTemplateTool,
  type Blueprint,
  constructiveGateDeps,
  createEntityTypeTool,
  createFieldTool,
  createTemplateTool,
  dataNodesForPolicies,
  deleteEntityTypeTool,
  deleteFieldTool,
  deleteTableTool,
  deleteTemplateTool,
  describeSchemaTool,
  type FieldBlueprint,
  fieldsAddedByNodes,
  listEntityTypesTool,
  listTemplatesTool,
  type ProvisionBlueprintDetails,
  provisionBlueprintTool,
  provisionDatabaseTool,
  replaceDatabaseTool,
  retypeFieldTool,
  runCodegenTool,
  type TableBlueprint,
  updateFieldTool,
  updateTemplateTool
} from '@agentic-kit/db-tools';
import { createConstructiveGatePolicy, type ToolCallSuggestion } from '@agentic-kit/harness';
import { z } from 'zod';

import type { CliCode } from '../errors';
import { bindTools, CLI_NAME, failureNext, openSession } from '../session';
import { accessEntries, OWNER_NODE, OWNER_ONLY_RULE, parseRules, RULE_FLAG, RULE_TYPES_NOTE } from './access';

/** A next step of the success hook of a tool command, built for its run. */
const step = (words: string[], why: string) => (ctx: CommandContext): NextStep => ctx.next(words, why);

const SCHEMA_SHOW = step(['schema', 'show'], 'See the tables and fields');
const TEMPLATE_LIST = step(['template', 'list'], 'See the templates');
const ENTITY_TYPE_LIST = step(['entity-type', 'list'], 'See the entity types');

/** The words of `table add` for a table whose rows only their owner reads and changes. */
const ownerOnly = (name: string, fields: readonly string[] = []): string[] =>
  ['table', 'add', name, ...fields.flatMap((field) => ['--field', field]), '--node', OWNER_NODE, '--rule', JSON.stringify(OWNER_ONLY_RULE)];

const FIRST_TABLE = step(ownerOnly('tasks', ['title:text:required']), 'Add a first table, whose rows only their owner reads and changes');

const FIELD_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const FIELD_TYPE = /^[A-Za-z][A-Za-z0-9_]*(\[\])*$/;

function badInput(flag: string, spec: string, why: string, hint: string): CliError {
  return new CliError<CliCode>({ code: 'invalid-input', message: `${flag} "${spec}" is not valid: ${why}.`, hint, exitCode: ExitCode.usage, details: { flag, value: spec } });
}

const badField = (spec: string, why: string): CliError =>
  badInput('--field', spec, why, 'Write each field as name:type or name:type:required, for example --field title:text:required --field done:boolean.');

type Node = string | { $type: string; data?: Record<string, unknown> };

/** A `--node`: a Data node as its type (DataDirectOwner), or as JSON with its parameters; the tool checks the type and the data. */
function parseNode(spec: string): Node {
  const hint = 'Give a Data node as its type, for example --node DataDirectOwner, or as JSON: --node \'{"$type":"DataDirectOwner","data":{"owner_field_name":"owner_id"}}\'.';
  if (!spec.trimStart().startsWith('{')) {
    if (!/^[A-Z][A-Za-z0-9]*$/.test(spec)) throw badInput('--node', spec, 'it is neither a node type nor a JSON object', hint);
    return spec;
  }
  let node: unknown;
  try {
    node = JSON.parse(spec);
  } catch (error) {
    throw badInput('--node', spec, `it is not JSON (${(error as Error).message})`, hint);
  }
  if (typeof node !== 'object' || node === null || typeof (node as { $type?: unknown }).$type !== 'string') throw badInput('--node', spec, 'it has no "$type"', hint);
  return node as Node;
}

/**
 * The columns a new table gets without a --field: the tool drops a field of the same name in favour of the node's
 * column, so a --field naming one is refused instead of being lost without a word.
 */
function nodeColumns(nodes: readonly Node[], rules: readonly AccessPolicy[]): string[] {
  const needed = dataNodesForPolicies(rules.map((rule) => ({ type: rule.$type, data: rule.data ?? {} }))).nodes;
  return fieldsAddedByNodes(['DataId', ...nodes, ...needed, 'DataTimestamps']).fields.map((column) => column.name);
}

function parseField(spec: string, taken: readonly string[]): FieldBlueprint {
  const parts = spec.split(':');
  if (parts.length < 2 || parts.length > 3) throw badField(spec, 'write it as name:type, or name:type:required');
  const [name, type, required] = parts;
  if (!FIELD_NAME.test(name)) throw badField(spec, `the name "${name}" must start with a letter or _, and hold only letters, digits and _`);
  if (!FIELD_TYPE.test(type)) throw badField(spec, `the type "${type}" is not a type name, such as text, integer, boolean, timestamptz or text[]`);
  if (required !== undefined && required !== 'required') throw badField(spec, `the third part may only be "required", not "${required}"`);
  if (taken.includes(name)) throw badField(spec, `the table already gets ${taken.join(', ')}`);
  return required ? { name, type, is_required: true } : { name, type };
}

/** The input of `table add`. */
export type TableAddInput = { name: string; field?: string[]; node?: string[]; rule?: string[] };

/** The refusal of a table with no rule, with a ready example the person can copy. */
function noRule(input: TableAddInput, ctx: CommandContext): CliError {
  const rule = JSON.stringify(OWNER_ONLY_RULE);
  return new CliError<CliCode>({
    code: 'missing-input',
    message: `"${CLI_NAME} table add" needs at least one --rule: with row security on and no rule, no one can read or change the rows, so it makes no such table.`,
    hint:
      `For a table whose rows only their owner reads and changes, add --node ${OWNER_NODE} --rule '${rule}'. ` +
      `"${CLI_NAME} access types" lists the rule types in plain words.`,
    exitCode: ExitCode.usage,
    details: { missing: ['--rule'], flag: '--rule', example: { node: OWNER_NODE, rule: OWNER_ONLY_RULE } },
    next: [
      ctx.next(ownerOnly(input.name, input.field), 'Add it with one rule: only the person whose id is in its owner_id column reads and changes a row'),
      ctx.next(['access', 'types'], 'List the rule types in plain words')
    ]
  });
}

/** The blueprint of one new table, from `table add <name> --field name:type[:required] --node <node> --rule <rule>`. */
export function tableBlueprint(input: TableAddInput, ctx: CommandContext): Blueprint {
  const rules = parseRules(input.rule ?? []);
  if (!rules.length) throw noRule(input, ctx);
  const nodes = (input.node ?? []).map(parseNode);
  const taken = nodeColumns(nodes, rules);
  const fields: FieldBlueprint[] = [];
  for (const spec of input.field ?? []) {
    const field = parseField(spec, taken);
    if (fields.some((known) => known.name === field.name)) throw badField(spec, `the table already has a field named "${field.name}"`);
    fields.push(field);
  }
  const table = { table_name: input.name, nodes, policies: rules, fields } as unknown as TableBlueprint;
  return { name: input.name, description: `Add the table "${input.name}"`, definition: { tables: [table] } };
}

/** What table add made, under the names the backend stored, with one sentence when they are not the names given. */
export function tableAddText(details: ProvisionBlueprintDetails): string {
  return details.tables
    .flatMap((table) => {
      const fields = table.fields.map((field) => field.name);
      const renamed = [
        ...(table.requestedName ? [`the table "${table.requestedName}" as "${table.name}"`] : []),
        ...table.fields.filter((field) => field.requestedName).map((field) => `the field "${field.requestedName}" as "${field.name}"`)
      ];
      return [
        `Added the table "${table.name}" with ${fields.length ? `the fields ${fields.join(', ')}` : 'no fields of its own'}.`,
        ...(renamed.length ? [`The backend stored ${renamed.join(', and ')}; use the stored names in other commands.`] : [])
      ];
    })
    .join('\n');
}

/** The steps after table add, with the table under the name the backend stored. */
export function tableAddNext(details: ProvisionBlueprintDetails, ctx: CommandContext): NextStep[] {
  return [SCHEMA_SHOW(ctx), ...details.tables.map((table) => ctx.next(['access', 'explain', table.name], 'See its rules in plain words'))];
}

export const gate = createConstructiveGatePolicy(constructiveGateDeps());

export const toolEntries: ToolCommandEntry[] = [
  toolCommand(provisionDatabaseTool, {
    name: 'db create',
    summary: 'Create a database and bind this directory to it',
    description:
      'Provisions a database under the signed-in account and writes its binding (DATABASE_ID, DATABASE_NAME and the endpoints) to the .env of this directory. ' +
      'A directory already bound to a live database of this account keeps it. When a call returns while the database is still provisioning, run it again with the same name to keep waiting; ' +
      'a different name starts a second database. To replace a database that is gone, use db recreate.',
    positionals: ['database_name'],
    examples: [
      { command: `${CLI_NAME} db create my-app --dry-run`, description: 'Show the plan; nothing changes' },
      { command: `${CLI_NAME} db create my-app --yes`, description: 'Create it; this can take a few minutes' }
    ],
    next: (details, _params, ctx) => (details.skipped ? [SCHEMA_SHOW(ctx)] : [SCHEMA_SHOW(ctx), FIRST_TABLE(ctx)])
  }),
  toolCommand(replaceDatabaseTool, {
    name: 'db recreate',
    summary: 'Bind this directory to a new, empty database in place of its current one',
    description:
      'Provisions a new database and binds this directory to it, for a database that is gone, that belongs to another account, or for a clean rebuild. ' +
      'The old database is kept on the backend and its binding is archived in .env, but its tables and records do not carry over.',
    positionals: ['database_name'],
    examples: [{ command: `${CLI_NAME} db recreate my-app --dry-run`, description: 'Show the plan; nothing changes' }],
    next: (_details, _params, ctx) => [SCHEMA_SHOW(ctx)]
  }),
  toolCommand(runCodegenTool, {
    name: 'db codegen',
    summary: 'Generate the typed SDK of the app in packages/app'
  }),
  toolCommand(describeSchemaTool, {
    name: 'schema show',
    summary: 'Show the tables and fields of the bound database, and the rule types of each table'
  }),
  toolCommand(provisionBlueprintTool, {
    name: 'table add',
    summary: 'Add a table with fields and the rules that say who reads and changes its rows',
    description:
      'Adds one table to the bound database. Each --field is name:type or name:type:required. Each --node is a Data node, as its type (DataDirectOwner) or as JSON with its data. ' +
      'Each --rule is a rule as JSON, and at least one is needed: with no --rule it stops with exit 2 and gives an owner-only example to copy. ' +
      'Every table also gets id, created_at and updated_at, and the columns its rules need. To add several related tables at once, use blueprint apply.',
    input: z.object({
      name: z.string().describe('Table name in snake_case, plural, for example tasks'),
      field: z.array(z.string()).optional().describe('A field as name:type or name:type:required'),
      node: z.array(z.string()).optional().describe('A Data node, as its type (DataDirectOwner) or as JSON: {"$type": "DataDirectOwner", "data": {...}}'),
      rule: RULE_FLAG
    }),
    positionals: ['name'],
    mapInput: (input: TableAddInput, ctx) => tableBlueprint(input, ctx),
    // A suggested blueprint goes to blueprint apply: these flags cannot say one.
    toInput: () => undefined,
    examples: [
      {
        command: `${CLI_NAME} ${ownerOnly('tasks', ['title:text:required', 'done:boolean']).map((word) => (word.startsWith('{') ? `'${word}'` : word)).join(' ')} --dry-run`,
        description: 'Rows that only their owner reads and changes'
      }
    ],
    notes: [RULE_TYPES_NOTE],
    text: tableAddText,
    next: (details, _params, ctx) => tableAddNext(details, ctx)
  }),
  toolCommand(deleteTableTool, {
    name: 'table delete',
    summary: 'Delete a table and its data',
    positionals: ['table_name'],
    examples: [{ command: `${CLI_NAME} table delete tasks --yes` }],
    next: (_details, _params, ctx) => [SCHEMA_SHOW(ctx)]
  }),
  toolCommand(createFieldTool, {
    name: 'field add',
    summary: 'Add a field to a table',
    positionals: ['table_name', 'field_name'],
    examples: [{ command: `${CLI_NAME} field add tasks notes --type text --yes` }],
    next: (_details, _params, ctx) => [SCHEMA_SHOW(ctx)]
  }),
  toolCommand(updateFieldTool, {
    name: 'field update',
    summary: 'Rename a field, or change whether it is required or unique, or its default',
    positionals: ['table_name', 'field_name'],
    examples: [{ command: `${CLI_NAME} field update tasks notes --new-name details --yes` }],
    next: (_details, _params, ctx) => [SCHEMA_SHOW(ctx)]
  }),
  toolCommand(retypeFieldTool, {
    name: 'field retype',
    summary: 'Change the type of a field; the cast can lose data',
    positionals: ['table_name', 'field_name'],
    examples: [{ command: `${CLI_NAME} field retype tasks estimate --type integer --dry-run` }],
    next: (_details, _params, ctx) => [SCHEMA_SHOW(ctx)]
  }),
  toolCommand(deleteFieldTool, {
    name: 'field delete',
    summary: 'Delete a field and its data',
    positionals: ['table_name', 'field_name'],
    examples: [{ command: `${CLI_NAME} field delete tasks notes --yes` }],
    next: (_details, _params, ctx) => [SCHEMA_SHOW(ctx)]
  }),
  toolCommand(addRelationTool, {
    name: 'relation add',
    summary: 'Link two existing tables',
    positionals: ['source_table', 'target_table'],
    examples: [{ command: `${CLI_NAME} relation add tasks projects --field-name project_id --yes`, description: 'tasks.project_id references projects' }],
    next: (_details, _params, ctx) => [SCHEMA_SHOW(ctx)]
  }),
  toolCommand(provisionBlueprintTool, {
    name: 'blueprint apply',
    summary: 'Create tables, fields, rules and relations from a blueprint',
    examples: [{ command: `${CLI_NAME} blueprint apply --input @blueprint.json --dry-run`, description: 'Show the tables the blueprint makes' }],
    next: (_details, _params, ctx) => [SCHEMA_SHOW(ctx)]
  }),
  ...accessEntries,
  toolCommand(listEntityTypesTool, {
    name: 'entity-type list',
    summary: 'List the entity types of the bound database'
  }),
  toolCommand(createEntityTypeTool, {
    name: 'entity-type create',
    summary: 'Create an entity type (an org, a team, a project) with its table and memberships',
    positionals: ['name'],
    examples: [{ command: `${CLI_NAME} entity-type create team --has-invites --yes` }],
    next: (_details, _params, ctx) => [ENTITY_TYPE_LIST(ctx)]
  }),
  toolCommand(deleteEntityTypeTool, {
    name: 'entity-type delete',
    summary: 'Delete the registration of an entity type; its table stays',
    positionals: ['entity_type_id'],
    examples: [{ command: `${CLI_NAME} entity-type delete <id> --dry-run`, description: 'The id comes from entity-type list' }],
    next: (_details, _params, ctx) => [ENTITY_TYPE_LIST(ctx)]
  }),
  toolCommand(listTemplatesTool, {
    name: 'template list',
    summary: 'List the blueprint templates'
  }),
  toolCommand(createTemplateTool, {
    name: 'template create',
    summary: 'Save a blueprint of this database as a template',
    positionals: ['displayName'],
    examples: [{ command: `${CLI_NAME} template create 'Task tracker' --yes` }],
    next: (_details, _params, ctx) => [TEMPLATE_LIST(ctx)]
  }),
  toolCommand(applyTemplateTool, {
    name: 'template apply',
    summary: 'Create the tables of a template in the bound database',
    positionals: ['templateName'],
    examples: [{ command: `${CLI_NAME} template apply 'Task tracker' --dry-run` }],
    next: (_details, _params, ctx) => [SCHEMA_SHOW(ctx)]
  }),
  toolCommand(updateTemplateTool, {
    name: 'template update',
    summary: 'Change the name, description, categories, tags or visibility of a template',
    positionals: ['templateName'],
    examples: [{ command: `${CLI_NAME} template update 'Task tracker' --patch '{"visibility":"public"}' --yes` }],
    next: (_details, _params, ctx) => [TEMPLATE_LIST(ctx)]
  }),
  toolCommand(deleteTemplateTool, {
    name: 'template delete',
    summary: 'Delete a template',
    positionals: ['templateName'],
    examples: [{ command: `${CLI_NAME} template delete 'Task tracker' --yes` }],
    next: (_details, _params, ctx) => [TEMPLATE_LIST(ctx)]
  })
];

/** Points the tools at the session of the run (`--context` or the active one), before the tool or the gate reads the host. */
const bound = async (ctx: CommandContext): Promise<void> => bindTools(await openSession(ctx));

/**
 * The tool commands of `entries`, each bound to the session of the run in every step it takes: a read's run, and a
 * change's plan and apply. `onUnrenderedCall` hears of a call a tool suggests that no command makes.
 */
export function createToolCommands(
  list: readonly ToolCommandEntry[],
  onUnrenderedCall?: (call: ToolCallSuggestion, reason: string) => void
): CommandDefinition[] {
  return toCliCommands(list, { gate, failureNext, onUnrenderedCall }).map((command): CommandDefinition => {
    if (command.effect === 'read') {
      const { run } = command;
      return { ...command, async run(input, ctx) { await bound(ctx); return run(input, ctx); } };
    }
    const { plan, apply } = command;
    return {
      ...command,
      async plan(input, ctx) {
        await bound(ctx);
        return plan(input, ctx);
      },
      async apply(input, planned, ctx) {
        await bound(ctx);
        return apply(input, planned, ctx);
      }
    };
  });
}

export const toolCommands = createToolCommands(toolEntries);
