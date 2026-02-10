/**
 * TypeScript utility types for ORM select inference
 *
 * These types enable Prisma-like type inference where the return type
 * is automatically derived from the `select` object passed to queries.
 *
 * Example:
 * ```typescript
 * const user = await db.user.findFirst({
 *   select: { id: true, name: true }
 * }).execute();
 * // user type is { id: string; name: string } | null
 * ```
 */

/**
 * Extracts the element type from an array or connection type
 */
export type ElementType<T> = T extends (infer E)[]
  ? E
  : T extends { nodes: (infer E)[] }
    ? E
    : T;

/**
 * Checks if a type is a connection type (has nodes array)
 */
export type IsConnection<T> = T extends { nodes: unknown[]; totalCount: number }
  ? true
  : false;

/**
 * Base select type - maps fields to boolean or nested select config
 * This is generated per-entity
 */
export type SelectConfig<TFields extends string> = {
  [K in TFields]?: boolean | NestedSelectConfig;
};

/**
 * Nested select configuration for relations
 */
export interface NestedSelectConfig {
  select?: Record<string, boolean | NestedSelectConfig>;
  first?: number;
  last?: number;
  after?: string;
  before?: string;
  filter?: Record<string, unknown>;
  orderBy?: string[];
}

type DepthLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
type DecrementDepth = {
  0: 0;
  1: 0;
  2: 1;
  3: 2;
  4: 3;
  5: 4;
  6: 5;
  7: 6;
  8: 7;
  9: 8;
  10: 9;
};

/**
 * Recursively validates select objects, rejecting unknown keys.
 *
 * NOTE: Depth is intentionally capped to avoid circular-instantiation issues
 * in very large cyclic schemas.
 */
export type DeepExact<
  T,
  Shape,
  Depth extends DepthLevel = 10,
> = Depth extends 0
  ? T extends Shape
    ? T
    : never
  : T extends Shape
    ? Exclude<keyof T, keyof Shape> extends never
      ? {
          [K in keyof T]: K extends keyof Shape
            ? T[K] extends { select: infer NS }
              ? Extract<Shape[K], { select?: unknown }> extends {
                  select?: infer ShapeNS;
                }
                ? DeepExact<
                    Omit<T[K], 'select'> & {
                      select: DeepExact<
                        NS,
                        NonNullable<ShapeNS>,
                        DecrementDepth[Depth]
                      >;
                    },
                    Extract<Shape[K], { select?: unknown }>,
                    DecrementDepth[Depth]
                  >
                : never
              : T[K]
            : never;
        }
      : never
    : never;

/**
 * Enforces exact select shape while keeping contextual typing on `S extends XxxSelect`.
 * Use this as an intersection in overloads:
 * `{ select: S } & StrictSelect<S, XxxSelect>`.
 */
export type StrictSelect<S, Shape> = S extends DeepExact<S, Shape> ? {} : never;

/**
 * Hook-optimized strict select variant.
 *
 * Uses a shallower recursion depth to keep editor autocomplete responsive
 * in large schemas while still validating common nested-select mistakes.
 */
export type HookStrictSelect<S, Shape> = S extends DeepExact<S, Shape, 5>
  ? {}
  : never;

/**
 * Infers the result type from a select configuration
 *
 * Rules:
 * - If field is `true`, include the field with its original type
 * - If field is `false` or not present, exclude the field
 * - If field is an object with `select`, recursively apply inference
 * - For connection types, preserve the connection structure
 */
export type InferSelectResult<TEntity, TSelect> = TSelect extends undefined
  ? TEntity
  : {
      [K in keyof TSelect as TSelect[K] extends false | undefined
        ? never
        : K]: TSelect[K] extends true
        ? K extends keyof TEntity
          ? TEntity[K]
          : never
        : TSelect[K] extends { select: infer NestedSelect }
          ? K extends keyof TEntity
            ? NonNullable<TEntity[K]> extends ConnectionResult<infer NodeType>
              ? ConnectionResult<InferSelectResult<NodeType, NestedSelect>>
              :
                  | InferSelectResult<NonNullable<TEntity[K]>, NestedSelect>
                  | (null extends TEntity[K] ? null : never)
            : never
          : K extends keyof TEntity
            ? TEntity[K]
            : never;
    };

/**
 * Makes all properties in the result optional for partial selects
 * Used when select is not provided (returns all fields)
 */
export type PartialEntity<T> = {
  [K in keyof T]?: T[K];
};

/**
 * Result wrapper that matches GraphQL response structure
 */
export interface QueryResult<T> {
  data: T | null;
  errors?: GraphQLError[];
}

/**
 * GraphQL error type
 */
export interface GraphQLError {
  message: string;
  locations?: { line: number; column: number }[];
  path?: (string | number)[];
  extensions?: Record<string, unknown>;
}

/**
 * Connection result type for list queries
 */
export interface ConnectionResult<T> {
  nodes: T[];
  totalCount: number;
  pageInfo: PageInfo;
}

/**
 * PageInfo type from GraphQL connections
 */
export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string | null;
  endCursor?: string | null;
}

/**
 * Arguments for findMany operations
 */
export interface FindManyArgs<TSelect, TWhere, TOrderBy> {
  select?: TSelect;
  where?: TWhere;
  orderBy?: TOrderBy[];
  first?: number;
  last?: number;
  after?: string;
  before?: string;
  offset?: number;
}

/**
 * Arguments for findFirst/findUnique operations
 */
export interface FindFirstArgs<TSelect, TWhere> {
  select?: TSelect;
  where?: TWhere;
}

/**
 * Arguments for create operations
 */
export interface CreateArgs<TSelect, TData> {
  data: TData;
  select?: TSelect;
}

/**
 * Arguments for update operations
 */
export interface UpdateArgs<TSelect, TWhere, TData> {
  where: TWhere;
  data: TData;
  select?: TSelect;
}

/**
 * Arguments for delete operations
 */
export interface DeleteArgs<TWhere, TSelect = undefined> {
  where: TWhere;
  select?: TSelect;
}

/**
 * Helper type to get the final result type from a query
 * Handles the case where select is optional
 */
export type ResolveSelectResult<TEntity, TSelect> = TSelect extends undefined
  ? TEntity
  : InferSelectResult<TEntity, NonNullable<TSelect>>;

/**
 * Type for operation that returns a single entity or null
 */
export type SingleResult<TEntity, TSelect> = QueryResult<{
  [K: string]: ResolveSelectResult<TEntity, TSelect> | null;
}>;

/**
 * Type for operation that returns a connection
 */
export type ConnectionQueryResult<TEntity, TSelect> = QueryResult<{
  [K: string]: ConnectionResult<ResolveSelectResult<TEntity, TSelect>>;
}>;

/**
 * Type for mutation that returns a payload with the entity
 */
export type MutationResult<
  TEntity,
  TSelect,
  TPayloadKey extends string,
> = QueryResult<{
  [K in TPayloadKey]: {
    [EntityKey: string]: ResolveSelectResult<TEntity, TSelect>;
  };
}>;
