const DEFAULT_SENSITIVE_KEY =
  /(?:^|[-_])(authorization|cookie|credentials?|password|passwd|secret|session|token|api[-_]?key|private[-_]?key|database[-_]?url|postgres(?:ql)?[-_]?url|pg[-_]?uri)(?:$|[-_])/i;

// Environment variables are frequently written as delimiter-free uppercase
// names (for example PGPASSWORD). Match their compact form as well as the
// delimiter-aware names above so a secret cannot evade automatic redaction by
// changing only the spelling convention.
const COMPACT_SENSITIVE_KEY =
  /(?:authorization|credentials?|password|passwd|secret|session|token|api(?:access)?key|privatekey|signingkey|servicerolekey|accesskey|connectionstring|webhookurl|pgpassfile|githubpat|jwt|dsn)$/i;

export interface RedactionOptions {
  replacement?: string;
  sensitiveKeys?: readonly (string | RegExp)[];
  sensitiveValues?: readonly string[];
}

export type Redactor = <T>(value: T) => T;

export function isSensitiveKey(
  key: string,
  matchers: readonly (string | RegExp)[] = []
): boolean {
  const normalized = key.replace(/([a-z0-9])([A-Z])/g, '$1-$2');
  if (DEFAULT_SENSITIVE_KEY.test(`-${normalized}-`)) return true;
  const compact = normalized.replace(/[^a-z0-9]/gi, '');
  if (COMPACT_SENSITIVE_KEY.test(compact)) return true;
  return matchers.some((matcher) =>
    typeof matcher === 'string'
      ? matcher.toLowerCase() === key.toLowerCase()
      : (() => {
          matcher.lastIndex = 0;
          return matcher.test(key);
        })()
  );
}

export function sensitiveEnvironmentValues(
  env: Readonly<Record<string, string | undefined>>,
  matchers: readonly (string | RegExp)[] = []
): string[] {
  return [
    ...new Set(
      Object.entries(env)
        .filter(
          ([key, value]) =>
            value !== undefined &&
            value.length > 0 &&
            isSensitiveKey(key, matchers)
        )
        .map(([, value]) => value!)
    ),
  ];
}

function redactString(
  value: string,
  secrets: readonly string[],
  replacement: string
): string {
  let redacted = value;
  for (const secret of secrets) {
    if (secret.length < 3) {
      if (redacted === secret) return replacement;
      continue;
    }
    redacted = redacted.split(secret).join(replacement);
  }
  return redacted;
}

/**
 * Creates a recursive, cycle-safe redactor. It redacts both sensitive fields and
 * known secret values embedded in otherwise safe messages.
 */
export function createRedactor(options: RedactionOptions = {}): Redactor {
  const replacement = options.replacement ?? '[REDACTED]';
  const matchers = options.sensitiveKeys ?? [];
  const secrets = [
    ...new Set(
      (options.sensitiveValues ?? []).filter((value) => value.length > 0)
    ),
  ].sort((left, right) => right.length - left.length);

  return <T>(input: T): T => {
    const ancestors = new WeakSet<object>();

    const visit = (
      value: unknown,
      parentKey?: string,
      inheritedSensitive = false
    ): unknown => {
      const sensitive =
        inheritedSensitive ||
        (parentKey !== undefined && isSensitiveKey(parentKey, matchers));
      if (typeof value === 'string') {
        return sensitive
          ? replacement
          : redactString(value, secrets, replacement);
      }
      // A sensitive field can be typed as a number, boolean, bigint, or symbol.
      // Preserve no primitive value from that field: coercing it to a string
      // first would still expose the secret, while returning it unchanged makes
      // key-based redaction depend on the value's runtime type. If replacing the
      // primitive violates the command's output/event schema, execution fails
      // closed as a redaction contract violation instead of leaking the value.
      if (sensitive && value !== null && typeof value !== 'object') {
        return replacement;
      }
      // Sensitive inputs can be declared as numeric or boolean values and then
      // echoed under an innocuous result key. Compare their canonical string
      // representation with the registered secret set before returning them.
      if (
        (typeof value === 'number' || typeof value === 'boolean') &&
        secrets.includes(String(value))
      ) {
        return replacement;
      }
      if (value === null || typeof value !== 'object') return value;

      if (sensitive && (value instanceof Date || value instanceof Error)) {
        return replacement;
      }

      if (ancestors.has(value)) return '[Circular]';
      ancestors.add(value);

      if (value instanceof Date) {
        ancestors.delete(value);
        return value.toISOString();
      }
      if (value instanceof Error) {
        const output: Record<string, unknown> = {};
        Object.defineProperties(output, {
          name: {
            value: value.name,
            enumerable: true,
            configurable: true,
            writable: true,
          },
          message: {
            value: redactString(value.message, secrets, replacement),
            enumerable: true,
            configurable: true,
            writable: true,
          },
        });
        ancestors.delete(value);
        return output;
      }
      if (Array.isArray(value)) {
        // Preserve length, holes, and enumerable data properties. Sparse arrays are
        // subsequently rejected by assertJsonValue instead of being silently
        // compacted or serialized as nulls.
        const output = new Array<unknown>(value.length);
        for (const key of Object.keys(value)) {
          const descriptor = Object.getOwnPropertyDescriptor(value, key);
          const item =
            descriptor !== undefined && 'value' in descriptor
              ? descriptor.value
              : replacement;
          Object.defineProperty(output, key, {
            value: visit(item, key, sensitive),
            enumerable: true,
            configurable: true,
            writable: true,
          });
        }
        ancestors.delete(value);
        return output;
      }

      const prototype =
        Object.getPrototypeOf(value) === null ? null : Object.prototype;
      const output = Object.create(prototype) as Record<string, unknown>;
      for (const key of Object.keys(value)) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        const item =
          descriptor !== undefined && 'value' in descriptor
            ? descriptor.value
            : replacement;
        // defineProperty avoids the legacy __proto__ setter and cannot mutate the
        // clone's prototype when an untrusted result contains a __proto__ key.
        Object.defineProperty(output, key, {
          value: visit(item, key, sensitive),
          enumerable: true,
          configurable: true,
          writable: true,
        });
      }
      ancestors.delete(value);
      return output;
    };

    return visit(input) as T;
  };
}

export function redact<T>(value: T, options?: RedactionOptions): T {
  return createRedactor(options)(value);
}
