import poolManager from '@constructive-io/job-pg';
import * as jobs from '@constructive-io/job-utils';
import type { PgClientLike } from '@constructive-io/job-utils';
import type { Pool, PoolClient } from 'pg';
import { Logger } from '@pgpmjs/logger';
import { request as req } from './req';

export interface JobRow {
  id: number | string;
  task_identifier: string;
  payload?: unknown;
  database_id?: string;
}

const log = new Logger('jobs:worker');

export default class Worker {
  idleDelay: number;
  supportedTaskNames: string[];
  workerId: string;
  doNextTimer?: NodeJS.Timeout;
  pgPool: Pool;
  _initialized?: boolean;
  listenClient?: PoolClient;
  listenRelease?: () => void;
  stopped?: boolean;

  constructor({
    tasks,
    idleDelay = 15000,
    pgPool = poolManager.getPool(),
    workerId = 'worker-0'
  }: {
    tasks: string[];
    idleDelay?: number;
    pgPool?: Pool;
    workerId?: string;
  }) {
    /*
     * idleDelay: This is how long to wait between polling for jobs.
     *
     * Note: this does NOT need to be short, because we use LISTEN/NOTIFY to be
     * notified when new jobs are added - this is just used in the case where
     * LISTEN/NOTIFY fails for whatever reason.
     */

    this.idleDelay = idleDelay;
    this.supportedTaskNames = tasks;
    this.workerId = workerId;
    this.doNextTimer = undefined;
    this.pgPool = pgPool;
    poolManager.onClose(async () => {
      await jobs.releaseJobs(pgPool, { workerId: this.workerId });
    });
  }
  async initialize(client: PgClientLike) {
    if (this._initialized === true) return;

    // release any jobs not finished from before if fatal error prevented cleanup
    await jobs.releaseJobs(client, { workerId: this.workerId });

    this._initialized = true;
    await this.doNext(client);
  }
  async handleFatalError(
    client: PgClientLike,
    {
      err,
      fatalError,
      jobId
    }: { err?: Error; fatalError: unknown; jobId: JobRow['id'] }
  ) {
    const when = err ? `after failure '${err.message}'` : 'after success';
    log.error(`Failed to release job '${jobId}' ${when}; committing seppuku`);
    await poolManager.close();
    log.error(String(fatalError));
    process.exit(1);
  }
  async handleError(
    client: PgClientLike,
    { err, job, duration }: { err: Error; job: JobRow; duration: string }
  ) {
    log.error(
      `Failed task ${job.id} (${job.task_identifier}) with error ${err.message} (${duration}ms)`
    );
    if (err.stack) {
      log.debug(err.stack);
    }
    await jobs.failJob(client, {
      workerId: this.workerId,
      jobId: job.id,
      message: err.message
    });
  }
  async handleSuccess(
    client: PgClientLike,
    { job, duration }: { job: JobRow; duration: string }
  ) {
    log.info(
      `Async task ${job.id} (${job.task_identifier}) to be processed`
    );
  }
  async doWork(job: JobRow) {
    const { payload, task_identifier } = job;
    log.debug('starting work on job', {
      id: job.id,
      task: task_identifier,
      databaseId: job.database_id
    });
    if (
      !jobs.getJobSupportAny() &&
      !this.supportedTaskNames.includes(task_identifier)
    ) {
      throw new Error('Unsupported task');
    }
    await req(task_identifier, {
      body: payload,
      databaseId: job.database_id,
      workerId: this.workerId,
      jobId: job.id
    });
  }
  async doNext(client: PgClientLike): Promise<void> {
    if (this.stopped) return;
    if (!this._initialized) {
      return await this.initialize(client);
    }

    log.debug('checking for jobs...');
    if (this.doNextTimer) {
      clearTimeout(this.doNextTimer);
      this.doNextTimer = undefined;
    }
    try {
      const job = (await jobs.getJob<JobRow>(client, {
        workerId: this.workerId,
        supportedTaskNames: jobs.getJobSupportAny()
          ? null
          : this.supportedTaskNames
      })) as JobRow | undefined;

      if (!job || !job.id) {
        if (!this.stopped) {
          this.doNextTimer = setTimeout(
            () => this.doNext(client),
            this.idleDelay
          );
        }
        return;
      }
      const start = process.hrtime();

      let err: Error | null = null;
      try {
        await this.doWork(job);
      } catch (error) {
        err = error as Error;
      }
      const durationRaw = process.hrtime(start);
      const duration = ((durationRaw[0] * 1e9 + durationRaw[1]) / 1e6).toFixed(
        2
      );
      const jobId = job.id;
      try {
        if (err) {
          await this.handleError(client, { err, job, duration });
        } else {
          await this.handleSuccess(client, { job, duration });
        }
      } catch (fatalError: unknown) {
        await this.handleFatalError(client, { err, fatalError, jobId });
      }
      if (!this.stopped) {
        return this.doNext(client);
      }
      return;
    } catch (err: unknown) {
      if (!this.stopped) {
        this.doNextTimer = setTimeout(
          () => this.doNext(client),
          this.idleDelay
        );
      }
    }
  }
  listen() {
    if (this.stopped) return;
    const listenForChanges = (
      err: Error | null,
      client: PoolClient,
      release: () => void
    ) => {
      if (err) {
        log.error('Error connecting with notify listener', err);
        if (err instanceof Error && err.stack) {
          log.debug(err.stack);
        }
        // Try again in 5 seconds
        // should this really be done in the node process?
        if (!this.stopped) {
          setTimeout(this.listen, 5000);
        }
        return;
      }
      if (this.stopped) {
        release();
        return;
      }
      this.listenClient = client;
      this.listenRelease = release;
      client.on('notification', () => {
        if (this.doNextTimer) {
          // Must be idle, do something!
          this.doNext(client);
        }
      });
      client.query('LISTEN "jobs:insert"');
      client.on('error', (e: unknown) => {
        if (this.stopped) {
          release();
          return;
        }
        log.error('Error with database notify listener', e);
        if (e instanceof Error && e.stack) {
          log.debug(e.stack);
        }
        release();
        if (!this.stopped) {
          this.listen();
        }
      });
      log.info(`${this.workerId} connected and looking for jobs...`);
      this.doNext(client);
    };
    this.pgPool.connect(listenForChanges);
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.doNextTimer) {
      clearTimeout(this.doNextTimer);
      this.doNextTimer = undefined;
    }
    const client = this.listenClient;
    const release = this.listenRelease;
    this.listenClient = undefined;
    this.listenRelease = undefined;

    if (client && release) {
      client.removeAllListeners('notification');
      client.removeAllListeners('error');
      try {
        await client.query('UNLISTEN "jobs:insert"');
      } catch {
        // Ignore listener cleanup errors during shutdown.
      }
      release();
    }
  }
}

export { Worker };
