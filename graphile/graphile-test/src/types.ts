import type { DocumentNode, ExecutionResult, GraphQLError } from 'graphql';
import type { GraphileConfig } from 'graphile-config';

export interface GraphQLQueryOptions<TVariables = Record<string, unknown>> {
  query: string | DocumentNode;
  variables?: TVariables;
  commit?: boolean;
  reqOptions?: Record<string, unknown>;
}

export interface GraphQLTestContext {
  setup: () => Promise<void>;
  teardown: () => Promise<void>;
  query: <TResult = unknown, TVariables extends Record<string, unknown> = Record<string, unknown>>(
    opts: GraphQLQueryOptions<TVariables>
  ) => Promise<TResult>;
}

export interface GetConnectionsInput {
  useRoot?: boolean;
  schemas: string[];
  authRole?: string;
  preset?: GraphileConfig.Preset;
  pgSettings?: Record<string, string>;
}

export interface GraphQLResponse<T> {
  data?: T | null;
  errors?: readonly GraphQLError[];
}

export type GraphQLQueryFnObj = <
  TResult = unknown,
  TVariables extends Record<string, unknown> = Record<string, unknown>,
>(
  opts: GraphQLQueryOptions<TVariables>
) => Promise<GraphQLResponse<TResult>>;

export type GraphQLQueryFn = <
  TResult = unknown,
  TVariables extends Record<string, unknown> = Record<string, unknown>,
>(
  query: string | DocumentNode,
  variables?: TVariables,
  commit?: boolean,
  reqOptions?: Record<string, unknown>
) => Promise<GraphQLResponse<TResult>>;

export type GraphQLQueryUnwrappedFnObj = <
  TResult = unknown,
  TVariables extends Record<string, unknown> = Record<string, unknown>,
>(
  opts: GraphQLQueryOptions<TVariables>
) => Promise<TResult>;

export type GraphQLQueryUnwrappedFn = <
  TResult = unknown,
  TVariables extends Record<string, unknown> = Record<string, unknown>,
>(
  query: string | DocumentNode,
  variables?: TVariables,
  commit?: boolean,
  reqOptions?: Record<string, unknown>
) => Promise<TResult>;
