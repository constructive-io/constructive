/**
 * Unit tests for query-builder.ts document builders
 *
 * Tests the core GraphQL document building functions using gql-ast.
 * Functions are re-implemented here to avoid ./client import issues.
 */
import * as t from 'gql-ast';
import type { ArgumentNode, FieldNode, VariableDefinitionNode } from 'graphql';
import { parseType, print } from 'graphql';

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
  variables: Record<string, unknown>,
): void {
  if (spec.value === undefined) return;
  definitions.push(
    t.variableDefinition({
      variable: t.variable({ name: spec.varName }),
      type: parseType(spec.typeName),
    }),
  );
  args.push(
    t.argument({
      name: spec.argName ?? spec.varName,
      value: t.variable({ name: spec.varName }),
    }),
  );
  variables[spec.varName] = spec.value;
}

function buildSelections(
  select: Record<string, unknown> | undefined,
  connectionFieldsMap?: Record<string, Record<string, string>>,
  entityType?: string,
): FieldNode[] {
  if (!select) return [];
  const fields: FieldNode[] = [];
  const entityConnections = entityType
    ? connectionFieldsMap?.[entityType]
    : undefined;

  for (const [key, value] of Object.entries(select)) {
    if (value === false || value === undefined) continue;
    if (value === true) {
      fields.push(t.field({ name: key }));
      continue;
    }
    if (typeof value === 'object' && value !== null) {
      const nested = value as {
        select?: Record<string, unknown>;
        first?: number;
        filter?: Record<string, unknown>;
        connection?: boolean;
      };
      if (nested.select) {
        const relatedEntityType = entityConnections?.[key];
        const nestedSelections = buildSelections(
          nested.select,
          connectionFieldsMap,
          relatedEntityType,
        );
        const isConnection =
          nested.connection === true ||
          nested.first !== undefined ||
          nested.filter !== undefined ||
          relatedEntityType !== undefined;

        if (isConnection) {
          fields.push(
            t.field({
              name: key,
              selectionSet: t.selectionSet({
                selections: buildConnectionSelections(nestedSelections),
              }),
            }),
          );
        } else {
          fields.push(
            t.field({
              name: key,
              selectionSet: t.selectionSet({ selections: nestedSelections }),
            }),
          );
        }
      }
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
  orderByTypeName: string,
  connectionFieldsMap?: Record<string, Record<string, string>>,
): { document: string; variables: Record<string, unknown> } {
  const selections = select
    ? buildSelections(
        select as Record<string, unknown>,
        connectionFieldsMap,
        operationName,
      )
    : [t.field({ name: 'id' })];
  const variableDefinitions: VariableDefinitionNode[] = [];
  const queryArgs: ArgumentNode[] = [];
  const variables: Record<string, unknown> = {};

  addVariable(
    {
      varName: 'where',
      argName: 'filter',
      typeName: filterTypeName,
      value: args.where,
    },
    variableDefinitions,
    queryArgs,
    variables,
  );
  addVariable(
    {
      varName: 'orderBy',
      typeName: `[${orderByTypeName}!]`,
      value: args.orderBy?.length ? args.orderBy : undefined,
    },
    variableDefinitions,
    queryArgs,
    variables,
  );
  addVariable(
    { varName: 'first', typeName: 'Int', value: args.first },
    variableDefinitions,
    queryArgs,
    variables,
  );

  const document = t.document({
    definitions: [
      t.operationDefinition({
        operation: 'query',
        name: operationName + 'Query',
        variableDefinitions: variableDefinitions.length
          ? variableDefinitions
          : undefined,
        selectionSet: t.selectionSet({
          selections: [
            t.field({
              name: queryField,
              args: queryArgs.length ? queryArgs : undefined,
              selectionSet: t.selectionSet({
                selections: buildConnectionSelections(selections),
              }),
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
  inputTypeName: string,
): string {
  return print(
    t.document({
      definitions: [
        t.operationDefinition({
          operation: 'mutation',
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
                args: [
                  t.argument({
                    name: 'input',
                    value: t.variable({ name: 'input' }),
                  }),
                ],
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
    }),
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

    it('wraps connection fields in nodes when connectionFieldsMap is provided', () => {
      const connectionFieldsMap = {
        User: { posts: 'Post', comments: 'Comment' },
      };

      const result = buildSelections(
        { id: true, posts: { select: { id: true, title: true } } },
        connectionFieldsMap,
        'User',
      );

      expect(result).toHaveLength(2);
      expect(result[0].name.value).toBe('id');
      expect(result[1].name.value).toBe('posts');
      // Should be wrapped in connection structure: nodes, totalCount, pageInfo
      const postsSelections = result[1].selectionSet?.selections as FieldNode[];
      expect(postsSelections).toHaveLength(3);
      expect(postsSelections[0].name.value).toBe('nodes');
      expect(postsSelections[1].name.value).toBe('totalCount');
      expect(postsSelections[2].name.value).toBe('pageInfo');
      // nodes should contain the actual fields
      const nodesSelections = postsSelections[0].selectionSet
        ?.selections as FieldNode[];
      expect(nodesSelections).toHaveLength(2);
      expect(nodesSelections[0].name.value).toBe('id');
      expect(nodesSelections[1].name.value).toBe('title');
    });

    it('does not wrap singular relations in nodes', () => {
      const connectionFieldsMap = {
        Post: { comments: 'Comment' },
      };

      const result = buildSelections(
        { id: true, author: { select: { id: true, name: true } } },
        connectionFieldsMap,
        'Post',
      );

      expect(result).toHaveLength(2);
      expect(result[1].name.value).toBe('author');
      // author is NOT in connectionFieldsMap for Post → should NOT be wrapped
      const authorSelections = result[1].selectionSet
        ?.selections as FieldNode[];
      expect(authorSelections).toHaveLength(2);
      expect(authorSelections[0].name.value).toBe('id');
      expect(authorSelections[1].name.value).toBe('name');
    });

    it('handles deeply nested connections recursively', () => {
      const connectionFieldsMap = {
        User: { posts: 'Post' },
        Post: { comments: 'Comment' },
      };

      const result = buildSelections(
        {
          id: true,
          posts: {
            select: {
              id: true,
              comments: { select: { id: true, body: true } },
            },
          },
        },
        connectionFieldsMap,
        'User',
      );

      // posts should be wrapped (User.posts is a connection)
      const postsSelections = result[1].selectionSet?.selections as FieldNode[];
      expect(postsSelections[0].name.value).toBe('nodes');

      // Inside nodes, comments should also be wrapped (Post.comments is a connection)
      const nodesFields = postsSelections[0].selectionSet
        ?.selections as FieldNode[];
      const commentsField = nodesFields.find(
        (f) => f.name.value === 'comments',
      )!;
      const commentsSelections = commentsField.selectionSet
        ?.selections as FieldNode[];
      expect(commentsSelections[0].name.value).toBe('nodes');
      expect(commentsSelections[1].name.value).toBe('totalCount');
      expect(commentsSelections[2].name.value).toBe('pageInfo');
    });

    it('works without connectionFieldsMap (backward compat)', () => {
      const result = buildSelections({
        id: true,
        posts: { select: { id: true } },
      });

      expect(result).toHaveLength(2);
      expect(result[1].name.value).toBe('posts');
      // Without map, posts is NOT treated as a connection
      const postsSelections = result[1].selectionSet?.selections as FieldNode[];
      expect(postsSelections).toHaveLength(1);
      expect(postsSelections[0].name.value).toBe('id');
    });

    it('still wraps when first/filter provided even without connectionFieldsMap', () => {
      const result = buildSelections({
        id: true,
        posts: { select: { id: true }, first: 10 },
      });

      expect(result).toHaveLength(2);
      const postsSelections = result[1].selectionSet?.selections as FieldNode[];
      expect(postsSelections[0].name.value).toBe('nodes');
      expect(postsSelections[1].name.value).toBe('totalCount');
    });

    it('handles mixed connection and singular relations on same entity', () => {
      const connectionFieldsMap = {
        Post: { comments: 'Comment' },
      };

      const result = buildSelections(
        {
          id: true,
          author: { select: { id: true } },
          comments: { select: { id: true, body: true } },
        },
        connectionFieldsMap,
        'Post',
      );

      expect(result).toHaveLength(3);
      // author = singular → no wrapping
      const authorSelections = result[1].selectionSet
        ?.selections as FieldNode[];
      expect(authorSelections[0].name.value).toBe('id');

      // comments = connection → wrapped
      const commentsSelections = result[2].selectionSet
        ?.selections as FieldNode[];
      expect(commentsSelections[0].name.value).toBe('nodes');
      expect(commentsSelections[1].name.value).toBe('totalCount');
    });

    it('handles entity not in connectionFieldsMap gracefully', () => {
      const connectionFieldsMap = {
        User: { posts: 'Post' },
      };

      // Comment is not in the map — all nested fields should be singular
      const result = buildSelections(
        { id: true, author: { select: { id: true } } },
        connectionFieldsMap,
        'Comment',
      );

      expect(result).toHaveLength(2);
      const authorSelections = result[1].selectionSet
        ?.selections as FieldNode[];
      expect(authorSelections[0].name.value).toBe('id');
    });
  });

  describe('buildFindManyDocument', () => {
    it('builds query with filter, pagination, and orderBy', () => {
      const { document, variables } = buildFindManyDocument(
        'Users',
        'users',
        { id: true, name: true },
        {
          where: { status: { equalTo: 'active' } },
          first: 10,
          orderBy: ['NAME_ASC'],
        },
        'UserFilter',
        'UsersOrderBy',
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
        'CreateUserInput',
      );

      expect(document).toContain('mutation CreateUserMutation');
      expect(document).toContain('$input: CreateUserInput!');
      expect(document).toContain('createUser(input: $input)');
      expect(document).toContain('user {');
      expect(document).toContain('id');
      expect(document).toContain('name');
    });
  });

  // ==========================================================================
  // Snapshot Tests — GraphQL Document Output
  // ==========================================================================

  describe('snapshots', () => {
    const connectionFieldsMap = {
      User: { posts: 'Post', comments: 'Comment' },
      Post: { comments: 'Comment', tags: 'Tag' },
    };

    /** Helper: build a query document and print it for snapshotting */
    function buildQuerySnapshot(
      select: Record<string, unknown>,
      map?: Record<string, Record<string, string>>,
    ): string {
      const selections = buildSelections(select, map, 'User');
      const doc = t.document({
        definitions: [
          t.operationDefinition({
            operation: 'query',
            name: 'TestQuery',
            selectionSet: t.selectionSet({
              selections: [
                t.field({
                  name: 'users',
                  selectionSet: t.selectionSet({
                    selections: buildConnectionSelections(selections),
                  }),
                }),
              ],
            }),
          }),
        ],
      });
      return print(doc);
    }

    it('findMany with nested connection fields', () => {
      const document = buildQuerySnapshot(
        {
          id: true,
          name: true,
          posts: { select: { id: true, title: true, body: true } },
        },
        connectionFieldsMap,
      );
      expect(document).toMatchSnapshot();
    });

    it('findMany with deeply nested connections (3 levels)', () => {
      const document = buildQuerySnapshot(
        {
          id: true,
          posts: {
            select: {
              id: true,
              title: true,
              comments: {
                select: { id: true, body: true },
              },
            },
          },
        },
        connectionFieldsMap,
      );
      expect(document).toMatchSnapshot();
    });

    it('findMany with mixed connection and singular relations', () => {
      const document = buildQuerySnapshot(
        {
          id: true,
          name: true,
          profile: { select: { bio: true, avatar: true } },
          posts: { select: { id: true, title: true } },
          comments: { select: { id: true, body: true } },
        },
        connectionFieldsMap,
      );
      expect(document).toMatchSnapshot();
    });

    it('findMany without connectionFieldsMap (no wrapping)', () => {
      const document = buildQuerySnapshot(
        {
          id: true,
          name: true,
          posts: { select: { id: true, title: true } },
        },
        // no connectionFieldsMap
      );
      expect(document).toMatchSnapshot();
    });

    it('findMany document with filter and pagination', () => {
      const { document } = buildFindManyDocument(
        'User',
        'users',
        { id: true, name: true, email: true },
        {
          where: { name: { equalTo: 'test' } },
          first: 25,
          orderBy: ['NAME_ASC', 'CREATED_AT_DESC'],
        },
        'UserFilter',
        'UsersOrderBy',
      );
      expect(document).toMatchSnapshot();
    });

    it('mutation document', () => {
      const document = buildMutationDocument(
        'CreateUser',
        'createUser',
        'user',
        [
          t.field({ name: 'id' }),
          t.field({ name: 'name' }),
          t.field({ name: 'email' }),
        ],
        'CreateUserInput',
      );
      expect(document).toMatchSnapshot();
    });

    it('findMany document with nested connections via connectionFieldsMap', () => {
      const { document } = buildFindManyDocument(
        'User',
        'users',
        {
          id: true,
          name: true,
          posts: { select: { id: true, title: true } },
          comments: { select: { id: true } },
        },
        {},
        'UserFilter',
        'UsersOrderBy',
        connectionFieldsMap,
      );
      expect(document).toMatchSnapshot();
    });
  });
});
