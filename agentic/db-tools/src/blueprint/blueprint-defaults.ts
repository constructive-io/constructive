import { dataNodesForPolicies } from '../access';
import { toFieldDefault, toFieldType } from './field-type';

const DEFAULT_GRANTS = [
  {
    roles: ['authenticated'],
    privileges: [
      ['select', '*'],
      ['insert', '*'],
      ['update', '*'],
      ['delete', '*'],
    ],
  },
];

const ALL_PRIVILEGES = ['select', 'insert', 'update', 'delete'];

type Node = string | { $type: string; data?: Record<string, unknown> };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const typeOf = (node: Node): string => (typeof node === 'string' ? node : node.$type);
const listOf = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/** A rule with the role, the privileges and the kind the backend takes when it gives none. */
function expandPolicy(policy: unknown): unknown {
  if (!isRecord(policy)) return policy;
  return { ...policy, privileges: policy.privileges ?? ALL_PRIVILEGES, policy_role: policy.policy_role ?? 'authenticated', permissive: policy.permissive ?? true };
}

/** A field with its type and default in the backend's form: a type name becomes a FieldType, SQL text or a constant a FieldDefault. */
function expandField(field: unknown): unknown {
  if (!isRecord(field)) return field;
  const { default: given, ...rest } = field;
  const type = typeof field.type === 'string' ? toFieldType(field.type) : field.type;
  const value = typeof given === 'string' || typeof given === 'number' || typeof given === 'boolean' || given === null ? toFieldDefault(given as string | number | boolean | null) : given;
  return { ...rest, type, ...(value === undefined ? {} : { default: value }) };
}

// A new table: DataId first, its own nodes, the Data nodes its rules need, DataTimestamps last; its fields as given (the
// backend creates them before the nodes, and a node keeps a column that exists); row security on and the default
// grants unless it gives its own.
function expandTable(table: unknown): unknown {
  if (!isRecord(table) || typeof table.table_name !== 'string') return table;
  const policies = listOf(table.policies).map(expandPolicy);
  const rules = policies.filter(isRecord).map((policy) => ({ type: String(policy.$type), data: isRecord(policy.data) ? policy.data : {} }));
  const declared = listOf(table.fields).flatMap((field) => (isRecord(field) && typeof field.name === 'string' ? [field.name] : []));
  const needed = dataNodesForPolicies(rules, new Set(declared)).nodes;
  const given = listOf(table.nodes).filter((node): node is Node => typeof node === 'string' || (isRecord(node) && typeof node.$type === 'string'));
  const present = new Set(given.map(typeOf));
  const body = given.filter((node) => typeOf(node) !== 'DataId' && typeOf(node) !== 'DataTimestamps');
  const stamps = present.has('DataTimestamps') ? given.filter((node) => typeOf(node) === 'DataTimestamps') : ['DataTimestamps'];
  const nodes: Node[] = ['DataId', ...body, ...needed.filter((node) => !present.has(node.$type)), ...stamps];
  const fields = Array.isArray(table.fields) ? table.fields.map(expandField) : table.fields;
  return {
    ...table,
    use_rls: table.use_rls ?? true,
    grants: table.grants ?? DEFAULT_GRANTS,
    nodes,
    ...(Array.isArray(table.policies) ? { policies } : {}),
    ...(fields === undefined ? {} : { fields }),
  };
}

/**
 * The blueprint the backend receives, with every key the caller gave. A new table (one with a table_name) gets DataId,
 * its own nodes, the Data nodes its rules need (node-type-registry's `dataNodesForPolicies`) and DataTimestamps; row
 * security and the default grants when it gives none; each rule's role, privileges and kind when it gives none; and its
 * fields, each field's type and default in the backend's form. An entry that attaches to
 * a module's table, and every other key of the definition, goes as given. Nothing here checks the blueprint: the
 * registry's JSON Schema and the backend do.
 */
export function expandBlueprintDefaults(definition: Record<string, unknown>): Record<string, unknown> {
  return { ...definition, ...(Array.isArray(definition.tables) ? { tables: definition.tables.map(expandTable) } : {}) };
}
