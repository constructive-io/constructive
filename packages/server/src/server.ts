import { Server as GraphQLServer } from '@constructive-io/graphql-server';
import jobServerFactory from '@constructive-io/knative-job-server';
import Worker from '@constructive-io/knative-job-worker';
import Scheduler from '@constructive-io/job-scheduler';
import poolManager from '@constructive-io/job-pg';
import {
  getJobSupported,
  getJobsCallbackPort,
  getSchedulerHostname,
  getWorkerHostname
} from '@constructive-io/job-utils';
import { Logger } from '@pgpmjs/logger';
import { createRequire } from 'module';
import type { Server as HttpServer } from 'http';

import {
  CombinedServerOptions,
  CombinedServerResult,
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

const log = new Logger('combined-server');
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

export class CombinedServer {
  private options: CombinedServerOptions;
  private started = false;
  private result: CombinedServerResult = {
    functions: [],
    jobs: false,
    graphql: false
  };
  private graphqlServer?: GraphQLServer;
  private graphqlHttpServer?: HttpServer;
  private functionServers = new Map<FunctionName, HttpServer>();
  private jobsHttpServer?: HttpServer;
  private worker?: JobRunner;
  private scheduler?: JobRunner;
  private jobsPoolManager?: { close: () => Promise<void> };

  constructor(options: CombinedServerOptions = {}) {
    this.options = options;
  }

  async start(): Promise<CombinedServerResult> {
    if (this.started) return this.result;
    this.started = true;
    this.result = {
      functions: [],
      jobs: false,
      graphql: false
    };

    if (this.options.graphql?.enabled) {
      log.info('starting GraphQL server');
      this.graphqlServer = new GraphQLServer(
        this.options.graphql.options ?? {}
      );
      this.graphqlServer.addEventListener();
      this.graphqlHttpServer = this.graphqlServer.listen();
      if (!this.graphqlHttpServer.listening) {
        await new Promise<void>((resolveListen) => {
          this.graphqlHttpServer!.once('listening', () => resolveListen());
        });
      }
      this.result.graphql = true;
    }

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

    await closeServer(this.graphqlHttpServer);
    this.graphqlHttpServer = undefined;

    if (this.graphqlServer?.close) {
      await this.graphqlServer.close({ closeCaches: true });
    }
    this.graphqlServer = undefined;
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
