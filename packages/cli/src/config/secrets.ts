import type { EnvironmentMap } from './resolution';

export type TokenErrorCode = 'TOKEN_MISSING' | 'TOKEN_SOURCE_AMBIGUOUS';

export class TokenSourceError extends Error {
  readonly name = 'TokenSourceError';

  constructor(
    readonly code: TokenErrorCode,
    message: string
  ) {
    super(message);
  }
}

export interface ResolveTokenOptions {
  /** Explicitly supplied legacy/human token. */
  token?: string;
  /** Token read by the terminal adapter from stdin. */
  stdinToken?: string;
  env?: EnvironmentMap;
  required?: boolean;
}

export interface ResolvedToken {
  token: string;
  source: 'argument' | 'stdin' | 'environment';
}

/** Resolve a token without reading process.env or stdin in operation code. */
export function resolveToken(
  options: ResolveTokenOptions
): ResolvedToken | undefined {
  const candidates = [
    { source: 'argument' as const, value: options.token },
    { source: 'stdin' as const, value: options.stdinToken },
    { source: 'environment' as const, value: options.env?.CNC_TOKEN },
  ].filter((candidate) => candidate.value?.trim());

  if (candidates.length > 1) {
    throw new TokenSourceError(
      'TOKEN_SOURCE_AMBIGUOUS',
      'Provide a token through exactly one source: explicit input, stdin, or CNC_TOKEN.'
    );
  }
  const candidate = candidates[0];
  if (!candidate) {
    if (options.required !== false) {
      throw new TokenSourceError(
        'TOKEN_MISSING',
        'No token was provided. Use stdin or CNC_TOKEN in noninteractive mode.'
      );
    }
    return undefined;
  }
  return { token: candidate.value!.trim(), source: candidate.source };
}

export function maskToken(token: string): string {
  if (token.length <= 10) return '****';
  return `${token.slice(0, 6)}...${token.slice(-4)}`;
}

const SECRET_KEY =
  /(?:authorization|cookie|password|refresh[-_]?token|secret|token)/i;

/** Recursively redact likely secret fields before values enter logs or events. */
export function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
      key,
      SECRET_KEY.test(key) ? '[REDACTED]' : redactSecrets(nested),
    ])
  );
}
