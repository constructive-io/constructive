/**
 * What a gated action will concretely do (e.g. the rows about to be inserted),
 * so hosts can render it for review before the user approves.
 */

import { alignColumns as columns, listed } from '../tools/tool';

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

// ─── The plan as plain text ──────────────────────────────────────
//
// A plan reads as a header (the title), what it acts on as key-value lines,
// then the change list: "+" adds, "-" deletes, "~" changes, "=" stays, and
// "!" warns.

const MAX_ROWS = 10;
const MAX_CELL = 40;

const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`;

const indented = (lines: string[], by = '  '): string[] => lines.map((line) => (line ? `${by}${line}` : line));

/** A UUID shows as its first eight hex digits; any other id shows whole. */
const shortId = (id: string): string => (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id) ? id.slice(0, 8) : id);

export const databaseWords = (database: PlanDatabase): string =>
  database.name ? `${database.name} (${shortId(database.id)})` : database.id;

function accountWords({ userId, email, agent }: PlanAccount): string {
  const person = email ?? `user ${userId}`;
  return agent ? `agent ${agent.name}, for ${person}` : person;
}

/** The target as key-value lines, for a host that shows the plan as text: what, where, and as whom. */
export function planTargetLines(target: PlanTarget): string[] {
  switch (target.kind) {
  case 'workspace':
    return columns([['directory', target.cwd]]);
  case 'no-credential':
    return columns([['endpoint', target.endpoint], ['as', 'no one: the request carries no credential']]);
  case 'account':
    return columns([
      ['backend', target.apiEndpoint],
      ['as', accountWords(target.account)],
      ...(target.replaces ? [['replaces', databaseWords(target.replaces)]] : []),
    ]);
  case 'database':
    return columns([
      ['database', databaseWords(target.database)],
      ['backend', target.apiEndpoint],
      ['as', accountWords(target.account)],
      ...(target.appUserId ? [['app user', target.appUserId]] : []),
    ]);
  }
}

const ruleKey = (rule: PlanRule): string =>
  JSON.stringify([rule.permissive, [...rule.privileges].sort(), rule.policy_role, rule.words]);

function ruleCells(rule: PlanRule): string[] {
  const role = rule.policy_role === 'authenticated' ? '' : ` (role ${rule.policy_role})`;
  return [rule.permissive ? 'rule' : 'limit', rule.privileges.join(' '), `${rule.words}${role}`];
}

/** Each item of `after` marked "=" when `before` has it too and "+" when not, then each item only `before` has, marked "-". */
function marked<T>(after: T[], before: T[], key: (item: T) => string): Array<[string, T]> {
  const had = new Set(before.map(key));
  const has = new Set(after.map(key));
  return [
    ...after.map((item): [string, T] => [had.has(key(item)) ? '=' : '+', item]),
    ...before.filter((item) => !has.has(key(item))).map((item): [string, T] => ['-', item]),
  ];
}

function columnCells(column: PlanColumn, isNew: boolean): string[] {
  const value = column.default === undefined ? 'default not known' : column.default ?? '';
  return [column.name, column.type, column.required ? 'required' : '', column.computed && !isNew && value ? `${value} (new rows only)` : value];
}

/**
 * The field list of a table a plan creates: the fields the input gives, then the columns the change adds that the
 * input does not name (the ones its Data nodes add).
 */
export function newTableFieldLines(fields: ConfirmPreviewField[], access: PlanTableAccess | undefined): string[] {
  const named = new Set(fields.map((field) => field.name));
  const rows = [
    ...fields.map((field) => [field.name, field.type, field.isRequired ? 'required' : '', field.defaultValue ?? '']),
    ...(access?.columnsAdded ?? []).filter((column) => !named.has(column.name)).map((column) => columnCells(column, true)),
  ];
  return rows.length ? columns(rows) : ['(no fields)'];
}

const findingColumns = (finding: PlanFinding): string =>
  finding.columns?.length ? ` Column${finding.columns.length === 1 ? '' : 's'}: ${listed(finding.columns)}.` : '';

/**
 * The access of one table as change-list lines: its rules and grants (marked against the rules now, when the table
 * exists), row security, the columns the change adds or keeps, the findings and the notes. For a table the plan
 * creates, the columns it adds belong in the table's field list (`newTableFieldLines`), so they are left out here.
 */
export function planAccessLines(access: PlanTableAccess): string[] {
  const { before, after } = access;
  // Each item is [mark, kind, text]: the rules' own columns are aligned first, then the mark and the kind of every item.
  const rules = before ? marked(after.rules, before.rules, ruleKey) : after.rules.map((rule): [string, PlanRule] => ['', rule]);
  const ruleTexts = columns(rules.map(([, rule]) => ruleCells(rule).slice(1)));
  const items: string[][] = rules.length ? rules.map(([mark, rule], index) => [mark, ruleCells(rule)[0], ruleTexts[index]]) : [[before ? '=' : '', 'rule', 'none']];
  const grants = before ? marked(after.grants, before.grants, (grant) => grant) : after.grants.map((grant): [string, string] => ['', grant]);
  items.push(...(grants.length ? grants.map(([mark, grant]) => [mark, 'grant', grant]) : [[before ? '=' : '', 'grant', 'none']]));
  if (before && before.rowSecurity !== after.rowSecurity) {
    items.push(['~', 'row security', `${before.rowSecurity ? 'on' : 'off'} -> ${after.rowSecurity ? 'on' : 'off'}`]);
  }
  if (before) {
    const added = (access.columnsAdded ?? []).map((column) => ['+', ...columnCells(column, false)]);
    const kept = (access.columnsReused ?? []).map((column) => ['=', ...columnCells(column, false), 'kept as it is']);
    const texts = columns([...added, ...kept].map((row) => row.slice(1)));
    items.push(...[...added, ...kept].map((row, index) => [row[0], 'column', texts[index]]));
  }
  const lines = columns(before ? items : items.map((item) => item.slice(1)));
  if (!after.rowSecurity) lines.push('! Row security is off, so the rules do not apply.');
  for (const finding of access.findingsAdded) {
    lines.push(`! finding (${finding.level}): ${finding.summary}${findingColumns(finding)}`, ...indented(finding.details ?? []));
  }
  for (const finding of access.findingsRemoved) lines.push(`- finding: ${finding.summary}${findingColumns(finding)}`);
  if (access.failsIfRows?.length) {
    const verb = access.failsIfRows.length === 1 ? 'is' : 'are';
    lines.push(`! Fails if the table has rows: ${listed(access.failsIfRows)} ${verb} required, and those rows get no value. This tool cannot see the rows.`);
  }
  for (const note of access.notes ?? []) lines.push(`! ${note}`);
  return lines;
}

function cell(value: unknown): string {
  if (value === undefined) return '';
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > MAX_CELL ? `${text.slice(0, MAX_CELL - 1)}…` : text;
}

/** Rows as a table under their keys, the first ten of them. */
export function rowLines(rows: Record<string, unknown>[]): string[] {
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const shown = rows.slice(0, MAX_ROWS);
  const lines = columns([keys, ...shown.map((row) => keys.map((key) => cell(row[key])))]);
  if (rows.length > shown.length) lines.push(`… and ${plural(rows.length - shown.length, 'more row')}`);
  return lines;
}

/** The tables of a template preview, one line each: its name, its field count and its rule types. */
export function templateTableLines(tables: ConfirmPreviewTable[]): string[] {
  return columns(tables.map((table) => [
    table.name || '(no name)',
    plural(table.fields.length, 'field'),
    table.policies.length ? `rules: ${table.policies.join(', ')}` : '',
  ]));
}

/** The plan of a change as plain text: the title, what it acts on, then the change list of the message. */
export function renderPlan(prompt: ConfirmPrompt): string {
  return [prompt.title, ...indented(planTargetLines(prompt.target)), '', ...indented(prompt.message.split('\n'))].join('\n');
}
