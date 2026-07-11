import fs from 'fs';
import path from 'path';

import {
  PERF_SCHEMA_VERSION,
  type CacheSizeConfig,
  type CacheMode,
  type ConnectionPolicy,
  type PerfRunConfig,
  type PerfRunConfigOverlay,
  type RoutingMode,
  type ScaleProfile,
} from './types';

const DEFAULT_CONFIG_GROUP = 'smoke';
const DEFAULT_RUN_ROOT = '/tmp/constructive-perf';
const VALID_ROUTING_MODES: RoutingMode[] = ['private', 'public'];
const VALID_CACHE_MODES: CacheMode[] = ['old', 'new'];
const VALID_CONNECTION_POLICIES: ConnectionPolicy[] = ['reuse', 'per-case'];

const nowRunId = (): string => new Date().toISOString().replace(/[:.]/g, '-');

const positiveInt = (value: string | undefined, label: string): number | undefined => {
  if (value == null || value === '') return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative integer, got ${value}`);
  }
  return parsed;
};

const positiveNonZeroInt = (value: string | undefined, label: string): number | undefined => {
  const parsed = positiveInt(value, label);
  if (parsed !== undefined && parsed <= 0) {
    throw new Error(`${label} must be a positive integer, got ${value}`);
  }
  return parsed;
};

const boolEnv = (value: string | undefined): boolean | undefined => {
  if (value == null || value === '') return undefined;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  throw new Error(`Expected boolean env value (1/0/true/false), got ${value}`);
};

const parseEnumList = <T extends string>(
  value: string | undefined,
  valid: readonly T[],
  label: string
): T[] | undefined => {
  if (!value) return undefined;
  const items = value.split(',').map((part) => part.trim()).filter(Boolean) as T[];
  if (items.length === 0) return undefined;
  for (const item of items) {
    if (!valid.includes(item)) {
      throw new Error(`${label} includes invalid value ${item}; expected one of ${valid.join(', ')}`);
    }
  }
  return items;
};

const deepMerge = <T extends Record<string, any>>(base: T, overlay?: Record<string, any>): T => {
  if (!overlay) return { ...base };
  const result: Record<string, any> = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      result[key] &&
      typeof result[key] === 'object' &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key], value);
    } else if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
};

const defaults: PerfRunConfigOverlay = {
  name: DEFAULT_CONFIG_GROUP,
  configGroup: DEFAULT_CONFIG_GROUP,
  runDir: '',
  connectionPolicy: 'reuse',
  routingModes: ['private'],
  cacheModes: ['new'],
  scaleProfile: {
    name: 'smoke',
    k: 1,
    durationSeconds: 5,
    workers: 1,
  },
  workloadProfiles: {
    private: 'metadata-read',
    public: 'business-crud',
  },
  publicPreflight: {
    allowUnderProvisioned: false,
  },
  cacheSizes: {},
  failFast: true,
  captureMemory: true,
  routeProbeSampleSize: 1,
  errorSampleLimit: 20,
  testTimeoutMs: 120_000,
};

export const BUILT_IN_CONFIG_GROUPS: Record<string, PerfRunConfigOverlay> = {
  smoke: {
    name: 'smoke',
    routingModes: ['private'],
    cacheModes: ['new'],
    scaleProfile: { name: 'smoke', k: 1, durationSeconds: 5, workers: 1 },
    routeProbeSampleSize: 1,
    testTimeoutMs: 120_000,
  },
  'public-smoke': {
    name: 'public-smoke',
    routingModes: ['public'],
    cacheModes: ['new'],
    scaleProfile: { name: 'public-smoke', k: 1, durationSeconds: 5, workers: 1 },
    routeProbeSampleSize: 1,
    testTimeoutMs: 180_000,
    publicPreflight: { allowUnderProvisioned: false },
  },
  'private-cache-compare': {
    name: 'private-cache-compare',
    routingModes: ['private'],
    cacheModes: ['old', 'new'],
    scaleProfile: { name: 'private-cache-compare', k: 10, durationSeconds: 60, workers: 2 },
    workloadProfiles: { private: 'cache-key-shared' },
    routeProbeSampleSize: 0,
    testTimeoutMs: 300_000,
  },
  'private-cache-distinct': {
    name: 'private-cache-distinct',
    routingModes: ['private'],
    cacheModes: ['old', 'new'],
    scaleProfile: { name: 'private-cache-distinct', k: 10, durationSeconds: 60, workers: 2 },
    workloadProfiles: { private: 'cache-key-distinct' },
    routeProbeSampleSize: 0,
    testTimeoutMs: 300_000,
  },
  'k10-5min': {
    name: 'k10-5min',
    routingModes: ['private', 'public'],
    cacheModes: ['old', 'new'],
    scaleProfile: { name: 'k10-5min', k: 10, durationSeconds: 300, workers: 4 },
    workloadProfiles: { private: 'cache-key-shared', public: 'business-crud' },
    routeProbeSampleSize: 0,
    testTimeoutMs: 900_000,
    publicPreflight: { allowUnderProvisioned: false },
  },
};

const resolveConfigPath = (configPath: string): string =>
  path.isAbsolute(configPath) ? configPath : path.resolve(process.cwd(), configPath);

const readConfigOverlay = (configPath?: string): PerfRunConfigOverlay | undefined => {
  if (!configPath) return undefined;
  const resolved = resolveConfigPath(configPath);
  const parsed = JSON.parse(fs.readFileSync(resolved, 'utf8')) as PerfRunConfigOverlay;
  return { ...parsed, configPath: resolved };
};

const resolveEnvConfigPath = (env: NodeJS.ProcessEnv): string | undefined => {
  if (env.PERF_CONFIG_PATH && env.PERF_SPEC && env.PERF_CONFIG_PATH !== env.PERF_SPEC) {
    throw new Error('PERF_CONFIG_PATH and legacy PERF_SPEC both set different paths; use PERF_CONFIG_PATH only.');
  }
  const configPath = env.PERF_CONFIG_PATH || env.PERF_SPEC;
  return configPath ? resolveConfigPath(configPath) : undefined;
};

const envOverrides = (env: NodeJS.ProcessEnv): PerfRunConfigOverlay => {
  const overlay: PerfRunConfigOverlay = {};

  if (env.PERF_RUN_DIR) overlay.runDir = env.PERF_RUN_DIR;
  if (env.PERF_CONNECTION_POLICY) {
    if (!VALID_CONNECTION_POLICIES.includes(env.PERF_CONNECTION_POLICY as ConnectionPolicy)) {
      throw new Error(`PERF_CONNECTION_POLICY must be reuse or per-case, got ${env.PERF_CONNECTION_POLICY}`);
    }
    overlay.connectionPolicy = env.PERF_CONNECTION_POLICY as ConnectionPolicy;
  }

  const routingModes = parseEnumList(env.PERF_ROUTING_MODES, VALID_ROUTING_MODES, 'PERF_ROUTING_MODES');
  if (routingModes) overlay.routingModes = routingModes;

  const cacheModes = parseEnumList(env.PERF_CACHE_MODES, VALID_CACHE_MODES, 'PERF_CACHE_MODES');
  if (cacheModes) overlay.cacheModes = cacheModes;

  const scaleProfile: Partial<ScaleProfile> = {};
  const k = positiveInt(env.PERF_K, 'PERF_K');
  if (k !== undefined) scaleProfile.k = k;
  const durationSeconds = positiveInt(env.PERF_DURATION_SECONDS, 'PERF_DURATION_SECONDS');
  if (durationSeconds !== undefined) scaleProfile.durationSeconds = durationSeconds;
  const workers = positiveInt(env.PERF_WORKERS, 'PERF_WORKERS');
  if (workers !== undefined) scaleProfile.workers = workers;
  if (Object.keys(scaleProfile).length > 0) overlay.scaleProfile = scaleProfile;

  if (env.PERF_PRIVATE_WORKLOAD || env.PERF_PUBLIC_WORKLOAD) {
    overlay.workloadProfiles = {
      ...(env.PERF_PRIVATE_WORKLOAD && { private: env.PERF_PRIVATE_WORKLOAD }),
      ...(env.PERF_PUBLIC_WORKLOAD && { public: env.PERF_PUBLIC_WORKLOAD }),
    };
  }

  const allowUnderProvisioned = boolEnv(env.PERF_ALLOW_UNDERPROVISIONED);
  if (allowUnderProvisioned !== undefined) {
    overlay.publicPreflight = { allowUnderProvisioned };
  }

  const cacheSizes: CacheSizeConfig = {};
  const graphileCacheMax = positiveNonZeroInt(env.PERF_GRAPHILE_CACHE_MAX, 'PERF_GRAPHILE_CACHE_MAX');
  if (graphileCacheMax !== undefined) cacheSizes.graphileCacheMax = graphileCacheMax;
  const multiTenancyCacheMax =
    positiveNonZeroInt(env.PERF_MULTI_TENANCY_CACHE_MAX, 'PERF_MULTI_TENANCY_CACHE_MAX') ??
    positiveNonZeroInt(env.PERF_GRAPHILE_MULTI_TENANCY_CACHE_MAX, 'PERF_GRAPHILE_MULTI_TENANCY_CACHE_MAX');
  if (multiTenancyCacheMax !== undefined) cacheSizes.multiTenancyCacheMax = multiTenancyCacheMax;
  const pgCacheMax = positiveNonZeroInt(env.PERF_PG_CACHE_MAX, 'PERF_PG_CACHE_MAX');
  if (pgCacheMax !== undefined) cacheSizes.pgCacheMax = pgCacheMax;
  if (Object.keys(cacheSizes).length > 0) overlay.cacheSizes = cacheSizes;

  const failFast = boolEnv(env.PERF_FAIL_FAST);
  if (failFast !== undefined) overlay.failFast = failFast;
  const captureMemory = boolEnv(env.PERF_CAPTURE_MEMORY);
  if (captureMemory !== undefined) overlay.captureMemory = captureMemory;

  const routeProbeSampleSize = positiveInt(env.PERF_ROUTE_PROBE_SAMPLE_SIZE, 'PERF_ROUTE_PROBE_SAMPLE_SIZE');
  if (routeProbeSampleSize !== undefined) overlay.routeProbeSampleSize = routeProbeSampleSize;
  const errorSampleLimit = positiveInt(env.PERF_ERROR_SAMPLE_LIMIT, 'PERF_ERROR_SAMPLE_LIMIT');
  if (errorSampleLimit !== undefined) overlay.errorSampleLimit = errorSampleLimit;
  const testTimeoutMs = positiveInt(env.PERF_TEST_TIMEOUT_MS, 'PERF_TEST_TIMEOUT_MS');
  if (testTimeoutMs !== undefined) overlay.testTimeoutMs = testTimeoutMs;

  if (env.PERF_CONSTRUCTIVE_LOCAL_PATH) {
    overlay.constructiveLocalPath = env.PERF_CONSTRUCTIVE_LOCAL_PATH;
  }

  return overlay;
};

const collectEnvOverrideStrings = (env: NodeJS.ProcessEnv): Record<string, string> => {
  const result: Record<string, string> = {};
  const cacheEnvKeys = new Set([
    'GRAPHILE_CACHE_MAX',
    'GRAPHILE_MULTI_TENANCY_CACHE_MAX',
    'PG_CACHE_MAX',
  ]);
  for (const [key, value] of Object.entries(env)) {
    if ((key.startsWith('PERF_') || cacheEnvKeys.has(key)) && value != null) result[key] = value;
  }
  return result;
};

const cacheSizeFromDirectEnv = (env: NodeJS.ProcessEnv): CacheSizeConfig => {
  const cacheSizes: CacheSizeConfig = {};
  const graphileCacheMax = positiveNonZeroInt(env.GRAPHILE_CACHE_MAX, 'GRAPHILE_CACHE_MAX');
  if (graphileCacheMax !== undefined) cacheSizes.graphileCacheMax = graphileCacheMax;
  const multiTenancyCacheMax = positiveNonZeroInt(
    env.GRAPHILE_MULTI_TENANCY_CACHE_MAX,
    'GRAPHILE_MULTI_TENANCY_CACHE_MAX'
  );
  if (multiTenancyCacheMax !== undefined) cacheSizes.multiTenancyCacheMax = multiTenancyCacheMax;
  const pgCacheMax = positiveNonZeroInt(env.PG_CACHE_MAX, 'PG_CACHE_MAX');
  if (pgCacheMax !== undefined) cacheSizes.pgCacheMax = pgCacheMax;
  return cacheSizes;
};

const resolveCacheSizes = (
  merged: PerfRunConfigOverlay,
  env: NodeJS.ProcessEnv
): { cacheSizes: CacheSizeConfig; effectiveCacheEnv: Record<string, string> } => {
  const directEnv = cacheSizeFromDirectEnv(env);
  const cacheSizes: CacheSizeConfig = {
    ...directEnv,
    ...merged.cacheSizes,
  };
  const effectiveCacheEnv: Record<string, string> = {};
  if (cacheSizes.graphileCacheMax !== undefined) {
    effectiveCacheEnv.GRAPHILE_CACHE_MAX = String(cacheSizes.graphileCacheMax);
  }
  if (cacheSizes.multiTenancyCacheMax !== undefined) {
    effectiveCacheEnv.GRAPHILE_MULTI_TENANCY_CACHE_MAX = String(cacheSizes.multiTenancyCacheMax);
  }
  if (cacheSizes.pgCacheMax !== undefined) {
    effectiveCacheEnv.PG_CACHE_MAX = String(cacheSizes.pgCacheMax);
  }
  return { cacheSizes, effectiveCacheEnv };
};

const sanitizePrefix = (value: string): string => value.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 48);

const isConstructiveLocalPath = (candidate: string): boolean =>
  fs.existsSync(path.join(candidate, 'pgpm.plan')) &&
  fs.existsSync(path.join(candidate, 'constructive-local.control'));

const ancestorDirs = (startDir: string): string[] => {
  const dirs: string[] = [];
  let current = path.resolve(startDir);
  for (;;) {
    dirs.push(current);
    const parent = path.dirname(current);
    if (parent === current) return dirs;
    current = parent;
  }
};

export const discoverConstructiveLocalPath = (input: {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
} = {}): string => {
  const env = input.env || process.env;
  const override = env.PERF_CONSTRUCTIVE_LOCAL_PATH;
  if (override) {
    const resolved = path.resolve(override);
    if (!isConstructiveLocalPath(resolved)) {
      throw new Error(
        `PERF_CONSTRUCTIVE_LOCAL_PATH does not look like constructive-local: ${resolved}. ` +
        'Expected pgpm.plan and constructive-local.control.'
      );
    }
    return resolved;
  }

  const cwd = path.resolve(input.cwd || process.cwd());
  const candidates: string[] = [];
  for (const dir of ancestorDirs(cwd)) {
    candidates.push(path.join(dir, 'constructive-db', 'services', 'constructive-local'));
    candidates.push(path.join(path.dirname(dir), 'constructive-db', 'services', 'constructive-local'));
    if (path.basename(dir) === 'constructive') {
      candidates.push(path.join(path.dirname(dir), 'constructive-db', 'services', 'constructive-local'));
    }
  }

  const seen = new Set<string>();
  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    if (isConstructiveLocalPath(resolved)) return resolved;
  }

  throw new Error(
    'Could not find constructive-db/services/constructive-local. ' +
    'Set PERF_CONSTRUCTIVE_LOCAL_PATH to the local constructive-local service path.'
  );
};

export const loadPerfConfig = (
  env: NodeJS.ProcessEnv = process.env,
  options: { cwd?: string } = {}
): PerfRunConfig => {
  const runId = nowRunId();
  const configGroup = env.PERF_CONFIG_GROUP || DEFAULT_CONFIG_GROUP;
  const groupOverlay = BUILT_IN_CONFIG_GROUPS[configGroup];
  if (!groupOverlay) {
    throw new Error(
      `Unknown PERF_CONFIG_GROUP ${configGroup}; expected one of ${Object.keys(BUILT_IN_CONFIG_GROUPS).join(', ')}`
    );
  }

  const configPath = resolveEnvConfigPath(env);
  const configOverlay = readConfigOverlay(configPath);
  const envOverlay = envOverrides(env);

  const merged = deepMerge(
    deepMerge(
      deepMerge(defaults as Record<string, any>, { ...groupOverlay, configGroup }),
      configOverlay as Record<string, any> | undefined
    ),
    envOverlay as Record<string, any>
  ) as PerfRunConfigOverlay;

  const scaleProfile = {
    ...defaults.scaleProfile,
    ...groupOverlay.scaleProfile,
    ...configOverlay?.scaleProfile,
    ...envOverlay.scaleProfile,
  } as ScaleProfile;
  const runDir = merged.runDir || path.join(DEFAULT_RUN_ROOT, `${configGroup}-${runId}`);
  const constructiveLocalPath = merged.constructiveLocalPath
    ? discoverConstructiveLocalPath({
        cwd: options.cwd,
        env: { ...env, PERF_CONSTRUCTIVE_LOCAL_PATH: merged.constructiveLocalPath },
      })
    : discoverConstructiveLocalPath({ cwd: options.cwd, env });
  const { cacheSizes, effectiveCacheEnv } = resolveCacheSizes(merged, env);

  return {
    schemaVersion: PERF_SCHEMA_VERSION,
    runId,
    name: merged.name || configGroup,
    configGroup,
    configPath,
    runDir,
    connectionPolicy: merged.connectionPolicy || 'reuse',
    routingModes: (merged.routingModes || ['private']) as RoutingMode[],
    cacheModes: (merged.cacheModes || ['new']) as CacheMode[],
    scaleProfile,
    workloadProfiles: {
      private: merged.workloadProfiles?.private || 'metadata-read',
      public: merged.workloadProfiles?.public || 'business-crud',
    },
    publicPreflight: {
      allowUnderProvisioned: merged.publicPreflight?.allowUnderProvisioned ?? false,
    },
    cacheSizes,
    effectiveCacheEnv,
    failFast: merged.failFast ?? true,
    captureMemory: merged.captureMemory ?? true,
    routeProbeSampleSize: merged.routeProbeSampleSize ?? 1,
    errorSampleLimit: merged.errorSampleLimit ?? 20,
    testTimeoutMs: merged.testTimeoutMs ?? 120_000,
    constructiveLocalPath,
    benchmarkOwnedPrefix: sanitizePrefix(`perf_${runId}`),
    source: {
      defaults: 'built-in defaults',
      group: configGroup,
      configPath,
      envOverrides: collectEnvOverrideStrings(env),
    },
  };
};
