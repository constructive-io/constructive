export * from './server';
export * from './schema';

// Export middleware for use in testing packages
export { createApiMiddleware, getSubdomain, getApiConfig } from './middleware/api';
export { createAuthenticateMiddleware } from './middleware/auth';
export { cors } from './middleware/cors';
export { graphile } from './middleware/graphile';
export { flush, flushService } from './middleware/flush';
export {
  structuredLogger,
  logEvent,
  parseGraphQLOperation,
  buildLogEntry,
  logStructured,
} from './middleware/structured-logger';
export type {
  LogLevel,
  GraphQLOperationInfo,
  StructuredLogEntry,
} from './middleware/structured-logger';

// Export GraphQL-based API lookup service
export {
  initApiLookupService,
  releaseApiLookupService,
  isApiLookupServiceAvailable,
  queryApiByDomainGraphQL,
  queryApiByNameGraphQL,
} from './middleware/api-graphql';

// Export GraphQL ORM utilities
export {
  createGraphileOrm,
  normalizeApiRecord,
  apiSelect,
  domainSelect,
  apiListSelect,
} from './middleware/gql';
export type {
  ApiRecord,
  DomainRecord,
  ApiListRecord,
} from './middleware/gql';

// Export error classes and utilities
export * from './errors';
