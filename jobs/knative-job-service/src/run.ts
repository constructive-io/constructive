#!/usr/bin/env node

import Scheduler from '@constructive-io/job-scheduler';
import Worker from '@constructive-io/knative-job-worker';
import server from '@constructive-io/knative-job-server';
import poolManager, { createPoolManager } from '@constructive-io/job-pg';
import { Client } from 'pg';
import retry from 'async-retry';
import {
  getJobPgConfig,
  getJobSchema,
  getSchedulerHostname,
  getWorkerHostname,
  getJobSupported,
  getJobsCallbackPort,
  type JobsRuntimeConfigOptions
} from '@constructive-io/job-utils';
import { createLogger } from '@pgpmjs/logger';

const logger = createLogger('knative-job-service');

type JobsServiceConfig = JobsRuntimeConfigOptions & {
  pgPool?: import('pg').Pool;
  workerConfig?: {
    workerId?: string;
    tasks?: string[];
    idleDelay?: number;
  };
  schedulerConfig?: {
    workerId?: string;
    tasks?: string[];
    idleDelay?: number;
  };
  callbackServerConfig?: {
    port?: number;
  };
};

export const startJobsServices = (jobsServiceConfig: JobsServiceConfig = {}) => {
  logger.info('starting jobs services...');
  const {
    jobsConfig,
    pgConfig,
    envConfig,
    devMapConfig,
    pgPool,
    workerConfig,
    schedulerConfig,
    callbackServerConfig
  } = jobsServiceConfig;
  const runtimeOptions: JobsRuntimeConfigOptions = {
    jobsConfig,
    pgConfig,
    envConfig,
    devMapConfig
  };
  const manager =
    pgPool
      ? createPoolManager({ pgPool })
      : (jobsConfig || pgConfig || envConfig || devMapConfig)
        ? createPoolManager(runtimeOptions)
        : poolManager;
  const resolvedPool = manager.getPool();
  const app = server({ pgPool: resolvedPool, ...runtimeOptions });

  const callbackPort =
    callbackServerConfig?.port ?? getJobsCallbackPort(runtimeOptions);
  const httpServer = app.listen(callbackPort, () => {
    logger.info(`listening ON ${callbackPort}`);

    const tasks = workerConfig?.tasks ?? getJobSupported(runtimeOptions);

    const worker = new Worker({
      pgPool: resolvedPool,
      workerId: workerConfig?.workerId ?? getWorkerHostname(runtimeOptions),
      idleDelay: workerConfig?.idleDelay,
      tasks,
      jobsConfig,
      pgConfig,
      envConfig,
      devMapConfig
    });

    const scheduler = new Scheduler({
      pgPool: resolvedPool,
      workerId:
        schedulerConfig?.workerId ??
        getSchedulerHostname(runtimeOptions),
      idleDelay: schedulerConfig?.idleDelay,
      tasks,
      jobsConfig,
      pgConfig,
      envConfig
    });

    worker.listen();
    scheduler.listen();
  });

  return { pgPool: resolvedPool, httpServer, poolManager: manager };
};

export const waitForJobsPrereqs = async (
  jobsServiceConfig: JobsServiceConfig = {}
): Promise<void> => {
  logger.info('waiting for jobs prereqs');
  let client: Client | null = null;
  try {
    const cfg = getJobPgConfig(jobsServiceConfig);
    client = new Client({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database
    });
    await client.connect();
    const schema = getJobSchema(jobsServiceConfig);
    await client.query(`SELECT * FROM "${schema}".jobs LIMIT 1;`);
  } catch (error) {
    logger.error(error);
    throw new Error('jobs server boot failed...');
  } finally {
    if (client) {
      void client.end();
    }
  }
};

export const bootJobs = async (
  jobsServiceConfig: JobsServiceConfig = {}
): Promise<void> => {
  logger.info('attempting to boot jobs');
  await retry(
    async () => {
      await waitForJobsPrereqs(jobsServiceConfig);
    },
    {
      retries: 10,
      factor: 2
    }
  );
  startJobsServices(jobsServiceConfig);
};

if (require.main === module) {
  void bootJobs();
}
