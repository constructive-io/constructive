import { GraphQLServer } from '@constructive-io/graphql-server';
import { bootJobs } from '@constructive-io/knative-job-service/dist/run';
import { Logger } from '@pgpmjs/logger';
import { createRequire } from 'module';

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
const functionServers = new Map<FunctionName, unknown>();

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
  service: FunctionServiceConfig
): Promise<StartedFunction> => {
  const entry = resolveFunctionEntry(service.name);
  const port = resolveFunctionPort(service);
  const app = loadFunctionApp(entry.moduleName);

  await new Promise<void>((resolve, reject) => {
    const server = app.listen(port, () => {
      log.info(`function:${service.name} listening on ${port}`);
      resolve();
    }) as { on?: (event: string, cb: (err: Error) => void) => void };

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

export const startFunctions = async (
  options?: FunctionsOptions
): Promise<StartedFunction[]> => {
  const services = normalizeFunctionServices(options);
  if (!services.length) return [];

  ensureUniquePorts(services);

  const started: StartedFunction[] = [];
  for (const service of services) {
    started.push(await startFunction(service));
  }

  return started;
};

export const CombinedServer = async (
  options: CombinedServerOptions = {}
): Promise<CombinedServerResult> => {
  const result: CombinedServerResult = {
    functions: [],
    jobs: false,
    graphql: false
  };

  if (options.graphql?.enabled) {
    log.info('starting GraphQL server');
    GraphQLServer(options.graphql.options ?? {});
    result.graphql = true;
  }

  if (shouldEnableFunctions(options.functions)) {
    log.info('starting functions');
    result.functions = await startFunctions(options.functions);
  }

  if (options.jobs?.enabled) {
    log.info('starting jobs service');
    await bootJobs();
    result.jobs = true;
  }

  return result;
};
