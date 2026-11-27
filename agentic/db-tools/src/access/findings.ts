// Structural findings over the stored rules of one table: shapes the backend docs warn about, read from what each
// Authz node checks. No finding says who can or cannot reach a row: each one says what may happen, and fires when the
// rules leave it possible.

import type { JSONSchema } from 'node-type-registry';

import {
  type AccessOperation,
  appliesTo,
  AUTHZ_NODES,
  effectivePolicy,
  type Expr,
  exprOf,
  type Leaf,
  lets,
  OPERATIONS,
  type Part,
  part,
  partsFor,
  PRIVILEGE,
  PUBLIC,
  SIGNED_IN,
  sorted,
  type TablePolicy,
  type TablePrivilege,
  treeOf,
  unique
} from './policies';
import { type AddedColumn, type ColumnDefault, dataNodesForPolicies, fieldsAddedByNodes, ROW_ID, TABLE_NEEDS } from './provisioning';
import { type RelatedColumns, statesAll } from './words';

/**
 * What one rule of an Authz node checks: `member` (a member of the app or of a team), `named` (a person the row names),
 * `shared` (a person given an explicit share), `anyone` (it checks the row only), `session` (the kind of session),
 * `mixed` (it depends on nested parts), `none` (no one).
 */
export interface AccessCheck {
  person: 'member' | 'named' | 'shared' | 'anyone' | 'session' | 'mixed' | 'none';
  /** For `member`: the app, a team the row names, or any team the row's owner shares with the person. */
  scope?: 'app' | 'row' | 'peer';
  /** The parameter that holds the row's owner column, when the row must name the person. */
  owner?: string;
  /** The parameter that holds the column of the team the row names. */
  team?: string;
  /** Meant as a limit on top of a grant, not as a grant. */
  limit?: boolean;
  /** Every row passes, with no check. */
  always?: boolean;
}

export const ACCESS_CHECKS: Record<string, AccessCheck> = {
  AuthzAllowAll: { person: 'anyone', always: true },
  AuthzAppMemberOwner: { person: 'member', scope: 'app', owner: 'owner_field' },
  AuthzAppMembership: { person: 'member', scope: 'app' },
  AuthzColumnSecurity: { person: 'none' },
  AuthzComposite: { person: 'mixed' },
  AuthzDatabaseClaim: { person: 'session' },
  AuthzDenyAll: { person: 'none' },
  AuthzDirectOwner: { person: 'named', owner: 'entity_field' },
  AuthzDirectOwnerAny: { person: 'named', owner: 'entity_fields' },
  AuthzEntityMembership: { person: 'member', scope: 'row', team: 'entity_field' },
  AuthzFilePath: { person: 'shared' },
  AuthzHumanOnly: { person: 'session', limit: true },
  AuthzMemberList: { person: 'named' },
  AuthzMemberOwner: { person: 'member', scope: 'row', owner: 'owner_field', team: 'entity_field' },
  AuthzNotReadOnly: { person: 'member', scope: 'row', team: 'entity_field', limit: true },
  AuthzOrgHierarchy: { person: 'named' },
  AuthzPeerOwnership: { person: 'member', scope: 'peer' },
  AuthzPublishable: { person: 'anyone' },
  AuthzRelatedEntityMembership: { person: 'member', scope: 'row' },
  AuthzRelatedMemberList: { person: 'named' },
  AuthzRelatedMemberOwner: { person: 'member', scope: 'row', owner: 'owner_field' },
  AuthzRelatedPeerOwnership: { person: 'member', scope: 'peer' },
  AuthzSystemOnly: { person: 'session', limit: true },
  AuthzTemporal: { person: 'anyone' },
  AuthzValueAllowed: { person: 'anyone' },
  AuthzValueExists: { person: 'anyone' },
  AuthzValueMatch: { person: 'anyone' }
};

/** One column of a table. */
export interface TableField {
  name: string;
  /** NOT NULL. */
  required: boolean;
  /** The default as the backend stores it (a FieldDefault), `null` for none, `'unknown'` when it cannot be read. */
  default: ColumnDefault;
  /** The type name, for example `uuid` or `text[]`, when known. */
  type?: string;
}

export interface TableAccessInput {
  policies: TablePolicy[];
  /** When known. A grant to 'public' counts for every role. */
  grants?: Array<{ roles: string[]; privileges: unknown[] }>;
  /** When known. */
  rls_enabled?: boolean;
  /** The table's columns, when known. */
  fields?: TableField[];
  /** The columns of other tables the rules name, by table id and by table name, when the reader read them. */
  related?: RelatedColumns;
}

export interface AccessFinding {
  /** Stable, kebab-case. */
  id: string;
  level: 'high' | 'medium' | 'low';
  summary: string;
  risk: string;
  fix: string;
  operations: AccessOperation[];
  /** The columns the finding is about, when it is about columns. */
  columns?: string[];
  /** One sentence for each of those columns, when the finding differs by column. */
  details?: string[];
}

const ANONYMOUS = 'anonymous';

// A field from a caller that does not give its default has a default no one knows, so what depends on it is never a
// guess.
function readableFields(fields: TableField[] | undefined): TableField[] | undefined {
  return fields?.map((field) => (field.default === undefined ? { ...field, default: 'unknown' } : field));
}

/** A column the rules' Data nodes add that the table already has, but not as the node makes it. */
export interface ColumnGap {
  column: string;
  /** The Data node that adds the column. */
  node: string;
  /** The column as the node makes it. */
  expected: AddedColumn;
  /** The column the table has. */
  actual: TableField;
  /** What differs. A default or a type the table does not say (`'unknown'`, no `type`) does not differ. */
  gaps: Array<'type' | 'required' | 'default'>;
}

/**
 * The columns the rules' Data nodes add that the table has with another type, another NOT NULL, or another default. A
 * generator keeps a column the table already has as it is, so the rule then reads a column it did not make.
 */
export function columnGaps(given: TableField[], policies: Array<Pick<TablePolicy, 'type' | 'data'>>): ColumnGap[] {
  const fields = readableFields(given);
  const expected = fieldsAddedByNodes(dataNodesForPolicies(policies).nodes).fields;
  return expected.flatMap((column) => {
    const actual = fields.find((field) => field.name === column.name);
    if (!actual) return [];
    const gaps: ColumnGap['gaps'] = [];
    if (actual.type !== undefined && actual.type !== column.type) gaps.push('type');
    if (actual.required === column.nullable) gaps.push('required');
    if (actual.default !== 'unknown' && column.default !== 'unknown' && JSON.stringify(sorted(actual.default)) !== JSON.stringify(sorted(column.default))) {
      gaps.push('default');
    }
    return gaps.length ? [{ column: column.name, node: column.node, expected: column, actual, gaps }] : [];
  });
}

// ─── Grants ──────────────────────────────────────────────────────

function granted(input: TableAccessInput, role: string, privilege: TablePrivilege): boolean {
  if (!input.grants) return true;
  return input.grants
    .filter((grant) => grant.roles.includes(role) || grant.roles.includes(PUBLIC))
    .flatMap((grant) => grant.privileges)
    .some((item) => String(Array.isArray(item) ? item[0] : item).toLowerCase() === privilege);
}

function rolesOf(input: TableAccessInput, parts: Part[]): string[] {
  const named = [...parts.map((item) => item.role), ...(input.grants ?? []).flatMap((grant) => grant.roles)];
  const roles = new Set([SIGNED_IN, ...named.filter((role) => role !== PUBLIC), ...(named.includes(PUBLIC) ? [ANONYMOUS] : [])]);
  return [SIGNED_IN, ...[...roles].filter((role) => role !== SIGNED_IN).sort()];
}

// ─── Findings ────────────────────────────────────────────────────

type FindingWords = Omit<AccessFinding, 'id' | 'operations' | 'columns' | 'details'>;

const FINDINGS: Record<string, FindingWords> = {
  'owner-outlives-membership': {
    level: 'high',
    summary: 'An owner check here does not check membership, so a person who leaves the team or the app may keep access to the rows they own.',
    risk: 'A removed or banned member may still reach the rows that name them as their owner.',
    fix: 'Use the owner check that also requires membership: AuthzMemberOwner for rows of a team, AuthzAppMemberOwner for rows of the whole app.'
  },
  'app-membership-on-team-rows': {
    level: 'medium',
    summary: 'App membership here may let every member of the app in, whatever team the row belongs to, on a table whose rows belong to teams.',
    risk: 'A member of one team may reach the rows of every other team.',
    fix: 'Check membership of the team the row names (AuthzEntityMembership), and fence the owner check with it (AuthzMemberOwner).'
  },
  'granted-without-policy': {
    level: 'low',
    summary: 'The table grants this operation, but no rule lets anyone do it, so the database refuses it.',
    risk: 'People who expect to do it cannot.',
    fix: 'Add a rule for this operation, or remove the grant.'
  },
  'granted-role-without-policy': {
    level: 'low',
    summary:
      'The table grants this operation to a role that no rule names, so the database refuses it for that role unless the role is a member of a role a rule names; these words cannot tell which roles are members of which.',
    risk: 'People of that role who expect to do it may not be able to.',
    fix: 'Add a rule for this operation for that role, or for public, or remove the grant.'
  },
  'policies-without-row-security': {
    level: 'high',
    summary: 'The table has rules, but row security is off, so the rules do not apply.',
    risk: 'Anyone the table grants an operation to can do it to every row.',
    fix: 'Turn row security on for this table.'
  },
  'anyone-can-change': {
    level: 'high',
    summary: 'No part of the rules for this change checks who the person is, so anyone who can use the table may create, change or delete rows.',
    risk: 'Any signed-in person may change or delete rows that are not theirs.',
    fix: 'Use a membership or owner rule for these operations, or add a restrictive one that checks who the person is; keep a rule for anyone for read only, and only when every row is public.'
  },
  'limit-blocks-outside-grant': {
    level: 'medium',
    summary: 'A limit that requires membership may also block the people that another rule lets in on purpose without membership.',
    risk: 'Shares, published rows or listed people outside the team may be cut off, so that rule does nothing for them.',
    fix: 'Remove the membership limit, or require membership inside the rules that need it instead of as a limit on all of them.'
  },
  'write-without-read': {
    level: 'medium',
    summary:
      'The rule for this change may let in people who cannot read the row (for create: the row they make), and a change through the API reads it, so they may be refused.',
    risk: 'People the rule names may get an error, and the words of the rule may promise access the table does not give.',
    fix: 'Give read the same rule as the change or a wider one, or narrow the change to the people who can read the row; grant read where the table does not.'
  },
  'raw-part-may-widen': {
    level: 'high',
    summary:
      'A rule here holds a part its words may not fully state, in a place where it can let more people in (on its own, under OR, or under NOT); the words of the rule say which part, and why.',
    risk: 'The part may let in people the words do not name, up to every signed-in person for every row.',
    fix: 'Write the rule with Authz nodes, AND, OR and NOT, with the settings and column names its words state, so they state all of it; check the stored rule before you trust its words.'
  },
  'reused-column-differs': {
    level: 'medium',
    summary: 'A column a rule reads is not as the rule\'s Data node makes it, so the table may not behave as the rule\'s words say; the details say how.',
    risk: 'A create may fail for lack of a value, a row may name another owner or team than the words say, or the rule may not work on the column.',
    fix: 'Give the column the type and the default its Data node gives, or set access that adds a column of its own.'
  },
  'required-column-not-set': {
    level: 'medium',
    summary: 'A required column with no default is left from an access rule the table no longer has, so every create must send a value for it.',
    risk: 'A create that does not send it fails, and nothing in the access of the table says why.',
    fix: 'Give the column a default or make it optional, remove it, or set access whose rules use it again.'
  }
};

// A composite's tree as clauses (an OR of ANDs), each part with its sign. A raw part is a literal with no leaf.
interface Literal {
  leaf?: Leaf;
  positive: boolean;
}
type Clause = Literal[];
const MAX_CLAUSES = 64;

const checkOf = (literal: Literal): AccessCheck | undefined => (literal.leaf ? ACCESS_CHECKS[literal.leaf.type] : undefined);

function clausesOf(expr: Expr, positive = true): Clause[] | undefined {
  if (expr.kind === 'leaf') return [[{ leaf: expr, positive }]];
  if (expr.kind === 'raw') return [[{ positive }]];
  if (expr.kind === 'not') return clausesOf(expr.arg, !positive);
  const parts = expr.args.map((arg) => clausesOf(arg, positive));
  if (parts.some((entry) => !entry)) return undefined;
  let out: Clause[];
  if ((expr.kind === 'and') === positive) {
    out = [[]];
    for (const entry of parts) {
      out = out.flatMap((clause) => entry.map((other) => [...clause, ...other]));
      if (out.length > MAX_CLAUSES) return undefined;
    }
  } else {
    out = parts.flat();
  }
  return out.length > MAX_CLAUSES ? undefined : out;
}

// The expression with each node its words may not fully state read as a part no Authz node describes, so that no
// finding rests on what those words say.
function readable(expr: Expr, related: TableAccessInput['related']): Expr {
  if (expr.kind === 'leaf') return statesAll(expr.type, expr.data, related) ? expr : { kind: 'raw' };
  if (expr.kind === 'raw') return expr;
  if (expr.kind === 'not') return { kind: 'not', arg: readable(expr.arg, related) };
  return { kind: expr.kind, args: expr.args.map((arg) => readable(arg, related)) };
}

// A part no Authz node describes (a stored expression, a node the registry does not have), or a node its words may not
// fully state.
const unreadable = (literal: Literal): boolean => !checkOf(literal);

// A part that limits who passes to people a known node names: a member, a named person or a share.
const namesKnownPeople = (literal: Literal): boolean => literal.positive && ['member', 'named', 'shared'].includes(checkOf(literal)?.person);

// A literal that never holds: a check that lets no one in, or the negation of one that lets everyone in.
const never = (literal: Literal): boolean => (literal.positive ? checkOf(literal)?.person === 'none' : checkOf(literal)?.always === true);

// The clauses that can hold; a tree too large to read gives none, so it fires nothing.
function clausesOfPart(item: Part): Clause[] {
  return (clausesOf(item.expr) ?? []).filter((clause) => !clause.some(never));
}

// The literal limits who passes to people the rule names. A raw part or an unknown node counts as such a check, so that
// no finding rests on a guess.
function namesPeople(literal: Literal): boolean {
  const check = checkOf(literal);
  if (!check) return true;
  return literal.positive && ['member', 'named', 'shared', 'mixed'].includes(check.person);
}

const memberOf = (literal: Literal, scopes: string[]): boolean => literal.positive && checkOf(literal)?.person === 'member' && scopes.includes(checkOf(literal).scope);

function ownerIsRowId(literal: Literal): boolean {
  const owner = checkOf(literal)?.owner;
  const column = owner ? literal.leaf.data[owner] : undefined;
  const columns = Array.isArray(column) ? column : [column];
  return columns.length > 0 && columns.every((name) => name === ROW_ID);
}

// An owner check with no membership in it. An owner column named id means the row is the person.
const bareOwner = (literal: Literal): boolean =>
  literal.positive && Boolean(checkOf(literal)?.owner) && checkOf(literal).person !== 'member' && !ownerIsRowId(literal);

// A literal that admits people with no membership on purpose: row conditions, sessions, shares, listed people. A rule
// that lets everyone in with no check is not one: fencing it with a limit is how a table says "only these people".
function letsOutsidersIn(literal: Literal): boolean {
  const check = checkOf(literal);
  if (!literal.positive || !check || check.always) return false;
  return ['anyone', 'session', 'shared'].includes(check.person) || (check.person === 'named' && !check.owner);
}

const permissiveClauses = (parts: Part[]): Clause[] => parts.filter(lets).flatMap(clausesOfPart);

// A restrictive rule every clause of which meets `test` holds back everyone who fails it.
const fencedBy = (parts: Part[], test: (literal: Literal) => boolean): boolean =>
  parts.some((item) => !lets(item) && clausesOf(item.expr) !== undefined && clausesOfPart(item).every((clause) => clause.some(test)));

// Who passes is limited to people the rules name.
const limitsPeople = (parts: Part[]): boolean => permissiveClauses(parts).every((clause) => clause.some(namesPeople)) || fencedBy(parts, namesPeople);

function groups(parts: Part[], roles: string[]): Part[][] {
  return roles.map((role) => parts.filter((item) => appliesTo(item, role)));
}

// ─── Columns the rules read ──────────────────────────────────────

// The columns an access rule's Data node adds, at their default names: entity_id, owner_id, is_published, ...
let accessColumns: Set<string> | undefined;

function accessColumnNames(): Set<string> {
  accessColumns ??= new Set(
    Object.values(TABLE_NEEDS).flatMap((need) => (need.data_node ? fieldsAddedByNodes([need.data_node.type]).fields.map((field) => field.name) : []))
  );
  return accessColumns;
}

/** A column of the table one rule reads: the Authz node, its parameter (a path for a nested one) and the column. */
export interface ColumnRead {
  type: string;
  param: string;
  column: string;
}

const typeFits = (schema: JSONSchema, value: unknown): boolean =>
  schema.type === undefined ||
  [schema.type]
    .flat()
    .some((type) => (type === 'array' ? Array.isArray(value) : type === 'object' ? typeof value === 'object' && value !== null && !Array.isArray(value) : typeof value === type || (type === 'integer' && Number.isInteger(value))));

interface Reading {
  columns: Array<{ param: string; column: string }>;
  /** A part whose columns cannot be told: a stored expression, or data the node's schema does not describe. */
  opaque: boolean;
  nested: Expr[];
}

const join = (path: string, key: string | number): string => (path ? `${path}.${key}` : String(key));

// The columns of this table a value reads under its schema: column parameters, other than another table's, nested
// expressions included. An object or a list of objects the schema does not describe could read any column.
function readValue(schema: JSONSchema, value: unknown, path: string): Reading {
  const none: Reading = { columns: [], opaque: false, nested: [] };
  if (value === undefined || value === null) return none;
  if (schema.format === 'authz-expression') return { ...none, nested: [treeOf(value)] };
  // Alternative shapes of the value; an anyOf of required key groups constrains keys and is not one.
  const shapes = (schema.anyOf ?? []).filter((entry) => entry.type !== undefined || entry.format !== undefined);
  if (shapes.length) {
    const branch = shapes.find((entry) => typeFits(entry, value));
    return branch ? readValue(branch, value, path) : none;
  }
  if (schema.format === 'column-ref') return typeof value === 'string' && schema['x-column-scope'] !== 'foreign' ? { ...none, columns: [{ param: path, column: value }] } : none;
  const merge = (readings: Reading[]): Reading => ({
    columns: readings.flatMap((entry) => entry.columns),
    opaque: readings.some((entry) => entry.opaque),
    nested: readings.flatMap((entry) => entry.nested)
  });
  if (Array.isArray(value)) {
    const items = !Array.isArray(schema.items) ? schema.items : undefined;
    return items ? merge(value.map((item, i) => readValue(items, item, join(path, i)))) : { ...none, opaque: value.length > 0 };
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (schema.properties) {
      const described = merge(Object.entries(schema.properties).map(([key, inner]) => readValue(inner, record[key], join(path, key))));
      const extra = Object.keys(record).some((key) => !schema.properties[key]);
      return extra ? { ...described, opaque: true } : described;
    }
    return { ...none, opaque: Object.keys(record).length > 0 };
  }
  return none;
}

function readExpr(expr: Expr, owner: string, columns: ColumnRead[], unknown: Set<string>): void {
  if (expr.kind !== 'leaf') {
    if (expr.kind === 'raw') unknown.add(owner);
    for (const arg of expr.kind === 'not' ? [expr.arg] : expr.kind === 'raw' ? [] : expr.args) readExpr(arg, owner, columns, unknown);
    return;
  }
  const node = AUTHZ_NODES.get(expr.type);
  if (!node) {
    unknown.add(expr.type);
    return;
  }
  const reading = readValue(node.parameter_schema, expr.data, '');
  for (const { param, column } of reading.columns) columns.push({ type: expr.type, param, column });
  if (reading.opaque) unknown.add(expr.type);
  for (const nested of reading.nested) readExpr(nested, expr.type, columns, unknown);
}

/**
 * The columns of the table the rules read: each rule, its `with_check`, and the nodes nested in them, from the nodes'
 * column parameters (registry defaults apply). `unknown` names the rule types with a part whose columns cannot be told:
 * a stored raw expression, a type the registry does not have, or data its schema does not describe.
 */
export function columnsReadByPolicies(policies: Array<Pick<TablePolicy, 'type' | 'data' | 'with_check'>>): { columns: ColumnRead[]; unknown: string[] } {
  const columns: ColumnRead[] = [];
  const unknown = new Set<string>();
  for (const policy of policies) {
    for (const rule of [{ type: policy.type, data: policy.data }, ...(policy.with_check ? [policy.with_check] : [])]) {
      const effective = effectivePolicy(rule.type, rule.data ?? {});
      readExpr(exprOf(effective.type, effective.data), rule.type, columns, unknown);
    }
  }
  return { columns: unique(columns, (entry) => JSON.stringify([entry.type, entry.param, entry.column])), unknown: [...unknown] };
}

// A required column with no default that an access rule's Data node adds, and that no rule of the table reads. When a
// part of the rules cannot be read, it may read the column, so nothing is reported.
function strandedColumns(input: TableAccessInput): string[] {
  if (!input.fields) return [];
  const { columns, unknown } = columnsReadByPolicies(input.policies);
  if (unknown.length) return [];
  const read = new Set(columns.map((entry) => entry.column));
  return input.fields.filter((field) => field.required && field.default === null && accessColumnNames().has(field.name) && !read.has(field.name)).map((field) => field.name);
}

/** What may be wrong with the rules of one table, by the shapes the backend docs warn about. */
export function accessFindings(input: TableAccessInput): AccessFinding[] {
  const readableParts = (parts: Part[]): Part[] => parts.map((item) => ({ ...item, expr: readable(item.expr, input.related) }));
  const partsOf = (privilege: TablePrivilege): Part[] => readableParts(partsFor(input.policies, privilege));
  const all = readableParts(input.policies.map(part));
  const rlsOff = input.rls_enabled === false;
  const literals = all.flatMap((item) => (clausesOf(item.expr) ?? []).flat());
  // The membership nodes: no peer ownership, and no limit such as the read-only block.
  const hasMember = literals.some((literal) => memberOf(literal, ['app', 'row']) && !checkOf(literal).limit);
  const rowTeam = literals.some((literal) => memberOf(literal, ['row']));
  // On a table of teams, only team membership fences an owner: an app member who left the team is still in the app.
  const fence = (literal: Literal) => memberOf(literal, rowTeam ? ['row'] : ['app', 'row']);
  const readParts = partsOf('select');
  const roles = rolesOf(input, all);
  type Rule = (parts: Part[], operation: AccessOperation) => boolean;
  const rules: Record<string, Rule> = {
    'owner-outlives-membership': (parts, operation) =>
      hasMember &&
      roles.some((role) => {
        const mine = parts.filter((item) => appliesTo(item, role));
        const read = readParts.filter((item) => appliesTo(item, role));
        const open = permissiveClauses(mine).some((clause) => clause.some(bareOwner) && !clause.some(fence));
        const readFenced = operation !== 'read' && (permissiveClauses(read).every((clause) => clause.some(fence)) || fencedBy(read, fence));
        return open && !fencedBy(mine, fence) && !readFenced;
      }),
    'app-membership-on-team-rows': (parts) =>
      rowTeam &&
      groups(parts, roles).some((mine) => {
        const clauses = permissiveClauses(mine);
        const app = clauses.some((clause) => clause.some((literal) => memberOf(literal, ['app']) && !checkOf(literal).owner));
        return app && clauses.some((clause) => clause.some(bareOwner) && !clause.some((literal) => memberOf(literal, ['app', 'row'])));
      }),
    // No rule at all lets anyone do it: the database refuses it to every role.
    'granted-without-policy': (parts, operation) =>
      Boolean(input.grants) && !rlsOff && !parts.some(lets) && rolesOf(input, parts).some((role) => granted(input, role, PRIVILEGE[operation])),
    // A rule lets some role do it, but none names this granted role: a member of a role a rule names passes.
    'granted-role-without-policy': (parts, operation) =>
      Boolean(input.grants) &&
      !rlsOff &&
      parts.some(lets) &&
      rolesOf(input, parts).some((role) => granted(input, role, PRIVILEGE[operation]) && !parts.some((item) => appliesTo(item, role) && lets(item))),
    'policies-without-row-security': (parts) => rlsOff && parts.length > 0,
    'anyone-can-change': (parts, operation) =>
      operation !== 'read' &&
      !rlsOff &&
      roles.some((role) => {
        const mine = parts.filter((item) => appliesTo(item, role));
        const read = readParts.filter((item) => appliesTo(item, role));
        return mine.some(lets) && granted(input, role, 'select') && !limitsPeople(mine) && !limitsPeople(read);
      }),
    'limit-blocks-outside-grant': (parts) =>
      groups(parts, roles).some(
        (mine) =>
          fencedBy(mine, (literal) => memberOf(literal, ['app', 'row', 'peer'])) &&
          permissiveClauses(mine).some((clause) => !clause.some((literal) => memberOf(literal, ['app', 'row', 'peer'])) && clause.some(letsOutsidersIn))
      ),
    // A part the words may not state, in a permissive rule, in a clause with no part that names people: it can let anyone in.
    // Under AND beside such a part it can only narrow; a restrictive rule can only narrow.
    'raw-part-may-widen': (parts) =>
      parts.some((item) => lets(item) && (clausesOf(item.expr) ?? []).some((clause) => !clause.some(never) && clause.some(unreadable) && !clause.some(namesKnownPeople))),
    'write-without-read': (parts, operation) =>
      operation !== 'read' &&
      !rlsOff &&
      roles.some((role) => {
        const mine = parts.filter((item) => appliesTo(item, role));
        if (!mine.some(lets) || !granted(input, role, PRIVILEGE[operation])) return false;
        if (!granted(input, role, 'select')) return true;
        return !limitsPeople(mine) && limitsPeople(readParts.filter((item) => appliesTo(item, role)));
      })
  };
  const findings: AccessFinding[] = Object.entries(rules).flatMap(([id, fires]) => {
    const operations = OPERATIONS.filter((operation) => fires(partsOf(PRIVILEGE[operation]), operation));
    return operations.length ? [{ id, ...FINDINGS[id], operations }] : [];
  });
  const fields = readableFields(input.fields);
  const stranded = strandedColumns({ ...input, fields });
  if (stranded.length) findings.push({ id: 'required-column-not-set', ...FINDINGS['required-column-not-set'], operations: ['create'], columns: stranded });
  const gaps = fields ? columnGaps(fields, input.policies).filter(({ gaps: kinds }) => kinds.includes('type') || kinds.includes('default')) : [];
  if (gaps.length) {
    findings.push({
      id: 'reused-column-differs',
      ...FINDINGS['reused-column-differs'],
      operations: gaps.some(({ gaps: kinds }) => kinds.includes('type')) ? OPERATIONS : ['create'],
      columns: gaps.map(({ column }) => column),
      details: gaps.map(gapWords)
    });
  }
  return findings;
}

const CURRENT_USER = { function: 'current_user_id', schema: 'jwt_public' };

// The default DataDirectOwner gives an owner column: the id of the person who makes the row.
const isCurrentUser = (value: ColumnDefault): boolean =>
  typeof value === 'object' && value !== null && 'function' in value && value.function === CURRENT_USER.function && value.schema === CURRENT_USER.schema;

function defaultWords(value: ColumnDefault): string {
  if (value === null || value === 'unknown') return String(value);
  if ('generated' in value) return 'a value PostgreSQL computes';
  if (isCurrentUser(value)) return 'the id of the person who makes the row';
  if (value.function !== undefined) return `${value.schema ? `${value.schema}.` : ''}${value.function}()`;
  return `the value ${JSON.stringify(value.value)}`;
}

function gapWords({ column, node, expected, actual, gaps }: ColumnGap): string {
  if (gaps.includes('type')) return `${column} is ${actual.type}, and ${node} makes it ${expected.type}, so the rule cannot work on it.`;
  if (actual.default === null) return `${column} has no default, and ${node} gives it ${defaultWords(expected.default)}, so a create must send it itself.`;
  if (expected.default === null && isCurrentUser(actual.default)) {
    return `${column} defaults to the id of the person who makes the row, and ${node} gives it no default, so a row made without it names its maker.`;
  }
  if (expected.default === null) return `${column} defaults to ${defaultWords(actual.default)}, and ${node} gives it no default, so a create that leaves it out gets that value.`;
  return `${column} defaults to ${defaultWords(actual.default)}, and ${node} gives it ${defaultWords(expected.default)}.`;
}
