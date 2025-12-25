#!/usr/bin/env node

import poolManager from '@constructive-io/job-pg';
import {
  getJobSupported,
  getSchedulerHostname} from '@constructive-io/job-utils';

import Scheduler from './index';

const pgPool = poolManager.getPool();

const scheduler = new Scheduler({
  pgPool,
  workerId: getSchedulerHostname(),
  tasks: getJobSupported()
});

scheduler.listen();
