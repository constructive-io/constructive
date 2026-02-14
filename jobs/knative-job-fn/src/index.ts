import express from 'express';
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import type { Server as HttpServer } from 'http';
import { createLogger } from '@pgpmjs/logger';

type JobCallbackStatus = 'success' | 'error';

type JobContext = {
  callbackUrl: string | undefined;
  workerId: string | undefined;
  jobId: string | undefined;
  databaseId: string | undefined;
};

function getHeaders(req: any) {
  return {
    'x-worker-id': req.get('X-Worker-Id'),
    'x-job-id': req.get('X-Job-Id'),
    'x-database-id': req.get('X-Database-Id'),
    'x-callback-url': req.get('X-Callback-Url')
  };
}

// Normalize callback URL so it always points at the /callback endpoint.
const normalizeCallbackUrl = (rawUrl: string): string => {
  try {
    const url = new URL(rawUrl);
    if (!url.pathname || url.pathname === '/') {
      url.pathname = '/callback';
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
};

const postJson = (
  urlStr: string,
  headers: Record<string, string>,
  body: Record<string, unknown>
): Promise<void> => {
  return new Promise((resolve, reject) => {
    let url: URL;
    try {
      url = new URL(urlStr);
    } catch (e) {
      return reject(e);
    }

    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const req = client.request(
      {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      },
      (res) => {
        // Drain response data but ignore contents; callback server
        // only uses status for debugging.
        res.on('data', () => {});
        res.on('end', () => resolve());
      }
    );

    req.on('error', (err) => reject(err));
    req.write(JSON.stringify(body));
    req.end();
  });
};

const sendJobCallback = async (
  ctx: JobContext,
  status: JobCallbackStatus,
  errorMessage?: string
) => {
  const { callbackUrl, workerId, jobId, databaseId } = ctx;
  if (!callbackUrl || !workerId || !jobId) {
    return;
  }

  const target = normalizeCallbackUrl(callbackUrl);

  const headers: Record<string, string> = {
    'X-Worker-Id': workerId,
    'X-Job-Id': jobId
  };

  if (databaseId) {
    headers['X-Database-Id'] = databaseId;
  }

  const body: Record<string, unknown> = {
    status
  };

  if (status === 'error') {
    headers['X-Job-Error'] = 'true';
    body.error = errorMessage || 'ERROR';
  }

  try {
    logger.info('Sending job callback', {
      status,
      target: normalizeCallbackUrl(callbackUrl),
      workerId,
      jobId,
      databaseId
    });
    await postJson(target, headers, body);
  } catch (err) {
    logger.error('Failed to POST job callback', {
      target,
      status,
      err
    });
  }
};

const logger = createLogger('knative-job-fn');

const createJobApp = () => {
  const app: any = express();

  app.use(express.json());

  // Basic request logging for all incoming job invocations.
  app.use((req: any, res: any, next: any) => {
    try {
      // Log only the headers we care about plus a shallow body snapshot
      const headers = getHeaders(req);

      let body: any;
      if (req.body && typeof req.body === 'object') {
        // Only log top-level keys to avoid exposing sensitive body contents.
        body = { keys: Object.keys(req.body) };
      } else if (typeof req.body === 'string') {
        // For string bodies, log only the length.
        body = { length: req.body.length };
      } else {
        body = undefined;
      }

      logger.info('Incoming job request', {
        method: req.method,
        path: req.originalUrl || req.url,
        headers,
        body
      });
    } catch {
      // best-effort logging; never block the request
    }
    next();
  });

  // Echo job headers back on responses for debugging/traceability.
  app.use((req: any, res: any, next: any) => {
    res.set({
      'Content-Type': 'application/json',
      'X-Worker-Id': req.get('X-Worker-Id'),
      'X-Database-Id': req.get('X-Database-Id'),
      'X-Job-Id': req.get('X-Job-Id')
    });
    next();
  });

  // Attach per-request context and a finish hook to send success callbacks.
  app.use((req: any, res: any, next: any) => {
    const ctx: JobContext = {
      callbackUrl: req.get('X-Callback-Url'),
      workerId: req.get('X-Worker-Id'),
      jobId: req.get('X-Job-Id'),
      databaseId: req.get('X-Database-Id')
    };

    // Store on res.locals so the error middleware can also mark callbacks as sent.
    res.locals = res.locals || {};
    res.locals.jobContext = ctx;
    res.locals.jobCallbackSent = false;

    if (ctx.callbackUrl && ctx.workerId && ctx.jobId) {
      res.on('finish', () => {
        // If an error handler already sent a callback, skip.
        if (res.locals.jobCallbackSent) return;
        res.locals.jobCallbackSent = true;

        // Treat 4xx/5xx status codes as errors
        const isError = res.statusCode >= 400;

        logger.info('Function completed', {
          workerId: ctx.workerId,
          jobId: ctx.jobId,
          databaseId: ctx.databaseId,
          statusCode: res.statusCode
        });

        if (isError) {
          void sendJobCallback(ctx, 'error', `HTTP ${res.statusCode}`);
        } else {
          void sendJobCallback(ctx, 'success');
        }
      });
    }

    next();
  });

  return {
    post: function (...args: any[]) {
      return app.post.apply(app, args as any);
    },
    listen: (
      port: any,
      hostOrCb?: string | (() => void),
      cb: () => void = () => {}
    ): HttpServer => {
      // NOTE Remember that Express middleware executes in order.
      // You should define error handlers last, after all other middleware.
      // Otherwise, your error handler won't get called
      // eslint-disable-next-line no-unused-vars
      app.use(async (error: any, req: any, res: any, next: any) => {
        res.set({
          'Content-Type': 'application/json',
          'X-Job-Error': true
        });

        // Mark job as having errored via callback, if available.
        try {
          const ctx: JobContext | undefined = res.locals?.jobContext;
          if (ctx && !res.locals.jobCallbackSent) {
            res.locals.jobCallbackSent = true;
            await sendJobCallback(ctx, 'error', error?.message);
          }
        } catch (err) {
          logger.error('Failed to send error callback', err);
        }

        // Log the full error context for debugging.
        try {
          const headers = getHeaders(req);

          // Some error types (e.g. GraphQL ClientError) expose response info.
          const errorDetails: any = {
            message: error?.message,
            name: error?.name,
            stack: error?.stack
          };

          if (error?.response) {
            errorDetails.response = {
              status: error.response.status,
              statusText: error.response.statusText,
              errors: error.response.errors,
              data: error.response.data
            };
          }

          logger.error('Function error', {
            headers,
            path: req.originalUrl || req.url,
            error: errorDetails
          });
        } catch {
          // never throw from the error logger
        }

        res.status(200).json({ message: error.message });
      });

      const host = typeof hostOrCb === 'string' ? hostOrCb : undefined;
      const callback = typeof hostOrCb === 'function' ? hostOrCb : cb;
      const onListen = () => {
        callback();
      };
      const server = host
        ? app.listen(port, host, onListen)
        : app.listen(port, onListen);

      return server;
    }
  };
};

const defaultApp = createJobApp();

export { createJobApp };
export default defaultApp;
