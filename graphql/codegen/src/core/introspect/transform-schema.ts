/**
 * Re-export schema transformation utilities from @constructive-io/graphql-query.
 */
export {
  buildTypeRegistry,
  transformSchemaToOperations,
  filterOperations,
  getTableOperationNames,
  isTableOperation,
  getCustomOperations,
  getBaseTypeName,
  isNonNull,
  unwrapType,
  type TransformSchemaResult,
  type TableOperationNames,
} from '@constructive-io/graphql-query';
