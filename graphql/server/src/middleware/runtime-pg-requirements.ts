import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import { getNodeEnv } from '@pgpmjs/env';

export class MissingRuntimePgCredentialsError extends Error {
  readonly code = 'GRAPHILE_RUNTIME_PG_REQUIRED';

  constructor() {
    super(
      'GraphQL runtime execution requires an explicit PostgreSQL user and password'
    );
    this.name = 'MissingRuntimePgCredentialsError';
  }
}

export class InvalidRuntimePgConfigurationError extends Error {
  readonly code = 'GRAPHILE_RUNTIME_PG_CONFIG_INVALID';

  constructor(message: string) {
    super(message);
    this.name = 'InvalidRuntimePgConfigurationError';
  }
}

export const requiresExactRuntimePgResolution = (
  options: ConstructiveOptions,
  nodeEnv = getNodeEnv()
): boolean =>
  nodeEnv === 'production'
  || options.graphile?.introspectionMode === 'scoped-required';

/**
 * The control-plane login fallback exists only for backwards-compatible local
 * stock-mode development and tests. Production and scoped introspection always
 * use an explicit, independently audited runtime login.
 */
export const usesUnsafeDevelopmentRuntimePgFallback = (
  options: ConstructiveOptions,
  nodeEnv = getNodeEnv()
): boolean =>
  !requiresExactRuntimePgResolution(options, nodeEnv)
  && options.runtimePg === undefined
  && options.runtimePgResolver === undefined;

export const shouldValidateRuntimeRoleSafety = (
  options: ConstructiveOptions,
  nodeEnv = getNodeEnv()
): boolean =>
  nodeEnv === 'production'
  || options.runtimePg !== undefined
  || options.runtimePgResolver !== undefined
  || options.graphile?.introspectionMode === 'scoped-required';

export const assertRuntimePgCredentials = (
  options: ConstructiveOptions,
  nodeEnv = getNodeEnv()
): void => {
  const hasResolver = options.runtimePgResolver !== undefined;
  const hasStatic = options.runtimePg !== undefined;
  const hasStaticIdentity = options.runtimePgStaticIdentity !== undefined;
  if (hasResolver && (hasStatic || hasStaticIdentity)) {
    throw new InvalidRuntimePgConfigurationError(
      'runtimePgResolver is mutually exclusive with runtimePg and runtimePgStaticIdentity'
    );
  }
  if (hasResolver) {
    if (typeof options.runtimePgResolver !== 'function') {
      throw new InvalidRuntimePgConfigurationError(
        'runtimePgResolver must be a function'
      );
    }
    return;
  }
  if (hasStaticIdentity && !hasStatic) {
    throw new InvalidRuntimePgConfigurationError(
      'runtimePgStaticIdentity requires runtimePg'
    );
  }
  if (usesUnsafeDevelopmentRuntimePgFallback(options, nodeEnv)) return;
  if (!hasStatic) throw new MissingRuntimePgCredentialsError();
  if (Object.prototype.hasOwnProperty.call(options.runtimePg, 'connectionString')) {
    throw new InvalidRuntimePgConfigurationError(
      'runtimePg must not contain a connectionString; use explicit fields'
    );
  }
  const user = options.runtimePg?.user;
  const password = options.runtimePg?.password;
  if (
    typeof user !== 'string'
    || user.trim().length === 0
    || typeof password !== 'string'
    || password.length === 0
  ) {
    throw new MissingRuntimePgCredentialsError();
  }
  if (requiresExactRuntimePgResolution(options, nodeEnv)) {
    if (!hasStaticIdentity) {
      throw new InvalidRuntimePgConfigurationError(
        'Production and scoped introspection require runtimePgResolver, or runtimePgStaticIdentity for one exact route'
      );
    }
    if (
      typeof options.runtimePg?.database !== 'string'
      || options.runtimePg.database.length === 0
    ) {
      throw new InvalidRuntimePgConfigurationError(
        'Static production runtimePg requires an explicit database'
      );
    }
  }
};

/** @deprecated Use `assertRuntimePgCredentials`; retained for package compatibility. */
export const assertScopedRuntimePgCredentials = assertRuntimePgCredentials;
