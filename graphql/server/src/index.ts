export * from './server';

// Export middleware for use in testing packages
export { createApiMiddleware, getSubdomain, getApiConfig } from './middleware/api';
export { createAuthenticateMiddleware } from './middleware/auth';
export { createUploadAuthenticateMiddleware } from './middleware/upload';
export { cors } from './middleware/cors';
export { graphile, multiTenancyHandler, isMultiTenancyCacheEnabled, shutdownMultiTenancy } from './middleware/graphile';
export { flush, createFlushMiddleware, flushService } from './middleware/flush';
