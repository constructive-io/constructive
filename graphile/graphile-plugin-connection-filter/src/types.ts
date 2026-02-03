/**
 * Types for graphile-plugin-connection-filter v5
 *
 * This file contains type definitions that are used internally by the plugin
 * but may also be useful for consumers extending the filter functionality.
 */

import type { PgCondition, PgCodec, PgConditionCapableParent } from '@dataplan/pg';
import type { InputObjectFieldApplyResolver } from 'grafast';
import type { GraphQLInputType } from 'graphql';
import type { SQL } from 'pg-sql2';

/**
 * Categories of filter operators based on PostgreSQL type characteristics.
 *
 * - "Array": For PostgreSQL array types (e.g., integer[], text[])
 * - "Range": For PostgreSQL range types (e.g., int4range, tsrange)
 * - "Enum": For PostgreSQL enum types
 * - "Domain": For PostgreSQL domain types
 * - "Scalar": For basic scalar types (e.g., integer, text, boolean)
 */
export type OperatorsCategory = 'Array' | 'Range' | 'Enum' | 'Domain' | 'Scalar';

/**
 * Specification for a filter operator.
 *
 * This interface defines how a filter operator should behave, including
 * how to transform inputs, resolve SQL identifiers, and generate the
 * final SQL condition.
 *
 * @example
 * ```ts
 * const equalToOperator: OperatorSpec = {
 *   description: "Equal to the specified value.",
 *   resolve: (i, v) => sql`${i} = ${v}`,
 * };
 * ```
 */
export interface OperatorSpec {
  /**
   * Optional name override for the operator.
   * If not provided, the key used when registering the operator will be used.
   */
  name?: string;

  /**
   * Human-readable description of what this operator does.
   * This will be exposed in the GraphQL schema documentation.
   */
  description: string;

  /**
   * Optional function to transform the SQL identifier (column reference)
   * before comparison. Useful for type casting or function wrapping.
   *
   * @param sqlIdentifier - The SQL fragment representing the column
   * @param codec - The PgCodec for the column's type
   * @returns A tuple of [transformed SQL, transformed codec]
   *
   * @example
   * ```ts
   * // Cast citext to text for case-sensitive comparison
   * resolveSqlIdentifier: (id, codec) => [sql`${id}::text`, TYPES.text]
   * ```
   */
  resolveSqlIdentifier?: (
    sqlIdentifier: SQL,
    codec: PgCodec<any, any, any, any, any, any, any>
  ) => readonly [SQL, PgCodec<any, any, any, any, any, any, any>];

  /**
   * Optional function to transform the input value before it's converted to SQL.
   *
   * @param input - The raw input value from GraphQL
   * @returns The transformed input value
   *
   * @example
   * ```ts
   * // Wrap input for LIKE pattern matching
   * resolveInput: (input) => `%${escapeLikeWildcards(input)}%`
   * ```
   */
  resolveInput?: (input: unknown) => unknown;

  /**
   * Optional function to determine the PgCodec to use for the input value.
   * This affects how the input is serialized to SQL.
   *
   * @param expressionCodec - The codec of the expression being filtered
   * @returns The codec to use for the input value
   *
   * @example
   * ```ts
   * // Force boolean input for isNull operator
   * resolveInputCodec: () => TYPES.boolean
   * ```
   */
  resolveInputCodec?: (
    expressionCodec: PgCodec<any, any, any, any, any, any, any>
  ) => PgCodec<any, any, any, any, any, any, any>;

  /**
   * @deprecated Use resolveSqlValue instead
   */
  resolveSql?: any;

  /**
   * Optional function to generate the SQL value from the input.
   * Use this for custom SQL value generation beyond standard codec serialization.
   *
   * @param parent - The condition-capable parent step
   * @param value - The input value
   * @param codec - The codec to use for serialization
   * @returns SQL fragment for the value
   */
  resolveSqlValue?: (
    parent: PgConditionCapableParent,
    value: any,
    codec: PgCodec<any, any, any, any, any, any, any>
  ) => SQL;

  /**
   * The main resolve function that generates the SQL condition.
   *
   * @param sqlIdentifier - SQL fragment for the column/expression being filtered
   * @param sqlValue - SQL fragment for the comparison value
   * @param input - The raw input value (before transformation)
   * @param parent - The condition-capable parent step
   * @param details - Additional context about the filter operation
   * @returns SQL fragment representing the condition
   *
   * @example
   * ```ts
   * // Simple equality check
   * resolve: (i, v) => sql`${i} = ${v}`
   *
   * // IS NULL check (ignores sqlValue, uses input directly)
   * resolve: (i, _v, input) => sql`${i} ${input ? sql`IS NULL` : sql`IS NOT NULL`}`
   * ```
   */
  resolve: (
    sqlIdentifier: SQL,
    sqlValue: SQL,
    input: unknown,
    parent: PgConditionCapableParent,
    details: {
      fieldName: string | null;
      operatorName: string;
    }
  ) => SQL;

  /**
   * Optional function to transform the GraphQL input type for this operator.
   * Useful for operators that need a different input type than the field type.
   *
   * @param type - The default GraphQL input type
   * @returns The transformed GraphQL input type
   *
   * @example
   * ```ts
   * // Make list items non-nullable for "in" operator
   * resolveType: (type) => {
   *   if (isListType(type) && !isNonNullType(type.ofType)) {
   *     return new GraphQLList(new GraphQLNonNull(type.ofType));
   *   }
   *   return type;
   * }
   * ```
   */
  resolveType?: (type: GraphQLInputType) => GraphQLInputType;
}

/**
 * Configuration options for connection filters.
 * These can be set in the schema options of your GraphileConfig.Preset.
 */
export interface ConnectionFilterOptions {
  /**
   * List of operator names to allow.
   * If specified, only these operators will be available.
   *
   * @example ['equalTo', 'notEqualTo', 'isNull']
   */
  connectionFilterAllowedOperators?: string[];

  /**
   * List of GraphQL type names to allow filtering on.
   * If specified, only fields of these types will have filter operators.
   *
   * @example ['String', 'Int', 'UUID']
   */
  connectionFilterAllowedFieldTypes?: string[];

  /**
   * Map of operator name overrides.
   * Keys are the default operator names, values are the custom names to use.
   *
   * @example { equalTo: 'eq', notEqualTo: 'neq' }
   */
  connectionFilterOperatorNames?: Record<string, string>;

  /**
   * @deprecated v4 option, no longer used in v5
   */
  connectionFilterUseListInflectors?: boolean;

  /**
   * Whether to enable filtering on array columns.
   * @default true
   */
  connectionFilterArrays?: boolean;

  /**
   * Whether to enable filtering on computed columns (functions).
   * @default true
   */
  connectionFilterComputedColumns?: boolean;

  /**
   * Whether to enable filtering on relations (foreign keys).
   * @default false
   */
  connectionFilterRelations?: boolean;

  /**
   * Whether to enable filtering on setof functions.
   * @default true
   */
  connectionFilterSetofFunctions?: boolean;

  /**
   * Whether to enable logical operators (and, or, not).
   * @default true
   */
  connectionFilterLogicalOperators?: boolean;

  /**
   * Whether to allow null as a filter value (treated as "no filter").
   * @default false
   */
  connectionFilterAllowNullInput?: boolean;

  /**
   * Whether to allow empty objects as filter values (treated as "no filter").
   * @default false
   */
  connectionFilterAllowEmptyObjectInput?: boolean;

  /**
   * @deprecated v4 option for simple collections
   */
  pgSimpleCollections?: 'omit' | 'both' | 'only';

  /**
   * @deprecated v4 option for list suffix
   */
  pgOmitListSuffix?: boolean;
}

/**
 * Internal configuration with required defaults applied.
 * This type is used internally after merging user options with defaults.
 */
export type ConnectionFilterConfig = ConnectionFilterOptions & {
  connectionFilterArrays: boolean;
  connectionFilterComputedColumns: boolean;
  connectionFilterRelations: boolean;
  connectionFilterSetofFunctions: boolean;
  connectionFilterLogicalOperators: boolean;
  connectionFilterAllowNullInput: boolean;
  connectionFilterAllowEmptyObjectInput: boolean;
};

/**
 * Result of connectionFilterOperatorsDigest for a codec.
 * Contains information needed to create the filter input type.
 */
export interface ConnectionFilterOperatorsDigest {
  /**
   * Name of the operators type (e.g., "StringFilter", "IntFilter")
   */
  operatorsTypeName: string;

  /**
   * Name of the related GraphQL type (e.g., "String", "Int")
   */
  relatedTypeName: string;

  /**
   * Whether this is for a list/array type
   */
  isList: boolean;

  /**
   * Name of the GraphQL input type for values
   */
  inputTypeName: string;

  /**
   * Name of the range element input type (for range types only)
   */
  rangeElementInputTypeName: string | null;

  /**
   * Name of the domain base type (for domain types only)
   */
  domainBaseTypeName: string | null;
}

/**
 * Function type for creating an apply resolver from an operator spec.
 */
export type MakeApplyFromOperatorSpec = (
  build: GraphileBuild.Build,
  typeName: string,
  fieldName: string,
  spec: OperatorSpec,
  type: GraphQLInputType
) => InputObjectFieldApplyResolver<PgCondition>;
