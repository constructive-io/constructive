/**
 * Client exports
 */

export { TypedDocumentString, type DocumentTypeDecoration } from './typed-document';

export {
  DataError,
  DataErrorType,
  createError,
  parseGraphQLError,
  isDataError,
  PG_ERROR_CODES,
  type DataErrorOptions,
  type GraphQLError,
} from './error';

export {
  execute,
  createGraphQLClient,
  type ExecuteOptions,
  type GraphQLClientOptions,
  type GraphQLClient,
  type GraphQLResponse,
} from './execute';
