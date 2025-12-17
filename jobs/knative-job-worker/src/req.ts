import requestLib from 'request';
import {
  getCallbackBaseUrl,
  getJobGatewayConfig,
  getJobGatewayDevMap,
  getNodeEnvironment
} from '@launchql/job-utils';
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
    requestLib.post(
      {
        headers: {
          'Content-Type': 'application/json',

          // these are used by job-worker/job-fn
          'X-Worker-Id': workerId,
          'X-Job-Id': jobId,
          'X-Database-Id': databaseId,

          // async HTTP completion callback
          'X-Callback-Url': completeUrl
        },
        url,
        json: true,
        body
      },
      function (error: unknown) {
        if (error) {
          log.error(`request error for job[${jobId}] fn[${fn}]`, error);
          return reject(error);
        }
        log.debug(`request success for job[${jobId}] fn[${fn}]`);
        return resolve(true);
      }
    );
  });
};

export { request };
