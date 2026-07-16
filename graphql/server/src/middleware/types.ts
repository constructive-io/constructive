import type { RoutingEnv } from '@constructive-io/graphql-types';

import type { ApiStructure } from '../types';
import type { HttpRouteMatch } from './route';

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
      /** Typed target resolved by services_public.resolve_http_route (Stage B). */
      httpRoute?: HttpRouteMatch;
      /** api id chosen by an `api` route target; consumed by the api middleware. */
      routeApiId?: string;
      /** Routing deployment environment resolved for this request (local | production). */
      routeEnv?: RoutingEnv;
      /** Whether the request is served over a secure context (TLS real or simulated locally). */
      routeSecure?: boolean;
      token?: ConstructiveAPIToken;
      /** Device token from constructive_device_token cookie for trusted device tracking */
      deviceToken?: string;
    }
  }
}
