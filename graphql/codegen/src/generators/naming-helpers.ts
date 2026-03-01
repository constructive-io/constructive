/**
 * Re-export naming helpers from @constructive-io/graphql-query.
 *
 * Server-aware inflection naming functions now live in graphql-query.
 */
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
} from '@constructive-io/graphql-query';
