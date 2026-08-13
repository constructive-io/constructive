// ── Secret redaction ─────────────────────────────────────────────────────────
//
// envalid embeds the offending value in its error message (`Invalid url: "..."`,
// `Not a string: "..."`, `Invalid port input: "..."`), and a throwing reporter
// concatenates those into the crash log. So a malformed DATABASE_URL prints its
// password, and a bad API key prints the key. `env()` already knows which vars
// are sensitive — its first parameter is literally named `secrets` — so the
// library redacts on the error path instead of trusting the value not to be one.

import type { Spec, ValidatorSpec } from 'envalid';
import { EnvError, EnvMissingError } from 'envalid';

const REDACTED = '[redacted]';

/** A `Spec` may carry `secret: true` to mark the var sensitive on its own,
 *  independently of whether it was declared in `env()`'s `secrets` argument. */
export type SecretSpec = { secret?: boolean };

// Declared on envalid's own `Spec` so `str({ secret: true })` type-checks with
// the validators consumers already use. The marker is stripped before the spec
// reaches envalid.
declare module 'envalid' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Spec<T> {
    /** Never print this value in a validation error or in serialized output. */
    secret?: boolean;
  }
}

export const isSecretSpec = (spec: ValidatorSpec<unknown> | Spec<unknown>): boolean =>
  (spec as SecretSpec).secret === true;

/** Strip a spec's `secret` marker before handing it to envalid (which would
 *  otherwise carry an unknown key through its spec objects). */
export const stripSecret = <S extends Record<string, ValidatorSpec<unknown>>>(specs: S): S => {
  const out: Record<string, ValidatorSpec<unknown>> = {};
  for (const [name, spec] of Object.entries(specs)) {
    if (isSecretSpec(spec)) {
      const rest = { ...spec } as ValidatorSpec<unknown> & SecretSpec;
      delete rest.secret;
      out[name] = rest as ValidatorSpec<unknown>;
    } else {
      out[name] = spec;
    }
  }
  return out as S;
};

/** envalid quotes the offending value; replace the quoted payload. */
const stripQuotedValues = (message: string): string =>
  message.replace(/"[^"]*"/g, `"${REDACTED}"`);

/**
 * The reported message for a failed secret var: names the var and the failure,
 * never the value. A MISSING var has no value to leak, so its message (the
 * spec description) is kept verbatim — that is the part that tells an operator
 * what to set.
 */
export const redactMessage = (error: Error, rawValue: string | undefined): string => {
  if (error instanceof EnvMissingError) return error.message;
  const sanitized = stripQuotedValues(error.message);
  const length = rawValue?.length ?? 0;
  return `${sanitized} (value redacted, ${length} chars)`;
};

/**
 * Scrub secrets out of an error before re-logging it. Quoted values in envalid
 * messages are always replaced; pass known secret values to remove them
 * wherever else they appear (a message a consumer built itself).
 *
 * ```ts
 * try { loadConfig(); } catch (err) { logger.error(redactEnvError(err)); }
 * ```
 */
export const redactEnvError = (
  error: unknown,
  secretValues: Iterable<string | undefined> = []
): Error => {
  if (!(error instanceof Error)) return new Error(String(error));
  let message = stripQuotedValues(error.message);
  for (const value of secretValues) {
    if (value && value.length > 0) message = message.split(value).join(REDACTED);
  }
  if (message === error.message) return error;
  const redacted = error instanceof EnvError ? new EnvError(message) : new Error(message);
  redacted.stack = error.stack;
  return redacted;
};

/**
 * Make the cleaned env safe to log wholesale: services log their config object
 * at boot, and `JSON.stringify`/`util.inspect` would print every secret. The
 * values stay readable through property access; only serialization redacts.
 *
 * Must be applied to the PLAIN cleaned object, before envalid's strict proxy and
 * `Object.freeze` (whose non-configurable props can no longer be defined on);
 * envalid's proxy passes `toJSON` and the inspect symbol through to the target.
 */
export const withRedactedSerialization = <T extends object>(
  cleaned: T,
  secretNames: ReadonlySet<string>
): T => {
  if (secretNames.size === 0) return cleaned;

  const redactedView = (): Record<string, unknown> => {
    const view: Record<string, unknown> = {};
    for (const name of Object.keys(cleaned)) {
      view[name] = secretNames.has(name)
        ? REDACTED
        : (cleaned as Record<string, unknown>)[name];
    }
    return view;
  };

  for (const key of ['toJSON', Symbol.for('nodejs.util.inspect.custom')] as const) {
    Object.defineProperty(cleaned, key, {
      value: redactedView,
      enumerable: false,
      configurable: true
    });
  }
  return cleaned;
};
