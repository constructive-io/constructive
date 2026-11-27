import type { ToolFailure } from '@agentic-kit/harness';

import type { ProjectContext } from './context';
import { DESCRIBE_SCHEMA, failureFromError, failureFromErrors, ToolFailureError } from './failure';

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
  const { api, databaseId, schemaId } = context;

  const tablesResult = await api.table
    .findMany({
      select: { id: true, name: true },
      where: { databaseId: { equalTo: databaseId }, schemaId: { equalTo: schemaId } },
    })
    .execute();

  if (!tablesResult.ok) throw new ToolFailureError(failureFromErrors(tablesResult.errors, 'Failed to read tables'));

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

    if (!fieldsResult.ok) throw new ToolFailureError(failureFromErrors(fieldsResult.errors, 'Failed to read fields'));

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

/**
 * A name that is not found, and the stored form of it when one of `names` has
 * it: a person often asks for a table or field by the name they made it with.
 */
export function notFound(what: 'Table' | 'Field', name: string, message: string, names: readonly string[]): ToolFailure {
  const stored = renamed(name);
  if (stored !== undefined && names.includes(stored)) {
    return {
      code: 'not-found',
      message: `${message} The backend stores that name as "${stored}", and a ${what.toLowerCase()} of that name exists.`,
      hint: `Call again with the name "${stored}".`,
      calls: [DESCRIBE_SCHEMA],
    };
  }
  return { code: 'not-found', message, hint: `Check the ${what.toLowerCase()} names that exist, then retry.`, calls: [DESCRIBE_SCHEMA] };
}

export function resolveTable(schema: ResolvedSchema, tableName: string): ResolvedTable {
  const table = schema.tables.find((t) => t.name === tableName);
  if (!table) {
    const names = schema.tables.map((t) => t.name);
    throw new ToolFailureError(notFound('Table', tableName, `Table "${tableName}" not found in current schema.`, names));
  }
  return table;
}

export function resolveField(table: ResolvedTable, fieldName: string): ResolvedField {
  const field = table.fields.find((f) => f.name === fieldName);
  if (!field) {
    const names = table.fields.map((f) => f.name);
    throw new ToolFailureError(notFound('Field', fieldName, `Field "${fieldName}" not found in table "${table.name}".`, names));
  }
  return field;
}

export function findUniqueConstraintId(table: ResolvedTable, fieldId: string): string | undefined {
  return table.uniqueConstraints.find((c) => c.fieldIds.includes(fieldId))?.id;
}

// PostgreSQL's `FOR m IN SELECT regexp_matches(str, re, 'g') LOOP str = replace(str, from, to)`: the matches
// are found once in the input, and each replace changes every place the matched text is.
function replaceMatches(str: string, re: RegExp, change: (match: RegExpMatchArray) => [string, string]): string {
  let out = str;
  for (const match of str.matchAll(re)) {
    const [from, to] = change(match);
    out = out.split(from).join(to);
  }
  return out;
}

const lowerTail = (match: RegExpMatchArray): [string, string] => [match[1] + match[2], match[1] + match[2].toLowerCase()];

// inflection.pg_slugify(value, false), less unaccent: storedName answers only for ASCII.
function slugify(value: string): string {
  const caps = replaceMatches(replaceMatches(value, /([A-Z])([A-Z]+$)/g, lowerTail), /([A-Z])([A-Z]+)[A-Z][a-z]/g, lowerTail);
  return caps
    .replace(/[^\w\s-]/gi, '')
    .replace(/^ +| +$/g, '')
    .replace(/[-\s]+/g, '-')
    .replace(/-+/g, '_')
    .replace(/_+/g, '_');
}

/**
 * The name the backend stores for a new table or field named `name`, as it
 * rewrites every new name: a capital starts a word, separators become one
 * underscore, and a word of one letter joins its neighbour (`r2_rows_a` is
 * stored as `r2_rowsa`). Undefined for a
 * name with a character outside ASCII, which the backend strips of accents
 * first (unaccent), so this cannot say.
 */
export function storedName(name: string): string | undefined {
  // eslint-disable-next-line no-control-regex
  if (/[^\x00-\x7f]/.test(name)) return undefined;
  const words = slugify(name)
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/_+/g, '_')
    .replace(/([a-z])_$/i, '$1')
    .replace(/^_([a-z])/i, '$1');
  // inflection.no_single_underscores: at the start, at the end, then in the middle.
  const start = replaceMatches(words, /(^[a-z])(_)/g, (match) => [match[1] + match[2], match[1]]);
  const end = replaceMatches(start, /(_)([a-z]$)/g, (match) => [match[1] + match[2], match[2]]);
  const middle = replaceMatches(end, /(_)([a-z]_)/g, (match) => [match[1] + match[2], match[2]]);
  return [...middle].slice(0, 63).join('');
}

/** The name the backend stores for `name`, when it differs from it. */
export function renamed(name: string): string | undefined {
  const stored = storedName(name);
  return stored !== undefined && stored !== name ? stored : undefined;
}

/** What a plan says about a new table or field name the backend stores differently, or cannot say. */
export function renameNote(what: 'table' | 'field', name: string): string | undefined {
  if (storedName(name) === undefined) {
    return `The backend removes the accents of the ${what} name "${name}" before it stores it, so the stored name may differ; the result names it as stored.`;
  }
  const stored = renamed(name);
  return stored === undefined ? undefined : `The backend stores the ${what} name "${name}" as "${stored}".`;
}

/**
 * A not-found failure for each table a blueprint's relations name that
 * neither the blueprint makes nor the project database has, or null. An end
 * given as a module's table names no table here.
 */
export async function relationTablesMissing(
  context: ProjectContext,
  made: readonly string[],
  relations: ReadonlyArray<{ source_table?: string; source_schema?: string; target_table?: string; target_schema?: string }>,
  schemas: ReadonlyMap<string, string>,
): Promise<ToolFailure | null> {
  const named = relations.flatMap((relation) => [
    { name: relation.source_table, schema: relation.source_schema },
    { name: relation.target_table, schema: relation.target_schema },
  ]).filter((table): table is { name: string; schema: string | undefined } => typeof table.name === 'string');
  if (named.length === 0) return null;
  const key = (name: string, schemaId: string | undefined) => JSON.stringify([schemaId, name]);
  const normalize = (name: string) => storedName(name) ?? name;
  const created = new Set(made.map(normalize));
  const known = new Set<string>();
  const names = new Set<string>();
  try {
    const result = await context.api.table.findMany({ select: { name: true, schemaId: true }, where: { databaseId: { equalTo: context.databaseId } } }).execute();
    if (!result.ok) return failureFromErrors(result.errors, 'Failed to read the tables of the project database');
    for (const table of result.data.tables?.nodes ?? []) {
      names.add(table.name);
      known.add(key(table.name, table.schemaId));
    }
  } catch (err) {
    return failureFromError(err, 'Failed to read the tables of the project database');
  }
  const missing = [...new Set(named.filter(({ name, schema }) => {
    const stored = normalize(name);
    return !created.has(stored) && !(schema === undefined ? names.has(stored) : known.has(key(stored, schemas.get(schema))));
  })
    .map(({ name, schema }) => schema === undefined ? name : `${schema}.${name}`))];
  if (missing.length === 0) return null;
  return {
    code: 'not-found',
    message: missing.map((name) => `A relation of the blueprint names the table "${name}", which neither the blueprint makes nor the project database has.`).join(' '),
    hint: 'Add the table to the blueprint, or name a table that exists.',
    calls: [DESCRIBE_SCHEMA],
  };
}

/** The stored names of the tables of `ids`, read back from the control plane. */
export async function storedTableNames(context: ProjectContext, ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const result = await context.api.table.findMany({ select: { id: true, name: true }, where: { id: { in: ids } } }).execute();
  return new Map(result.ok ? (result.data.tables?.nodes ?? []).map((table) => [table.id, table.name]) : []);
}

/** The schemas of the project database by name: the default one of the project (app_public) and any other. */
export async function readSchemas(context: ProjectContext): Promise<{ kind: 'ok'; value: Map<string, string> } | { kind: 'failed'; failure: ToolFailure }> {
  try {
    const result = await context.api.schema.findMany({ select: { id: true, name: true }, where: { databaseId: { equalTo: context.databaseId } } }).execute();
    if (!result.ok) return { kind: 'failed', failure: failureFromErrors(result.errors, 'Failed to read the schemas of the project database') };
    return { kind: 'ok', value: new Map((result.data.schemas?.nodes ?? []).map((schema) => [schema.name, schema.id])) };
  } catch (err) {
    return { kind: 'failed', failure: failureFromError(err, 'Failed to read the schemas of the project database') };
  }
}

/** A not-found failure for each schema a blueprint names that the project database does not have, or null. */
export function schemasMissing(named: readonly string[], schemas: ReadonlyMap<string, string>): ToolFailure | null {
  const missing = [...new Set(named)].filter((name) => !schemas.has(name));
  if (missing.length === 0) return null;
  return {
    code: 'not-found',
    message: `The blueprint names the schema${missing.length === 1 ? '' : 's'} ${missing.map((name) => `"${name}"`).join(', ')}, which the project database does not have; it has ${[...schemas.keys()].map((name) => `"${name}"`).join(', ')}.`,
    hint: 'Name a schema the project database has, or leave the schema out for the default one.',
  };
}

/**
 * A `name-taken` failure for the tables of `tables` that their schema already has (the project's own, app_public,
 * when a table names none; `schemas` maps the others' names to ids), or null when none does.
 */
export async function tablesTaken(
  context: ProjectContext,
  tables: ReadonlyArray<{ name: string; schema?: string }>,
  schemas: ReadonlyMap<string, string> = new Map(),
): Promise<ToolFailure | null> {
  const bySchema = new Map<string, string[]>();
  for (const { name, schema } of tables) {
    const schemaId = schema === undefined ? context.schemaId : schemas.get(schema);
    if (schemaId !== undefined) bySchema.set(schemaId, [...(bySchema.get(schemaId) ?? []), name]);
  }
  const taken: string[] = [];
  for (const [schemaId, names] of bySchema) {
    try {
      const result = await context.api.table
        .findMany({ select: { name: true }, where: { databaseId: { equalTo: context.databaseId }, schemaId: { equalTo: schemaId } } })
        .execute();
      if (!result.ok) return failureFromErrors(result.errors, 'Failed to read the tables of the project database');
      const existing = new Set((result.data.tables?.nodes ?? []).map((table) => table.name));
      taken.push(...names.filter((name) => existing.has(storedName(name) ?? name)));
    } catch (err) {
      return failureFromError(err, 'Failed to read the tables of the project database');
    }
  }
  const names = [...new Set(taken)];
  if (names.length === 0) return null;
  const listed = names.map((name) => (renamed(name) ? `"${renamed(name)}", which is how the backend stores "${name}"` : `"${name}"`)).join(', ');
  return {
    code: 'name-taken',
    message: `The project database already has ${names.length === 1 ? 'a table' : 'tables'} named ${listed}.`,
    hint: 'Choose another table name, or change the table that exists instead of creating it.',
    calls: [DESCRIBE_SCHEMA],
  };
}
