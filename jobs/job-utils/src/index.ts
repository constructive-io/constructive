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
  getJobSupportAny,
  getJobSupported,
  getWorkerHostname,
  getSchedulerHostname,
  getJobGatewayConfig,
  getJobGatewayDevMap,
  getJobsCallbackPort,
  getCallbackBaseUrl
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
  getJobSupportAny,
  getJobSupported,
  getWorkerHostname,
  getSchedulerHostname,
  getJobGatewayConfig,
  getJobGatewayDevMap,
  getJobsCallbackPort,
  getCallbackBaseUrl
};

const JOBS_SCHEMA = getJobSchema();

export const failJob = async (
  client: PgClientLike,
  { workerId, jobId, message }: FailJobParams
) => {
  log.warn(`failJob worker[${workerId}] job[${jobId}] ${message}`);
  await client.query(
    `SELECT * FROM "${JOBS_SCHEMA}".fail_job($1, $2, $3);`,
    [workerId, jobId, message]
  );
};

export const completeJob = async (
  client: PgClientLike,
  { workerId, jobId }: CompleteJobParams
) => {
  log.info(`completeJob worker[${workerId}] job[${jobId}]`);
  await client.query(
    `SELECT * FROM "${JOBS_SCHEMA}".complete_job($1, $2);`,
    [workerId, jobId]
  );
};

export const getJob = async <T = any>(
  client: PgClientLike,
  { workerId, supportedTaskNames }: GetJobParams
): Promise<T | null> => {
  log.debug(`getJob worker[${workerId}]`);
  const {
    rows: [job]
  } = await client.query(
    `SELECT * FROM "${JOBS_SCHEMA}".get_job($1, $2::text[]);`,
    [workerId, supportedTaskNames]
  );
  return (job as T) ?? null;
};

export const getScheduledJob = async <T = any>(
  client: PgClientLike,
  { workerId, supportedTaskNames }: GetScheduledJobParams
): Promise<T | null> => {
  log.debug(`getScheduledJob worker[${workerId}]`);
  const {
    rows: [job]
  } = await client.query(
    `SELECT * FROM "${JOBS_SCHEMA}".get_scheduled_job($1, $2::text[]);`,
    [workerId, supportedTaskNames]
  );
  return (job as T) ?? null;
};

export const runScheduledJob = async (
  client: PgClientLike,
  { jobId }: RunScheduledJobParams
): Promise<any | null> => {
  log.info(`runScheduledJob job[${jobId}]`);
  try {
    const {
      rows: [job]
    } = await client.query(
      `SELECT * FROM "${JOBS_SCHEMA}".run_scheduled_job($1);`,
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
  { workerId, ids }: ReleaseScheduledJobsParams
) => {
  log.info(`releaseScheduledJobs worker[${workerId}]`);
  return client.query(
    `SELECT "${JOBS_SCHEMA}".release_scheduled_jobs($1, $2::bigint[]);`,
    [workerId, ids ?? null]
  );
};

export const releaseJobs = async (
  client: PgClientLike,
  { workerId }: ReleaseJobsParams
) => {
  log.info(`releaseJobs worker[${workerId}]`);
  return client.query(
    `SELECT "${JOBS_SCHEMA}".release_jobs($1);`,
    [workerId]
  );
};
