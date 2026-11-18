// One reading of `_meta` for everything that writes rows through the app API
// (the seed, the CRUD smoke) or waits for a schema change to show: how a table
// is found by any of its names, its model and key, which columns are required,
// and which ones the owner's id fills.
//
// It imports only by relative path, so the pnpm test runner loads it directly.

import {
  CURRENT_USER_ID,
  normalizeKey,
  scopeOfDefault,
} from '../../app-spec/contract/app-spec.types';
import type { LiveMetaField, LiveMetaTable } from './live-meta';

// The AppSpec contract owns both: a hint's default and a spec's names use them too.
export { CURRENT_USER_ID, normalizeKey };

/**
 * What `_meta` can't say about a field (CONTRACT v1.2): a status column's
 * allowed values, whether a trigger fills it (`required: false`), its default
 * (`$currentUserId` for the owner), and whether the screens hide it.
 */
export type FieldHint = {
  options?: string[];
  hidden?: boolean;
  required?: boolean;
  default?: unknown;
};

/** Normalized table key → normalized field key → hint. */
export type FieldRules = Record<string, Record<string, FieldHint>>;

export function sqlTableName(table: LiveMetaTable): string | undefined {
  if (table.tableName) return table.tableName;
  const name = table.constraints?.primaryKey?.name;
  return name?.endsWith('_pkey') ? name.slice(0, -'_pkey'.length) : undefined;
}

// `_meta` names a table by its GraphQL type. The SQL name is `tableName` on a
// current backend; an older one only shows it in the primary key constraint
// (`shifts_pkey`). `query.all` can be a naive plural (`entrys`).
export function tableKeys(table: LiveMetaTable): string[] {
  return [table.name, table.inflection?.tableType, table.query?.all, sqlTableName(table)]
    .filter((key): key is string => Boolean(key))
    .map(normalizeKey);
}

const OWNER_KEYS = new Set(['ownerid', 'entityid']);

// The chunk table an embedding adds (`<table>_chunks`) lists entity_id as
// nullable, but its policy needs it. `_meta` doesn't mark these tables yet
// (planning#2352), so the name is all there is to go on.
const isChunkTable = (table: LiveMetaTable) => /_chunks$/.test(sqlTableName(table) ?? '');

const lcFirst = (value: string) => (value ? value[0].toLowerCase() + value.slice(1) : value);

export class MetaIndex {
  readonly tables: readonly LiveMetaTable[];
  private byKey = new Map<string, LiveMetaTable>();
  private rules: FieldRules;

  constructor(tables: readonly LiveMetaTable[], rules: FieldRules = {}) {
    this.tables = tables;
    this.rules = rules;
    // The first table to claim a key keeps it.
    for (const table of tables) {
      for (const key of tableKeys(table)) if (!this.byKey.has(key)) this.byKey.set(key, table);
    }
  }

  /** The table by any of its names: `_meta` name, SQL name, query.all, type. */
  find(name: string): LiveMetaTable | undefined {
    return this.byKey.get(normalizeKey(name));
  }

  /** The table's hints, by normalized field key, under whichever name the spec used. */
  rulesFor(table: LiveMetaTable): Record<string, FieldHint> | undefined {
    return tableKeys(table)
      .map((key) => this.rules[key])
      .find(Boolean);
  }

  /** The ORM model, and the row field of a create payload. */
  modelOf(table: LiveMetaTable): string {
    return lcFirst(table.inflection?.tableType ?? table.name);
  }

  /** The single-column primary key, or null for none or a composite one. */
  primaryKeyOf(table: LiveMetaTable): string | null {
    const fields = table.constraints?.primaryKey?.fields ?? [];
    if (fields.length === 1) return fields[0].name;
    if (fields.length > 1) return null;
    const flagged = (table.fields ?? []).filter((f) => f.isPrimaryKey);
    return flagged.length === 1 ? flagged[0].name : null;
  }

  /** NOT NULL with no default, unless a hint says a trigger fills it. */
  isRequired(field: LiveMetaField, hint?: FieldHint): boolean {
    if (hint?.required === false) return false;
    const notNull = field.isNotNull ?? field.type?.isNotNull ?? false;
    const hasDefault = field.hasDefault ?? field.type?.hasDefault ?? false;
    return Boolean(notNull && !hasDefault);
  }

  /** An owner or scope column by name: `owner_id`, `entity_id`, the scope's key. */
  isOwnerColumn(table: LiveMetaTable, field: LiveMetaField): boolean {
    return OWNER_KEYS.has(normalizeKey(field.name)) || field.name === table.scope?.keyColumn;
  }

  /**
   * The columns the owner's id fills when a create leaves them out: a field
   * hinted `$currentUserId` or `$scope:<scope>` (the owner, acting with no
   * workspace picked, works in their personal one), else a required owner or
   * scope column, and a chunk table's entity_id.
   */
  ownerColumns(table: LiveMetaTable): string[] {
    const rules = this.rulesFor(table);
    const chunks = isChunkTable(table);
    return (table.fields ?? [])
      .filter((field) => {
        const hint = rules?.[normalizeKey(field.name)];
        if (hint?.default === CURRENT_USER_ID || scopeOfDefault(hint?.default)) return true;
        if (chunks && normalizeKey(field.name) === 'entityid') return true;
        return this.isOwnerColumn(table, field) && this.isRequired(field, hint);
      })
      .map((field) => field.name);
  }
}
