// The curated blueprints this build ships, and the one reader of their tables:
// the columns a seed row fills, every column a table has, its keys, who sees
// its rows, and what `_meta` can't say (a status column's values, the columns
// a parent row fills, the column the signed-in user fills). list_blueprints,
// AppSpec validation and the delta all read a curated table through here.

import agent from './agent.json';
import agentic_crm from './agentic_crm.json';
import data_room from './data_room.json';
import fundraise from './fundraise.json';

export type CuratedBlueprint = {
  name: string;
  display_name: string;
  description?: string;
  tables?: unknown[];
  relations?: unknown[];
  storage?: unknown[];
  entity_types?: Array<{
    name?: string;
    prefix: string;
    table_name?: string;
    parent_entity?: string;
    is_visible?: boolean;
    storage?: unknown;
  }>;
};

/**
 * The column provision_membership_table gives an entity type's table for its
 * parent entity (a data room's organization). A built database's own name for
 * it is in the scope tree, from its memberships module.
 */
export const ENTITY_OWNER_FIELD = 'owner_id';

// Curated blueprints from constructive-db (`pnpm sync:blueprints`). The backend
// has the engine to construct them but no template rows, so they ship here.
export const CURATED_BLUEPRINTS: Readonly<Record<string, CuratedBlueprint>> = {
  agent,
  agentic_crm,
  data_room,
  fundraise,
};

type Node = string | { $type: string; data?: Record<string, unknown> };

type PolicyJson = { $type: string; data?: Record<string, unknown> };

type TableJson = {
  table_name?: string;
  module?: Record<string, unknown>;
  description?: string;
  nodes?: Node[];
  fields?: Array<{
    name: string;
    type: string | { name?: string };
    is_required?: boolean;
    default?: unknown;
  }>;
  policies?: PolicyJson[];
};

type RelationJson = {
  $type: string;
  source_table: string;
  target_table: string;
  field_name?: string;
  is_required?: boolean;
};

/** A table of a curated blueprint, as a seed row, a form and the delta see it. */
export type CuratedTable = {
  name: string;
  description?: string;
  /** Columns a seed row fills, in order, with their listing text. */
  fill: Array<{ column: string; required: boolean; text: string }>;
  /** Every column the table has, the ones the database and the desktop set included. */
  columns: Set<string>;
  /** Key column → the table it points at. */
  keys: Map<string, string>;
  /** `shared` when every member reads every row; otherwise only some members see a row. */
  access: 'shared' | 'private';
  /** Status column → the values its check allows, when the node lists them. */
  statusValues: Map<string, string[]>;
  /** Columns a trigger copies from the parent row. */
  inherited: string[];
  /** The column the signed-in user's id fills, when the rows belong to an entity. */
  ownerField?: string;
  /**
   * The membership scope of that column's entity, when an AuthzEntityMembership
   * policy guards it (`org` for a CRM's rows): the app fills it from the active
   * workspace. Without one, the column is the user's own.
   */
  ownerScope?: string;
  /** The blueprint's entity type table can be referenced, but owns its schema and seed lifecycle. */
  entityType?: true;
};

/** One entry of a blueprint's tables: a curated table, or one its module creates. */
export type BlueprintEntry =
  | { kind: 'table'; table: CuratedTable }
  | { kind: 'module'; module: Record<string, unknown> };

// Columns the nodes add and the database or the desktop fills. A seed row and
// a form leave them out.
export const SET_FOR_YOU = ['id', 'created_at', 'updated_at', 'owner_id', 'entity_id'];

// The one policy that lets every member of the app read and write every row.
const SHARED_POLICY = 'AuthzAppMembership';

const nodeType = (node: Node) => (typeof node === 'string' ? node : node.$type);
const nodeData = (node: Node) => (typeof node === 'string' ? {} : (node.data ?? {}));
const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v !== '') : [];
const typeName = (type: string | { name?: string }) =>
  typeof type === 'string' ? type : (type.name ?? 'unknown');

function defaultText(value: unknown): string {
  const literal =
    value && typeof value === 'object' && 'value' in value
      ? (value as { value: unknown }).value
      : value;
  return literal === undefined ? '' : ` (default ${JSON.stringify(literal)})`;
}

// The scope an AuthzEntityMembership policy gives a column's rows: members of
// that entity read and write them.
function membershipScopeOf(policies: readonly PolicyJson[], field: string): string | undefined {
  for (const policy of policies) {
    if (policy.$type !== 'AuthzEntityMembership') continue;
    const data = (policy.data ?? {}) as { entity_field?: unknown; entity_type?: unknown };
    const guarded = typeof data.entity_field === 'string' ? data.entity_field : 'entity_id';
    if (guarded === field && typeof data.entity_type === 'string') return data.entity_type;
  }
  return undefined;
}

function curatedTable(table: TableJson & { table_name: string }, relations: RelationJson[]) {
  const name = table.table_name;
  const nodes = table.nodes ?? [];
  const inherited = nodes
    .filter((node) => nodeType(node) === 'DataInheritFromParent')
    .flatMap((node) => (nodeData(node).fields as string[] | undefined) ?? []);
  const owner = nodes.find((node) => nodeType(node) === 'DataOwnershipInEntity');
  const entityField = owner ? nodeData(owner).entity_field : undefined;
  const ownerField = owner && (typeof entityField === 'string' ? entityField : 'entity_id');
  const ownerScope = ownerField ? membershipScopeOf(table.policies ?? [], ownerField) : undefined;
  const keys = new Map(
    relations
      .filter((r) => r.$type === 'RelationBelongsTo' && r.source_table === name && r.field_name)
      .map((r) => [r.field_name as string, r]),
  );
  const fill: CuratedTable['fill'] = [];
  const columns = new Set([...SET_FOR_YOU, ...inherited, ...(ownerField ? [ownerField] : [])]);
  const add = (column: string, text: string, required = false) => {
    if (columns.has(column)) return;
    columns.add(column);
    fill.push({ column, required, text: `${column}${required ? '*' : ''}${text}` });
  };
  for (const field of table.fields ?? []) {
    const key = keys.get(field.name);
    const required =
      (key ? key.is_required !== false : field.is_required) && field.default === undefined;
    add(
      field.name,
      key ? ` → ${key.target_table}` : ` ${typeName(field.type)}${defaultText(field.default)}`,
      required,
    );
  }
  for (const [field, key] of keys) {
    add(field, ` → ${key.target_table}`, key.is_required !== false);
  }
  const statusValues = new Map<string, string[]>();
  for (const node of nodes) {
    const data = nodeData(node);
    if (nodeType(node) === 'DataStatusField') {
      const field = String(data.field_name ?? 'status');
      const allowed = strings(data.allowed_values);
      if (allowed.length) statusValues.set(field, allowed);
      const values = allowed.length ? ` one of ${allowed.join('|')}` : ' text';
      add(field, `${values}${defaultText(data.default_value)}`);
    } else if (nodeType(node) === 'DataJsonb') {
      const field = String(data.field_name ?? 'data');
      add(field, ' json');
    }
  }
  return {
    name,
    description: table.description,
    fill,
    columns,
    keys: new Map([...keys].map(([field, r]) => [field, r.target_table])),
    access:
      table.policies?.length && table.policies.every((p) => p.$type === SHARED_POLICY)
        ? 'shared'
        : 'private',
    statusValues,
    inherited,
    ...(ownerField ? { ownerField } : {}),
    ...(ownerScope ? { ownerScope } : {}),
  } satisfies CuratedTable;
}

/** Every table of the blueprint, in its order; a module's tables have no name of their own. */
export function blueprintEntries(bp: CuratedBlueprint): BlueprintEntry[] {
  const relations = (bp.relations ?? []) as RelationJson[];
  return ((bp.tables ?? []) as TableJson[]).map((table): BlueprintEntry => {
    const { table_name: name } = table;
    return name
      ? { kind: 'table', table: curatedTable({ ...table, table_name: name }, relations) }
      : { kind: 'module', module: table.module ?? {} };
  });
}

/** The AppSpec-facing tables of a curated blueprint, by name; module tables are left out. */
export function curatedTables(bp: CuratedBlueprint): Map<string, CuratedTable> {
  const out = new Map<string, CuratedTable>();
  for (const entry of blueprintEntries(bp)) {
    if (entry.kind === 'table') out.set(entry.table.name, entry.table);
  }
  for (const entity of bp.entity_types ?? []) {
    // Matches provision_membership_table: an override, else prefix || 's'.
    // Entries without a name extend an existing type and create no entity table.
    if (!entity.name) continue;
    const name = entity.table_name ?? `${entity.prefix}s`;
    // Its owner column's hint comes from the scope tree (scopeFieldHints).
    out.set(name, {
      name,
      access: 'private',
      fill: [],
      columns: new Set(['id', 'name', ENTITY_OWNER_FIELD]),
      keys: new Map(),
      statusValues: new Map(),
      inherited: [],
      entityType: true,
    });
  }
  return out;
}
