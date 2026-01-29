export const defaultPgConfig = {
  user: 'postgres',
  password: 'password',
  host: 'localhost',
  port: 5432,
  database: 'postgres',
};

export const getPgEnvOptions = jest.fn((overrides = {}) => ({
  ...defaultPgConfig,
  ...overrides,
}));

export const getPgEnvVars = jest.fn(() => ({}));

export const toPgEnvVars = jest.fn((config) => {
  const opts = { ...defaultPgConfig, ...config };
  return {
    ...(opts.host && { PGHOST: opts.host }),
    ...(opts.port && { PGPORT: String(opts.port) }),
    ...(opts.user && { PGUSER: opts.user }),
    ...(opts.password && { PGPASSWORD: opts.password }),
    ...(opts.database && { PGDATABASE: opts.database }),
  };
});

export const getSpawnEnvWithPg = jest.fn((config, baseEnv = process.env) => ({
  ...baseEnv,
  ...toPgEnvVars(config),
}));
