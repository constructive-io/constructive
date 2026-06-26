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
      clientIp?: string;
      databaseId?: string;
      requestId?: string;
      token?: ConstructiveAPIToken;
      /** Device token from constructive_device_token cookie for trusted device tracking */
      deviceToken?: string;
    }
  }
}
