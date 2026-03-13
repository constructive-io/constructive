import type { SQL } from 'pg-sql2';
import type { GraphQLInputType } from 'graphql';

/**
 * Symbol used to store the filter operator registry on the build object.
 */
export const $$filters = Symbol('connectionFilters');

/**
 * Specification for a filter operator.
 *
 * This is the contract that satellite plugins (PostGIS, search, pgvector, etc.)
 * use when calling `addConnectionFilterOperator`.
 */
export interface ConnectionFilterOperatorSpec {
  /** Human-readable description for the GraphQL schema. */
  description?: string;

  /**
   * Core resolve function: given the SQL identifier for the column and the SQL
   * value for the user input, return a SQL fragment for the WHERE clause.
   */
  resolve: (
    sqlIdentifier: SQL,
    sqlValue: SQL,
    input: unknown,
    $where: any,
    details: { fieldName: string | null; operatorName: string }
  ) => SQL;

  /**
   * Optional: transform the user input before encoding to SQL.
   * e.g. wrapping a LIKE pattern with `%`.
   */
  resolveInput?: (input: unknown) => unknown;

  /**
   * Optional: override the codec used for encoding the input value to SQL.
   * Receives the column's codec and returns the codec to use for the input.
   */
  resolveInputCodec?: (codec: any) => any;

  /**
   * Optional: override the SQL identifier and its codec.
   * Useful for casting columns (e.g. citext -> text for case-sensitive matching).
   */
  resolveSqlIdentifier?: (sqlIdentifier: SQL, codec: any) => [SQL, any];

  /**
   * Optional: completely override how the SQL value is generated.
   * Receives the $where plan, the raw input value, and the resolved input codec.
   */
  resolveSqlValue?: ($where: any, value: unknown, inputCodec: any) => SQL;

  /**
   * Optional: override the GraphQL input type for this operator.
   * Receives the default field input type and returns the type to use.
   */
  resolveType?: (fieldType: GraphQLInputType) => GraphQLInputType;
}

/**
 * A single operator registration returned by a factory function.
 * Declares which type(s) the operator applies to, its name, and its spec.
 */
export interface ConnectionFilterOperatorRegistration {
  /** The GraphQL type name(s) this operator applies to (e.g. 'String', 'Int', or an array). */
  typeNames: string | string[];
  /** The operator field name (e.g. 'similarTo', 'matches', 'intersects'). */
  operatorName: string;
  /** The operator specification (resolve function, description, etc.). */
  spec: ConnectionFilterOperatorSpec;
}

/**
 * A factory function that receives the build object and returns operator registrations.
 * This is the declarative replacement for `build.addConnectionFilterOperator()`.
 *
 * Satellite plugins declare these in their preset's `connectionFilterOperatorFactories`
 * option. The connection filter plugin processes them during its own init hook,
 * eliminating timing dependencies between plugins.
 *
 * @example
 * ```typescript
 * const myFactory: ConnectionFilterOperatorFactory = (build) => [
 *   {
 *     typeNames: 'String',
 *     operatorName: 'similarTo',
 *     spec: {
 *       description: 'Fuzzy match',
 *       resolve: (i, v) => build.sql`similarity(${i}, ${v}) > 0.3`,
 *     },
 *   },
 * ];
 * ```
 */
export type ConnectionFilterOperatorFactory = (
  build: any
) => ConnectionFilterOperatorRegistration[];

/**
 * Configuration options for the connection filter preset.
 */
export interface ConnectionFilterOptions {
  /** Allow filtering on array columns. Default: true */
  connectionFilterArrays?: boolean;
  /** Include logical operators (and/or/not). Default: true */
  connectionFilterLogicalOperators?: boolean;
  /** Allow null literals in filter input. Default: false */
  connectionFilterAllowNullInput?: boolean;
  /** Restrict which field types can be filtered. Default: all types */
  connectionFilterAllowedFieldTypes?: string[];
  /** Restrict which operators are available. Default: all operators */
  connectionFilterAllowedOperators?: string[];
  /** Rename operators. Keys are default names, values are custom names. */
  connectionFilterOperatorNames?: Record<string, string>;
  /** Allow filtering on setof functions. Default: true */
  connectionFilterSetofFunctions?: boolean;
  /** Allow filtering on computed columns. Default: true */
  connectionFilterComputedColumns?: boolean;
  /** Allow filtering on related tables via FK relationships. Default: false */
  connectionFilterRelations?: boolean;
  /** Only create relation filter fields for FKs with supporting indexes.
   * Prevents EXISTS subqueries that would cause sequential scans on large tables.
   * Default: true */
  connectionFilterRelationsRequireIndex?: boolean;
  /**
   * Declarative operator factories. Each factory receives the build object and
   * returns an array of operator registrations. This replaces the imperative
   * `build.addConnectionFilterOperator()` API.
   *
   * Satellite plugins (PostGIS, search, pg_trgm, etc.) declare their operators
   * here instead of calling `addConnectionFilterOperator` in an init hook.
   * The connection filter plugin processes all factories during its own init,
   * eliminating timing/ordering dependencies.
   */
  connectionFilterOperatorFactories?: ConnectionFilterOperatorFactory[];
}

/**
 * Digest of operator type information for a given codec.
 * Used to determine which filter type (e.g. StringFilter, IntFilter) to create.
 */
export interface ConnectionFilterOperatorsDigest {
  isList: boolean;
  operatorsTypeName: string;
  relatedTypeName: string;
  inputTypeName: string;
  rangeElementInputTypeName: string | null;
  domainBaseTypeName: string | null;
}

/**
 * Scope metadata stored on operator filter types (e.g. StringFilter, IntFilter).
 */
export interface PgConnectionFilterOperatorsScope {
  isList: boolean;
  pgCodecs: any[];
  inputTypeName: string;
  rangeElementInputTypeName: string | null;
  domainBaseTypeName: string | null;
}
