/**
 * Generators barrel export
 *
 * Re-exports all query/mutation generation functions and naming helpers.
 */

// SELECT, FindOne, Count query generators
export {
  buildSelect,
  buildFindOne,
  buildCount,
  cleanTableToMetaObject,
  createASTQueryBuilder,
  generateIntrospectionSchema,
  toCamelCasePlural,
  toOrderByTypeName,
} from './select';

// Mutation generators (CREATE, UPDATE, DELETE)
export {
  buildPostGraphileCreate,
  buildPostGraphileUpdate,
  buildPostGraphileDelete,
} from './mutations';

// Field selection utilities
export {
  convertToSelectionOptions,
  isRelationalField,
  getAvailableRelations,
  validateFieldSelection,
} from './field-selector';

// Naming helpers (server-aware inflection)
export {
  normalizeInflectionValue,
  toCamelCaseSingular,
  toCreateMutationName,
  toUpdateMutationName,
  toDeleteMutationName,
  toCreateInputTypeName,
  toUpdateInputTypeName,
  toDeleteInputTypeName,
  toFilterTypeName,
  toPatchFieldName,
  toOrderByEnumValue,
} from './naming-helpers';
