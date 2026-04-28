/**
 * Snapshot tests for ORM client-generator.ts
 *
 * Tests the generated ORM client files: client.ts, query-builder.ts, select-types.ts, index.ts
 */
import {
  generateCreateClientFile,
  generateOrmClientFile,
  generateQueryBuilderFile,
  generateSelectTypesFile,
} from '../../core/codegen/orm/client-generator';
import type {
  FieldType,
  Relations,
  Table,
} from '../../types/schema';

// ============================================================================
// Test Fixtures
// ============================================================================

const fieldTypes = {
  uuid: { gqlType: 'UUID', isArray: false } as FieldType,
  string: { gqlType: 'String', isArray: false } as FieldType,
};

const emptyRelations: Relations = {
  belongsTo: [],
  hasOne: [],
  hasMany: [],
  manyToMany: [],
};

function createTable(
  partial: Partial<Table> & { name: string },
): Table {
  return {
    name: partial.name,
    fields: partial.fields ?? [],
    relations: partial.relations ?? emptyRelations,
    query: partial.query,
    inflection: partial.inflection,
    constraints: partial.constraints,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('client-generator', () => {
  describe('generateOrmClientFile', () => {
    it('generates OrmClient class with execute method', () => {
      const result = generateOrmClientFile();

      expect(result.fileName).toBe('client.ts');
      expect(result.content).toMatchSnapshot();
      expect(result.content).toContain('class OrmClient');
      expect(result.content).toContain('execute<T>');
      expect(result.content).toContain('QueryResult<T>');
      expect(result.content).toContain('GraphQLRequestError');
    });

    it('exposes an optional fetch injection in OrmClientConfig', () => {
      const result = generateOrmClientFile();

      expect(result.content).toContain('fetch?: typeof globalThis.fetch');
      expect(result.content).toContain('config.fetch');
    });

    it('imports createFetch from @constructive-io/graphql-query/runtime', () => {
      const result = generateOrmClientFile();

      expect(result.content).toContain(
        "import { createFetch } from '@constructive-io/graphql-query/runtime'",
      );
      expect(result.content).toContain('createFetch()');
    });
  });

  describe('generateQueryBuilderFile', () => {
    it('generates QueryBuilder with gql-ast document builders', () => {
      const result = generateQueryBuilderFile();

      expect(result.fileName).toBe('query-builder.ts');
      expect(result.content).toContain('class QueryBuilder');
      expect(result.content).toContain('buildFindManyDocument');
      expect(result.content).toContain('buildFindFirstDocument');
      expect(result.content).toContain('buildCreateDocument');
      expect(result.content).toContain('buildUpdateDocument');
      expect(result.content).toContain('buildDeleteDocument');
      expect(result.content).toContain("import * as t from 'gql-ast'");
    });
  });

  describe('generateSelectTypesFile', () => {
    it('generates select type utilities', () => {
      const result = generateSelectTypesFile();

      expect(result.fileName).toBe('select-types.ts');
      expect(result.content).toMatchSnapshot();
      expect(result.content).toContain('ConnectionResult');
      expect(result.content).toContain('PageInfo');
      expect(result.content).toContain('FindManyArgs');
      expect(result.content).toContain('DeepExact');
      expect(result.content).toContain('InferSelectResult');
    });
  });

  describe('generateCreateClientFile', () => {
    it('generates createClient factory with models', () => {
      const tables = [
        createTable({
          name: 'User',
          fields: [{ name: 'id', type: fieldTypes.uuid }],
          query: {
            all: 'users',
            one: 'user',
            create: 'createUser',
            update: 'updateUser',
            delete: 'deleteUser',
          },
        }),
        createTable({
          name: 'Post',
          fields: [{ name: 'id', type: fieldTypes.uuid }],
          query: {
            all: 'posts',
            one: 'post',
            create: 'createPost',
            update: 'updatePost',
            delete: 'deletePost',
          },
        }),
      ];

      const result = generateCreateClientFile(tables, false, false);

      expect(result.fileName).toBe('index.ts');
      expect(result.content).toMatchSnapshot();
      expect(result.content).toContain('createClient');
      expect(result.content).toContain('UserModel');
      expect(result.content).toContain('PostModel');
    });

    it('includes custom query/mutation operations when available', () => {
      const tables = [
        createTable({
          name: 'User',
          fields: [{ name: 'id', type: fieldTypes.uuid }],
          query: {
            all: 'users',
            one: 'user',
            create: 'createUser',
            update: 'updateUser',
            delete: 'deleteUser',
          },
        }),
      ];

      const result = generateCreateClientFile(tables, true, true);

      expect(result.content).toMatchSnapshot();
      expect(result.content).toContain('createQueryOperations');
      expect(result.content).toContain('createMutationOperations');
      expect(result.content).toContain('query: createQueryOperations(client)');
      expect(result.content).toContain(
        'mutation: createMutationOperations(client)',
      );
    });
  });
});
