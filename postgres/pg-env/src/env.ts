import { parseEnvNumber } from '12factor-env';

import { defaultPgConfig, PgConfig } from './pg-config';

export const getPgEnvVars = (
  env: NodeJS.ProcessEnv = process.env
): Partial<PgConfig> => {
  const { PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE } = env;

  return {
    ...(PGHOST && { host: PGHOST }),
    ...(PGPORT && { port: parseEnvNumber(PGPORT) }),
    ...(PGUSER && { user: PGUSER }),
    ...(PGPASSWORD && { password: PGPASSWORD }),
    ...(PGDATABASE && { database: PGDATABASE }),
  };
};

export const getPgEnvOptions = (
  overrides: Partial<PgConfig> = {},
  env: NodeJS.ProcessEnv = process.env
): PgConfig => {
  const envOpts = getPgEnvVars(env);
  const merged = { ...defaultPgConfig, ...envOpts, ...overrides };
  return merged;
};

export function toPgEnvVars(config: Partial<PgConfig>): Record<string, string> {
  const opts = { ...defaultPgConfig, ...config };
  return {
    ...(opts.host && { PGHOST: opts.host }),
    ...(opts.port && { PGPORT: String(opts.port) }),
    ...(opts.user && { PGUSER: opts.user }),
    ...(opts.password && { PGPASSWORD: opts.password }),
    ...(opts.database && { PGDATABASE: opts.database }),
  };
}

export function getSpawnEnvWithPg(
  config: Partial<PgConfig>,
  baseEnv: NodeJS.ProcessEnv = process.env
): NodeJS.ProcessEnv {
  return {
    ...baseEnv,
    ...toPgEnvVars(config),
  };
}
