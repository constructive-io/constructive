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
  ConstructiveError,
  classify,
  createError,
  format,
  isConstructiveError,
  isPublicCode,
  isPublicError,
  isRetryable,
  parse,
  parseGraphQLError,
  toError,
  type ErrorClass,
  type ErrorContext,
  type GraphQLError,
  type ParsedError,
} from './error';

export {
  execute,
  createGraphQLClient,
  type ExecuteOptions,
  type GraphQLResponse,
  type GraphQLClientOptions,
  type GraphQLClient,
} from './execute';
