import { getEnvOptions, getNodeEnv } from '@pgpmjs/env';
import { defaultPgConfig, getPgEnvVars, type PgConfig } from 'pg-env';
import { getPgPool } from 'pg-cache';
import type { Pool } from 'pg';
import type { PgpmOptions } from '@pgpmjs/types';

type Maybe<T> = T | null | undefined;

const toBool = (v: Maybe<unknown>): boolean | undefined => {
  if (v == null) return undefined;
  const s = String(v).toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(s)) return true;
  if (['false', '0', 'no', 'n'].includes(s)) return false;
  return undefined;
};

const toStrArray = (v: Maybe<string>): string[] | undefined =>
  v ? v.split(',').map(s => s.trim()).filter(Boolean) : undefined;

// ---- PG config ----
export const getJobPgConfig = (): PgConfig => {
  const opts: PgpmOptions = getEnvOptions();
  const envOnly = getPgEnvVars();

  return {
    ...defaultPgConfig,
    ...(opts.pg ?? {}),
    ...(opts.jobs?.pg ?? {}),
    ...envOnly
  };
};

export const getJobPool = (): Pool =>
  getPgPool(getJobPgConfig());

// ---- Schema ----
export const getJobSchema = (): string => {
  const opts: PgpmOptions = getEnvOptions();
  const fromOpts: string | undefined = opts.jobs?.schema?.schema;
  const fromEnv = process.env.JOBS_SCHEMA;
  return fromEnv || fromOpts || 'app_jobs';
};

// ---- SupportAny / Supported ----
export const getJobSupportAny = (): boolean => {
  const opts: PgpmOptions = getEnvOptions();
  const envVal = toBool(process.env.JOBS_SUPPORT_ANY);
  if (typeof envVal === 'boolean') return envVal;

  const worker: boolean | undefined = opts.jobs?.worker?.supportAny;
  const scheduler: boolean | undefined = opts.jobs?.scheduler?.supportAny;

  return worker ?? scheduler ?? true;
};

export const getJobSupported = (): string[] => {
  const opts: PgpmOptions = getEnvOptions();
  const envVal = toStrArray(process.env.JOBS_SUPPORTED);
  if (envVal) return envVal;

  const worker: string[] | undefined = opts.jobs?.worker?.supported;
  const scheduler: string[] | undefined = opts.jobs?.scheduler?.supported;

  return worker ?? scheduler ?? [];
};

// ---- Hostnames ----
export const getWorkerHostname = (): string => {
  const opts: PgpmOptions = getEnvOptions();
  return (
    process.env.HOSTNAME ||
    opts.jobs?.worker?.hostname ||
    'worker-0'
  );
};

export const getSchedulerHostname = (): string => {
  const opts: PgpmOptions = getEnvOptions();
  return (
    process.env.HOSTNAME ||
    opts.jobs?.scheduler?.hostname ||
    'scheduler-0'
  );
};

// ---- Job gateway config (generic HTTP gateway) ----
export const getJobGatewayConfig = () => {
  const opts: PgpmOptions = getEnvOptions();
  const gateway = opts.jobs?.gateway ?? {};
  const envCbPort = Number(process.env.INTERNAL_JOBS_CALLBACK_PORT);

  return {
    gatewayUrl:
      process.env.INTERNAL_GATEWAY_URL ||
      gateway.gatewayUrl ||
      'http://gateway:8080',
    callbackUrl:
      process.env.INTERNAL_JOBS_CALLBACK_URL ||
      gateway.callbackUrl ||
      'http://callback:12345',
    callbackPort:
      Number.isFinite(envCbPort) && envCbPort > 0
        ? envCbPort
        : gateway.callbackPort ?? 12345
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
  const envCbPort = Number(process.env.INTERNAL_JOBS_CALLBACK_PORT);
  return Number.isFinite(envCbPort) && envCbPort > 0 ? envCbPort : 12345;
};

export const getCallbackBaseUrl = (): string => {
  if (process.env.JOBS_CALLBACK_BASE_URL) {
    return process.env.JOBS_CALLBACK_BASE_URL;
  }
  const host = process.env.JOBS_CALLBACK_HOST || 'jobs-callback';
  const port = getJobsCallbackPort();
  return `http://${host}:${port}/callback`;
};

// ---- Generic env helpers ----
export const parseEnvBoolean = (
  name: string,
  defaultValue = false
): boolean => {
  const parsed = toBool(process.env[name]);
  if (typeof parsed === 'boolean') return parsed;
  return defaultValue;
};
