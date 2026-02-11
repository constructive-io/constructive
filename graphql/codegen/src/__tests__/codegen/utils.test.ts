/**
 * Tests for codegen utility functions
 */
import {
  getFilterTypeName,
  getGeneratedFileHeader,
  getOrderByTypeName,
  getPrimaryKeyInfo,
  getTableNames,
  gqlTypeToTs,
  lcFirst,
  toCamelCase,
  toPascalCase,
  toScreamingSnake,
  ucFirst,
} from '../../core/codegen/utils';
import type { CleanRelations, CleanTable } from '../../types/schema';

const emptyRelations: CleanRelations = {
  belongsTo: [],
  hasOne: [],
  hasMany: [],
  manyToMany: [],
};

// Use any for test fixture overrides to avoid strict type requirements
function createTable(
  name: string,
  overrides: Record<string, unknown> = {},
): CleanTable {
  return {
    name,
    fields: [],
    relations: emptyRelations,
    ...overrides,
  } as CleanTable;
}

describe('utils', () => {
  describe('string manipulation', () => {
    it('lcFirst lowercases first character', () => {
      expect(lcFirst('Hello')).toBe('hello');
      expect(lcFirst('ABC')).toBe('aBC');
      expect(lcFirst('a')).toBe('a');
    });

    it('ucFirst uppercases first character', () => {
      expect(ucFirst('hello')).toBe('Hello');
      expect(ucFirst('abc')).toBe('Abc');
      expect(ucFirst('A')).toBe('A');
    });

    it('toCamelCase converts various formats', () => {
      expect(toCamelCase('hello-world')).toBe('helloWorld');
      expect(toCamelCase('hello_world')).toBe('helloWorld');
      expect(toCamelCase('HelloWorld')).toBe('helloWorld');
    });

    it('toPascalCase converts various formats', () => {
      expect(toPascalCase('hello-world')).toBe('HelloWorld');
      expect(toPascalCase('hello_world')).toBe('HelloWorld');
      expect(toPascalCase('helloWorld')).toBe('HelloWorld');
    });

    it('toScreamingSnake converts to SCREAMING_SNAKE_CASE', () => {
      expect(toScreamingSnake('helloWorld')).toBe('HELLO_WORLD');
      expect(toScreamingSnake('HelloWorld')).toBe('HELLO_WORLD');
      expect(toScreamingSnake('hello')).toBe('HELLO');
    });
  });

  describe('getTableNames', () => {
    it('derives names from table name', () => {
      const result = getTableNames(createTable('User'));
      expect(result.typeName).toBe('User');
      expect(result.singularName).toBe('user');
      expect(result.pluralName).toBe('users');
      expect(result.pluralTypeName).toBe('Users');
    });

    it('uses inflection overrides when provided', () => {
      const result = getTableNames(
        createTable('Person', {
          inflection: { tableFieldName: 'individual', allRows: 'people' },
        }),
      );
      expect(result.singularName).toBe('individual');
      expect(result.pluralName).toBe('people');
    });

    it('uses query.all for plural name', () => {
      const result = getTableNames(
        createTable('Child', {
          query: {
            all: 'children',
            one: 'child',
            create: 'createChild',
            update: 'updateChild',
            delete: 'deleteChild',
          },
        }),
      );
      expect(result.pluralName).toBe('children');
    });
  });

  describe('type name generators', () => {
    it('getFilterTypeName returns correct filter type', () => {
      expect(getFilterTypeName(createTable('User'))).toBe('UserFilter');
      expect(
        getFilterTypeName(
          createTable('Post', { inflection: { filterType: 'PostCondition' } }),
        ),
      ).toBe('PostCondition');
    });

    it('getOrderByTypeName returns correct orderBy type', () => {
      expect(getOrderByTypeName(createTable('User'))).toBe('UsersOrderBy');
      expect(getOrderByTypeName(createTable('Address'))).toBe(
        'AddressesOrderBy',
      );
    });
  });

  describe('gqlTypeToTs', () => {
    it('maps standard scalars', () => {
      expect(gqlTypeToTs('String')).toBe('string');
      expect(gqlTypeToTs('Int')).toBe('number');
      expect(gqlTypeToTs('Float')).toBe('number');
      expect(gqlTypeToTs('Boolean')).toBe('boolean');
      expect(gqlTypeToTs('ID')).toBe('string');
    });

    it('maps PostGraphile scalars', () => {
      expect(gqlTypeToTs('UUID')).toBe('string');
      expect(gqlTypeToTs('Datetime')).toBe('string');
      expect(gqlTypeToTs('JSON')).toBe('unknown');
      expect(gqlTypeToTs('BigInt')).toBe('string');
    });

    it('handles array types', () => {
      expect(gqlTypeToTs('String', true)).toBe('string[]');
      expect(gqlTypeToTs('Int', true)).toBe('number[]');
    });

    it('preserves custom type names', () => {
      expect(gqlTypeToTs('CustomType')).toBe('CustomType');
      expect(gqlTypeToTs('MyEnum')).toBe('MyEnum');
    });
  });

  describe('getPrimaryKeyInfo', () => {
    it('extracts PK from constraints', () => {
      const table = createTable('User', {
        constraints: {
          primaryKey: [
            {
              name: 'users_pkey',
              fields: [
                { name: 'id', type: { gqlType: 'UUID', isArray: false } },
              ],
            },
          ],
        },
      });
      const result = getPrimaryKeyInfo(table);
      expect(result).toEqual([
        { name: 'id', gqlType: 'UUID', tsType: 'string' },
      ]);
    });

    it('falls back to id field', () => {
      const table = createTable('User', {
        fields: [{ name: 'id', type: { gqlType: 'UUID', isArray: false } }],
      });
      const result = getPrimaryKeyInfo(table);
      expect(result).toEqual([
        { name: 'id', gqlType: 'UUID', tsType: 'string' },
      ]);
    });

    it('handles composite keys', () => {
      const table = createTable('UserRole', {
        constraints: {
          primaryKey: [
            {
              name: 'user_roles_pkey',
              fields: [
                { name: 'userId', type: { gqlType: 'UUID', isArray: false } },
                { name: 'roleId', type: { gqlType: 'UUID', isArray: false } },
              ],
            },
          ],
        },
      });
      const result = getPrimaryKeyInfo(table);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('userId');
      expect(result[1].name).toBe('roleId');
    });
  });

  describe('getGeneratedFileHeader', () => {
    it('generates proper header comment', () => {
      const header = getGeneratedFileHeader('Test description');
      expect(header).toContain('Test description');
      expect(header).toContain('@generated');
      expect(header).toContain('DO NOT EDIT');
    });
  });
});
