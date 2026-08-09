import { Logger } from '@pgpmjs/logger';
import { randomUUID } from 'crypto';
import type { RequestHandler } from 'express';

const log = new Logger('server');
const SAFE_REQUEST_ID = /^[a-zA-Z0-9\-_]{1,128}$/;
const SENSITIVE_QUERY_PARAMETERS = new Set([
  'access_token',
  'code',
  'error',
  'error_description',
  'handoff',
  'id_token',
  'state',
  'token'
]);

export const redactSensitiveRequestUrl = (originalUrl: string): string => {
  try {
    const parsed = new URL(originalUrl, 'http://constructive.invalid');
    for (const name of [...parsed.searchParams.keys()]) {
      if (SENSITIVE_QUERY_PARAMETERS.has(name.toLowerCase())) {
        parsed.searchParams.set(name, '[REDACTED]');
      }
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    const queryStart = originalUrl.indexOf('?');
    return queryStart === -1
      ? originalUrl
      : `${originalUrl.slice(0, queryStart)}?[REDACTED]`;
  }
};

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
    const ip = req.clientIp ?? req.ip ?? 'unknown';
    const safeUrl = redactSensitiveRequestUrl(req.originalUrl);

    log.debug(`[${reqId}] -> ${req.method} ${safeUrl} host=${host} ip=${ip}`);

    res.on('finish', () => {
      finished = true;
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      const apiInfo = req.api
        ? `db=${req.api.dbname} schemas=${req.api.schema?.join(',') || 'none'}`
        : 'api=unresolved';
      const authInfo = req.token ? 'auth=token' : 'auth=anon';
      const svcInfo = req.svc_key ? `svc=${req.svc_key}` : 'svc=unset';

      log.debug(
        `[${reqId}] <- ${res.statusCode} ${req.method} ${safeUrl} (${durationMs.toFixed(
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
            `${req.method} ${safeUrl} (${durationMs.toFixed(1)} ms) ${apiInfo}`,
        );
      });
    }

    next();
  };
};
