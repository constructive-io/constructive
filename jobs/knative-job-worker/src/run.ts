#!/usr/bin/env node

import poolManager from '@constructive-io/job-pg';
import {
  getJobSupported,
  getWorkerHostname} from '@constructive-io/job-utils';

import Worker from './index';

const pgPool = poolManager.getPool();

const worker = new Worker({
  pgPool,
  workerId: getWorkerHostname(),
  tasks: getJobSupported()
});

worker.listen();
