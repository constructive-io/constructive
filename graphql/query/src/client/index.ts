/**
 * Client barrel export
 *
 * Re-exports client utilities for GraphQL execution and error handling.
 */

export {
  TypedDocumentString,
  type DocumentTypeDecoration,
} from './typed-document';

export {
  DataError,
  DataErrorType,
  PG_ERROR_CODES,
  createError,
  parseGraphQLError,
  isDataError,
  type DataErrorOptions,
  type GraphQLError,
} from './error';

export {
  execute,
  createGraphQLClient,
  type ExecuteOptions,
  type GraphQLResponse,
  type GraphQLClientOptions,
  type GraphQLClient,
} from './execute';
