/**
 * Tests for inferTablesFromIntrospection
 *
 * These tests verify that we can correctly infer CleanTable[] metadata
 * from standard GraphQL introspection (without _meta query).
 */
import { inferTablesFromIntrospection } from '../../core/introspect/infer-tables';
import type {
  IntrospectionEnumValue,
  IntrospectionField,
  IntrospectionInputValue,
  IntrospectionQueryResponse,
  IntrospectionType,
  IntrospectionTypeRef,
} from '../../types/introspection';

// ============================================================================
// Test Fixtures - Mock Introspection Data
// ============================================================================

/**
 * Helper to create a basic type reference
 */
function makeTypeRef(
  kind: 'SCALAR' | 'OBJECT' | 'INPUT_OBJECT' | 'ENUM' | 'LIST' | 'NON_NULL',
  name: string | null,
  ofType?: IntrospectionTypeRef | null,
): IntrospectionTypeRef {
  return { kind, name, ofType: ofType ?? null };
}

/**
 * Helper to create a non-null wrapper
 */
function nonNull(inner: IntrospectionTypeRef): IntrospectionTypeRef {
  return makeTypeRef('NON_NULL', null, inner);
}

/**
 * Helper to create a list wrapper
 */
function list(inner: IntrospectionTypeRef): IntrospectionTypeRef {
  return makeTypeRef('LIST', null, inner);
}

/**
 * Helper to create a scalar type
 */
function scalar(name: string): IntrospectionTypeRef {
  return makeTypeRef('SCALAR', name);
}

/**
 * Helper to create an object type
 */
function object(name: string): IntrospectionTypeRef {
  return makeTypeRef('OBJECT', name);
}

/**
 * Helper to create an input object type
 */
function inputObject(name: string): IntrospectionTypeRef {
  return makeTypeRef('INPUT_OBJECT', name);
}

interface FieldDef {
  name: string;
  type: IntrospectionTypeRef;
  args?: Array<{ name: string; type: IntrospectionTypeRef }>;
}

interface InputFieldDef {
  name: string;
  type: IntrospectionTypeRef;
}

interface TypeDef {
  name: string;
  kind: 'OBJECT' | 'INPUT_OBJECT' | 'SCALAR' | 'ENUM';
  fields?: FieldDef[];
  inputFields?: InputFieldDef[];
  enumValues?: string[];
}

/**
 * Create a minimal introspection response with the given types
 */
function createIntrospection(
  types: TypeDef[],
  queryFields: FieldDef[] = [],
  mutationFields: FieldDef[] = [],
): IntrospectionQueryResponse {
  const makeField = (f: FieldDef): IntrospectionField => ({
    name: f.name,
    type: f.type,
    args: (f.args ?? []).map(
      (a): IntrospectionInputValue => ({
        name: a.name,
        type: a.type,
        description: null,
        defaultValue: null,
      }),
    ),
    deprecationReason: null,
    description: null,
    isDeprecated: false,
  });

  const makeInputField = (f: InputFieldDef): IntrospectionInputValue => ({
    name: f.name,
    type: f.type,
    description: null,
    defaultValue: null,
  });

  // Add Query and Mutation types
  const allTypes: IntrospectionType[] = [
    {
      name: 'Query',
      kind: 'OBJECT',
      fields: queryFields.map(makeField),
      inputFields: null,
      enumValues: null,
      interfaces: [],
      possibleTypes: null,
      description: null,
    },
    ...(mutationFields.length > 0
      ? [
          {
            name: 'Mutation',
            kind: 'OBJECT' as const,
            fields: mutationFields.map(makeField),
            inputFields: null,
            enumValues: null,
            interfaces: [],
            possibleTypes: null,
            description: null,
          },
        ]
      : []),
    ...types.map(
      (t): IntrospectionType => ({
        name: t.name,
        kind: t.kind,
        fields: t.kind === 'OBJECT' ? (t.fields ?? []).map(makeField) : null,
        inputFields:
          t.kind === 'INPUT_OBJECT'
            ? (t.inputFields ?? []).map(makeInputField)
            : null,
        enumValues:
          t.kind === 'ENUM'
            ? (t.enumValues ?? []).map(
                (v): IntrospectionEnumValue => ({
                  name: v,
                  deprecationReason: null,
                  description: null,
                  isDeprecated: false,
                }),
              )
            : null,
        interfaces: [],
        possibleTypes: null,
        description: null,
      }),
    ),
  ];

  return {
    __schema: {
      queryType: { name: 'Query' },
      mutationType: mutationFields.length > 0 ? { name: 'Mutation' } : null,
      subscriptionType: null,
      types: allTypes,
      directives: [],
    },
  };
}

// ============================================================================
// Tests - Entity Detection
// ============================================================================

describe('Entity Detection', () => {
  it('detects entities from Connection types', () => {
    const introspection = createIntrospection(
      [
        // User entity type
        {
          name: 'User',
          kind: 'OBJECT',
          fields: [
            { name: 'id', type: nonNull(scalar('UUID')) },
            { name: 'email', type: scalar('String') },
          ],
        },
        // UsersConnection type (indicates User is an entity)
        {
          name: 'UsersConnection',
          kind: 'OBJECT',
          fields: [
            { name: 'nodes', type: list(object('User')) },
            { name: 'pageInfo', type: nonNull(object('PageInfo')) },
          ],
        },
        // PageInfo (builtin, should be ignored)
        { name: 'PageInfo', kind: 'OBJECT', fields: [] },
      ],
      [
        // Query for users
        { name: 'users', type: object('UsersConnection') },
      ],
    );

    const tables = inferTablesFromIntrospection(introspection);

    expect(tables).toHaveLength(1);
    expect(tables[0].name).toBe('User');
  });

  it('detects multiple entities', () => {
    const introspection = createIntrospection(
      [
        {
          name: 'User',
          kind: 'OBJECT',
          fields: [{ name: 'id', type: nonNull(scalar('UUID')) }],
        },
        { name: 'UsersConnection', kind: 'OBJECT', fields: [] },
        {
          name: 'Post',
          kind: 'OBJECT',
          fields: [{ name: 'id', type: nonNull(scalar('UUID')) }],
        },
        { name: 'PostsConnection', kind: 'OBJECT', fields: [] },
        {
          name: 'Comment',
          kind: 'OBJECT',
          fields: [{ name: 'id', type: nonNull(scalar('UUID')) }],
        },
        { name: 'CommentsConnection', kind: 'OBJECT', fields: [] },
      ],
      [
        { name: 'users', type: object('UsersConnection') },
        { name: 'posts', type: object('PostsConnection') },
        { name: 'comments', type: object('CommentsConnection') },
      ],
    );

    const tables = inferTablesFromIntrospection(introspection);
    const names = tables.map((t) => t.name).sort();

    expect(names).toEqual(['Comment', 'Post', 'User']);
  });

  it('ignores types without Connection', () => {
    const introspection = createIntrospection(
      [
        // Has Connection
        {
          name: 'User',
          kind: 'OBJECT',
          fields: [{ name: 'id', type: nonNull(scalar('UUID')) }],
        },
        { name: 'UsersConnection', kind: 'OBJECT', fields: [] },
        // Does not have Connection (should be ignored)
        {
          name: 'AuditLog',
          kind: 'OBJECT',
          fields: [{ name: 'id', type: nonNull(scalar('UUID')) }],
        },
      ],
      [{ name: 'users', type: object('UsersConnection') }],
    );

    const tables = inferTablesFromIntrospection(introspection);

    expect(tables).toHaveLength(1);
    expect(tables[0].name).toBe('User');
  });

  it('detects entities from singular Connection naming (v5 style)', () => {
    const introspection = createIntrospection(
      [
        {
          name: 'User',
          kind: 'OBJECT',
          fields: [{ name: 'id', type: nonNull(scalar('UUID')) }],
        },
        {
          name: 'UserConnection',
          kind: 'OBJECT',
          fields: [{ name: 'nodes', type: list(object('User')) }],
        },
      ],
      [{ name: 'users', type: object('UserConnection') }],
    );

    const tables = inferTablesFromIntrospection(introspection);

    expect(tables).toHaveLength(1);
    expect(tables[0].name).toBe('User');
    expect(tables[0].inflection?.connection).toBe('UserConnection');
  });
});

// ============================================================================
// Tests - Field Extraction
// ============================================================================

describe('Field Extraction', () => {
  it('extracts scalar fields', () => {
    const introspection = createIntrospection(
      [
        {
          name: 'User',
          kind: 'OBJECT',
          fields: [
            { name: 'id', type: nonNull(scalar('UUID')) },
            { name: 'email', type: scalar('String') },
            { name: 'age', type: scalar('Int') },
            { name: 'isActive', type: scalar('Boolean') },
            { name: 'metadata', type: scalar('JSON') },
          ],
        },
        { name: 'UsersConnection', kind: 'OBJECT', fields: [] },
      ],
      [{ name: 'users', type: object('UsersConnection') }],
    );

    const tables = inferTablesFromIntrospection(introspection);
    const fields = tables[0].fields;

    expect(fields).toHaveLength(5);
    expect(fields.map((f) => f.name)).toEqual([
      'id',
      'email',
      'age',
      'isActive',
      'metadata',
    ]);
    expect(fields.find((f) => f.name === 'id')?.type.gqlType).toBe('UUID');
    expect(fields.find((f) => f.name === 'email')?.type.gqlType).toBe('String');
  });

  it('extracts array fields', () => {
    const introspection = createIntrospection(
      [
        {
          name: 'Post',
          kind: 'OBJECT',
          fields: [
            { name: 'id', type: nonNull(scalar('UUID')) },
            { name: 'tags', type: list(scalar('String')) },
          ],
        },
        { name: 'PostsConnection', kind: 'OBJECT', fields: [] },
      ],
      [{ name: 'posts', type: object('PostsConnection') }],
    );

    const tables = inferTablesFromIntrospection(introspection);
    const tagsField = tables[0].fields.find((f) => f.name === 'tags');

    expect(tagsField).toBeDefined();
    expect(tagsField?.type.isArray).toBe(true);
    expect(tagsField?.type.gqlType).toBe('String');
  });

  it('excludes relation fields', () => {
    const introspection = createIntrospection(
      [
        {
          name: 'Post',
          kind: 'OBJECT',
          fields: [
            { name: 'id', type: nonNull(scalar('UUID')) },
            { name: 'title', type: scalar('String') },
            { name: 'author', type: object('User') }, // belongsTo relation
            { name: 'comments', type: object('CommentsConnection') }, // hasMany relation
          ],
        },
        { name: 'PostsConnection', kind: 'OBJECT', fields: [] },
        {
          name: 'User',
          kind: 'OBJECT',
          fields: [{ name: 'id', type: nonNull(scalar('UUID')) }],
        },
        { name: 'UsersConnection', kind: 'OBJECT', fields: [] },
        {
          name: 'Comment',
          kind: 'OBJECT',
          fields: [{ name: 'id', type: nonNull(scalar('UUID')) }],
        },
        { name: 'CommentsConnection', kind: 'OBJECT', fields: [] },
      ],
      [
        { name: 'posts', type: object('PostsConnection') },
        { name: 'users', type: object('UsersConnection') },
        { name: 'comments', type: object('CommentsConnection') },
      ],
    );

    const tables = inferTablesFromIntrospection(introspection);
    const postTable = tables.find((t) => t.name === 'Post');
    const fieldNames = postTable?.fields.map((f) => f.name);

    expect(fieldNames).toContain('id');
    expect(fieldNames).toContain('title');
    expect(fieldNames).not.toContain('author'); // Excluded: belongsTo
    expect(fieldNames).not.toContain('comments'); // Excluded: hasMany
  });
});

// ============================================================================
// Tests - Relation Inference
// ============================================================================

describe('Relation Inference', () => {
  it('infers belongsTo relations', () => {
    const introspection = createIntrospection(
      [
        {
          name: 'Post',
          kind: 'OBJECT',
          fields: [
            { name: 'id', type: nonNull(scalar('UUID')) },
            { name: 'author', type: object('User') },
          ],
        },
        { name: 'PostsConnection', kind: 'OBJECT', fields: [] },
        {
          name: 'User',
          kind: 'OBJECT',
          fields: [{ name: 'id', type: nonNull(scalar('UUID')) }],
        },
        { name: 'UsersConnection', kind: 'OBJECT', fields: [] },
      ],
      [
        { name: 'posts', type: object('PostsConnection') },
        { name: 'users', type: object('UsersConnection') },
      ],
    );

    const tables = inferTablesFromIntrospection(introspection);
    const postTable = tables.find((t) => t.name === 'Post');

    expect(postTable?.relations.belongsTo).toHaveLength(1);
    expect(postTable?.relations.belongsTo[0].fieldName).toBe('author');
    expect(postTable?.relations.belongsTo[0].referencesTable).toBe('User');
  });

  it('infers hasMany relations', () => {
    const introspection = createIntrospection(
      [
        {
          name: 'User',
          kind: 'OBJECT',
          fields: [
            { name: 'id', type: nonNull(scalar('UUID')) },
            { name: 'posts', type: object('PostsConnection') },
          ],
        },
        { name: 'UsersConnection', kind: 'OBJECT', fields: [] },
        {
          name: 'Post',
          kind: 'OBJECT',
          fields: [{ name: 'id', type: nonNull(scalar('UUID')) }],
        },
        { name: 'PostsConnection', kind: 'OBJECT', fields: [] },
      ],
      [
        { name: 'users', type: object('UsersConnection') },
        { name: 'posts', type: object('PostsConnection') },
      ],
    );

    const tables = inferTablesFromIntrospection(introspection);
    const userTable = tables.find((t) => t.name === 'User');

    expect(userTable?.relations.hasMany).toHaveLength(1);
    expect(userTable?.relations.hasMany[0].fieldName).toBe('posts');
    expect(userTable?.relations.hasMany[0].referencedByTable).toBe('Post');
  });

  it('infers manyToMany relations from naming pattern', () => {
    const introspection = createIntrospection(
      [
        {
          name: 'Category',
          kind: 'OBJECT',
          fields: [
            { name: 'id', type: nonNull(scalar('UUID')) },
            // ManyToMany pattern: {entities}By{JunctionTable}{Keys}
            {
              name: 'productsByProductCategoryProductIdAndCategoryId',
              type: object('ProductsConnection'),
            },
          ],
        },
        { name: 'CategoriesConnection', kind: 'OBJECT', fields: [] },
        {
          name: 'Product',
          kind: 'OBJECT',
          fields: [{ name: 'id', type: nonNull(scalar('UUID')) }],
        },
        { name: 'ProductsConnection', kind: 'OBJECT', fields: [] },
      ],
      [
        { name: 'categories', type: object('CategoriesConnection') },
        { name: 'products', type: object('ProductsConnection') },
      ],
    );

    const tables = inferTablesFromIntrospection(introspection);
    const categoryTable = tables.find((t) => t.name === 'Category');

    expect(categoryTable?.relations.manyToMany).toHaveLength(1);
    expect(categoryTable?.relations.manyToMany[0].rightTable).toBe('Product');
    expect(categoryTable?.relations.manyToMany[0].junctionTable).toBe(
      'ProductCategory',
    );
  });

  it('infers relations when connections use singular names', () => {
    const introspection = createIntrospection(
      [
        {
          name: 'Database',
          kind: 'OBJECT',
          fields: [
            { name: 'id', type: nonNull(scalar('UUID')) },
            { name: 'owner', type: object('User') },
          ],
        },
        {
          name: 'DatabaseConnection',
          kind: 'OBJECT',
          fields: [{ name: 'nodes', type: list(object('Database')) }],
        },
        {
          name: 'User',
          kind: 'OBJECT',
          fields: [
            { name: 'id', type: nonNull(scalar('UUID')) },
            { name: 'databases', type: object('DatabaseConnection') },
          ],
        },
        {
          name: 'UserConnection',
          kind: 'OBJECT',
          fields: [{ name: 'nodes', type: list(object('User')) }],
        },
      ],
      [
        { name: 'databases', type: object('DatabaseConnection') },
        { name: 'users', type: object('UserConnection') },
      ],
    );

    const tables = inferTablesFromIntrospection(introspection);
    const databaseTable = tables.find((t) => t.name === 'Database');
    const userTable = tables.find((t) => t.name === 'User');

    expect(databaseTable?.relations.belongsTo).toHaveLength(1);
    expect(databaseTable?.relations.belongsTo[0].fieldName).toBe('owner');
    expect(databaseTable?.relations.belongsTo[0].referencesTable).toBe('User');
    expect(userTable?.relations.hasMany).toHaveLength(1);
    expect(userTable?.relations.hasMany[0].fieldName).toBe('databases');
    expect(userTable?.relations.hasMany[0].referencedByTable).toBe('Database');
  });
});

// ============================================================================
// Tests - Operation Matching
// ============================================================================

describe('Query Operation Matching', () => {
  it('matches list query by Connection return type', () => {
    const introspection = createIntrospection(
      [
        {
          name: 'User',
          kind: 'OBJECT',
          fields: [{ name: 'id', type: nonNull(scalar('UUID')) }],
        },
        { name: 'UsersConnection', kind: 'OBJECT', fields: [] },
      ],
      [{ name: 'allUsers', type: object('UsersConnection') }],
    );

    const tables = inferTablesFromIntrospection(introspection);

    expect(tables[0].query?.all).toBe('allUsers');
  });

  it('matches single query by return type and id arg', () => {
    const introspection = createIntrospection(
      [
        {
          name: 'User',
          kind: 'OBJECT',
          fields: [{ name: 'id', type: nonNull(scalar('UUID')) }],
        },
        { name: 'UsersConnection', kind: 'OBJECT', fields: [] },
      ],
      [
        { name: 'users', type: object('UsersConnection') },
        {
          name: 'user',
          type: object('User'),
          args: [{ name: 'id', type: nonNull(scalar('UUID')) }],
        },
      ],
    );

    const tables = inferTablesFromIntrospection(introspection);

    expect(tables[0].query?.one).toBe('user');
  });

  it('handles missing query operations gracefully', () => {
    const introspection = createIntrospection(
      [
        {
          name: 'User',
          kind: 'OBJECT',
          fields: [{ name: 'id', type: nonNull(scalar('UUID')) }],
        },
        { name: 'UsersConnection', kind: 'OBJECT', fields: [] },
      ],
      [
        { name: 'users', type: object('UsersConnection') },
        // No single user query
      ],
    );

    const tables = inferTablesFromIntrospection(introspection);

    expect(tables[0].query?.all).toBe('users');
    // Should remain null when no single-row lookup exists in schema
    expect(tables[0].query?.one).toBeNull();
  });

  it('matches list query when using singular connection type names', () => {
    const introspection = createIntrospection(
      [
        {
          name: 'User',
          kind: 'OBJECT',
          fields: [{ name: 'id', type: nonNull(scalar('UUID')) }],
        },
        {
          name: 'UserConnection',
          kind: 'OBJECT',
          fields: [{ name: 'nodes', type: list(object('User')) }],
        },
      ],
      [{ name: 'allUsers', type: object('UserConnection') }],
    );

    const tables = inferTablesFromIntrospection(introspection);

    expect(tables[0].query?.all).toBe('allUsers');
    expect(tables[0].inflection?.connection).toBe('UserConnection');
  });
});

describe('Mutation Operation Matching', () => {
  it('matches create mutation', () => {
    const introspection = createIntrospection(
      [
        {
          name: 'User',
          kind: 'OBJECT',
          fields: [{ name: 'id', type: nonNull(scalar('UUID')) }],
        },
        { name: 'UsersConnection', kind: 'OBJECT', fields: [] },
        { name: 'CreateUserPayload', kind: 'OBJECT', fields: [] },
      ],
      [{ name: 'users', type: object('UsersConnection') }],
      [
        {
          name: 'createUser',
          type: object('CreateUserPayload'),
          args: [
            { name: 'input', type: nonNull(inputObject('CreateUserInput')) },
          ],
        },
      ],
    );

    const tables = inferTablesFromIntrospection(introspection);

    expect(tables[0].query?.create).toBe('createUser');
  });

  it('matches update and delete mutations', () => {
    const introspection = createIntrospection(
      [
        {
          name: 'User',
          kind: 'OBJECT',
          fields: [{ name: 'id', type: nonNull(scalar('UUID')) }],
        },
        { name: 'UsersConnection', kind: 'OBJECT', fields: [] },
        { name: 'UpdateUserPayload', kind: 'OBJECT', fields: [] },
        { name: 'DeleteUserPayload', kind: 'OBJECT', fields: [] },
      ],
      [{ name: 'users', type: object('UsersConnection') }],
      [
        {
          name: 'updateUser',
          type: object('UpdateUserPayload'),
          args: [
            { name: 'input', type: nonNull(inputObject('UpdateUserInput')) },
          ],
        },
        {
          name: 'deleteUser',
          type: object('DeleteUserPayload'),
          args: [
            { name: 'input', type: nonNull(inputObject('DeleteUserInput')) },
          ],
        },
      ],
    );

    const tables = inferTablesFromIntrospection(introspection);

    expect(tables[0].query?.update).toBe('updateUser');
    expect(tables[0].query?.delete).toBe('deleteUser');
  });

  it('prefers non-ById mutations over ById variants', () => {
    const introspection = createIntrospection(
      [
        {
          name: 'User',
          kind: 'OBJECT',
          fields: [{ name: 'id', type: nonNull(scalar('UUID')) }],
        },
        { name: 'UsersConnection', kind: 'OBJECT', fields: [] },
        { name: 'UpdateUserPayload', kind: 'OBJECT', fields: [] },
      ],
      [{ name: 'users', type: object('UsersConnection') }],
      [
        { name: 'updateUserById', type: object('UpdateUserPayload') },
        { name: 'updateUser', type: object('UpdateUserPayload') },
      ],
    );

    const tables = inferTablesFromIntrospection(introspection);

    expect(tables[0].query?.update).toBe('updateUser');
  });
});

// ============================================================================
// Tests - Constraint Inference
// ============================================================================

describe('Constraint Inference', () => {
  it('infers primary key from entity id field', () => {
    const introspection = createIntrospection(
      [
        {
          name: 'User',
          kind: 'OBJECT',
          fields: [{ name: 'id', type: nonNull(scalar('UUID')) }],
        },
        { name: 'UsersConnection', kind: 'OBJECT', fields: [] },
      ],
      [{ name: 'users', type: object('UsersConnection') }],
    );

    const tables = inferTablesFromIntrospection(introspection);

    expect(tables[0].constraints?.primaryKey).toHaveLength(1);
    expect(tables[0].constraints?.primaryKey[0].fields[0].name).toBe('id');
  });

  it('infers primary key from Update/Delete input type', () => {
    const introspection = createIntrospection(
      [
        {
          name: 'User',
          kind: 'OBJECT',
          fields: [{ name: 'userId', type: nonNull(scalar('UUID')) }],
        },
        { name: 'UsersConnection', kind: 'OBJECT', fields: [] },
        {
          name: 'UpdateUserInput',
          kind: 'INPUT_OBJECT',
          inputFields: [{ name: 'id', type: nonNull(scalar('UUID')) }],
        },
      ],
      [{ name: 'users', type: object('UsersConnection') }],
      [{ name: 'updateUser', type: object('UpdateUserPayload') }],
    );

    const tables = inferTablesFromIntrospection(introspection);

    expect(tables[0].constraints?.primaryKey).toHaveLength(1);
    expect(tables[0].constraints?.primaryKey[0].fields[0].name).toBe('id');
  });

  it('infers lookup key from update input when entity has no id field', () => {
    const introspection = createIntrospection(
      [
        {
          name: 'NodeTypeRegistry',
          kind: 'OBJECT',
          fields: [
            { name: 'name', type: nonNull(scalar('String')) },
            { name: 'slug', type: nonNull(scalar('String')) },
          ],
        },
        { name: 'NodeTypeRegistriesConnection', kind: 'OBJECT', fields: [] },
        {
          name: 'UpdateNodeTypeRegistryInput',
          kind: 'INPUT_OBJECT',
          inputFields: [
            { name: 'name', type: nonNull(scalar('String')) },
            {
              name: 'nodeTypeRegistryPatch',
              type: nonNull(inputObject('NodeTypeRegistryPatch')),
            },
          ],
        },
      ],
      [{ name: 'nodeTypeRegistries', type: object('NodeTypeRegistriesConnection') }],
      [{ name: 'updateNodeTypeRegistry', type: object('UpdateNodeTypeRegistryPayload') }],
    );

    const tables = inferTablesFromIntrospection(introspection);

    expect(tables[0].constraints?.primaryKey).toHaveLength(1);
    expect(tables[0].constraints?.primaryKey[0].fields[0].name).toBe('name');
  });

  it('infers lookup key from delete input when update input is not present', () => {
    const introspection = createIntrospection(
      [
        {
          name: 'InviteCode',
          kind: 'OBJECT',
          fields: [{ name: 'code', type: nonNull(scalar('String')) }],
        },
        { name: 'InviteCodesConnection', kind: 'OBJECT', fields: [] },
        {
          name: 'DeleteInviteCodeInput',
          kind: 'INPUT_OBJECT',
          inputFields: [{ name: 'code', type: nonNull(scalar('String')) }],
        },
      ],
      [{ name: 'inviteCodes', type: object('InviteCodesConnection') }],
      [{ name: 'deleteInviteCode', type: object('DeleteInviteCodePayload') }],
    );

    const tables = inferTablesFromIntrospection(introspection);

    expect(tables[0].constraints?.primaryKey).toHaveLength(1);
    expect(tables[0].constraints?.primaryKey[0].fields[0].name).toBe('code');
  });
});

// ============================================================================
// Tests - Inflection Building
// ============================================================================

describe('Inflection Building', () => {
  it('builds correct inflection names', () => {
    const introspection = createIntrospection(
      [
        {
          name: 'User',
          kind: 'OBJECT',
          fields: [{ name: 'id', type: nonNull(scalar('UUID')) }],
        },
        { name: 'UsersConnection', kind: 'OBJECT', fields: [] },
        { name: 'UserFilter', kind: 'INPUT_OBJECT', inputFields: [] },
        { name: 'UserPatch', kind: 'INPUT_OBJECT', inputFields: [] },
        { name: 'UpdateUserPayload', kind: 'OBJECT', fields: [] },
      ],
      [{ name: 'users', type: object('UsersConnection') }],
    );

    const tables = inferTablesFromIntrospection(introspection);
    const inflection = tables[0].inflection;

    expect(inflection?.connection).toBe('UsersConnection');
    expect(inflection?.filterType).toBe('UserFilter');
    expect(inflection?.patchType).toBe('UserPatch');
    expect(inflection?.updatePayloadType).toBe('UpdateUserPayload');
    expect(inflection?.tableType).toBe('User');
    expect(inflection?.allRows).toBe('users');
  });

  it('handles missing optional types', () => {
    const introspection = createIntrospection(
      [
        {
          name: 'User',
          kind: 'OBJECT',
          fields: [{ name: 'id', type: nonNull(scalar('UUID')) }],
        },
        { name: 'UsersConnection', kind: 'OBJECT', fields: [] },
        // No UserFilter, UserPatch, or UpdateUserPayload
      ],
      [{ name: 'users', type: object('UsersConnection') }],
    );

    const tables = inferTablesFromIntrospection(introspection);
    const inflection = tables[0].inflection;

    expect(inflection?.filterType).toBeNull();
    expect(inflection?.patchType).toBeNull();
    expect(inflection?.updatePayloadType).toBeNull();
  });
});

// ============================================================================
// Tests - Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  it('handles schema with no entities', () => {
    const introspection = createIntrospection(
      [
        // Only built-in types, no entities
        { name: 'PageInfo', kind: 'OBJECT', fields: [] },
      ],
      [],
    );

    const tables = inferTablesFromIntrospection(introspection);

    expect(tables).toHaveLength(0);
  });

  it('handles entity with no operations (should be excluded)', () => {
    const introspection = createIntrospection(
      [
        // Entity type exists but no queries/mutations
        {
          name: 'Orphan',
          kind: 'OBJECT',
          fields: [{ name: 'id', type: nonNull(scalar('UUID')) }],
        },
        { name: 'OrphansConnection', kind: 'OBJECT', fields: [] },
      ],
      [], // No query fields
    );

    const tables = inferTablesFromIntrospection(introspection);

    // Orphan should be excluded since it has no operations
    expect(tables).toHaveLength(0);
  });

  it('handles circular relations', () => {
    const introspection = createIntrospection(
      [
        {
          name: 'User',
          kind: 'OBJECT',
          fields: [
            { name: 'id', type: nonNull(scalar('UUID')) },
            { name: 'posts', type: object('PostsConnection') },
          ],
        },
        { name: 'UsersConnection', kind: 'OBJECT', fields: [] },
        {
          name: 'Post',
          kind: 'OBJECT',
          fields: [
            { name: 'id', type: nonNull(scalar('UUID')) },
            { name: 'author', type: object('User') },
          ],
        },
        { name: 'PostsConnection', kind: 'OBJECT', fields: [] },
      ],
      [
        { name: 'users', type: object('UsersConnection') },
        { name: 'posts', type: object('PostsConnection') },
      ],
    );

    // Should not cause infinite loops
    const tables = inferTablesFromIntrospection(introspection);

    expect(tables).toHaveLength(2);

    const userTable = tables.find((t) => t.name === 'User');
    const postTable = tables.find((t) => t.name === 'Post');

    expect(userTable?.relations.hasMany).toHaveLength(1);
    expect(postTable?.relations.belongsTo).toHaveLength(1);
  });

  it('handles irregular pluralization', () => {
    const introspection = createIntrospection(
      [
        {
          name: 'Person',
          kind: 'OBJECT',
          fields: [{ name: 'id', type: nonNull(scalar('UUID')) }],
        },
        { name: 'PeopleConnection', kind: 'OBJECT', fields: [] },
      ],
      [{ name: 'people', type: object('PeopleConnection') }],
    );

    const tables = inferTablesFromIntrospection(introspection);

    expect(tables).toHaveLength(1);
    expect(tables[0].name).toBe('Person');
    expect(tables[0].query?.all).toBe('people');
  });

  it('generates correct OrderBy type for Address (not Addresss)', () => {
    const introspection = createIntrospection(
      [
        {
          name: 'Address',
          kind: 'OBJECT',
          fields: [
            { name: 'id', type: nonNull(scalar('UUID')) },
            { name: 'street', type: scalar('String') },
            { name: 'city', type: scalar('String') },
          ],
        },
        { name: 'AddressesConnection', kind: 'OBJECT', fields: [] },
        {
          name: 'AddressesOrderBy',
          kind: 'ENUM',
          enumValues: ['ID_ASC', 'ID_DESC'],
        },
      ],
      [{ name: 'addresses', type: object('AddressesConnection') }],
    );

    const tables = inferTablesFromIntrospection(introspection);

    expect(tables).toHaveLength(1);
    expect(tables[0].name).toBe('Address');
    // Should be "AddressesOrderBy" (correct), NOT "AddresssOrderBy" (wrong - triple 's')
    expect(tables[0].inflection?.orderByType).toBe('AddressesOrderBy');
    expect(tables[0].inflection?.connection).toBe('AddressesConnection');
  });

  it('generates correct OrderBy type for Category (not Categorys)', () => {
    const introspection = createIntrospection(
      [
        {
          name: 'Category',
          kind: 'OBJECT',
          fields: [{ name: 'id', type: nonNull(scalar('UUID')) }],
        },
        { name: 'CategoriesConnection', kind: 'OBJECT', fields: [] },
        { name: 'CategoriesOrderBy', kind: 'ENUM', enumValues: ['ID_ASC'] },
      ],
      [{ name: 'categories', type: object('CategoriesConnection') }],
    );

    const tables = inferTablesFromIntrospection(introspection);

    expect(tables).toHaveLength(1);
    expect(tables[0].inflection?.orderByType).toBe('CategoriesOrderBy');
  });

  it('detects actual OrderBy type from schema even with custom naming', () => {
    const introspection = createIntrospection(
      [
        {
          name: 'Status',
          kind: 'OBJECT',
          fields: [{ name: 'id', type: nonNull(scalar('UUID')) }],
        },
        { name: 'StatusesConnection', kind: 'OBJECT', fields: [] },
        // Schema has the actual OrderBy enum
        { name: 'StatusesOrderBy', kind: 'ENUM', enumValues: ['ID_ASC'] },
      ],
      [{ name: 'statuses', type: object('StatusesConnection') }],
    );

    const tables = inferTablesFromIntrospection(introspection);

    expect(tables).toHaveLength(1);
    // Should detect the actual type from schema
    expect(tables[0].inflection?.orderByType).toBe('StatusesOrderBy');
  });
});
