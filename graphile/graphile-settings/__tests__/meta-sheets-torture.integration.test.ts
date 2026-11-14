import { copyFileSync, mkdirSync, writeFileSync } from 'fs';
import type { GraphQLQueryFnObj } from 'graphile-test';
import { getConnectionsObject, seed } from 'graphile-test';
import {
  buildClientSchema,
  getIntrospectionQuery,
  getNamedType,
  type GraphQLField,
  type GraphQLNamedType,
  type GraphQLSchema,
  type IntrospectionQuery,
  isEnumType,
  isInterfaceType,
  isLeafType,
  isObjectType
} from 'graphql';
import { join } from 'path';

import { ConstructivePreset } from '../src/presets/constructive-preset';

jest.setTimeout(120000);

// A schema with every column, key, relation and upload shape a tenant
// database can have. The tests pin what a generic grid relies on: every table
// _meta reports can be read with every column selected, and _meta agrees with
// the GraphQL schema about names, keys, relations and writability.
const tortureSeed = join(__dirname, '../sql/sheets-torture-seed.sql');

// Sub-selections for every object-typed column output in the torture schema,
// written by hand. A column whose output type is missing here fails the read
// test, so a new shape is noticed instead of guessed.
const COLUMN_SUBSELECTIONS: Record<string, string> = {
  Interval: '{ years months days hours minutes seconds }',
  Point: '{ x y }',
  PostalAddress: '{ street city postalCode country }',
  IntRange: '{ start { value inclusive } end { value inclusive } }',
  DatetimeRange: '{ start { value inclusive } end { value inclusive } }',
  DateRange: '{ start { value inclusive } end { value inclusive } }',
  GeometryInterface: '{ __typename geojson srid }',
  GeographyInterface: '{ __typename geojson srid }'
};

type GraphQLError = { message: string; path?: readonly (string | number)[] };
type Response<T> = { data?: T | null; errors?: readonly GraphQLError[] };

type MetaField = {
  name: string;
  columnName: string;
  isNotNull: boolean;
  hasDefault: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  description: string | null;
  allowedValues: string[] | null;
  isRequiredOnCreate: boolean | null;
  isWritableOnCreate: boolean | null;
  isWritableOnUpdate: boolean | null;
  isComputed: boolean | null;
  enumValues: { name: string; values: string[] } | null;
  file: { kind: string; isMultiple: boolean; filesType: string | null } | null;
  type: {
    pgType: string;
    gqlType: string;
    isArray: boolean;
    maxLength: number | null;
    precision: number | null;
    scale: number | null;
    encoding: { kind: string; srid: number | null; dimensions: number | null; dotPath: boolean | null } | null;
  };
};

type MetaKeyRelation = {
  fieldName: string | null;
  isUnique: boolean;
  type: string | null;
  keys: { name: string }[];
};

type MetaHasRelation = MetaKeyRelation & { remoteKeys: { name: string }[]; referencedBy: { name: string } };

type MetaTable = {
  name: string;
  tableName: string;
  schemaName: string;
  kind: string;
  description: string | null;
  isJunction: boolean;
  query: {
    all: string | null;
    one: string | null;
    create: string | null;
    update: string | null;
    delete: string | null;
  };
  fields: MetaField[];
  constraints: {
    primaryKey: { name: string; fields: { name: string }[] } | null;
    foreignKey: {
      name: string;
      fields: { name: string }[];
      referencedFields: string[];
      refTable: { name: string } | null;
    }[];
  };
  relations: {
    belongsTo: (MetaKeyRelation & { refKeys: { name: string }[]; references: { name: string } })[];
    hasOne: MetaHasRelation[];
    hasMany: MetaHasRelation[];
    manyToMany: {
      fieldName: string | null;
      type: string | null;
      junctionTable: { name: string };
      rightTable: { name: string };
      junctionLeftKeyAttributes: { name: string }[];
      junctionRightKeyAttributes: { name: string }[];
    }[];
  };
  storage: {
    isFilesTable: boolean;
    isBucketsTable: boolean;
    filesType: string;
    bucketsType: string;
    downloadUrlField: string | null;
    upload: { mutation: string; inputType: string; bulkMutation: string };
  } | null;
};

type TableRows = {
  table: string;
  query: string | null;
  data: unknown;
  errors: GraphQLError[];
};

/**
 * A selection of every field of `type`, following object and interface types.
 * `_meta` types have no arguments and no cycles; the depth cap only guards a
 * future change from looping.
 */
function selectEverything(schema: GraphQLSchema, typeName: string, depth = 0): string {
  const type = schema.getType(typeName);
  if (!type || !(isObjectType(type) || isInterfaceType(type)) || depth > 8) {
    throw new Error(`cannot select every field of ${typeName}`);
  }
  const selections = Object.values(type.getFields())
    .filter((field) => field.args.length === 0)
    .map((field) => {
      const named = getNamedType(field.type);
      return isLeafType(named)
        ? field.name
        : `${field.name} ${selectEverything(schema, named.name, depth + 1)}`;
    });
  return `{ ${selections.join(' ')} }`;
}

function columnSelection(field: GraphQLField<unknown, unknown>): string {
  const named: GraphQLNamedType = getNamedType(field.type);
  if (isLeafType(named)) return field.name;
  const subselection = COLUMN_SUBSELECTIONS[named.name];
  if (!subselection) throw new Error(`no sub-selection for ${named.name} (${field.name})`);
  return `${field.name} ${subselection}`;
}

/** The list query a grid sends for a table: every column, first five rows. */
function listQueryFor(schema: GraphQLSchema, table: MetaTable): string | null {
  const listField = table.query.all
    ? schema.getQueryType()?.getFields()[table.query.all]
    : undefined;
  const rowType = schema.getType(table.name);
  if (!listField || !rowType || !(isObjectType(rowType) || isInterfaceType(rowType))) return null;
  const rowFields = rowType.getFields();
  const columns = table.fields.map((field) => columnSelection(rowFields[field.name])).join(' ');
  const listType = getNamedType(listField.type);
  const isConnection = isObjectType(listType) && !!listType.getFields().nodes;
  const body = isConnection ? `{ nodes { ${columns} } }` : `{ ${columns} }`;
  return `query ${table.name}Rows { ${table.query.all}(first: 5) ${body} }`;
}

function rowsOf(rows: TableRows | undefined): Record<string, unknown>[] {
  const data = rows?.data as Record<string, { nodes?: Record<string, unknown>[] }> | null;
  const list = data ? Object.values(data)[0] : null;
  return list?.nodes ?? (Array.isArray(list) ? list : []);
}

function stringsIn(value: unknown, found: string[] = []): string[] {
  if (typeof value === 'string') found.push(value);
  else if (Array.isArray(value)) value.forEach((item) => stringsIn(item, found));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => stringsIn(item, found));
  return found;
}

/**
 * Every field, operation and relation `_meta` names must exist in the GraphQL
 * schema with the type `_meta` gives it.
 */
function contractViolations(schema: GraphQLSchema, tables: MetaTable[]): string[] {
  const rootFields = {
    query: schema.getQueryType()?.getFields() ?? {},
    mutation: schema.getMutationType()?.getFields() ?? {}
  };
  const violations: string[] = [];
  for (const table of tables) {
    const rowType = schema.getType(table.name);
    if (!rowType || !(isObjectType(rowType) || isInterfaceType(rowType))) {
      violations.push(`${table.name}: no output type`);
      continue;
    }
    const rowFields = rowType.getFields();
    for (const field of table.fields) {
      const executable = rowFields[field.name];
      if (!executable) violations.push(`${table.name}.${field.name}: not a field`);
      else if (getNamedType(executable.type).name !== field.type.gqlType) {
        violations.push(`${table.name}.${field.name}: ${field.type.gqlType} != ${getNamedType(executable.type).name}`);
      }
    }
    const operations: [string, string | null, Record<string, unknown>][] = [
      ['all', table.query.all, rootFields.query],
      ['one', table.query.one, rootFields.query],
      ['create', table.query.create, rootFields.mutation],
      ['update', table.query.update, rootFields.mutation],
      ['delete', table.query.delete, rootFields.mutation]
    ];
    for (const [label, name, fields] of operations) {
      if (name && !fields[name]) violations.push(`${table.name}.query.${label}: ${name} is not a root field`);
    }
    const relations = [
      ...table.relations.belongsTo,
      ...table.relations.hasOne,
      ...table.relations.hasMany,
      ...table.relations.manyToMany
    ];
    for (const relation of relations) {
      if (!relation.fieldName) continue;
      const executable = rowFields[relation.fieldName];
      if (!executable) violations.push(`${table.name}.${relation.fieldName}: relation is not a field`);
      else if (getNamedType(executable.type).name !== relation.type) {
        violations.push(`${table.name}.${relation.fieldName}: ${relation.type} != ${getNamedType(executable.type).name}`);
      }
    }
    // The columns on the other end of a relation are fields of that table.
    const otherEnds = [
      ...table.relations.belongsTo.map((r) => ({ r, target: r.references.name, columns: r.refKeys })),
      ...[...table.relations.hasOne, ...table.relations.hasMany].map((r) => ({
        r,
        target: r.referencedBy.name,
        columns: r.remoteKeys
      }))
    ];
    for (const { r, target, columns } of otherEnds) {
      const targetType = schema.getType(target);
      const targetFields = targetType && (isObjectType(targetType) || isInterfaceType(targetType))
        ? targetType.getFields()
        : {};
      if (columns.length !== r.keys.length) violations.push(`${table.name}.${r.fieldName}: key count differs`);
      for (const column of columns) {
        if (!targetFields[column.name]) violations.push(`${table.name}.${r.fieldName}: ${target}.${column.name} is not a field`);
      }
    }
  }
  return violations;
}

const names = (fields: { name: string }[]) => fields.map((f) => f.name);

/**
 * Opt-in fixture capture for the Sheets client work: set
 * SHEETS_META_FIXTURES_DIR to a directory, and SHEETS_META_FIXTURES_LABEL to
 * name the `_meta` capture (`torture-meta.<label>.json`). Normal runs write
 * nothing. A test-only switch, so it is read here rather than through the
 * runtime env helpers.
 */
function fixtureTarget(): { dir: string; label: string } | null {
  const dir = process.env.SHEETS_META_FIXTURES_DIR;
  return dir ? { dir, label: process.env.SHEETS_META_FIXTURES_LABEL || 'latest' } : null;
}

describe('_meta on a schema with every column, key, relation and upload shape', () => {
  let teardown: () => Promise<void>;
  let schema: GraphQLSchema;
  let introspection: IntrospectionQuery;
  let meta: Record<string, unknown>;
  let tables: MetaTable[];
  let rows: TableRows[];
  let query: GraphQLQueryFnObj;

  const table = (tableName: string): MetaTable => {
    const found = tables.find((candidate) => candidate.tableName === tableName);
    if (!found) throw new Error(`no _meta table ${tableName}`);
    return found;
  };
  const field = (tableName: string, name: string) =>
    table(tableName).fields.find((candidate) => candidate.name === name);
  const rowsFor = (tableName: string) =>
    rowsOf(rows.find((entry) => entry.table === table(tableName).name));

  beforeAll(async () => {
    const connections = await getConnectionsObject(
      {
        schemas: ['sheets_torture'],
        preset: { extends: [ConstructivePreset] },
        useRoot: true
      },
      [seed.sqlfile([tortureSeed])]
    );
    teardown = connections.teardown;
    query = connections.query;

    const introspectionResponse = await query<IntrospectionQuery>({ query: getIntrospectionQuery() });
    if (introspectionResponse.errors?.length) throw new Error(JSON.stringify(introspectionResponse.errors));
    introspection = introspectionResponse.data as IntrospectionQuery;
    schema = buildClientSchema(introspection);

    const metaQuery = `query SheetsTortureMeta { _meta ${selectEverything(schema, 'MetaSchema')} }`;
    const metaResponse = await query<{ _meta: { tables: MetaTable[] } }>({ query: metaQuery });
    if (metaResponse.errors?.length) throw new Error(JSON.stringify(metaResponse.errors));
    meta = metaResponse.data as Record<string, unknown>;
    tables = (metaResponse.data as { _meta: { tables: MetaTable[] } })._meta.tables;

    rows = [];
    for (const metaTable of tables) {
      const listQuery = listQueryFor(schema, metaTable);
      const response: Response<unknown> = listQuery
        ? await query({ query: listQuery })
        : { data: null, errors: [] };
      rows.push({
        table: metaTable.name,
        query: listQuery,
        data: response.data ?? null,
        errors: (response.errors ?? []).map(({ message, path }) => ({ message, path }))
      });
    }

    const target = fixtureTarget();
    if (target) {
      mkdirSync(target.dir, { recursive: true });
      const write = (name: string, value: unknown) =>
        writeFileSync(join(target.dir, name), `${JSON.stringify(value, null, 2)}\n`);
      write(`torture-meta.${target.label}.json`, { query: metaQuery, data: meta });
      write('torture-introspection.json', { data: introspection });
      write('torture-rows.json', rows);
      copyFileSync(tortureSeed, join(target.dir, 'torture-schema.sql'));
    }
  });

  afterAll(async () => {
    if (teardown) await teardown();
  });

  it('reports every table and view of the schema, keyed or not', () => {
    expect(tables.map((t) => t.tableName).sort()).toEqual([
      'app_buckets',
      'app_files',
      'array_kinds',
      'audit_events',
      'countries',
      'domain_kinds',
      'generated_values',
      'labels',
      'open_tasks',
      'people',
      'person_profiles',
      'project_members',
      'projects',
      'scalar_kinds',
      'special_values',
      'structured_kinds',
      'task_labels',
      'tasks',
      'warehouse_items'
    ]);
    expect(tables.every((t) => t.schemaName === 'sheets_torture')).toBe(true);
  });

  it('names only fields, operations and relations the GraphQL schema has', () => {
    expect(contractViolations(schema, tables)).toEqual([]);
  });

  it('reads every table through its list field with every column selected', () => {
    const failures = rows
      .filter((entry) => entry.table !== 'SpecialValue')
      .filter((entry) => !entry.query || entry.errors.length > 0)
      .map((entry) => ({ table: entry.table, errors: entry.errors.map((error) => error.message) }));
    expect(failures).toEqual([]);
    for (const tableName of ['scalar_kinds', 'array_kinds', 'structured_kinds', 'domain_kinds', 'tasks', 'open_tasks', 'audit_events']) {
      expect(rowsFor(tableName).length).toBeGreaterThan(0);
    }
  });

  it('serves big integers and decimals as exact strings, and money as a float', () => {
    const [typical, extremes] = rowsFor('scalar_kinds');
    expect(typical).toMatchObject({
      bigintValue: '9007199254740993',
      numericUnbounded: '123456789012345678901234567890.123456789012345678901234567890',
      numericBounded: '12345678.1234',
      moneyValue: 1234.56
    });
    expect(extremes).toMatchObject({ bigintValue: '9223372036854775807', integerValue: -2147483648 });
    expect(field('scalar_kinds', 'bigintValue')?.type.gqlType).toBe('BigInt');
    expect(field('scalar_kinds', 'numericUnbounded')?.type.gqlType).toBe('BigFloat');
  });

  it('cannot serve a non-finite float, but serves non-finite decimals and dates', () => {
    const special = rows.find((entry) => entry.table === 'SpecialValue');
    const failingPaths = (special?.errors ?? []).map((error) => error.path?.slice(-1)[0]);
    expect(new Set(failingPaths)).toEqual(new Set(['realValue', 'doubleValue']));
  });

  it('keeps key shapes: a key not named id, a composite key, no key at all', () => {
    expect(table('countries').constraints.primaryKey?.fields.map((f) => f.name)).toEqual(['isoCode']);
    expect(field('countries', 'isoCode')).toMatchObject({ hasDefault: false, isRequiredOnCreate: true, isWritableOnCreate: true });
    expect(table('warehouse_items').constraints.primaryKey?.fields.map((f) => f.name)).toEqual(['warehouseCode', 'sku']);
    expect(table('audit_events').constraints.primaryKey).toBeNull();
    expect(table('audit_events').query).toMatchObject({ update: null, delete: null });
    for (const metaTable of tables) expect(metaTable.query.one).toBeNull();
  });

  it('says which columns a create or an update may set', () => {
    expect(field('generated_values', 'id')).toMatchObject({ isWritableOnCreate: false, isWritableOnUpdate: false });
    expect(field('generated_values', 'unitPrice')).toMatchObject({ isRequiredOnCreate: true, isWritableOnUpdate: true });
    expect(field('generated_values', 'quantity')).toMatchObject({ isRequiredOnCreate: false, isWritableOnCreate: true });
    expect(field('generated_values', 'lockedNote')).toMatchObject({ isWritableOnCreate: false, isWritableOnUpdate: true });
    expect(field('generated_values', 'frozenCode')).toMatchObject({ isWritableOnCreate: true, isWritableOnUpdate: false });
    expect(field('generated_values', 'secretNote')).toBeUndefined();
  });

  // A stored generated column is in the create and patch inputs, so it is
  // writable by those flags, yet the database rejects any value but its
  // default. isComputed is what says so.
  it('marks a generated column as computed, and the database rejects a value for it', async () => {
    expect(field('generated_values', 'total')).toMatchObject({
      isComputed: true,
      isWritableOnCreate: true,
      isWritableOnUpdate: true
    });
    const computed = table('generated_values').fields.filter((f) => f.isComputed).map((f) => f.name);
    // Identity ALWAYS is computed too; identity BY DEFAULT and now() accept writes.
    expect(computed).toEqual(['id', 'total']);
    expect(tables.flatMap((t) => t.fields).filter((f) => f.isComputed).length).toBe(2);
    const response = await query({
      query: `mutation { ${table('generated_values').query.create}(input: { generatedValue: { unitPrice: "1.00", total: "2.00" } }) { clientMutationId } }`
    });
    expect(response.errors?.map((error) => error.message)).toEqual([
      expect.stringMatching(/cannot insert a non-DEFAULT value into column "total"/)
    ]);
    const update = await query({
      query: `mutation { ${table('generated_values').query.update}(input: { id: 1, generatedValuePatch: { total: "2.00" } }) { clientMutationId } }`
    });
    expect(update.errors?.map((error) => error.message)).toEqual([
      expect.stringMatching(/column "total" can only be updated to DEFAULT/)
    ]);
  });

  it('reports enum labels and fixed value lists, with enum wire values from the schema', () => {
    const status = field('tasks', 'status');
    expect(status?.enumValues?.values).toEqual([
      'todo',
      'in_progress',
      'done_ish',
      '1st_review',
      'Blocked',
      'done',
      'on hold',
      'needs-review'
    ]);
    const statusType = schema.getType(status?.type.gqlType ?? '');
    expect(isEnumType(statusType) && statusType.getValues().map((value) => value.name)).toEqual([
      'TODO',
      'IN_PROGRESS',
      'DONE_ISH',
      '_1ST_REVIEW',
      'BLOCKED',
      'DONE',
      'ON_HOLD',
      'NEEDS_REVIEW'
    ]);
    expect(rowsFor('tasks').map((row) => [row.status, row.reviewStatus])).toEqual([
      ['IN_PROGRESS', 'TODO'],
      ['_1ST_REVIEW', null],
      ['DONE_ISH', 'BLOCKED'],
      ['DONE', 'DONE'],
      ['ON_HOLD', 'NEEDS_REVIEW']
    ]);
    expect(rowsFor('array_kinds')[0].statusList).toEqual(['TODO', 'IN_PROGRESS', '_1ST_REVIEW', 'NEEDS_REVIEW']);
    expect(field('tasks', 'priority')?.allowedValues).toEqual(['low', 'medium', 'high']);
    expect(field('array_kinds', 'statusList')).toMatchObject({ type: { isArray: true, gqlType: 'TaskStatus' } });
  });

  it('keeps every relation shape, including two keys to one table and a composite key', () => {
    const tasks = table('tasks');
    expect(tasks.relations.belongsTo.map((r) => [r.references.name, r.keys.map((k) => k.name)]).sort()).toEqual([
      ['Person', ['assigneeEmail']],
      ['Project', ['projectId']],
      ['WarehouseItem', ['warehouseCode', 'sku']]
    ]);
    const projects = table('projects');
    expect(
      projects.relations.belongsTo
        .filter((r) => r.references.name === 'Person')
        .map((r) => r.keys.map((k) => k.name))
        .sort()
    ).toEqual([['ownerId'], ['reviewerId']]);
    const people = table('people');
    expect(people.relations.hasMany.filter((r) => r.referencedBy.name === 'Project')).toHaveLength(2);
    // tasks.assignee_email has no index, so the API serves no backward relation.
    expect(people.relations.hasMany.map((r) => r.referencedBy.name)).not.toContain('Task');
    expect(people.relations.belongsTo.map((r) => r.references.name)).toEqual(['Person']);
    expect(people.relations.hasOne.map((r) => r.referencedBy.name)).toEqual(['PersonProfile']);
    expect(table('task_labels').isJunction).toBe(true);
    expect(tasks.relations.manyToMany).toContainEqual(
      expect.objectContaining({ junctionTable: { name: 'TaskLabel' }, rightTable: { name: 'Label' } })
    );
    expect(projects.relations.manyToMany).toContainEqual(
      expect.objectContaining({ junctionTable: { name: 'ProjectMember' }, rightTable: { name: 'Person' } })
    );
    expect(field('project_members', 'role')).toMatchObject({ isRequiredOnCreate: true });
  });

  it('reports the storage pair and its upload surface', () => {
    expect(table('app_files').storage).toMatchObject({
      isFilesTable: true,
      filesType: 'AppFile',
      bucketsType: 'AppBucket',
      downloadUrlField: 'downloadUrl'
    });
    expect(table('app_buckets').storage).toMatchObject({ isBucketsTable: true, downloadUrlField: null });
    const upload = table('app_files').storage?.upload;
    expect(schema.getMutationType()?.getFields()[upload?.mutation ?? '']).toBeDefined();
  });

  it('tells the view from the tables and serves table descriptions', () => {
    expect(tables.filter((t) => t.kind === 'view').map((t) => t.tableName)).toEqual(['open_tasks']);
    expect(tables.filter((t) => t.kind !== 'view').every((t) => t.kind === 'table')).toBe(true);
    expect(table('projects').description).toBe('Groups of tasks with an owner and a reviewer');
    expect(table('open_tasks').description).toBe('Tasks that are not done yet');
    expect(table('app_files').description).toBe('Storage files table');
    expect(table('task_labels').description).toBeNull();
  });

  it('names the columns on both ends of every relation, in key order', () => {
    const forward = (tableName: string) =>
      Object.fromEntries(table(tableName).relations.belongsTo.map((r) => [r.fieldName, [names(r.keys), names(r.refKeys)]]));
    const backward = (tableName: string) => {
      const { hasOne, hasMany } = table(tableName).relations;
      return Object.fromEntries([...hasOne, ...hasMany].map((r) => [r.fieldName, [names(r.keys), names(r.remoteKeys)]]));
    };

    expect(forward('tasks')).toEqual({
      personByAssigneeEmail: [['assigneeEmail'], ['email']],
      project: [['projectId'], ['id']],
      warehouseItem: [['warehouseCode', 'sku'], ['warehouseCode', 'sku']]
    });
    expect(forward('projects')).toEqual({
      country: [['countryCode'], ['isoCode']],
      owner: [['ownerId'], ['id']],
      reviewer: [['reviewerId'], ['id']]
    });
    expect(forward('people')).toEqual({ manager: [['managerId'], ['id']] });
    // Two keys from projects to people: remoteKeys tell them apart.
    expect(backward('people')).toEqual({
      personProfile: [['id'], ['personId']],
      peopleByManagerId: [['id'], ['managerId']],
      ownedProjects: [['id'], ['ownerId']],
      reviewedProjects: [['id'], ['reviewerId']],
      projectMembers: [['id'], ['personId']]
    });
    expect(backward('warehouse_items')).toEqual({
      tasksByWarehouseCodeAndSku: [['warehouseCode', 'sku'], ['warehouseCode', 'sku']]
    });
  });

  it('describes file columns and ties them to the only files table', () => {
    const files = Object.fromEntries(table('domain_kinds').fields.map((f) => [f.name, f.file]));
    expect(files).toEqual({
      id: null,
      contactEmail: null,
      homepage: null,
      host: null,
      allowedOrigin: null,
      avatar: { kind: 'image', isMultiple: false, filesType: 'AppFile' },
      document: { kind: 'upload', isMultiple: false, filesType: 'AppFile' },
      gallery: { kind: 'upload', isMultiple: true, filesType: 'AppFile' },
      attachmentLink: { kind: 'attachment', isMultiple: false, filesType: 'AppFile' }
    });
    expect(field('person_profiles', 'photo')?.file).toEqual({ kind: 'image', isMultiple: false, filesType: 'AppFile' });
    expect(isObjectType(schema.getType('AppFile'))).toBe(true);
  });

  it('reports declared lengths, precision and scale', () => {
    const limits = (tableName: string, name: string) => {
      const type = field(tableName, name)?.type;
      return [type?.maxLength, type?.precision, type?.scale];
    };
    expect(limits('scalar_kinds', 'varcharValue')).toEqual([40, null, null]);
    expect(limits('scalar_kinds', 'charValue')).toEqual([3, null, null]);
    expect(limits('scalar_kinds', 'bitValue')).toEqual([8, null, null]);
    expect(limits('scalar_kinds', 'varbitValue')).toEqual([16, null, null]);
    expect(limits('scalar_kinds', 'textValue')).toEqual([null, null, null]);
    expect(limits('scalar_kinds', 'numericBounded')).toEqual([null, 12, 4]);
    expect(limits('scalar_kinds', 'numericUnbounded')).toEqual([null, null, null]);
    expect(limits('array_kinds', 'shortCodeList')).toEqual([5, null, null]);
    expect(limits('array_kinds', 'numericList')).toEqual([null, 10, 2]);
    expect(limits('countries', 'isoCode')).toEqual([2, null, null]);
    expect(limits('generated_values', 'total')).toEqual([null, 12, 2]);
  });

  // A tree path column is served as '/top/science/astronomy', but a list of
  // paths keeps the dotted form ('top.science'), so dotPath must follow the
  // column, not the type.
  it('says whether each tree path column is served dotted or with slashes', () => {
    const [scalars] = rowsFor('scalar_kinds') as { ltreeValue: string }[];
    const [lists] = rowsFor('array_kinds') as { pathList: string[] }[];
    expect(scalars.ltreeValue).toBe('/top/science/astronomy');
    expect(lists.pathList).toEqual(['top.science', 'a']);
    expect(field('scalar_kinds', 'ltreeValue')?.type.encoding).toMatchObject({ kind: 'ltree', dotPath: false });
    expect(field('array_kinds', 'pathList')?.type.encoding).toMatchObject({ kind: 'ltree', dotPath: true });
  });

  it('reports declared spatial reference ids and vector dimensions', () => {
    const encoding = (name: string) => field('structured_kinds', name)?.type.encoding;
    expect(encoding('pin')).toMatchObject({ kind: 'geojson', srid: 4326 });
    expect(encoding('geoPin')).toMatchObject({ kind: 'geojson', srid: 4326 });
    expect(encoding('outline')).toMatchObject({ kind: 'geojson', srid: null });
    expect(encoding('anyShape')).toMatchObject({ kind: 'geojson', srid: null });
    expect(encoding('anyGeo')).toMatchObject({ kind: 'geojson', srid: null });
    expect(encoding('embedding')).toMatchObject({ kind: 'vector', dimensions: 3 });
    expect(encoding('anyEmbedding')).toMatchObject({ kind: 'vector', dimensions: null });
    const [first] = rowsFor('structured_kinds') as { pin: { srid: number }; embedding: number[] }[];
    expect(first.pin.srid).toBe(4326);
    expect(first.embedding).toHaveLength(3);
  });

  it('serves no backend internals in any value', () => {
    const forbidden =
      /@\w|smart ?tag|plugin|registry|presigned|derived|inflect|introspect|trigger|behavio|provenance|check constraint/i;
    expect(stringsIn(meta).filter((value) => forbidden.test(value))).toEqual([]);
  });
});
