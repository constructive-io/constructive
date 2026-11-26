/**
 * What a gated action will concretely do (e.g. the rows about to be inserted),
 * so hosts can render it for review before the user approves.
 */

import { listed } from '../tools/tool';

export type ConfirmPreviewField = {
  name: string;
  type: string;
  isRequired: boolean;
  defaultValue: string | null;
};

export type ConfirmPreviewTable = {
  name: string;
  fields: ConfirmPreviewField[];
  policies: string[];
  relationCount: number;
};

export type ConfirmPreview =
  | { kind: 'records'; tableName: string; rows: Record<string, unknown>[] }
  | { kind: 'blueprint'; tables: ConfirmPreviewTable[] }
  | { kind: 'template'; displayName: string; blueprintName?: string; tables: ConfirmPreviewTable[] }
  | { kind: 'policies'; tableName: string; policies: string[] }
  | { kind: 'field'; tableName: string; field: ConfirmPreviewField };

/** A database a plan names. `name` is empty when neither the binding nor the backend gives one. */
export type PlanDatabase = { name: string; id: string };

/** An agent of the person that makes a change for them (`--as`): its name and its principal's id. */
export type PlanAgent = { name: string; principalId: string };

/** The account a change is made under: its user id, its email when the host knows it, and the agent that acts for it. */
export type PlanAccount = { userId: string; email?: string; agent?: PlanAgent };

/**
 * What a gated call acts on, as the gate resolved it from the directory's
 * .env and the session, which the call's input does not show: a wrong
 * directory or variable changes it and leaves the rest of the plan the same.
 *
 * - `database`: a change to the bound database. `appUserId` is set when the
 *   change is made as the person signed in to the app (rows), not as the account.
 * - `account`: a change that no bound database receives: a new database
 *   (`replaces` names the one the directory leaves), or the account's templates.
 * - `no-credential`: a request to an endpoint with no one signed in, so it
 *   carries no credential (a sign-up on the auth plane, for example).
 * - `workspace`: a change to the files or processes of a directory, not to a
 *   backend (a host's own policy that gates a shell command).
 */
export type PlanTarget =
  | { kind: 'database'; database: PlanDatabase; apiEndpoint: string; account: PlanAccount; appUserId?: string }
  | { kind: 'account'; apiEndpoint: string; account: PlanAccount; replaces?: PlanDatabase }
  | { kind: 'no-credential'; endpoint: string }
  | { kind: 'workspace'; cwd: string };

/** A finding about the rules of a table; `columns` names the columns it is about, `details` says one sentence each. */
export type PlanFinding = { id: string; level: 'high' | 'medium' | 'low'; summary: string; columns?: string[]; details?: string[] };

/** One rule of a table, in plain words, under the keys a caller writes a rule with. */
export type PlanRule = {
  /** The Authz node. */
  $type: string;
  privileges: string[];
  /** False for a restrictive rule: a limit every row must also pass. */
  permissive: boolean;
  policy_role: string;
  /** One plain sentence for what the rule checks. */
  words: string;
};

/** The access of a table at one moment: its rules, its grants in words ("select to authenticated"), and row security. */
export type PlanAccessState = { rules: PlanRule[]; grants: string[]; rowSecurity: boolean };

/** A column a change adds to a table, as the backend adds it. */
export type PlanColumn = {
  name: string;
  type: string;
  required: boolean;
  /** Its default as SQL, null for none; left out when it is not known. */
  default?: string | null;
  /** The default is computed for each new row, so the rows there now do not get it. */
  computed?: true;
};

/**
 * The access of one table a plan creates or changes, as the gate resolved it: the rules, grants and row security
 * now (absent for a table the plan creates) and after, one sentence per rule, and the findings the change brings and
 * removes. No part of it says who can or cannot reach a row.
 */
export type PlanTableAccess = {
  table: string;
  before?: PlanAccessState;
  after: PlanAccessState;
  findingsAdded: PlanFinding[];
  findingsRemoved: PlanFinding[];
  /** The columns the change adds to the table. */
  columnsAdded?: PlanColumn[];
  /** The columns the change would add that the table has: a generator keeps such a column as it is, its own default too. */
  columnsReused?: PlanColumn[];
  /**
   * The added columns that make the change fail if the table has rows: they are required, and the rows there now
   * would get no value. Set only when the tool cannot see whether the table has rows.
   */
  failsIfRows?: string[];
  /** What else the change does to the table that the rules do not show (a required column no rule sets). */
  notes?: string[];
};

/**
 * What a host puts in front of the user for one gated call. Every plan names
 * its `target`: what it acts on, where, and as whom. `access` is set by a plan
 * that creates or changes the access of a table; its words are in the message
 * too.
 */
export type ConfirmPrompt = {
  title: string;
  message: string;
  target: PlanTarget;
  access?: PlanTableAccess[];
  /** What the precondition found that the input does not say (a name the backend stores differently); the message ends with them. */
  notes?: string[];
  preview?: ConfirmPreview;
};

const databaseWords = (database: PlanDatabase): string =>
  database.name ? `"${database.name}" (ID ${database.id})` : `ID ${database.id}`;

// One rule as one line: what it applies to, whether it is a limit, the role when it is not the signed-in one, and its words.
function ruleLine(rule: PlanRule): string {
  const on = [rule.privileges.join(', '), ...(rule.policy_role === 'authenticated' ? [] : [`role ${rule.policy_role}`])].join('; ');
  return rule.permissive ? `Rule (${on}): ${rule.words}` : `Limit (${on}), which every row must also pass: ${rule.words}`;
}

const grantLine = (grants: string[]): string => (grants.length ? listed(grants) : 'none');

const sameRules = (a: PlanRule[], b: PlanRule[]): boolean => JSON.stringify(a.map(ruleLine).sort()) === JSON.stringify(b.map(ruleLine).sort());

function stateLines(access: PlanTableAccess): string[] {
  const { before, after } = access;
  if (!before) {
    return [
      ...(after.rules.length ? after.rules.map((rule) => `  ${ruleLine(rule)}`) : ['  Rules: none']),
      `  Grants: ${grantLine(after.grants)}`,
      ...(after.rowSecurity ? [] : ['  Row security: off, so the rules do not apply']),
    ];
  }
  const lines: string[] = [];
  if (sameRules(before.rules, after.rules)) lines.push('  Rules: unchanged', ...after.rules.map((rule) => `    ${ruleLine(rule)}`));
  else {
    lines.push('  Rules after the change:', ...(after.rules.length ? after.rules.map((rule) => `    ${ruleLine(rule)}`) : ['    none']));
    lines.push('  Rules now:', ...(before.rules.length ? before.rules.map((rule) => `    ${ruleLine(rule)}`) : ['    none']));
  }
  if (grantLine(before.grants) === grantLine(after.grants)) lines.push(`  Grants: ${grantLine(after.grants)} (unchanged)`);
  else lines.push(`  Grants after the change: ${grantLine(after.grants)}`, `  Grants now: ${grantLine(before.grants)}`);
  if (before.rowSecurity !== after.rowSecurity) lines.push(`  Row security: ${after.rowSecurity ? 'on' : 'off'} after the change, ${before.rowSecurity ? 'on' : 'off'} now`);
  else if (!after.rowSecurity) lines.push('  Row security: off, so the rules do not apply');
  return lines;
}

/**
 * The access of one table as indented lines: each rule in words (after and now, when they differ), the grants and
 * row security, the findings, and the columns the change adds or reuses.
 */
export function planAccessLines(access: PlanTableAccess): string[] {
  const lines = stateLines(access);
  for (const finding of access.findingsAdded) {
    lines.push(`  ${access.before ? 'New finding' : 'Finding'} (${finding.level}): ${finding.summary}${findingColumns(finding)}`);
    for (const detail of finding.details ?? []) lines.push(`    ${detail}`);
  }
  for (const finding of access.findingsRemoved) lines.push(`  Finding removed: ${finding.summary}${findingColumns(finding)}`);
  for (const column of access.columnsAdded ?? []) lines.push(`  Adds column ${column.name} (${columnWords(column)}).`);
  for (const column of access.columnsReused ?? []) lines.push(`  Reuses the existing column ${column.name} (${columnWords(column)}), as it is.`);
  if (access.failsIfRows?.length) {
    const verb = access.failsIfRows.length === 1 ? 'is' : 'are';
    lines.push(
      `  This change fails if the table has rows, because ${listed(access.failsIfRows)} ${verb} required and the rows there now would get no value; ` +
        'this tool cannot see whether the table has rows.'
    );
  }
  for (const note of access.notes ?? []) lines.push(`  Note: ${note}`);
  return lines;
}

const findingColumns = (finding: PlanFinding): string =>
  finding.columns?.length ? ` Column${finding.columns.length === 1 ? '' : 's'}: ${listed(finding.columns)}.` : '';

function columnWords(column: PlanColumn): string {
  const fallback = column.default === undefined ? 'default not known' : column.default === null ? 'no default' : `default ${column.default}`;
  return [column.type, column.required ? 'required' : 'optional', column.computed ? `${fallback} for new rows` : fallback].join(', ');
}

/** The target as lines of plain text, for a host that shows the plan as text: what, where, and as whom. */
export function planTargetLines(target: PlanTarget): string[] {
  if (target.kind === 'workspace') return [`Directory: ${target.cwd}`];
  if (target.kind === 'no-credential') {
    return [`Endpoint: ${target.endpoint}`, 'Account: none (no one is signed in, so the request carries no credential)'];
  }
  const { userId, email, agent } = target.account;
  const account = `Account: ${email ? `${email} (${userId})` : userId}${agent ? `, as the agent ${agent.name} (ID ${agent.principalId})` : ''}`;
  if (target.kind === 'account') {
    return [
      `Backend: ${target.apiEndpoint}`,
      account,
      ...(target.replaces ? [`Replaces: database ${databaseWords(target.replaces)}`] : []),
    ];
  }
  return [
    `Database: ${databaseWords(target.database)}`,
    `Backend: ${target.apiEndpoint}`,
    account,
    ...(target.appUserId ? [`As app user: ${target.appUserId}`] : []),
  ];
}

// ─── The plan as plain text ──────────────────────────────────────

const MAX_ROWS = 10;
const MAX_CELL = 40;

const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`;

const indent = (lines: string[]): string[] => lines.map((line) => (line ? `  ${line}` : line));

/** Lines of cells, each column padded to its widest cell. */
function columns(lines: string[][]): string[] {
  const widths = lines.reduce<number[]>(
    (max, line) => line.map((cell, index) => Math.max(max[index] ?? 0, cell.length)),
    []
  );
  return lines.map((line) => line.map((cell, index) => cell.padEnd(widths[index])).join('  ').trimEnd());
}

function cell(value: unknown): string {
  if (value === undefined) return '';
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > MAX_CELL ? `${text.slice(0, MAX_CELL - 1)}…` : text;
}

function rowLines(rows: Record<string, unknown>[]): string[] {
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const shown = rows.slice(0, MAX_ROWS);
  const lines = columns([keys, ...shown.map((row) => keys.map((key) => cell(row[key])))]);
  if (rows.length > shown.length) lines.push(`… and ${plural(rows.length - shown.length, 'more row')}`);
  return lines;
}

const fieldCells = (field: ConfirmPreviewField): string[] => [
  field.name,
  field.type,
  field.isRequired ? 'required' : '',
  field.defaultValue === null ? '' : `default ${field.defaultValue}`
];

function tableLines(table: ConfirmPreviewTable): string[] {
  const lines = [`Table "${table.name}"`];
  lines.push(...indent(table.fields.length ? columns(table.fields.map(fieldCells)) : ['(no fields)']));
  if (table.policies.length) lines.push(...indent([`Policies: ${table.policies.join(', ')}`]));
  if (table.relationCount) lines.push(...indent([`Relations: ${table.relationCount}`]));
  return lines;
}

const tablesLines = (tables: ConfirmPreviewTable[]): string[] =>
  tables.flatMap((table, index) => (index === 0 ? tableLines(table) : ['', ...tableLines(table)]));

function previewLines(preview: ConfirmPreview): string[] {
  switch (preview.kind) {
  case 'records':
    return [`${plural(preview.rows.length, 'row')} for table "${preview.tableName}":`, ...indent(rowLines(preview.rows))];
  case 'blueprint':
    return tablesLines(preview.tables);
  case 'template': {
    const source = preview.blueprintName ? ` from blueprint "${preview.blueprintName}"` : '';
    return [`Template "${preview.displayName}"${source}:`, ...indent(tablesLines(preview.tables))];
  }
  case 'policies':
    return [`Policies for table "${preview.tableName}":`, ...indent(preview.policies)];
  case 'field':
    return [`Field on table "${preview.tableName}":`, ...indent(columns([fieldCells(preview.field)]))];
  }
}

/** The plan of a change as plain text: what it acts on, the title, the message, then the preview when there is one. */
export function renderPlan(prompt: ConfirmPrompt): string {
  const lines = [...planTargetLines(prompt.target), '', prompt.title, prompt.message];
  if (prompt.preview) lines.push('', ...previewLines(prompt.preview));
  return lines.join('\n');
}
