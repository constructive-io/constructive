import env from './env';
import requestLib from 'request';
import { getCallbackBaseUrl } from '@launchql/job-utils';
import { Logger } from '@pgpmjs/logger';

const log = new Logger('jobs:req');

// callback URL for job completion
const completeUrl = getCallbackBaseUrl();

let hasDevMap = false;
let DEV_MAP: Record<string, string> = {};

const nodeEnv = process.env.NODE_ENV;

if (nodeEnv !== 'production' && env.INTERNAL_GATEWAY_DEVELOPMENT_MAP) {
  hasDevMap = true;
  DEV_MAP = JSON.parse(env.INTERNAL_GATEWAY_DEVELOPMENT_MAP as string);
}

const getFunctionUrl = (fn: string): string => {
  if (hasDevMap) {
    return DEV_MAP[fn] || completeUrl;
  }
  return `http://${fn}.${env.KNATIVE_SERVICE_URL}`;
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
          if (error instanceof Error && error.stack) {
            log.debug(error.stack);
          }
          return reject(error);
        }
        log.debug(`request success for job[${jobId}] fn[${fn}]`);
        return resolve(true);
      }
    );
  });
};

export { request };
