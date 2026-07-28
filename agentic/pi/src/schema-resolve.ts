import type { ProjectContext } from './context';

export type ResolvedField = {
  id: string;
  name: string;
  tableId: string;
};

export type ResolvedUniqueConstraint = {
  id: string;
  fieldIds: string[];
};

export type ResolvedTable = {
  id: string;
  name: string;
  fields: ResolvedField[];
  uniqueConstraints: ResolvedUniqueConstraint[];
};

export type ResolvedSchema = {
  tables: ResolvedTable[];
};

export async function resolveSchema(context: ProjectContext): Promise<ResolvedSchema> {
  const { api, databaseId } = context;

  const tablesResult = await api.table
    .findMany({
      select: { id: true, name: true },
      where: { databaseId: { equalTo: databaseId } },
    })
    .execute();

  if (!tablesResult.ok) {
    const message = tablesResult.errors.map((e) => e.message).join('; ');
    throw new Error(`Failed to read tables: ${message}`);
  }

  const tableNodes = tablesResult.data.tables?.nodes ?? [];
  const tableIds = tableNodes.map((t) => t.id);

  const fieldsByTable = new Map<string, ResolvedField[]>();
  const constraintsByTable = new Map<string, ResolvedUniqueConstraint[]>();

  if (tableIds.length > 0) {
    const fieldsResult = await api.field
      .findMany({
        select: { id: true, name: true, tableId: true },
        where: { tableId: { in: tableIds } },
      })
      .execute();

    if (!fieldsResult.ok) {
      const message = fieldsResult.errors.map((e) => e.message).join('; ');
      throw new Error(`Failed to read fields: ${message}`);
    }

    for (const field of fieldsResult.data.fields?.nodes ?? []) {
      const list = fieldsByTable.get(field.tableId) ?? [];
      list.push({ id: field.id, name: field.name, tableId: field.tableId });
      fieldsByTable.set(field.tableId, list);
    }

    const constraintsResult = await api.uniqueConstraint
      .findMany({
        select: { id: true, tableId: true, fieldIds: true },
        where: { tableId: { in: tableIds } },
      })
      .execute();

    if (constraintsResult.ok) {
      for (const c of constraintsResult.data.uniqueConstraints?.nodes ?? []) {
        const list = constraintsByTable.get(c.tableId) ?? [];
        list.push({ id: c.id, fieldIds: Array.isArray(c.fieldIds) ? c.fieldIds : [] });
        constraintsByTable.set(c.tableId, list);
      }
    }
  }

  const tables: ResolvedTable[] = tableNodes.map((table) => ({
    id: table.id,
    name: table.name,
    fields: fieldsByTable.get(table.id) ?? [],
    uniqueConstraints: constraintsByTable.get(table.id) ?? [],
  }));

  return { tables };
}

export function resolveTable(schema: ResolvedSchema, tableName: string): ResolvedTable {
  const table = schema.tables.find((t) => t.name === tableName);
  if (!table) throw new Error(`Table "${tableName}" not found in current schema`);
  return table;
}

export function resolveField(table: ResolvedTable, fieldName: string): ResolvedField {
  const field = table.fields.find((f) => f.name === fieldName);
  if (!field) throw new Error(`Field "${fieldName}" not found in table "${table.name}"`);
  return field;
}

export function findUniqueConstraintId(table: ResolvedTable, fieldId: string): string | undefined {
  return table.uniqueConstraints.find((c) => c.fieldIds.includes(fieldId))?.id;
}
