import requestLib from 'request';
import {
  getJobGatewayDevMap,
  getNodeEnvironment
} from '@constructive-io/job-utils';
import { Logger } from '@pgpmjs/logger';
import { completeUrl, devMap, gatewayUrl } from './env';

const log = new Logger('jobs:req');

const getFunctionUrl = (fn: string): string => {
  if (devMap && devMap[fn]) {
    return devMap[fn] || completeUrl;
  }
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
