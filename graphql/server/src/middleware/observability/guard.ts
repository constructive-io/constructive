import type { RequestHandler } from 'express';
import { isLoopbackAddress, isLoopbackHost } from '../../diagnostics/observability';

export const localObservabilityOnly: RequestHandler = (req, res, next) => {
  const remoteAddress = req.socket.remoteAddress;
  if (isLoopbackAddress(remoteAddress)) {
    next();
    return;
  }

  const hostHeader = req.headers.host;
  if (!remoteAddress && isLoopbackHost(hostHeader)) {
    next();
    return;
  }

  res.status(404).send('Not found');
};
