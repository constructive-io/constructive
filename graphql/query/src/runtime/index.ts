/**
 * Runtime sub-export for generated ORM code.
 *
 * Generated ORM clients need runtime dependencies at execution time.
 * This module re-exports so generated code can consolidate imports:
 *   - @0no-co/graphql.web              — parseType, print
 *   - @constructive-io/graphql-types   — GraphQLAdapter, GraphQLError, QueryResult
 *   - @constructive-io/fetch           — createFetch (isomorphic *.localhost-aware fetch)
 *
 * gql-ast is intentionally NOT re-exported here because the templates
 * use `import * as t from 'gql-ast'` — mixing it into this namespace
 * would pollute `t` with unrelated symbols like parseType and print.
 *
 * Usage in generated templates:
 *   import { parseType, print, createFetch } from '@constructive-io/graphql-query/runtime';
 *   import * as t from 'gql-ast';
 *   import type { GraphQLAdapter } from '@constructive-io/graphql-query/runtime';
 */

export { parseType, print } from '@0no-co/graphql.web';

export type { GraphQLAdapter, GraphQLError, QueryResult } from '@constructive-io/graphql-types';

export { createFetch } from '@constructive-io/fetch';
export type { FetchFunction } from '@constructive-io/fetch';
