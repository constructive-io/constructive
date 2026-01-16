#!/usr/bin/env node

import Scheduler from './index';
import poolManager from '@constructive-io/job-pg';
import {
  getSchedulerHostname,
  getJobSupported
} from '@constructive-io/job-utils';

const pgPool = poolManager.getPool();
const jobsConfigOptions = { envConfig: process.env };

const scheduler = new Scheduler({
  pgPool,
  workerId: getSchedulerHostname(jobsConfigOptions),
  tasks: getJobSupported(jobsConfigOptions),
  envConfig: process.env
});

scheduler.listen();
