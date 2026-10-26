import './types'; // for Request type

import { clientIpFrom, trustedProxyHops } from '@constructive-io/express-context';
import type { NextFunction, Request, Response } from 'express';

/**
 * How far back through `X-Forwarded-For` to believe: an explicit count, then
 * `TRUSTED_PROXY_HOPS`, then 1 when `SERVER_TRUST_PROXY` puts a proxy in front.
 *
 * Express's `trust proxy` predicate and `req.ip` are not used as the answer:
 * the predicate trusts every hop, which would hand back the leftmost entry —
 * the one a caller writes. One ingress means one hop is believed.
 */
export const resolveProxyHops = (req: Request, configured?: number): number => {
  if (typeof configured === 'number') return configured;
  const fromEnv = trustedProxyHops();
  if (fromEnv > 0) return fromEnv;
  return req.app?.get('trust proxy') ? 1 : 0;
};

/**
 * Sets `req.clientIp` — the address `jwt.claims.ip_address`, logs and per-IP
 * limits are keyed on — to the entry our own proxy appended, or the socket peer.
 */
export const clientIpMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  req.clientIp = clientIpFrom(req, resolveProxyHops(req));
  next();
};
