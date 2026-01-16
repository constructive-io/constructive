import {
  getEnvOptions,
  getNodeEnv,
  parseEnvBoolean,
  parseEnvNumber
} from '@pgpmjs/env';
import { defaultPgConfig, getPgEnvVars, type PgConfig } from 'pg-env';
import { getPgPool } from 'pg-cache';
import type { Pool } from 'pg';
import type { PgpmOptions } from '@pgpmjs/types';
import { jobsDefaults, type JobsConfig } from '@pgpmjs/types';

type NodeEnv = 'development' | 'production' | 'test';

export type JobsRuntimeConfigOptions = {
  jobsConfig?: JobsConfig;
  pgConfig?: PgConfig;
  devMapConfig?: Record<string, string> | null;
  envConfig?: NodeJS.ProcessEnv;
  cwd?: string;
};

export type JobsRuntimeConfig = {
  pgConfig: PgConfig;
  schemaConfig: { schema: string };
  supportConfig: { supportAny: boolean; supported: string[] };
  workerConfig: { hostname: string };
  schedulerConfig: { hostname: string };
  gatewayConfig: {
    gatewayUrl: string;
    callbackUrl: string;
    callbackPort: number;
  };
  devMapConfig: { devMap: Record<string, string> | null };
  callbackConfig: { callbackBaseUrl: string };
  nodeEnvConfig: { nodeEnv: NodeEnv };
};

const getEnvOptionsForJobs = ({
  envConfig,
  cwd
}: JobsRuntimeConfigOptions): PgpmOptions => {
  const env = envConfig ?? process.env;
  return getEnvOptions({}, cwd ?? process.cwd(), env);
};

const getPgEnvOverrides = (
  envConfig?: NodeJS.ProcessEnv
): Partial<PgConfig> => {
  if (!envConfig) {
    return getPgEnvVars();
  }

  return {
    ...(envConfig.PGHOST && { host: envConfig.PGHOST }),
    ...(envConfig.PGPORT && { port: parseEnvNumber(envConfig.PGPORT) }),
    ...(envConfig.PGUSER && { user: envConfig.PGUSER }),
    ...(envConfig.PGPASSWORD && { password: envConfig.PGPASSWORD }),
    ...(envConfig.PGDATABASE && { database: envConfig.PGDATABASE })
  };
};

const resolveNodeEnv = (envConfig?: NodeJS.ProcessEnv): NodeEnv => {
  const raw = envConfig?.NODE_ENV?.toLowerCase();
  if (raw === 'production' || raw === 'test') return raw;
  if (raw === 'development') return 'development';
  return getNodeEnv() as NodeEnv;
};

// ---- PG config ----
export const getJobPgConfig = (
  options: JobsRuntimeConfigOptions = {}
): PgConfig => {
  const opts = getEnvOptionsForJobs(options);
  const envOnly = getPgEnvOverrides(options.envConfig);

  return {
    ...defaultPgConfig,
    ...(opts.pg ?? {}),
    ...envOnly,
    ...(options.pgConfig ?? {})
  };
};

export const getJobPool = (
  options: JobsRuntimeConfigOptions = {}
): Pool => getPgPool(getJobPgConfig(options));

export const getJobConnectionString = (
  options: JobsRuntimeConfigOptions = {}
): string => {
  const cfg = getJobPgConfig(options);
  const auth = cfg.user
    ? `${cfg.user}${cfg.password ? `:${cfg.password}` : ''}@`
    : '';
  return `postgres://${auth}${cfg.host}:${cfg.port}/${cfg.database}`;
};

// ---- Schema ----
export const getJobSchema = (
  options: JobsRuntimeConfigOptions = {}
): string => {
  const opts = getEnvOptionsForJobs(options);
  const fromConfig = options.jobsConfig?.schema?.schema;
  const fromOpts: string | undefined = opts.jobs?.schema?.schema;
  return (
    fromConfig ||
    fromOpts ||
    jobsDefaults.schema?.schema ||
    'app_jobs'
  );
};

// ---- SupportAny / Supported ----
export const getJobSupportAny = (
  options: JobsRuntimeConfigOptions = {}
): boolean => {
  const opts = getEnvOptionsForJobs(options);
  const workerOverride = options.jobsConfig?.worker?.supportAny;
  const schedulerOverride = options.jobsConfig?.scheduler?.supportAny;
  if (typeof workerOverride === 'boolean') return workerOverride;
  if (typeof schedulerOverride === 'boolean') return schedulerOverride;

  const envVal = parseEnvBoolean(
    options.envConfig?.JOBS_SUPPORT_ANY ?? process.env.JOBS_SUPPORT_ANY
  );
  if (typeof envVal === 'boolean') return envVal;

  const worker: boolean | undefined = opts.jobs?.worker?.supportAny;
  const scheduler: boolean | undefined = opts.jobs?.scheduler?.supportAny;

  return (
    worker ??
    scheduler ??
    jobsDefaults.worker?.supportAny ??
    true
  );
};

export const getJobSupported = (
  options: JobsRuntimeConfigOptions = {}
): string[] => {
  const opts = getEnvOptionsForJobs(options);
  const worker: string[] | undefined =
    options.jobsConfig?.worker?.supported ?? opts.jobs?.worker?.supported;
  const scheduler: string[] | undefined =
    options.jobsConfig?.scheduler?.supported ?? opts.jobs?.scheduler?.supported;

  return (
    worker ??
    scheduler ??
    jobsDefaults.worker?.supported ??
    []
  );
};

// ---- Hostnames ----
export const getWorkerHostname = (
  options: JobsRuntimeConfigOptions = {}
): string => {
  const opts = getEnvOptionsForJobs(options);
  const override = options.jobsConfig?.worker?.hostname;
  if (override) return override;

  return (
    options.envConfig?.HOSTNAME ||
    process.env.HOSTNAME ||
    opts.jobs?.worker?.hostname ||
    jobsDefaults.worker?.hostname ||
    'worker-0'
  );
};

export const getSchedulerHostname = (
  options: JobsRuntimeConfigOptions = {}
): string => {
  const opts = getEnvOptionsForJobs(options);
  const override = options.jobsConfig?.scheduler?.hostname;
  if (override) return override;

  return (
    options.envConfig?.HOSTNAME ||
    process.env.HOSTNAME ||
    opts.jobs?.scheduler?.hostname ||
    jobsDefaults.scheduler?.hostname ||
    'scheduler-0'
  );
};

// ---- Job gateway config (generic HTTP gateway) ----
export const getJobGatewayConfig = (
  options: JobsRuntimeConfigOptions = {}
) => {
  const opts = getEnvOptionsForJobs(options);
  const gateway = options.jobsConfig?.gateway ?? opts.jobs?.gateway ?? {};
  const envGatewayUrl =
    options.envConfig?.KNATIVE_SERVICE_URL ||
    process.env.KNATIVE_SERVICE_URL;
  const defaults = jobsDefaults.gateway ?? {
    gatewayUrl: 'http://gateway:8080',
    callbackUrl: 'http://callback:12345',
    callbackPort: 12345
  };

  return {
    gatewayUrl:
      gateway.gatewayUrl ||
      envGatewayUrl ||
      defaults.gatewayUrl,
    callbackUrl:
      gateway.callbackUrl ||
      defaults.callbackUrl,
    callbackPort:
      gateway.callbackPort ??
      defaults.callbackPort
  };
};

export const getJobGatewayDevMap = (
  options: JobsRuntimeConfigOptions = {}
): Record<string, string> | null => {
  if (typeof options.devMapConfig !== 'undefined') {
    return options.devMapConfig;
  }
  const map =
    options.envConfig?.INTERNAL_GATEWAY_DEVELOPMENT_MAP ||
    process.env.INTERNAL_GATEWAY_DEVELOPMENT_MAP;
  if (!map) return null;
  try {
    return JSON.parse(map);
  } catch (err) {
    console.warn(
      '[getJobGatewayDevMap] Failed to parse INTERNAL_GATEWAY_DEVELOPMENT_MAP as JSON:',
      err,
      'Value:',
      map
    );
    return null;
  }
};

export const getNodeEnvironment = (
  options: JobsRuntimeConfigOptions = {}
): NodeEnv => resolveNodeEnv(options.envConfig);

// Neutral callback helpers (generic HTTP callback)
export const getJobsCallbackPort = (
  options: JobsRuntimeConfigOptions = {}
): number => {
  const { callbackPort } = getJobGatewayConfig(options);
  return callbackPort;
};

export const getCallbackBaseUrl = (
  options: JobsRuntimeConfigOptions = {}
): string => {
  if (options.jobsConfig?.gateway?.callbackUrl) {
    return options.jobsConfig.gateway.callbackUrl;
  }
  const opts = getEnvOptionsForJobs(options);
  const envBase =
    options.envConfig?.JOBS_CALLBACK_BASE_URL ??
    process.env.JOBS_CALLBACK_BASE_URL;
  if (envBase) {
    return envBase;
  }
  const gatewayBase = opts.jobs?.gateway?.callbackUrl;
  if (gatewayBase) {
    return gatewayBase;
  }
  const host =
    options.envConfig?.JOBS_CALLBACK_HOST ||
    process.env.JOBS_CALLBACK_HOST ||
    'jobs-callback';
  const port = getJobsCallbackPort(options);
  return `http://${host}:${port}/callback`;
};

export const resolveJobsConfig = (
  options: JobsRuntimeConfigOptions = {}
): JobsRuntimeConfig => {
  const pgConfig = getJobPgConfig(options);
  const schema = getJobSchema(options);
  const supportAny = getJobSupportAny(options);
  const supported = getJobSupported(options);
  const workerHostname = getWorkerHostname(options);
  const schedulerHostname = getSchedulerHostname(options);
  const gatewayConfig = getJobGatewayConfig(options);
  const devMap = getJobGatewayDevMap(options);
  const callbackBaseUrl = getCallbackBaseUrl(options);
  const nodeEnv = getNodeEnvironment(options);

  return {
    pgConfig,
    schemaConfig: { schema },
    supportConfig: { supportAny, supported },
    workerConfig: { hostname: workerHostname },
    schedulerConfig: { hostname: schedulerHostname },
    gatewayConfig,
    devMapConfig: { devMap },
    callbackConfig: { callbackBaseUrl },
    nodeEnvConfig: { nodeEnv }
  };
};
