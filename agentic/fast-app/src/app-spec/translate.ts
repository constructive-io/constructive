// AppSpec custom entities → the tables, relations and policies of the
// `provision_blueprint` call that the delta assembles. Each access mode maps to
// the nodes and policies in `skills/custom-tools/references/data-access.md`;
// read that file before changing anything here.

import { linkKey, linkTableName } from './names';
import type { ScopeColumn } from './scope-access';
import type {
  AccessMode,
  SpecBelongsTo,
  SpecEntity,
  SpecField,
  SpecFieldType,
  SpecLink,
} from './types';
import { nowDefault } from './vocabulary';

export type BlueprintNode = string | { $type: string; data?: Record<string, unknown> };

export type BlueprintField = {
  name: string;
  type: string;
  is_required?: boolean;
  default?: string;
};

export type BlueprintPolicy = {
  $type: string;
  data: Record<string, unknown>;
  privileges: string[];
  policy_role: string;
  permissive: boolean;
};

export type BlueprintTable = {
  table_name: string;
  nodes: BlueprintNode[];
  fields?: BlueprintField[];
  policies: BlueprintPolicy[];
};

export type BlueprintRelation = {
  $type: 'RelationBelongsTo';
  source_table: string;
  target_table: string;
  field_name: string;
  delete_action: 'c' | 'n' | 'r';
  is_required: boolean;
};

export const OWNER_FIELD = 'owner_id';

export const FIELD_TYPES: Record<SpecFieldType, string> = {
  text: 'text',
  long_text: 'text',
  integer: 'integer',
  decimal: 'numeric',
  money: 'numeric',
  boolean: 'boolean',
  date: 'date',
  timestamp: 'timestamptz',
  email: 'email',
  url: 'url',
  uuid: 'uuid',
  json: 'jsonb',
};

const DELETE_ACTIONS = { cascade: 'c', set_null: 'n', restrict: 'r' } as const;
const ALL_PRIVILEGES = ['select', 'insert', 'update', 'delete'];

// Every app table: a uuid key, an owner stamped from the session that the
// client can't override, and timestamps.
const BASE_NODES: readonly BlueprintNode[] = [
  'DataId',
  'DataDirectOwner',
  { $type: 'DataForceCurrentUser', data: { field_name: OWNER_FIELD } },
  'DataTimestamps',
];

const GRANT = { privileges: [...ALL_PRIVILEGES], policy_role: 'authenticated', permissive: true };

/** The policy of an app-wide access: every member, or only the row's creator. */
export function accessPolicy(mode: 'shared' | 'private'): BlueprintPolicy {
  return mode === 'private'
    ? { $type: 'AuthzAppMemberOwner', data: { owner_field: OWNER_FIELD }, ...GRANT }
    : { $type: 'AuthzAppMembership', data: {}, ...GRANT };
}

/** Only the members of the row's entity: the scope's membership on the column that names it. */
export const scopePolicy = (column: ScopeColumn): BlueprintPolicy => ({
  $type: 'AuthzEntityMembership',
  data: {
    entity_field: column.field,
    entity_type: column.scope,
    ...(column.kind !== 'workspace' &&
      column.membershipType !== undefined && { membership_type: column.membershipType }),
  },
  ...GRANT,
});

/** What a table's access adds to it: nodes, the columns they need, and its one policy. */
export type AccessPlan = {
  nodes: BlueprintNode[];
  fields: BlueprintField[];
  policy: BlueprintPolicy;
};

// db-tools adds a DataEntityMembership node for an entity membership policy
// whose table has none, and that node makes the column with a key to the
// users table, which an entity type's column must not have. This one names
// the column the spec declares and makes nothing.
const entityMembershipOn = (field: string): BlueprintNode => ({
  $type: 'DataEntityMembership',
  data: { entity_field_name: field, include_id: false, include_user_fk: false },
});

/**
 * A table's access plan: `column` names a scoped row's entity, else the access
 * is app-wide. `keyRequired` is whether the key the column is, or comes
 * through, is NOT NULL.
 */
export function accessPlan(
  access: AccessMode,
  column: ScopeColumn | null,
  keyRequired = true,
): AccessPlan {
  if (!column) {
    return {
      nodes: [],
      fields: [],
      policy: accessPolicy(access === 'private' ? 'private' : 'shared'),
    };
  }
  const policy = scopePolicy(column);
  switch (column.kind) {
  case 'workspace':
    return {
      nodes: [{ $type: 'DataOwnershipInEntity', data: { entity_field: column.field } }],
      fields: [],
      policy,
    };
  case 'key':
    // Declared, as the agent blueprint declares a key a node reads; the relation adds its key.
    return {
      nodes: [entityMembershipOn(column.field)],
      fields: [{ name: column.field, type: 'uuid', ...(keyRequired && { is_required: true }) }],
      policy,
    };
  case 'inherited':
    // The trigger checks that both columns exist, so both are declared here.
    return {
      nodes: [
        {
          $type: 'DataInheritFromParent',
          data: {
            parent_fk_field: column.via.field,
            parent_table: column.parent,
            fields: [column.field],
          },
        },
        entityMembershipOn(column.field),
      ],
      fields: [
        { name: column.via.field, type: 'uuid', ...(keyRequired && { is_required: true }) },
        { name: column.field, type: 'uuid', is_required: true },
      ],
      policy,
    };
  }
}

export const accessOf = (entity: SpecEntity | undefined): AccessMode => entity?.access ?? 'shared';

/** A foreign key is NOT NULL unless it's set to null on delete or listed as optional. */
export function keyIsRequired(entity: SpecEntity, key: SpecBelongsTo): boolean {
  if (key.onDelete === 'set_null') return false;
  const listed = entity.fields.find((field) => field.name === key.field);
  return listed ? listed.required === true : true;
}

export function defaultExpression(field: SpecField, where: string, warnings: string[]) {
  const value = field.default;
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    // provision_blueprint reads a quoted string as a literal value.
    return nowDefault(field.type, value) ?? `'${value}'`;
  }
  warnings.push(`${where}: a list or object default isn't supported, so the column has none.`);
  return undefined;
}

export function statusNode(field: SpecField): BlueprintNode {
  const data: Record<string, unknown> = {
    field_name: field.name,
    allowed_values: field.enum,
    is_required: field.required === true,
  };
  if (typeof field.default === 'string') data.default_value = { value: field.default };
  return { $type: 'DataStatusField', data };
}

// The entity's own columns as fields and status nodes; a key column is its
// relation's to make, with its own NOT NULL rule.
function columnsOf(entity: SpecEntity, columns: readonly SpecField[], warnings: string[]) {
  const keys = new Set((entity.belongsTo ?? []).map((key) => key.field));
  const fields: BlueprintField[] = [];
  const statusNodes: BlueprintNode[] = [];
  for (const field of columns) {
    if (keys.has(field.name)) continue;
    const where = `backend.entities.${entity.name}.fields[${entity.fields.indexOf(field)}]`;
    if (field.enum?.length) {
      statusNodes.push(statusNode(field));
      continue;
    }
    if (field.type === 'uuid' && field.name.endsWith('_id')) {
      warnings.push(
        `${where}: "${field.name}" looks like a foreign key, but no belongsTo points it at an entity, so it stays a plain uuid.`,
      );
    }
    const out: BlueprintField = { name: field.name, type: FIELD_TYPES[field.type] };
    if (field.required) out.is_required = true;
    const expression = defaultExpression(field, where, warnings);
    if (expression !== undefined) out.default = expression;
    fields.push(out);
  }
  return { fields, statusNodes };
}

export function entityTable(
  entity: SpecEntity,
  warnings: string[],
  access: AccessPlan = accessPlan(accessOf(entity), null),
): BlueprintTable {
  const { fields, statusNodes } = columnsOf(entity, entity.fields, warnings);
  const all = [...access.fields, ...fields];
  return {
    table_name: entity.name,
    nodes: [...BASE_NODES, ...access.nodes, ...statusNodes],
    ...(all.length > 0 && { fields: all }),
    policies: [access.policy],
  };
}

/**
 * New columns on an entity type's table. The backend made the table with its
 * id, owner, timestamps and membership policies, so it gets no BASE_NODES and
 * no access policy: those would stamp its parent with the creator and open
 * its rows to every app member.
 */
export function entityTypeColumns(
  entity: SpecEntity,
  columns: readonly SpecField[],
  warnings: string[],
): BlueprintTable {
  const { fields, statusNodes } = columnsOf(entity, columns, warnings);
  return {
    table_name: entity.name,
    nodes: statusNodes,
    ...(fields.length > 0 && { fields }),
    policies: [],
  };
}

/** A key from `table`; `required` defaults to the entity's rule for it. */
export function belongsToRelation(
  table: string,
  key: SpecBelongsTo,
  required: boolean,
): BlueprintRelation {
  return {
    $type: 'RelationBelongsTo',
    source_table: table,
    target_table: key.to,
    field_name: key.field,
    delete_action: DELETE_ACTIONS[key.onDelete ?? 'restrict'],
    is_required: required,
  };
}

// A link is a table of its own, not a RelationManyToMany: provision_blueprint
// can't hand a junction its nodes, grants or policies, and the backend adds
// none, so the junction would be unreachable. A link to a private row is private.
export function linkTable(
  link: SpecLink,
  accessOfSide: (table: string) => AccessMode,
  /** A link to a scoped row copies its entity, and only that entity's members see it. */
  scoped?: AccessPlan,
) {
  const name = linkTableName(link);
  const mode: AccessMode = link.between.some((side) => accessOfSide(side) === 'private')
    ? 'private'
    : 'shared';
  const access = scoped ?? accessPlan(mode, null);
  const table: BlueprintTable = {
    table_name: name,
    nodes: [...BASE_NODES, ...access.nodes],
    ...(access.fields.length > 0 && { fields: access.fields }),
    policies: [access.policy],
  };
  const relations = link.between.map(
    (side): BlueprintRelation => ({
      $type: 'RelationBelongsTo',
      source_table: name,
      target_table: side,
      field_name: linkKey(side),
      delete_action: 'c',
      is_required: true,
    }),
  );
  return { table, relations };
}
