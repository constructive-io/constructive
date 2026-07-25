import poolManager from '@constructive-io/job-pg';
import Scheduler from '@constructive-io/job-scheduler';
import {
  getJobPgConfig,
  getJobsCallbackPort,
  getJobSchema,
  getJobSupported,
  getSchedulerHostname,
  getWorkerHostname
} from '@constructive-io/job-utils';
import jobServerFactory from '@constructive-io/knative-job-server';
import Worker from '@constructive-io/knative-job-worker';
import { parseEnvBoolean } from '@pgpmjs/env';
import { Logger } from '@pgpmjs/logger';
import retry from 'async-retry';
import type { Server as HttpServer } from 'http';
import { Client } from 'pg';

import {
  KnativeJobsSvcOptions,
  KnativeJobsSvcResult
} from './types';

const log = new Logger('knative-job-service');

type JobRunner = {
  listen: () => void;
  stop?: () => Promise<void> | void;
};

const listenApp = async (
  app: { listen: (port: number, host?: string) => HttpServer },
  port: number,
  host?: string
): Promise<HttpServer> =>
  new Promise((resolveListen, rejectListen) => {
    const server = host ? app.listen(port, host) : app.listen(port);

    const cleanup = () => {
      server.off('listening', handleListen);
      server.off('error', handleError);
    };

    const handleListen = () => {
      cleanup();
      resolveListen(server);
    };

    const handleError = (err: Error) => {
      cleanup();
      rejectListen(err);
    };

    server.once('listening', handleListen);
    server.once('error', handleError);
  });

const closeServer = async (server?: HttpServer | null): Promise<void> => {
  if (!server || !server.listening) return;
  await new Promise<void>((resolveClose, rejectClose) => {
    server.close((err) => {
      if (err) {
        rejectClose(err);
        return;
      }
      resolveClose();
    });
  });
};

export class KnativeJobsSvc {
  private options: KnativeJobsSvcOptions;
  private started = false;
  private result: KnativeJobsSvcResult = {
    jobs: false
  };
  private jobsHttpServer?: HttpServer;
  private worker?: JobRunner;
  private scheduler?: JobRunner;
  private jobsPoolManager?: { close: () => Promise<void> };

  constructor(options: KnativeJobsSvcOptions = {}) {
    this.options = options;
  }

  async start(): Promise<KnativeJobsSvcResult> {
    if (this.started) return this.result;
    this.started = true;
    this.result = {
      jobs: false
    };

    if (this.options.jobs?.enabled) {
      log.info('starting jobs service');
      await this.startJobs();
      this.result.jobs = true;
    }

    return this.result;
  }

  async stop(): Promise<void> {
    if (!this.started) return;
    this.started = false;

    if (this.worker?.stop) {
      await this.worker.stop();
    }
    if (this.scheduler?.stop) {
      await this.scheduler.stop();
    }
    this.worker = undefined;
    this.scheduler = undefined;

    await closeServer(this.jobsHttpServer);
    this.jobsHttpServer = undefined;

    if (this.jobsPoolManager) {
      await this.jobsPoolManager.close();
      this.jobsPoolManager = undefined;
    }
  }

  private async startJobs(): Promise<void> {
    const pgPool = poolManager.getPool();
    const jobsApp = jobServerFactory(pgPool);
    const callbackPort = getJobsCallbackPort();
    this.jobsHttpServer = await listenApp(jobsApp, callbackPort);

    const tasks = getJobSupported();
    this.worker = new Worker({
      pgPool,
      tasks,
      workerId: getWorkerHostname()
    });
    this.scheduler = new Scheduler({
      pgPool,
      tasks,
      workerId: getSchedulerHostname()
    });

    this.jobsPoolManager = poolManager;

    this.worker.listen();
    this.scheduler.listen();
  }
}

export const buildKnativeJobsSvcOptionsFromEnv = (): KnativeJobsSvcOptions => ({
  jobs: {
    enabled: parseEnvBoolean(process.env.CONSTRUCTIVE_JOBS_ENABLED) ?? true
  }
});

export const startKnativeJobsSvcFromEnv = async (): Promise<KnativeJobsSvcResult> => {
  const server = new KnativeJobsSvc(buildKnativeJobsSvcOptionsFromEnv());
  return server.start();
};

export const startJobsServices = () => {
  log.info('starting jobs services...');
  const pgPool = poolManager.getPool();
  const app = jobServerFactory(pgPool);

  const callbackPort = getJobsCallbackPort();
  const httpServer = app.listen(callbackPort, () => {
    log.info(`listening ON ${callbackPort}`);

    const tasks = getJobSupported();

    const worker = new Worker({
      pgPool,
      workerId: getWorkerHostname(),
      tasks
    });

    const scheduler = new Scheduler({
      pgPool,
      workerId: getSchedulerHostname(),
      tasks
    });

    worker.listen();
    scheduler.listen();
  });

  return { pgPool, httpServer };
};

export const waitForJobsPrereqs = async (): Promise<void> => {
  log.info('waiting for jobs prereqs');
  let client: Client | null = null;
  try {
    const cfg = getJobPgConfig();
    client = new Client({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database
    });
    await client.connect();
    const schema = getJobSchema();
    await client.query(`SELECT * FROM "${schema}".jobs LIMIT 1;`);
  } catch (error) {
    log.error(error);
    throw new Error('jobs server boot failed...');
  } finally {
    if (client) {
      void client.end();
    }
  }
};

export const bootJobs = async (): Promise<void> => {
  log.info('attempting to boot jobs');
  await retry(
    async () => {
      await waitForJobsPrereqs();
    },
    {
      retries: 10,
      factor: 2
    }
  );

  const options = buildKnativeJobsSvcOptionsFromEnv();

  // Log startup configuration (non-sensitive values only)
  const pgConfig = getJobPgConfig();
  log.info('[knative-job-service] Starting with config:', {
    database: pgConfig.database,
    host: pgConfig.host,
    port: pgConfig.port,
    schema: getJobSchema(),
    callbackPort: getJobsCallbackPort(),
    workerHostname: getWorkerHostname(),
    schedulerHostname: getSchedulerHostname(),
    supportedTasks: getJobSupported(),
    jobsEnabled: options.jobs?.enabled ?? true
  });

  if (options.jobs?.enabled === false) {
    log.info('jobs disabled; skipping startup');
    return;
  }

  const server = new KnativeJobsSvc(options);
  await server.start();
};

export * from './types';
