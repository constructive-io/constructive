/**
 * Re-export core types from @constructive-io/graphql-query.
 */

// Re-export everything from the canonical source
export {
  type ASTFunctionParams,
  type ASTNode,
  type GraphQLVariables,
  type GraphQLVariableValue,
  type IQueryBuilder,
  isGraphQLVariables,
  isGraphQLVariableValue,
  type MetaConstraint,
  type MetaField,
  type MetaFieldType,
  type MetaForeignConstraint,
  type MetaObject,
  type MetaTable,
  type MutationASTParams,
  type MutationDefinition,
  type NestedProperties,
  type ObjectArrayItem,
  type QueryBuilderInstance,
  type QueryBuilderOptions,
  type QueryBuilderResult,
  type QueryDefinition,
  type QueryFieldSelection,
  type QueryProperty,
  type QuerySelectionOptions,
  type StrictRecord,
} from '@constructive-io/graphql-query';
