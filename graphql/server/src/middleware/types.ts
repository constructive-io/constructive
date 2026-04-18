import type { ApiStructure } from '../types';

export type ConstructiveAPIToken = {
  id?: string;
  user_id?: string;
  access_level?: string;
  kind?: string;
  [key: string]: unknown;
};

/** How the current request was authenticated. */
export type TokenSource = 'bearer' | 'cookie' | 'none';

declare global {
  namespace Express {
    interface Request {
      api?: ApiStructure;
      svc_key?: string;
      clientIp?: string;
      databaseId?: string;
      requestId?: string;
      token?: ConstructiveAPIToken;
      /** How the credential was resolved: bearer header, session cookie, or none. */
      tokenSource?: TokenSource;
    }
  }
}
