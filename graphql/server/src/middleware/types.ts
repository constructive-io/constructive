import type {
  ApiStructure,
  ConstructiveAPIToken,
  RequestProtection,
} from '@constructive-io/express-context';

declare global {
  namespace Express {
    interface Request {
      api?: ApiStructure;
      svc_key?: string;
      clientIp?: string;
      databaseId?: string;
      requestId?: string;
      token?: ConstructiveAPIToken;
      /** Device token from constructive_device_token cookie for trusted device tracking */
      deviceToken?: string;
      /**
       * Per-request protection bounds, resolved from the tenant's
       * database/API settings and clamped by the platform. Set by
       * `createRequestProtectionMiddleware`.
       */
      requestProtection?: RequestProtection;
    }
  }
}
