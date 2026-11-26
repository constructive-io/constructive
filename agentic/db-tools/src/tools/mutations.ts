import { type HarnessTool, identifierParam, strictObject, textParam, type ToolCallSuggestion, type ToolFailure } from '@agentic-kit/harness';
import { z } from 'zod';

import { toFieldDefault, toFieldType } from '../blueprint/field-type';
import type { ProjectContext } from '../context';
import { DESCRIBE_SCHEMA, failedResult, failureFromError, failureText, noRowCreated, noRowsChanged, type Result, suggest } from '../failure';
import { projectReady } from '../ready';
import {
  findUniqueConstraintId,
  type ResolvedField,
  type ResolvedTable,
  resolveField,
  resolveSchema,
  resolveTable,
  storedName,
} from '../schema-resolve';

export type MutationDetails = {
  success: boolean;
  message: string;
  /** With a partial result: what the backend said about the part that did not happen. */
  errors?: string[];
};

function ok(message: string) {
  return {
    content: [{ type: 'text' as const, text: message }],
    details: { success: true, message },
  };
}

function fail(failure: ToolFailure, errors?: string[]) {
  return failedResult<MutationDetails>(failure, {
    success: false,
    message: failureText(failure),
    ...(errors ? { errors } : {}),
  });
}

// The main change happened and the unique constraint step did not.
function partial(done: string, constraint: ToolFailure, hint: string, retry: ToolCallSuggestion) {
  return fail({ code: 'partial', message: `${done} ${constraint.message.replace(/\.?$/, '.')}`, hint, calls: [retry] }, [constraint.message]);
}

/** The project, and the table (and field) a change names, read before any plan. */
type Named = { context: ProjectContext; table: ResolvedTable; field?: ResolvedField };

async function namedReady(cwd: string, tableName: string, fieldName?: string): Promise<Result<Named>> {
  const ready = await projectReady(cwd);
  if (ready.kind === 'failed') return ready;
  try {
    const table = resolveTable(await resolveSchema(ready.value), tableName);
    return { kind: 'ok', value: { context: ready.value, table, ...(fieldName === undefined ? {} : { field: resolveField(table, fieldName) }) } };
  } catch (err) {
    return { kind: 'failed', failure: failureFromError(err, 'Failed to read the schema of the project database') };
  }
}

// A new field's name is free when the table has no field of the name the backend stores it under.
function fieldTaken(table: ResolvedTable, given: string, stored: string, except?: string): ToolFailure | null {
  if (!table.fields.some((field) => field.name === stored && field.id !== except)) return null;
  const how = stored === given ? '' : `, which is how the backend stores "${given}"`;
  return {
    code: 'name-taken',
    message: `Table "${table.name}" already has a field named "${stored}"${how}.`,
    hint: 'Choose another field name; check the names that exist.',
    calls: [DESCRIBE_SCHEMA],
  };
}

// ── delete_table ──────────────────────────────────────────────────────────

const DeleteTableZod = strictObject('the input', {
  table_name: identifierParam().describe('Name of the table to delete (snake_case)'),
});

/** What delete_table checks before it changes anything: the project, and the table. */
export const deleteTableReady = (params: z.infer<typeof DeleteTableZod>, cwd: string) => namedReady(cwd, params.table_name);

export const deleteTableTool: HarnessTool<typeof DeleteTableZod, MutationDetails> = {
  name: 'delete_table',
  label: 'Delete table',
  description: 'Permanently delete a table and its data from the project database.',
  promptSnippet: 'delete_table: drop an existing table by name. Destructive — gated.',
  parameters: DeleteTableZod,
  effect: 'destructive',
  async execute(params: z.infer<typeof DeleteTableZod>, ctx) {
    const ready = await deleteTableReady(params, ctx.cwd);
    if (ready.kind === 'failed') return fail(ready.failure);
    const { context, table } = ready.value;
    try {
      const result = await context.api.table
        .delete({ where: { id: table.id }, select: { id: true } })
        .unwrap();
      if (!result.deleteTable?.table) {
        return fail(noRowsChanged(`Failed to delete table "${params.table_name}"`, DESCRIBE_SCHEMA));
      }
      return ok(`Deleted table ${params.table_name}`);
    } catch (err) {
      return fail(failureFromError(err, `Failed to delete table "${params.table_name}"`));
    }
  },
};

// ── create_field ──────────────────────────────────────────────────────────

const CreateFieldZod = strictObject('the input', {
  table_name: identifierParam().describe('Name of the table to add the field to'),
  field_name: identifierParam().describe('Field name in snake_case'),
  type: textParam()
    .describe(
      'PostgreSQL type: text, integer, smallint, numeric, boolean, date, timestamp, timestamptz, time, json, jsonb, inet, email, url, image, upload',
    ),
  is_required: z.boolean().describe('Whether the field is NOT NULL. Defaults to false.').optional(),
  default_value: z
    .union([z.string(), z.number(), z.boolean(), z.null()])
    .describe('SQL default expression as text, e.g. "now()", "\'draft\'"; or a number, true or false for a constant')
    .optional(),
  is_unique: z
    .boolean()
    .describe('Whether the field has a unique constraint. Defaults to false.')
    .optional(),
});

/** What create_field checks before it changes anything: the project, the table, and that the field's stored name is free. */
export async function createFieldReady(params: z.infer<typeof CreateFieldZod>, cwd: string): Promise<Result<Named>> {
  const ready = await namedReady(cwd, params.table_name);
  if (ready.kind === 'failed') return ready;
  const taken = fieldTaken(ready.value.table, params.field_name, storedName(params.field_name) ?? params.field_name);
  return taken ? { kind: 'failed', failure: taken } : ready;
}

export const createFieldTool: HarnessTool<typeof CreateFieldZod, MutationDetails> = {
  name: 'create_field',
  label: 'Create field',
  description: 'Add a new field (column) to an existing table in the project database.',
  promptSnippet: 'create_field: add a column to an existing table. Gated.',
  parameters: CreateFieldZod,
  effect: 'write',
  async execute(params: z.infer<typeof CreateFieldZod>, ctx) {
    const ready = await createFieldReady(params, ctx.cwd);
    if (ready.kind === 'failed') return fail(ready.failure);
    const { context, table } = ready.value;
    const { api, databaseId } = context;
    try {

      const result = await api.field
        .create({
          data: {
            name: params.field_name,
            type: toFieldType(params.type) as unknown as Record<string, unknown>,
            tableId: table.id,
            databaseId,
            isRequired: params.is_required ?? false,
            defaultValue: toFieldDefault(params.default_value) as unknown as
              | Record<string, unknown>
              | undefined,
          },
          select: { id: true, name: true, type: true },
        })
        .unwrap();

      const createdId = result.createField?.field?.id;
      if (!createdId) {
        return fail(noRowCreated(`Failed to add field "${params.field_name}" to "${params.table_name}"`, DESCRIBE_SCHEMA));
      }
      // The backend stores the name it was given in its own form (inflection.underscore).
      const stored = result.createField.field.name ?? params.field_name;
      const field = stored === params.field_name ? stored : `${stored} (stored from "${params.field_name}")`;
      const added = `Added field ${table.name}.${field}.`;
      if (params.is_unique) {
        const hint = 'Add the unique constraint to the field again.';
        const retry = suggest('update_field', { table_name: table.name, field_name: stored, is_unique: true }, 'Add the unique constraint');
        try {
          const constraint = await api.uniqueConstraint
            .create({
              data: {
                tableId: table.id,
                databaseId,
                fieldIds: [createdId],
                name: `${table.name}_${stored}_key`,
                type: 'u',
              },
              select: { id: true },
            })
            .unwrap();
          if (!constraint.createUniqueConstraint?.uniqueConstraint) {
            return partial(added, noRowCreated('The unique constraint was not created'), hint, retry);
          }
        } catch (err) {
          return partial(added, failureFromError(err, 'The unique constraint was not created'), hint, retry);
        }
      }

      return ok(added);
    } catch (err) {
      return fail(
        failureFromError(err, `Failed to add field "${params.field_name}" to "${params.table_name}"`, {
          taken: `a field named "${params.field_name}" already exists on "${params.table_name}".`,
          check: DESCRIBE_SCHEMA,
        }),
      );
    }
  },
};

// ── update_field ──────────────────────────────────────────────────────────

const UpdateFieldZod = strictObject('the input', {
  table_name: identifierParam().describe('Name of the table containing the field'),
  field_name: identifierParam().describe('Current field name'),
  new_name: identifierParam().describe('New field name in snake_case (if renaming)').optional(),
  is_required: z.boolean().describe('Set NOT NULL constraint').optional(),
  default_value: z
    .union([z.string(), z.number(), z.boolean(), z.null()])
    .describe('New SQL default expression as text, a number, true or false for a constant, or null to remove')
    .optional(),
  is_unique: z.boolean().describe('Set or remove unique constraint').optional(),
});

type UpdateFieldParams = z.infer<typeof UpdateFieldZod>;

const UPDATE_FIELD_CHANGES = ['new_name', 'is_required', 'default_value', 'is_unique'] as const;

/** What update_field checks before it changes anything: a change to make, and the project. */
export async function updateFieldReady(params: UpdateFieldParams, cwd: string): Promise<Result<Named & { field: ResolvedField }>> {
  if (!UPDATE_FIELD_CHANGES.some((key) => params[key] !== undefined)) {
    return {
      kind: 'failed',
      failure: {
        code: 'invalid-input',
        message: 'The call gives no change: rename the field, or set whether it is required or unique, or its default.',
      },
    };
  }
  const ready = await namedReady(cwd, params.table_name, params.field_name);
  if (ready.kind === 'failed') return ready;
  const { table, field } = ready.value;
  // The backend keeps a new name of a field as it is given.
  const taken = params.new_name ? fieldTaken(table, params.new_name, params.new_name, field.id) : null;
  return taken ? { kind: 'failed', failure: taken } : { kind: 'ok', value: { ...ready.value, field } };
}

/** Adds or removes the field's unique constraint as asked: whether it changed, or why it could not. */
async function setUnique(
  context: ProjectContext,
  table: ResolvedTable,
  field: ResolvedField,
  params: UpdateFieldParams,
): Promise<'changed' | 'unchanged' | ToolFailure> {
  if (params.is_unique === undefined) return 'unchanged';
  const existingUniqueId = findUniqueConstraintId(table, field.id);
  try {
    if (params.is_unique && !existingUniqueId) {
      const result = await context.api.uniqueConstraint
        .create({
          data: {
            tableId: table.id,
            databaseId: context.databaseId,
            fieldIds: [field.id],
            name: `${table.name}_${params.new_name ?? field.name}_key`,
            type: 'u',
          },
          select: { id: true },
        })
        .unwrap();
      if (!result.createUniqueConstraint?.uniqueConstraint) return noRowCreated('The unique constraint was not added', DESCRIBE_SCHEMA);
      return 'changed';
    }
    if (!params.is_unique && existingUniqueId) {
      const result = await context.api.uniqueConstraint
        .delete({ where: { id: existingUniqueId }, select: { id: true } })
        .unwrap();
      if (!result.deleteUniqueConstraint?.uniqueConstraint) {
        return noRowsChanged('The unique constraint was not removed', DESCRIBE_SCHEMA);
      }
      return 'changed';
    }
    return 'unchanged';
  } catch (err) {
    return failureFromError(err, `The unique constraint was not ${params.is_unique ? 'added' : 'removed'}`);
  }
}

export const updateFieldTool: HarnessTool<typeof UpdateFieldZod, MutationDetails> = {
  name: 'update_field',
  label: 'Update field',
  description: 'Modify an existing field: rename it, toggle required or unique, or set or remove its default. Its data stays.',
  promptSnippet: 'update_field: rename an existing column, or change whether it is required or unique, or its default. Gated.',
  parameters: UpdateFieldZod,
  effect: 'write',
  async execute(params: UpdateFieldParams, ctx) {
    const ready = await updateFieldReady(params, ctx.cwd);
    if (ready.kind === 'failed') return fail(ready.failure);
    const { context, table, field } = ready.value;
    const target = `${params.table_name}.${params.field_name}`;
    try {

      const patch: Record<string, unknown> = {};
      if (params.new_name) patch.name = params.new_name;
      if (params.is_required !== undefined) patch.isRequired = params.is_required;
      if (params.default_value !== undefined) {
        patch.defaultValue =
          params.default_value === null ? null : (toFieldDefault(params.default_value) ?? null);
      }

      const patched = Object.keys(patch).length > 0;
      if (patched) {
        const result = await context.api.field
          .update({
            where: { id: field.id },
            data: patch,
            select: { id: true, name: true, type: true },
          })
          .unwrap();
        if (!result.updateField?.field) {
          return fail(noRowsChanged(`Failed to update field "${params.field_name}" on "${params.table_name}"`, DESCRIBE_SCHEMA));
        }
      }

      const unique = await setUnique(context, table, field, params);
      if (typeof unique === 'object') {
        if (!patched) return fail(unique, [unique.message]);
        const retry = suggest(
          'update_field',
          { table_name: params.table_name, field_name: params.new_name ?? params.field_name, is_unique: params.is_unique },
          'Retry the unique constraint alone',
        );
        return partial(`Updated field ${target}.`, unique, `Retry the unique constraint alone; the other changes are made.`, retry);
      }
      if (!patched && unique === 'unchanged') {
        return ok(`Field ${target} is already ${params.is_unique ? 'unique' : 'not unique'}; nothing changed.`);
      }
      return ok(`Updated field ${target}`);
    } catch (err) {
      return fail(
        failureFromError(err, `Failed to update field "${params.field_name}" on "${params.table_name}"`, {
          ...(params.new_name
            ? { taken: `a field named "${params.new_name}" already exists on "${params.table_name}".`, check: DESCRIBE_SCHEMA }
            : {}),
        }),
      );
    }
  },
};

// ── retype_field ──────────────────────────────────────────────────────────

const RetypeFieldZod = strictObject('the input', {
  table_name: identifierParam().describe('Name of the table containing the field'),
  field_name: identifierParam().describe('Name of the field'),
  type: textParam().describe('The new PostgreSQL type, for example integer or text[]'),
});

/** What retype_field checks before it changes anything: the project, the table and the field. */
export const retypeFieldReady = (params: z.infer<typeof RetypeFieldZod>, cwd: string) => namedReady(cwd, params.table_name, params.field_name);

export const retypeFieldTool: HarnessTool<typeof RetypeFieldZod, MutationDetails> = {
  name: 'retype_field',
  label: 'Retype field',
  description: 'Change the type of an existing field. Every value is converted; a value that does not fit fails the change or loses data. Destructive.',
  promptSnippet: 'retype_field: change the type of an existing column; the cast can lose data. Destructive — gated.',
  parameters: RetypeFieldZod,
  effect: 'destructive',
  async execute(params: z.infer<typeof RetypeFieldZod>, ctx) {
    const ready = await retypeFieldReady(params, ctx.cwd);
    if (ready.kind === 'failed') return fail(ready.failure);
    const { context, field } = ready.value;
    const action = `Failed to change the type of field "${params.field_name}" on "${params.table_name}"`;
    try {
      const result = await context.api.field
        .update({ where: { id: field.id }, data: { type: toFieldType(params.type) as unknown as Record<string, unknown> }, select: { id: true } })
        .unwrap();
      if (!result.updateField?.field) return fail(noRowsChanged(action, DESCRIBE_SCHEMA));
      return ok(`Changed the type of field ${params.table_name}.${params.field_name} to ${params.type}.`);
    } catch (err) {
      return fail(failureFromError(err, action));
    }
  },
};

// ── delete_field ──────────────────────────────────────────────────────────

const DeleteFieldZod = strictObject('the input', {
  table_name: identifierParam().describe('Name of the table containing the field'),
  field_name: identifierParam().describe('Name of the field to delete'),
});

/** What delete_field checks before it changes anything: the project, the table and the field. */
export const deleteFieldReady = (params: z.infer<typeof DeleteFieldZod>, cwd: string) => namedReady(cwd, params.table_name, params.field_name);

export const deleteFieldTool: HarnessTool<typeof DeleteFieldZod, MutationDetails> = {
  name: 'delete_field',
  label: 'Delete field',
  description: 'Permanently delete a field (column) from an existing table.',
  promptSnippet: 'delete_field: drop a column from a table by name. Destructive — gated.',
  parameters: DeleteFieldZod,
  effect: 'destructive',
  async execute(params: z.infer<typeof DeleteFieldZod>, ctx) {
    const ready = await deleteFieldReady(params, ctx.cwd);
    if (ready.kind === 'failed') return fail(ready.failure);
    const { context, field } = ready.value;
    try {
      const result = await context.api.field
        .delete({ where: { id: field.id }, select: { id: true } })
        .unwrap();
      if (!result.deleteField?.field) {
        return fail(noRowsChanged(`Failed to delete field "${params.field_name}" from "${params.table_name}"`, DESCRIBE_SCHEMA));
      }
      return ok(`Deleted field ${params.table_name}.${params.field_name}`);
    } catch (err) {
      return fail(failureFromError(err, `Failed to delete field "${params.field_name}" from "${params.table_name}"`));
    }
  },
};
