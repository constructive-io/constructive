/**
 * Tests for query key factory pattern generators
 *
 * Uses snapshot testing to validate generated TypeScript output for:
 * - Query keys factory (query-keys.ts)
 * - Mutation keys factory (mutation-keys.ts)
 * - Cache invalidation helpers (invalidation.ts)
 */
import { generateQueryKeysFile } from '../../core/codegen/query-keys';
import { generateMutationKeysFile } from '../../core/codegen/mutation-keys';
import { generateInvalidationFile } from '../../core/codegen/invalidation';
import type { CleanTable, CleanFieldType, CleanRelations, CleanOperation, CleanTypeRef } from '../../types/schema';
import type { QueryKeyConfig, EntityRelationship } from '../../types/config';

const fieldTypes = {
  uuid: { gqlType: 'UUID', isArray: false } as CleanFieldType,
  string: { gqlType: 'String', isArray: false } as CleanFieldType,
  int: { gqlType: 'Int', isArray: false } as CleanFieldType,
  datetime: { gqlType: 'Datetime', isArray: false } as CleanFieldType,
};

const emptyRelations: CleanRelations = {
  belongsTo: [],
  hasOne: [],
  hasMany: [],
  manyToMany: [],
};

function createTable(partial: Partial<CleanTable> & { name: string }): CleanTable {
  return {
    name: partial.name,
    fields: partial.fields ?? [],
    relations: partial.relations ?? emptyRelations,
    query: partial.query,
    inflection: partial.inflection,
    constraints: partial.constraints,
  };
}

function createTypeRef(kind: CleanTypeRef['kind'], name: string | null, ofType?: CleanTypeRef): CleanTypeRef {
  return { kind, name, ofType };
}

const simpleUserTable = createTable({
  name: 'User',
  fields: [
    { name: 'id', type: fieldTypes.uuid },
    { name: 'email', type: fieldTypes.string },
    { name: 'name', type: fieldTypes.string },
    { name: 'createdAt', type: fieldTypes.datetime },
  ],
  query: {
    all: 'users',
    one: 'user',
    create: 'createUser',
    update: 'updateUser',
    delete: 'deleteUser',
  },
});

const postTable = createTable({
  name: 'Post',
  fields: [
    { name: 'id', type: fieldTypes.uuid },
    { name: 'title', type: fieldTypes.string },
    { name: 'content', type: fieldTypes.string },
    { name: 'authorId', type: fieldTypes.uuid },
    { name: 'createdAt', type: fieldTypes.datetime },
  ],
  query: {
    all: 'posts',
    one: 'post',
    create: 'createPost',
    update: 'updatePost',
    delete: 'deletePost',
  },
});

const organizationTable = createTable({
  name: 'Organization',
  fields: [
    { name: 'id', type: fieldTypes.uuid },
    { name: 'name', type: fieldTypes.string },
    { name: 'slug', type: fieldTypes.string },
  ],
  query: {
    all: 'organizations',
    one: 'organization',
    create: 'createOrganization',
    update: 'updateOrganization',
    delete: 'deleteOrganization',
  },
});

const databaseTable = createTable({
  name: 'Database',
  fields: [
    { name: 'id', type: fieldTypes.uuid },
    { name: 'name', type: fieldTypes.string },
    { name: 'organizationId', type: fieldTypes.uuid },
  ],
  query: {
    all: 'databases',
    one: 'database',
    create: 'createDatabase',
    update: 'updateDatabase',
    delete: 'deleteDatabase',
  },
});

const tableEntityTable = createTable({
  name: 'Table',
  fields: [
    { name: 'id', type: fieldTypes.uuid },
    { name: 'name', type: fieldTypes.string },
    { name: 'databaseId', type: fieldTypes.uuid },
  ],
  query: {
    all: 'tables',
    one: 'table',
    create: 'createTable',
    update: 'updateTable',
    delete: 'deleteTable',
  },
});

const fieldTable = createTable({
  name: 'Field',
  fields: [
    { name: 'id', type: fieldTypes.uuid },
    { name: 'name', type: fieldTypes.string },
    { name: 'tableId', type: fieldTypes.uuid },
    { name: 'type', type: fieldTypes.string },
  ],
  query: {
    all: 'fields',
    one: 'field',
    create: 'createField',
    update: 'updateField',
    delete: 'deleteField',
  },
});

const simpleConfig: QueryKeyConfig = {
  style: 'hierarchical',
  relationships: {},
  generateScopedKeys: true,
  generateCascadeHelpers: true,
  generateMutationKeys: true,
};

const simpleRelationships: Record<string, EntityRelationship> = {
  post: { parent: 'User', foreignKey: 'authorId' },
};

const hierarchicalRelationships: Record<string, EntityRelationship> = {
  database: { parent: 'Organization', foreignKey: 'organizationId' },
  table: { parent: 'Database', foreignKey: 'databaseId', ancestors: ['organization'] },
  field: { parent: 'Table', foreignKey: 'tableId', ancestors: ['database', 'organization'] },
};

const sampleCustomQueries: CleanOperation[] = [
  {
    name: 'currentUser',
    kind: 'query',
    args: [],
    returnType: createTypeRef('OBJECT', 'User'),
    description: 'Get the current authenticated user',
  },
  {
    name: 'searchUsers',
    kind: 'query',
    args: [
      { name: 'query', type: createTypeRef('NON_NULL', null, createTypeRef('SCALAR', 'String')) },
      { name: 'limit', type: createTypeRef('SCALAR', 'Int') },
    ],
    returnType: createTypeRef('LIST', null, createTypeRef('OBJECT', 'User')),
    description: 'Search users by name or email',
  },
];

const sampleCustomMutations: CleanOperation[] = [
  {
    name: 'login',
    kind: 'mutation',
    args: [
      { name: 'email', type: createTypeRef('NON_NULL', null, createTypeRef('SCALAR', 'String')) },
      { name: 'password', type: createTypeRef('NON_NULL', null, createTypeRef('SCALAR', 'String')) },
    ],
    returnType: createTypeRef('OBJECT', 'LoginPayload'),
    description: 'Authenticate user',
  },
  {
    name: 'logout',
    kind: 'mutation',
    args: [],
    returnType: createTypeRef('OBJECT', 'LogoutPayload'),
    description: 'Log out current user',
  },
];

describe('generateQueryKeysFile', () => {
  it('generates query keys for a single table without relationships', () => {
    const result = generateQueryKeysFile({
      tables: [simpleUserTable],
      customQueries: [],
      config: simpleConfig,
    });
    expect(result.fileName).toBe('query-keys.ts');
    expect(result.content).toMatchSnapshot();
  });

  it('generates query keys for multiple tables without relationships', () => {
    const result = generateQueryKeysFile({
      tables: [simpleUserTable, postTable],
      customQueries: [],
      config: simpleConfig,
    });
    expect(result.content).toMatchSnapshot();
  });

  it('generates query keys with simple parent-child relationship', () => {
    const result = generateQueryKeysFile({
      tables: [simpleUserTable, postTable],
      customQueries: [],
      config: {
        ...simpleConfig,
        relationships: simpleRelationships,
      },
    });
    expect(result.content).toMatchSnapshot();
  });

  it('generates query keys with hierarchical relationships (org -> db -> table -> field)', () => {
    const result = generateQueryKeysFile({
      tables: [organizationTable, databaseTable, tableEntityTable, fieldTable],
      customQueries: [],
      config: {
        ...simpleConfig,
        relationships: hierarchicalRelationships,
      },
    });
    expect(result.content).toMatchSnapshot();
  });

  it('generates query keys with custom queries', () => {
    const result = generateQueryKeysFile({
      tables: [simpleUserTable],
      customQueries: sampleCustomQueries,
      config: simpleConfig,
    });
    expect(result.content).toMatchSnapshot();
  });

  it('generates query keys without scoped keys when disabled', () => {
    const result = generateQueryKeysFile({
      tables: [simpleUserTable, postTable],
      customQueries: [],
      config: {
        ...simpleConfig,
        relationships: simpleRelationships,
        generateScopedKeys: false,
      },
    });
    expect(result.content).toMatchSnapshot();
  });
});

describe('generateMutationKeysFile', () => {
  it('generates mutation keys for a single table without relationships', () => {
    const result = generateMutationKeysFile({
      tables: [simpleUserTable],
      customMutations: [],
      config: simpleConfig,
    });
    expect(result.fileName).toBe('mutation-keys.ts');
    expect(result.content).toMatchSnapshot();
  });

  it('generates mutation keys for multiple tables', () => {
    const result = generateMutationKeysFile({
      tables: [simpleUserTable, postTable],
      customMutations: [],
      config: simpleConfig,
    });
    expect(result.content).toMatchSnapshot();
  });

  it('generates mutation keys with parent-child relationship', () => {
    const result = generateMutationKeysFile({
      tables: [simpleUserTable, postTable],
      customMutations: [],
      config: {
        ...simpleConfig,
        relationships: simpleRelationships,
      },
    });
    expect(result.content).toMatchSnapshot();
  });

  it('generates mutation keys with custom mutations', () => {
    const result = generateMutationKeysFile({
      tables: [simpleUserTable],
      customMutations: sampleCustomMutations,
      config: simpleConfig,
    });
    expect(result.content).toMatchSnapshot();
  });

  it('generates mutation keys for hierarchical relationships', () => {
    const result = generateMutationKeysFile({
      tables: [organizationTable, databaseTable, tableEntityTable, fieldTable],
      customMutations: [],
      config: {
        ...simpleConfig,
        relationships: hierarchicalRelationships,
      },
    });
    expect(result.content).toMatchSnapshot();
  });
});

describe('generateInvalidationFile', () => {
  it('generates invalidation helpers for a single table without relationships', () => {
    const result = generateInvalidationFile({
      tables: [simpleUserTable],
      config: simpleConfig,
    });
    expect(result.fileName).toBe('invalidation.ts');
    expect(result.content).toMatchSnapshot();
  });

  it('generates invalidation helpers for multiple tables', () => {
    const result = generateInvalidationFile({
      tables: [simpleUserTable, postTable],
      config: simpleConfig,
    });
    expect(result.content).toMatchSnapshot();
  });

  it('generates invalidation helpers with cascade support for parent-child relationship', () => {
    const result = generateInvalidationFile({
      tables: [simpleUserTable, postTable],
      config: {
        ...simpleConfig,
        relationships: simpleRelationships,
      },
    });
    expect(result.content).toMatchSnapshot();
  });

  it('generates invalidation helpers with cascade support for hierarchical relationships', () => {
    const result = generateInvalidationFile({
      tables: [organizationTable, databaseTable, tableEntityTable, fieldTable],
      config: {
        ...simpleConfig,
        relationships: hierarchicalRelationships,
      },
    });
    expect(result.content).toMatchSnapshot();
  });

  it('generates invalidation helpers without cascade when disabled', () => {
    const result = generateInvalidationFile({
      tables: [simpleUserTable, postTable],
      config: {
        ...simpleConfig,
        relationships: simpleRelationships,
        generateCascadeHelpers: false,
      },
    });
    expect(result.content).toMatchSnapshot();
  });
});
