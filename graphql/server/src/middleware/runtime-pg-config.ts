import type {
  RuntimePgPoolResolution
} from '@constructive-io/express-context';
import type {
  ConstructiveOptions,
  RuntimePgConfig,
  RuntimePgResolverInput
} from '@constructive-io/graphql-types';
import { getNodeEnv } from '@pgpmjs/env';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { getPgPoolIdentity } from 'pg-cache';
import { getPgEnvOptions } from 'pg-env';

import type { ApiStructure } from '../types';
import {
  assertRuntimePgCredentials,
  InvalidRuntimePgConfigurationError,
  requiresExactRuntimePgResolution
} from './runtime-pg-requirements';

const RUNTIME_POOL_OPTIONS = {
  purpose: 'runtime',
  sanitizeOnCheckout: true
} as const;

const TARGET_ATTESTATION_POOL = Object.freeze({
  max: 1,
  maxUses: 1,
  idleTimeoutMillis: 0,
  connectionTimeoutMillis: 0,
  allowExitOnIdle: true
});

const TARGET_ATTESTATION_OPTIONS = {
  purpose: 'runtime-target-attestation',
  sanitizeOnCheckout: true
} as const;

const CONFIG_KEYS = new Set([
  'host',
  'port',
  'user',
  'password',
  'database',
  'ssl',
  'pool'
]);

const POOL_KEYS = new Set([
  'max',
  'maxUses',
  'idleTimeoutMillis',
  'connectionTimeoutMillis',
  'allowExitOnIdle'
]);

const STATIC_IDENTITY_KEYS = new Set([
  'databaseId',
  'databaseName',
  'apiId',
  'schemas',
  'roles'
]);

const ownDataRecord = (
  value: unknown,
  label: string,
  allowedKeys: ReadonlySet<string>
): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new InvalidRuntimePgConfigurationError(
      `${label} must be a PostgreSQL configuration object`
    );
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new InvalidRuntimePgConfigurationError(
      `${label} must contain only plain data`
    );
  }
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key !== 'string')) {
    throw new InvalidRuntimePgConfigurationError(
      `${label} must not contain symbol properties`
    );
  }
  for (const key of keys as string[]) {
    if (key === 'connectionString') {
      throw new InvalidRuntimePgConfigurationError(
        `${label} must not return a connectionString; use explicit fields`
      );
    }
    if (!allowedKeys.has(key)) {
      throw new InvalidRuntimePgConfigurationError(
        `${label} contains unsupported field '${key}'`
      );
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !('value' in descriptor) || descriptor.value === undefined) {
      throw new InvalidRuntimePgConfigurationError(
        `${label}.${key} must be an explicit data value`
      );
    }
  }
  return value as Record<string, unknown>;
};

const exactArray = (
  value: unknown,
  label: string,
  length?: number
): readonly unknown[] => {
  if (!Array.isArray(value) || (length !== undefined && value.length !== length)) {
    throw new InvalidRuntimePgConfigurationError(
      `${label} must be ${length === undefined ? 'an array' : `an array of length ${length}`}`
    );
  }
  const keys = Reflect.ownKeys(value);
  if (
    keys.some((key) => typeof key !== 'string')
    || keys.some((key) => key !== 'length' && !/^(?:0|[1-9]\d*)$/.test(key as string))
    || Object.keys(value).length !== value.length
  ) {
    throw new InvalidRuntimePgConfigurationError(
      `${label} must be a dense array without custom properties`
    );
  }
  return value;
};

const exactString = (
  value: unknown,
  label: string,
  allowEmpty = false
): string => {
  if (
    typeof value !== 'string'
    || (!allowEmpty && value.trim().length === 0)
  ) {
    throw new InvalidRuntimePgConfigurationError(
      `${label} must be ${allowEmpty ? 'a string' : 'a non-empty string'}`
    );
  }
  return value;
};

const normalizeResolverInput = (
  value: RuntimePgResolverInput,
  label = 'runtime PostgreSQL route identity'
): Readonly<RuntimePgResolverInput> => {
  const record = ownDataRecord(value, label, STATIC_IDENTITY_KEYS);
  if (Reflect.ownKeys(record).length !== STATIC_IDENTITY_KEYS.size) {
    throw new InvalidRuntimePgConfigurationError(
      `${label} must contain databaseId, databaseName, apiId, schemas, and roles`
    );
  }
  const schemas = exactArray(record.schemas, `${label}.schemas`).map(
    (schema, index) => exactString(schema, `${label}.schemas[${index}]`)
  );
  if (schemas.length === 0 || new Set(schemas).size !== schemas.length) {
    throw new InvalidRuntimePgConfigurationError(
      `${label}.schemas must contain at least one unique physical schema`
    );
  }
  const roles = exactArray(record.roles, `${label}.roles`, 2).map(
    (role, index) => exactString(role, `${label}.roles[${index}]`)
  ) as [string, string];
  return Object.freeze({
    databaseId: exactString(record.databaseId, `${label}.databaseId`),
    databaseName: exactString(record.databaseName, `${label}.databaseName`),
    apiId: exactString(record.apiId, `${label}.apiId`, true),
    schemas: Object.freeze(schemas),
    roles: Object.freeze(roles) as readonly [string, string]
  });
};

const sameResolverInput = (
  left: Readonly<RuntimePgResolverInput>,
  right: Readonly<RuntimePgResolverInput>
): boolean =>
  left.databaseId === right.databaseId
  && left.databaseName === right.databaseName
  && left.apiId === right.apiId
  && left.schemas.length === right.schemas.length
  && left.schemas.every((schema, index) => schema === right.schemas[index])
  && left.roles[0] === right.roles[0]
  && left.roles[1] === right.roles[1];

const cloneIdentityData = (
  value: unknown,
  path: string,
  ancestors = new Set<object>()
): unknown => {
  if (
    value === null
    || typeof value === 'string'
    || typeof value === 'number'
    || typeof value === 'boolean'
  ) {
    return value;
  }
  if (Buffer.isBuffer(value)) return Buffer.from(value);
  if (Array.isArray(value)) {
    exactArray(value, path);
    if (ancestors.has(value)) {
      throw new InvalidRuntimePgConfigurationError(`${path} must not be cyclic`);
    }
    ancestors.add(value);
    const cloned = value.map((entry, index) =>
      cloneIdentityData(entry, `${path}[${index}]`, ancestors)
    );
    ancestors.delete(value);
    return Object.freeze(cloned);
  }
  if (typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new InvalidRuntimePgConfigurationError(
        `${path} must contain only plain data`
      );
    }
    if (ancestors.has(value)) {
      throw new InvalidRuntimePgConfigurationError(`${path} must not be cyclic`);
    }
    ancestors.add(value);
    const cloned: Record<string, unknown> = {};
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== 'string') {
        throw new InvalidRuntimePgConfigurationError(
          `${path} must not contain symbol properties`
        );
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !('value' in descriptor) || descriptor.value === undefined) {
        throw new InvalidRuntimePgConfigurationError(
          `${path}.${key} must be an explicit data value`
        );
      }
      cloned[key] = cloneIdentityData(
        descriptor.value,
        `${path}.${key}`,
        ancestors
      );
    }
    ancestors.delete(value);
    return Object.freeze(cloned);
  }
  throw new InvalidRuntimePgConfigurationError(
    `${path} must contain only deterministic data values`
  );
};

const networkDefaults = (options: ConstructiveOptions): RuntimePgConfig => ({
  ...(options.pg?.host === undefined ? {} : { host: options.pg.host }),
  ...(options.pg?.port === undefined ? {} : { port: options.pg.port }),
  ...(options.pg?.ssl === undefined
    ? {}
    : { ssl: cloneIdentityData(options.pg.ssl, 'pg.ssl') as RuntimePgConfig['ssl'] })
});

const networkTargetIdentity = (config: RuntimePgConfig): string =>
  getPgPoolIdentity({
    host: config.host,
    port: config.port,
    database: config.database,
    // Fixed non-connection sentinels make the existing exact/HMAC pool
    // identity machinery attest only this physical network/TLS target.
    user: 'constructive_target_attestation',
    password: 'constructive_target_attestation',
    ...(config.ssl === undefined ? {} : { ssl: config.ssl }),
    pool: TARGET_ATTESTATION_POOL
  }, TARGET_ATTESTATION_OPTIONS);

const normalizeRuntimePgConfig = (
  options: ConstructiveOptions,
  input: Readonly<RuntimePgResolverInput>,
  rawValue: unknown,
  label: string
): Readonly<RuntimePgPoolResolution> => {
  const raw = ownDataRecord(rawValue, label, CONFIG_KEYS);
  const user = exactString(raw.user, `${label}.user`);
  const password = exactString(raw.password, `${label}.password`);
  const database = exactString(raw.database, `${label}.database`);
  if (database !== input.databaseName) {
    throw new InvalidRuntimePgConfigurationError(
      `${label} database does not match the routed physical database`
    );
  }

  let pool: RuntimePgConfig['pool'];
  if (raw.pool !== undefined) {
    const poolRecord = ownDataRecord(raw.pool, `${label}.pool`, POOL_KEYS);
    pool = Object.freeze({ ...poolRecord }) as RuntimePgConfig['pool'];
  }
  const normalized = getPgEnvOptions({
    ...networkDefaults(options),
    ...raw,
    user,
    password,
    database,
    ...(raw.ssl === undefined
      ? {}
      : { ssl: cloneIdentityData(raw.ssl, `${label}.ssl`) as RuntimePgConfig['ssl'] })
  });
  if (
    normalized.user !== user
    || normalized.password !== password
    || normalized.database !== input.databaseName
  ) {
    throw new InvalidRuntimePgConfigurationError(
      `${label} identity changed during normalization`
    );
  }

  try {
    const controlTarget = getPgEnvOptions({
      ...networkDefaults(options),
      database: input.databaseName
    });
    if (
      networkTargetIdentity(normalized)
      !== networkTargetIdentity(controlTarget)
    ) {
      throw new InvalidRuntimePgConfigurationError(
        `${label} network/TLS endpoint does not match the routed control-plane database`
      );
    }
  } catch (error) {
    if (error instanceof InvalidRuntimePgConfigurationError) throw error;
    throw new InvalidRuntimePgConfigurationError(
      `${label} could not attest the routed control-plane network/TLS endpoint`
    );
  }

  const pgConfig = Object.freeze({
    host: normalized.host,
    port: normalized.port,
    user: normalized.user,
    password: normalized.password,
    database: normalized.database,
    ...(normalized.ssl === undefined
      ? {}
      : { ssl: cloneIdentityData(normalized.ssl, `${label}.ssl`) as RuntimePgConfig['ssl'] }),
    ...(pool ? { pool } : {})
  }) as RuntimePgConfig;
  let poolIdentity: string;
  try {
    poolIdentity = getPgPoolIdentity(pgConfig, RUNTIME_POOL_OPTIONS);
  } catch {
    throw new InvalidRuntimePgConfigurationError(
      `${label} could not form an exact normalized pool identity`
    );
  }
  return Object.freeze({ pgConfig, poolIdentity });
};

/** Build the credential-free exact resolver key from authoritative routing. */
export const createRuntimePgResolverInput = (
  api: ApiStructure
): Readonly<RuntimePgResolverInput> => normalizeResolverInput({
  databaseId: api.databaseId ?? '',
  databaseName: api.dbname,
  apiId: api.apiId ?? '',
  schemas: api.schema,
  roles: [api.anonRole, api.roleName]
});

/** Resolve and normalize one request's tenant execution identity exactly once. */
export const resolveRuntimePgConfig = async (
  options: ConstructiveOptions,
  inputValue: RuntimePgResolverInput,
  nodeEnv = getNodeEnv()
): Promise<Readonly<RuntimePgPoolResolution>> => {
  assertRuntimePgCredentials(options, nodeEnv);
  const input = normalizeResolverInput(inputValue);
  const resolver = options.runtimePgResolver;
  if (resolver) {
    let resolved: Awaited<ReturnType<typeof resolver>>;
    try {
      resolved = await resolver(input);
    } catch {
      throw new InvalidRuntimePgConfigurationError(
        'runtimePgResolver failed for the requested exact route'
      );
    }
    return normalizeRuntimePgConfig(
      options,
      input,
      resolved,
      'runtimePgResolver result'
    );
  }

  if (options.runtimePg) {
    if (options.runtimePgStaticIdentity) {
      const staticIdentity = normalizeResolverInput(
        options.runtimePgStaticIdentity,
        'runtimePgStaticIdentity'
      );
      if (!sameResolverInput(staticIdentity, input)) {
        throw new InvalidRuntimePgConfigurationError(
          'Static runtimePg is not authorized for the requested exact route'
        );
      }
    } else if (requiresExactRuntimePgResolution(options, nodeEnv)) {
      throw new InvalidRuntimePgConfigurationError(
        'Static runtimePg requires one exact runtimePgStaticIdentity'
      );
    }
    const configuredDatabase = options.runtimePg.database;
    if (
      configuredDatabase !== undefined
      && configuredDatabase !== input.databaseName
    ) {
      throw new InvalidRuntimePgConfigurationError(
        'runtimePg database does not match the routed physical database'
      );
    }
    return normalizeRuntimePgConfig(
      options,
      input,
      {
        ...options.runtimePg,
        database: configuredDatabase ?? input.databaseName
      },
      'runtimePg'
    );
  }

  // Explicitly unsafe compatibility path for stock local development/tests.
  // The startup assertion above prevents this path in production or scoped mode.
  const fallback = getPgEnvOptions({
    ...options.pg,
    database: input.databaseName
  });
  return normalizeRuntimePgConfig(
    options,
    input,
    fallback,
    'development control-plane runtime fallback'
  );
};

export interface RuntimePgResolutionStore {
  middleware: RequestHandler;
  getRuntimePgResolution: (
    req: Request,
    api?: ApiStructure
  ) => Readonly<RuntimePgPoolResolution>;
}

/**
 * Keep raw credentials in a server-owned WeakMap, never on `req`. Context and
 * Graphile receive the same frozen resolution and verify its opaque identity.
 */
export const createRuntimePgResolutionStore = (
  options: ConstructiveOptions
): RuntimePgResolutionStore => {
  assertRuntimePgCredentials(options);
  let staticResolution: StoredResolution | null = null;
  if (options.runtimePg) {
    ownDataRecord(options.runtimePg, 'runtimePg', CONFIG_KEYS);
    if (options.runtimePgStaticIdentity) {
      const input = normalizeResolverInput(
        options.runtimePgStaticIdentity,
        'runtimePgStaticIdentity'
      );
      const resolution = normalizeRuntimePgConfig(
        options,
        input,
        options.runtimePg,
        'runtimePg'
      );
      staticResolution = { input, resolution };
    }
  }
  interface StoredResolution {
    input: Readonly<RuntimePgResolverInput>;
    resolution: Readonly<RuntimePgPoolResolution>;
  }
  const resolutions = new WeakMap<Request, StoredResolution>();
  const getRuntimePgResolution = (
    req: Request,
    api = req.api
  ): Readonly<RuntimePgPoolResolution> => {
    const stored = resolutions.get(req);
    if (!stored || !api) {
      throw new InvalidRuntimePgConfigurationError(
        'Runtime PostgreSQL resolution is unavailable for this request'
      );
    }
    const currentInput = createRuntimePgResolverInput(api);
    if (!sameResolverInput(stored.input, currentInput)) {
      throw new InvalidRuntimePgConfigurationError(
        'Authoritative API route changed after runtime PostgreSQL resolution'
      );
    }
    return stored.resolution;
  };
  const middleware: RequestHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const requestEnded = (): boolean => Boolean(
      req.aborted
      || req.socket?.destroyed
      || res.destroyed
      || res.writableEnded
    );
    const cleanup = (): void => {
      resolutions.delete(req);
      req.removeListener('aborted', cleanup);
      res.removeListener('finish', cleanup);
      res.removeListener('close', cleanup);
    };
    try {
      if (requestEnded()) return;
      if (!req.api) {
        throw new InvalidRuntimePgConfigurationError(
          'Runtime PostgreSQL resolution requires an authoritative API route'
        );
      }
      const input = createRuntimePgResolverInput(req.api);
      let resolution: Readonly<RuntimePgPoolResolution>;
      if (staticResolution) {
        if (!sameResolverInput(staticResolution.input, input)) {
          throw new InvalidRuntimePgConfigurationError(
            'Static runtimePg is not authorized for the requested exact route'
          );
        }
        resolution = staticResolution.resolution;
      } else {
        resolution = await resolveRuntimePgConfig(options, input);
      }
      if (requestEnded()) return;
      resolutions.set(req, { input, resolution });
      req.once('aborted', cleanup);
      res.once('finish', cleanup);
      res.once('close', cleanup);
      next();
    } catch (error) {
      cleanup();
      next(error);
    }
  };
  return { middleware, getRuntimePgResolution };
};
