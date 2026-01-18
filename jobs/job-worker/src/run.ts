import Worker, { WorkerContext, JobRow } from './index';
import { createLogger } from '@pgpmjs/logger';

const logger = createLogger('job-worker-run');

const worker = new Worker({
  tasks: {
    hello: async (
      { pgPool, workerId }: WorkerContext,
      job: JobRow
    ) => {
      logger.info('hello');
      await pgPool.query('select 1');
      logger.info(JSON.stringify(job, null, 2));
    }
  }
});

worker.listen();
