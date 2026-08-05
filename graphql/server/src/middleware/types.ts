import type { ApiStructure } from '../types';

export type ConstructiveAPIToken = {
  id?: string;
  user_id?: string;
  principal_id?: string;
  session_id?: string;
  access_level?: string;
  kind?: string;
  [key: string]: unknown;
};

declare global {
  namespace Express {
    interface Request {
      api?: ApiStructure;
      svc_key?: string;
      /** Opaque physical routing-cache identity; never used as a service label. */
      svc_cache_key?: string;
      /** True only after constant-time authentication of the internal request token. */
      internalTrusted?: boolean;
      clientIp?: string;
      databaseId?: string;
      requestId?: string;
      token?: ConstructiveAPIToken;
      /** Device token from constructive_device_token cookie for trusted device tracking */
      deviceToken?: string;
    }
  }
}
