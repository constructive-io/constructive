#!/usr/bin/env node

import poolManager from '@constructive-io/job-pg';
import Scheduler from '@constructive-io/job-scheduler';
import {
  getJobPgConfig,
  getJobsCallbackPort,
  getJobSchema,
  getJobSupported,
  getSchedulerHostname,
  getWorkerHostname,
} from '@constructive-io/job-utils';
import server from '@constructive-io/knative-job-server';
import Worker from '@constructive-io/knative-job-worker';
import retry from 'async-retry';
import { Client } from 'pg';

export const startJobsServices = () => {
   
  console.log('starting jobs services...');
  const pgPool = poolManager.getPool();
  const app = server(pgPool);

  const callbackPort = getJobsCallbackPort();
  const httpServer = app.listen(callbackPort, () => {
     
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
     
    console.log(error);
    throw new Error('jobs server boot failed...');
  } finally {
    if (client) {
      void client.end();
    }
  }
};

export const bootJobs = async (): Promise<void> => {
   
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
