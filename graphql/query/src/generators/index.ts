/**
 * Generators barrel export
 *
 * Re-exports all query/mutation generation functions and naming helpers.
 */

// SELECT, FindOne, Count query generators
export {
  buildCount,
  buildFindOne,
  buildSelect,
  cleanTableToMetaObject,
  createASTQueryBuilder,
  generateIntrospectionSchema,
} from './select';

// Mutation generators (CREATE, UPDATE, DELETE)
export {
  buildPostGraphileCreate,
  buildPostGraphileDelete,
  buildPostGraphileUpdate,
} from './mutations';

// Field selection utilities
export {
  convertToSelectionOptions,
  getAvailableRelations,
  isRelationalField,
  validateFieldSelection,
} from './field-selector';

// Naming helpers (server-aware inflection)
export {
  normalizeInflectionValue,
  toCamelCasePlural,
  toCamelCaseSingular,
  toCreateInputTypeName,
  toCreateMutationName,
  toDeleteInputTypeName,
  toDeleteMutationName,
  toFilterTypeName,
  toOrderByEnumValue,
  toOrderByTypeName,
  toPatchFieldName,
  toUpdateInputTypeName,
  toUpdateMutationName,
} from './naming-helpers';
