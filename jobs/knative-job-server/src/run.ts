#!/usr/bin/env node

import server from './index';
import poolManager from '@constructive-io/job-pg';
import { getJobsCallbackPort } from '@constructive-io/job-utils';

const pgPool = poolManager.getPool();
const port = getJobsCallbackPort();

server(pgPool).listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`listening ON ${port}`);
});
