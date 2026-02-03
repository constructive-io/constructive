import type { GraphileConfig } from 'graphile-config';
import type { DocumentNode, GraphQLError } from 'graphql';

export interface GraphQLQueryOptions<TVariables extends Record<string, unknown> = Record<string, unknown>> {
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

/**
 * V5 Preset-based input for GraphQL test connections.
 *
 * Instead of the v4 pattern with appendPlugins and graphileBuildOptions,
 * v5 uses presets that can be extended and composed.
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

export type GraphQLQueryFnObj = <TResult = unknown, TVariables extends Record<string, unknown> = Record<string, unknown>>(
  opts: GraphQLQueryOptions<TVariables>
) => Promise<GraphQLResponse<TResult>>;

export type GraphQLQueryFn = <TResult = unknown, TVariables extends Record<string, unknown> = Record<string, unknown>>(
  query: string | DocumentNode,
  variables?: TVariables,
  commit?: boolean,
  reqOptions?: Record<string, unknown>
) => Promise<GraphQLResponse<TResult>>;

export type GraphQLQueryUnwrappedFnObj = <TResult = unknown, TVariables extends Record<string, unknown> = Record<string, unknown>>(
  opts: GraphQLQueryOptions<TVariables>
) => Promise<TResult>;

export type GraphQLQueryUnwrappedFn = <TResult = unknown, TVariables extends Record<string, unknown> = Record<string, unknown>>(
  query: string | DocumentNode,
  variables?: TVariables,
  commit?: boolean,
  reqOptions?: Record<string, unknown>
) => Promise<TResult>;
