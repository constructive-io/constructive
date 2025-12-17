#!/usr/bin/env node

import Scheduler from '@constructive-io/job-scheduler';
import Worker from '@constructive-io/knative-job-worker';
import server from '@constructive-io/knative-job-server';
import poolManager from '@constructive-io/job-pg';
import { Client } from 'pg';
import retry from 'async-retry';
import {
  getJobPgConfig,
  getJobSchema,
  getSchedulerHostname,
  getWorkerHostname,
  getJobSupported,
  getJobsCallbackPort,
} from '@constructive-io/job-utils';

export const startJobsServices = () => {
  // eslint-disable-next-line no-console
  console.log('starting jobs services...');
  const pgPool = poolManager.getPool();
  const app = server(pgPool);

  const callbackPort = getJobsCallbackPort();
  const httpServer = app.listen(callbackPort, () => {
    // eslint-disable-next-line no-console
    console.log(`[cb] listening ON ${callbackPort}`);

    const tasks = getJobSupported();

    const worker = new Worker({
      pgPool,
      workerId: getWorkerHostname(),
      tasks
    });

    const scheduler = new Scheduler({
      pgPool,
      workerId: getSchedulerHostname(),
      tasks
    });

    worker.listen();
    scheduler.listen();
  });

  return { pgPool, httpServer };
};

export const waitForJobsPrereqs = async (): Promise<void> => {
  // eslint-disable-next-line no-console
  console.log('waiting for jobs prereqs');
  let client: Client | null = null;
  try {
    const cfg = getJobPgConfig();
    client = new Client({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database
    });
    await client.connect();
    const schema = getJobSchema();
    await client.query(`SELECT * FROM "${schema}".jobs LIMIT 1;`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error);
    throw new Error('jobs server boot failed...');
  } finally {
    if (client) {
      void client.end();
    }
  }
};

export const bootJobs = async (): Promise<void> => {
  // eslint-disable-next-line no-console
  console.log('attempting to boot jobs');
  await retry(
    async () => {
      await waitForJobsPrereqs();
    },
    {
      retries: 10,
      factor: 2
    }
  );
  startJobsServices();
};

if (require.main === module) {
  void bootJobs();
}
