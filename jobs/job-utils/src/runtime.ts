import { getEnvOptions, getNodeEnv } from '@constructive-io/graphql-env';
import { jobsDefaults, type ConstructiveOptions } from '@constructive-io/graphql-types';
import { parseEnvBoolean } from '@pgpmjs/env';
import { defaultPgConfig, getPgEnvVars, type PgConfig } from 'pg-env';
import { buildConnectionString, getPgPool } from 'pg-cache';
import type { Pool } from 'pg';

type Maybe<T> = T | null | undefined;

const toStrArray = (v: Maybe<string>): string[] | undefined =>
  v ? v.split(',').map(s => s.trim()).filter(Boolean) : undefined;

// ---- PG config ----
export const getJobPgConfig = (): PgConfig => {
  const opts: ConstructiveOptions = getEnvOptions();
  const envOnly = getPgEnvVars();

  return {
    ...defaultPgConfig,
    ...(opts.pg ?? {}),
    ...envOnly
  };
};

export const getJobPool = (): Pool =>
  getPgPool(getJobPgConfig());

export const getJobConnectionString = (): string => {
  const cfg = getJobPgConfig();
  return buildConnectionString(cfg.user, cfg.password, cfg.host, cfg.port, cfg.database);
};

// ---- Schema ----
export const getJobSchema = (): string => {
  const opts: ConstructiveOptions = getEnvOptions();
  const fromOpts: string | undefined = opts.jobs?.schema?.schema;
  return (
    fromOpts ||
    jobsDefaults.schema?.schema ||
    'app_jobs'
  );
};

// ---- SupportAny / Supported ----
export const getJobSupportAny = (): boolean => {
  const opts: ConstructiveOptions = getEnvOptions();
  const envVal = parseEnvBoolean(process.env.JOBS_SUPPORT_ANY);
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

export const getJobSupported = (): string[] => {
  const opts: ConstructiveOptions = getEnvOptions();
  const worker: string[] | undefined = opts.jobs?.worker?.supported;
  const scheduler: string[] | undefined = opts.jobs?.scheduler?.supported;

  return (
    worker ??
    scheduler ??
    jobsDefaults.worker?.supported ??
    []
  );
};

// ---- Hostnames ----
export const getWorkerHostname = (): string => {
  const opts: ConstructiveOptions = getEnvOptions();
  return (
    process.env.HOSTNAME ||
    opts.jobs?.worker?.hostname ||
    jobsDefaults.worker?.hostname ||
    'worker-0'
  );
};

export const getSchedulerHostname = (): string => {
  const opts: ConstructiveOptions = getEnvOptions();
  return (
    process.env.HOSTNAME ||
    opts.jobs?.scheduler?.hostname ||
    jobsDefaults.scheduler?.hostname ||
    'scheduler-0'
  );
};

// ---- Job gateway config (generic HTTP gateway) ----
export const getJobGatewayConfig = () => {
  const opts: ConstructiveOptions = getEnvOptions();
  const gateway = opts.jobs?.gateway ?? {};
  const defaults = jobsDefaults.gateway ?? {
    gatewayUrl: 'http://gateway:8080',
    callbackUrl: 'http://callback:12345',
    callbackPort: 12345
  };

  return {
    gatewayUrl:
      gateway.gatewayUrl ||
      defaults.gatewayUrl,
    callbackUrl:
      gateway.callbackUrl ||
      defaults.callbackUrl,
    callbackPort:
      gateway.callbackPort ??
      defaults.callbackPort
  };
};

export const getJobGatewayDevMap = ():
  | Record<string, string>
  | null => {
  const map = process.env.INTERNAL_GATEWAY_DEVELOPMENT_MAP;
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

export const getNodeEnvironment = getNodeEnv;

// Neutral callback helpers (generic HTTP callback)
export const getJobsCallbackPort = (): number => {
  const { callbackPort } = getJobGatewayConfig();
  return callbackPort;
};

export const getCallbackBaseUrl = (): string => {
  if (process.env.INTERNAL_JOBS_CALLBACK_URL) {
    return process.env.INTERNAL_JOBS_CALLBACK_URL;
  }
  const host = process.env.JOBS_CALLBACK_HOST || 'jobs-callback';
  const port = getJobsCallbackPort();
  return `http://${host}:${port}/callback`;
};
