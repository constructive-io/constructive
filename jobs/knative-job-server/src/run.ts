#!/usr/bin/env node

import server from './index';
import poolManager from '@constructive-io/job-pg';
import { getJobsCallbackPort } from '@constructive-io/job-utils';
import { createLogger } from '@pgpmjs/logger';

const logger = createLogger('knative-job-server');
const pgPool = poolManager.getPool();
const port = getJobsCallbackPort();

server(pgPool).listen(port, () => {
  logger.info(`listening ON ${port}`);
});
