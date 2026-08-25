const SENSITIVE_QUERY_KEY_PARTS = new Set([
  'auth',
  'authorization',
  'bearer',
  'cookie',
  'credential',
  'credentials',
  'jwt',
  'passwd',
  'password',
  'secret',
  'session',
  'signature',
  'token',
]);

const isSensitiveQueryKey = (key: string): boolean => {
  const separated = key
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const compact = separated.join('');
  return (
    separated.some((part) => SENSITIVE_QUERY_KEY_PARTS.has(part)) ||
    compact.includes('apikey') ||
    compact.includes('privatekey') ||
    compact.includes('signingkey') ||
    compact === 'key' ||
    compact === 'sig'
  );
};

export interface HttpEndpointInspection {
  reason?: 'invalid-url' | 'unsafe';
  sensitiveValues: string[];
}

/** Inspect an HTTP endpoint once so all CNC adapters enforce one URL policy. */
export const inspectHttpEndpoint = (
  endpoint: string
): HttpEndpointInspection => {
  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    return { reason: 'invalid-url', sensitiveValues: [] };
  }

  const sensitiveQueryValues = [...parsed.searchParams]
    .filter(([key]) => isSensitiveQueryKey(key))
    .map(([, value]) => value)
    .filter(Boolean);
  const sensitiveValues = [
    parsed.username,
    parsed.password,
    ...sensitiveQueryValues,
  ].filter(Boolean);
  const safe =
    endpoint.trim() === endpoint &&
    (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
    parsed.username === '' &&
    parsed.password === '' &&
    parsed.hash === '' &&
    sensitiveQueryValues.length === 0;
  return {
    ...(safe ? {} : { reason: 'unsafe' as const }),
    sensitiveValues,
  };
};
