/**
 * Snapshot tests for schema-types-generator
 */
import { generateSchemaTypesFile } from '../../core/codegen/schema-types-generator';
import type { ResolvedType, TypeRegistry } from '../../types/schema';

function createTypeRegistry(
  types: Array<[string, ResolvedType]>,
): TypeRegistry {
  return new Map(types);
}

describe('schema-types-generator', () => {
  it('generates enum types as string unions', () => {
    const registry = createTypeRegistry([
      [
        'Status',
        {
          kind: 'ENUM',
          name: 'Status',
          enumValues: ['ACTIVE', 'INACTIVE', 'PENDING'],
        },
      ],
      [
        'Priority',
        {
          kind: 'ENUM',
          name: 'Priority',
          enumValues: ['LOW', 'MEDIUM', 'HIGH'],
        },
      ],
    ]);

    const result = generateSchemaTypesFile({
      typeRegistry: registry,
      tableTypeNames: new Set(),
    });

    expect(result.content).toMatchSnapshot();
    expect(result.generatedEnums).toEqual(['Priority', 'Status']);
  });

  it('generates input object types as interfaces', () => {
    const registry = createTypeRegistry([
      [
        'CreateUserInput',
        {
          kind: 'INPUT_OBJECT',
          name: 'CreateUserInput',
          inputFields: [
            {
              name: 'email',
              type: {
                kind: 'NON_NULL',
                name: null,
                ofType: { kind: 'SCALAR', name: 'String' },
              },
            },
            { name: 'name', type: { kind: 'SCALAR', name: 'String' } },
            { name: 'age', type: { kind: 'SCALAR', name: 'Int' } },
          ],
        },
      ],
      [
        'UpdateUserInput',
        {
          kind: 'INPUT_OBJECT',
          name: 'UpdateUserInput',
          inputFields: [
            {
              name: 'id',
              type: {
                kind: 'NON_NULL',
                name: null,
                ofType: { kind: 'SCALAR', name: 'UUID' },
              },
            },
            { name: 'name', type: { kind: 'SCALAR', name: 'String' } },
          ],
        },
      ],
    ]);

    const result = generateSchemaTypesFile({
      typeRegistry: registry,
      tableTypeNames: new Set(),
    });

    expect(result.content).toMatchSnapshot();
  });

  it('generates union types', () => {
    const registry = createTypeRegistry([
      [
        'SearchResult',
        {
          kind: 'UNION',
          name: 'SearchResult',
          possibleTypes: ['User', 'Post', 'Comment'],
        },
      ],
    ]);

    const result = generateSchemaTypesFile({
      typeRegistry: registry,
      tableTypeNames: new Set(),
    });

    expect(result.content).toMatchSnapshot();
  });

  it('generates payload types from mutation return types', () => {
    const registry = createTypeRegistry([
      [
        'Mutation',
        {
          kind: 'OBJECT',
          name: 'Mutation',
          fields: [
            { name: 'login', type: { kind: 'OBJECT', name: 'LoginPayload' } },
          ],
        },
      ],
      [
        'LoginPayload',
        {
          kind: 'OBJECT',
          name: 'LoginPayload',
          fields: [
            {
              name: 'token',
              type: {
                kind: 'NON_NULL',
                name: null,
                ofType: { kind: 'SCALAR', name: 'String' },
              },
            },
            { name: 'refreshToken', type: { kind: 'SCALAR', name: 'String' } },
            { name: 'user', type: { kind: 'OBJECT', name: 'User' } },
          ],
        },
      ],
    ]);

    const result = generateSchemaTypesFile({
      typeRegistry: registry,
      tableTypeNames: new Set(['User']),
    });

    expect(result.content).toMatchSnapshot();
    expect(result.referencedTableTypes).toContain('User');
  });

  it('skips table types and standard scalars', () => {
    const registry = createTypeRegistry([
      ['User', { kind: 'ENUM', name: 'User', enumValues: ['ADMIN'] }],
      ['String', { kind: 'ENUM', name: 'String', enumValues: ['A'] }],
      [
        'CustomEnum',
        {
          kind: 'ENUM',
          name: 'CustomEnum',
          enumValues: ['VALUE_A', 'VALUE_B'],
        },
      ],
    ]);

    const result = generateSchemaTypesFile({
      typeRegistry: registry,
      tableTypeNames: new Set(['User']),
    });

    expect(result.content).toMatchSnapshot();
    expect(result.generatedEnums).toEqual(['CustomEnum']);
  });

  it('emits unknown aliases for custom scalars', () => {
    const registry = createTypeRegistry([
      ['ImageAsset', { kind: 'SCALAR', name: 'ImageAsset' }],
      ['String', { kind: 'SCALAR', name: 'String' }],
      [
        'CreatePostInput',
        {
          kind: 'INPUT_OBJECT',
          name: 'CreatePostInput',
          inputFields: [
            {
              name: 'title',
              type: { kind: 'SCALAR', name: 'String' },
            },
            {
              name: 'thumbnail',
              type: { kind: 'SCALAR', name: 'ImageAsset' },
            },
          ],
        },
      ],
    ]);

    const result = generateSchemaTypesFile({
      typeRegistry: registry,
      tableTypeNames: new Set(),
    });

    expect(result.content).toContain('export type ImageAsset = unknown;');
    expect(result.content).not.toContain('export type String = unknown;');
    expect(result.content).toContain('thumbnail?: ImageAsset;');
  });
});
