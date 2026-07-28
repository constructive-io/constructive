import { fieldTypeToTypeName, isInternalPolicy } from '@agentic-kit/harness';
import type { ToolDefinition } from '@earendil-works/pi-coding-agent';
import { z } from 'zod';

import { resolveProjectContext } from '../context';
import { toolSchema } from '../tool-schema';

const ParamZod = z.object({});
const ParamSchema = toolSchema(ParamZod);

type Params = z.infer<typeof ParamZod>;

type SchemaField = {
  name: string;
  type: string;
  isRequired: boolean;
  defaultValue: string | null;
};

type SchemaTable = {
  name: string;
  fields: SchemaField[];
  policies: string[];
};

export type DescribeSchemaDetails = {
  tables: SchemaTable[];
};

function toDefaultValueString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function formatText(details: DescribeSchemaDetails): string {
  const lines: string[] = [];
  if (details.tables.length === 0) {
    lines.push('No application tables yet.');
  } else {
    lines.push(`Tables (${details.tables.length}):`);
    for (const table of details.tables) {
      lines.push(`  ${table.name}`);
      for (const field of table.fields) {
        const req = field.isRequired ? ' required' : '';
        const def = field.defaultValue != null ? ` default=${field.defaultValue}` : '';
        lines.push(`    - ${field.name}: ${field.type}${req}${def}`);
      }
      if (table.policies.length > 0) {
        lines.push(`    policies: ${table.policies.join(', ')}`);
      }
    }
  }
  return lines.join('\n');
}

export const describeSchemaTool: ToolDefinition<typeof ParamSchema, DescribeSchemaDetails> = {
  name: 'describe_schema',
  label: 'Describe schema',
  description:
    'Inspect the current Constructive database schema for this project: application tables with their fields (name, type, required, default). Read-only.',
  promptSnippet:
    'describe_schema: list the project database tables and their fields. Read-only — call before modifying schema.',
  parameters: ParamSchema,
  async execute(_toolCallId, _params: Params, _signal, _onUpdate, ctx) {
    const resolved = await resolveProjectContext(ctx.cwd);
    if (!resolved.context) {
      return {
        content: [{ type: 'text', text: resolved.reason }],
        details: { tables: [] },
      };
    }

    const { api, databaseId } = resolved.context;

    const tablesResult = await api.table
      .findMany({
        select: { id: true, name: true, category: true },
        where: {
          databaseId: { equalTo: databaseId },
          or: [{ category: { equalTo: 'APP' } }, { name: { equalTo: 'users' } }],
        },
        orderBy: ['NAME_ASC'],
      })
      .execute();

    if (!tablesResult.ok) {
      const message = tablesResult.errors.map((e) => e.message).join('; ');
      return {
        content: [{ type: 'text', text: `Failed to read schema: ${message}` }],
        details: { tables: [] },
      };
    }

    const tableNodes = tablesResult.data.tables?.nodes ?? [];
    const tableIds = tableNodes.map((t) => t.id);

    const fieldsByTable = new Map<string, SchemaField[]>();
    const policiesByTable = new Map<string, string[]>();
    if (tableIds.length > 0) {
      const [fieldsResult, policiesResult] = await Promise.all([
        api.field
          .findMany({
            select: {
              name: true,
              type: true,
              isRequired: true,
              defaultValue: true,
              tableId: true,
            },
            where: { tableId: { in: tableIds } },
          })
          .execute(),
        api.policy
          .findMany({
            select: { tableId: true, policyType: true },
            where: { tableId: { in: tableIds } },
          })
          .execute(),
      ]);

      if (!fieldsResult.ok) {
        const message = fieldsResult.errors.map((e) => e.message).join('; ');
        return {
          content: [{ type: 'text', text: `Failed to read fields: ${message}` }],
          details: { tables: [] },
        };
      }

      for (const field of fieldsResult.data.fields?.nodes ?? []) {
        const list = fieldsByTable.get(field.tableId) ?? [];
        list.push({
          name: field.name,
          type: fieldTypeToTypeName(field.type),
          isRequired: Boolean(field.isRequired),
          defaultValue: toDefaultValueString(field.defaultValue),
        });
        fieldsByTable.set(field.tableId, list);
      }

      // One policy spans CRUD as several rows; collapse to distinct types per table.
      if (policiesResult.ok) {
        for (const policy of policiesResult.data.policies?.nodes ?? []) {
          if (isInternalPolicy(policy.policyType)) continue;
          const list = policiesByTable.get(policy.tableId) ?? [];
          if (!list.includes(policy.policyType)) list.push(policy.policyType);
          policiesByTable.set(policy.tableId, list);
        }
      }
    }

    const tables: SchemaTable[] = tableNodes.map((table) => ({
      name: table.name,
      fields: fieldsByTable.get(table.id) ?? [],
      policies: policiesByTable.get(table.id) ?? [],
    }));

    const details: DescribeSchemaDetails = { tables };
    return {
      content: [{ type: 'text', text: formatText(details) }],
      details,
    };
  },
};
