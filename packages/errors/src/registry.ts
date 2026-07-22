import type { EmptyContext, ErrorContext, ErrorDefinition } from './types';

/**
 * A registry entry plus a phantom type carrier for its context. The
 * contravariant `__context` field lets `ErrorsApi` recover `C` by inference
 * even when `C` appears only in optional positions of {@link ErrorDefinition}.
 * It is type-level only — never set at runtime.
 */
export type DefinedError<C extends ErrorContext = EmptyContext> = ErrorDefinition<C> & {
  readonly __context: (context: C) => void;
};

/**
 * Identity helper that captures each entry's context type for inference while
 * keeping the registry a plain object. `errors.MODULE_NOT_FOUND({ name })` is
 * then type-checked against the declared context.
 */
export function defineError<C extends ErrorContext = EmptyContext>(
  def: ErrorDefinition<C>
): DefinedError<C> {
  return def as DefinedError<C>;
}

/**
 * The canonical Constructive error registry.
 *
 * This is the hand-seeded core (public auth/limit codes with real dashboard
 * copy, native PostgreSQL constraint codes, and the pgpm CLI codes). The full
 * 287-code set emitted by constructive-db is generated in a later phase; codes
 * absent here still `parse()` — they are simply classified `internal` (masked)
 * until registered.
 */
export const registry = {
  // ===========================================================================
  // Auth / account (public) — copy sourced from dashboard auth-errors.ts
  // ===========================================================================
  ACCOUNT_EXISTS: defineError({
    code: 'ACCOUNT_EXISTS',
    class: 'public',
    http: 409,
    message: 'An account with this email already exists. Please sign in or use a different email.'
  }),
  ACCOUNT_NOT_FOUND: defineError({
    code: 'ACCOUNT_NOT_FOUND',
    class: 'public',
    http: 404,
    message: 'No account was found.'
  }),
  NO_ACCOUNT_EXISTS: defineError<{ userId?: string }>({
    code: 'NO_ACCOUNT_EXISTS',
    class: 'public',
    http: 404,
    message: 'No account exists for this user.'
  }),
  INVALID_CREDENTIALS: defineError({
    code: 'INVALID_CREDENTIALS',
    class: 'public',
    http: 401,
    message: 'Invalid email or password.'
  }),
  INCORRECT_PASSWORD: defineError({
    code: 'INCORRECT_PASSWORD',
    class: 'public',
    http: 401,
    message: 'The password you entered is incorrect. Please try again.'
  }),
  ACCOUNT_LOCKED_EXCEED_ATTEMPTS: defineError({
    code: 'ACCOUNT_LOCKED_EXCEED_ATTEMPTS',
    class: 'public',
    http: 423,
    message:
      'Your account has been temporarily locked due to too many failed login attempts. Please try again later or reset your password.'
  }),
  ACCOUNT_DISABLED: defineError({
    code: 'ACCOUNT_DISABLED',
    class: 'public',
    http: 403,
    message: 'Your account has been disabled. Please contact support for assistance.'
  }),
  PASSWORD_INSECURE: defineError({
    code: 'PASSWORD_INSECURE',
    class: 'public',
    http: 400,
    message: 'This password is not secure enough. Please choose a stronger password.'
  }),
  PASSWORD_LEN: defineError({
    code: 'PASSWORD_LEN',
    class: 'public',
    http: 400,
    message: 'Password must be between 8 and 63 characters long.'
  }),
  EMAIL_NOT_VERIFIED: defineError({
    code: 'EMAIL_NOT_VERIFIED',
    class: 'public',
    http: 403,
    message: 'Please verify your email address to continue.'
  }),
  SIGN_UP_DISABLED: defineError({
    code: 'SIGN_UP_DISABLED',
    class: 'public',
    http: 403,
    message: 'Sign-up is currently disabled.'
  }),

  // ===========================================================================
  // Invites (public)
  // ===========================================================================
  INVITE_NOT_FOUND: defineError({
    code: 'INVITE_NOT_FOUND',
    class: 'public',
    http: 404,
    message:
      'The invitation code is invalid or has expired. Please check the code or request a new invitation.'
  }),
  INVITE_LIMIT: defineError({
    code: 'INVITE_LIMIT',
    class: 'public',
    http: 429,
    message: 'This invitation has reached its usage limit. Please request a new invitation.'
  }),
  INVITE_EMAIL_NOT_FOUND: defineError({
    code: 'INVITE_EMAIL_NOT_FOUND',
    class: 'public',
    http: 404,
    message:
      'This email is not associated with the invitation. Please use the email address the invitation was sent to.'
  }),

  // ===========================================================================
  // Authorization / step-up (public)
  // ===========================================================================
  UNAUTHENTICATED: defineError({
    code: 'UNAUTHENTICATED',
    class: 'public',
    http: 401,
    message: 'You must be signed in to do that.'
  }),
  FORBIDDEN: defineError({
    code: 'FORBIDDEN',
    class: 'public',
    http: 403,
    message: 'You do not have permission to do that.'
  }),
  STEP_UP_REQUIRED: defineError({
    code: 'STEP_UP_REQUIRED',
    class: 'public',
    http: 403,
    message: 'Additional verification is required to continue.'
  }),
  MFA_REQUIRED: defineError({
    code: 'MFA_REQUIRED',
    class: 'public',
    http: 403,
    message: 'Multi-factor authentication is required to continue.'
  }),
  INVALID_TOKEN: defineError({
    code: 'INVALID_TOKEN',
    class: 'public',
    http: 401,
    message: 'This link or token is invalid or has expired.'
  }),

  // ===========================================================================
  // Limits (public, dynamic)
  // ===========================================================================
  LIMIT_REACHED: defineError<{ resource?: string; limit?: number }>({
    code: 'LIMIT_REACHED',
    class: 'public',
    http: 429,
    message: 'You have reached a plan limit for this resource.',
    positional: ['resource', 'limit']
  }),
  RATE_LIMITED: defineError({
    code: 'RATE_LIMITED',
    class: 'public',
    http: 429,
    message: 'Too many requests. Please slow down and try again shortly.'
  }),

  // ===========================================================================
  // Native PostgreSQL constraint violations (public) — synthetic codes mapped
  // from SQLSTATE by parse().
  // ===========================================================================
  UNIQUE_VIOLATION: defineError<{ constraint?: string; table?: string }>({
    code: 'UNIQUE_VIOLATION',
    class: 'public',
    http: 409,
    message: 'That value already exists.'
  }),
  FOREIGN_KEY_VIOLATION: defineError<{ constraint?: string; table?: string }>({
    code: 'FOREIGN_KEY_VIOLATION',
    class: 'public',
    http: 409,
    message: 'A related record is required or still referenced.'
  }),
  NOT_NULL_VIOLATION: defineError<{ column?: string; table?: string }>({
    code: 'NOT_NULL_VIOLATION',
    class: 'public',
    http: 400,
    message: 'A required value is missing.'
  }),
  CHECK_VIOLATION: defineError<{ constraint?: string; table?: string }>({
    code: 'CHECK_VIOLATION',
    class: 'public',
    http: 400,
    message: 'A value did not satisfy a constraint.'
  }),
  EXCLUSION_VIOLATION: defineError<{ constraint?: string; table?: string }>({
    code: 'EXCLUSION_VIOLATION',
    class: 'public',
    http: 409,
    message: 'A value conflicts with an existing record.'
  }),

  // ===========================================================================
  // pgpm CLI / engine (mostly internal) — behavior preserved from the former
  // pgpm/types error-factory so existing call sites are unchanged.
  // ===========================================================================
  NOT_FOUND: defineError({
    code: 'NOT_FOUND',
    class: 'public',
    http: 404,
    message: 'Not found.'
  }),
  MODULE_NOT_FOUND: defineError<{ name: string }>({
    code: 'MODULE_NOT_FOUND',
    class: 'internal',
    http: 404,
    message: 'Module "{{name}}" not found in modules list.'
  }),
  INTERNAL_FAILURE: defineError<{ details: string }>({
    code: 'INTERNAL_FAILURE',
    class: 'internal',
    http: 500,
    message: 'Something went wrong: {{details}}'
  }),
  CONTEXT_MISSING: defineError({
    code: 'CONTEXT_MISSING',
    class: 'internal',
    http: 500,
    message: 'Context is not initialized. Did you run setup()?'
  }),
  NOT_IN_WORKSPACE: defineError({
    code: 'NOT_IN_WORKSPACE',
    class: 'internal',
    http: 400,
    message: 'You must be in a PGPM workspace. Initialize with "pgpm init workspace".'
  }),
  NOT_IN_WORKSPACE_MODULE: defineError({
    code: 'NOT_IN_WORKSPACE_MODULE',
    class: 'internal',
    http: 400,
    message: 'Error: You must be inside one of the workspace packages.'
  }),
  DEPLOYMENT_FAILED: defineError<{ type: 'Deployment' | 'Revert' | 'Verify'; module: string }>({
    code: 'DEPLOYMENT_FAILED',
    class: 'internal',
    http: 500,
    message: '{{type}} failed for module: {{module}}'
  }),
  UNSUPPORTED_TYPE_HINT: defineError<{ typeHint: string }>({
    code: 'UNSUPPORTED_TYPE_HINT',
    class: 'internal',
    http: 400,
    message: 'Unsupported type hint: {{typeHint}}'
  }),
  BAD_FILE_NAME: defineError<{ name: string }>({
    code: 'BAD_FILE_NAME',
    class: 'internal',
    http: 400,
    message: 'Invalid file name: {{name}}'
  }),
  UNKNOWN_COMMAND: defineError<{ cmd: string }>({
    code: 'UNKNOWN_COMMAND',
    class: 'internal',
    http: 400,
    message: 'Unknown command: {{cmd}}'
  }),
  CHANGE_NOT_FOUND: defineError<{ change: string; plan?: string }>({
    code: 'CHANGE_NOT_FOUND',
    class: 'internal',
    http: 404,
    message: ({ change, plan }) =>
      `Change '${change}' not found in plan${plan ? ` file: ${plan}` : ''}`
  }),
  TAG_NOT_FOUND: defineError<{ tag: string; project?: string }>({
    code: 'TAG_NOT_FOUND',
    class: 'internal',
    http: 404,
    message: ({ tag, project }) =>
      `Tag '${tag}' not found${project ? ` in project ${project}` : ' in plan'}`
  }),
  PATH_NOT_FOUND: defineError<{ path: string; type: 'module' | 'workspace' | 'file' }>({
    code: 'PATH_NOT_FOUND',
    class: 'internal',
    http: 404,
    message: ({ path, type }) => `${type} path not found: ${path}`
  }),
  OPERATION_FAILED: defineError<{ operation: string; target?: string; reason?: string }>({
    code: 'OPERATION_FAILED',
    class: 'internal',
    http: 500,
    message: ({ operation, target, reason }) =>
      `${operation} failed${target ? ` for ${target}` : ''}${reason ? `: ${reason}` : ''}`
  }),
  PLAN_PARSE_ERROR: defineError<{ planPath: string; errors: string }>({
    code: 'PLAN_PARSE_ERROR',
    class: 'internal',
    http: 400,
    message: ({ planPath, errors }) => `Failed to parse plan file ${planPath}: ${errors}`
  }),
  CIRCULAR_DEPENDENCY: defineError<{ module: string; dependency: string }>({
    code: 'CIRCULAR_DEPENDENCY',
    class: 'internal',
    http: 400,
    message: ({ module, dependency }) => `Circular reference detected: ${module} → ${dependency}`
  }),
  INVALID_NAME: defineError<{ name: string; type: 'tag' | 'change' | 'module'; rules?: string }>({
    code: 'INVALID_NAME',
    class: 'internal',
    http: 400,
    message: ({ name, type, rules }) => `Invalid ${type} name: ${name}${rules ? `. ${rules}` : ''}`
  }),
  WORKSPACE_OPERATION_ERROR: defineError<{ operation: string }>({
    code: 'WORKSPACE_OPERATION_ERROR',
    class: 'internal',
    http: 400,
    message: ({ operation }) =>
      `Cannot perform non-recursive ${operation} on workspace. Use recursive=true or specify a target module.`
  }),
  FILE_NOT_FOUND: defineError<{ filePath: string; type?: string }>({
    code: 'FILE_NOT_FOUND',
    class: 'internal',
    http: 404,
    message: ({ filePath, type }) => `${type ? `${type} file` : 'File'} not found: ${filePath}`
  })
} as const;

export type Registry = typeof registry;
export type RegistryCode = keyof Registry;

/** Look up a definition by code (from anywhere, not just typed keys). */
export function getDefinition(code: string): ErrorDefinition<ErrorContext> | undefined {
  return (registry as unknown as Record<string, ErrorDefinition<ErrorContext>>)[code];
}
