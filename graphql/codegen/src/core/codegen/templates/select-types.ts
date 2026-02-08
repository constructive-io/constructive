/**
 * Type utilities for select inference
 *
 * This is the RUNTIME code that gets copied to generated output.
 * Provides type utilities for ORM select operations.
 *
 * NOTE: This file is read at codegen time and written to output.
 * Any changes here will affect all generated ORM clients.
 */

export interface ConnectionResult<T> {
  nodes: T[];
  totalCount: number;
  pageInfo: PageInfo;
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string | null;
  endCursor?: string | null;
}

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

export interface FindFirstArgs<TSelect, TWhere> {
  select?: TSelect;
  where?: TWhere;
}

export interface CreateArgs<TSelect, TData> {
  data: TData;
  select?: TSelect;
}

export interface UpdateArgs<TSelect, TWhere, TData> {
  where: TWhere;
  data: TData;
  select?: TSelect;
}

export type FindOneArgs<
  TSelect,
  TIdName extends string = 'id',
  TId = string,
> = {
  select?: TSelect;
} & Record<TIdName, TId>;

export interface DeleteArgs<TWhere, TSelect = undefined> {
  where: TWhere;
  select?: TSelect;
}

/**
 * Recursively validates select objects, rejecting unknown keys.
 *
 * NOTE: This type is intentionally NOT used in generated parameter positions
 * (conditional types block IDE autocompletion). Parameters use `S` directly
 * with `S extends XxxSelect` constraints, which provides full
 * autocompletion via TypeScript's contextual typing.
 *
 * @example
 * // This will cause a type error because 'invalid' doesn't exist:
 * type Result = DeepExact<{ id: true, invalid: true }, { id?: boolean }>;
 * // Result = never (causes assignment error)
 *
 * @example
 * // This works because all fields are valid:
 * type Result = DeepExact<{ id: true }, { id?: boolean; name?: boolean }>;
 * // Result = { id: true }
 */
export type DeepExact<T, Shape> = T extends Shape
  ? Exclude<keyof T, keyof Shape> extends never
    ? {
        [K in keyof T]: K extends keyof Shape
          ? T[K] extends { select: infer NS }
            ? Extract<Shape[K], { select?: unknown }> extends {
                select?: infer ShapeNS;
              }
              ? DeepExact<
                  Omit<T[K], 'select'> & {
                    select: DeepExact<NS, NonNullable<ShapeNS>>;
                  },
                  Extract<Shape[K], { select?: unknown }>
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
 * Infer result type from select configuration
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
