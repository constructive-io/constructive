// Jest globals - no import needed

import {
  getTableOperationNames,
  getCustomOperations,
  isTableOperation,
} from './transform-schema';
import type { CleanOperation, CleanTypeRef } from '../../types/schema';

describe('transform-schema table operation filtering', () => {
  const dummyReturnType: CleanTypeRef = { kind: 'SCALAR', name: 'String' };

  it('detects table operations and update/delete patterns', () => {
    const tableOps = getTableOperationNames([
      {
        name: 'User',
        query: {
          all: 'users',
          one: 'user',
          create: 'createUser',
          update: 'updateUser',
          delete: 'deleteUser',
        },
        inflection: { tableType: 'User' },
      },
    ]);

    const updateByEmail: CleanOperation = {
      name: 'updateUserByEmail',
      kind: 'mutation',
      args: [],
      returnType: dummyReturnType,
    };

    const login: CleanOperation = {
      name: 'login',
      kind: 'mutation',
      args: [],
      returnType: dummyReturnType,
    };

    expect(isTableOperation(updateByEmail, tableOps)).toBe(true);
    expect(isTableOperation(login, tableOps)).toBe(false);
  });

  it('filters out table operations from custom list', () => {
    const tableOps = getTableOperationNames([
      {
        name: 'User',
        query: {
          all: 'users',
          one: 'user',
          create: 'createUser',
          update: 'updateUser',
          delete: 'deleteUser',
        },
        inflection: { tableType: 'User' },
      },
    ]);

    const operations: CleanOperation[] = [
      {
        name: 'users',
        kind: 'query',
        args: [],
        returnType: dummyReturnType,
      },
      {
        name: 'login',
        kind: 'mutation',
        args: [],
        returnType: dummyReturnType,
      },
    ];

    const customOps = getCustomOperations(operations, tableOps);
    expect(customOps.map((op) => op.name)).toEqual(['login']);
  });
});
