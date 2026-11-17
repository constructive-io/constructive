import {
  graphql,
  GraphQLID,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString
} from 'graphql';

import { _buildFieldMeta, MetaSchemaPlugin } from '../src';
import { collectTablesMeta } from '../src/table-meta-builder';

// What a generic grid needs from _meta beyond names: whether a table is a
// view, the columns on both ends of a relation, file columns, and declared
// limits. Registries are built by hand, as in form-meta.test.ts.

function attr(codec: Record<string, unknown>, opts: Record<string, unknown> = {}) {
  return { codec, notNull: false, hasDefault: false, ...opts };
}

const scalar = (name: string) => ({ name });
const arrayOf = (element: { name: string }) => ({ name: `${element.name}Array`, arrayOfCodec: element });
const domain = (name: string, base: string) => ({
  name,
  domainOfCodec: { name: base },
  extensions: { pg: { schemaName: 'public', name } }
});

function codec(
  name: string,
  attributes: Record<string, unknown>,
  extra: { tags?: Record<string, unknown>; description?: string } = {}
) {
  return {
    name,
    attributes,
    ...(extra.description ? { description: extra.description } : null),
    extensions: { pg: { schemaName: 'app_public', name }, tags: extra.tags ?? {} }
  };
}

function resource(codecValue: any, uniques: unknown[] = [], extra: Record<string, unknown> = {}) {
  const relations: Record<string, any> = {};
  return { codec: codecValue, uniques, relations, getRelations: () => relations, ...extra };
}

const typeName = (name: string) =>
  name.replace(/(^|_)([a-z])/g, (_: string, __: string, c: string) => c.toUpperCase());

function build(resources: Record<string, any>, overrides: Record<string, any> = {}) {
  const list = Object.values(resources);
  return {
    input: {
      pgRegistry: {
        pgResources: resources,
        pgCodecs: Object.fromEntries(list.map((r) => [r.codec.name, r.codec])),
        pgRelations: Object.fromEntries(list.map((r) => [r.codec.name, r.relations]))
      }
    },
    inflection: {
      tableType: (c: any) => typeName(c.name),
      _attributeName: ({ attributeName }: { attributeName: string }) =>
        attributeName.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase()),
      ...overrides.inflection
    },
    options: { pgSchemas: ['app_public'] },
    ...overrides.build
  };
}

// A foreign key on `from` and the backward relation PostGraphile keeps on `to`.
function foreignKey(from: any, columns: string[], to: any, referenced: string[], name: string) {
  from.relations[name] = {
    localAttributes: columns,
    remoteAttributes: referenced,
    remoteResource: to
  };
  to.relations[`${name}_back`] = {
    isReferencee: true,
    isUnique: false,
    localAttributes: referenced,
    remoteAttributes: columns,
    remoteResource: from
  };
  return to.relations[`${name}_back`];
}

const pk = (...attributes: string[]) => ({ attributes, isPrimary: true });
const names = (fields: { name: string }[]) => fields.map((field) => field.name);

describe('declared limits from the type modifier', () => {
  // atttypmod values read from PostgreSQL 18 for each declaration.
  function gathered(columnCodec: Record<string, unknown>, atttypmod: number) {
    const attribute: any = { codec: columnCodec };
    const hook = MetaSchemaPlugin.gather!.hooks!.pgCodecs_attribute as any;
    hook({}, { pgClass: { getConstraints: (): unknown[] => [] }, pgAttribute: { attnum: 1, atttypmod }, attribute });
    return attribute;
  }

  function typeOf(columnCodec: Record<string, unknown>, atttypmod: number) {
    const table = codec('kinds', { value: gathered(columnCodec, atttypmod) });
    const [meta] = collectTablesMeta(build({ kinds: resource(table) }) as any);
    return meta.fields[0].type;
  }

  it.each([
    ['varchar(40)', scalar('varchar'), 44, { maxLength: 40, precision: null, scale: null }],
    ['char(3)', scalar('bpchar'), 7, { maxLength: 3 }],
    ['bit(8)', scalar('bit'), 8, { maxLength: 8 }],
    ['varbit(16)', scalar('varbit'), 16, { maxLength: 16 }],
    ['varchar(5)[]', arrayOf(scalar('varchar')), 9, { maxLength: 5, isArray: true }],
    ['numeric(12,4)', scalar('numeric'), 786440, { precision: 12, scale: 4, maxLength: null }],
    ['numeric(10,2)[]', arrayOf(scalar('numeric')), 655366, { precision: 10, scale: 2 }],
    ['numeric(5,-2)', scalar('numeric'), 329730, { precision: 5, scale: -2 }],
    ['numeric', scalar('numeric'), -1, { precision: null, scale: null }],
    ['text', scalar('text'), -1, { maxLength: null, precision: null, scale: null }]
  ])('reads %s', (_declaration, columnCodec, atttypmod, expected) => {
    expect(typeOf(columnCodec, atttypmod)).toMatchObject(expected);
  });

  it.each([
    ['geometry(Point,4326)', scalar('geometry'), 1107460, { kind: 'geojson', srid: 4326 }],
    ['geography(Point,4326)', scalar('geography'), 1107460, { kind: 'geojson', srid: 4326 }],
    ['geometry(Polygon)', scalar('geometry'), 12, { kind: 'geojson', srid: null }],
    ['geometry', scalar('geometry'), -1, { kind: 'geojson', srid: null }],
    ['vector(3)', scalar('vector'), 3, { kind: 'vector', dimensions: 3 }],
    ['vector', scalar('vector'), -1, { kind: 'vector', dimensions: null }]
  ])('reports the spatial reference or dimensions of %s', (_declaration, columnCodec, atttypmod, expected) => {
    expect(typeOf(columnCodec, atttypmod).encoding).toMatchObject(expected);
  });

  it('leaves the other facts the gather hook records in place', () => {
    const attribute = gathered(scalar('varchar'), 44);
    expect(attribute.extensions).toEqual({ maxLength: 40 });
    const untouched = gathered(scalar('text'), -1);
    expect(untouched.extensions).toBeUndefined();
  });
});

describe('values the database always computes', () => {
  // The pg_attribute flags the gather hook sees for each kind of column.
  function fieldsFor(columns: Record<string, Record<string, unknown>>) {
    const hook = MetaSchemaPlugin.gather!.hooks!.pgCodecs_attribute as any;
    const attributes = Object.fromEntries(
      Object.entries(columns).map(([name, pgAttribute], index) => {
        const attribute: any = { codec: scalar('int4'), hasDefault: true };
        hook({}, {
          pgClass: { getConstraints: (): unknown[] => [] },
          pgAttribute: { attnum: index + 1, atttypmod: -1, ...pgAttribute },
          attribute
        });
        return [name, attribute];
      })
    );
    const [table] = collectTablesMeta(build({ kinds: resource(codec('kinds', attributes), [pk('id')]) }) as any);
    return table;
  }

  it('marks generated and identity ALWAYS columns, and nothing a write can set', () => {
    const table = fieldsFor({
      id: { attidentity: 'a' },
      serial_no: { attidentity: 'd' },
      stored_total: { attgenerated: 's' },
      virtual_total: { attgenerated: 'v' },
      quantity: {}
    });
    expect(Object.fromEntries(table.fields.map((f) => [f.name, f.isComputed]))).toEqual({
      id: true,
      serialNo: false,
      storedTotal: true,
      virtualTotal: true,
      quantity: false
    });
    // Like the other own-field facts, it is not reported on nested fields.
    expect(table.constraints.primaryKey?.fields[0].isComputed).toBeNull();
  });

  it('does not mark a column whose default the database fills only when none is written', () => {
    // `created_at DEFAULT now()` is recorded as a generated value, not a computed one.
    const createdAt = attr(scalar('timestamptz'), { hasDefault: true, extensions: { generatedValue: true } });
    const [table] = collectTablesMeta(build({ events: resource(codec('events', { created_at: createdAt })) }) as any);
    expect(table.fields[0].isComputed).toBe(false);
  });
});

describe('tree path columns', () => {
  // The column's codec decides how a path is served; dotPath reports that form.
  const ltree = (fromPg?: (value: string) => unknown) => ({ name: 'ltree', ...(fromPg ? { fromPg } : null) });
  const dotPathOf = (columnCodec: { name: string }) =>
    _buildFieldMeta('path', 'path', attr(columnCodec) as any).type.encoding?.dotPath;

  it('reports dotted paths for a codec that serves the stored text', () => {
    expect(dotPathOf(ltree())).toBe(true);
    expect(dotPathOf(ltree((value) => value))).toBe(true);
  });

  const slashes = (value: string) => '/' + value.replace(/\./g, '/');

  it('reports slash paths for a codec that serves them', () => {
    expect(dotPathOf(ltree(slashes))).toBe(false);
  });

  it('asks a list codec, which may serve its items differently from the plain codec', () => {
    // As in the preset: the plain codec serves slashes, the list kept the dotted form.
    const dottedList = { name: 'ltreeArray', arrayOfCodec: ltree(slashes), fromPg: (value: string) => value.slice(1, -1).split(',') };
    expect(dotPathOf(dottedList)).toBe(true);
  });

  it('reports neither when the codec serves another form', () => {
    expect(dotPathOf(ltree(() => {
      throw new Error('cannot read');
    }))).toBeNull();
    expect(dotPathOf(ltree(() => 'a/b'))).toBeNull();
  });
});

describe('table kind and description', () => {
  it('tells views from tables and reads the table description', () => {
    const tables = collectTablesMeta(
      build({
        tasks: resource(codec('tasks', { id: attr(scalar('int4')) }), [pk('id')], {
          description: 'Work to do'
        }),
        open_tasks: resource(codec('open_tasks', { id: attr(scalar('int4')) }), [], {
          extensions: { isView: true }
        }),
        task_totals: resource(
          codec('task_totals', { total: attr(scalar('int8')) }, { description: 'Totals per day' }),
          [],
          { extensions: { isMaterializedView: true } }
        )
      }) as any
    );
    const byName = Object.fromEntries(tables.map((t) => [t.tableName, t]));

    expect(byName.tasks).toMatchObject({ kind: 'table', description: 'Work to do' });
    expect(byName.open_tasks).toMatchObject({ kind: 'view', description: null });
    expect(byName.task_totals).toMatchObject({ kind: 'view', description: 'Totals per day' });
  });
});

describe('columns on both ends of a relation', () => {
  // people <- projects (owner_id, reviewer_id): two keys to one table.
  // items (code, sku) <- tasks (item_sku, item_code): a composite key whose
  // column order differs from the referenced table's.
  // people (email) <- tasks (assignee_email): a key to a unique non-key column.
  function relationScenario() {
    const people = resource(
      codec('people', { id: attr(scalar('uuid')), email: attr(scalar('citext')) }),
      [pk('id'), { attributes: ['email'] }]
    );
    const profiles = resource(
      codec('profiles', { person_id: attr(scalar('uuid')), bio: attr(scalar('text')) }),
      [pk('person_id')]
    );
    const projects = resource(
      codec('projects', {
        id: attr(scalar('int4')),
        owner_id: attr(scalar('uuid')),
        reviewer_id: attr(scalar('uuid'))
      }),
      [pk('id')]
    );
    const items = resource(
      codec('items', { code: attr(scalar('text')), sku: attr(scalar('text')) }),
      [pk('code', 'sku')]
    );
    const tasks = resource(
      codec('tasks', {
        id: attr(scalar('int8')),
        item_sku: attr(scalar('text')),
        item_code: attr(scalar('text')),
        assignee_email: attr(scalar('citext'))
      }),
      [pk('id')]
    );
    foreignKey(projects, ['owner_id'], people, ['id'], 'projects_owner_fkey');
    foreignKey(projects, ['reviewer_id'], people, ['id'], 'projects_reviewer_fkey');
    foreignKey(tasks, ['item_sku', 'item_code'], items, ['sku', 'code'], 'tasks_item_fkey');
    foreignKey(tasks, ['assignee_email'], people, ['email'], 'tasks_assignee_fkey');
    foreignKey(profiles, ['person_id'], people, ['id'], 'profiles_person_fkey').isUnique = true;

    const tables = collectTablesMeta(build({ people, profiles, projects, items, tasks }) as any);
    return Object.fromEntries(tables.map((t) => [t.tableName, t]));
  }

  it('names the referenced columns of a belongs-to, in key order', () => {
    const tables = relationScenario();
    const refs = (tableName: string) =>
      tables[tableName].relations.belongsTo.map((r) => [names(r.keys), names(r.refKeys)]);

    expect(refs('projects')).toEqual([
      [['ownerId'], ['id']],
      [['reviewerId'], ['id']]
    ]);
    expect(refs('tasks')).toEqual([
      [['itemSku', 'itemCode'], ['sku', 'code']],
      [['assigneeEmail'], ['email']]
    ]);
  });

  it('names the foreign key columns of a has-many, so two keys to one table differ', () => {
    const tables = relationScenario();
    // Without a final schema, referencedBy names the other table's codec.
    const back = (tableName: string, from: string) =>
      [...tables[tableName].relations.hasMany, ...tables[tableName].relations.hasOne]
        .filter((r) => r.referencedBy.name === from)
        .map((r) => [names(r.keys), names(r.remoteKeys)]);

    expect(back('people', 'projects')).toEqual([
      [['id'], ['ownerId']],
      [['id'], ['reviewerId']]
    ]);
    expect(back('people', 'tasks')).toEqual([[['email'], ['assigneeEmail']]]);
    expect(back('items', 'tasks')).toEqual([[['sku', 'code'], ['itemSku', 'itemCode']]]);
    expect(tables.people.relations.hasOne.map((r) => names(r.remoteKeys))).toEqual([['personId']]);
  });
});

describe('file columns', () => {
  const image = domain('image', 'jsonb');
  const upload = domain('upload', 'jsonb');
  const attachment = domain('attachment', 'text');

  function storagePlane(prefix: string) {
    const buckets = resource(
      codec(`${prefix}_buckets`, { id: attr(scalar('uuid')) }, { tags: { storageBuckets: true } }),
      [pk('id')]
    );
    const files = resource(
      codec(
        `${prefix}_files`,
        { id: attr(scalar('uuid')), bucket_id: attr(scalar('uuid')) },
        { tags: { storageFiles: true } }
      ),
      [pk('id')]
    );
    foreignKey(files, ['bucket_id'], buckets, ['id'], `${prefix}_files_bucket_fkey`);
    return { [`${prefix}_buckets`]: buckets, [`${prefix}_files`]: files };
  }

  function documentFields(planes: Record<string, any>) {
    const documents = resource(
      codec('documents', {
        id: attr(scalar('uuid')),
        avatar: attr(image),
        scan: attr(upload),
        gallery: attr(arrayOf(upload)),
        link: attr(attachment),
        contact: attr(domain('email', 'citext')),
        not_a_file: attr(domain('image', 'text')),
        raw: attr(scalar('jsonb'))
      }),
      [pk('id')]
    );
    const tables = collectTablesMeta(build({ documents, ...planes }) as any);
    const fields = tables.find((t) => t.tableName === 'documents')!.fields;
    return Object.fromEntries(fields.map((f) => [f.name, f.file]));
  }

  it('reports the file domains, a list of uploads, and the only files table', () => {
    expect(documentFields(storagePlane('app'))).toEqual({
      id: null,
      avatar: { kind: 'image', isMultiple: false, filesType: 'AppFiles' },
      scan: { kind: 'upload', isMultiple: false, filesType: 'AppFiles' },
      gallery: { kind: 'upload', isMultiple: true, filesType: 'AppFiles' },
      link: { kind: 'attachment', isMultiple: false, filesType: 'AppFiles' },
      contact: null,
      notAFile: null,
      raw: null
    });
  });

  it('names no files table when the API has none or several', () => {
    expect(documentFields({}).avatar).toEqual({ kind: 'image', isMultiple: false, filesType: null });
    expect(documentFields({ ...storagePlane('app'), ...storagePlane('org') }).avatar).toMatchObject({
      filesType: null
    });
  });
});

describe('the new fields through the _meta query', () => {
  it('serves kind, description, file, declared limits and both ends of a relation', async () => {
    const people = resource(codec('people', { id: attr(scalar('uuid')) }), [pk('id')]);
    const documents = resource(
      codec('documents', {
        id: attr(scalar('uuid')),
        title: attr(scalar('varchar'), { extensions: { maxLength: 80 } }),
        avatar: attr(domain('image', 'jsonb')),
        owner_id: attr(scalar('uuid'))
      }),
      [pk('id')],
      { description: 'Shared files' }
    );
    foreignKey(documents, ['owner_id'], people, ['id'], 'documents_owner_fkey');
    const metaBuild = build(
      { people, documents },
      {
        inflection: {
          singleRelation: () => 'owner',
          manyRelationConnection: () => 'documents',
          tableConnectionType: (c: any) => `${typeName(c.name)}Connection`
        }
      }
    );
    const hook = MetaSchemaPlugin.schema!.hooks!.GraphQLObjectType_fields as any;
    const queryFields = hook({}, metaBuild, { scope: { isRootQuery: true } });
    const Person: GraphQLObjectType = new GraphQLObjectType({
      name: 'People',
      fields: () => ({
        id: { type: GraphQLID },
        documents: { type: DocumentConnection }
      })
    });
    const Document: GraphQLObjectType = new GraphQLObjectType({
      name: 'Documents',
      fields: () => ({
        id: { type: GraphQLID },
        title: { type: GraphQLString },
        avatar: { type: GraphQLString },
        ownerId: { type: GraphQLID },
        owner: { type: Person }
      })
    });
    const DocumentConnection = new GraphQLObjectType({
      name: 'DocumentsConnection',
      fields: { nodes: { type: Document } }
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({ name: 'Query', fields: () => queryFields }),
      types: [Person, Document]
    });

    const result = await graphql({
      schema,
      source: `{
        _meta { tables {
          tableName kind description
          fields { name isComputed type { maxLength precision scale } file { kind isMultiple filesType } }
          relations {
            belongsTo { fieldName keys { name } refKeys { name } }
            hasMany { fieldName keys { name } remoteKeys { name } }
          }
        } }
      }`
    });

    expect(result.errors).toBeUndefined();
    const tables = (result.data as any)._meta.tables;
    const doc = tables.find((t: any) => t.tableName === 'documents');
    const person = tables.find((t: any) => t.tableName === 'people');
    expect(doc).toMatchObject({ kind: 'table', description: 'Shared files' });
    expect(doc.fields.find((f: any) => f.name === 'title').type).toEqual({ maxLength: 80, precision: null, scale: null });
    expect(doc.fields.map((f: any) => f.isComputed)).toEqual([false, false, false, false]);
    expect(doc.fields.find((f: any) => f.name === 'avatar').file).toEqual({
      kind: 'image',
      isMultiple: false,
      filesType: null
    });
    expect(doc.relations.belongsTo).toEqual([
      { fieldName: 'owner', keys: [{ name: 'ownerId' }], refKeys: [{ name: 'id' }] }
    ]);
    expect(person.relations.hasMany).toEqual([
      { fieldName: 'documents', keys: [{ name: 'id' }], remoteKeys: [{ name: 'ownerId' }] }
    ]);
  });
});
