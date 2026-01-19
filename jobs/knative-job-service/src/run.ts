#!/usr/bin/env node

export { bootJobs, startJobsServices, waitForJobsPrereqs } from './index';

import { bootJobs } from './index';

if (require.main === module) {
  void bootJobs();
}
