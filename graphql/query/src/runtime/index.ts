/**
 * Runtime sub-export for generated ORM code.
 *
 * Generated ORM clients (query-builder.ts, orm-client.ts) need three runtime
 * dependencies at execution time:
 *   1. @0no-co/graphql.web  — parseType, print
 *   2. gql-ast              — AST builder functions (field, document, etc.)
 *   3. @constructive-io/graphql-types — GraphQLAdapter, GraphQLError, QueryResult
 *
 * This module re-exports all three so generated code imports from one place:
 *   import { parseType, print } from '@constructive-io/graphql-query/runtime';
 *   import * as t from '@constructive-io/graphql-query/runtime';
 *   import type { GraphQLAdapter } from '@constructive-io/graphql-query/runtime';
 */

// From @0no-co/graphql.web — GraphQL parsing/printing
export { parseType, print } from '@0no-co/graphql.web';

// From gql-ast — AST node builders
export * from 'gql-ast';

// From @constructive-io/graphql-types — adapter interface + result types
export type { GraphQLAdapter, GraphQLError, QueryResult } from '@constructive-io/graphql-types';
