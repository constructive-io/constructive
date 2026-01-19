import jobServerFactory from '@constructive-io/knative-job-server';
import Worker from '@constructive-io/knative-job-worker';
import Scheduler from '@constructive-io/job-scheduler';
import poolManager from '@constructive-io/job-pg';
import {
  getJobPgConfig,
  getJobSchema,
  getJobSupported,
  getJobsCallbackPort,
  getSchedulerHostname,
  getWorkerHostname
} from '@constructive-io/job-utils';
import { parseEnvBoolean } from '@pgpmjs/env';
import { Logger } from '@pgpmjs/logger';
import retry from 'async-retry';
import { Client } from 'pg';
import { createRequire } from 'module';
import type { Server as HttpServer } from 'http';

import {
  KnativeJobsSvcOptions,
  KnativeJobsSvcResult,
  FunctionName,
  FunctionServiceConfig,
  FunctionsOptions,
  StartedFunction
} from './types';

type FunctionRegistryEntry = {
  moduleName: string;
  defaultPort: number;
};

const functionRegistry: Record<FunctionName, FunctionRegistryEntry> = {
  'simple-email': {
    moduleName: '@constructive-io/simple-email-fn',
    defaultPort: 8081
  },
  'send-email-link': {
    moduleName: '@constructive-io/send-email-link-fn',
    defaultPort: 8082
  }
};

const log = new Logger('knative-job-service');
const requireFn = createRequire(__filename);

const resolveFunctionEntry = (name: FunctionName): FunctionRegistryEntry => {
  const entry = functionRegistry[name];
  if (!entry) {
    throw new Error(`Unknown function "${name}".`);
  }
  return entry;
};

const loadFunctionApp = (moduleName: string) => {
  const knativeModuleId = requireFn.resolve('@constructive-io/knative-job-fn');
  delete requireFn.cache[knativeModuleId];

  const moduleId = requireFn.resolve(moduleName);
  delete requireFn.cache[moduleId];

  const mod = requireFn(moduleName) as { default?: { listen: (port: number, cb?: () => void) => unknown } };
  const app = mod.default ?? mod;

  if (!app || typeof (app as { listen?: unknown }).listen !== 'function') {
    throw new Error(`Function module "${moduleName}" does not export a listenable app.`);
  }

  return app as { listen: (port: number, cb?: () => void) => unknown };
};

const shouldEnableFunctions = (options?: FunctionsOptions): boolean => {
  if (!options) return false;
  if (typeof options.enabled === 'boolean') return options.enabled;
  return Boolean(options.services?.length);
};

const normalizeFunctionServices = (
  options?: FunctionsOptions
): FunctionServiceConfig[] => {
  if (!shouldEnableFunctions(options)) return [];

  if (!options?.services?.length) {
    return Object.keys(functionRegistry).map((name) => ({
      name: name as FunctionName
    }));
  }

  return options.services;
};

const resolveFunctionPort = (service: FunctionServiceConfig): number => {
  const entry = resolveFunctionEntry(service.name);
  return service.port ?? entry.defaultPort;
};

const ensureUniquePorts = (services: FunctionServiceConfig[]) => {
  const usedPorts = new Set<number>();
  for (const service of services) {
    const port = resolveFunctionPort(service);
    if (usedPorts.has(port)) {
      throw new Error(`Function port ${port} is assigned more than once.`);
    }
    usedPorts.add(port);
  }
};

const startFunction = async (
  service: FunctionServiceConfig,
  functionServers: Map<FunctionName, HttpServer>
): Promise<StartedFunction> => {
  const entry = resolveFunctionEntry(service.name);
  const port = resolveFunctionPort(service);
  const app = loadFunctionApp(entry.moduleName);

  await new Promise<void>((resolve, reject) => {
    const server = app.listen(port, () => {
      log.info(`function:${service.name} listening on ${port}`);
      resolve();
    }) as HttpServer & { on?: (event: string, cb: (err: Error) => void) => void };

    if (server?.on) {
      server.on('error', (err) => {
        log.error(`function:${service.name} failed to start`, err);
        reject(err);
      });
    }

    functionServers.set(service.name, server);
  });

  return { name: service.name, port };
};

const startFunctions = async (
  options: FunctionsOptions | undefined,
  functionServers: Map<FunctionName, HttpServer>
): Promise<StartedFunction[]> => {
  const services = normalizeFunctionServices(options);
  if (!services.length) return [];

  ensureUniquePorts(services);

  const started: StartedFunction[] = [];
  for (const service of services) {
    started.push(await startFunction(service, functionServers));
  }

  return started;
};

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
    functions: [],
    jobs: false
  };
  private functionServers = new Map<FunctionName, HttpServer>();
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
      functions: [],
      jobs: false
    };

    if (shouldEnableFunctions(this.options.functions)) {
      log.info('starting functions');
      this.result.functions = await startFunctions(
        this.options.functions,
        this.functionServers
      );
    }

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

    for (const server of this.functionServers.values()) {
      await closeServer(server);
    }
    this.functionServers.clear();
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

const parseList = (value?: string): string[] => {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const parsePortMap = (value?: string): Record<string, number> => {
  if (!value) return {};

  const trimmed = value.trim();
  if (!trimmed) return {};

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, number>;
      return Object.entries(parsed).reduce<Record<string, number>>((acc, [key, port]) => {
        const portNumber = Number(port);
        if (Number.isFinite(portNumber)) {
          acc[key] = portNumber;
        }
        return acc;
      }, {});
    } catch {
      return {};
    }
  }

  return trimmed.split(',').reduce<Record<string, number>>((acc, pair) => {
    const [rawName, rawPort] = pair.split(/[:=]/).map((item) => item.trim());
    const port = Number(rawPort);
    if (rawName && Number.isFinite(port)) {
      acc[rawName] = port;
    }
    return acc;
  }, {});
};

const buildFunctionsOptionsFromEnv = (): KnativeJobsSvcOptions['functions'] => {
  const rawFunctions = (process.env.CONSTRUCTIVE_FUNCTIONS || '').trim();
  if (!rawFunctions) return undefined;

  const portMap = parsePortMap(process.env.CONSTRUCTIVE_FUNCTION_PORTS);
  const normalized = rawFunctions.toLowerCase();

  if (normalized === 'all' || normalized === '*') {
    return { enabled: true };
  }

  const names = parseList(rawFunctions) as FunctionName[];
  if (!names.length) return undefined;

  const services: FunctionServiceConfig[] = names.map((name) => ({
    name,
    port: portMap[name]
  }));

  return {
    enabled: true,
    services
  };
};

export const buildKnativeJobsSvcOptionsFromEnv = (): KnativeJobsSvcOptions => ({
  jobs: {
    enabled: parseEnvBoolean(process.env.CONSTRUCTIVE_JOBS_ENABLED) ?? true
  },
  functions: buildFunctionsOptionsFromEnv()
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
    jobsEnabled: options.jobs?.enabled ?? true,
    functionsEnabled: shouldEnableFunctions(options.functions),
    functions: normalizeFunctionServices(options.functions).map(s => s.name)
  });

  if (options.jobs?.enabled === false) {
    log.info('jobs disabled; skipping startup');
    return;
  }

  const server = new KnativeJobsSvc(options);
  await server.start();
};

export * from './types';
