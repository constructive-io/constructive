/**
 * Snapshot tests for ORM model-generator.ts
 *
 * Tests the generated model classes with findMany, findFirst, create, update, delete methods.
 */
import { generateModelFile } from '../../core/codegen/orm/model-generator';
import type {
  CleanFieldType,
  CleanRelations,
  CleanTable,
} from '../../types/schema';

// ============================================================================
// Test Fixtures
// ============================================================================

const fieldTypes = {
  uuid: { gqlType: 'UUID', isArray: false } as CleanFieldType,
  string: { gqlType: 'String', isArray: false } as CleanFieldType,
  int: { gqlType: 'Int', isArray: false } as CleanFieldType,
  boolean: { gqlType: 'Boolean', isArray: false } as CleanFieldType,
  datetime: { gqlType: 'Datetime', isArray: false } as CleanFieldType,
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

// ============================================================================
// Tests
// ============================================================================

describe('model-generator', () => {
  it('generates model with all CRUD methods', () => {
    const table = createTable({
      name: 'User',
      fields: [
        { name: 'id', type: fieldTypes.uuid },
        { name: 'email', type: fieldTypes.string },
        { name: 'name', type: fieldTypes.string },
        { name: 'isActive', type: fieldTypes.boolean },
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

    const result = generateModelFile(table, false);

    expect(result.fileName).toBe('user.ts');
    expect(result.modelName).toBe('UserModel');
    expect(result.content).toMatchSnapshot();
  });

  it('generates model without update/delete when not available', () => {
    const table = createTable({
      name: 'AuditLog',
      fields: [
        { name: 'id', type: fieldTypes.uuid },
        { name: 'action', type: fieldTypes.string },
        { name: 'timestamp', type: fieldTypes.datetime },
      ],
      query: {
        all: 'auditLogs',
        one: 'auditLog',
        create: 'createAuditLog',
        update: undefined,
        delete: undefined,
      },
    });

    const result = generateModelFile(table, false);

    expect(result.content).toMatchSnapshot();
    expect(result.content).toContain('findMany');
    expect(result.content).toContain('findFirst');
    expect(result.content).toContain('create');
    expect(result.content).not.toContain('update(');
    expect(result.content).not.toContain('delete(');
  });

  it('handles custom query/mutation names', () => {
    const table = createTable({
      name: 'Organization',
      fields: [
        { name: 'id', type: fieldTypes.uuid },
        { name: 'name', type: fieldTypes.string },
      ],
      query: {
        all: 'allOrganizations',
        one: 'organizationById',
        create: 'registerOrganization',
        update: 'modifyOrganization',
        delete: 'removeOrganization',
      },
    });

    const result = generateModelFile(table, false);

    expect(result.content).toMatchSnapshot();
    expect(result.content).toContain('"allOrganizations"');
    expect(result.content).toContain('"registerOrganization"');
    expect(result.content).toContain('"modifyOrganization"');
    expect(result.content).toContain('"removeOrganization"');
  });

  it('generates findOne via collection query when single lookup is unavailable', () => {
    const table = createTable({
      name: 'Account',
      fields: [
        { name: 'id', type: fieldTypes.uuid },
        { name: 'name', type: fieldTypes.string },
      ],
      query: {
        all: 'accounts',
        one: null,
        create: 'createAccount',
        update: 'updateAccount',
        delete: 'deleteAccount',
      },
    });

    const result = generateModelFile(table, false);

    expect(result.content).toContain('findOne<S extends AccountSelect>(');
    expect(result.content).toContain(
      'buildFindManyDocument("Account", "accounts", args.select',
    );
    expect(result.content).toContain('"account": data.accounts?.nodes?.[0] ?? null');
  });

  it('generates findOne via collection fallback for all entities when no single query fields exist', () => {
    // Simulates NoUniqueLookupPreset: query.one is null for every entity
    const tables = [
      createTable({
        name: 'User',
        fields: [
          { name: 'id', type: fieldTypes.uuid },
          { name: 'email', type: fieldTypes.string },
        ],
        query: {
          all: 'users',
          one: null,
          create: 'createUser',
          update: 'updateUser',
          delete: 'deleteUser',
        },
      }),
      createTable({
        name: 'Post',
        fields: [
          { name: 'id', type: fieldTypes.uuid },
          { name: 'title', type: fieldTypes.string },
        ],
        query: {
          all: 'posts',
          one: null,
          create: 'createPost',
          update: 'updatePost',
          delete: 'deletePost',
        },
      }),
    ];

    for (const table of tables) {
      const result = generateModelFile(table, false);
      const lcName = table.name.charAt(0).toLowerCase() + table.name.slice(1);

      // Should use collection fallback for findOne
      expect(result.content).toContain(`findOne<S extends ${table.name}Select>(`);
      expect(result.content).toContain(
        `buildFindManyDocument("${table.name}", "${table.query!.all}", args.select`,
      );
      // findOne should use transform pattern (collection → single result)
      expect(result.content).toContain(
        `"${lcName}": data.${table.query!.all}?.nodes?.[0] ?? null`,
      );
    }
  });

  it('generates correct type imports', () => {
    const table = createTable({
      name: 'Product',
      fields: [
        { name: 'id', type: fieldTypes.uuid },
        { name: 'name', type: fieldTypes.string },
        { name: 'price', type: fieldTypes.int },
      ],
      query: {
        all: 'products',
        one: 'product',
        create: 'createProduct',
        update: 'updateProduct',
        delete: 'deleteProduct',
      },
    });

    const result = generateModelFile(table, false);

    // Check imports
    expect(result.content).toContain('from "../client"');
    expect(result.content).toContain('from "../query-builder"');
    expect(result.content).toContain('from "../select-types"');
    expect(result.content).toContain('from "../input-types"');

    // Check type references
    expect(result.content).toContain('ProductSelect');
    expect(result.content).toContain('ProductFilter');
    expect(result.content).toContain('ProductsOrderBy');
    expect(result.content).toContain('CreateProductInput');
    expect(result.content).toContain('UpdateProductInput');
    expect(result.content).toContain('ProductPatch');
  });

  // ============================================================================
  // M:N Junction Methods
  // ============================================================================

  it('generates add/remove junction methods for M:N relations', () => {
    const postTable = createTable({
      name: 'Post',
      fields: [
        { name: 'id', type: fieldTypes.uuid },
        { name: 'title', type: fieldTypes.string },
      ],
      relations: {
        ...emptyRelations,
        manyToMany: [
          {
            fieldName: 'tags',
            rightTable: 'Tag',
            junctionTable: 'PostTag',
            type: 'PostTagsManyToManyConnection',
            junctionLeftKeys: [{ name: 'postId', type: fieldTypes.uuid }],
            junctionRightKeys: [{ name: 'tagId', type: fieldTypes.uuid }],
          },
        ],
      },
      query: {
        all: 'posts',
        one: 'post',
        create: 'createPost',
        update: 'updatePost',
        delete: 'deletePost',
      },
    });

    const tagTable = createTable({
      name: 'Tag',
      fields: [
        { name: 'id', type: fieldTypes.uuid },
        { name: 'name', type: fieldTypes.string },
      ],
      query: {
        all: 'tags',
        one: 'tag',
        create: 'createTag',
        update: 'updateTag',
        delete: 'deleteTag',
      },
    });

    const postTagTable = createTable({
      name: 'PostTag',
      fields: [
        { name: 'postId', type: fieldTypes.uuid },
        { name: 'tagId', type: fieldTypes.uuid },
      ],
      relations: {
        ...emptyRelations,
        belongsTo: [
          {
            fieldName: 'post',
            isUnique: false,
            referencesTable: 'Post',
            type: null,
            keys: [{ name: 'postId', type: fieldTypes.uuid }],
          },
          {
            fieldName: 'tag',
            isUnique: false,
            referencesTable: 'Tag',
            type: null,
            keys: [{ name: 'tagId', type: fieldTypes.uuid }],
          },
        ],
      },
      query: {
        all: 'postTags',
        one: null,
        create: 'createPostTag',
        update: null,
        delete: 'deletePostTag',
      },
    });

    const allTables = [postTable, tagTable, postTagTable];
    const result = generateModelFile(postTable, false, { allTables });

    expect(result.content).toMatchSnapshot();

    // add method
    expect(result.content).toContain('addTag(postId: string, tagId: string)');
    expect(result.content).toContain('buildCreateDocument("PostTag", "createPostTag"');

    // remove method
    expect(result.content).toContain('removeTag(postId: string, tagId: string)');
    expect(result.content).toContain('buildDeleteByCompositePkDocument("PostTag", "deletePostTag"');

    // no set method (removed — consumers compose add/remove themselves)
    expect(result.content).not.toContain('setTags');
  });

  it('generates junction methods with extra fields (data param)', () => {
    const postTable = createTable({
      name: 'Post',
      fields: [
        { name: 'id', type: fieldTypes.uuid },
        { name: 'title', type: fieldTypes.string },
      ],
      relations: {
        ...emptyRelations,
        manyToMany: [
          {
            fieldName: 'tags',
            rightTable: 'Tag',
            junctionTable: 'PostTag',
            type: null,
            junctionLeftKeys: [{ name: 'postId', type: fieldTypes.uuid }],
            junctionRightKeys: [{ name: 'tagId', type: fieldTypes.uuid }],
          },
        ],
      },
      query: {
        all: 'posts',
        one: 'post',
        create: 'createPost',
        update: 'updatePost',
        delete: 'deletePost',
      },
    });

    const tagTable = createTable({
      name: 'Tag',
      fields: [{ name: 'id', type: fieldTypes.uuid }],
      query: { all: 'tags', one: 'tag', create: 'createTag', update: null, delete: 'deleteTag' },
    });

    const postTagTable = createTable({
      name: 'PostTag',
      fields: [
        { name: 'postId', type: fieldTypes.uuid },
        { name: 'tagId', type: fieldTypes.uuid },
        { name: 'position', type: fieldTypes.int },
      ],
      query: { all: 'postTags', one: null, create: 'createPostTag', update: null, delete: 'deletePostTag' },
    });

    const result = generateModelFile(postTable, false, {
      allTables: [postTable, tagTable, postTagTable],
    });

    // data param should be present for add (junction has extra fields)
    expect(result.content).toContain('data?: Partial<Omit<CreatePostTagInput["postTag"]');
  });

  it('disambiguates junction methods when multiple M:N to same target', () => {
    const postTable = createTable({
      name: 'Post',
      fields: [{ name: 'id', type: fieldTypes.uuid }],
      relations: {
        ...emptyRelations,
        manyToMany: [
          {
            fieldName: 'tags',
            rightTable: 'Tag',
            junctionTable: 'PostTag',
            type: null,
            junctionLeftKeys: [{ name: 'postId', type: fieldTypes.uuid }],
            junctionRightKeys: [{ name: 'tagId', type: fieldTypes.uuid }],
          },
          {
            fieldName: 'featuredTags',
            rightTable: 'Tag',
            junctionTable: 'PostFeaturedTag',
            type: null,
            junctionLeftKeys: [{ name: 'postId', type: fieldTypes.uuid }],
            junctionRightKeys: [{ name: 'tagId', type: fieldTypes.uuid }],
          },
        ],
      },
      query: { all: 'posts', one: 'post', create: 'createPost', update: null, delete: null },
    });

    const tagTable = createTable({
      name: 'Tag',
      fields: [{ name: 'id', type: fieldTypes.uuid }],
      query: { all: 'tags', one: 'tag', create: 'createTag', update: null, delete: 'deleteTag' },
    });

    const postTagTable = createTable({
      name: 'PostTag',
      fields: [
        { name: 'postId', type: fieldTypes.uuid },
        { name: 'tagId', type: fieldTypes.uuid },
      ],
      query: { all: 'postTags', one: null, create: 'createPostTag', update: null, delete: 'deletePostTag' },
    });

    const postFeaturedTagTable = createTable({
      name: 'PostFeaturedTag',
      fields: [
        { name: 'postId', type: fieldTypes.uuid },
        { name: 'tagId', type: fieldTypes.uuid },
      ],
      query: { all: 'postFeaturedTags', one: null, create: 'createPostFeaturedTag', update: null, delete: 'deletePostFeaturedTag' },
    });

    const result = generateModelFile(postTable, false, {
      allTables: [postTable, tagTable, postTagTable, postFeaturedTagTable],
    });

    // Should use Via{JunctionTable} disambiguation
    expect(result.content).toContain('addTagViaPostTag');
    expect(result.content).toContain('removeTagViaPostTag');
    expect(result.content).toContain('addFeaturedTagViaPostFeaturedTag');
    expect(result.content).toContain('removeFeaturedTagViaPostFeaturedTag');
  });

  it('skips junction methods when junction table is missing from allTables', () => {
    const postTable = createTable({
      name: 'Post',
      fields: [{ name: 'id', type: fieldTypes.uuid }],
      relations: {
        ...emptyRelations,
        manyToMany: [
          {
            fieldName: 'tags',
            rightTable: 'Tag',
            junctionTable: 'PostTag',
            type: null,
            junctionLeftKeys: [{ name: 'postId', type: fieldTypes.uuid }],
            junctionRightKeys: [{ name: 'tagId', type: fieldTypes.uuid }],
          },
        ],
      },
      query: { all: 'posts', one: 'post', create: 'createPost', update: null, delete: null },
    });

    // No junction table in allTables
    const result = generateModelFile(postTable, false, {
      allTables: [postTable],
    });

    expect(result.content).not.toContain('addTag');
    expect(result.content).not.toContain('removeTag');
  });

  it('skips junction methods when junction table lacks delete mutation', () => {
    const postTable = createTable({
      name: 'Post',
      fields: [{ name: 'id', type: fieldTypes.uuid }],
      relations: {
        ...emptyRelations,
        manyToMany: [
          {
            fieldName: 'tags',
            rightTable: 'Tag',
            junctionTable: 'PostTag',
            type: null,
            junctionLeftKeys: [{ name: 'postId', type: fieldTypes.uuid }],
            junctionRightKeys: [{ name: 'tagId', type: fieldTypes.uuid }],
          },
        ],
      },
      query: { all: 'posts', one: 'post', create: 'createPost', update: null, delete: null },
    });

    const tagTable = createTable({
      name: 'Tag',
      fields: [{ name: 'id', type: fieldTypes.uuid }],
      query: { all: 'tags', one: 'tag', create: 'createTag', update: null, delete: 'deleteTag' },
    });

    const postTagTable = createTable({
      name: 'PostTag',
      fields: [
        { name: 'postId', type: fieldTypes.uuid },
        { name: 'tagId', type: fieldTypes.uuid },
      ],
      query: { all: 'postTags', one: null, create: 'createPostTag', update: null, delete: null },
    });

    const result = generateModelFile(postTable, false, {
      allTables: [postTable, tagTable, postTagTable],
    });

    // No delete mutation → can't generate remove → skip all junction methods
    expect(result.content).not.toContain('addTag');
    expect(result.content).not.toContain('removeTag');
  });

  it('resolves FK fields from junction belongsTo when junctionLeftKeys not available', () => {
    const postTable = createTable({
      name: 'Post',
      fields: [{ name: 'id', type: fieldTypes.uuid }],
      relations: {
        ...emptyRelations,
        manyToMany: [
          {
            fieldName: 'tags',
            rightTable: 'Tag',
            junctionTable: 'PostTag',
            type: null,
            // No junctionLeftKeys/junctionRightKeys (SDL mode)
          },
        ],
      },
      query: { all: 'posts', one: 'post', create: 'createPost', update: null, delete: null },
    });

    const tagTable = createTable({
      name: 'Tag',
      fields: [{ name: 'id', type: fieldTypes.uuid }],
      query: { all: 'tags', one: 'tag', create: 'createTag', update: null, delete: 'deleteTag' },
    });

    const postTagTable = createTable({
      name: 'PostTag',
      fields: [
        { name: 'postId', type: fieldTypes.uuid },
        { name: 'tagId', type: fieldTypes.uuid },
      ],
      relations: {
        ...emptyRelations,
        belongsTo: [
          {
            fieldName: 'post',
            isUnique: false,
            referencesTable: 'Post',
            type: null,
            keys: [{ name: 'postId', type: fieldTypes.uuid }],
          },
          {
            fieldName: 'tag',
            isUnique: false,
            referencesTable: 'Tag',
            type: null,
            keys: [{ name: 'tagId', type: fieldTypes.uuid }],
          },
        ],
      },
      query: { all: 'postTags', one: null, create: 'createPostTag', update: null, delete: 'deletePostTag' },
    });

    const result = generateModelFile(postTable, false, {
      allTables: [postTable, tagTable, postTagTable],
    });

    // Should still generate junction methods using belongsTo FK info
    expect(result.content).toContain('addTag(postId: string, tagId: string)');
    expect(result.content).toContain('removeTag(postId: string, tagId: string)');
  });

  it('imports and wires Condition type for findMany and findFirst', () => {
    const table = createTable({
      name: 'Contact',
      fields: [
        { name: 'id', type: fieldTypes.uuid },
        { name: 'name', type: fieldTypes.string },
      ],
      query: {
        all: 'contacts',
        one: 'contact',
        create: 'createContact',
        update: 'updateContact',
        delete: 'deleteContact',
      },
    });

    const result = generateModelFile(table, false);

    // Condition type should be imported
    expect(result.content).toContain('ContactCondition');

    // findMany should include condition in its args type
    expect(result.content).toContain(
      'FindManyArgs<S, ContactFilter, ContactCondition, ContactsOrderBy>',
    );

    // findFirst should include condition in its args type
    expect(result.content).toContain(
      'FindFirstArgs<S, ContactFilter, ContactCondition>',
    );

    // condition should be forwarded in the body args object
    expect(result.content).toContain('condition: args?.condition');

    // conditionTypeName should be passed as a string literal to the document builder
    expect(result.content).toContain('"ContactCondition"');
  });

  // ============================================================================
  // Static Filter Helpers
  // ============================================================================

  it('generates static filters property for belongsTo relations', () => {
    const postTable = createTable({
      name: 'Post',
      fields: [
        { name: 'id', type: fieldTypes.uuid },
        { name: 'title', type: fieldTypes.string },
        { name: 'authorId', type: fieldTypes.uuid },
      ],
      relations: {
        ...emptyRelations,
        belongsTo: [
          {
            fieldName: 'author',
            isUnique: false,
            referencesTable: 'User',
            type: null,
            keys: [{ name: 'authorId', type: fieldTypes.uuid }],
          },
        ],
      },
      query: {
        all: 'posts',
        one: 'post',
        create: 'createPost',
        update: 'updatePost',
        delete: 'deletePost',
      },
    });

    const result = generateModelFile(postTable, false);

    // Should have a static filters property
    expect(result.content).toContain('static filters = {');

    // Should have hasAuthor helper
    expect(result.content).toContain('hasAuthor: (filter: UserFilter): PostFilter =>');
    expect(result.content).toContain('author: filter');

    // Should import UserFilter
    expect(result.content).toContain('UserFilter');
  });

  it('generates static filters property for hasMany relations', () => {
    const userTable = createTable({
      name: 'User',
      fields: [
        { name: 'id', type: fieldTypes.uuid },
        { name: 'email', type: fieldTypes.string },
      ],
      relations: {
        ...emptyRelations,
        hasMany: [
          {
            fieldName: 'posts',
            isUnique: false,
            referencedByTable: 'Post',
            type: null,
            keys: [],
          },
        ],
      },
      query: {
        all: 'users',
        one: 'user',
        create: 'createUser',
        update: 'updateUser',
        delete: 'deleteUser',
      },
    });

    const result = generateModelFile(userTable, false);

    // Should generate has/hasEvery/hasNo methods for hasMany
    expect(result.content).toContain('hasPost: (filter: PostFilter): UserFilter =>');
    expect(result.content).toContain('some: filter');

    expect(result.content).toContain('hasEveryPost: (filter: PostFilter): UserFilter =>');
    expect(result.content).toContain('every: filter');

    expect(result.content).toContain('hasNoPost: (filter: PostFilter): UserFilter =>');
    expect(result.content).toContain('none: filter');

    // Should import PostFilter
    expect(result.content).toContain('PostFilter');
  });

  it('generates static filters property for manyToMany relations with junction path', () => {
    const postTable = createTable({
      name: 'Post',
      fields: [
        { name: 'id', type: fieldTypes.uuid },
        { name: 'title', type: fieldTypes.string },
      ],
      relations: {
        ...emptyRelations,
        hasMany: [
          {
            fieldName: 'postTags',
            isUnique: false,
            referencedByTable: 'PostTag',
            type: null,
            keys: [],
          },
        ],
        manyToMany: [
          {
            fieldName: 'tags',
            rightTable: 'Tag',
            junctionTable: 'PostTag',
            type: null,
          },
        ],
      },
      query: {
        all: 'posts',
        one: 'post',
        create: 'createPost',
        update: 'updatePost',
        delete: 'deletePost',
      },
    });

    const postTagTable = createTable({
      name: 'PostTag',
      fields: [
        { name: 'postId', type: fieldTypes.uuid },
        { name: 'tagId', type: fieldTypes.uuid },
      ],
      relations: {
        ...emptyRelations,
        belongsTo: [
          {
            fieldName: 'post',
            isUnique: false,
            referencesTable: 'Post',
            type: null,
            keys: [{ name: 'postId', type: fieldTypes.uuid }],
          },
          {
            fieldName: 'tag',
            isUnique: false,
            referencesTable: 'Tag',
            type: null,
            keys: [{ name: 'tagId', type: fieldTypes.uuid }],
          },
        ],
      },
      query: {
        all: 'postTags',
        one: 'postTag',
        create: 'createPostTag',
        update: null,
        delete: 'deletePostTag',
      },
    });

    const tagTable = createTable({
      name: 'Tag',
      fields: [
        { name: 'id', type: fieldTypes.uuid },
        { name: 'name', type: fieldTypes.string },
      ],
      query: {
        all: 'tags',
        one: 'tag',
        create: 'createTag',
        update: 'updateTag',
        delete: 'deleteTag',
      },
    });

    const allTables = [postTable, postTagTable, tagTable];
    const result = generateModelFile(postTable, false, { allTables });

    // Should generate has/hasEvery/hasNo methods that go through junction path
    expect(result.content).toContain('hasTag: (filter: TagFilter): PostFilter =>');
    expect(result.content).toContain('hasEveryTag: (filter: TagFilter): PostFilter =>');
    expect(result.content).toContain('hasNoTag: (filter: TagFilter): PostFilter =>');

    // Should use junction path: postTags → { some: { tag: filter } }
    expect(result.content).toContain('postTags');
    expect(result.content).toContain('tag: filter');

    // Should import TagFilter
    expect(result.content).toContain('TagFilter');
  });

  it('skips manyToMany filter helpers when junction path cannot be resolved', () => {
    const postTable = createTable({
      name: 'Post',
      fields: [
        { name: 'id', type: fieldTypes.uuid },
        { name: 'title', type: fieldTypes.string },
      ],
      relations: {
        ...emptyRelations,
        // No hasMany to junction — junction path unresolvable
        manyToMany: [
          {
            fieldName: 'tags',
            rightTable: 'Tag',
            junctionTable: 'PostTag',
            type: null,
          },
        ],
      },
      query: {
        all: 'posts',
        one: 'post',
        create: 'createPost',
        update: 'updatePost',
        delete: 'deletePost',
      },
    });

    // Without allTables, junction path can't be resolved
    const result = generateModelFile(postTable, false);

    // Should NOT have M:N filter helpers
    expect(result.content).not.toContain('hasTag');
    expect(result.content).not.toContain('static filters');
  });

  it('generates static filters property for hasOne relations', () => {
    const userTable = createTable({
      name: 'User',
      fields: [
        { name: 'id', type: fieldTypes.uuid },
        { name: 'email', type: fieldTypes.string },
      ],
      relations: {
        ...emptyRelations,
        hasOne: [
          {
            fieldName: 'profile',
            isUnique: true,
            referencedByTable: 'Profile',
            type: null,
            keys: [],
          },
        ],
      },
      query: {
        all: 'users',
        one: 'user',
        create: 'createUser',
        update: 'updateUser',
        delete: 'deleteUser',
      },
    });

    const result = generateModelFile(userTable, false);

    // Should have hasProfile helper (no quantifier for hasOne)
    expect(result.content).toContain('hasProfile: (filter: ProfileFilter): UserFilter =>');
    expect(result.content).toContain('profile: filter');

    // Should import ProfileFilter
    expect(result.content).toContain('ProfileFilter');
  });

  it('does not generate static filters when table has no named relations', () => {
    const table = createTable({
      name: 'Setting',
      fields: [
        { name: 'id', type: fieldTypes.uuid },
        { name: 'key', type: fieldTypes.string },
        { name: 'value', type: fieldTypes.string },
      ],
      query: {
        all: 'settings',
        one: 'setting',
        create: 'createSetting',
        update: 'updateSetting',
        delete: 'deleteSetting',
      },
    });

    const result = generateModelFile(table, false);

    // Should NOT have a static filters property
    expect(result.content).not.toContain('static filters');
  });

  it('skips relations with fieldName: null in static filters', () => {
    const table = createTable({
      name: 'Article',
      fields: [
        { name: 'id', type: fieldTypes.uuid },
        { name: 'title', type: fieldTypes.string },
      ],
      relations: {
        belongsTo: [
          {
            fieldName: null,
            isUnique: false,
            referencesTable: 'User',
            type: null,
            keys: [],
          },
        ],
        hasOne: [],
        hasMany: [
          {
            fieldName: null,
            isUnique: false,
            referencedByTable: 'Comment',
            type: null,
            keys: [],
          },
        ],
        manyToMany: [],
      },
      query: {
        all: 'articles',
        one: 'article',
        create: 'createArticle',
        update: 'updateArticle',
        delete: 'deleteArticle',
      },
    });

    const result = generateModelFile(table, false);

    // Should NOT have a static filters property (all relations have null fieldNames)
    expect(result.content).not.toContain('static filters');
  });

  it('generates combined filters for mixed relation types', () => {
    const postTable = createTable({
      name: 'Post',
      fields: [
        { name: 'id', type: fieldTypes.uuid },
        { name: 'title', type: fieldTypes.string },
        { name: 'authorId', type: fieldTypes.uuid },
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
          {
            fieldName: 'postTags',
            isUnique: false,
            referencedByTable: 'PostTag',
            type: null,
            keys: [],
          },
        ],
        manyToMany: [
          {
            fieldName: 'tags',
            rightTable: 'Tag',
            junctionTable: 'PostTag',
            type: null,
          },
        ],
      },
      query: {
        all: 'posts',
        one: 'post',
        create: 'createPost',
        update: 'updatePost',
        delete: 'deletePost',
      },
    });

    const postTagTable = createTable({
      name: 'PostTag',
      fields: [
        { name: 'postId', type: fieldTypes.uuid },
        { name: 'tagId', type: fieldTypes.uuid },
      ],
      relations: {
        ...emptyRelations,
        belongsTo: [
          {
            fieldName: 'post',
            isUnique: false,
            referencesTable: 'Post',
            type: null,
            keys: [{ name: 'postId', type: fieldTypes.uuid }],
          },
          {
            fieldName: 'tag',
            isUnique: false,
            referencesTable: 'Tag',
            type: null,
            keys: [{ name: 'tagId', type: fieldTypes.uuid }],
          },
        ],
      },
      query: {
        all: 'postTags',
        one: 'postTag',
        create: 'createPostTag',
        update: null,
        delete: 'deletePostTag',
      },
    });

    const tagTable = createTable({
      name: 'Tag',
      fields: [
        { name: 'id', type: fieldTypes.uuid },
        { name: 'name', type: fieldTypes.string },
      ],
      query: {
        all: 'tags',
        one: 'tag',
        create: 'createTag',
        update: 'updateTag',
        delete: 'deleteTag',
      },
    });

    const allTables = [postTable, postTagTable, tagTable];
    const result = generateModelFile(postTable, false, { allTables });

    // Should have belongsTo helper
    expect(result.content).toContain('hasAuthor: (filter: UserFilter): PostFilter =>');

    // Should have hasMany helpers
    expect(result.content).toContain('hasComment: (filter: CommentFilter): PostFilter =>');
    expect(result.content).toContain('hasEveryComment: (filter: CommentFilter): PostFilter =>');
    expect(result.content).toContain('hasNoComment: (filter: CommentFilter): PostFilter =>');

    // Should have manyToMany helpers using junction path
    expect(result.content).toContain('hasTag: (filter: TagFilter): PostFilter =>');
    expect(result.content).toContain('hasEveryTag: (filter: TagFilter): PostFilter =>');
    expect(result.content).toContain('hasNoTag: (filter: TagFilter): PostFilter =>');
    // Verify junction path structure
    expect(result.content).toContain('postTags');
    expect(result.content).toContain('tag: filter');
  });
});
