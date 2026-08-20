import { ErrorCategory, NextAction, StructuredError } from './contracts';

export interface CliErrorOptions {
  code: string;
  category: ErrorCategory;
  message: string;
  path?: string;
  details?: unknown;
  retryable?: boolean;
  nextActions?: NextAction[];
  cause?: unknown;
}

/** A safe, expected operation error which may cross the CLI protocol boundary. */
export class CliError extends Error {
  readonly code: string;
  readonly category: ErrorCategory;
  readonly path?: string;
  readonly details?: unknown;
  readonly retryable: boolean;
  readonly nextActions?: NextAction[];
  override readonly cause?: unknown;

  constructor(options: CliErrorOptions) {
    super(options.message);
    this.name = 'CliError';
    this.code = options.code;
    this.category = options.category;
    this.path = options.path;
    this.details = options.details;
    this.retryable = options.retryable ?? false;
    this.nextActions = options.nextActions;
    this.cause = options.cause;
  }

  toStructuredError(): StructuredError {
    return {
      code: this.code,
      category: this.category,
      message: this.message,
      ...(this.path === undefined ? {} : { path: this.path }),
      ...(this.details === undefined ? {} : { details: this.details }),
      retryable: this.retryable,
      ...(this.nextActions === undefined
        ? {}
        : { nextActions: this.nextActions }),
    };
  }
}

export class InvocationError extends CliError {
  constructor(
    code: string,
    message: string,
    options: Omit<CliErrorOptions, 'code' | 'category' | 'message'> = {}
  ) {
    super({ code, category: 'invocation', message, ...options });
    this.name = 'InvocationError';
  }
}

export class ContractError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ContractError';
    this.code = code;
    this.details = details;
  }
}

export function isCancellationError(
  error: unknown,
  signal?: AbortSignal
): boolean {
  if (signal?.aborted) return true;
  if (
    error === null ||
    (typeof error !== 'object' && typeof error !== 'function')
  )
    return false;
  const name = (error as { name?: unknown }).name;
  return (
    name === 'AbortError' ||
    name === 'CanceledError' ||
    name === 'CancelledError'
  );
}

export function normalizeKnownError(error: CliError): StructuredError {
  return error.toStructuredError();
}

export function internalError(details?: unknown): StructuredError {
  return {
    code: 'CLI_INTERNAL_ERROR',
    category: 'internal',
    message: 'The command failed because of an internal error.',
    ...(details === undefined ? {} : { details }),
    retryable: false,
  };
}

export function cancelledError(reason?: unknown): StructuredError {
  const message =
    typeof reason === 'string' && reason.length > 0
      ? reason
      : 'The operation was cancelled.';
  return {
    code: 'OPERATION_CANCELLED',
    category: 'operation',
    message,
    retryable: true,
  };
}
