import type {
  FailJobParams,
  CompleteJobParams,
  GetJobParams,
  GetScheduledJobParams,
  RunScheduledJobParams,
  ReleaseScheduledJobsParams,
  ReleaseJobsParams
} from '@pgpmjs/types';

import {
  getJobSchema,
  getJobPgConfig,
  getJobPool,
  getJobConnectionString,
  getJobSupportAny,
  getJobSupported,
  getWorkerHostname,
  getSchedulerHostname,
  getJobGatewayConfig,
  getJobGatewayDevMap,
  getJobsCallbackPort,
  getCallbackBaseUrl,
  getNodeEnvironment,
  resolveJobsConfig,
  type JobsRuntimeConfigOptions
} from './runtime';

import { Logger } from '@pgpmjs/logger';

const log = new Logger('jobs:core');

export type PgClientLike = {
  query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }>;
};

export {
  getJobSchema,
  getJobPgConfig,
  getJobPool,
  getJobConnectionString,
  getJobSupportAny,
  getJobSupported,
  getWorkerHostname,
  getSchedulerHostname,
  getJobGatewayConfig,
  getJobGatewayDevMap,
  getJobsCallbackPort,
  getCallbackBaseUrl,
  getNodeEnvironment,
  resolveJobsConfig
};

export type { JobsRuntimeConfigOptions, JobsRuntimeConfig } from './runtime';

export const failJob = async (
  client: PgClientLike,
  { workerId, jobId, message }: FailJobParams,
  options: JobsRuntimeConfigOptions = {}
) => {
  const schema = getJobSchema(options);
  log.warn(`failJob worker[${workerId}] job[${jobId}] ${message}`);
  await client.query(
    `SELECT * FROM "${schema}".fail_job($1, $2, $3);`,
    [workerId, jobId, message]
  );
};

export const completeJob = async (
  client: PgClientLike,
  { workerId, jobId }: CompleteJobParams,
  options: JobsRuntimeConfigOptions = {}
) => {
  const schema = getJobSchema(options);
  log.info(`completeJob worker[${workerId}] job[${jobId}]`);
  await client.query(
    `SELECT * FROM "${schema}".complete_job($1, $2);`,
    [workerId, jobId]
  );
};

export const getJob = async <T = any>(
  client: PgClientLike,
  { workerId, supportedTaskNames }: GetJobParams,
  options: JobsRuntimeConfigOptions = {}
): Promise<T | null> => {
  const schema = getJobSchema(options);
  log.debug(`getJob worker[${workerId}]`);
  const {
    rows: [job]
  } = await client.query(
    `SELECT * FROM "${schema}".get_job($1, $2::text[]);`,
    [workerId, supportedTaskNames]
  );
  return (job as T) ?? null;
};

export const getScheduledJob = async <T = any>(
  client: PgClientLike,
  { workerId, supportedTaskNames }: GetScheduledJobParams,
  options: JobsRuntimeConfigOptions = {}
): Promise<T | null> => {
  const schema = getJobSchema(options);
  log.debug(`getScheduledJob worker[${workerId}]`);
  const {
    rows: [job]
  } = await client.query(
    `SELECT * FROM "${schema}".get_scheduled_job($1, $2::text[]);`,
    [workerId, supportedTaskNames]
  );
  return (job as T) ?? null;
};

export const runScheduledJob = async (
  client: PgClientLike,
  { jobId }: RunScheduledJobParams,
  options: JobsRuntimeConfigOptions = {}
): Promise<any | null> => {
  const schema = getJobSchema(options);
  log.info(`runScheduledJob job[${jobId}]`);
  try {
    const {
      rows: [job]
    } = await client.query(
      `SELECT * FROM "${schema}".run_scheduled_job($1);`,
      [jobId]
    );
    return job ?? null;
  } catch (e: any) {
    if (e?.message === 'ALREADY_SCHEDULED') {
      return null;
    }
    throw e;
  }
};

export const releaseScheduledJobs = async (
  client: PgClientLike,
  { workerId, ids }: ReleaseScheduledJobsParams,
  options: JobsRuntimeConfigOptions = {}
) => {
  const schema = getJobSchema(options);
  log.info(`releaseScheduledJobs worker[${workerId}]`);
  return client.query(
    `SELECT "${schema}".release_scheduled_jobs($1, $2::bigint[]);`,
    [workerId, ids ?? null]
  );
};

export const releaseJobs = async (
  client: PgClientLike,
  { workerId }: ReleaseJobsParams,
  options: JobsRuntimeConfigOptions = {}
) => {
  const schema = getJobSchema(options);
  log.info(`releaseJobs worker[${workerId}]`);
  return client.query(
    `SELECT "${schema}".release_jobs($1);`,
    [workerId]
  );
};
