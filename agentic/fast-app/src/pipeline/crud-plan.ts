// `_meta` → the CRUD smoke plan that verify_app runs through the generated ORM:
// for each table, the values a create needs (required fields only, foreign
// keys pointing at rows of their target table, enums on their first value)
// and one editable field to update. A table the app can't delete from is only
// read, so the smoke never leaves a test row in it. Pure; the smoke script
// resolves the references and the user id at run time.

import { generatedMetaTables } from '../blueprints/generated-tables';
import type { LiveMetaField, LiveMetaTable } from '../extensions/db-tools/live-meta';
import { isPlatformTable } from '../extensions/db-tools/live-meta';
import {
  type FieldRules,
  MetaIndex,
  normalizeKey,
  sqlTableName,
  tableKeys,
} from '../extensions/db-tools/live-meta-index';
import { isEnum, scalarValue, updateFor, type ValueOptions } from './crud-values';

export type CrudValue =
  | { kind: 'literal'; value: unknown }
  /** The id of a row of `table`: the one this smoke run created, else any existing row. */
  | { kind: 'ref'; table: string; model: string; primaryKey: string }
  /** The signed-in owner's user id (owner and scope columns). */
  | { kind: 'userId' }
  | { kind: 'uuid' };

export type CrudResourcePlan = {
  table: string;
  model: string;
  primaryKey: string;
  create: Record<string, CrudValue>;
  update: { field: string; value: unknown } | null;
  /** Tables whose rows the create references, so they are created first. */
  dependsOn: string[];
};

/**
 * A table the smoke reads and creates nothing in: the app can't delete from
 * it, or (`entity`) it is an entity type's table, whose rows come with the
 * memberships, buckets and limits the backend makes and tears down.
 */
export type CrudReadPlan = {
  table: string;
  model: string;
  primaryKey: string;
  readOnly: true;
  entity?: true;
};

export type CrudSkip = { table: string; reason: string };

export type CrudPlan = {
  resources: CrudResourcePlan[];
  readOnly: CrudReadPlan[];
  skipped: CrudSkip[];
};

export type CrudPlanOptions = ValueOptions & {
  /** Limit the plan to these tables (any spelling: `_meta` name, query.all, SQL name). */
  only?: readonly string[];
  /**
   * Field hints `_meta` can't show (see field-hints.ts): allowed values act
   * like enums, `required: false` leaves a column to its trigger, and the
   * `$currentUserId` default sends the owner's id.
   */
  rules?: FieldRules;
  /** The SQL names of the entity types' tables (entity-tables.ts); the smoke only reads them. */
  entityTables?: readonly string[];
};

const READ_ONLY_KEYS = new Set(['createdat', 'updatedat']);

// Foreign-key column → the referenced table's name as `_meta` gives it.
function foreignKeys(table: LiveMetaTable): Map<string, string> {
  const keys = new Map<string, string>();
  for (const fk of table.constraints?.foreignKey ?? []) {
    if (fk.fields.length === 1) keys.set(fk.fields[0].name, fk.refTable.name);
  }
  for (const rel of table.relations?.belongsTo ?? []) {
    if (rel.keys.length === 1 && !keys.has(rel.keys[0].name)) {
      keys.set(rel.keys[0].name, rel.references.name);
    }
  }
  return keys;
}

export function planCrudSmoke(
  tables: readonly LiveMetaTable[],
  options: CrudPlanOptions,
): CrudPlan {
  const skipped: CrudSkip[] = [];
  const index = new MetaIndex(tables, options.rules);
  const only = options.only ? new Set(options.only.map(normalizeKey)) : null;
  const generated = generatedMetaTables(tables);
  const entityTables = new Set(options.entityTables ?? []);

  const planned = new Map<string, CrudResourcePlan>();
  const readOnly: CrudReadPlan[] = [];
  for (const table of tables) {
    if (only && !tableKeys(table).some((key) => only.has(key))) continue;
    const reason = generated.get(table);
    if (reason) {
      skipped.push({ table: table.name, reason });
      continue;
    }
    const entity = entityTables.has(sqlTableName(table) ?? '');
    const plan = entity ? entityReadPlan(table, index) : planTable(table, index, options);
    if ('reason' in plan) skipped.push(plan);
    else if ('readOnly' in plan) readOnly.push(plan);
    else planned.set(table.name, plan);
  }
  return { resources: orderByDependencies(planned, skipped), readOnly, skipped };
}

// An entity type's table is read, never written: a test row there would come
// with memberships, a bucket and limits, and deleting one is the backend's
// teardown to run, not the check's.
function entityReadPlan(table: LiveMetaTable, index: MetaIndex): CrudReadPlan | CrudSkip {
  if (!table.query?.all) return { table: table.name, reason: 'not exposed on the API' };
  const primaryKey = index.primaryKeyOf(table);
  if (!primaryKey) return { table: table.name, reason: 'no single-column primary key' };
  return {
    table: table.name,
    model: index.modelOf(table),
    primaryKey,
    readOnly: true,
    entity: true,
  };
}

function planTable(
  table: LiveMetaTable,
  index: MetaIndex,
  options: CrudPlanOptions,
): CrudResourcePlan | CrudReadPlan | CrudSkip {
  const skip = (reason: string): CrudSkip => ({ table: table.name, reason });
  if (!table.query?.all) return skip('not exposed on the API');
  if (table.storage?.isFilesTable || table.storage?.isBucketsTable) return skip('storage table');
  if (isPlatformTable(table)) return skip('platform table');
  if (!table.query.create) return skip('no create mutation');
  const primaryKey = index.primaryKeyOf(table);
  if (!primaryKey) return skip('no single-column primary key');
  const model = index.modelOf(table);
  if (!table.query.delete) return { table: table.name, model, primaryKey, readOnly: true };

  const fks = foreignKeys(table);
  const owner = new Set(index.ownerColumns(table));
  const create: Record<string, CrudValue> = {};
  const dependsOn: string[] = [];
  const editable: LiveMetaField[] = [];
  const rules = index.rulesFor(table);

  for (const raw of table.fields ?? []) {
    const rule = rules?.[normalizeKey(raw.name)];
    const allowed = rule?.options;
    const field: LiveMetaField =
      allowed?.length && !isEnum(raw)
        ? { ...raw, enumValues: { name: raw.name, values: allowed } }
        : raw;
    const key = normalizeKey(field.name);
    if (field.name === primaryKey) continue;
    // The API takes no value for it on create: the database fills it (a copied parent column).
    if (field.isWritableOnCreate === false) continue;
    // Hints first: they say what `_meta` can't (who fills a NOT NULL column).
    if (owner.has(field.name)) {
      create[field.name] = { kind: 'userId' };
      continue;
    }
    if (index.isOwnerColumn(table, field)) continue;
    const required = index.isRequired(field, rule);
    if (READ_ONLY_KEYS.has(key) && !required) continue;
    const target = fks.get(field.name);
    if (target !== undefined) {
      if (!required) continue;
      const targetTable = index.find(target);
      const targetKey = targetTable ? index.primaryKeyOf(targetTable) : null;
      if (!targetTable || !targetKey || !targetTable.query?.all) {
        return skip(`${field.name} references ${target}, which the API does not expose`);
      }
      if (targetTable.name === table.name) {
        return skip(`${field.name} is a required reference to its own table`);
      }
      create[field.name] = {
        kind: 'ref',
        table: targetTable.name,
        model: index.modelOf(targetTable),
        primaryKey: targetKey,
      };
      dependsOn.push(targetTable.name);
      continue;
    }
    editable.push(field);
    if (!required) continue;
    if (rule?.default !== undefined) {
      create[field.name] = { kind: 'literal', value: rule.default };
      continue;
    }
    if (field.type?.gqlType === 'UUID') {
      create[field.name] = { kind: 'uuid' };
      continue;
    }
    const value = scalarValue(field, options);
    if (!value) return skip(`no test value for required ${field.name} (${field.type?.gqlType})`);
    create[field.name] = { kind: 'literal', value: value.value };
  }

  return {
    table: table.name,
    model,
    primaryKey,
    create,
    update: table.query.update ? updateFor(editable, options) : null,
    dependsOn: [...new Set(dependsOn)],
  };
}

// Parents before children, so a child's reference can point at the row this
// run created. A cycle of required references can't be created at all.
function orderByDependencies(
  planned: Map<string, CrudResourcePlan>,
  skipped: CrudSkip[],
): CrudResourcePlan[] {
  const ordered: CrudResourcePlan[] = [];
  const placed = new Set<string>();
  let pending = [...planned.values()];
  while (pending.length) {
    const ready = pending.filter((plan) =>
      plan.dependsOn.every((dep) => placed.has(dep) || !planned.has(dep)),
    );
    if (!ready.length) {
      for (const plan of pending) {
        skipped.push({ table: plan.table, reason: 'required references form a cycle' });
      }
      break;
    }
    for (const plan of ready) {
      ordered.push(plan);
      placed.add(plan.table);
    }
    pending = pending.filter((plan) => !placed.has(plan.table));
  }
  return ordered;
}
