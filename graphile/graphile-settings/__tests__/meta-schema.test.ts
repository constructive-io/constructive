import {
  MetaSchemaPlugin,
  _pgTypeToGqlType,
  _buildFieldMeta,
  _cachedTablesMeta,
} from '../src/plugins/meta-schema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockAttribute(pgType: string, opts: Record<string, any> = {}) {
  return {
    codec: { name: pgType, arrayOfCodec: null, ...opts.codec },
    notNull: false,
    hasDefault: false,
    ...opts,
  };
}

function createMockCodec(
  name: string,
  attributes: Record<string, any>,
  schemaName = 'app_public',
) {
  return {
    name,
    attributes,
    isAnonymous: false,
    extensions: { pg: { schemaName } },
  };
}

/**
 * Build a minimal mock of the PostGraphile `build` object that the init hook
 * expects. `resources` is a map of resource‐name → { codec, uniques?, relations? }.
 */
function createMockBuild(
  resources: Record<string, any>,
  schemas: string[] = ['app_public'],
) {
  return {
    input: {
      pgRegistry: { pgResources: resources },
    },
    inflection: {
      tableType: (codec: any) =>
        codec.name
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c: string) => c.toUpperCase())
          .replace(/ /g, ''),
      _attributeName: ({ attributeName }: { attributeName: string; codec: any }) =>
        attributeName.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase()),
      allRows: (resource: any) => {
        const name = resource.codec?.name || 'unknown';
        return name + 's';
      },
      connectionType: (typeName: string) => typeName + 'Connection',
      edgeType: (typeName: string) => typeName + 'Edge',
      filterType: (typeName: string) => typeName + 'Filter',
      orderByType: (typeName: string) => typeName + 'OrderBy',
      conditionType: (typeName: string) => typeName + 'Condition',
      patchType: (typeName: string) => typeName + 'Patch',
      createInputType: (resource: any) => 'Create' + (resource.codec?.name || '') + 'Input',
      createPayloadType: (resource: any) => 'Create' + (resource.codec?.name || '') + 'Payload',
      updatePayloadType: (resource: any) => 'Update' + (resource.codec?.name || '') + 'Payload',
      deletePayloadType: (resource: any) => 'Delete' + (resource.codec?.name || '') + 'Payload',
      tableFieldName: (resource: any) => (resource.codec?.name || 'unknown').toLowerCase(),
      createField: (resource: any) => 'create' + (resource.codec?.name || ''),
      updateByKeys: (resource: any) => 'update' + (resource.codec?.name || ''),
      deleteByKeys: (resource: any) => 'delete' + (resource.codec?.name || ''),
    },
    options: { pgSchemas: schemas },
  };
}

/** Call the plugin's init hook with a mocked build, return cached table meta. */
function callInitHook(build: any): any[] {
  const initHook = MetaSchemaPlugin.schema!.hooks!.init as (
    _: any,
    build: any,
  ) => any;
  initHook({}, build);
  // The hook populates the module-level _cachedTablesMeta
  return _cachedTablesMeta as any[];
}

// ---------------------------------------------------------------------------
// Unit tests — pgTypeToGqlType
// ---------------------------------------------------------------------------

describe('MetaSchemaPlugin', () => {
  describe('pgTypeToGqlType', () => {
    it.each([
      ['text', 'String'],
      ['varchar', 'String'],
      ['char', 'String'],
      ['name', 'String'],
      ['bpchar', 'String'],
    ])('maps %s → %s', (pg, gql) => {
      expect(_pgTypeToGqlType(pg)).toBe(gql);
    });

    it('maps uuid to UUID', () => {
      expect(_pgTypeToGqlType('uuid')).toBe('UUID');
    });

    it.each([
      ['int2', 'Int'],
      ['int4', 'Int'],
      ['integer', 'Int'],
    ])('maps %s → %s (integer types)', (pg, gql) => {
      expect(_pgTypeToGqlType(pg)).toBe(gql);
    });

    it.each([
      ['int8', 'BigInt'],
      ['bigint', 'BigInt'],
    ])('maps %s → %s (bigint types)', (pg, gql) => {
      expect(_pgTypeToGqlType(pg)).toBe(gql);
    });

    it.each([
      ['float4', 'Float'],
      ['float8', 'Float'],
      ['numeric', 'BigFloat'],
    ])('maps %s → %s (float types)', (pg, gql) => {
      expect(_pgTypeToGqlType(pg)).toBe(gql);
    });

    it.each([
      ['bool', 'Boolean'],
      ['boolean', 'Boolean'],
    ])('maps %s → %s (boolean types)', (pg, gql) => {
      expect(_pgTypeToGqlType(pg)).toBe(gql);
    });

    it.each([
      ['timestamptz', 'Datetime'],
      ['timestamp', 'Datetime'],
    ])('maps %s → %s (timestamp types)', (pg, gql) => {
      expect(_pgTypeToGqlType(pg)).toBe(gql);
    });

    it.each([
      ['json', 'JSON'],
      ['jsonb', 'JSON'],
    ])('maps %s → %s (json types)', (pg, gql) => {
      expect(_pgTypeToGqlType(pg)).toBe(gql);
    });

    it.each([
      ['geometry', 'GeoJSON'],
      ['geography', 'GeoJSON'],
    ])('maps %s → %s (geo types)', (pg, gql) => {
      expect(_pgTypeToGqlType(pg)).toBe(gql);
    });

    it('passes through unknown types unchanged', () => {
      expect(_pgTypeToGqlType('my_custom_enum')).toBe('my_custom_enum');
      expect(_pgTypeToGqlType('hstore')).toBe('hstore');
    });
  });

  // ---------------------------------------------------------------------------
  // Unit tests — buildFieldMeta
  // ---------------------------------------------------------------------------

  describe('buildFieldMeta', () => {
    it('builds field meta with correct gqlType mapping', () => {
      const attr = createMockAttribute('timestamptz', { notNull: true, hasDefault: true });
      const result = _buildFieldMeta('createdAt', attr);

      expect(result).toEqual({
        name: 'createdAt',
        type: {
          pgType: 'timestamptz',
          gqlType: 'Datetime',
          isArray: false,
          isNotNull: true,
          hasDefault: true,
        },
        isNotNull: true,
        hasDefault: true,
      });
    });

    it('handles null/undefined attributes gracefully', () => {
      const result = _buildFieldMeta('broken', null);
      expect(result.name).toBe('broken');
      expect(result.type.pgType).toBe('unknown');
      expect(result.type.gqlType).toBe('unknown');
      expect(result.isNotNull).toBe(false);
    });

    it('detects array types via arrayOfCodec', () => {
      const attr = createMockAttribute('text', {
        codec: { name: 'text', arrayOfCodec: { name: '_text' } },
      });
      const result = _buildFieldMeta('tags', attr);
      expect(result.type.isArray).toBe(true);
    });

    it('detects non-array types', () => {
      const attr = createMockAttribute('text');
      const result = _buildFieldMeta('name', attr);
      expect(result.type.isArray).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Integration tests — init hook: field name inflection
  // ---------------------------------------------------------------------------

  describe('init hook — field name inflection', () => {
    it('inflects snake_case field names to camelCase', () => {
      const codec = createMockCodec('user', {
        display_name: createMockAttribute('text'),
        created_at: createMockAttribute('timestamptz'),
        is_active: createMockAttribute('bool'),
      });
      const build = createMockBuild({
        user: { codec, uniques: [], relations: {} },
      });

      const tables = callInitHook(build);
      const fieldNames = tables[0].fields.map((f: any) => f.name);

      expect(fieldNames).toEqual(['displayName', 'createdAt', 'isActive']);
      expect(fieldNames).not.toContain('display_name');
      expect(fieldNames).not.toContain('created_at');
      expect(fieldNames).not.toContain('is_active');
    });

    it('falls back to raw PG name if inflection fails', () => {
      const codec = createMockCodec('user', {
        display_name: createMockAttribute('text'),
      });
      const build = createMockBuild({
        user: { codec, uniques: [], relations: {} },
      });
      // Sabotage inflection so it throws
      build.inflection._attributeName = () => {
        throw new Error('inflection failure');
      };

      const tables = callInitHook(build);
      // Should fall back to raw attribute name
      expect(tables[0].fields[0].name).toBe('display_name');
    });

    it('inflects FK constraint field names', () => {
      const userCodec = createMockCodec('user', {
        id: createMockAttribute('uuid'),
      });
      const postCodec = createMockCodec('post', {
        id: createMockAttribute('uuid'),
        author_id: createMockAttribute('uuid'),
      });

      const build = createMockBuild({
        user: { codec: userCodec, uniques: [], relations: {} },
        post: {
          codec: postCodec,
          uniques: [],
          relations: {
            post_author_fkey: {
              isReferencee: false,
              localAttributes: ['author_id'],
              remoteAttributes: ['id'],
              remoteResource: { codec: userCodec, uniques: [] },
            },
          },
        },
      });

      const tables = callInitHook(build);
      const postTable = tables.find((t: any) => t.name === 'Post');
      const fk = postTable!.foreignKeyConstraints[0];

      // FK field names should be inflected
      expect(fk.fields[0].name).toBe('authorId');
      expect(fk.referencedFields[0]).toBe('id');
    });

    it('inflects relation key field names', () => {
      const userCodec = createMockCodec('user', {
        id: createMockAttribute('uuid'),
      });
      const postCodec = createMockCodec('post', {
        id: createMockAttribute('uuid'),
        author_id: createMockAttribute('uuid'),
      });

      const build = createMockBuild({
        user: { codec: userCodec, uniques: [], relations: {} },
        post: {
          codec: postCodec,
          uniques: [],
          relations: {
            post_author_fkey: {
              isReferencee: false,
              localAttributes: ['author_id'],
              remoteAttributes: ['id'],
              remoteResource: { codec: userCodec, uniques: [] },
            },
          },
        },
      });

      const tables = callInitHook(build);
      const postTable = tables.find((t: any) => t.name === 'Post');
      const belongsTo = postTable!.relations.belongsTo[0];

      // Relation key field names should be inflected
      expect(belongsTo.keys[0].name).toBe('authorId');
    });

    it('inflects index and PK constraint field names', () => {
      const codec = createMockCodec('user', {
        id: createMockAttribute('uuid'),
        email_address: createMockAttribute('text'),
      });

      const build = createMockBuild({
        user: {
          codec,
          uniques: [
            { attributes: ['id'], isPrimary: true, tags: { name: 'user_pkey' } },
            { attributes: ['email_address'], isPrimary: false, tags: { name: 'user_email_key' } },
          ],
          relations: {},
        },
      });

      const tables = callInitHook(build);
      const user = tables[0];

      // PK constraint fields should be inflected
      expect(user.constraints.primaryKey!.fields[0].name).toBe('id');

      // Unique constraint fields should be inflected
      expect(user.constraints.unique[0].fields[0].name).toBe('emailAddress');

      // Index columns should be inflected
      expect(user.indexes[0].columns).toEqual(['id']);
      expect(user.indexes[1].columns).toEqual(['emailAddress']);
    });
  });

  // ---------------------------------------------------------------------------
  // Integration tests — init hook: table deduplication
  // ---------------------------------------------------------------------------

  describe('init hook — table deduplication', () => {
    it('deduplicates resources sharing the same codec', () => {
      const codec = createMockCodec('user', {
        id: createMockAttribute('uuid'),
      });

      const build = createMockBuild({
        user: { codec, uniques: [], relations: {} },
        user_2: { codec, uniques: [], relations: {} }, // same codec object
      });

      const tables = callInitHook(build);
      expect(tables).toHaveLength(1);
      expect(tables[0].name).toBe('User');
    });

    it('includes distinct tables with different codecs', () => {
      const userCodec = createMockCodec('user', {
        id: createMockAttribute('uuid'),
      });
      const postCodec = createMockCodec('post', {
        id: createMockAttribute('uuid'),
      });

      const build = createMockBuild({
        user: { codec: userCodec, uniques: [], relations: {} },
        post: { codec: postCodec, uniques: [], relations: {} },
      });

      const tables = callInitHook(build);
      expect(tables).toHaveLength(2);
      const names = tables.map((t: any) => t.name).sort();
      expect(names).toEqual(['Post', 'User']);
    });

    it('skips anonymous codecs', () => {
      const anonCodec = {
        name: 'anon',
        attributes: { id: createMockAttribute('uuid') },
        isAnonymous: true,
        extensions: { pg: { schemaName: 'app_public' } },
      };

      const build = createMockBuild({
        anon: { codec: anonCodec, uniques: [], relations: {} },
      });

      const tables = callInitHook(build);
      expect(tables).toHaveLength(0);
    });

    it('skips resources without schema name', () => {
      const codec = {
        name: 'no_schema',
        attributes: { id: createMockAttribute('uuid') },
        isAnonymous: false,
        extensions: { pg: {} }, // no schemaName
      };

      const build = createMockBuild({
        no_schema: { codec, uniques: [], relations: {} },
      });

      const tables = callInitHook(build);
      expect(tables).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Integration tests — init hook: gqlType mapping
  // ---------------------------------------------------------------------------

  describe('init hook — gqlType mapping', () => {
    it('field.type.gqlType uses GraphQL type names, not PG type names', () => {
      const codec = createMockCodec('user', {
        id: createMockAttribute('uuid'),
        name: createMockAttribute('text'),
        age: createMockAttribute('int4'),
        balance: createMockAttribute('numeric'),
        is_active: createMockAttribute('bool'),
        created_at: createMockAttribute('timestamptz'),
        metadata: createMockAttribute('jsonb'),
      });

      const build = createMockBuild({
        user: { codec, uniques: [], relations: {} },
      });

      const tables = callInitHook(build);
      const fields = tables[0].fields;

      const fieldMap = Object.fromEntries(fields.map((f: any) => [f.name, f.type.gqlType]));

      expect(fieldMap.id).toBe('UUID');
      expect(fieldMap.name).toBe('String');
      expect(fieldMap.age).toBe('Int');
      expect(fieldMap.balance).toBe('BigFloat');
      expect(fieldMap.isActive).toBe('Boolean');
      expect(fieldMap.createdAt).toBe('Datetime');
      expect(fieldMap.metadata).toBe('JSON');
    });

    it('preserves pgType alongside gqlType', () => {
      const codec = createMockCodec('user', {
        id: createMockAttribute('uuid'),
      });

      const build = createMockBuild({
        user: { codec, uniques: [], relations: {} },
      });

      const tables = callInitHook(build);
      const idField = tables[0].fields[0];

      expect(idField.type.pgType).toBe('uuid');
      expect(idField.type.gqlType).toBe('UUID');
    });
  });

  // ---------------------------------------------------------------------------
  // Integration tests — schema filtering
  // ---------------------------------------------------------------------------

  describe('init hook — schema filtering', () => {
    it('only includes tables from configured schemas', () => {
      const publicCodec = createMockCodec('user', {
        id: createMockAttribute('uuid'),
      }, 'app_public');
      const privateCodec = createMockCodec('secret', {
        id: createMockAttribute('uuid'),
      }, 'app_private');

      const build = createMockBuild({
        user: { codec: publicCodec, uniques: [], relations: {} },
        secret: { codec: privateCodec, uniques: [], relations: {} },
      }, ['app_public']);

      const tables = callInitHook(build);
      expect(tables).toHaveLength(1);
      expect(tables[0].schemaName).toBe('app_public');
    });
  });
});
