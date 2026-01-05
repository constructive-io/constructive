// Jest globals - no import needed

import { generateInputTypesFile } from './input-types-generator';
import type { CleanTable, CleanFieldType } from '../../../types/schema';

const uuidType: CleanFieldType = { gqlType: 'UUID', isArray: false };
const stringType: CleanFieldType = { gqlType: 'String', isArray: false };

function createTable(table: Partial<CleanTable> & Pick<CleanTable, 'name'>): CleanTable {
  return {
    name: table.name,
    fields: table.fields ?? [],
    relations: table.relations ?? {
      belongsTo: [],
      hasOne: [],
      hasMany: [],
      manyToMany: [],
    },
    query: table.query,
    inflection: table.inflection,
    constraints: table.constraints,
  };
}

describe('input-types-generator', () => {
  it('emits relation helpers and select types with related names', () => {
    const userTable = createTable({
      name: 'User',
      fields: [
        { name: 'id', type: uuidType },
        { name: 'name', type: stringType },
      ],
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
        ],
        manyToMany: [],
      },
    });

    const postTable = createTable({
      name: 'Post',
      fields: [
        { name: 'id', type: uuidType },
        { name: 'title', type: stringType },
      ],
      relations: {
        belongsTo: [
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
    });

    const result = generateInputTypesFile(new Map(), new Set(), [userTable, postTable]);

    expect(result.content).toContain('export interface ConnectionResult<T>');
    expect(result.content).toContain('export interface UserRelations');
    expect(result.content).toContain('posts?: ConnectionResult<Post>');
    expect(result.content).toContain('export type UserWithRelations = User & UserRelations;');
    expect(result.content).toContain('posts?: boolean | {');
    expect(result.content).toContain('orderBy?: PostsOrderBy[];');
    expect(result.content).toContain('author?: boolean | { select?: UserSelect };');
  });
});
