/**
 * Snapshot tests for React Query hook generators
 *
 * Tests the actual generated hook code for:
 * - Query hooks (list/single)
 * - Mutation hooks (create/update/delete)
 * - Custom query hooks
 * - Custom mutation hooks
 * - Schema types
 * - Barrel files
 */
import {
  generateCustomMutationsBarrel,
  generateCustomQueriesBarrel,
  generateMainBarrel,
  generateMutationsBarrel,
  generateQueriesBarrel,
} from '../../core/codegen/barrel';
import { generateCustomMutationHook } from '../../core/codegen/custom-mutations';
import { generateCustomQueryHook } from '../../core/codegen/custom-queries';
import {
  generateCreateMutationHook,
  generateDeleteMutationHook,
  generateUpdateMutationHook,
} from '../../core/codegen/mutations';
import {
  generateListQueryHook,
  generateSingleQueryHook,
} from '../../core/codegen/queries';
import { generateSchemaTypesFile } from '../../core/codegen/schema-types-generator';
import type {
  CleanFieldType,
  CleanOperation,
  CleanRelations,
  CleanTable,
  CleanTypeRef,
  ResolvedType,
  TypeRegistry,
} from '../../types/schema';

const fieldTypes = {
  uuid: { gqlType: 'UUID', isArray: false } as CleanFieldType,
  string: { gqlType: 'String', isArray: false } as CleanFieldType,
  int: { gqlType: 'Int', isArray: false } as CleanFieldType,
  datetime: { gqlType: 'Datetime', isArray: false } as CleanFieldType,
  boolean: { gqlType: 'Boolean', isArray: false } as CleanFieldType,
};

const emptyRelations: CleanRelations = {
  belongsTo: [],
  hasOne: [],
  hasMany: [],
  manyToMany: [],
};

function createTable(
  partial: Partial<CleanTable> & { name: string },
): CleanTable {
  return {
    name: partial.name,
    fields: partial.fields ?? [],
    relations: partial.relations ?? emptyRelations,
    query: partial.query,
    inflection: partial.inflection,
    constraints: partial.constraints,
  };
}

function createTypeRef(
  kind: CleanTypeRef['kind'],
  name: string | null,
  ofType?: CleanTypeRef,
): CleanTypeRef {
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
    { name: 'published', type: fieldTypes.boolean },
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

const simpleCustomQueries: CleanOperation[] = [
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
      {
        name: 'query',
        type: createTypeRef(
          'NON_NULL',
          null,
          createTypeRef('SCALAR', 'String'),
        ),
      },
      { name: 'limit', type: createTypeRef('SCALAR', 'Int') },
    ],
    returnType: createTypeRef('LIST', null, createTypeRef('OBJECT', 'User')),
    description: 'Search users by name or email',
  },
];

const optionalArgsCustomQuery: CleanOperation = {
  name: 'recentUsers',
  kind: 'query',
  args: [{ name: 'limit', type: createTypeRef('SCALAR', 'Int') }],
  returnType: createTypeRef('OBJECT', 'User'),
  description: 'Fetch recently active users',
};

const simpleCustomMutations: CleanOperation[] = [
  {
    name: 'login',
    kind: 'mutation',
    args: [
      {
        name: 'email',
        type: createTypeRef(
          'NON_NULL',
          null,
          createTypeRef('SCALAR', 'String'),
        ),
      },
      {
        name: 'password',
        type: createTypeRef(
          'NON_NULL',
          null,
          createTypeRef('SCALAR', 'String'),
        ),
      },
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
  {
    name: 'register',
    kind: 'mutation',
    args: [
      {
        name: 'input',
        type: createTypeRef(
          'NON_NULL',
          null,
          createTypeRef('INPUT_OBJECT', 'RegisterInput'),
        ),
      },
    ],
    returnType: createTypeRef('OBJECT', 'RegisterPayload'),
    description: 'Register a new user',
  },
];

function createTypeRegistry(): TypeRegistry {
  const registry: TypeRegistry = new Map();

  registry.set('LoginPayload', {
    kind: 'OBJECT',
    name: 'LoginPayload',
    fields: [
      { name: 'token', type: createTypeRef('SCALAR', 'String') },
      { name: 'user', type: createTypeRef('OBJECT', 'User') },
    ],
  } as ResolvedType);

  registry.set('LogoutPayload', {
    kind: 'OBJECT',
    name: 'LogoutPayload',
    fields: [{ name: 'success', type: createTypeRef('SCALAR', 'Boolean') }],
  } as ResolvedType);

  registry.set('RegisterPayload', {
    kind: 'OBJECT',
    name: 'RegisterPayload',
    fields: [
      { name: 'token', type: createTypeRef('SCALAR', 'String') },
      { name: 'user', type: createTypeRef('OBJECT', 'User') },
    ],
  } as ResolvedType);

  registry.set('RegisterInput', {
    kind: 'INPUT_OBJECT',
    name: 'RegisterInput',
    inputFields: [
      {
        name: 'email',
        type: createTypeRef(
          'NON_NULL',
          null,
          createTypeRef('SCALAR', 'String'),
        ),
      },
      {
        name: 'password',
        type: createTypeRef(
          'NON_NULL',
          null,
          createTypeRef('SCALAR', 'String'),
        ),
      },
      { name: 'name', type: createTypeRef('SCALAR', 'String') },
    ],
  } as ResolvedType);

  registry.set('UserRole', {
    kind: 'ENUM',
    name: 'UserRole',
    enumValues: ['ADMIN', 'USER', 'GUEST'],
  } as ResolvedType);

  registry.set('Query', {
    kind: 'OBJECT',
    name: 'Query',
    fields: [{ name: 'currentUser', type: createTypeRef('OBJECT', 'User') }],
  } as ResolvedType);

  registry.set('Mutation', {
    kind: 'OBJECT',
    name: 'Mutation',
    fields: [
      { name: 'login', type: createTypeRef('OBJECT', 'LoginPayload') },
      { name: 'logout', type: createTypeRef('OBJECT', 'LogoutPayload') },
      { name: 'register', type: createTypeRef('OBJECT', 'RegisterPayload') },
    ],
  } as ResolvedType);

  return registry;
}

describe('Query Hook Generators', () => {
  describe('generateListQueryHook', () => {
    it('generates list query hook for simple table', () => {
      const result = generateListQueryHook(simpleUserTable, {
        reactQueryEnabled: true,
        useCentralizedKeys: true,
      });
      expect(result).not.toBeNull();
      expect(result.fileName).toBe('useUsersQuery.ts');
      expect(result.content).toMatchSnapshot();
    });

    it('generates list query hook without centralized keys', () => {
      const result = generateListQueryHook(simpleUserTable, {
        reactQueryEnabled: true,
        useCentralizedKeys: false,
      });
      expect(result).not.toBeNull();
      expect(result.content).toMatchSnapshot();
    });

    it('generates list query hook for table with relationships', () => {
      const result = generateListQueryHook(postTable, {
        reactQueryEnabled: true,
        useCentralizedKeys: true,
        hasRelationships: true,
      });
      expect(result).not.toBeNull();
      expect(result.content).toMatchSnapshot();
    });
  });

  describe('generateSingleQueryHook', () => {
    it('generates single query hook for simple table', () => {
      const result = generateSingleQueryHook(simpleUserTable, {
        reactQueryEnabled: true,
        useCentralizedKeys: true,
      });
      expect(result).not.toBeNull();
      expect(result.fileName).toBe('useUserQuery.ts');
      expect(result.content).toMatchSnapshot();
    });

    it('generates single query hook without centralized keys', () => {
      const result = generateSingleQueryHook(simpleUserTable, {
        reactQueryEnabled: true,
        useCentralizedKeys: false,
      });
      expect(result).not.toBeNull();
      expect(result.content).toMatchSnapshot();
    });

    it('generates single query hook for table with relationships', () => {
      const result = generateSingleQueryHook(postTable, {
        reactQueryEnabled: true,
        useCentralizedKeys: true,
        hasRelationships: true,
      });
      expect(result).not.toBeNull();
      expect(result.content).toMatchSnapshot();
    });
  });
});

describe('Mutation Hook Generators', () => {
  describe('generateCreateMutationHook', () => {
    it('generates create mutation hook for simple table', () => {
      const result = generateCreateMutationHook(simpleUserTable, {
        reactQueryEnabled: true,
        useCentralizedKeys: true,
      });
      expect(result).not.toBeNull();
      expect(result!.fileName).toBe('useCreateUserMutation.ts');
      expect(result!.content).toMatchSnapshot();
    });

    it('generates create mutation hook without centralized keys', () => {
      const result = generateCreateMutationHook(simpleUserTable, {
        reactQueryEnabled: true,
        useCentralizedKeys: false,
      });
      expect(result).not.toBeNull();
      expect(result!.content).toMatchSnapshot();
    });

    it('generates create mutation hook for table with relationships', () => {
      const result = generateCreateMutationHook(postTable, {
        reactQueryEnabled: true,
        useCentralizedKeys: true,
      });
      expect(result).not.toBeNull();
      expect(result!.content).toMatchSnapshot();
    });
  });

  describe('generateUpdateMutationHook', () => {
    it('generates update mutation hook for simple table', () => {
      const result = generateUpdateMutationHook(simpleUserTable, {
        reactQueryEnabled: true,
        useCentralizedKeys: true,
      });
      expect(result).not.toBeNull();
      expect(result!.fileName).toBe('useUpdateUserMutation.ts');
      expect(result!.content).toMatchSnapshot();
    });

    it('generates update mutation hook without centralized keys', () => {
      const result = generateUpdateMutationHook(simpleUserTable, {
        reactQueryEnabled: true,
        useCentralizedKeys: false,
      });
      expect(result).not.toBeNull();
      expect(result!.content).toMatchSnapshot();
    });

    it('generates update mutation hook for table with relationships', () => {
      const result = generateUpdateMutationHook(postTable, {
        reactQueryEnabled: true,
        useCentralizedKeys: true,
      });
      expect(result).not.toBeNull();
      expect(result!.content).toMatchSnapshot();
    });
  });

  describe('generateDeleteMutationHook', () => {
    it('generates delete mutation hook for simple table', () => {
      const result = generateDeleteMutationHook(simpleUserTable, {
        reactQueryEnabled: true,
        useCentralizedKeys: true,
      });
      expect(result).not.toBeNull();
      expect(result!.fileName).toBe('useDeleteUserMutation.ts');
      expect(result!.content).toMatchSnapshot();
    });

    it('generates delete mutation hook without centralized keys', () => {
      const result = generateDeleteMutationHook(simpleUserTable, {
        reactQueryEnabled: true,
        useCentralizedKeys: false,
      });
      expect(result).not.toBeNull();
      expect(result!.content).toMatchSnapshot();
    });

    it('generates delete mutation hook for table with relationships', () => {
      const result = generateDeleteMutationHook(postTable, {
        reactQueryEnabled: true,
        useCentralizedKeys: true,
      });
      expect(result).not.toBeNull();
      expect(result!.content).toMatchSnapshot();
    });
  });
});

describe('Custom Query Hook Generators', () => {
  describe('generateCustomQueryHook', () => {
    it('generates custom query hook without arguments', () => {
      const result = generateCustomQueryHook({
        operation: simpleCustomQueries[0],
        typeRegistry: createTypeRegistry(),
        useCentralizedKeys: true,
      });
      expect(result).not.toBeNull();
      expect(result!.fileName).toBe('useCurrentUserQuery.ts');
      expect(result!.content).toMatchSnapshot();
    });

    it('generates custom query hook with arguments', () => {
      const result = generateCustomQueryHook({
        operation: simpleCustomQueries[1],
        typeRegistry: createTypeRegistry(),
        useCentralizedKeys: true,
      });
      expect(result).not.toBeNull();
      expect(result!.fileName).toBe('useSearchUsersQuery.ts');
      expect(result!.content).toMatchSnapshot();
    });

    it('generates custom query hook without centralized keys', () => {
      const result = generateCustomQueryHook({
        operation: simpleCustomQueries[0],
        typeRegistry: createTypeRegistry(),
        useCentralizedKeys: false,
      });
      expect(result).not.toBeNull();
      expect(result!.content).toMatchSnapshot();
    });

    it('keeps nullable return typing for selected custom queries', () => {
      const result = generateCustomQueryHook({
        operation: simpleCustomQueries[0],
        typeRegistry: createTypeRegistry(),
        useCentralizedKeys: true,
      });

      expect(result!.content).toContain(
        'currentUser: InferSelectResult<User, S> | null;',
      );
    });

    it('marks variables optional in selection overloads when all args are optional', () => {
      const result = generateCustomQueryHook({
        operation: optionalArgsCustomQuery,
        typeRegistry: createTypeRegistry(),
        useCentralizedKeys: true,
      });

      const optionalVariablesMatches = result!.content.match(
        /variables\?: RecentUsersVariables;/g,
      );
      expect(optionalVariablesMatches?.length ?? 0).toBeGreaterThanOrEqual(3);
      expect(result!.content).not.toMatch(
        /variables:\s*RecentUsersVariables;\s*\n\s*selection:/,
      );
    });
  });
});

describe('Custom Mutation Hook Generators', () => {
  describe('generateCustomMutationHook', () => {
    it('generates custom mutation hook with arguments', () => {
      const result = generateCustomMutationHook({
        operation: simpleCustomMutations[0],
        typeRegistry: createTypeRegistry(),
        useCentralizedKeys: true,
      });
      expect(result).not.toBeNull();
      expect(result!.fileName).toBe('useLoginMutation.ts');
      expect(result!.content).toMatchSnapshot();
    });

    it('generates custom mutation hook without arguments', () => {
      const result = generateCustomMutationHook({
        operation: simpleCustomMutations[1],
        typeRegistry: createTypeRegistry(),
        useCentralizedKeys: true,
      });
      expect(result).not.toBeNull();
      expect(result!.fileName).toBe('useLogoutMutation.ts');
      expect(result!.content).toMatchSnapshot();
    });

    it('generates custom mutation hook with input object argument', () => {
      const result = generateCustomMutationHook({
        operation: simpleCustomMutations[2],
        typeRegistry: createTypeRegistry(),
        useCentralizedKeys: true,
      });
      expect(result).not.toBeNull();
      expect(result!.fileName).toBe('useRegisterMutation.ts');
      expect(result!.content).toMatchSnapshot();
    });

    it('generates custom mutation hook without centralized keys', () => {
      const result = generateCustomMutationHook({
        operation: simpleCustomMutations[0],
        typeRegistry: createTypeRegistry(),
        useCentralizedKeys: false,
      });
      expect(result).not.toBeNull();
      expect(result!.content).toMatchSnapshot();
    });

    it('keeps nullable return typing for selected custom mutations', () => {
      const result = generateCustomMutationHook({
        operation: simpleCustomMutations[0],
        typeRegistry: createTypeRegistry(),
        useCentralizedKeys: true,
      });

      expect(result!.content).toContain(
        'login: InferSelectResult<LoginPayload, S> | null;',
      );
    });
  });
});

describe('Schema Types Generator', () => {
  describe('generateSchemaTypesFile', () => {
    it('generates schema types file with enums and input objects', () => {
      const result = generateSchemaTypesFile({
        typeRegistry: createTypeRegistry(),
        tableTypeNames: new Set(['User', 'Post']),
      });
      expect(result.fileName).toBe('schema-types.ts');
      expect(result.content).toMatchSnapshot();
    });

    it('generates schema types file with empty table types', () => {
      const result = generateSchemaTypesFile({
        typeRegistry: createTypeRegistry(),
        tableTypeNames: new Set(),
      });
      expect(result.content).toMatchSnapshot();
    });
  });
});

describe('Barrel File Generators', () => {
  describe('generateQueriesBarrel', () => {
    it('generates queries barrel for single table', () => {
      const result = generateQueriesBarrel([simpleUserTable]);
      expect(result).toMatchSnapshot();
    });

    it('generates queries barrel for multiple tables', () => {
      const result = generateQueriesBarrel([simpleUserTable, postTable]);
      expect(result).toMatchSnapshot();
    });
  });

  describe('generateMutationsBarrel', () => {
    it('generates mutations barrel for single table', () => {
      const result = generateMutationsBarrel([simpleUserTable]);
      expect(result).toMatchSnapshot();
    });

    it('generates mutations barrel for multiple tables', () => {
      const result = generateMutationsBarrel([simpleUserTable, postTable]);
      expect(result).toMatchSnapshot();
    });
  });

  describe('generateMainBarrel', () => {
    it('generates main barrel with all options enabled', () => {
      const result = generateMainBarrel([simpleUserTable, postTable], {
        hasMutations: true,
        hasQueryKeys: true,
        hasMutationKeys: true,
        hasInvalidation: true,
      });
      expect(result).toMatchSnapshot();
    });

    it('generates main barrel without custom operations', () => {
      const result = generateMainBarrel([simpleUserTable], {
        hasMutations: true,
      });
      expect(result).toMatchSnapshot();
    });

    it('generates main barrel without mutations', () => {
      const result = generateMainBarrel([simpleUserTable, postTable], {
        hasMutations: false,
      });
      expect(result).toMatchSnapshot();
    });
  });

  describe('generateCustomQueriesBarrel', () => {
    it('generates custom queries barrel', () => {
      const customQueryNames = simpleCustomQueries.map((q) => q.name);
      const result = generateCustomQueriesBarrel(
        [simpleUserTable],
        customQueryNames,
      );
      expect(result).toMatchSnapshot();
    });
  });

  describe('generateCustomMutationsBarrel', () => {
    it('generates custom mutations barrel', () => {
      const customMutationNames = simpleCustomMutations.map((m) => m.name);
      const result = generateCustomMutationsBarrel(
        [simpleUserTable],
        customMutationNames,
      );
      expect(result).toMatchSnapshot();
    });
  });
});
