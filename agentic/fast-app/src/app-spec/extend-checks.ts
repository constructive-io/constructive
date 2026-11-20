// A curated blueprint's `extend`, checked against the blueprint's tables: new
// tables that don't reuse a blueprint name, and new columns and keys that land
// on a real table without reusing a column. A blueprint table has rows by the
// time a follow-up adds to it, so a new column must be optional or have a default.

import {
  checkEntities,
  checkField,
  checkLinks,
  fieldNameKey,
  nameClashes,
  nameClashMessage,
  newColumnProblem,
} from './entity-checks';
import type { SpecModel } from './spec-model';
import type { AppSpec, AppSpecError } from './types';
import { missingBlueprintTable, quoted, SYSTEM_COLUMNS } from './vocabulary';

const BASE = 'backend.extend';

function noTable(slug: string, table: string, tables: string[]): string {
  return `${missingBlueprintTable(slug, table, tables)} A new table goes in extend.entities.`;
}

const entityTypeMessage = (name: string) =>
  `"${name}" is managed by the blueprint; add columns to it under extend.fields, or reference it from an extension table`;

export function checkExtend(model: SpecModel, spec: AppSpec, errors: AppSpecError[]) {
  if (spec.backend.kind !== 'blueprint' || !spec.backend.extend) return;
  const { slug, extend } = spec.backend;
  // An unknown slug is reported with the seed check; there is nothing to check against.
  if (!model.blueprint?.known) return;
  const tables = model.blueprint.tables;
  const names = [...tables.keys()];
  const entities = extend.entities ?? [];
  const targets = new Set([...names, ...entities.map((e) => e.name)]);
  const taken = new Map(
    names.map((t) => [
      t,
      tables.get(t)?.entityType
        ? entityTypeMessage(t)
        : `"${t}" is a table of the ${slug} blueprint already; add columns to it under extend.fields, or name the new table for what it holds`,
    ]),
  );
  checkEntities(entities, `${BASE}.entities`, targets, errors, taken, 'table');
  checkLinks(extend.links ?? [], `${BASE}.links`, targets, errors, 'table');

  const added = new Map<string, Set<string>>();
  for (const [table, fields] of Object.entries(extend.fields ?? {})) {
    const at = `${BASE}.fields.${table}`;
    const known = tables.get(table);
    if (!known) {
      errors.push({ path: at, message: noTable(slug, table, names) });
      continue;
    }
    // The blueprint's columns come without types: a name with a key suffix is a key.
    const existing = [...known.columns].map((name) => ({
      name,
      uuid: name === 'id' || fieldNameKey(name, true) !== name.toLowerCase(),
    }));
    const clashes = new Map(
      nameClashes(
        existing,
        fields.map((field) => ({ name: field.name, uuid: field.type === 'uuid' })),
      ).map(([column, other]) => [column.name, nameClashMessage(column, other)]),
    );
    const seen = new Map<string, number>();
    fields.forEach((field, i) => {
      const fat = `${at}[${i}]`;
      checkField(field, fat, errors);
      const clash = clashes.get(field.name);
      if (clash) errors.push({ path: `${fat}.name`, message: clash });
      if (known.columns.has(field.name) && !SYSTEM_COLUMNS.has(field.name)) {
        errors.push({
          path: `${fat}.name`,
          message: `${table} has a column "${field.name}" already; pick another name`,
        });
      }
      if (seen.has(field.name)) {
        errors.push({
          path: `${fat}.name`,
          message: `"${field.name}" is also [${seen.get(field.name)}]`,
        });
      }
      seen.set(field.name, i);
      const problem = newColumnProblem(table, field);
      if (problem) errors.push({ path: `${fat}.required`, message: problem });
    });
    added.set(table, new Set(seen.keys()));
  }

  for (const [table, keys] of Object.entries(extend.belongsTo ?? {})) {
    const at = `${BASE}.belongsTo.${table}`;
    const known = tables.get(table);
    if (!known) {
      errors.push({ path: at, message: noTable(slug, table, names) });
      continue;
    }
    const columns = new Set([...known.columns, ...(added.get(table) ?? [])]);
    keys.forEach((key, i) => {
      const kat = `${at}[${i}]`;
      if (!targets.has(key.to)) {
        errors.push({
          path: `${kat}.to`,
          message: `no table is named "${key.to}"; the tables are ${quoted(targets)}`,
        });
      }
      if (columns.has(key.field)) {
        errors.push({
          path: `${kat}.field`,
          message: `"${key.field}" is already a column of ${table}; pick another key name`,
        });
      }
      columns.add(key.field);
    });
  }
}
