import type { GraphileConfig } from 'graphile-config';
import type { DocumentNode, GraphQLError } from 'graphql';

/**
 * Variables type that accepts plain objects and interfaces without requiring
 * an explicit index signature. Using `Record<string, any>` allows TypeScript
 * to accept typed interfaces like { username: string } since `any` is bi-directionally
 * assignable to all types.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Variables = Record<string, any>;

export interface GraphQLQueryOptions<TVariables extends Variables = Variables> {
  query: string | DocumentNode;
  variables?: TVariables;
  commit?: boolean;
  reqOptions?: Record<string, unknown>;
}

export interface GraphQLTestContext {
  setup: () => Promise<void>;
  teardown: () => Promise<void>;
  query: <TResult = unknown, TVariables extends Variables = Variables>(
    opts: GraphQLQueryOptions<TVariables>
  ) => Promise<TResult>;
}

/**
 * Input for GraphQL test connections.
 */

export interface GetConnectionsInput {
  useRoot?: boolean;
  schemas: string[];
  authRole?: string;
  /**
   * V5 preset configuration.
   * Can include extends, plugins, schema options, etc.
   */
  preset?: GraphileConfig.Preset;
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: readonly GraphQLError[];
}

export type GraphQLQueryFnObj = <TResult = unknown, TVariables extends Variables = Variables>(
  opts: GraphQLQueryOptions<TVariables>
) => Promise<GraphQLResponse<TResult>>;

export type GraphQLQueryFn = <TResult = unknown, TVariables extends Variables = Variables>(
  query: string | DocumentNode,
  variables?: TVariables,
  commit?: boolean,
  reqOptions?: Record<string, unknown>
) => Promise<GraphQLResponse<TResult>>;

export type GraphQLQueryUnwrappedFnObj = <TResult = unknown, TVariables extends Variables = Variables>(
  opts: GraphQLQueryOptions<TVariables>
) => Promise<TResult>;

export type GraphQLQueryUnwrappedFn = <TResult = unknown, TVariables extends Variables = Variables>(
  query: string | DocumentNode,
  variables?: TVariables,
  commit?: boolean,
  reqOptions?: Record<string, unknown>
) => Promise<TResult>;
