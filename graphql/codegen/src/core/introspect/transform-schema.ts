/**
 * Re-export schema transformation utilities from @constructive-io/graphql-query.
 */
export {
  buildTypeRegistry,
  filterOperations,
  getBaseTypeName,
  getCustomOperations,
  getTableOperationNames,
  isNonNull,
  isTableOperation,
  type TableOperationNames,
  type TransformSchemaResult,
  transformSchemaToOperations,
  unwrapType,
} from '@constructive-io/graphql-query';
