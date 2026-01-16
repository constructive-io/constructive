import requestLib from 'request';
import {
  getCallbackBaseUrl,
  getJobGatewayConfig,
  getJobGatewayDevMap,
  getNodeEnvironment,
  type JobsRuntimeConfigOptions
} from '@constructive-io/job-utils';
import { Logger } from '@pgpmjs/logger';

const log = new Logger('jobs:req');

interface RequestOptions {
  body: unknown;
  databaseId: string;
  workerId: string;
  jobId: string | number;
}

const getFunctionUrl = (
  fn: string,
  configOptions: JobsRuntimeConfigOptions,
  completeUrl: string
): string => {
  const nodeEnv = getNodeEnvironment(configOptions);
  const devMap =
    nodeEnv !== 'production' ? getJobGatewayDevMap(configOptions) : null;

  if (devMap && devMap[fn]) {
    return devMap[fn] || completeUrl;
  }

  const { gatewayUrl } = getJobGatewayConfig(configOptions);
  const base = gatewayUrl.replace(/\/$/, '');
  return `${base}/${fn}`;
};

const createRequest = (
  configOptions: JobsRuntimeConfigOptions = {}
) => {
  return (
    fn: string,
    { body, databaseId, workerId, jobId }: RequestOptions
  ) => {
    const completeUrl = getCallbackBaseUrl(configOptions);
    const url = getFunctionUrl(fn, configOptions, completeUrl);
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
};

const request = (
  fn: string,
  options: RequestOptions,
  configOptions: JobsRuntimeConfigOptions = {}
) => createRequest(configOptions)(fn, options);

export { createRequest, request };
