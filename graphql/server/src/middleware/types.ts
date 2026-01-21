import type { ApiStructure } from '../types';

export type ConstructiveAPIToken = {
  id: string;
  user_id: string;
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
    }
  }
}
