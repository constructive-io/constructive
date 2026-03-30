/**
 * Re-export core types from @constructive-io/graphql-query.
 */

// Re-export everything from the canonical source
export {
  type ASTNode,
  type NestedProperties,
  type QueryProperty,
  type QueryDefinition,
  type MutationDefinition,
  type MetaFieldType,
  type MetaField,
  type MetaConstraint,
  type MetaForeignConstraint,
  type MetaTable,
  type MetaObject,
  type GraphQLVariableValue,
  type GraphQLVariables,
  type QueryFieldSelection,
  type QuerySelectionOptions,
  type QueryBuilderInstance,
  type ASTFunctionParams,
  type MutationASTParams,
  type QueryBuilderOptions,
  type QueryBuilderResult,
  type IQueryBuilder,
  type ObjectArrayItem,
  isGraphQLVariableValue,
  isGraphQLVariables,
  type StrictRecord,
} from '@constructive-io/graphql-query';
