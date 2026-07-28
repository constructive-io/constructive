import { stat } from 'node:fs/promises';
import type { Server as HttpServer } from 'node:http';
import { resolve } from 'node:path';

import {
  CliError,
  defineCommand,
  isSensitiveKey,
  Type,
  type Static,
  type OperationContext,
} from '@constructive-io/cli-runtime';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import { withLogsSuppressed } from '@pgpmjs/logger';

import { withConsoleSuppressed } from '../console-isolation';
import { importOptionalCapability } from './optional-capability';

type FunctionName = 'send-email' | 'send-verification-link';

interface FunctionServiceConfig {
  name: FunctionName;
  port?: number;
}

interface KnativeJobsSvcOptions {
  functions?: {
    enabled?: boolean;
    services?: FunctionServiceConfig[];
  };
  jobs?: { enabled?: boolean };
  runtime?: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    signal?: AbortSignal;
  };
}

const ServiceEventSchema = Type.Union([
  Type.Object(
    {
      event: Type.Literal('service.starting'),
      service: Type.String(),
    },
    { additionalProperties: false }
  ),
  Type.Object(
    {
      event: Type.Literal('service.ready'),
      service: Type.String(),
      url: Type.Optional(Type.String()),
      port: Type.Optional(Type.Integer({ minimum: 0, maximum: 65535 })),
    },
    { additionalProperties: false }
  ),
  Type.Object(
    {
      event: Type.Literal('service.stopping'),
      service: Type.String(),
    },
    { additionalProperties: false }
  ),
  Type.Object(
    {
      event: Type.Literal('service.stopped'),
      service: Type.String(),
    },
    { additionalProperties: false }
  ),
]);

const suppressOperationOutput = <T>(callback: () => Promise<T>): Promise<T> =>
  withConsoleSuppressed(() => withLogsSuppressed(callback));

type ServiceEvent = Static<typeof ServiceEventSchema>;

const ServiceOutputSchema = Type.Object(
  {
    service: Type.String(),
    status: Type.Literal('stopped'),
    url: Type.Optional(Type.String()),
    port: Type.Optional(Type.Integer({ minimum: 0, maximum: 65535 })),
  },
  { additionalProperties: false }
);

const booleanOption = (name: string, deprecatedAlias?: string) => ({
  kind: 'option' as const,
  name,
  ...(deprecatedAlias ? { deprecatedAliases: [deprecatedAlias] } : {}),
  negatable: true,
});

const toProcessEnv = (
  env: Readonly<Record<string, string | undefined>>
): NodeJS.ProcessEnv => ({ ...env });

/** Register config-file secrets before dependency errors can enter the protocol. */
const registerResolvedConfigSecrets = (
  value: unknown,
  context: Pick<OperationContext, 'registerSensitiveValue'>
): void => {
  const ancestors = new WeakSet<object>();
  const visit = (
    candidate: unknown,
    parentKey?: string,
    inheritedSensitive = false
  ): void => {
    const sensitive =
      inheritedSensitive ||
      (parentKey !== undefined &&
        (isSensitiveKey(parentKey) || parentKey.toLowerCase() === 'pass'));
    if (typeof candidate === 'string') {
      if (sensitive && candidate.length > 0) {
        context.registerSensitiveValue(candidate);
      }
      return;
    }
    if (candidate === null || typeof candidate !== 'object') return;
    if (ancestors.has(candidate)) return;
    ancestors.add(candidate);
    for (const key of Object.keys(candidate)) {
      const descriptor = Object.getOwnPropertyDescriptor(candidate, key);
      if (descriptor && 'value' in descriptor) {
        visit(descriptor.value, key, sensitive);
      }
    }
    ancestors.delete(candidate);
  };

  visit(value);
};

const serverAddress = (
  server: HttpServer,
  fallbackHost: string
): { url: string; port: number } => {
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const rawHost =
    typeof address === 'object' && address && address.address
      ? address.address
      : fallbackHost;
  const host =
    rawHost === '::' || rawHost === '[::]' || rawHost === '0.0.0.0'
      ? 'localhost'
      : rawHost;
  const formattedHost = host.includes(':') ? `[${host}]` : host;
  return { url: `http://${formattedHost}:${port}`, port };
};

const waitForAbortOrClose = async (
  signal: AbortSignal,
  server?: HttpServer
): Promise<void> =>
  new Promise<void>((resolveWait, rejectWait) => {
    const cleanup = () => {
      signal.removeEventListener('abort', handleAbort);
      server?.off('close', handleClose);
    };
    const handleAbort = () => {
      cleanup();
      rejectWait(
        signal.reason ??
          new DOMException('The operation was cancelled.', 'AbortError')
      );
    };
    const handleClose = () => {
      cleanup();
      resolveWait();
    };

    if (signal.aborted) {
      handleAbort();
      return;
    }
    signal.addEventListener('abort', handleAbort, { once: true });
    server?.once('close', handleClose);
  });

const raceWithAbort = async <T>(
  signal: AbortSignal,
  operation: Promise<T>
): Promise<T> => {
  if (signal.aborted) {
    throw (
      signal.reason ??
      new DOMException('The operation was cancelled.', 'AbortError')
    );
  }

  let handleAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_resolve, reject) => {
    handleAbort = () =>
      reject(
        signal.reason ??
          new DOMException('The operation was cancelled.', 'AbortError')
      );
    signal.addEventListener('abort', handleAbort, { once: true });
  });

  try {
    return await Promise.race([operation, aborted]);
  } finally {
    if (handleAbort) signal.removeEventListener('abort', handleAbort);
  }
};

const serviceStartError = (service: string, error: unknown): CliError => {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return new CliError({
    code:
      code === 'EADDRINUSE' ? 'SERVICE_PORT_IN_USE' : 'SERVICE_START_FAILED',
    category: 'operation',
    message:
      code === 'EADDRINUSE'
        ? `${service} could not start because its port is already in use.`
        : `${service} failed to start.`,
    details: code ? { systemCode: code } : undefined,
    retryable: code === 'EADDRINUSE' || code === 'ECONNREFUSED',
    cause: error,
  });
};

const emit = (context: OperationContext<ServiceEvent>, event: ServiceEvent) =>
  context.events.emit(event);

/**
 * Finish a service lifecycle without allowing an event publication failure to
 * skip resource cleanup. When the operation is already failing, preserve that
 * primary error after making a best effort to stop the service. Otherwise the
 * first lifecycle or cleanup failure becomes the operation failure.
 */
const finalizeService = async (
  context: OperationContext<ServiceEvent>,
  service: string,
  cleanup: () => Promise<void>,
  primaryError: unknown
): Promise<void> => {
  let finalizationError: unknown;
  try {
    await emit(context, { event: 'service.stopping', service });
  } catch (error) {
    finalizationError = error;
  }

  let cleanedUp = false;
  try {
    await cleanup();
    cleanedUp = true;
  } catch (error) {
    finalizationError ??= error;
  }

  if (cleanedUp) {
    try {
      await emit(context, { event: 'service.stopped', service });
    } catch (error) {
      finalizationError ??= error;
    }
  }

  if (primaryError === undefined && finalizationError !== undefined) {
    throw finalizationError;
  }
};

const ServerInputSchema = Type.Object(
  {
    database: Type.Optional(Type.String({ minLength: 1 })),
    host: Type.Optional(Type.String({ minLength: 1 })),
    port: Type.Optional(Type.Integer({ minimum: 0, maximum: 65535 })),
    origin: Type.Optional(Type.String({ minLength: 1 })),
    simpleInflection: Type.Optional(Type.Boolean()),
    oppositeBaseNames: Type.Optional(Type.Boolean()),
    postgis: Type.Optional(Type.Boolean()),
    servicesApi: Type.Optional(Type.Boolean()),
    schemas: Type.Optional(Type.String()),
    authRole: Type.Optional(Type.String({ minLength: 1 })),
    roleName: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false }
);

type ServerInput = Static<typeof ServerInputSchema>;

const buildServerOverrides = (
  input: ServerInput
): Partial<ConstructiveOptions> => ({
  ...(input.database === undefined ? {} : { pg: { database: input.database } }),
  features: {
    simpleInflection: input.simpleInflection ?? true,
    oppositeBaseNames: input.oppositeBaseNames ?? false,
    postgis: input.postgis ?? true,
  },
  api: {
    enableServicesApi: input.servicesApi ?? true,
    ...(input.schemas === undefined
      ? {}
      : {
          exposedSchemas: input.schemas
            .split(',')
            .map((schema) => schema.trim())
            .filter(Boolean),
        }),
    ...(input.authRole === undefined ? {} : { anonRole: input.authRole }),
    ...(input.roleName === undefined ? {} : { roleName: input.roleName }),
  },
  server: {
    ...(input.host === undefined ? {} : { host: input.host }),
    port: input.port ?? 5555,
    ...(input.origin === undefined ? {} : { origin: input.origin }),
  },
});

export const serverCommand = defineCommand({
  id: 'server.start',
  path: ['server'],
  summary: 'Start the Constructive GraphQL server.',
  input: ServerInputSchema,
  output: ServiceOutputSchema,
  events: ServiceEventSchema,
  bindings: [
    {
      property: 'database',
      sources: [
        { kind: 'option', name: 'database' },
        { kind: 'environment', name: 'PGDATABASE' },
      ],
      conflict: 'first',
      description: 'PostgreSQL database name.',
    },
    {
      property: 'host',
      sources: [{ kind: 'option', name: 'host' }],
      description: 'HTTP listener host.',
    },
    {
      property: 'port',
      sources: [{ kind: 'option', name: 'port' }],
      valueType: 'number',
      description: 'HTTP listener port.',
    },
    {
      property: 'origin',
      sources: [{ kind: 'option', name: 'origin' }],
      description: 'CORS origin override.',
    },
    {
      property: 'simpleInflection',
      sources: [booleanOption('simple-inflection', 'simpleInflection')],
      valueType: 'boolean',
      description: 'Enable simple inflection.',
    },
    {
      property: 'oppositeBaseNames',
      sources: [booleanOption('opposite-base-names', 'oppositeBaseNames')],
      valueType: 'boolean',
      description: 'Enable opposite base names.',
    },
    {
      property: 'postgis',
      sources: [booleanOption('postgis')],
      valueType: 'boolean',
      description: 'Enable PostGIS support.',
    },
    {
      property: 'servicesApi',
      sources: [booleanOption('services-api', 'servicesApi')],
      valueType: 'boolean',
      description: 'Enable the Services API.',
    },
    {
      property: 'schemas',
      sources: [{ kind: 'option', name: 'schemas' }],
      description: 'Comma-separated schemas when Services API is disabled.',
    },
    {
      property: 'authRole',
      sources: [
        { kind: 'option', name: 'auth-role', deprecatedAliases: ['authRole'] },
      ],
      description: 'Authentication role.',
    },
    {
      property: 'roleName',
      sources: [
        { kind: 'option', name: 'role-name', deprecatedAliases: ['roleName'] },
      ],
      description: 'Default role name.',
    },
  ],
  examples: [
    { argv: ['server', '--database', 'app', '--port', '5555'] },
    { argv: ['server', '--no-postgis'] },
  ],
  lifecycle: 'long-running',
  effect: 'service',
  async execute(input, context) {
    return suppressOperationOutput(async () => {
      const [
        { getEnvOptions },
        { Server: GraphQLServer, withServerEnvironment },
      ] = await Promise.all([
        importOptionalCapability(
          'server',
          '@constructive-io/graphql-env',
          () => import('@constructive-io/graphql-env')
        ),
        importOptionalCapability(
          'server',
          '@constructive-io/graphql-server',
          () => import('@constructive-io/graphql-server')
        ),
      ]);

      return withServerEnvironment(context.env, async () => {
        const options = getEnvOptions(
          buildServerOverrides(input),
          context.cwd,
          toProcessEnv(context.env)
        );
        registerResolvedConfigSecrets(options, context);
        if (
          input.database === undefined &&
          !context.env.PGDATABASE &&
          options.pg.database === 'postgres'
        ) {
          throw new CliError({
            code: 'SERVER_DATABASE_REQUIRED',
            category: 'configuration',
            message:
              'Select an application database with --database, PGDATABASE, or pg.database in the project config.',
            path: '/database',
            details: {
              acceptedSources: ['--database', 'PGDATABASE', 'pg.database'],
            },
          });
        }
        if (
          options.api.enableServicesApi === false &&
          (options.api.exposedSchemas?.length ?? 0) === 0
        ) {
          throw new CliError({
            code: 'SERVER_SCHEMAS_REQUIRED',
            category: 'configuration',
            message:
              'At least one exposed schema is required when the Services API is disabled.',
            path: '/schemas',
          });
        }
        const instance = new GraphQLServer(options, {
          cwd: context.cwd,
          env: toProcessEnv(context.env),
        });
        let httpServer: HttpServer | undefined;
        let address: { url: string; port: number } | undefined;
        let primaryError: unknown;
        try {
          await emit(context, {
            event: 'service.starting',
            service: 'graphql',
          });
          try {
            httpServer = await raceWithAbort(
              context.signal,
              instance.start(context.signal)
            );
          } catch (error) {
            if (context.signal.aborted) throw error;
            throw serviceStartError('GraphQL server', error);
          }
          address = serverAddress(
            httpServer,
            options.server.host || 'localhost'
          );
          await emit(context, {
            event: 'service.ready',
            service: 'graphql',
            url: address.url,
            port: address.port,
          });
          try {
            await Promise.race([
              waitForAbortOrClose(context.signal, httpServer),
              instance.waitForFailure(),
            ]);
          } catch (error) {
            if (context.signal.aborted) throw error;
            throw serviceStartError('GraphQL server', error);
          }
        } catch (error) {
          primaryError = error;
          throw error;
        } finally {
          await finalizeService(
            context,
            'graphql',
            () => instance.close({ closeCaches: true }),
            primaryError
          );
        }
        return {
          data: {
            service: 'graphql',
            status: 'stopped' as const,
            ...(address ?? {}),
          },
        };
      });
    });
  },
});

const ExplorerInputSchema = Type.Object(
  {
    host: Type.Optional(Type.String({ minLength: 1 })),
    port: Type.Optional(Type.Integer({ minimum: 0, maximum: 65535 })),
    origin: Type.Optional(Type.String({ minLength: 1 })),
    simpleInflection: Type.Optional(Type.Boolean()),
    oppositeBaseNames: Type.Optional(Type.Boolean()),
    postgis: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false }
);

export const explorerCommand = defineCommand({
  id: 'explorer.start',
  path: ['explorer'],
  summary: 'Start the Constructive GraphQL explorer.',
  input: ExplorerInputSchema,
  output: ServiceOutputSchema,
  events: ServiceEventSchema,
  bindings: [
    {
      property: 'host',
      sources: [{ kind: 'option', name: 'host' }],
      description: 'HTTP listener host.',
    },
    {
      property: 'port',
      sources: [{ kind: 'option', name: 'port' }],
      valueType: 'number',
      description: 'HTTP listener port.',
    },
    {
      property: 'origin',
      sources: [{ kind: 'option', name: 'origin' }],
      description: 'CORS origin.',
    },
    {
      property: 'simpleInflection',
      sources: [booleanOption('simple-inflection', 'simpleInflection')],
      valueType: 'boolean',
      description: 'Enable simple inflection.',
    },
    {
      property: 'oppositeBaseNames',
      sources: [booleanOption('opposite-base-names', 'oppositeBaseNames')],
      valueType: 'boolean',
      description: 'Enable opposite base names.',
    },
    {
      property: 'postgis',
      sources: [booleanOption('postgis')],
      valueType: 'boolean',
      description: 'Enable PostGIS support.',
    },
  ],
  examples: [{ argv: ['explorer', '--port', '5555'] }],
  lifecycle: 'long-running',
  effect: 'service',
  async execute(input, context) {
    return suppressOperationOutput(async () => {
      const [{ getEnvOptions }, { startGraphQLExplorer }] = await Promise.all([
        importOptionalCapability(
          'explorer',
          '@constructive-io/graphql-env',
          () => import('@constructive-io/graphql-env')
        ),
        importOptionalCapability(
          'explorer',
          '@constructive-io/graphql-explorer',
          () => import('@constructive-io/graphql-explorer')
        ),
      ]);
      const options = getEnvOptions(
        {
          features: {
            simpleInflection: input.simpleInflection ?? true,
            oppositeBaseNames: input.oppositeBaseNames ?? false,
            postgis: input.postgis ?? true,
          },
          server: {
            ...(input.host === undefined ? {} : { host: input.host }),
            port: input.port ?? 5555,
            origin: input.origin ?? 'http://localhost:3000',
          },
        },
        context.cwd,
        toProcessEnv(context.env)
      );
      registerResolvedConfigSecrets(options, context);
      let handle: Awaited<ReturnType<typeof startGraphQLExplorer>> | undefined;
      let primaryError: unknown;
      try {
        await emit(context, {
          event: 'service.starting',
          service: 'explorer',
        });
        try {
          handle = await raceWithAbort(
            context.signal,
            startGraphQLExplorer(options, {
              cwd: context.cwd,
              env: toProcessEnv(context.env),
              signal: context.signal,
              onError: () => undefined,
            })
          );
        } catch (error) {
          if (context.signal.aborted) throw error;
          throw serviceStartError('GraphQL explorer', error);
        }
        const address = serverAddress(
          handle.httpServer,
          options.server.host || 'localhost'
        );
        await emit(context, {
          event: 'service.ready',
          service: 'explorer',
          url: address.url,
          port: address.port,
        });
        try {
          await Promise.race([
            waitForAbortOrClose(context.signal, handle.httpServer),
            handle.waitForFailure(),
          ]);
        } catch (error) {
          if (context.signal.aborted) throw error;
          throw serviceStartError('GraphQL explorer', error);
        }
        return {
          data: {
            service: 'explorer',
            status: 'stopped' as const,
            url: address.url,
            port: address.port,
          },
        };
      } catch (error) {
        primaryError = error;
        throw error;
      } finally {
        await finalizeService(
          context,
          'explorer',
          async () => handle?.close(),
          primaryError
        );
      }
    });
  },
});

interface ParsedFunctions {
  mode: 'all' | 'list';
  services: FunctionServiceConfig[];
}

const SUPPORTED_FUNCTIONS = new Set<FunctionName>([
  'send-email',
  'send-verification-link',
]);

export const parseFunctions = (value?: string): ParsedFunctions | undefined => {
  if (value === undefined) return undefined;
  const tokens = value
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.length === 0) return { mode: 'list', services: [] };
  if (tokens.some((token) => ['all', '*'].includes(token.toLowerCase()))) {
    if (tokens.length !== 1) {
      throw new CliError({
        code: 'JOBS_FUNCTIONS_INVALID',
        category: 'validation',
        message: 'Use "all" without other function names.',
      });
    }
    return { mode: 'all', services: [] };
  }

  const services = new Map<string, FunctionServiceConfig>();
  for (const token of tokens) {
    const [rawName, rawPort, ...surplus] = token.split(/[:=]/);
    const name = rawName?.trim();
    if (!name || surplus.length > 0) {
      throw new CliError({
        code: 'JOBS_FUNCTIONS_INVALID',
        category: 'validation',
        message: `Invalid function declaration "${token}".`,
      });
    }
    if (!SUPPORTED_FUNCTIONS.has(name as FunctionName)) {
      throw new CliError({
        code: 'JOBS_FUNCTION_UNKNOWN',
        category: 'validation',
        message: `Unknown function "${name}".`,
        path: '/functions',
        details: { supported: [...SUPPORTED_FUNCTIONS] },
      });
    }
    if (services.has(name)) {
      throw new CliError({
        code: 'JOBS_FUNCTION_DUPLICATE',
        category: 'validation',
        message: `Function "${name}" is declared more than once.`,
        path: '/functions',
      });
    }
    let port: number | undefined;
    if (rawPort !== undefined) {
      port = Number(rawPort.trim());
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new CliError({
          code: 'JOBS_FUNCTION_PORT_INVALID',
          category: 'validation',
          message: `Function "${name}" has an invalid port.`,
          path: '/functions',
        });
      }
    }
    services.set(name, {
      name: name as FunctionName,
      ...(port === undefined ? {} : { port }),
    });
  }
  return { mode: 'list', services: [...services.values()] };
};

const JobsInputSchema = Type.Object(
  {
    withJobsServer: Type.Optional(Type.Boolean()),
    functions: Type.Optional(Type.String()),
  },
  { additionalProperties: false }
);

const JobsOutputSchema = Type.Object(
  {
    service: Type.Literal('jobs'),
    status: Type.Literal('stopped'),
    jobs: Type.Boolean(),
    jobsPort: Type.Optional(Type.Integer({ minimum: 1, maximum: 65535 })),
    functions: Type.Array(
      Type.Object(
        {
          name: Type.String(),
          port: Type.Integer({ minimum: 1, maximum: 65535 }),
        },
        { additionalProperties: false }
      )
    ),
  },
  { additionalProperties: false }
);

export const jobsCommand = defineCommand({
  id: 'jobs.up',
  path: ['jobs', 'up'],
  summary: 'Start Constructive jobs and function services.',
  input: JobsInputSchema,
  output: JobsOutputSchema,
  events: ServiceEventSchema,
  bindings: [
    {
      property: 'withJobsServer',
      sources: [booleanOption('with-jobs-server', 'withJobsServer')],
      valueType: 'boolean',
      description: 'Enable the jobs callback server, worker, and scheduler.',
    },
    {
      property: 'functions',
      sources: [{ kind: 'option', name: 'functions' }],
      description: 'Comma-separated function names, optionally with ports.',
    },
  ],
  examples: [
    { argv: ['jobs', 'up', '--with-jobs-server'] },
    { argv: ['jobs', 'up', '--functions', 'send-email=8081'] },
  ],
  lifecycle: 'long-running',
  effect: 'service',
  async execute(input, context) {
    return suppressOperationOutput(async () => {
      const { KnativeJobsSvc } = await importOptionalCapability(
        'jobs',
        '@constructive-io/knative-job-service',
        () => import('@constructive-io/knative-job-service')
      );
      const cwd = resolve(context.cwd);
      const cwdStat = await stat(cwd).catch((): undefined => undefined);
      if (!cwdStat?.isDirectory()) {
        throw new CliError({
          code: 'CWD_NOT_FOUND',
          category: 'configuration',
          message: `Working directory does not exist: ${cwd}`,
          path: '/cwd',
        });
      }

      const parsedFunctions = parseFunctions(input.functions);
      const options: KnativeJobsSvcOptions = {
        jobs: { enabled: input.withJobsServer === true },
        ...(parsedFunctions === undefined
          ? {}
          : parsedFunctions.mode === 'all'
            ? { functions: { enabled: true } }
            : parsedFunctions.services.length > 0
              ? {
                  functions: {
                    enabled: true,
                    services: parsedFunctions.services,
                  },
                }
              : {}),
        runtime: {
          cwd,
          env: toProcessEnv(context.env),
          signal: context.signal,
        },
      };

      if (!options.jobs?.enabled && !options.functions?.enabled) {
        throw new CliError({
          code: 'JOBS_NO_SERVICES_ENABLED',
          category: 'validation',
          message:
            'Enable --with-jobs-server, provide --functions, or do both.',
        });
      }

      const service = new KnativeJobsSvc(options);
      let primaryError: unknown;
      try {
        await emit(context, { event: 'service.starting', service: 'jobs' });
        let result: Awaited<ReturnType<typeof service.start>>;
        try {
          result = await raceWithAbort(context.signal, service.start());
        } catch (error) {
          if (context.signal.aborted) throw error;
          throw serviceStartError('Jobs runtime', error);
        }
        if (result.jobs && result.jobsPort) {
          await emit(context, {
            event: 'service.ready',
            service: 'jobs',
            url: `http://localhost:${result.jobsPort}`,
            port: result.jobsPort,
          });
        }
        for (const fn of result.functions) {
          await emit(context, {
            event: 'service.ready',
            service: `function:${fn.name}`,
            url: `http://localhost:${fn.port}`,
            port: fn.port,
          });
        }
        try {
          await Promise.race([
            waitForAbortOrClose(context.signal),
            service.waitForFailure(),
          ]);
        } catch (error) {
          if (context.signal.aborted) throw error;
          throw serviceStartError('Jobs runtime', error);
        }
        return {
          data: {
            service: 'jobs' as const,
            status: 'stopped' as const,
            jobs: result.jobs,
            ...(result.jobsPort === undefined
              ? {}
              : { jobsPort: result.jobsPort }),
            functions: result.functions,
          },
        };
      } catch (error) {
        primaryError = error;
        throw error;
      } finally {
        await finalizeService(
          context,
          'jobs',
          () => service.stop(),
          primaryError
        );
      }
    });
  },
});

export const serviceCommands = [
  serverCommand,
  explorerCommand,
  jobsCommand,
] as const;
