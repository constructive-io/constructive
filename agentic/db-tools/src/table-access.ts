// The access of the tables of a bound database, read once from the control
// plane: their columns, policies, grants and row-security state, which is the
// whole input the words and the findings of a table need. A part that cannot
// be read fails the read, so no report leaves a part out.

import { listed, type PlanAccessState, type PlanColumn, type PlanFinding, type PlanRule, type PlanTableAccess, type ToolCallSuggestion, type ToolFailure } from '@agentic-kit/harness';
import type { BlueprintPolicy, FieldDefault, JSONSchema } from 'node-type-registry';

import {
  accessFindings,
  type AddedColumn,
  type ColumnDefault,
  type ColumnRead,
  columnsReadByPolicies,
  defaultFills,
  explainPolicy,
  fieldsAddedByNodes,
  type TableAccessInput,
  type TableField,
  type TablePolicy,
  type TablePrivilege,
} from './access';
import { AUTHZ_NODES, isObject, part } from './access/policies';
import { fieldTypeToTypeName } from './blueprint/field-type';
import type { ProjectContext } from './context';
import { DESCRIBE_SCHEMA, failureFromError, failureFromErrors, type FailureMeaning, type Result, suggest } from './failure';
import { notFound, renamed } from './schema-resolve';

export type SchemaField = {
  name: string;
  type: string;
  isRequired: boolean;
  defaultValue: string | null;
};

/** One access rule of a table: the policy rows that differ only by privilege, as one. */
export type SchemaPolicy = {
  type: string;
  privileges: string[];
  /** False for a restrictive rule, which every row must also pass. */
  permissive: boolean;
  role: string;
  data: Record<string, unknown>;
  disabled?: true;
  /** UPDATE only: the rule a changed row must pass instead of this one, as the backend stores it. */
  withCheck?: { type: string; data: Record<string, unknown> };
};

export type TableGrants = NonNullable<TableAccessInput['grants']>;

export type TableRecord = {
  id: string;
  name: string;
  fields: SchemaField[];
  policyRules: SchemaPolicy[];
  /** The names of its policy rows: PostgreSQL keeps a policy name unique per table. */
  policyNames: string[];
  grants: TableGrants;
  rlsEnabled: boolean;
};

type PolicyRow = {
  tableId: string;
  name?: string | null;
  policyType: string | null;
  privilege?: string | null;
  permissive?: boolean | null;
  granteeName?: string | null;
  disabled?: boolean | null;
  data?: unknown;
  withCheck?: unknown;
};

type GrantRow = { tableId: string; privilege?: string | null; granteeName?: string | null; fieldIds?: string[] | null; isGrant?: boolean | null };

const PRIVILEGE_ORDER = ['all', 'select', 'insert', 'update', 'delete'];
const PRIVILEGES = new Set<string>(['select', 'insert', 'update', 'delete']);

/** A canonical JSON text, so two rules with the same data in another key order are one rule. */
export const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, item) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
      : item,
  );

// The stored WITH CHECK override: {"$type": "Authz...", "data": {...}}, or none.
function withCheckOf(value: unknown): SchemaPolicy['withCheck'] {
  if (!value || typeof value !== 'object' || typeof (value as { $type?: unknown }).$type !== 'string') return undefined;
  const { $type, data } = value as { $type: string; data?: unknown };
  return { type: $type, data: data && typeof data === 'object' ? (data as Record<string, unknown>) : {} };
}

function policyRules(rows: PolicyRow[]): SchemaPolicy[] {
  const rules = new Map<string, SchemaPolicy>();
  for (const row of rows) {
    const withCheck = withCheckOf(row.withCheck);
    const rule: SchemaPolicy = {
      type: row.policyType ?? '',
      privileges: [],
      permissive: row.permissive !== false,
      role: row.granteeName ?? '',
      data: row.data && typeof row.data === 'object' ? (row.data as Record<string, unknown>) : {},
      ...(row.disabled ? { disabled: true as const } : {}),
      ...(withCheck ? { withCheck } : {}),
    };
    const key = canonical([rule.type, rule.permissive, rule.role, rule.disabled ?? false, rule.data, rule.withCheck ?? null]);
    const kept = rules.get(key) ?? rule;
    const privilege = (row.privilege ?? '').toLowerCase();
    if (privilege && !kept.privileges.includes(privilege)) kept.privileges.push(privilege);
    rules.set(key, kept);
  }
  for (const rule of rules.values()) {
    rule.privileges.sort((a, b) => PRIVILEGE_ORDER.indexOf(a) - PRIVILEGE_ORDER.indexOf(b));
  }
  return [...rules.values()];
}

// The grants of one table in the blueprint shape the registry reads: per role, [privilege, columns or '*'].
function tableGrants(rows: GrantRow[], fieldNames: Map<string, string>): TableGrants {
  const byRole = new Map<string, unknown[][]>();
  for (const row of rows) {
    if (row.isGrant === false || !row.granteeName || !row.privilege) continue;
    const columns = row.fieldIds?.length ? row.fieldIds.map((id) => fieldNames.get(id) ?? id) : '*';
    byRole.set(row.granteeName, [...(byRole.get(row.granteeName) ?? []), [row.privilege.toLowerCase(), columns]]);
  }
  return [...byRole].map(([role, privileges]) => ({ roles: [role], privileges }));
}

function toDefaultValueString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

const groupBy = <T extends { tableId: string }>(rows: T[]): Map<string, T[]> => {
  const groups = new Map<string, T[]>();
  for (const row of rows) groups.set(row.tableId, [...(groups.get(row.tableId) ?? []), row]);
  return groups;
};

/** The application tables of the bound database (every one, or those named), with all their access parts. */
export async function readTables(context: ProjectContext, names?: string[], schemaId?: string): Promise<Result<TableRecord[]>> {
  const { api, databaseId } = context;
  try {
    const tablesResult = await api.table
      .findMany({
        select: { id: true, name: true, category: true, useRls: true },
        where: {
          databaseId: { equalTo: databaseId },
          ...(schemaId ? { schemaId: { equalTo: schemaId } } : {}),
          or: [{ category: { equalTo: 'APP' } }, { name: { equalTo: 'users' } }],
          ...(names ? { name: { in: names } } : {}),
        },
        orderBy: ['NAME_ASC'],
      })
      .execute();
    if (!tablesResult.ok) return { kind: 'failed', failure: failureFromErrors(tablesResult.errors, 'Failed to read schema') };
    const tableNodes = tablesResult.data.tables?.nodes ?? [];
    const tableIds = tableNodes.map((table) => table.id);
    if (tableIds.length === 0) return { kind: 'ok', value: [] };

    const where = { tableId: { in: tableIds } };
    const [fieldsResult, policiesResult, grantsResult] = await Promise.all([
      api.field
        .findMany({ select: { id: true, name: true, type: true, isRequired: true, defaultValue: true, tableId: true }, where })
        .execute(),
      api.policy
        .findMany({
          select: { tableId: true, name: true, policyType: true, privilege: true, permissive: true, granteeName: true, disabled: true, data: true, withCheck: true },
          where,
        })
        .execute(),
      api.tableGrant.findMany({ select: { tableId: true, privilege: true, granteeName: true, fieldIds: true, isGrant: true }, where }).execute(),
    ]);
    if (!fieldsResult.ok) return { kind: 'failed', failure: failureFromErrors(fieldsResult.errors, 'Failed to read fields') };
    if (!policiesResult.ok) return { kind: 'failed', failure: failureFromErrors(policiesResult.errors, 'Failed to read policies') };
    if (!grantsResult.ok) return { kind: 'failed', failure: failureFromErrors(grantsResult.errors, 'Failed to read grants') };

    const fieldRows = fieldsResult.data.fields?.nodes ?? [];
    const fieldNames = new Map(fieldRows.map((field) => [field.id, field.name]));
    const fields = groupBy(fieldRows);
    const policies = groupBy((policiesResult.data.policies?.nodes ?? []) as PolicyRow[]);
    const grants = groupBy((grantsResult.data.tableGrants?.nodes ?? []) as GrantRow[]);
    return {
      kind: 'ok',
      value: tableNodes.map((table) => ({
        id: table.id,
        name: table.name,
        fields: (fields.get(table.id) ?? []).map((field) => ({
          name: field.name,
          type: fieldTypeToTypeName(field.type),
          isRequired: Boolean(field.isRequired),
          defaultValue: toDefaultValueString(field.defaultValue),
        })),
        policyRules: policyRules(policies.get(table.id) ?? []),
        policyNames: (policies.get(table.id) ?? []).flatMap((row) => (row.name ? [row.name] : [])),
        grants: tableGrants(grants.get(table.id) ?? [], fieldNames),
        rlsEnabled: table.useRls === true,
      })),
    };
  } catch (err) {
    return { kind: 'failed', failure: failureFromError(err, 'Failed to read schema') };
  }
}

/** One table of the bound database by name, or `not-found` naming the call that lists them. */
export async function readTable(context: ProjectContext, name: string): Promise<Result<TableRecord>> {
  const stored = renamed(name);
  const read = await readTables(context, stored ? [name, stored] : [name], context.schemaId);
  if (read.kind === 'failed') return read;
  const table = read.value.find((candidate) => candidate.name === name);
  if (table) return { kind: 'ok', value: table };
  const message = `Table "${name}" was not found in the project database.`;
  return { kind: 'failed', failure: notFound('Table', name, message, read.value.map((candidate) => candidate.name)) };
}

// A stored field default: the JSON of a FieldDefault (as readTables keeps it), or SQL text this tool cannot read.
function storedDefault(value: string | null): ColumnDefault {
  if (value === null) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed !== null && typeof parsed === 'object' ? (parsed as FieldDefault) : 'unknown';
  } catch {
    return 'unknown';
  }
}

/** A stored field default as the SQL it stands for (`now()`, `0`), or as stored when this tool cannot read it. */
export function defaultText(value: string | null): string {
  const parsed = storedDefault(value);
  if (parsed === null) return '';
  if (parsed === 'unknown') return value;
  return 'generated' in parsed ? `generated (${parsed.generated})` : defaultSql(parsed);
}

/** A column as the registry reads it: its default decides, for example, whose team a new row names. */
export const tableField = (field: SchemaField): TableField => ({
  name: field.name,
  required: field.isRequired,
  default: storedDefault(field.defaultValue),
  type: field.type,
});

/** A column a Data node adds, as the registry reads it. */
const addedField = (column: AddedColumn): TableField => ({ name: column.name, required: !column.nullable, default: column.default, type: column.type });

/**
 * What the registry reads for one live table: every policy (a role of
 * `public` counts for every role) with its WITH CHECK override, the grants,
 * the row-security state and the columns. A disabled policy does not apply,
 * so it is left out.
 */
export function accessInputOf(table: TableRecord): TableAccessInput {
  return {
    policies: table.policyRules
      .filter((rule) => !rule.disabled)
      .map(
        (rule): TablePolicy => ({
          type: rule.type,
          privileges: rule.privileges.filter((privilege) => PRIVILEGES.has(privilege)) as TablePrivilege[],
          permissive: rule.permissive,
          role: rule.role || 'authenticated',
          data: rule.data,
          ...(rule.withCheck ? { with_check: rule.withCheck } : {}),
        }),
      ),
    grants: table.grants,
    rls_enabled: table.rlsEnabled,
    fields: table.fields.map(tableField),
  };
}

/** One rule in plain words, with the related columns the reader read; a rule the words cannot describe says so instead. */
export function ruleWords(type: string, data: Record<string, unknown>, related?: TableAccessInput['related']): string {
  if (!AUTHZ_NODES.has(type)) return `A rule of the type ${type}, which these words do not describe.`;
  try {
    return explainPolicy(type, data ?? {}, related);
  } catch {
    return `A ${type} rule whose stored data these words cannot read.`;
  }
}

/** A stored rule in the shape a caller writes one, so a rule that is read can be written back. */
export type WrittenRule = Omit<BlueprintPolicy, 'policy_name'> & Required<Pick<BlueprintPolicy, 'privileges' | 'permissive' | 'policy_role' | 'data'>>;

const EXPRESSION: JSONSchema = { format: 'authz-expression' };

// A part of an Authz expression: AND and OR hold a list of expressions, NOT holds one, and a node holds its own data.
function expressionPart(key: string): JSONSchema | undefined {
  if (key === 'AND' || key === 'OR') return { items: EXPRESSION };
  if (key === 'NOT') return EXPRESSION;
  return AUTHZ_NODES.get(key)?.parameter_schema;
}

// `value` under `schema` without the keys the schema marks readOnly, which the backend or the platform sets, nested
// Authz nodes included: the parse trees, the member lists the backend resolves, and the table it records.
function withoutStoredOnly(schema: JSONSchema | undefined, value: unknown): unknown {
  if (!schema) return value;
  if (Array.isArray(value)) {
    const items = schema.items && !Array.isArray(schema.items) ? schema.items : undefined;
    return items ? value.map((item) => withoutStoredOnly(items, item)) : value;
  }
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, item]) => {
      const part = schema.properties?.[key] ?? (schema.format === 'authz-expression' ? expressionPart(key) : undefined);
      return part?.readOnly ? [] : [[key, withoutStoredOnly(part, item)]];
    }),
  );
}

const writtenData = (type: string, data: Record<string, unknown> | undefined): Record<string, unknown> =>
  withoutStoredOnly(AUTHZ_NODES.get(type)?.parameter_schema, data ?? {}) as Record<string, unknown>;

/**
 * A stored rule as every read returns it: the keys a caller writes (`$type`, `privileges`, `permissive`,
 * `policy_role`, `data`, and `with_check` for an update rule with its own check), with each key the closed
 * parameter_schema marks readOnly left out, so no read carries a part the closed world refuses.
 */
export function asWritten(policy: TablePolicy): WrittenRule {
  return {
    $type: policy.type as WrittenRule['$type'],
    privileges: [...policy.privileges],
    permissive: policy.permissive !== false,
    policy_role: policy.role || 'authenticated',
    data: writtenData(policy.type, policy.data),
    ...(policy.with_check ? { with_check: { $type: policy.with_check.type as WrittenRule['$type'], data: writtenData(policy.with_check.type, policy.with_check.data) } } : {}),
  };
}

/** One rule as a plan names it, under the keys a caller writes: its own sentence, and for an update rule with its own check of the changed row, that one too. */
export function planRule(policy: TablePolicy, related?: TableAccessInput['related']): PlanRule {
  const check = policy.with_check ? ` A changed row must pass instead: ${ruleWords(policy.with_check.type, policy.with_check.data ?? {}, related)}` : '';
  const rule: PlanRule = {
    $type: policy.type,
    privileges: policy.privileges,
    permissive: policy.permissive !== false,
    policy_role: policy.role || 'authenticated',
    words: `${ruleWords(policy.type, policy.data, related)}${check}`,
  };
  return Object.defineProperty(rule, 'comparisonKey', { value: part(policy).key });
}

/** A table's grants in words, one entry per role: "select, insert, update and delete to authenticated", "update (title) to editor". */
export function grantWords(grants: TableAccessInput['grants']): string[] {
  const byRole = new Map<string, string[]>();
  for (const grant of grants ?? []) {
    for (const role of grant.roles) {
      for (const entry of grant.privileges) {
        const [privilege, columns] = Array.isArray(entry) ? entry : [entry, '*'];
        const what = `${String(privilege).toLowerCase()}${Array.isArray(columns) && columns.length ? ` (${columns.join(', ')})` : ''}`;
        const known = byRole.get(role) ?? [];
        if (!known.includes(what)) byRole.set(role, [...known, what]);
      }
    }
  }
  return [...byRole].map(([role, privileges]) => {
    const ordered = [...privileges].sort((a, b) => PRIVILEGE_ORDER.indexOf(a.split(' ')[0]) - PRIVILEGE_ORDER.indexOf(b.split(' ')[0]));
    return `${listed(ordered)} to ${role}`;
  });
}

/** A table's access at one moment, as a plan names it. */
export const accessState = (input: TableAccessInput): PlanAccessState => ({
  rules: input.policies.map((policy) => planRule(policy, input.related)),
  grants: grantWords(input.grants),
  rowSecurity: input.rls_enabled !== false,
});

/**
 * The access of one table a plan creates (`before` absent) or changes: the rules, grants and row security now and
 * after, one sentence per rule, and the findings the change brings and removes.
 */
export function planTableAccess(table: string, before: TableAccessInput | undefined, after: TableAccessInput): PlanTableAccess {
  const next = accessFindings(after);
  const now = before ? accessFindings(before) : [];
  const ids = (findings: { id: string }[]) => new Set(findings.map((finding) => finding.id));
  const [wasIds, willIds] = [ids(now), ids(next)];
  const short = ({ id, level, summary, columns, details }: PlanFinding) => ({
    id,
    level,
    summary,
    ...(columns?.length ? { columns } : {}),
    ...(details?.length ? { details } : {}),
  });
  return {
    table,
    ...(before ? { before: accessState(before) } : {}),
    after: accessState(after),
    findingsAdded: next.filter((finding) => !wasIds.has(finding.id)).map(short),
    findingsRemoved: now.filter((finding) => !willIds.has(finding.id)).map(short),
  };
}

// ── What an access change does to the columns of a table ─────────────────

/** One rule as the registry reads it: its policy type, its data, and the WITH CHECK override of an update. */
export type Rule = Pick<TablePolicy, 'type' | 'data' | 'with_check'>;

const sqlLiteral = (value: unknown): string => (typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : JSON.stringify(value));

// A default as the SQL it stands for: `false`, `jwt_public.current_user_id()`, `now()`.
function defaultSql(value: FieldDefault): string {
  if (value.sql_keyword) return value.sql_keyword;
  if (value.operator && value.left && value.right) return `${defaultSql(value.left)} ${value.operator} ${defaultSql(value.right)}`;
  const base = value.function
    ? `${value.schema ? `${value.schema}.` : ''}${value.function}(${(value.args ?? []).map((arg) => (arg !== null && typeof arg === 'object' ? defaultSql(arg) : sqlLiteral(arg))).join(', ')})`
    : sqlLiteral(value.value ?? null);
  return value.cast ? `${base}::${value.cast.name}` : base;
}

function planColumn(column: AddedColumn): PlanColumn {
  const base = { name: column.name, type: column.type, required: !column.nullable };
  if (column.default === 'unknown') return base;
  if (column.default === null) return { ...base, default: null };
  if ('generated' in column.default) return { ...base, default: `generated by PostgreSQL (${column.default.generated})` };
  const fills = defaultFills(column.default);
  return { ...base, default: defaultSql(column.default), ...(fills.existing_rows === false ? { computed: true as const } : {}) };
}

// A required column fails on the rows the table has when its default does not fill them (the registry's defaultFills).
const failsOnRows = (column: AddedColumn): boolean => !column.nullable && defaultFills(column.default).existing_rows === false;

/** What a change does to the columns of one table. */
export type ColumnChange = {
  /** The columns its nodes add that the table does not have. */
  added: PlanColumn[];
  /** The columns its nodes would add that the table has: a generator keeps each as it is, its own default too. */
  reused: PlanColumn[];
  /** The added columns the rows there now would get no value for: the change fails if the table has rows. */
  failsIfRows: PlanColumn[];
  /** The added columns as the registry reads them, for the access after the change. */
  fields: TableField[];
  /** What the plan says about columns the registry does not know. */
  notes: string[];
};

function missingColumns(table: string, missing: ColumnRead[]): ToolFailure {
  const columns = [...new Set(missing.map((entry) => entry.column))];
  const sentences = missing.map(
    ({ type, column }) => `${type} reads the column "${column}", which table "${table}" does not have and this change does not add, so the backend cannot build the rule.`,
  );
  return {
    code: 'invalid-input',
    message: [...new Set(sentences)].join(' '),
    hint: `Add ${listed(columns)} to the table first, or name a column the table has.`,
    calls: [...columns.map((column) => suggest('create_field', { table_name: table, field_name: column }, `Add the column ${column} the rule reads`, ['type'])), DESCRIBE_SCHEMA],
  };
}

// A column the table has, as the plan says it: its own type, NOT NULL and default (stored as the JSON of a FieldDefault).
function existingColumn(field: SchemaField): PlanColumn {
  let stored: unknown = field.defaultValue;
  try {
    stored = field.defaultValue === null ? null : JSON.parse(field.defaultValue);
  } catch {
    // A default the backend gave as text is the SQL itself.
  }
  const sql = stored === null ? null : typeof stored === 'object' ? defaultSql(stored as FieldDefault) : String(stored);
  return { name: field.name, type: field.type, required: field.isRequired, default: sql };
}

/**
 * The columns `nodes` add to a table that has `fields`, and the ones they
 * reuse (a generator keeps a column of the same name as it is), refused when
 * a rule reads a column the table has not and no node of the change adds: the
 * backend cannot build that rule. Where a node's columns, or the columns a
 * rule reads, are not known, the plan says what it cannot check instead.
 */
export function columnChange(
  table: string,
  fields: ReadonlyArray<SchemaField | { name: string }>,
  nodes: Array<string | { $type: string; data?: object }>,
  rules: readonly Rule[],
): Result<ColumnChange> {
  const { fields: columns, unknown } = fieldsAddedByNodes(nodes);
  const has = new Map(fields.map((field) => [field.name, field]));
  const adds = columns.filter((column) => !has.has(column.name));
  const reused = columns.flatMap((column) => {
    const field = has.get(column.name);
    return field && 'type' in field ? [existingColumn(field)] : [];
  });
  const known = new Set([...has.keys(), ...adds.map((column) => column.name)]);
  const read = columnsReadByPolicies(rules.map((rule) => ({ ...rule, data: rule.data ?? {} })));
  const missing = read.columns.filter((entry) => !known.has(entry.column));
  const notes = unknown.length ? [`The columns ${unknown.join(', ')} add${unknown.length === 1 ? 's' : ''} are not known to the registry, so this plan cannot list them.`] : [];
  if (read.unknown.length) {
    notes.push(`The registry cannot tell which columns ${listed(read.unknown)} reads (a stored expression, or data it does not describe), so this plan cannot check that table "${table}" has them.`);
  }
  if (missing.length && !unknown.length) return { kind: 'failed', failure: missingColumns(table, missing) };
  for (const { type, column } of missing) notes.push(`${type} reads the column "${column}", which table "${table}" does not have; this plan cannot tell whether ${listed(unknown)} adds it.`);
  const added = adds.map(planColumn);
  return { kind: 'ok', value: { added, reused, failsIfRows: added.filter((_column, index) => failsOnRows(adds[index])), fields: adds.map(addedField), notes } };
}

/** The plan's parts for a column change: the columns it adds and reuses, and the ones that fail on rows of an existing table. */
export const columnPlan = (change: ColumnChange, existing: boolean): Pick<PlanTableAccess, 'columnsAdded' | 'columnsReused' | 'failsIfRows'> => ({
  ...(change.added.length ? { columnsAdded: change.added } : {}),
  ...(change.reused.length ? { columnsReused: change.reused } : {}),
  ...(existing && change.failsIfRows.length ? { failsIfRows: change.failsIfRows.map((column) => column.name) } : {}),
});

/** Why a change that adds `columns` cannot apply to `table` while it has rows, and the fix. */
export function rowsConflict(table: string, columns: PlanColumn[]): { message: string; hint: string; calls: ToolCallSuggestion[] } {
  const names = listed(columns.map((column) => column.name));
  const many = columns.length === 1 ? '' : 's';
  return {
    message: `table "${table}" has rows, and the change adds the required column${many} ${names} with no value for them.`,
    hint: `Add ${names} first as ${columns.length === 1 ? 'an optional column' : 'optional columns'}, give the rows a value, then make the change again: it keeps a column that exists, as it is.`,
    calls: columns.map((column) =>
      suggest('create_field', { table_name: table, field_name: column.name, type: column.type, is_required: false }, `Add ${column.name} as an optional column first, so the rows can get a value`),
    ),
  };
}

/**
 * What a refusal of a change to `table` means: a refused NOT NULL is the rows the added columns get no value for,
 * and a refused rule is one of the caller's own `rules` (a preset's are the registry's, so they are left out).
 */
export const changeMeaning = (table: string, change: ColumnChange, rules: readonly Rule[] | undefined): FailureMeaning => ({
  ...(change.failsIfRows.length ? { notNull: rowsConflict(table, change.failsIfRows) } : {}),
  ...(rules ? { policyTypes: rules.map((rule) => rule.type) } : {}),
});
