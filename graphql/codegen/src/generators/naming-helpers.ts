/**
 * Re-export naming helpers from @constructive-io/graphql-query.
 *
 * Server-aware inflection naming functions now live in graphql-query.
 */
export {
  normalizeInflectionValue,
  toCamelCaseSingular,
  toCreateInputTypeName,
  toCreateMutationName,
  toDeleteInputTypeName,
  toDeleteMutationName,
  toFilterTypeName,
  toOrderByEnumValue,
  toPatchFieldName,
  toUpdateInputTypeName,
  toUpdateMutationName,
} from '@constructive-io/graphql-query';
