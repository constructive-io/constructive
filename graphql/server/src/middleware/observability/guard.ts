import type { RequestHandler } from 'express';

import {
  isDevelopmentObservabilityMode,
  isGraphqlObservabilityTokenValid,
  isLoopbackAddress,
  isLoopbackHost
} from '../../diagnostics/observability';

const bearerToken = (authorization: string | undefined): string | null => {
  const match = /^Bearer\s+(.+)$/i.exec(authorization?.trim() ?? '');
  return match?.[1] ?? null;
};

export const localObservabilityOnly: RequestHandler = (req, res, next) => {
  const remoteAddress = req.socket.remoteAddress;
  const hostHeader = req.headers.host;
  const isLocal = isLoopbackAddress(remoteAddress)
    || (!remoteAddress && isLoopbackHost(hostHeader));
  const isAuthorized = isDevelopmentObservabilityMode()
    || isGraphqlObservabilityTokenValid(bearerToken(req.headers.authorization));

  if (isLocal && isAuthorized) {
    next();
    return;
  }

  res.status(404).send('Not found');
};
