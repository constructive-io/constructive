import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import {
  getCallbackBaseUrl,
  getJobGatewayConfig,
  getJobGatewayDevMap,
  getNodeEnvironment
} from '@constructive-io/job-utils';
import { Logger } from '@pgpmjs/logger';

const log = new Logger('jobs:req');

// callback URL for job completion
const completeUrl = getCallbackBaseUrl();

// Development override map (e.g. point a function name at localhost)
const nodeEnv = getNodeEnvironment();
const DEV_MAP = nodeEnv !== 'production' ? getJobGatewayDevMap() : null;

const getFunctionUrl = (fn: string): string => {
  if (DEV_MAP && DEV_MAP[fn]) {
    return DEV_MAP[fn] || completeUrl;
  }

  const { gatewayUrl } = getJobGatewayConfig();
  const base = gatewayUrl.replace(/\/$/, '');
  return `${base}/${fn}`;
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
