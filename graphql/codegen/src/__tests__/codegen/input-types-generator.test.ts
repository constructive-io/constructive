/**
 * Comprehensive tests for input-types-generator.ts
 *
 * Uses snapshot testing to validate generated TypeScript output.
 * These snapshots capture the current string-based output and will be
 * used to validate the AST-based migration produces equivalent results.
 */
// Jest globals - no import needed
import { generateInputTypesFile, collectInputTypeNames, collectPayloadTypeNames } from '../../core/codegen/orm/input-types-generator';
import type {
  CleanTable,
  CleanFieldType,
  CleanRelations,
  TypeRegistry,
  ResolvedType,
  CleanArgument,
  CleanTypeRef,
} from '../../types/schema';

// ============================================================================
// Test Fixtures - Field Types
// ============================================================================

const fieldTypes = {
  uuid: { gqlType: 'UUID', isArray: false } as CleanFieldType,
  string: { gqlType: 'String', isArray: false } as CleanFieldType,
  int: { gqlType: 'Int', isArray: false } as CleanFieldType,
  float: { gqlType: 'Float', isArray: false } as CleanFieldType,
  boolean: { gqlType: 'Boolean', isArray: false } as CleanFieldType,
  datetime: { gqlType: 'Datetime', isArray: false } as CleanFieldType,
  date: { gqlType: 'Date', isArray: false } as CleanFieldType,
  json: { gqlType: 'JSON', isArray: false } as CleanFieldType,
  bigint: { gqlType: 'BigInt', isArray: false } as CleanFieldType,
  stringArray: { gqlType: 'String', isArray: true } as CleanFieldType,
  intArray: { gqlType: 'Int', isArray: true } as CleanFieldType,
};

// ============================================================================
// Test Fixtures - Helper Functions
// ============================================================================

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

function createTypeRegistry(types: Record<string, ResolvedType>): TypeRegistry {
  return new Map(Object.entries(types));
}

function createTypeRef(kind: CleanTypeRef['kind'], name: string | null, ofType?: CleanTypeRef): CleanTypeRef {
  return { kind, name, ofType };
}

function createNonNull(inner: CleanTypeRef): CleanTypeRef {
  return { kind: 'NON_NULL', name: null, ofType: inner };
}

function createList(inner: CleanTypeRef): CleanTypeRef {
  return { kind: 'LIST', name: null, ofType: inner };
}

// ============================================================================
// Test Fixtures - Sample Tables
// ============================================================================

/**
 * Simple User table with basic scalar fields
 */
const userTable = createTable({
  name: 'User',
  fields: [
    { name: 'id', type: fieldTypes.uuid },
    { name: 'email', type: fieldTypes.string },
    { name: 'name', type: fieldTypes.string },
    { name: 'age', type: fieldTypes.int },
    { name: 'isActive', type: fieldTypes.boolean },
    { name: 'createdAt', type: fieldTypes.datetime },
    { name: 'metadata', type: fieldTypes.json },
  ],
  query: {
    all: 'users',
    one: 'user',
    create: 'createUser',
    update: 'updateUser',
    delete: 'deleteUser',
  },
});

/**
 * Post table with belongsTo relation to User
 */
const postTable = createTable({
  name: 'Post',
  fields: [
    { name: 'id', type: fieldTypes.uuid },
    { name: 'title', type: fieldTypes.string },
    { name: 'content', type: fieldTypes.string },
    { name: 'authorId', type: fieldTypes.uuid },
    { name: 'publishedAt', type: fieldTypes.datetime },
    { name: 'tags', type: fieldTypes.stringArray },
  ],
  relations: {
    belongsTo: [
      {
        fieldName: 'author',
        isUnique: false,
        referencesTable: 'User',
        type: null,
        keys: [{ name: 'authorId', type: fieldTypes.uuid }],
      },
    ],
    hasOne: [],
    hasMany: [
      {
        fieldName: 'comments',
        isUnique: false,
        referencedByTable: 'Comment',
        type: null,
        keys: [],
      },
    ],
    manyToMany: [],
  },
  query: {
    all: 'posts',
    one: 'post',
    create: 'createPost',
    update: 'updatePost',
    delete: 'deletePost',
  },
});

/**
 * Comment table with relations
 */
const commentTable = createTable({
  name: 'Comment',
  fields: [
    { name: 'id', type: fieldTypes.uuid },
    { name: 'body', type: fieldTypes.string },
    { name: 'postId', type: fieldTypes.uuid },
    { name: 'authorId', type: fieldTypes.uuid },
    { name: 'createdAt', type: fieldTypes.datetime },
  ],
  relations: {
    belongsTo: [
      {
        fieldName: 'post',
        isUnique: false,
        referencesTable: 'Post',
        type: null,
        keys: [],
      },
      {
        fieldName: 'author',
        isUnique: false,
        referencesTable: 'User',
        type: null,
        keys: [],
      },
    ],
    hasOne: [],
    hasMany: [],
    manyToMany: [],
  },
  query: {
    all: 'comments',
    one: 'comment',
    create: 'createComment',
    update: 'updateComment',
    delete: 'deleteComment',
  },
});

/**
 * User table with hasMany to posts (update to include relation)
 */
const userTableWithRelations = createTable({
  ...userTable,
  relations: {
    belongsTo: [],
    hasOne: [],
    hasMany: [
      {
        fieldName: 'posts',
        isUnique: false,
        referencedByTable: 'Post',
        type: null,
        keys: [],
      },
      {
        fieldName: 'comments',
        isUnique: false,
        referencedByTable: 'Comment',
        type: null,
        keys: [],
      },
    ],
    manyToMany: [],
  },
});

/**
 * Category table with manyToMany relation
 */
const categoryTable = createTable({
  name: 'Category',
  fields: [
    { name: 'id', type: fieldTypes.uuid },
    { name: 'name', type: fieldTypes.string },
    { name: 'slug', type: fieldTypes.string },
  ],
  relations: {
    belongsTo: [],
    hasOne: [],
    hasMany: [],
    manyToMany: [
      {
        fieldName: 'posts',
        rightTable: 'Post',
        junctionTable: 'PostCategory',
        type: null,
      },
    ],
  },
  query: {
    all: 'categories',
    one: 'category',
    create: 'createCategory',
    update: 'updateCategory',
    delete: 'deleteCategory',
  },
});

/**
 * Profile table with hasOne relation
 */
const profileTable = createTable({
  name: 'Profile',
  fields: [
    { name: 'id', type: fieldTypes.uuid },
    { name: 'bio', type: fieldTypes.string },
    { name: 'userId', type: fieldTypes.uuid },
    { name: 'avatarUrl', type: fieldTypes.string },
  ],
  relations: {
    belongsTo: [
      {
        fieldName: 'user',
        isUnique: true,
        referencesTable: 'User',
        type: null,
        keys: [],
      },
    ],
    hasOne: [],
    hasMany: [],
    manyToMany: [],
  },
  query: {
    all: 'profiles',
    one: 'profile',
    create: 'createProfile',
    update: 'updateProfile',
    delete: 'deleteProfile',
  },
});

// User with hasOne to profile
const userTableWithProfile = createTable({
  ...userTable,
  relations: {
    belongsTo: [],
    hasOne: [
      {
        fieldName: 'profile',
        isUnique: true,
        referencedByTable: 'Profile',
        type: null,
        keys: [],
      },
    ],
    hasMany: [
      {
        fieldName: 'posts',
        isUnique: false,
        referencedByTable: 'Post',
        type: null,
        keys: [],
      },
    ],
    manyToMany: [],
  },
});

// ============================================================================
// Test Fixtures - Sample TypeRegistry (for custom operations)
// ============================================================================

const sampleTypeRegistry = createTypeRegistry({
  LoginInput: {
    kind: 'INPUT_OBJECT',
    name: 'LoginInput',
    inputFields: [
      { name: 'email', type: createNonNull(createTypeRef('SCALAR', 'String')) },
      { name: 'password', type: createNonNull(createTypeRef('SCALAR', 'String')) },
      { name: 'rememberMe', type: createTypeRef('SCALAR', 'Boolean') },
    ],
  },
  RegisterInput: {
    kind: 'INPUT_OBJECT',
    name: 'RegisterInput',
    inputFields: [
      { name: 'email', type: createNonNull(createTypeRef('SCALAR', 'String')) },
      { name: 'password', type: createNonNull(createTypeRef('SCALAR', 'String')) },
      { name: 'name', type: createTypeRef('SCALAR', 'String') },
    ],
  },
  UserRole: {
    kind: 'ENUM',
    name: 'UserRole',
    enumValues: ['ADMIN', 'USER', 'GUEST'],
  },
  LoginPayload: {
    kind: 'OBJECT',
    name: 'LoginPayload',
    fields: [
      { name: 'token', type: createTypeRef('SCALAR', 'String') },
      { name: 'user', type: createTypeRef('OBJECT', 'User') },
      { name: 'expiresAt', type: createTypeRef('SCALAR', 'Datetime') },
    ],
  },
});

// ============================================================================
// Tests - Full File Generation
// ============================================================================

describe('generateInputTypesFile', () => {
  it('generates complete types file for single table', () => {
    const result = generateInputTypesFile(new Map(), new Set(), [userTable]);
    expect(result.content).toMatchSnapshot();
  });

  it('generates complete types file for multiple tables with relations', () => {
    const tables = [userTableWithRelations, postTable, commentTable];
    const result = generateInputTypesFile(new Map(), new Set(), tables);
    expect(result.content).toMatchSnapshot();
  });

  it('generates types with hasOne relations', () => {
    const tables = [userTableWithProfile, profileTable];
    const result = generateInputTypesFile(new Map(), new Set(), tables);
    expect(result.content).toMatchSnapshot();
  });

  it('generates types with manyToMany relations', () => {
    const tables = [postTable, categoryTable];
    const result = generateInputTypesFile(new Map(), new Set(), tables);
    expect(result.content).toMatchSnapshot();
  });

  it('generates custom input types from TypeRegistry', () => {
    const usedInputTypes = new Set(['LoginInput', 'RegisterInput', 'UserRole']);
    const result = generateInputTypesFile(sampleTypeRegistry, usedInputTypes, [userTable]);
    expect(result.content).toMatchSnapshot();
  });

  it('generates payload types for custom operations', () => {
    const usedInputTypes = new Set(['LoginInput']);
    const usedPayloadTypes = new Set(['LoginPayload']);
    const result = generateInputTypesFile(sampleTypeRegistry, usedInputTypes, [userTable], usedPayloadTypes);
    expect(result.content).toMatchSnapshot();
  });

  it('handles empty tables array', () => {
    const result = generateInputTypesFile(new Map(), new Set());
    expect(result.content).toMatchSnapshot();
  });
});

// ============================================================================
// Tests - Scalar Filter Types
// ============================================================================

describe('scalar filter types', () => {
  it('includes all standard scalar filter interfaces', () => {
    const result = generateInputTypesFile(new Map(), new Set(), [userTable]);

    // String filters
    expect(result.content).toContain('export interface StringFilter {');
    expect(result.content).toContain('equalTo?: string;');
    expect(result.content).toContain('includes?: string;');
    expect(result.content).toContain('likeInsensitive?: string;');

    // Int filters
    expect(result.content).toContain('export interface IntFilter {');
    expect(result.content).toContain('lessThan?: number;');
    expect(result.content).toContain('greaterThanOrEqualTo?: number;');

    // UUID filters
    expect(result.content).toContain('export interface UUIDFilter {');

    // Datetime filters
    expect(result.content).toContain('export interface DatetimeFilter {');

    // JSON filters
    expect(result.content).toContain('export interface JSONFilter {');
    expect(result.content).toContain('containsKey?: string;');
    expect(result.content).toContain('containsAllKeys?: string[];');

    // Boolean filters
    expect(result.content).toContain('export interface BooleanFilter {');

    // BigInt filters
    expect(result.content).toContain('export interface BigIntFilter {');

    // Float filters
    expect(result.content).toContain('export interface FloatFilter {');
  });
});

// ============================================================================
// Tests - Entity Types
// ============================================================================

describe('entity types', () => {
  it('generates entity interface with correct field types', () => {
    const result = generateInputTypesFile(new Map(), new Set(), [userTable]);

    expect(result.content).toContain('export interface User {');
    expect(result.content).toContain('id: string;'); // UUID -> string
    expect(result.content).toContain('email?: string | null;');
    expect(result.content).toContain('age?: number | null;');
    expect(result.content).toContain('isActive?: boolean | null;');
    expect(result.content).toContain('metadata?: Record<string, unknown> | null;');
  });

  it('generates entity relations interface', () => {
    const result = generateInputTypesFile(new Map(), new Set(), [userTableWithRelations, postTable]);

    expect(result.content).toContain('export interface UserRelations {');
    expect(result.content).toContain('posts?: ConnectionResult<Post>;');
  });

  it('generates WithRelations type alias', () => {
    const result = generateInputTypesFile(new Map(), new Set(), [userTableWithRelations]);

    expect(result.content).toContain('export type UserWithRelations = User & UserRelations;');
  });
});

// ============================================================================
// Tests - Select Types
// ============================================================================

describe('entity select types', () => {
  it('generates select type with scalar fields', () => {
    const result = generateInputTypesFile(new Map(), new Set(), [userTable]);

    expect(result.content).toContain('export type UserSelect = {');
    expect(result.content).toContain('id?: boolean;');
    expect(result.content).toContain('email?: boolean;');
    expect(result.content).toContain('name?: boolean;');
  });

  it('generates select type with belongsTo relation options', () => {
    const result = generateInputTypesFile(new Map(), new Set(), [postTable, userTable]);

    expect(result.content).toContain('export type PostSelect = {');
    // Babel generates multi-line format for object types
    expect(result.content).toContain('author?: boolean | {');
    expect(result.content).toContain('select?: UserSelect;');
  });

  it('generates select type with hasMany relation options', () => {
    const result = generateInputTypesFile(new Map(), new Set(), [userTableWithRelations, postTable]);

    expect(result.content).toContain('posts?: boolean | {');
    expect(result.content).toContain('select?: PostSelect;');
    expect(result.content).toContain('first?: number;');
    expect(result.content).toContain('filter?: PostFilter;');
    expect(result.content).toContain('orderBy?: PostsOrderBy[];');
  });

  it('generates select type with manyToMany relation options', () => {
    const result = generateInputTypesFile(new Map(), new Set(), [categoryTable, postTable]);

    expect(result.content).toContain('export type CategorySelect = {');
    expect(result.content).toContain('posts?: boolean | {');
    expect(result.content).toContain('select?: PostSelect;');
  });
});

// ============================================================================
// Tests - Table Filter Types
// ============================================================================

describe('table filter types', () => {
  it('generates filter type for table', () => {
    const result = generateInputTypesFile(new Map(), new Set(), [userTable]);

    expect(result.content).toContain('export interface UserFilter {');
    expect(result.content).toContain('id?: UUIDFilter;');
    expect(result.content).toContain('email?: StringFilter;');
    expect(result.content).toContain('age?: IntFilter;');
    expect(result.content).toContain('isActive?: BooleanFilter;');
    expect(result.content).toContain('createdAt?: DatetimeFilter;');
    expect(result.content).toContain('metadata?: JSONFilter;');

    // Logical operators
    expect(result.content).toContain('and?: UserFilter[];');
    expect(result.content).toContain('or?: UserFilter[];');
    expect(result.content).toContain('not?: UserFilter;');
  });
});

// ============================================================================
// Tests - OrderBy Types
// ============================================================================

describe('orderBy types', () => {
  it('generates orderBy type for table', () => {
    const result = generateInputTypesFile(new Map(), new Set(), [userTable]);

    expect(result.content).toContain('export type UsersOrderBy =');
    // Babel generates double quotes for string literals
    expect(result.content).toContain('"PRIMARY_KEY_ASC"');
    expect(result.content).toContain('"PRIMARY_KEY_DESC"');
    expect(result.content).toContain('"NATURAL"');
    expect(result.content).toContain('"ID_ASC"');
    expect(result.content).toContain('"ID_DESC"');
    expect(result.content).toContain('"EMAIL_ASC"');
    expect(result.content).toContain('"NAME_DESC"');
  });
});

// ============================================================================
// Tests - CRUD Input Types
// ============================================================================

describe('CRUD input types', () => {
  it('generates create input type', () => {
    const result = generateInputTypesFile(new Map(), new Set(), [userTable]);

    expect(result.content).toContain('export interface CreateUserInput {');
    expect(result.content).toContain('clientMutationId?: string;');
    expect(result.content).toContain('user: {');
    expect(result.content).toContain('email?: string;');
    expect(result.content).toContain('name?: string;');
    // Should not include auto-generated fields
    expect(result.content).not.toMatch(/user:\s*\{[^}]*\bid\b/);
  });

  it('generates update input type with patch', () => {
    const result = generateInputTypesFile(new Map(), new Set(), [userTable]);

    expect(result.content).toContain('export interface UserPatch {');
    expect(result.content).toContain('email?: string | null;');
    expect(result.content).toContain('name?: string | null;');

    expect(result.content).toContain('export interface UpdateUserInput {');
    expect(result.content).toContain('id: string;');
    expect(result.content).toContain('patch: UserPatch;');
  });

  it('generates delete input type', () => {
    const result = generateInputTypesFile(new Map(), new Set(), [userTable]);

    expect(result.content).toContain('export interface DeleteUserInput {');
    expect(result.content).toContain('clientMutationId?: string;');
    expect(result.content).toContain('id: string;');
  });
});

// ============================================================================
// Tests - Custom Input Types (from TypeRegistry)
// ============================================================================

describe('custom input types', () => {
  it('generates input types from TypeRegistry', () => {
    const usedInputTypes = new Set(['LoginInput', 'RegisterInput']);
    const result = generateInputTypesFile(sampleTypeRegistry, usedInputTypes, []);

    expect(result.content).toContain('export interface LoginInput {');
    expect(result.content).toContain('email: string;'); // Non-null
    expect(result.content).toContain('password: string;'); // Non-null
    expect(result.content).toContain('rememberMe?: boolean;'); // Optional
  });

  it('generates enum types from TypeRegistry', () => {
    const usedInputTypes = new Set(['UserRole']);
    const result = generateInputTypesFile(sampleTypeRegistry, usedInputTypes, []);

    // Babel generates double quotes for string literals
    expect(result.content).toContain('export type UserRole = "ADMIN" | "USER" | "GUEST";');
  });
});

// ============================================================================
// Tests - Payload/Return Types
// ============================================================================

describe('payload types', () => {
  it('generates payload types for custom operations', () => {
    const usedInputTypes = new Set<string>();
    const usedPayloadTypes = new Set(['LoginPayload']);
    const result = generateInputTypesFile(sampleTypeRegistry, usedInputTypes, [], usedPayloadTypes);

    expect(result.content).toContain('export interface LoginPayload {');
    expect(result.content).toContain('token?: string | null;');
    expect(result.content).toContain('expiresAt?: string | null;');
  });

  it('generates Select types for payload types', () => {
    const usedInputTypes = new Set<string>();
    const usedPayloadTypes = new Set(['LoginPayload']);
    const result = generateInputTypesFile(sampleTypeRegistry, usedInputTypes, [], usedPayloadTypes);

    expect(result.content).toContain('export type LoginPayloadSelect = {');
    expect(result.content).toContain('token?: boolean;');
    expect(result.content).toContain('expiresAt?: boolean;');
  });
});

// ============================================================================
// Tests - Helper Functions
// ============================================================================

describe('collectInputTypeNames', () => {
  it('collects Input type names from operations', () => {
    const operations = [
      {
        args: [
          { name: 'input', type: createNonNull(createTypeRef('INPUT_OBJECT', 'LoginInput')) },
        ] as CleanArgument[],
      },
      {
        args: [
          { name: 'data', type: createTypeRef('INPUT_OBJECT', 'RegisterInput') },
        ] as CleanArgument[],
      },
    ];

    const result = collectInputTypeNames(operations);

    expect(result.has('LoginInput')).toBe(true);
    expect(result.has('RegisterInput')).toBe(true);
  });

  it('collects Filter type names', () => {
    const operations = [
      {
        args: [
          { name: 'filter', type: createTypeRef('INPUT_OBJECT', 'UserFilter') },
        ] as CleanArgument[],
      },
    ];

    const result = collectInputTypeNames(operations);

    expect(result.has('UserFilter')).toBe(true);
  });
});

describe('collectPayloadTypeNames', () => {
  it('collects Payload type names from operations', () => {
    const operations = [
      { returnType: createTypeRef('OBJECT', 'LoginPayload') },
      { returnType: createTypeRef('OBJECT', 'RegisterPayload') },
    ];

    const result = collectPayloadTypeNames(operations);

    expect(result.has('LoginPayload')).toBe(true);
    expect(result.has('RegisterPayload')).toBe(true);
  });

  it('excludes Connection types', () => {
    const operations = [
      { returnType: createTypeRef('OBJECT', 'UsersConnection') },
    ];

    const result = collectPayloadTypeNames(operations);

    expect(result.has('UsersConnection')).toBe(false);
  });
});

// ============================================================================
// Tests - Edge Cases
// ============================================================================

describe('edge cases', () => {
  it('handles table with no fields', () => {
    const emptyTable = createTable({ name: 'Empty', fields: [] });
    const result = generateInputTypesFile(new Map(), new Set(), [emptyTable]);

    expect(result.content).toContain('export interface Empty {');
    expect(result.content).toContain('export interface EmptyFilter {');
  });

  it('handles table with only id field', () => {
    const minimalTable = createTable({
      name: 'Minimal',
      fields: [{ name: 'id', type: fieldTypes.uuid }],
    });
    const result = generateInputTypesFile(new Map(), new Set(), [minimalTable]);

    expect(result.content).toContain('export interface Minimal {');
    expect(result.content).toContain('id: string;');
  });

  it('handles circular relations gracefully', () => {
    // User has posts, Post has author (User)
    const tables = [userTableWithRelations, postTable];
    const result = generateInputTypesFile(new Map(), new Set(), tables);

    // Should not cause infinite loops or errors
    expect(result.content).toContain('export type UserSelect = {');
    expect(result.content).toContain('export type PostSelect = {');
  });

  it('handles unknown input type gracefully', () => {
    const usedInputTypes = new Set(['UnknownType']);
    const result = generateInputTypesFile(new Map(), usedInputTypes, []);

    // Should generate a fallback type
    // Babel comment format may have slight differences
    expect(result.content).toContain("Type 'UnknownType' not found in schema");
    expect(result.content).toContain('export type UnknownType = Record<string, unknown>;');
  });
});
