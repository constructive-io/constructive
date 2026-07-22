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
