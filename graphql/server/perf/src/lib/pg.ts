export interface PgConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export function pgConfigFromEnv(env: NodeJS.ProcessEnv = process.env): PgConfig {
  return {
    host: env.PGHOST || 'localhost',
    port: Number.parseInt(env.PGPORT || '5432', 10),
    database: env.PGDATABASE || 'constructive',
    user: env.PGUSER || 'postgres',
    password: env.PGPASSWORD || 'password',
  };
}
