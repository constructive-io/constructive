/**
 * Re-export field selector utilities from @constructive-io/graphql-query.
 *
 * The canonical implementations of convertToSelectionOptions, isRelationalField,
 * getAvailableRelations, and validateFieldSelection now live in graphql-query.
 */
export {
  convertToSelectionOptions,
  isRelationalField,
  getAvailableRelations,
  validateFieldSelection,
} from '@constructive-io/graphql-query';
