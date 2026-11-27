// What a rule needs on its table: the Data node that adds the columns an Authz node reads, the columns each Data node
// adds (with their defaults, as the backend's generators create them), and which rows such a default fills.

import { allNodeTypes, type FieldDefault, type NodeTypeDefinition } from 'node-type-registry';

import { effectivePolicy, isObject, type TablePolicy } from './policies';

/**
 * What an Authz node needs on the table: `has-module` (a Data node adds the columns it reads, `data_node`),
 * `needs-fields` (it reads columns the caller adds), `needs-table` (it reads another table), `no-fields` (it reads no
 * column of the table), `mixed` (it needs what its nested nodes need).
 */
export type TableKind = 'has-module' | 'needs-fields' | 'needs-table' | 'no-fields' | 'mixed';

/** The Data node that adds the columns an Authz node reads. */
export interface DataNodeNeed {
  type: string;
  /**
   * For each Authz parameter that names such a column: the Data node parameter that takes its value, or the fixed name
   * the Data node always gives the column (the rule must name that column).
   */
  columns: Record<string, { param: string } | { name: string }>;
}

/**
 * The default of a column a Data node adds: `null` for none, `'unknown'` where it has not been checked, a constant (or
 * the node parameter that holds it), a function call, the node parameter that holds the whole default, or an identity
 * or generated column, which takes no default.
 */
export type AddedDefault =
  | null
  | 'unknown'
  | { value: string | number | boolean | { param: string } }
  | { function: string; schema?: string }
  | { param: string }
  | { generated: 'identity' | 'expression' };

/** One column a Data node adds to its table. */
export interface AddedField {
  /** The column name, or the node parameter whose value names it (registry default applies). */
  name: string | { param: string };
  /** The PostgreSQL type, or the node parameter that holds it (a FieldType). */
  type: string | { param: string };
  /** NOT NULL, or the node parameter that decides it. */
  required: boolean | { param: string };
  /** The default the generator gives a column it creates (a column the table already has keeps its own). */
  default: AddedDefault;
  /** Left out when this node parameter is true. */
  unless?: string;
}

export const TABLE_NEEDS: Record<string, { kind: TableKind; data_node?: DataNodeNeed }> = {
  AuthzAllowAll: { kind: 'no-fields' },
  AuthzAppMemberOwner: {
    kind: 'has-module',
    data_node: { type: 'DataDirectOwner', columns: { owner_field: { param: 'owner_field_name' } } }
  },
  AuthzAppMembership: { kind: 'no-fields' },
  AuthzColumnSecurity: { kind: 'needs-fields' },
  AuthzComposite: { kind: 'mixed' },
  AuthzDatabaseClaim: { kind: 'needs-fields' },
  AuthzDenyAll: { kind: 'no-fields' },
  AuthzDirectOwner: {
    kind: 'has-module',
    data_node: { type: 'DataDirectOwner', columns: { entity_field: { param: 'owner_field_name' } } }
  },
  AuthzDirectOwnerAny: { kind: 'needs-fields' },
  AuthzEntityMembership: {
    kind: 'has-module',
    data_node: { type: 'DataEntityMembership', columns: { entity_field: { param: 'entity_field_name' } } }
  },
  AuthzFilePath: { kind: 'needs-table' },
  AuthzHumanOnly: { kind: 'no-fields' },
  AuthzMemberList: { kind: 'needs-fields' },
  AuthzMemberOwner: {
    kind: 'has-module',
    data_node: {
      type: 'DataOwnershipInEntity',
      columns: { owner_field: { name: 'owner_id' }, entity_field: { name: 'entity_id' } }
    }
  },
  AuthzNotReadOnly: {
    kind: 'has-module',
    data_node: { type: 'DataEntityMembership', columns: { entity_field: { param: 'entity_field_name' } } }
  },
  AuthzOrgHierarchy: {
    kind: 'has-module',
    data_node: {
      type: 'DataOwnershipInEntity',
      columns: { anchor_field: { name: 'owner_id' }, entity_field: { name: 'entity_id' } }
    }
  },
  AuthzPeerOwnership: { kind: 'needs-fields' },
  AuthzPublishable: {
    kind: 'has-module',
    data_node: {
      type: 'DataPublishable',
      columns: {
        is_published_field: { param: 'is_published_field_name' },
        published_at_field: { param: 'published_at_field_name' }
      }
    }
  },
  AuthzRelatedEntityMembership: { kind: 'needs-table' },
  AuthzRelatedMemberList: { kind: 'needs-table' },
  AuthzRelatedMemberOwner: { kind: 'needs-table' },
  AuthzRelatedPeerOwnership: { kind: 'needs-table' },
  AuthzSystemOnly: { kind: 'no-fields' },
  AuthzTemporal: { kind: 'needs-fields' },
  AuthzValueAllowed: { kind: 'needs-fields' },
  AuthzValueExists: { kind: 'needs-table' },
  AuthzValueMatch: { kind: 'needs-table' }
};

/**
 * The columns each node of the data module adds. `[]` when it adds none (a trigger, an index, a CHECK constraint, or
 * columns on another table); `'unknown'` where the backend's answer has not been checked.
 */
export const ADDED_FIELDS: Record<string, AddedField[] | 'unknown'> = {
  CheckGreaterThan: [],
  CheckLessThan: [],
  CheckNotEqual: [],
  CheckOneOf: [],
  CheckOwnedRelation: [],
  DataArchivable: [
    { name: 'is_archived', type: 'boolean', required: true, default: { value: false } },
    { name: 'archived_at', type: 'timestamptz', required: false, default: null }
  ],
  DataBulk: 'unknown',
  DataCapabilities: [{ name: { param: 'field' }, type: 'bit', required: true, default: 'unknown' }],
  DataCompositeField: [{ name: { param: 'target' }, type: 'text', required: false, default: null }],
  DataDenormalized: 'unknown',
  DataDirectOwner: [
    {
      name: { param: 'owner_field_name' },
      type: 'uuid',
      required: true,
      default: { function: 'current_user_id', schema: 'jwt_public' }
    }
  ],
  DataEntityMembership: [{ name: { param: 'entity_field_name' }, type: 'uuid', required: true, default: null }],
  DataForceCurrentUser: [],
  DataGenerated: [
    {
      name: { param: 'target' },
      type: { param: 'type' },
      required: { param: 'is_required' },
      default: { generated: 'expression' }
    }
  ],
  DataHistory: [],
  DataI18n: [],
  DataId: [{ name: { param: 'field_name' }, type: 'uuid', required: true, default: { function: 'uuidv7' } }],
  DataIdentity: [
    {
      name: { param: 'target' },
      type: { param: 'type' },
      required: { param: 'is_required' },
      default: { generated: 'identity' }
    }
  ],
  DataImmutableFields: [],
  DataInflection: [],
  DataInheritFromParent: [],
  DataJsonb: [
    {
      name: { param: 'field_name' },
      type: 'jsonb',
      required: { param: 'is_required' },
      default: { param: 'default_value' }
    }
  ],
  DataLock: [
    {
      name: { param: 'lock_field' },
      type: 'boolean',
      required: true,
      default: { value: { param: 'default_locked' } }
    }
  ],
  DataMemberOwner: [
    {
      name: { param: 'owner_field_name' },
      type: 'uuid',
      required: true,
      default: { function: 'current_user_id', schema: 'jwt_public' }
    },
    { name: { param: 'entity_field_name' }, type: 'uuid', required: true, default: null }
  ],
  DataOwnedFields: [],
  DataOwnershipInEntity: [
    {
      name: 'owner_id',
      type: 'uuid',
      required: true,
      default: { function: 'current_user_id', schema: 'jwt_public' }
    },
    { name: 'entity_id', type: 'uuid', required: true, default: null }
  ],
  DataPeoplestamps: [
    { name: { param: 'created_by_field' }, type: 'uuid', required: false, default: null },
    {
      name: { param: 'updated_by_field' },
      type: 'uuid',
      required: false,
      default: null,
      unless: 'append_only'
    }
  ],
  DataPrincipalstamps: [
    { name: { param: 'created_by_principal_field' }, type: 'uuid', required: false, default: null },
    {
      name: { param: 'updated_by_principal_field' },
      type: 'uuid',
      required: false,
      default: null,
      unless: 'append_only'
    }
  ],
  DataPublishable: [
    {
      name: { param: 'is_published_field_name' },
      type: 'boolean',
      required: true,
      default: { value: false }
    },
    { name: { param: 'published_at_field_name' }, type: 'timestamptz', required: false, default: null }
  ],
  DataRealtime: [],
  DataSlug: [],
  DataSoftDelete: [
    { name: 'deleted_at', type: 'timestamptz', required: false, default: null },
    { name: 'is_deleted', type: 'boolean', required: true, default: { value: false } }
  ],
  DataStatusField: [
    {
      name: { param: 'field_name' },
      type: { param: 'type' },
      required: { param: 'is_required' },
      default: { param: 'default_value' }
    }
  ],
  DataTags: [
    {
      name: { param: 'field_name' },
      type: 'citext[]',
      required: { param: 'is_required' },
      default: { param: 'default_value' }
    }
  ],
  DataTimestamps: [
    { name: 'created_at', type: 'timestamptz', required: true, default: { function: 'now' } },
    { name: 'updated_at', type: 'timestamptz', required: true, default: { function: 'now' } }
  ],
  SearchBm25: [],
  SearchFullText: [{ name: { param: 'field_name' }, type: 'tsvector', required: false, default: null }],
  SearchSpatial: 'unknown',
  SearchSpatialAggregate: 'unknown',
  SearchTrgm: [],
  SearchUnified: 'unknown',
  SearchVector: 'unknown',
  TableOrganizationSettings: 'unknown',
  TableUserProfiles: 'unknown',
  TableUserSettings: 'unknown'
};

const NODES = new Map<string, NodeTypeDefinition>(allNodeTypes.map((node) => [node.name, node]));

function withDefaults(node: NodeTypeDefinition, given: Record<string, unknown>): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const [param, schema] of Object.entries(node.parameter_schema.properties ?? {})) {
    if (schema.default !== undefined) values[param] = schema.default;
  }
  return { ...values, ...given };
}

function typeName(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (!isObject(value) || typeof value.name !== 'string') return undefined;
  const { name, array_dimensions } = value as { name: string; array_dimensions?: number };
  return name + '[]'.repeat(array_dimensions ?? 0);
}

/**
 * A column's default with the node's data filled in: `null` for none, `'unknown'` where it has not been checked, a
 * FieldDefault (a constant, a function call, ...), or `{ generated }` for an identity or generated column.
 */
export type ColumnDefault = null | 'unknown' | FieldDefault | { generated: 'identity' | 'expression' };

export interface AddedColumn {
  name: string;
  type: string;
  nullable: boolean;
  default: ColumnDefault;
  /** The node that adds it. */
  node: string;
}

function defaultOf(added: AddedDefault, values: Record<string, unknown>): ColumnDefault {
  if (added === null) return null;
  if (added === 'unknown') return 'unknown';
  if ('param' in added) {
    const given = values[added.param];
    if (given === undefined || given === null) return null;
    return typeof given === 'object' ? (given as FieldDefault) : { value: given as string | number | boolean };
  }
  if ('value' in added) {
    const value = added.value;
    return { value: typeof value === 'object' ? (values[value.param] as FieldDefault['value']) : value };
  }
  return added as Exclude<AddedDefault, null | 'unknown' | { param: string } | { value: unknown }>;
}

// A value, or an operator over values, is a constant; a function or a keyword is not.
function constant(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return true;
  const entry = value as FieldDefault;
  if (entry.function !== undefined || entry.sql_keyword !== undefined) return false;
  if (entry.operator !== undefined) return constant(entry.left) && constant(entry.right);
  return 'value' in entry;
}

/**
 * Which rows a column's default fills when the backend adds the column: a constant rides ADD COLUMN and fills the rows
 * the table has; any other default is set after SET NOT NULL, so it fills new rows only, and a required column with one
 * fails on a table that has rows. An identity or generated column fills every row.
 */
export function defaultFills(value: ColumnDefault): { existing_rows: boolean | 'unknown'; new_rows: boolean | 'unknown' } {
  if (value === 'unknown') return { existing_rows: 'unknown', new_rows: 'unknown' };
  if (value === null) return { existing_rows: false, new_rows: false };
  if ('generated' in value) return { existing_rows: true, new_rows: true };
  return { existing_rows: constant(value), new_rows: true };
}

/**
 * The columns a list of blueprint nodes adds to its table, from `ADDED_FIELDS` and each node's data (registry defaults
 * apply). A node whose columns are not known, or whose data leaves a column unnamed, is listed in `unknown` instead.
 */
export function fieldsAddedByNodes(list: Array<string | { $type: string; data?: object }>): { fields: AddedColumn[]; unknown: string[] } {
  const fields: AddedColumn[] = [];
  const unknown: string[] = [];
  for (const entry of list) {
    const type = typeof entry === 'string' ? entry : entry.$type;
    const node = NODES.get(type);
    const added = ADDED_FIELDS[type];
    if (!node || !added || added === 'unknown') {
      unknown.push(type);
      continue;
    }
    const values = withDefaults(node, typeof entry === 'string' ? {} : ((entry.data ?? {}) as Record<string, unknown>));
    const own: AddedColumn[] = [];
    for (const field of added) {
      if (field.unless && values[field.unless] === true) continue;
      const name = typeof field.name === 'string' ? field.name : values[field.name.param];
      const kind = typeof field.type === 'string' ? field.type : typeName(values[field.type.param]);
      const required = typeof field.required === 'boolean' ? field.required : values[field.required.param] === true;
      if (typeof name !== 'string' || name === '' || !kind) break;
      own.push({ name, type: kind, nullable: !required, default: defaultOf(field.default, values), node: type });
    }
    if (own.length < added.filter((field) => !(field.unless && values[field.unless] === true)).length) unknown.push(type);
    else fields.push(...own.filter((column) => !fields.some((known) => known.name === column.name)));
  }
  return { fields, unknown };
}

/**
 * The table's own id: DataId's column. A rule that reads it as its owner or team column reads the row as the person
 * (the users table: each row is a person, and their own organization), and no Data node makes that column.
 */
export const ROW_ID = 'id';

export interface NeededDataNode {
  $type: string;
  data: Record<string, unknown>;
}

/**
 * The Data nodes a table needs for its rules to have their columns: each rule's Data node with its column names, nested
 * nodes of a combination included. A node is left out when another one adds all its columns, and when the rule reads the
 * row's own id (`ROW_ID`), which no Data node makes. A rule that names a column its Data node adds under another name
 * (the node's columns have fixed names) needs no node when the table has every column the rule reads (`columns`); else
 * it is a problem, not a guess, since the node would add columns the rule does not read.
 */
export function dataNodesForPolicies(
  policies: Array<Pick<TablePolicy, 'type' | 'data'>>,
  columns: ReadonlySet<string> = new Set()
): { nodes: NeededDataNode[]; problems: string[] } {
  const wanted: NeededDataNode[] = [];
  const problems: string[] = [];

  const nested = (value: unknown): void => {
    if (Array.isArray(value)) return value.forEach(nested);
    if (!isObject(value)) return;
    const keys = Object.keys(value);
    if (keys.length === 1 && NODES.get(keys[0])?.category === 'authz' && isObject(value[keys[0]])) {
      return visit(keys[0], value[keys[0]] as Record<string, unknown>);
    }
    Object.values(value).forEach(nested);
  };

  const visit = (policyType: string, policyData: Record<string, unknown>): void => {
    const effective = effectivePolicy(policyType, policyData ?? {});
    const node = NODES.get(effective.type);
    const needs = TABLE_NEEDS[effective.type];
    if (needs?.kind === 'mixed') return nested(effective.data);
    const need = needs?.data_node;
    if (!node || !need) return;
    const values = withDefaults(node, effective.data);
    if (Object.keys(need.columns).some((param) => values[param] === ROW_ID)) return;
    const named = Object.entries(need.columns).map(([param, how]) => ({ param, how, column: values[param] }));
    const unnamed = named.find(({ column }) => typeof column !== 'string' || column === '');
    if (unnamed) {
      problems.push(`${effective.type} names no column in ${unnamed.param}; add "${unnamed.param}" to the rule's data.`);
      return;
    }
    const renamed = named.find(({ how, column }) => 'name' in how && column !== how.name);
    if (renamed && 'name' in renamed.how) {
      const missing = [...new Set(named.map(({ column }) => column as string).filter((column) => !columns.has(column)))];
      if (missing.length === 0) return;
      problems.push(
        `${effective.type} names the column "${renamed.column}" in ${renamed.param}, but ${need.type} always adds "${renamed.how.name}"; ` +
          `add ${missing.map((column) => `"${column}"`).join(' and ')} to the table first, or use "${renamed.how.name}".`
      );
      return;
    }
    wanted.push({ $type: need.type, data: Object.fromEntries(named.flatMap(({ how, column }) => ('param' in how ? [[how.param, column]] : []))) });
  };

  for (const entry of policies) visit(entry.type, entry.data);

  const distinct = wanted.filter((entry, i) => wanted.findIndex((other) => JSON.stringify(other) === JSON.stringify(entry)) === i);
  const names = distinct.map((entry) => fieldsAddedByNodes([entry]).fields.map((column) => column.name));
  const kept = distinct.filter((_entry, i) => {
    const mine = names[i];
    return !names.some((other, j) => j !== i && mine.every((name) => other.includes(name)) && (other.length > mine.length || j < i));
  });
  return { nodes: kept, problems };
}
