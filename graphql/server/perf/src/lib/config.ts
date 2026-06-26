import type { CacheMode, RoutingMode } from '../types';

export const DEFAULT_BASE_URL = 'http://localhost:3000';
export const DEFAULT_PORT = 3000;

export function oldCacheMax(k: number): number {
  return Math.max(100, k * 6);
}

export function withLocalhostNoProxy(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const noProxy = env.NO_PROXY || 'localhost,127.0.0.1,::1';
  return {
    ...env,
    NO_PROXY: noProxy,
    no_proxy: env.no_proxy || noProxy,
  };
}

export function serverEnv({
  routingMode,
  cacheMode,
  port,
  k,
}: {
  routingMode: RoutingMode;
  cacheMode: CacheMode;
  port: number;
  k: number;
}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = withLocalhostNoProxy({
    ...process.env,
    PGHOST: process.env.PGHOST || 'localhost',
    PGPORT: process.env.PGPORT || '5432',
    PGUSER: process.env.PGUSER || 'postgres',
    PGPASSWORD: process.env.PGPASSWORD || 'password',
    PGDATABASE: process.env.PGDATABASE || 'constructive',
    NODE_ENV: 'development',
    GRAPHILE_ENV: 'development',
    GRAPHQL_OBSERVABILITY_ENABLED: 'true',
    API_IS_PUBLIC: routingMode === 'public' ? 'true' : 'false',
    PORT: String(port),
  });

  if (cacheMode === 'new') {
    env.USE_MULTI_TENANCY_CACHE = 'true';
    delete env.GRAPHILE_CACHE_MAX;
  } else {
    delete env.USE_MULTI_TENANCY_CACHE;
    env.GRAPHILE_CACHE_MAX = String(oldCacheMax(k));
  }

  return env;
}

export function redactEnv(env: NodeJS.ProcessEnv): Record<string, string | undefined> {
  const keys = [
    'PGHOST',
    'PGPORT',
    'PGUSER',
    'PGPASSWORD',
    'PGDATABASE',
    'NODE_ENV',
    'GRAPHILE_ENV',
    'GRAPHQL_OBSERVABILITY_ENABLED',
    'API_IS_PUBLIC',
    'USE_MULTI_TENANCY_CACHE',
    'GRAPHILE_CACHE_MAX',
    'PORT',
    'NO_PROXY',
    'no_proxy',
  ];
  return Object.fromEntries(
    keys.map((key) => [key, key.toLowerCase().includes('password') ? (env[key] ? '***' : undefined) : env[key]]),
  );
}
