import type {
  DocumentNode,
  FieldNode,
  SelectionSetNode,
  VariableDefinitionNode,
} from 'graphql';

import type { CleanField } from './schema';

// GraphQL AST types (re-export what we need from gql-ast)
export type ASTNode =
  | DocumentNode
  | FieldNode
  | SelectionSetNode
  | VariableDefinitionNode;

// Nested property structure for complex mutation inputs
export interface NestedProperties {
  [key: string]: QueryProperty | NestedProperties;
}

// Base interfaces for query definitions
export interface QueryProperty {
  name: string;
  type: string;
  isNotNull: boolean;
  isArray: boolean;
  isArrayNotNull: boolean;
  properties?: NestedProperties; // For nested properties in mutations
}

export interface QueryDefinition {
  model: string;
  qtype: 'getMany' | 'getOne' | 'mutation';
  mutationType?: 'create' | 'patch' | 'delete';
  selection: string[];
  properties: Record<string, QueryProperty>;
}

export interface MutationDefinition extends QueryDefinition {
  qtype: 'mutation';
  mutationType: 'create' | 'patch' | 'delete';
}

/**
 * Runtime QueryBuilder's internal schema map.
 * Named with 'Query' prefix to avoid collision with the standard
 * GraphQL IntrospectionSchema from ./introspection.ts
 */
export interface QueryIntrospectionSchema {
  [key: string]: QueryDefinition | MutationDefinition;
}

// Meta object interfaces with specific types
export interface MetaFieldType {
  gqlType: string;
  isArray: boolean;
  modifier?: string | number | null;
  pgAlias?: string | null;
  pgType?: string | null;
  subtype?: string | null;
  typmod?: number | null;
}

export interface MetaField {
  name: string;
  type: MetaFieldType;
}

// Note: The codegen-style CleanField is in ./schema.ts
// This MetaField is for the QueryBuilder runtime API

export interface MetaConstraint {
  name: string;
  type: MetaFieldType;
  alias?: string;
}

export interface MetaForeignConstraint {
  fromKey: MetaConstraint;
  refTable: string;
  toKey: MetaConstraint;
}

export interface MetaTable {
  name: string;
  fields: MetaField[];
  primaryConstraints: MetaConstraint[];
  uniqueConstraints: MetaConstraint[];
  foreignConstraints: MetaForeignConstraint[];
}

export interface MetaObject {
  tables: MetaTable[];
}

// GraphQL Variables - strictly typed
export type GraphQLVariableValue = string | number | boolean | null;

export interface GraphQLVariables {
  [key: string]:
    | GraphQLVariableValue
    | GraphQLVariableValue[]
    | GraphQLVariables
    | GraphQLVariables[];
}

// Selection interfaces for QueryBuilder runtime API
// Note: These are renamed with 'Query' prefix to avoid collisions with
// the codegen-style FieldSelection/SelectionOptions in ./selection.ts
export interface QueryFieldSelection {
  name: string;
  isObject: boolean;
  fieldDefn?: MetaField | CleanField;
  selection?: QueryFieldSelection[];
  variables?: GraphQLVariables;
  isBelongTo?: boolean;
}

export interface QuerySelectionOptions {
  [fieldName: string]:
    | boolean
    | {
        select: Record<string, boolean>;
        variables?: GraphQLVariables;
      };
}

// QueryBuilder class interface
export interface QueryBuilderInstance {
  _introspection: QueryIntrospectionSchema;
  _meta: MetaObject;
  _edges?: boolean;
}

// AST function interfaces
export interface ASTFunctionParams {
  queryName: string;
  operationName: string;
  query: QueryDefinition;
  selection: QueryFieldSelection[];
  builder?: QueryBuilderInstance;
}

export interface MutationASTParams {
  mutationName: string;
  operationName: string;
  mutation: MutationDefinition;
  selection?: QueryFieldSelection[];
}

// QueryBuilder interface
export interface QueryBuilderOptions {
  meta: MetaObject;
  introspection: QueryIntrospectionSchema;
}

export interface QueryBuilderResult {
  _hash: string;
  _queryName: string;
  _ast: DocumentNode;
}

// Public QueryBuilder interface
export interface IQueryBuilder {
  query(model: string): IQueryBuilder;
  getMany(options?: { select?: QuerySelectionOptions }): IQueryBuilder;
  getOne(options?: { select?: QuerySelectionOptions }): IQueryBuilder;
  all(options?: { select?: QuerySelectionOptions }): IQueryBuilder;
  count(): IQueryBuilder;
  create(options?: { select?: QuerySelectionOptions }): IQueryBuilder;
  update(options?: { select?: QuerySelectionOptions }): IQueryBuilder;
  delete(options?: { select?: QuerySelectionOptions }): IQueryBuilder;
  edges(useEdges: boolean): IQueryBuilder;
  print(): QueryBuilderResult;
}

// Helper type for object array conversion
export interface ObjectArrayItem extends QueryProperty {
  name: string;
  key?: string; // For when we map with key instead of name
}

// Type guards for runtime validation
export function isGraphQLVariableValue(
  value: unknown
): value is GraphQLVariableValue {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

export function isGraphQLVariables(obj: unknown): obj is GraphQLVariables {
  if (!obj || typeof obj !== 'object') return false;

  for (const [key, value] of Object.entries(obj)) {
    if (typeof key !== 'string') return false;

    if (Array.isArray(value)) {
      if (
        !value.every(
          (item) => isGraphQLVariableValue(item) || isGraphQLVariables(item)
        )
      ) {
        return false;
      }
    } else if (!isGraphQLVariableValue(value) && !isGraphQLVariables(value)) {
      return false;
    }
  }

  return true;
}

// Utility type for ensuring strict typing
export type StrictRecord<K extends PropertyKey, V> = Record<K, V> & {
  [P in PropertyKey]: P extends K ? V : never;
};

// =============================================================================
// Executor Types
// =============================================================================

/**
 * Configuration options for QueryExecutor
 */
export interface ExecutorOptions {
  /** PostgreSQL connection string */
  connectionString: string;
  /** Database schemas to expose in the GraphQL schema */
  schemas: string[];
  /** PostgreSQL settings to apply (e.g., { role: 'authenticated' }) */
  pgSettings?: Record<string, string>;
  /** Maximum number of cached executor instances (default: 10) */
  maxCacheSize?: number;
}

/**
 * Cache statistics for QueryExecutor
 */
export interface ExecutorCacheStats {
  size: number;
  maxSize: number;
}

/**
 * Re-export GraphQL execution types for convenience.
 * Note: GraphQLError is NOT re-exported here to avoid collision with
 * the client/error.ts GraphQLError interface (which is the PostGraphile-oriented one).
 */
export type { ExecutionResult, GraphQLSchema } from 'graphql';
