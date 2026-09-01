import type { RequestProtection } from '@constructive-io/express-context';
import { DEFAULT_REQUEST_PROTECTION } from '@constructive-io/express-context';
import { buildSchema, parse } from 'graphql';

import { enforceDocumentProtection } from '../document-gate';

/**
 * A miniature Graphile-shaped schema: two connections (one nested inside the
 * other) so cost multiplies, plus a self-referencing field so depth can be
 * driven arbitrarily deep.
 */
const schema = buildSchema(/* GraphQL */ `
  type PageInfo {
    hasNextPage: Boolean!
  }

  type Post {
    id: ID!
    title: String
    author: User
  }

  type PostsConnection {
    nodes: [Post]
    pageInfo: PageInfo!
    totalCount: Int
  }

  type User {
    id: ID!
    name: String
    manager: User
    posts(first: Int, last: Int): PostsConnection
  }

  type UsersConnection {
    nodes: [User]
    pageInfo: PageInfo!
  }

  type Query {
    users(first: Int, last: Int): UsersConnection
    user(id: ID!): User
  }
`);

const protection = (overrides: Partial<RequestProtection> = {}): RequestProtection => ({
  ...DEFAULT_REQUEST_PROTECTION,
  ...overrides
});

const enforce = (
  source: string,
  overrides: Partial<RequestProtection> = {},
  variableValues: Record<string, unknown> = {}
) =>
  enforceDocumentProtection(schema, parse(source), variableValues, protection(overrides));

const codeOf = (fn: () => unknown): string | undefined => {
  try {
    fn();
    return undefined;
  } catch (e: any) {
    return e.code;
  }
};

describe('depth', () => {
  it('accepts an operation at the limit', () => {
    const analysis = enforce('{ user(id: "1") { manager { name } } }', { maxQueryDepth: 3 });
    expect(analysis.depth).toBe(3);
  });

  it('rejects an operation past the limit', () => {
    expect(
      codeOf(() => enforce('{ user(id: "1") { manager { manager { name } } } }', { maxQueryDepth: 3 }))
    ).toBe('QUERY_TOO_DEEP');
  });

  it('counts depth through a fragment spread, which is where a query can hide it', () => {
    const source = `
      { user(id: "1") { ...deep } }
      fragment deep on User { manager { manager { name } } }
    `;
    expect(codeOf(() => enforce(source, { maxQueryDepth: 3 }))).toBe('QUERY_TOO_DEEP');
    expect(enforce(source, { maxQueryDepth: 4 }).depth).toBe(4);
  });

  it('does not charge an inline fragment as a level of its own', () => {
    expect(enforce('{ user(id: "1") { ... on User { name } } }').depth).toBe(2);
  });

  it('does not hang on a cyclic fragment', () => {
    const source = `
      { user(id: "1") { ...a } }
      fragment a on User { manager { ...a } }
    `;
    // Cyclic documents are rejected by GraphQL validation; the walk only has to
    // terminate rather than diagnose them.
    expect(() => enforce(source, { maxQueryDepth: 50 })).not.toThrow();
  });
});

describe('page size', () => {
  it('rejects a literal first above the limit', () => {
    expect(codeOf(() => enforce('{ users(first: 500) { nodes { id } } }', { maxPageSize: 100 }))).toBe(
      'PAGE_SIZE_TOO_LARGE'
    );
  });

  it('rejects a last above the limit too', () => {
    expect(codeOf(() => enforce('{ users(last: 500) { nodes { id } } }', { maxPageSize: 100 }))).toBe(
      'PAGE_SIZE_TOO_LARGE'
    );
  });

  it('rejects a page size passed through a variable', () => {
    expect(
      codeOf(() =>
        enforce(
          'query ($n: Int) { users(first: $n) { nodes { id } } }',
          { maxPageSize: 100 },
          { n: 500 }
        )
      )
    ).toBe('PAGE_SIZE_TOO_LARGE');
  });

  it('accepts a page size at the limit', () => {
    expect(() => enforce('{ users(first: 100) { nodes { id } } }', { maxPageSize: 100 })).not.toThrow();
  });
});

describe('cost', () => {
  it('charges a connection its page size', () => {
    expect(enforce('{ users(first: 100) { nodes { id } } }').cost).toBe(100);
  });

  it('multiplies a nested connection by the one above it', () => {
    expect(
      enforce('{ users(first: 100) { nodes { posts(first: 50) { nodes { id } } } } }').cost
    ).toBe(100 + 100 * 50);
  });

  it('does not charge plain fields, so a wide flat selection stays cheap', () => {
    expect(enforce('{ user(id: "1") { id name manager { id name } } }').cost).toBe(0);
  });

  it('rejects an operation whose nesting exceeds the cost limit', () => {
    expect(
      codeOf(() =>
        enforce('{ users(first: 1000) { nodes { posts(first: 1000) { nodes { id } } } } }', {
          maxPageSize: 1_000,
          maxQueryCost: 100_000
        })
      )
    ).toBe('QUERY_TOO_COSTLY');
  });

  it('charges an unpaged connection an assumed page size rather than nothing', () => {
    expect(enforce('{ users { nodes { id } } }').cost).toBe(100);
  });
});

describe('introspection', () => {
  it('rejects __schema when the tenant has introspection off', () => {
    expect(codeOf(() => enforce('{ __schema { queryType { name } } }'))).toBe(
      'INTROSPECTION_DISABLED'
    );
  });

  it('rejects __type as well', () => {
    expect(codeOf(() => enforce('{ __type(name: "User") { name } }'))).toBe(
      'INTROSPECTION_DISABLED'
    );
  });

  it('allows introspection when the tenant enabled it', () => {
    expect(() =>
      enforce('{ __schema { queryType { name } } }', { enableIntrospection: true })
    ).not.toThrow();
  });

  it('never blocks __typename, which is not introspection of the schema', () => {
    expect(() => enforce('{ user(id: "1") { __typename name } }')).not.toThrow();
  });
});

describe('operation selection', () => {
  it('measures the named operation the request will run, not the first in the document', () => {
    const document = parse(`
      query cheap { user(id: "1") { name } }
      query deep { user(id: "1") { manager { manager { name } } } }
    `);

    expect(() =>
      enforceDocumentProtection(schema, document, {}, protection({ maxQueryDepth: 3 }), 'cheap')
    ).not.toThrow();
    expect(() =>
      enforceDocumentProtection(schema, document, {}, protection({ maxQueryDepth: 3 }), 'deep')
    ).toThrow();
  });

  it('measures nothing when the document has no operation', () => {
    const document = parse('fragment orphan on User { name }');
    expect(enforceDocumentProtection(schema, document, {}, protection())).toEqual({
      depth: 0,
      cost: 0
    });
  });
});
