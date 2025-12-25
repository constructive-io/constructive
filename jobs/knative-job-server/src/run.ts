#!/usr/bin/env node

import poolManager from '@constructive-io/job-pg';
import { getJobsCallbackPort } from '@constructive-io/job-utils';

import server from './index';

const pgPool = poolManager.getPool();
const port = getJobsCallbackPort();

server(pgPool).listen(port, () => {
   
  console.log(`listening ON ${port}`);
});
