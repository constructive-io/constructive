export type ConfigErrorCode =
  | 'CONFIG_INVALID'
  | 'CONFIG_BASE_DIRECTORY_REQUIRED'
  | 'CONFIG_VERSION_UNSUPPORTED'
  | 'CONFIG_LOCK_TIMEOUT'
  | 'CONFIG_SYMLINK_REJECTED'
  | 'CONTEXT_NAME_INVALID'
  | 'CONTEXT_ENDPOINT_INVALID'
  | 'CONTEXT_NOT_FOUND'
  | 'CONTEXT_REQUIRED';

export class ConfigStoreError extends Error {
  readonly name = 'ConfigStoreError';

  constructor(
    readonly code: ConfigErrorCode,
    message: string,
    readonly details?: Record<string, unknown>,
    options?: { cause?: unknown }
  ) {
    super(message, options);
  }
}

