import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import {
  getCallbackBaseUrl,
  getJobGatewayConfig,
  getJobGatewayDevMap,
  getJobGatewayScopeUrls,
  parseScopedIdentifier,
  getNodeEnvironment
} from '@constructive-io/job-utils';
import { Logger } from '@pgpmjs/logger';

const log = new Logger('jobs:req');

// callback URL for job completion
const completeUrl = getCallbackBaseUrl();

// Development override map (e.g. point a function name at localhost)
const nodeEnv = getNodeEnvironment();
const DEV_MAP = nodeEnv !== 'production' ? getJobGatewayDevMap() : null;

// Scope-based routing: maps scope prefixes to base URLs
// e.g. {"embed": "http://embed-service:8080", "email": "http://email-service:8080"}
const SCOPE_URLS = getJobGatewayScopeUrls();

const getFunctionUrl = (fn: string): string => {
  // 1. Check exact-match dev map first (highest priority)
  if (DEV_MAP && DEV_MAP[fn]) {
    return DEV_MAP[fn] || completeUrl;
  }

  // 2. For scoped identifiers (e.g. "embed:generate_embedding"),
  //    try scope-based routing via INTERNAL_GATEWAY_SCOPE_URLS
  const scoped = parseScopedIdentifier(fn);
  if (scoped) {
    // Check dev map for the unscoped function name as fallback
    if (DEV_MAP && DEV_MAP[scoped.fn]) {
      return DEV_MAP[scoped.fn] || completeUrl;
    }
    // Route to scope-specific service
    if (SCOPE_URLS && SCOPE_URLS[scoped.scope]) {
      const base = SCOPE_URLS[scoped.scope].replace(/\/$/, '');
      return `${base}/${scoped.fn}`;
    }
  }

  // 3. Fallback to gateway (strips scope prefix for URL path)
  const { gatewayUrl } = getJobGatewayConfig();
  const base = gatewayUrl.replace(/\/$/, '');
  const path = scoped ? scoped.fn : fn;
  return `${base}/${path}`;
};

interface RequestOptions {
  body: unknown;
  databaseId: string;
  workerId: string;
  jobId: string | number;
}

const request = (
  fn: string,
  { body, databaseId, workerId, jobId }: RequestOptions
) => {
  const url = getFunctionUrl(fn);
  log.info(`dispatching job`, {
    fn,
    url,
    callbackUrl: completeUrl,
    workerId,
    jobId,
    databaseId
  });
  return new Promise<boolean>((resolve, reject) => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch (e) {
      return reject(e);
    }

    const isHttps = parsed.protocol === 'https:';
    const client = isHttps ? https : http;
    const payload = JSON.stringify(body);

    const req = client.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),

          // these are used by job-worker/job-fn
          'X-Worker-Id': workerId,
          'X-Job-Id': String(jobId),
          'X-Database-Id': databaseId,

          // async HTTP completion callback
          'X-Callback-Url': completeUrl
        }
      },
      (res) => {
        res.on('data', () => {});
        res.on('end', () => {
          log.debug(`request success for job[${jobId}] fn[${fn}]`);
          resolve(true);
        });
      }
    );

    req.on('error', (error) => {
      log.error(`request error for job[${jobId}] fn[${fn}]`, error);
      if (error.stack) {
        log.debug(error.stack);
      }
      reject(error);
    });

    req.write(payload);
    req.end();
  });
};

export { request };
