/**
 * Re-export core types from @constructive-io/graphql-query.
 *
 * This file used to contain the canonical type definitions. They now live in
 * the `graphql-query` package and are re-exported here for backward
 * compatibility so existing codegen consumers continue to work unchanged.
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

// Backward-compatible alias: codegen historically used `IntrospectionSchema`
// while graphql-query renamed it to `QueryIntrospectionSchema` to avoid
// collision with the standard GraphQL IntrospectionSchema type.
export { type QueryIntrospectionSchema as IntrospectionSchema } from '@constructive-io/graphql-query';
