#!/usr/bin/env node

import Scheduler from './index';
import poolManager from '@constructive-io/job-pg';
import {
  getSchedulerHostname,
  getJobSupported
} from '@constructive-io/job-utils';

const pgPool = poolManager.getPool();

const scheduler = new Scheduler({
  pgPool,
  workerId: getSchedulerHostname(),
  tasks: getJobSupported()
});

scheduler.listen();
