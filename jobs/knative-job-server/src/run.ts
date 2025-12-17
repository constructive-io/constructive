#!/usr/bin/env node

import server from './index';
import poolManager from '@launchql/job-pg';
import { getJobsCallbackPort } from '@launchql/job-utils';

const pgPool = poolManager.getPool();
const port = getJobsCallbackPort();

server(pgPool).listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`listening ON ${port}`);
});
