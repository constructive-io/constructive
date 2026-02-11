/**
 * Query and mutation generator exports
 *
 * @deprecated Legacy v4 generators — use v5 ORM codegen pipeline instead.
 * These are retained for backward compatibility with existing v4 consumers.
 */

// Field selector utilities
export {
  convertToSelectionOptions,
  getAvailableRelations,
  isRelationalField,
  validateFieldSelection,
} from './field-selector';

// Query generators
export {
  buildCount,
  buildFindOne,
  buildSelect,
  cleanTableToMetaObject,
  createASTQueryBuilder,
  generateIntrospectionSchema,
  toCamelCasePlural,
  toOrderByTypeName,
} from './select';

// Mutation generators
export {
  buildPostGraphileCreate,
  buildPostGraphileDelete,
  buildPostGraphileUpdate,
} from './mutations';
