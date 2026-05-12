/**
 * Snapshot tests for ORM client-generator.ts
 *
 * Tests the generated ORM client files: client.ts, query-builder.ts, select-types.ts, index.ts
 */
import * as vm from 'node:vm';

import * as ts from 'typescript';

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

type FetchAdapterConstructor = new (
  endpoint: string,
  headers?: Record<string, string>,
  fetchFn?: typeof globalThis.fetch,
) => {
  execute<T>(
    document: string,
    variables?: Record<string, unknown>,
  ): Promise<{ ok: boolean; data: T | null; errors?: unknown[] }>;
};

function loadGeneratedFetchAdapter(
  createFetch: () => typeof globalThis.fetch,
): FetchAdapterConstructor {
  const { content } = generateOrmClientFile();
  const { outputText } = ts.transpileModule(content, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const mod = { exports: {} as Record<string, unknown> };

  vm.runInNewContext(
    outputText,
    {
      exports: mod.exports,
      globalThis,
      module: mod,
      require: (specifier: string) => {
        if (specifier === '@constructive-io/graphql-query/runtime') {
          return { createFetch };
        }
        if (specifier === './realtime') {
          return { RealtimeManager: class RealtimeManager {} };
        }
        throw new Error(`Unexpected generated client import: ${specifier}`);
      },
    },
    { filename: 'generated-orm-client.cjs' },
  );

  return mod.exports.FetchAdapter as FetchAdapterConstructor;
}

function createThisSensitiveFetch(payload: unknown) {
  const calls: {
    input: RequestInfo | URL;
    init?: RequestInit;
    thisArg: unknown;
  }[] = [];

  function fetchStub(
    this: unknown,
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    calls.push({ input, init, thisArg: this });
    if (this !== globalThis) {
      return Promise.reject(new TypeError('Illegal invocation'));
    }
    return Promise.resolve(
      new Response(JSON.stringify(payload), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    );
  }

  return { calls, fetchStub: fetchStub as typeof globalThis.fetch };
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

    it('FetchAdapter constructor binds the selected fetch function to globalThis', () => {
      const result = generateOrmClientFile();

      // Must match the exact constructor assignment with correct precedence:
      // this.fetchFn = (fetchFn ?? createFetch()).bind(globalThis);
      // Guards against a stray .bind(globalThis) in a comment or wrong
      // precedence like fetchFn ?? createFetch().bind(globalThis).
      expect(result.content).toMatch(
        /this\.fetchFn\s*=\s*\(\s*fetchFn\s*\?\?\s*createFetch\(\)\s*\)\.bind\(globalThis\)\s*;/,
      );
      expect(result.content).not.toMatch(
        /fetchFn\s*\?\?\s*createFetch\(\)\.bind\(globalThis\)/,
      );
    });

    it('executes with default createFetch result bound to globalThis', async () => {
      const { calls, fetchStub } = createThisSensitiveFetch({
        data: { ok: true },
      });
      const createFetch = jest.fn(() => fetchStub);
      const FetchAdapter = loadGeneratedFetchAdapter(createFetch);
      const adapter = new FetchAdapter('https://api.example/graphql', {
        Authorization: 'Bearer token',
      });

      await expect(
        adapter.execute<{ ok: boolean }>('query Test { ok }'),
      ).resolves.toEqual({
        data: { ok: true },
        errors: undefined,
        ok: true,
      });
      expect(createFetch).toHaveBeenCalledTimes(1);
      expect(calls).toHaveLength(1);
      expect(calls[0].thisArg).toBe(globalThis);
      expect(calls[0].input).toBe('https://api.example/graphql');
    });

    it('executes with injected fetchFn bound to globalThis', async () => {
      const { calls, fetchStub } = createThisSensitiveFetch({
        data: { injected: true },
      });
      const createFetch = jest.fn(() => {
        throw new Error('createFetch should not be called');
      });
      const FetchAdapter = loadGeneratedFetchAdapter(createFetch);
      const adapter = new FetchAdapter(
        'https://api.example/graphql',
        undefined,
        fetchStub,
      );

      await expect(
        adapter.execute<{ injected: boolean }>('query Test { injected }'),
      ).resolves.toEqual({
        data: { injected: true },
        errors: undefined,
        ok: true,
      });
      expect(createFetch).not.toHaveBeenCalled();
      expect(calls).toHaveLength(1);
      expect(calls[0].thisArg).toBe(globalThis);
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
