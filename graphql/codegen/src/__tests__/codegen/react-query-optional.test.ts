/**
 * Tests for React Query optional flag in code generators
 *
 * Verifies that when reactQueryEnabled is false:
 * - Query generators skip React Query imports and hooks
 * - Mutation generators return null (since they require React Query)
 * - Standalone fetch functions are still generated for queries
 */
import { generateAllCustomMutationHooks,generateCustomMutationHook } from '../../core/codegen/custom-mutations';
import { generateAllCustomQueryHooks,generateCustomQueryHook } from '../../core/codegen/custom-queries';
import { generateAllMutationHooks,generateCreateMutationHook, generateDeleteMutationHook, generateUpdateMutationHook } from '../../core/codegen/mutations';
import { generateAllQueryHooks,generateListQueryHook, generateSingleQueryHook } from '../../core/codegen/queries';
import type { CleanFieldType, CleanOperation, CleanRelations, CleanTable, CleanTypeRef, TypeRegistry } from '../../types/schema';

// ============================================================================
// Test Fixtures
// ============================================================================

const fieldTypes = {
  uuid: { gqlType: 'UUID', isArray: false } as CleanFieldType,
  string: { gqlType: 'String', isArray: false } as CleanFieldType,
  int: { gqlType: 'Int', isArray: false } as CleanFieldType,
  datetime: { gqlType: 'Datetime', isArray: false } as CleanFieldType
};

const emptyRelations: CleanRelations = {
  belongsTo: [],
  hasOne: [],
  hasMany: [],
  manyToMany: []
};

function createTable(partial: Partial<CleanTable> & { name: string }): CleanTable {
  return {
    name: partial.name,
    fields: partial.fields ?? [],
    relations: partial.relations ?? emptyRelations,
    query: partial.query,
    inflection: partial.inflection,
    constraints: partial.constraints
  };
}

const userTable = createTable({
  name: 'User',
  fields: [
    { name: 'id', type: fieldTypes.uuid },
    { name: 'email', type: fieldTypes.string },
    { name: 'name', type: fieldTypes.string },
    { name: 'createdAt', type: fieldTypes.datetime }
  ],
  query: {
    all: 'users',
    one: 'user',
    create: 'createUser',
    update: 'updateUser',
    delete: 'deleteUser'
  }
});

function createTypeRef(kind: CleanTypeRef['kind'], name: string | null, ofType?: CleanTypeRef): CleanTypeRef {
  return { kind, name, ofType };
}

const sampleQueryOperation: CleanOperation = {
  name: 'currentUser',
  kind: 'query',
  args: [],
  returnType: createTypeRef('OBJECT', 'User'),
  description: 'Get the current authenticated user'
};

const sampleMutationOperation: CleanOperation = {
  name: 'login',
  kind: 'mutation',
  args: [
    { name: 'email', type: createTypeRef('NON_NULL', null, createTypeRef('SCALAR', 'String')) },
    { name: 'password', type: createTypeRef('NON_NULL', null, createTypeRef('SCALAR', 'String')) }
  ],
  returnType: createTypeRef('OBJECT', 'LoginPayload'),
  description: 'Authenticate user'
};

const emptyTypeRegistry: TypeRegistry = new Map();

// ============================================================================
// Tests - Query Generators with reactQueryEnabled: false
// ============================================================================

describe('Query generators with reactQueryEnabled: false', () => {
  describe('generateListQueryHook', () => {
    it('should not include React Query imports when disabled', () => {
      const result = generateListQueryHook(userTable, { reactQueryEnabled: false });
      expect(result.content).not.toContain('@tanstack/react-query');
      expect(result.content).not.toContain('useQuery');
      expect(result.content).not.toContain('UseQueryOptions');
    });

    it('should not include useXxxQuery hook when disabled', () => {
      const result = generateListQueryHook(userTable, { reactQueryEnabled: false });
      expect(result.content).not.toContain('export function useUsersQuery');
    });

    it('should not include prefetch function when disabled', () => {
      const result = generateListQueryHook(userTable, { reactQueryEnabled: false });
      expect(result.content).not.toContain('export async function prefetchUsersQuery');
    });

    it('should still include standalone fetch function when disabled', () => {
      const result = generateListQueryHook(userTable, { reactQueryEnabled: false });
      expect(result.content).toContain('export async function fetchUsersQuery');
    });

    it('should still include ORM client imports when disabled', () => {
      const result = generateListQueryHook(userTable, { reactQueryEnabled: false });
      expect(result.content).toContain('getClient');
    });

    it('should still include query key factory when disabled', () => {
      const result = generateListQueryHook(userTable, { reactQueryEnabled: false });
      expect(result.content).toContain('usersQueryKey');
    });

    it('should update file header when disabled', () => {
      const result = generateListQueryHook(userTable, { reactQueryEnabled: false });
      expect(result.content).toContain('List query functions for User');
    });
  });

  describe('generateSingleQueryHook', () => {
    it('should not include React Query imports when disabled', () => {
      const result = generateSingleQueryHook(userTable, { reactQueryEnabled: false });
      expect(result.content).not.toContain('@tanstack/react-query');
      expect(result.content).not.toContain('useQuery');
    });

    it('should not include useXxxQuery hook when disabled', () => {
      const result = generateSingleQueryHook(userTable, { reactQueryEnabled: false });
      expect(result.content).not.toContain('export function useUserQuery');
    });

    it('should still include standalone fetch function when disabled', () => {
      const result = generateSingleQueryHook(userTable, { reactQueryEnabled: false });
      expect(result.content).toContain('export async function fetchUserQuery');
    });
  });

  describe('generateAllQueryHooks', () => {
    it('should generate files without React Query when disabled', () => {
      const results = generateAllQueryHooks([userTable], { reactQueryEnabled: false });
      expect(results.length).toBe(2); // list + single
      for (const result of results) {
        expect(result.content).not.toContain('@tanstack/react-query');
        expect(result.content).not.toContain('useQuery');
      }
    });
  });
});

// ============================================================================
// Tests - Query Generators with reactQueryEnabled: true (default)
// ============================================================================

describe('Query generators with reactQueryEnabled: true (default)', () => {
  describe('generateListQueryHook', () => {
    it('should include React Query imports by default', () => {
      const result = generateListQueryHook(userTable);
      expect(result.content).toContain('@tanstack/react-query');
      expect(result.content).toContain('useQuery');
    });

    it('should include useXxxQuery hook by default', () => {
      const result = generateListQueryHook(userTable);
      expect(result.content).toContain('export function useUsersQuery');
    });

    it('should include prefetch function by default', () => {
      const result = generateListQueryHook(userTable);
      expect(result.content).toContain('export async function prefetchUsersQuery');
    });

    it('should include standalone fetch function by default', () => {
      const result = generateListQueryHook(userTable);
      expect(result.content).toContain('export async function fetchUsersQuery');
    });
  });
});

// ============================================================================
// Tests - Mutation Generators with reactQueryEnabled: false
// ============================================================================

describe('Mutation generators with reactQueryEnabled: false', () => {
  describe('generateCreateMutationHook', () => {
    it('should return null when disabled', () => {
      const result = generateCreateMutationHook(userTable, { reactQueryEnabled: false });
      expect(result).toBeNull();
    });
  });

  describe('generateUpdateMutationHook', () => {
    it('should return null when disabled', () => {
      const result = generateUpdateMutationHook(userTable, { reactQueryEnabled: false });
      expect(result).toBeNull();
    });
  });

  describe('generateDeleteMutationHook', () => {
    it('should return null when disabled', () => {
      const result = generateDeleteMutationHook(userTable, { reactQueryEnabled: false });
      expect(result).toBeNull();
    });
  });

  describe('generateAllMutationHooks', () => {
    it('should return empty array when disabled', () => {
      const results = generateAllMutationHooks([userTable], { reactQueryEnabled: false });
      expect(results).toEqual([]);
    });
  });
});

// ============================================================================
// Tests - Mutation Generators with reactQueryEnabled: true (default)
// ============================================================================

describe('Mutation generators with reactQueryEnabled: true (default)', () => {
  describe('generateCreateMutationHook', () => {
    it('should return mutation file by default', () => {
      const result = generateCreateMutationHook(userTable);
      expect(result).not.toBeNull();
      expect(result!.content).toContain('useMutation');
    });
  });

  describe('generateAllMutationHooks', () => {
    it('should return mutation files by default', () => {
      const results = generateAllMutationHooks([userTable]);
      expect(results.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Tests - Custom Query Generators with reactQueryEnabled: false
// ============================================================================

describe('Custom query generators with reactQueryEnabled: false', () => {
  describe('generateCustomQueryHook', () => {
    it('should not include React Query imports when disabled', () => {
      const result = generateCustomQueryHook({
        operation: sampleQueryOperation,
        typeRegistry: emptyTypeRegistry,
        reactQueryEnabled: false
      });
      expect(result.content).not.toContain('@tanstack/react-query');
      expect(result.content).not.toContain('useQuery');
    });

    it('should not include useXxxQuery hook when disabled', () => {
      const result = generateCustomQueryHook({
        operation: sampleQueryOperation,
        typeRegistry: emptyTypeRegistry,
        reactQueryEnabled: false
      });
      expect(result.content).not.toContain('export function useCurrentUserQuery');
    });

    it('should still include standalone fetch function when disabled', () => {
      const result = generateCustomQueryHook({
        operation: sampleQueryOperation,
        typeRegistry: emptyTypeRegistry,
        reactQueryEnabled: false
      });
      expect(result.content).toContain('export async function fetchCurrentUserQuery');
    });
  });

  describe('generateAllCustomQueryHooks', () => {
    it('should generate files without React Query when disabled', () => {
      const results = generateAllCustomQueryHooks({
        operations: [sampleQueryOperation],
        typeRegistry: emptyTypeRegistry,
        reactQueryEnabled: false
      });
      expect(results.length).toBe(1);
      expect(results[0].content).not.toContain('@tanstack/react-query');
    });
  });
});

// ============================================================================
// Tests - Custom Mutation Generators with reactQueryEnabled: false
// ============================================================================

describe('Custom mutation generators with reactQueryEnabled: false', () => {
  describe('generateCustomMutationHook', () => {
    it('should return null when disabled', () => {
      const result = generateCustomMutationHook({
        operation: sampleMutationOperation,
        typeRegistry: emptyTypeRegistry,
        reactQueryEnabled: false
      });
      expect(result).toBeNull();
    });
  });

  describe('generateAllCustomMutationHooks', () => {
    it('should return empty array when disabled', () => {
      const results = generateAllCustomMutationHooks({
        operations: [sampleMutationOperation],
        typeRegistry: emptyTypeRegistry,
        reactQueryEnabled: false
      });
      expect(results).toEqual([]);
    });
  });
});

// ============================================================================
// Tests - Custom Mutation Generators with reactQueryEnabled: true (default)
// ============================================================================

describe('Custom mutation generators with reactQueryEnabled: true (default)', () => {
  describe('generateCustomMutationHook', () => {
    it('should return mutation file by default', () => {
      const result = generateCustomMutationHook({
        operation: sampleMutationOperation,
        typeRegistry: emptyTypeRegistry
      });
      expect(result).not.toBeNull();
      expect(result!.content).toContain('useMutation');
    });
  });
});
