import { inspectHttpEndpoint } from '../http-endpoint-policy';
import { ConfigStoreError } from './config-errors';
import type {
  CncState,
  ContextConfig,
  ContextCredentials,
  Credentials,
  GlobalSettings,
} from './types';
import { CURRENT_STATE_VERSION } from './types';

const CONTEXT_NAME_PATTERN =
  /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,62}[A-Za-z0-9])?$/;
export function cloneState(state: CncState): CncState {
  return {
    stateVersion: CURRENT_STATE_VERSION,
    settings: { ...state.settings },
    contexts: Object.fromEntries(
      Object.entries(state.contexts).map(([name, context]) => [
        name,
        { ...context },
      ])
    ),
    credentials: {
      tokens: Object.fromEntries(
        Object.entries(state.credentials.tokens).map(([name, credentials]) => [
          name,
          { ...credentials },
        ])
      ),
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function assertOnlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
  file: string
): void {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) {
    invalidConfig(
      `${label} contains unsupported fields: ${unknown.join(', ')}.`,
      file
    );
  }
}

export function invalidConfig(
  message: string,
  file?: string,
  cause?: unknown
): never {
  throw new ConfigStoreError(
    'CONFIG_INVALID',
    message,
    file ? { file } : undefined,
    { cause }
  );
}

export function validateContextName(name: string): string {
  if (!CONTEXT_NAME_PATTERN.test(name) || name === '.' || name === '..') {
    throw new ConfigStoreError(
      'CONTEXT_NAME_INVALID',
      'Context names must be 1-64 characters, begin and end with a letter or number, and contain only letters, numbers, dots, underscores, or hyphens.',
      { contextName: name }
    );
  }
  return name;
}

export function validateEndpoint(endpoint: string): string {
  const inspection = inspectHttpEndpoint(endpoint);
  if (inspection.reason === 'invalid-url') {
    throw new ConfigStoreError(
      'CONTEXT_ENDPOINT_INVALID',
      'Context endpoint must be an absolute HTTP or HTTPS URL.'
    );
  }

  if (inspection.reason === 'unsafe') {
    throw new ConfigStoreError(
      'CONTEXT_ENDPOINT_INVALID',
      'Context endpoint must be an HTTP or HTTPS URL without embedded credentials, credential-like query parameters, or a fragment.'
    );
  }
  return endpoint;
}

export function parseContext(value: unknown, file: string): ContextConfig {
  if (!isRecord(value)) {
    return invalidConfig('Context configuration must be an object.', file);
  }
  assertOnlyKeys(
    value,
    ['name', 'endpoint', 'createdAt', 'updatedAt'],
    'Context configuration',
    file
  );
  const { name, endpoint, createdAt, updatedAt } = value;
  if (
    typeof name !== 'string' ||
    typeof endpoint !== 'string' ||
    !isIsoDate(createdAt) ||
    !isIsoDate(updatedAt)
  ) {
    return invalidConfig(
      'Context configuration is missing a valid name, endpoint, createdAt, or updatedAt value.',
      file
    );
  }
  validateContextName(name);
  validateEndpoint(endpoint);
  return { name, endpoint, createdAt, updatedAt };
}

export function parseSettings(value: unknown, file: string): GlobalSettings {
  if (!isRecord(value)) {
    return invalidConfig('Settings must be an object.', file);
  }
  assertOnlyKeys(value, ['currentContext'], 'Settings', file);
  const currentContext = value.currentContext;
  if (currentContext !== undefined && typeof currentContext !== 'string') {
    return invalidConfig('settings.currentContext must be a string.', file);
  }
  if (typeof currentContext === 'string') {
    validateContextName(currentContext);
  }
  return typeof currentContext === 'string' ? { currentContext } : {};
}

function parseContextCredentials(
  value: unknown,
  file: string
): ContextCredentials {
  if (
    !isRecord(value) ||
    typeof value.token !== 'string' ||
    value.token === ''
  ) {
    return invalidConfig(
      'Stored credentials must contain a non-empty token.',
      file
    );
  }
  assertOnlyKeys(
    value,
    ['token', 'expiresAt', 'refreshToken'],
    'Stored credentials',
    file
  );
  if (value.expiresAt !== undefined && !isIsoDate(value.expiresAt)) {
    return invalidConfig('credentials.expiresAt must be an ISO date.', file);
  }
  if (
    value.refreshToken !== undefined &&
    typeof value.refreshToken !== 'string'
  ) {
    return invalidConfig('credentials.refreshToken must be a string.', file);
  }
  return {
    token: value.token,
    expiresAt: value.expiresAt as string | undefined,
    refreshToken: value.refreshToken as string | undefined,
  };
}

export function parseCredentials(value: unknown, file: string): Credentials {
  if (!isRecord(value) || !isRecord(value.tokens)) {
    return invalidConfig('Credentials must contain a tokens object.', file);
  }
  assertOnlyKeys(value, ['tokens'], 'Credentials', file);
  const tokens: Record<string, ContextCredentials> = {};
  for (const [name, credentials] of Object.entries(value.tokens)) {
    validateContextName(name);
    tokens[name] = parseContextCredentials(credentials, file);
  }
  return { tokens };
}

export function parseState(value: unknown, file: string): CncState {
  if (!isRecord(value) || typeof value.stateVersion !== 'number') {
    return invalidConfig('CNC state is missing a numeric stateVersion.', file);
  }
  assertOnlyKeys(
    value,
    ['stateVersion', 'settings', 'contexts', 'credentials'],
    'CNC state',
    file
  );
  if (value.stateVersion > CURRENT_STATE_VERSION) {
    throw new ConfigStoreError(
      'CONFIG_VERSION_UNSUPPORTED',
      `CNC state version ${value.stateVersion} is newer than supported version ${CURRENT_STATE_VERSION}.`,
      { file, stateVersion: value.stateVersion }
    );
  }
  if (value.stateVersion !== CURRENT_STATE_VERSION) {
    return invalidConfig(
      `CNC state version ${value.stateVersion} cannot be migrated by this release.`,
      file
    );
  }
  if (!isRecord(value.contexts)) {
    return invalidConfig('CNC state must contain a contexts object.', file);
  }

  const contexts: Record<string, ContextConfig> = {};
  for (const [name, rawContext] of Object.entries(value.contexts)) {
    validateContextName(name);
    const context = parseContext(rawContext, file);
    if (context.name !== name) {
      return invalidConfig(
        `Context key "${name}" does not match its stored name.`,
        file
      );
    }
    contexts[name] = context;
  }

  const settings = parseSettings(value.settings, file);
  const credentials = parseCredentials(value.credentials, file);
  if (settings.currentContext && !contexts[settings.currentContext]) {
    return invalidConfig(
      `Current context "${settings.currentContext}" does not exist.`,
      file
    );
  }
  const orphanedCredentials = Object.keys(credentials.tokens).filter(
    (name) => !contexts[name]
  );
  if (orphanedCredentials.length > 0) {
    return invalidConfig(
      `Stored credentials reference missing contexts: ${orphanedCredentials.join(', ')}.`,
      file
    );
  }
  return {
    stateVersion: CURRENT_STATE_VERSION,
    settings,
    contexts,
    credentials,
  };
}
