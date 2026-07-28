import type { ErrorClass, ErrorContext } from './types';

export interface ConstructiveErrorArgs {
  code: string;
  message: string;
  errorClass: ErrorClass;
  http: number;
  context?: ErrorContext;
}

/**
 * The single canonical error class for Constructive. Carries the machine
 * `code`, its classification, an HTTP hint, and structured `context`.
 *
 * Replaces the previously separate `PgpmError`, `AuthError`, and `DataError`
 * shapes. GraphQL transports should serialize {@link toExtensions}.
 */
export class ConstructiveError extends Error {
  readonly code: string;
  readonly errorClass: ErrorClass;
  readonly http: number;
  readonly context?: ErrorContext;

  constructor(args: ConstructiveErrorArgs) {
    super(args.message);
    this.name = 'ConstructiveError';
    this.code = args.code;
    this.errorClass = args.errorClass;
    this.http = args.http;
    this.context = args.context;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ConstructiveError);
    }
  }

  /** Whether this error is safe to surface to end users. */
  get isPublic(): boolean {
    return this.errorClass === 'public';
  }

  /** GraphQL `extensions` payload for this error. */
  toExtensions(): { code: string; class: ErrorClass; http: number; context?: ErrorContext } {
    const ext: { code: string; class: ErrorClass; http: number; context?: ErrorContext } = {
      code: this.code,
      class: this.errorClass,
      http: this.http
    };
    if (this.context && Object.keys(this.context).length > 0) {
      ext.context = this.context;
    }
    return ext;
  }

  toString(): string {
    return `[${this.code}] ${this.message}`;
  }
}
