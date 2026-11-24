// The columns and keys of a table that exists already: new ones, changed ones
// and removed ones. A table with rows takes only optional or defaulted columns
// and keys without a destructive tick.

import { guardProtected } from './delta-guards';
import { add, destroy, enumOf, hasColumn, refuse, type Run, sameColumn } from './delta-run';
import { addText, dropText } from './delta-text';
import type { DeltaCall } from './delta-types';
import { newColumnProblem } from './entity-checks';
import type { ModelField, ModelTable } from './spec-model';
import { belongsToRelation, defaultExpression, FIELD_TYPES, statusNode } from './translate';
import type { SpecField } from './types';

function newColumn(run: Run, table: string, { field, path }: ModelField): DeltaCall | null {
  const problem = newColumnProblem(table, field);
  if (problem) {
    refuse(run, path, problem);
    return null;
  }
  if (enumOf(field)) {
    return {
      tool: 'secure_table_provision',
      params: { table_name: table, nodes: [statusNode(field)] },
    };
  }
  const expression = defaultExpression(field, path, run.delta.warnings);
  return {
    tool: 'create_field',
    params: {
      table_name: table,
      field_name: field.name,
      type: FIELD_TYPES[field.type],
      ...(field.required && { is_required: true }),
      ...(expression !== undefined && { default_value: expression }),
    },
  };
}

function changeColumn(run: Run, table: string, was: SpecField, now: ModelField) {
  const { field, path } = now;
  const id = `${table}.${field.name}`;
  const update = (
    params: Omit<
      Extract<DeltaCall, { tool: 'update_field' }>['params'],
      'table_name' | 'field_name'
    >,
  ): DeltaCall => ({
    tool: 'update_field',
    params: { table_name: table, field_name: field.name, ...params },
  });
  const [before, after] = [enumOf(was), enumOf(field)];
  const newDefault = JSON.stringify(was.default) !== JSON.stringify(field.default);
  // A status node on an existing column rewrites its check; it never makes the column required here.
  const status = (): DeltaCall => ({
    tool: 'secure_table_provision',
    params: {
      table_name: table,
      nodes: [statusNode({ ...field, required: Boolean(was.required && field.required) })],
    },
  });
  if (before && !after) {
    refuse(
      run,
      `${path}.enum`,
      `${table}.${field.name} keeps its fixed values in the database, and removing them isn't supported; keep enum (you can add values)`,
    );
    return;
  }
  if (!before && after) {
    destroy(
      run,
      'restrict_values',
      id,
      path,
      dropText.restrict(table, field.name, after),
      status(),
    );
  } else if (FIELD_TYPES[was.type] !== FIELD_TYPES[field.type]) {
    destroy(
      run,
      'change_type',
      id,
      path,
      dropText.type(table, field.name, was.type, field.type),
      update({ new_type: FIELD_TYPES[field.type] }),
    );
  }
  if (before && after) {
    const removed = before.filter((v) => !after.includes(v));
    const added = after.filter((v) => !before.includes(v));
    if (removed.length) {
      destroy(run, 'narrow_enum', id, path, dropText.narrow(table, field.name, removed), status());
    } else if (added.length || newDefault) {
      run.statuses.push(status());
      if (added.length) add(run, 'widen_enum', id, path, addText.widen(table, field.name, added));
      if (newDefault)
        add(
          run,
          'change_default',
          id,
          path,
          addText.defaultValue(table, field.name, field.default),
        );
    }
  } else if (newDefault && !after) {
    run.updates.push(
      update({ default_value: defaultExpression(field, path, run.delta.warnings) ?? null }),
    );
    add(run, 'change_default', id, path, addText.defaultValue(table, field.name, field.default));
  }
  if (!was.required && field.required) {
    destroy(
      run,
      'require_field',
      id,
      path,
      dropText.require(table, field.name),
      update({ is_required: true }),
    );
  } else if (was.required && !field.required) {
    run.updates.push(update({ is_required: false }));
    add(run, 'relax_required', id, path, addText.relax(table, field.name));
  }
}

export function diffColumns(run: Run, name: string, now: ModelTable, was: ModelTable | undefined) {
  const rows = run.options.rows?.[name];
  const added: Array<{ column: ModelField; call: DeltaCall }> = [];
  for (const [column, modelField] of now.fields) {
    const previous = was?.fields.get(column);
    if (!hasColumn(run, name, column, Boolean(previous ?? was?.keys.get(column)))) {
      const call = newColumn(run, name, modelField);
      if (call) added.push({ column: modelField, call });
    } else if (previous) {
      changeColumn(run, name, previous.field, modelField);
    } else if (guardProtected(run, name, column, modelField.path)) {
      continue;
    } else if (enumOf(modelField.field)) {
      // A column made outside plan_app (create_field) has no check yet.
      const { field, path } = modelField;
      destroy(
        run,
        'restrict_values',
        `${name}.${column}`,
        path,
        dropText.restrict(name, column, field.enum ?? []),
        {
          tool: 'secure_table_provision',
          params: { table_name: name, nodes: [statusNode({ ...field, required: false })] },
        },
      );
    }
  }
  const gone = [...(was?.fields.values() ?? [])].filter(
    ({ field }) =>
      !now.fields.has(field.name) &&
      !now.keys.has(field.name) &&
      hasColumn(run, name, field.name, true),
  );
  // One column out and one of the same kind in: most likely a rename.
  if (added.length === 1 && gone.length === 1 && sameColumn(gone[0].field, added[0].column.field)) {
    const [from, to] = [gone[0].field.name, added[0].column.field.name];
    destroy(
      run,
      'rename_field',
      `${name}.${from}`,
      added[0].column.path,
      dropText.rename(name, from, to),
      { tool: 'update_field', params: { table_name: name, field_name: from, new_name: to } },
      { fallback: added[0].call, to },
    );
    return;
  }
  for (const { column, call } of added) {
    (call.tool === 'create_field' ? run.creates : run.statuses).push(call);
    add(
      run,
      'add_field',
      `${name}.${column.field.name}`,
      column.path,
      addText.field(name, column.field),
    );
  }
  for (const { field, path } of gone) {
    // Left unticked, the column stays; a form can't leave out one that new rows need.
    const hide = !field.required || field.default !== undefined;
    destroy(
      run,
      'drop_field',
      `${name}.${field.name}`,
      path,
      dropText.field(name, field.name, rows, hide),
      { tool: 'delete_field', params: { table_name: name, field_name: field.name } },
      { ...(rows === undefined ? {} : { rows }), kept: { table: name, field, hide } },
    );
  }
}

export function diffKeys(run: Run, name: string, now: ModelTable, was: ModelTable | undefined) {
  for (const [column, { key, required, path }] of now.keys) {
    const previous = was?.keys.get(column);
    if (!hasColumn(run, name, column, Boolean(previous))) {
      if (required) {
        refuse(
          run,
          path,
          `${name} has rows already, so a new key must be optional: give it onDelete "set_null", or list "${column}" in fields without required`,
        );
      } else {
        run.relations.push(belongsToRelation(name, key, false));
        add(run, 'add_key', `${name}.${column}`, path, addText.key(name, column, key.to));
      }
      continue;
    }
    if (!previous) {
      if (!guardProtected(run, name, column, path) && was?.fields.has(column))
        refuse(
          run,
          path,
          `${name}.${column} is a plain column already; turning it into a key isn't supported. Add a key with another name`,
        );
      continue;
    }
    if (previous.key.to !== key.to) {
      refuse(
        run,
        `${path}.to`,
        `${name}.${column} points at ${previous.key.to}; pointing it at ${key.to} isn't supported. Add a key with another name`,
      );
    } else if ((previous.key.onDelete ?? 'restrict') !== (key.onDelete ?? 'restrict')) {
      refuse(
        run,
        `${path}.onDelete`,
        `changing onDelete of an existing key isn't supported; keep "${previous.key.onDelete ?? 'restrict'}"`,
      );
    }
    const update = (is_required: boolean): DeltaCall => ({
      tool: 'update_field',
      params: { table_name: name, field_name: column, is_required },
    });
    if (!previous.required && required) {
      destroy(
        run,
        'require_field',
        `${name}.${column}`,
        path,
        dropText.require(name, column),
        update(true),
      );
    } else if (previous.required && !required) {
      run.updates.push(update(false));
      add(run, 'relax_required', `${name}.${column}`, path, addText.relax(name, column));
    }
  }
  const rows = run.options.rows?.[name];
  for (const [column, { key, path }] of was?.keys ?? []) {
    if (now.keys.has(column) || now.fields.has(column) || !hasColumn(run, name, column, true))
      continue;
    destroy(
      run,
      'drop_key',
      `${name}.${column}`,
      path,
      dropText.key(name, column, key.to, rows),
      { tool: 'delete_field', params: { table_name: name, field_name: column } },
      { target: key.to, ...(rows === undefined ? {} : { rows }) },
    );
  }
}
