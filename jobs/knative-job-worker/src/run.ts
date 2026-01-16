#!/usr/bin/env node

import Worker from './index';
import poolManager from '@constructive-io/job-pg';
import {
  getWorkerHostname,
  getJobSupported
} from '@constructive-io/job-utils';

const pgPool = poolManager.getPool();
const jobsConfigOptions = { envConfig: process.env };

const worker = new Worker({
  pgPool,
  workerId: getWorkerHostname(jobsConfigOptions),
  tasks: getJobSupported(jobsConfigOptions),
  envConfig: process.env
});

worker.listen();
