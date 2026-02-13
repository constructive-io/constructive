import type {
  DocumentNode,
  FieldNode,
  SelectionSetNode,
  VariableDefinitionNode,
} from 'graphql';

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

export interface IntrospectionSchema {
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

// Alias for compatibility with code migrated from other repos
export type CleanField = MetaField;

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

// Selection interfaces with better typing
export interface FieldSelection {
  name: string;
  isObject: boolean;
  fieldDefn?: MetaField;
  selection?: FieldSelection[];
  variables?: GraphQLVariables;
  isBelongTo?: boolean;
}

export interface SelectionOptions {
  [fieldName: string]:
    | boolean
    | {
        select: Record<string, boolean>;
        variables?: GraphQLVariables;
      };
}

// QueryBuilder class interface
export interface QueryBuilderInstance {
  _introspection: IntrospectionSchema;
  _meta: MetaObject;
  _edges?: boolean;
}

// AST function interfaces
export interface ASTFunctionParams {
  queryName: string;
  operationName: string;
  query: QueryDefinition;
  selection: FieldSelection[];
  builder?: QueryBuilderInstance;
}

export interface MutationASTParams {
  mutationName: string;
  operationName: string;
  mutation: MutationDefinition;
  selection?: FieldSelection[];
}

// QueryBuilder interface
export interface QueryBuilderOptions {
  meta: MetaObject;
  introspection: IntrospectionSchema;
}

export interface QueryBuilderResult {
  _hash: string;
  _queryName: string;
  _ast: DocumentNode;
}

// Public QueryBuilder interface
export interface IQueryBuilder {
  query(model: string): IQueryBuilder;
  getMany(options?: { select?: SelectionOptions }): IQueryBuilder;
  getOne(options?: { select?: SelectionOptions }): IQueryBuilder;
  all(options?: { select?: SelectionOptions }): IQueryBuilder;
  count(): IQueryBuilder;
  create(options?: { select?: SelectionOptions }): IQueryBuilder;
  update(options?: { select?: SelectionOptions }): IQueryBuilder;
  delete(options?: { select?: SelectionOptions }): IQueryBuilder;
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
 * Re-export GraphQL execution types for convenience
 */
export type {
  ExecutionResult,
  GraphQLError,
  GraphQLSchema,
} from 'graphql';
