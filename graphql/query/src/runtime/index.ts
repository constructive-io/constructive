/**
 * Runtime sub-export for generated ORM code.
 *
 * Generated ORM clients need runtime dependencies at execution time.
 * This module re-exports so generated code can consolidate imports:
 *   - @0no-co/graphql.web  — parseType, print
 *   - @constructive-io/graphql-types — GraphQLAdapter, GraphQLError, QueryResult
 *   - ./localhost-fetch — createFetch (isomorphic *.localhost-aware fetch)
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

// From @0no-co/graphql.web — GraphQL parsing/printing
export { parseType, print } from '@0no-co/graphql.web';

// From @constructive-io/graphql-types — adapter interface + result types
export type { GraphQLAdapter, GraphQLError, QueryResult } from '@constructive-io/graphql-types';

// Isomorphic fetch with *.localhost DNS + Host header fix for Node.js
export { createFetch } from './localhost-fetch';
export type { FetchFunction } from './localhost-fetch';
