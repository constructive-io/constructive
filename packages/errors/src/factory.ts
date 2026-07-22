import { ConstructiveError } from './error';
import { format } from './format';
import { registry } from './registry';
import type { ErrorClass, ErrorContext, ErrorDefinition } from './types';

/**
 * The callable produced for a registry entry. Codes with no context params can
 * be called with no arguments; codes with params require a matching context.
 * The `[keyof C]` tuple wrapper prevents `never` from distributing.
 */
export type ErrorFactory<C extends ErrorContext> = [keyof C] extends [never]
  ? (context?: Record<string, never>, overrideMessage?: string) => ConstructiveError
  : (context: C, overrideMessage?: string) => ConstructiveError;

export type ErrorsApi<R> = {
  [K in keyof R]: R[K] extends { __context: (context: infer C) => void }
    ? C extends ErrorContext
      ? ErrorFactory<C>
      : never
    : never;
};

/** Build a throwable factory for a single definition. */
export function makeErrorFromDefinition<C extends ErrorContext>(
  def: ErrorDefinition<C>
): ErrorFactory<C> {
  const factory = (context?: ErrorContext, overrideMessage?: string): ConstructiveError =>
    new ConstructiveError({
      code: def.code,
      message: overrideMessage ?? format(def.code, context ?? {}),
      errorClass: def.class,
      http: def.http,
      context
    });
  return factory as ErrorFactory<C>;
}

/** Build the `errors.*` factory object from a registry. */
export function buildErrors<R extends Record<string, { __context: (context: never) => void }>>(
  reg: R
): ErrorsApi<R> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(reg)) {
    out[key] = makeErrorFromDefinition(
      (reg as unknown as Record<string, ErrorDefinition<ErrorContext>>)[key]
    );
  }
  return out as ErrorsApi<R>;
}

/**
 * Low-level factory helper for defining an error inline (the pattern the former
 * pgpm `error-factory` exposed). Prefer registering codes in the registry, but
 * this remains available for ad-hoc / dynamically-coded errors.
 */
export function makeError<C extends ErrorContext>(
  code: string,
  messageFn: (context: C) => string,
  httpCode = 500,
  errorClass: ErrorClass = 'internal'
): (context: C, overrideMessage?: string) => ConstructiveError {
  return (context: C, overrideMessage?: string) =>
    new ConstructiveError({
      code,
      message: overrideMessage ?? messageFn(context),
      errorClass,
      http: httpCode,
      context
    });
}

/** The canonical, type-safe `errors.*` factory built from the registry. */
export const errors = buildErrors(registry);
