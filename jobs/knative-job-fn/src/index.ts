import express from 'express';
import bodyParser from 'body-parser';
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

type JobCallbackStatus = 'success' | 'error';

type JobContext = {
  callbackUrl: string | undefined;
  workerId: string | undefined;
  jobId: string | undefined;
  databaseId: string | undefined;
};

const app: any = express();

app.use(bodyParser.json());

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
    await postJson(target, headers, body);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[knative-job-fn] Failed to POST job callback', {
      target,
      status,
      err
    });
  }
};

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
      void sendJobCallback(ctx, 'success');
    });
  }

  next();
});

export default {
  post: function (...args: any[]) {
    return app.post.apply(app, args as any);
  },
  listen: (port: any, cb: () => void = () => {}) => {
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
        // eslint-disable-next-line no-console
        console.error('[knative-job-fn] Failed to send error callback', err);
      }

      res.status(200).json({ message: error.message });
    });
    app.listen(port, cb);
  }
};
