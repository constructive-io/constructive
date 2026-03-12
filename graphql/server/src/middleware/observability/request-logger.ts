import { randomUUID } from 'crypto';
import { Logger } from '@pgpmjs/logger';
import type { RequestHandler } from 'express';

const log = new Logger('server');
const SAFE_REQUEST_ID = /^[a-zA-Z0-9\-_]{1,128}$/;

interface RequestLoggerOptions {
  observabilityEnabled: boolean;
}

export const createRequestLogger = ({ observabilityEnabled }: RequestLoggerOptions): RequestHandler => {
  return (req, res, next) => {
    const headerRequestId = req.header('x-request-id');
    const reqId = (headerRequestId && SAFE_REQUEST_ID.test(headerRequestId))
      ? headerRequestId
      : randomUUID();
    const start = process.hrtime.bigint();
    let finished = false;

    req.requestId = reqId;

    const host = req.hostname || req.headers.host || 'unknown';
    const ip = req.clientIp || req.ip;

    log.debug(`[${reqId}] -> ${req.method} ${req.originalUrl} host=${host} ip=${ip}`);

    res.on('finish', () => {
      finished = true;
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      const apiInfo = req.api
        ? `db=${req.api.dbname} schemas=${req.api.schema?.join(',') || 'none'}`
        : 'api=unresolved';
      const authInfo = req.token ? 'auth=token' : 'auth=anon';
      const svcInfo = req.svc_key ? `svc=${req.svc_key}` : 'svc=unset';

      log.debug(
        `[${reqId}] <- ${res.statusCode} ${req.method} ${req.originalUrl} (${durationMs.toFixed(
          1,
        )} ms) ${apiInfo} ${svcInfo} ${authInfo}`,
      );
    });

    if (observabilityEnabled) {
      res.on('close', () => {
        if (finished) {
          return;
        }

        const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
        const apiInfo = req.api
          ? `db=${req.api.dbname} schemas=${req.api.schema?.join(',') || 'none'}`
          : 'api=unresolved';

        log.warn(
          `[${reqId}] connection closed before response completed ` +
            `${req.method} ${req.originalUrl} (${durationMs.toFixed(1)} ms) ${apiInfo}`,
        );
      });
    }

    next();
  };
};
