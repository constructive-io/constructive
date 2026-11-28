import { CliError, type CommandContext, ExitCode, type NextStep, toolCommand } from '@agentic-kit/command';
import {
  type AccessFinding,
  type AccessPolicy,
  addPoliciesTool,
  type DataNodeNeed,
  describePolicyTypeTool,
  explainAccessTool,
  type ExplainedTable,
  setAccessTool,
  type TableKind
} from '@agentic-kit/db-tools';
import { alignColumns as columns } from '@agentic-kit/harness';
import { z } from 'zod';

import type { CliCode } from '../errors';
import { CLI_NAME } from '../session';

type PolicyTypeDetails = Awaited<ReturnType<typeof describePolicyTypeTool.execute>>['details'];

/** The rule shape every access command takes, in the words of its help. */
export const RULE_SHAPE =
  '{"$type": "<rule type>", "privileges": ["select", "insert", "update", "delete"], "permissive": false (optional), "policy_role": "<role>" (optional), ' +
  '"policy_name": "<name>" (optional, for a second rule of one type, role and privilege), "data": {...} (the parameters of its type)}';

/** `--rule`: one rule as JSON, repeated for each rule. */
export const RULE_FLAG = z.array(z.string()).optional().describe(`A rule as JSON; see "${CLI_NAME} help rules"`);

/** The rules of `--rule`, each parsed as JSON; the tool checks each against its type. */
export function parseRules(specs: readonly string[]): AccessPolicy[] {
  return specs.map((spec, index) => {
    let rule: unknown;
    try {
      rule = JSON.parse(spec);
    } catch (error) {
      throw badRule(index, `it is not JSON (${(error as Error).message})`);
    }
    if (typeof rule !== 'object' || rule === null || Array.isArray(rule)) throw badRule(index, 'it is not a JSON object');
    return rule as AccessPolicy;
  });
}

function badRule(index: number, why: string): CliError {
  return new CliError<CliCode>({
    code: 'invalid-input',
    message: `--rule number ${index + 1} is not valid: ${why}.`,
    hint: `Write each rule as one JSON object, ${RULE_SHAPE}, and quote it for the shell.`,
    exitCode: ExitCode.usage,
    details: { flag: '--rule', index }
  });
}

/** A call of a tool that takes `policies`, as the input of a command that takes `--rule`: each rule as its JSON text. */
export const rulesInput = (params: Record<string, unknown>): Record<string, unknown> | undefined => {
  const { policies, ...rest } = params;
  return Array.isArray(policies) ? { ...rest, rule: policies.map((policy) => JSON.stringify(policy)) } : undefined;
};

/** The rule an owner-only table starts from: only the person whose id is in its owner_id column reads and changes a row. */
export const OWNER_ONLY_RULE = { $type: 'AuthzDirectOwner', privileges: ['select', 'insert', 'update', 'delete'], data: { entity_field: 'owner_id' } };

/** The Data node that adds the owner_id column the owner-only rule reads. */
export const OWNER_NODE = 'DataDirectOwner';

const accessTypesStep = (ctx: CommandContext): NextStep => ctx.next(['access', 'types'], 'List the rule types in plain words: who each one lets in, and what it needs on the table');

type FindingFix = (table: string, ctx: CommandContext, finding: AccessFinding) => NextStep[];

const replaceRules: FindingFix = (table, ctx) => [
  ctx.next(['access', 'set', table, '--rule', { placeholder: 'rule' }], 'Replace the rules of the table with ones that fix the finding'),
  accessTypesStep(ctx)
];

/** The commands that carry out the fix of a finding, by its id; a finding whose fix no command makes has none. */
const FINDING_FIXES: Record<string, FindingFix> = {
  'owner-outlives-membership': replaceRules,
  'app-membership-on-team-rows': replaceRules,
  'anyone-can-change': replaceRules,
  'limit-blocks-outside-grant': replaceRules,
  'write-without-read': replaceRules,
  'raw-part-may-widen': replaceRules,
  'granted-without-policy': (table, ctx) => [
    ctx.next(['access', 'add', table, '--rule', { placeholder: 'rule' }], 'Add a rule for the operation no one can do'),
    accessTypesStep(ctx)
  ],
  'reused-column-differs': (table, ctx, finding) =>
    (finding.columns ?? []).map((column) =>
      ctx.next(['field', 'update', table, column, '--default-value', { placeholder: 'default' }], `Give ${column} the default its rule expects`)),
  'required-column-not-set': (table, ctx, finding) =>
    (finding.columns ?? []).flatMap((column) => [
      ctx.next(['field', 'update', table, column, '--no-is-required'], `Make ${column} optional, so new rows can leave it empty`),
      ctx.next(['field', 'delete', table, column], `Drop ${column} and its values`)
    ])
};

/** The commands that fix the findings of the tables, each command once. */
export function explainNext(details: { tables: ExplainedTable[] }, ctx: CommandContext): NextStep[] {
  const steps = details.tables.flatMap((table) => table.findings.flatMap((finding) => FINDING_FIXES[finding.id]?.(table.name, ctx, finding) ?? []));
  return steps.filter((step, index) => steps.findIndex((other) => other.command === step.command) === index);
}

/** Whether a rule of each kind can go onto an existing table (add_policies and set_access take the same kinds). */
const ONTO_EXISTING: Record<TableKind, string> = {
  'no-fields': 'yes',
  'has-module': 'yes, a Data node adds its columns',
  'needs-table': 'yes, it reads another table',
  mixed: 'yes, when its nested rules can',
  'needs-fields': 'no, add the columns it reads first'
};

/** What a rule of each kind needs when no Data node and no column parameter says more. */
const NEEDS: Record<TableKind, string> = {
  'no-fields': 'no column of the table',
  'has-module': 'the columns its Data node adds',
  'needs-table': 'another table, which its parameters name',
  mixed: 'what its nested rules need',
  'needs-fields': 'the columns its parameters name, which you add'
};

const kindWords = (words: Record<TableKind, string>, kind: string | undefined): string => words[kind as TableKind] ?? kind ?? 'not known';

type ParameterSchema = { type?: string | string[]; format?: string; enum?: unknown[]; items?: ParameterSchema; default?: unknown; description?: string };
type NodeSchema = { properties?: Record<string, ParameterSchema>; required?: string[] };

function typeWords(schema: ParameterSchema): string {
  if (schema.format === 'column-ref') return 'column';
  if (schema.enum) return `one of ${schema.enum.map((value) => String(value)).join(', ')}`;
  if (schema.type === 'array') return schema.items ? `list of ${typeWords(schema.items)}` : 'list';
  return Array.isArray(schema.type) ? schema.type.join(' or ') : schema.type ?? 'object';
}

const valueWords = (value: unknown): string => (typeof value === 'string' ? value : JSON.stringify(value));

function neededColumns(type: NonNullable<PolicyTypeDetails['type']>, properties: Record<string, ParameterSchema>): string[] {
  const node = type.dataNode as DataNodeNeed | undefined;
  if (node) {
    return Object.entries(node.columns).map(([parameter, column]) =>
      'name' in column
        ? `${parameter}: the column ${column.name}, which ${node.type} always adds`
        : `${parameter}: a column ${node.type} adds, named by its ${column.param}`
    );
  }
  const named = Object.entries(properties)
    .filter(([, schema]) => schema.format === 'column-ref' || schema.items?.format === 'column-ref')
    .map(([parameter]) => `${parameter}: a column of the table, which you add`);
  return named.length ? named : [kindWords(NEEDS, type.tableKind)];
}

/** With no type, a table of every rule type; with one, its words, its parameters, and the columns it needs. */
export function typesText(details: PolicyTypeDetails): string {
  if (!details.type) {
    const rows = (details.types ?? []).map((type) => [type.name, kindWords(ONTO_EXISTING, type.tableKind), type.summary ?? '']);
    return columns([['TYPE', 'ONTO AN EXISTING TABLE', 'WHO IT LETS IN'], ...rows]).join('\n');
  }
  const { type } = details;
  const schema = (type.parameterSchema ?? {}) as NodeSchema;
  const properties = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  const label = (name: string, lines: string[]) => lines.map((line) => `  ${name.padEnd(11)} ${line}`);
  const parameters = Object.entries(properties).map(([name, parameter]) => [
    `    ${name}`,
    typeWords(parameter),
    parameter.default === undefined ? '' : `default ${valueWords(parameter.default)}`,
    required.has(name) ? 'required' : '',
    parameter.description ?? ''
  ]);
  return [
    type.name,
    ...(type.summary ? [`  ${type.summary}`] : []),
    `  onto an existing table: ${kindWords(ONTO_EXISTING, type.tableKind)}`,
    ...label('use when', type.useWhen),
    ...label('avoid when', type.avoidWhen),
    ...label('risk', type.risks),
    '  parameters',
    ...(parameters.length ? columns(parameters) : ['    none']),
    '  needs on the table',
    ...neededColumns(type, properties).map((line) => `    ${line}`)
  ].join('\n');
}

/** The line of help that sends a person writing rules to the rule types. */
export const RULE_TYPES_NOTE = `The rule types: ${CLI_NAME} access types, and ${CLI_NAME} access types <type> for one.`;

export const accessEntries = [
  toolCommand(describePolicyTypeTool, {
    name: 'access types',
    summary: 'List the rule types, or show one',
    positionals: ['type'],
    text: typesText,
    examples: [
      { command: `${CLI_NAME} access types` },
      { command: `${CLI_NAME} access types AuthzDirectOwner`, description: 'Before writing --rule for table add, access set or access add' }
    ]
  }),
  toolCommand(explainAccessTool, {
    name: 'access explain',
    summary: 'Explain the rules of a table',
    positionals: ['table_name'],
    examples: [
      { command: `${CLI_NAME} access explain tasks` },
      { command: `${CLI_NAME} access explain`, description: 'Every table of the bound database' }
    ],
    notes: ['It says what each stored rule checks, not who passes it: a finding fires when the structure may let in more people than meant, or lock out people who should pass.'],
    next: (details, _params, ctx) => explainNext(details, ctx)
  }),
  toolCommand(setAccessTool, {
    name: 'access set',
    summary: 'Replace the rules of a table',
    input: z.object({ table_name: setAccessTool.parameters.shape.table_name, rule: RULE_FLAG }),
    positionals: ['table_name'],
    mapInput: ({ table_name, rule }: { table_name: string; rule?: string[] }) => ({ table_name, policies: parseRules(rule ?? []) }),
    toInput: rulesInput,
    examples: [
      { command: `${CLI_NAME} access set tasks --rule '${JSON.stringify(OWNER_ONLY_RULE)}' --dry-run`, description: 'Show the rules now and after, in words; nothing changes' }
    ],
    notes: [RULE_TYPES_NOTE],
    next: (_details, params, ctx) => [ctx.next(['access', 'explain', params.table_name], 'See the rules the table has now')]
  }),
  toolCommand(addPoliciesTool, {
    name: 'access add',
    summary: 'Add rules to a table',
    input: z.object({ table_name: addPoliciesTool.parameters.shape.table_name, rule: RULE_FLAG }),
    positionals: ['table_name'],
    mapInput: ({ table_name, rule }: { table_name: string; rule?: string[] }) => ({ table_name, policies: parseRules(rule ?? []) }),
    toInput: rulesInput,
    notes: [RULE_TYPES_NOTE],
    examples: [
      {
        command: `${CLI_NAME} access add tasks --rule '{"$type":"AuthzAppMembership","privileges":["select"]}' --dry-run`,
        description: 'Also let every member of the app read the rows'
      }
    ],
    next: (_details, params, ctx) => [ctx.next(['access', 'explain', params.table_name], 'See the rules the table has now')]
  })
];
