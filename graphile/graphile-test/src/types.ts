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
 * Legacy v4-style GraphQL options for backward compatibility.
 *
 * @deprecated Use `preset` instead for v5 configuration.
 */
export interface LegacyGraphileOptions {
  /**
   * V4-style plugins to append.
   * These plugins use the builder.hook() API which is NOT compatible with v5.
   * For v5, convert these to proper v5 plugins and use the `preset` option instead.
   *
   * @deprecated Use preset.plugins for v5 plugins
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  appendPlugins?: any[];
  /**
   * V4-style graphile build options.
   *
   * @deprecated Use preset.schema for v5 schema options
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  graphileBuildOptions?: Record<string, any>;
  /**
   * V4-style PostGraphile options override.
   *
   * @deprecated Use preset for v5 configuration
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  overrideSettings?: Record<string, any>;
}

/**
 * Input for GraphQL test connections.
 *
 * Supports both v5 preset-based configuration (recommended) and
 * legacy v4-style configuration (deprecated, for backward compatibility).
 */
export interface GetConnectionsInput {
  useRoot?: boolean;
  schemas: string[];
  authRole?: string;
  /**
   * V5 preset configuration (recommended).
   * Can include extends, plugins, schema options, etc.
   */
  preset?: GraphileConfig.Preset;
  /**
   * Legacy v4-style graphile options for backward compatibility.
   *
   * NOTE: v4-style plugins (using builder.hook()) are NOT compatible with v5.
   * If you use appendPlugins with v4 plugins, they will be ignored.
   * Convert your plugins to v5 format and use the `preset` option instead.
   *
   * @deprecated Use preset for v5 configuration
   */
  graphile?: LegacyGraphileOptions;
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
