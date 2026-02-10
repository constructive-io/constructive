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
});
