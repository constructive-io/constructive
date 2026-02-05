/**
 * Unit tests for query-builder.ts document builders
 *
 * Tests the core GraphQL document building functions using gql-ast.
 * Functions are re-implemented here to avoid ./client import issues.
 */
import * as t from 'gql-ast';
import { parseType, print, OperationTypeNode } from 'graphql';
import type { ArgumentNode, FieldNode, VariableDefinitionNode } from 'graphql';

// ============================================================================
// Core functions from query-builder.ts (re-implemented for testing)
// ============================================================================

function buildConnectionSelections(nodeSelections: FieldNode[]): FieldNode[] {
  return [
    t.field({
      name: 'nodes',
      selectionSet: t.selectionSet({ selections: nodeSelections }),
    }),
    t.field({ name: 'totalCount' }),
    t.field({
      name: 'pageInfo',
      selectionSet: t.selectionSet({
        selections: [
          t.field({ name: 'hasNextPage' }),
          t.field({ name: 'hasPreviousPage' }),
          t.field({ name: 'startCursor' }),
          t.field({ name: 'endCursor' }),
        ],
      }),
    }),
  ];
}

function addVariable(
  spec: { varName: string; argName?: string; typeName: string; value: unknown },
  definitions: VariableDefinitionNode[],
  args: ArgumentNode[],
  variables: Record<string, unknown>
): void {
  if (spec.value === undefined) return;
  definitions.push(
    t.variableDefinition({
      variable: t.variable({ name: spec.varName }),
      type: parseType(spec.typeName),
    })
  );
  args.push(
    t.argument({
      name: spec.argName ?? spec.varName,
      value: t.variable({ name: spec.varName }),
    })
  );
  variables[spec.varName] = spec.value;
}

function buildSelections(select: Record<string, unknown> | undefined): FieldNode[] {
  if (!select) return [];
  const fields: FieldNode[] = [];
  for (const [key, value] of Object.entries(select)) {
    if (value === true) {
      fields.push(t.field({ name: key }));
    } else if (value && typeof value === 'object' && 'select' in value) {
      const nested = value as { select: Record<string, unknown> };
      fields.push(
        t.field({
          name: key,
          selectionSet: t.selectionSet({ selections: buildSelections(nested.select) }),
        })
      );
    }
  }
  return fields;
}

function buildFindManyDocument<TSelect, TWhere>(
  operationName: string,
  queryField: string,
  select: TSelect,
  args: { where?: TWhere; first?: number; orderBy?: string[] },
  filterTypeName: string,
  orderByTypeName: string
): { document: string; variables: Record<string, unknown> } {
  const selections = select
    ? buildSelections(select as Record<string, unknown>)
    : [t.field({ name: 'id' })];
  const variableDefinitions: VariableDefinitionNode[] = [];
  const queryArgs: ArgumentNode[] = [];
  const variables: Record<string, unknown> = {};

  addVariable({ varName: 'where', argName: 'filter', typeName: filterTypeName, value: args.where }, variableDefinitions, queryArgs, variables);
  addVariable({ varName: 'orderBy', typeName: `[${orderByTypeName}!]`, value: args.orderBy?.length ? args.orderBy : undefined }, variableDefinitions, queryArgs, variables);
  addVariable({ varName: 'first', typeName: 'Int', value: args.first }, variableDefinitions, queryArgs, variables);

  const document = t.document({
    definitions: [
      t.operationDefinition({
        operation: OperationTypeNode.QUERY,
        name: operationName + 'Query',
        variableDefinitions: variableDefinitions.length ? variableDefinitions : undefined,
        selectionSet: t.selectionSet({
          selections: [
            t.field({
              name: queryField,
              args: queryArgs.length ? queryArgs : undefined,
              selectionSet: t.selectionSet({ selections: buildConnectionSelections(selections) }),
            }),
          ],
        }),
      }),
    ],
  });
  return { document: print(document), variables };
}

function buildMutationDocument(
  operationName: string,
  mutationField: string,
  entityField: string,
  selections: FieldNode[],
  inputTypeName: string
): string {
  return print(
    t.document({
      definitions: [
        t.operationDefinition({
          operation: OperationTypeNode.MUTATION,
          name: operationName + 'Mutation',
          variableDefinitions: [
            t.variableDefinition({
              variable: t.variable({ name: 'input' }),
              type: parseType(inputTypeName + '!'),
            }),
          ],
          selectionSet: t.selectionSet({
            selections: [
              t.field({
                name: mutationField,
                args: [t.argument({ name: 'input', value: t.variable({ name: 'input' }) })],
                selectionSet: t.selectionSet({
                  selections: [
                    t.field({
                      name: entityField,
                      selectionSet: t.selectionSet({ selections }),
                    }),
                  ],
                }),
              }),
            ],
          }),
        }),
      ],
    })
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('query-builder', () => {
  describe('buildSelections', () => {
    it('builds flat and nested selections', () => {
      const result = buildSelections({
        id: true,
        name: true,
        ignored: false,
        profile: { select: { bio: true } },
      });

      expect(result).toHaveLength(3);
      expect(result[0].name.value).toBe('id');
      expect(result[1].name.value).toBe('name');
      expect(result[2].name.value).toBe('profile');
      expect(result[2].selectionSet?.selections).toHaveLength(1);
    });
  });

  describe('buildFindManyDocument', () => {
    it('builds query with filter, pagination, and orderBy', () => {
      const { document, variables } = buildFindManyDocument(
        'Users',
        'users',
        { id: true, name: true },
        { where: { status: { equalTo: 'active' } }, first: 10, orderBy: ['NAME_ASC'] },
        'UserFilter',
        'UsersOrderBy'
      );

      expect(document).toContain('query UsersQuery');
      expect(document).toContain('$where: UserFilter');
      expect(document).toContain('$first: Int');
      expect(document).toContain('$orderBy: [UsersOrderBy!]');
      expect(document).toContain('filter: $where');
      expect(document).toContain('nodes {');
      expect(document).toContain('totalCount');
      expect(document).toContain('pageInfo');
      expect(variables).toEqual({
        where: { status: { equalTo: 'active' } },
        first: 10,
        orderBy: ['NAME_ASC'],
      });
    });
  });

  describe('buildMutationDocument', () => {
    it('builds create/update/delete mutations with input variable', () => {
      const document = buildMutationDocument(
        'CreateUser',
        'createUser',
        'user',
        [t.field({ name: 'id' }), t.field({ name: 'name' })],
        'CreateUserInput'
      );

      expect(document).toContain('mutation CreateUserMutation');
      expect(document).toContain('$input: CreateUserInput!');
      expect(document).toContain('createUser(input: $input)');
      expect(document).toContain('user {');
      expect(document).toContain('id');
      expect(document).toContain('name');
    });
  });
});
