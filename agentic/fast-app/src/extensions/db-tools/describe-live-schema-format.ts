// Pure text/detail shaping for the describe_live_schema tool, apart from the
// tool module, which resolves the project and reads the backend.

import type { LiveMetaOperations, LiveMetaTable } from './live-meta';

export type DescribeLiveSchemaDetails = {
  success: boolean;
  message?: string;
  // Set when the endpoint rejected the read for auth reasons and no data-plane
  // token was available; the renderer shows the sign-in prompt.
  needsAuth?: boolean;
  endpoint?: string;
  // Verbatim `_meta` tables: null operations stay null (the operation does not
  // exist on the endpoint), relations and capability blocks pass through.
  tables: LiveMetaTable[];
};

const OPERATION_KEYS = ['all', 'one', 'create', 'update', 'delete'] as const;

function formatOperations(query: LiveMetaOperations): string {
  return OPERATION_KEYS.map((key) => {
    const value = query[key];
    return `${key}=${value === null || value === undefined ? 'none' : value}`;
  }).join(' ');
}

function formatFields(table: LiveMetaTable): string | null {
  if (!table.fields?.length) return null;
  const parts = table.fields.map((field) => {
    const markers = [
      field.isPrimaryKey ? 'pk' : null,
      field.isForeignKey ? 'fk' : null,
      field.isNotNull ? 'required' : null,
      field.hasDefault ? 'default' : null,
    ].filter(Boolean);
    const type = field.type?.gqlType ?? '';
    return `${field.name}${type ? `: ${type}` : ''}${markers.length ? ` (${markers.join(', ')})` : ''}`;
  });
  return parts.join(', ');
}

function formatRelations(table: LiveMetaTable): string | null {
  const relations = table.relations;
  if (!relations) return null;
  const parts: string[] = [];
  for (const rel of relations.belongsTo) {
    parts.push(`belongsTo ${rel.type} via ${rel.fieldName} (keys: ${rel.keys.map((k) => k.name).join(', ')})`);
  }
  for (const rel of relations.hasOne) {
    parts.push(`hasOne ${rel.type} via ${rel.fieldName}`);
  }
  for (const rel of relations.hasMany) {
    parts.push(`hasMany ${rel.type} via ${rel.fieldName}`);
  }
  for (const rel of relations.manyToMany) {
    parts.push(`manyToMany ${rel.rightTable.name} through ${rel.junctionTable.name} via ${rel.fieldName}`);
  }
  return parts.length ? parts.join('; ') : 'none';
}

function formatCapabilities(table: LiveMetaTable): string | null {
  const parts: string[] = [];
  if (table.storage?.isFilesTable) parts.push('storage:files');
  if (table.storage?.isBucketsTable) parts.push('storage:buckets');
  if (table.search) parts.push('search');
  if (table.i18n) parts.push('i18n');
  if (table.realtime) parts.push(`realtime:${table.realtime.subscriptionFieldName}`);
  if (table.scope) parts.push(`scope:${table.scope.scope}/${table.scope.tier} key=${table.scope.keyColumn}`);
  return parts.length ? parts.join(', ') : null;
}

export function formatLiveSchemaText(tables: LiveMetaTable[], endpoint?: string): string {
  const lines: string[] = [];
  const from = endpoint ? ` from ${endpoint}` : '';
  if (tables.length === 0) {
    return `The live data plane${from} serves no tables yet.`;
  }
  lines.push(`Live data-plane schema${from} (${tables.length} tables).`);
  lines.push(
    'Root field names are what the endpoint actually serves — use them verbatim; "none" means the operation does not exist there (not generated or not permitted).',
  );
  for (const table of tables) {
    lines.push('');
    lines.push(table.name);
    if (table.query) lines.push(`  operations: ${formatOperations(table.query)}`);
    const fields = formatFields(table);
    if (fields) lines.push(`  fields: ${fields}`);
    const relations = formatRelations(table);
    if (relations) lines.push(`  relations: ${relations}`);
    const capabilities = formatCapabilities(table);
    if (capabilities) lines.push(`  capabilities: ${capabilities}`);
  }
  return lines.join('\n');
}
