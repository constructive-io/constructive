import {
  generateCustomMutationOpsFile,
  generateCustomQueryOpsFile,
} from '../../core/codegen/orm/custom-ops-generator';
import type { CleanOperation, CleanTypeRef } from '../../types/schema';

function createTypeRef(
  kind: CleanTypeRef['kind'],
  name: string | null,
  ofType?: CleanTypeRef,
): CleanTypeRef {
  return { kind, name, ofType };
}

describe('custom-ops-generator', () => {
  it('preserves nullable selected return types for custom queries', () => {
    const operations: CleanOperation[] = [
      {
        name: 'maybeUser',
        kind: 'query',
        args: [],
        returnType: createTypeRef('OBJECT', 'User'),
      },
    ];

    const result = generateCustomQueryOpsFile(operations);

    expect(result.content).toMatch(
      /maybeUser:\s*InferSelectResult<User,\s*S>\s*\|\s*null;/,
    );
  });

  it('preserves nullable selected return types for custom mutations', () => {
    const operations: CleanOperation[] = [
      {
        name: 'signIn',
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
        ],
        returnType: createTypeRef('OBJECT', 'SignInPayload'),
      },
    ];

    const result = generateCustomMutationOpsFile(operations);

    expect(result.content).toMatch(
      /signIn:\s*InferSelectResult<SignInPayload,\s*S>\s*\|\s*null;/,
    );
  });

  it('preserves nullable raw scalar return types', () => {
    const operations: CleanOperation[] = [
      {
        name: 'accessToken',
        kind: 'query',
        args: [],
        returnType: createTypeRef('SCALAR', 'String'),
      },
    ];

    const result = generateCustomQueryOpsFile(operations);

    expect(result.content).toMatch(/accessToken:\s*string\s*\|\s*null;/);
  });

  it('preserves nested list item nullability for selected return types', () => {
    const operations: CleanOperation[] = [
      {
        name: 'recentUsers',
        kind: 'query',
        args: [],
        returnType: createTypeRef(
          'NON_NULL',
          null,
          createTypeRef('LIST', null, createTypeRef('OBJECT', 'User')),
        ),
      },
    ];

    const result = generateCustomQueryOpsFile(operations);

    expect(result.content).toContain(
      'recentUsers: (InferSelectResult<User, S> | null)[];',
    );
  });
});
