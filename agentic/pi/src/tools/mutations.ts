import { toFieldDefault, toFieldType } from '@agentic-kit/harness';
import type { ToolDefinition } from '@earendil-works/pi-coding-agent';
import { z } from 'zod';

import { resolveProjectContext } from '../context';
import { findUniqueConstraintId, resolveField, resolveSchema, resolveTable } from '../schema-resolve';
import { toolSchema } from '../tool-schema';

export type MutationDetails = {
  success: boolean;
  message: string;
};

function ok(message: string) {
  return {
    content: [{ type: 'text' as const, text: message }],
    details: { success: true, message },
  };
}

function fail(message: string) {
  return {
    content: [{ type: 'text' as const, text: message }],
    details: { success: false, message },
  };
}

// ── delete_table ──────────────────────────────────────────────────────────

const DeleteTableZod = z.object({
  table_name: z.string().describe('Name of the table to delete (snake_case)'),
});
const DeleteTableSchema = toolSchema(DeleteTableZod);

export const deleteTableTool: ToolDefinition<typeof DeleteTableSchema, MutationDetails> = {
  name: 'delete_table',
  label: 'Delete table',
  description: 'Permanently delete a table and its data from the project database.',
  promptSnippet: 'delete_table: drop an existing table by name. Destructive — gated.',
  parameters: DeleteTableSchema,
  async execute(_id, params: z.infer<typeof DeleteTableZod>, _signal, _onUpdate, ctx) {
    const resolved = await resolveProjectContext(ctx.cwd);
    if (!resolved.context) return fail(resolved.reason);
    try {
      const schema = await resolveSchema(resolved.context);
      const table = resolveTable(schema, params.table_name);
      await resolved.context.api.table
        .delete({ where: { id: table.id }, select: { id: true } })
        .unwrap();
      return ok(`Deleted table ${params.table_name}`);
    } catch (err) {
      return fail(err instanceof Error ? err.message : 'Failed to delete table');
    }
  },
};

// ── create_field ──────────────────────────────────────────────────────────

const CreateFieldZod = z.object({
  table_name: z.string().describe('Name of the table to add the field to'),
  field_name: z.string().describe('Field name in snake_case'),
  type: z
    .string()
    .describe(
      'PostgreSQL type: text, integer, smallint, numeric, boolean, date, timestamp, timestamptz, time, json, jsonb, inet, email, url, image, upload',
    ),
  is_required: z.boolean().describe('Whether the field is NOT NULL. Defaults to false.').optional(),
  default_value: z
    .union([z.string(), z.null()])
    .describe('SQL default expression, e.g. "now()", "\'draft\'"')
    .optional(),
  is_unique: z
    .boolean()
    .describe('Whether the field has a unique constraint. Defaults to false.')
    .optional(),
});
const CreateFieldSchema = toolSchema(CreateFieldZod);

export const createFieldTool: ToolDefinition<typeof CreateFieldSchema, MutationDetails> = {
  name: 'create_field',
  label: 'Create field',
  description: 'Add a new field (column) to an existing table in the project database.',
  promptSnippet: 'create_field: add a column to an existing table. Gated.',
  parameters: CreateFieldSchema,
  async execute(_id, params: z.infer<typeof CreateFieldZod>, _signal, _onUpdate, ctx) {
    const resolved = await resolveProjectContext(ctx.cwd);
    if (!resolved.context) return fail(resolved.reason);
    const { api, databaseId } = resolved.context;
    try {
      const schema = await resolveSchema(resolved.context);
      const table = resolveTable(schema, params.table_name);

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

      if (params.is_unique && createdId) {
        try {
          await api.uniqueConstraint
            .create({
              data: {
                tableId: table.id,
                databaseId,
                fieldIds: [createdId],
                name: `${table.name}_${params.field_name}_key`,
                type: 'u',
              },
              select: { id: true },
            })
            .unwrap();
        } catch (err) {
          console.warn('Failed to create unique constraint:', err);
        }
      }

      return ok(`Added field ${params.table_name}.${params.field_name}`);
    } catch (err) {
      return fail(err instanceof Error ? err.message : 'Failed to create field');
    }
  },
};

// ── update_field ──────────────────────────────────────────────────────────

const UpdateFieldZod = z.object({
  table_name: z.string().describe('Name of the table containing the field'),
  field_name: z.string().describe('Current field name'),
  new_name: z.string().describe('New field name in snake_case (if renaming)').optional(),
  new_type: z.string().describe('New PostgreSQL type (if changing type)').optional(),
  is_required: z.boolean().describe('Set NOT NULL constraint').optional(),
  default_value: z
    .union([z.string(), z.null()])
    .describe('New SQL default expression, or null to remove')
    .optional(),
  is_unique: z.boolean().describe('Set or remove unique constraint').optional(),
});
const UpdateFieldSchema = toolSchema(UpdateFieldZod);

export const updateFieldTool: ToolDefinition<typeof UpdateFieldSchema, MutationDetails> = {
  name: 'update_field',
  label: 'Update field',
  description: 'Modify an existing field: rename, change type, toggle required/unique, or set default.',
  promptSnippet: 'update_field: rename/retype/toggle an existing column. Gated.',
  parameters: UpdateFieldSchema,
  async execute(_id, params: z.infer<typeof UpdateFieldZod>, _signal, _onUpdate, ctx) {
    const resolved = await resolveProjectContext(ctx.cwd);
    if (!resolved.context) return fail(resolved.reason);
    const { api, databaseId } = resolved.context;
    try {
      const schema = await resolveSchema(resolved.context);
      const table = resolveTable(schema, params.table_name);
      const field = resolveField(table, params.field_name);

      const patch: Record<string, unknown> = {};
      if (params.new_name) patch.name = params.new_name;
      if (params.new_type) patch.type = toFieldType(params.new_type) as unknown as Record<string, unknown>;
      if (params.is_required !== undefined) patch.isRequired = params.is_required;
      if (params.default_value !== undefined) {
        patch.defaultValue =
          params.default_value === null ? null : (toFieldDefault(params.default_value) ?? null);
      }

      if (Object.keys(patch).length > 0) {
        await api.field
          .update({
            where: { id: field.id },
            data: patch,
            select: { id: true, name: true, type: true },
          })
          .unwrap();
      }

      if (params.is_unique !== undefined) {
        const existingUniqueId = findUniqueConstraintId(table, field.id);
        if (params.is_unique && !existingUniqueId) {
          try {
            await api.uniqueConstraint
              .create({
                data: {
                  tableId: table.id,
                  databaseId,
                  fieldIds: [field.id],
                  name: `${table.name}_${params.new_name ?? field.name}_key`,
                  type: 'u',
                },
                select: { id: true },
              })
              .unwrap();
          } catch (err) {
            console.warn('Failed to create unique constraint:', err);
          }
        } else if (!params.is_unique && existingUniqueId) {
          try {
            await api.uniqueConstraint
              .delete({ where: { id: existingUniqueId }, select: { id: true } })
              .unwrap();
          } catch (err) {
            console.warn('Failed to delete unique constraint:', err);
          }
        }
      }

      return ok(`Updated field ${params.table_name}.${params.field_name}`);
    } catch (err) {
      return fail(err instanceof Error ? err.message : 'Failed to update field');
    }
  },
};

// ── delete_field ──────────────────────────────────────────────────────────

const DeleteFieldZod = z.object({
  table_name: z.string().describe('Name of the table containing the field'),
  field_name: z.string().describe('Name of the field to delete'),
});
const DeleteFieldSchema = toolSchema(DeleteFieldZod);

export const deleteFieldTool: ToolDefinition<typeof DeleteFieldSchema, MutationDetails> = {
  name: 'delete_field',
  label: 'Delete field',
  description: 'Permanently delete a field (column) from an existing table.',
  promptSnippet: 'delete_field: drop a column from a table by name. Destructive — gated.',
  parameters: DeleteFieldSchema,
  async execute(_id, params: z.infer<typeof DeleteFieldZod>, _signal, _onUpdate, ctx) {
    const resolved = await resolveProjectContext(ctx.cwd);
    if (!resolved.context) return fail(resolved.reason);
    try {
      const schema = await resolveSchema(resolved.context);
      const table = resolveTable(schema, params.table_name);
      const field = resolveField(table, params.field_name);
      await resolved.context.api.field
        .delete({ where: { id: field.id }, select: { id: true } })
        .unwrap();
      return ok(`Deleted field ${params.table_name}.${params.field_name}`);
    } catch (err) {
      return fail(err instanceof Error ? err.message : 'Failed to delete field');
    }
  },
};
