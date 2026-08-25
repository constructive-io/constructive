import { Buffer } from 'node:buffer';

/** Receives a sensitive value discovered while resolving codegen input. */
export type SensitiveValueReporter = (value: string) => void;

const SENSITIVE_KEY =
  /(?:authorization|cookie|credentials?|password|passwd|secret|session|token|api(?:access)?key|privatekey|signingkey|accesskey|connectionstring|dsn)$/i;

const SENSITIVE_ENDPOINT_QUERY_PARTS = new Set([
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

const normalizedKey = (key: string): string =>
  key.replace(/[^a-z0-9]/gi, '').toLowerCase();

const isSensitiveKey = (key: string): boolean =>
  SENSITIVE_KEY.test(normalizedKey(key));

const isSensitiveEndpointQueryKey = (key: string): boolean => {
  const separated = key
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const compact = separated.join('');
  return (
    separated.some((part) => SENSITIVE_ENDPOINT_QUERY_PARTS.has(part)) ||
    compact.includes('apikey') ||
    compact.includes('privatekey') ||
    compact.includes('signingkey') ||
    compact === 'key' ||
    compact === 'sig'
  );
};

const parseUrl = (value: string): URL | undefined => {
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
};

const decodeUrlComponent = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const looksLikePostgresUrl = (value: string): boolean =>
  /^postgres(?:ql)?:\/\//i.test(value);

/** Whether an endpoint satisfies CNC's strict executable-transport policy. */
export const isSafeCodegenEndpoint = (endpoint: string): boolean => {
  const parsed = parseUrl(endpoint);
  return (
    parsed !== undefined &&
    endpoint.trim() === endpoint &&
    (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
    parsed.username === '' &&
    parsed.password === '' &&
    parsed.hash === '' &&
    ![...parsed.searchParams.keys()].some(isSensitiveEndpointQueryKey)
  );
};

const reportUrlSecrets = (
  value: string,
  report: (value: string) => void,
  options: { alwaysSensitive?: boolean } = {}
): void => {
  const parsed = parseUrl(value);
  if (parsed === undefined) {
    if (options.alwaysSensitive) report(value);
    return;
  }

  const hasPrivateProjection =
    parsed.username !== '' ||
    parsed.password !== '' ||
    parsed.search !== '' ||
    parsed.hash !== '';
  if (options.alwaysSensitive || hasPrivateProjection) report(value);

  const decodedUsername = decodeUrlComponent(parsed.username);
  const decodedPassword = decodeUrlComponent(parsed.password);
  report(parsed.username);
  report(parsed.password);
  report(decodedUsername);
  report(decodedPassword);
  if (parsed.username !== '' || parsed.password !== '') {
    report(`${parsed.username}:${parsed.password}`);
    const decodedCredentials = `${decodedUsername}:${decodedPassword}`;
    report(decodedCredentials);
    report(`Basic ${Buffer.from(decodedCredentials).toString('base64')}`);
  }
  report(parsed.search);
  report(parsed.search.slice(1));
  for (const [, queryValue] of parsed.searchParams) report(queryValue);
  for (const parameter of parsed.search.slice(1).split('&')) {
    const separator = parameter.indexOf('=');
    if (separator >= 0) report(parameter.slice(separator + 1));
  }
  report(parsed.hash);
  report(parsed.hash.slice(1));
};

/**
 * Discover secrets after codegen has resolved CLI and file configuration.
 *
 * Header values are sensitive regardless of their names. Other nested values
 * are collected when their key is credential-bearing, and PostgreSQL URLs are
 * always treated as credentials because they commonly embed a password.
 */
export function reportConfigSensitiveValues(
  config: unknown,
  reporter: SensitiveValueReporter | undefined
): void {
  if (reporter === undefined || config === null) return;

  const reported = new Set<string>();
  const seen = new WeakSet<object>();
  const report = (value: string): void => {
    if (value.length === 0 || reported.has(value)) return;
    reported.add(value);
    reporter(value);
  };

  const visit = (
    value: unknown,
    parentKey: string | undefined,
    inheritedSensitive: boolean
  ): void => {
    const key = parentKey === undefined ? '' : normalizedKey(parentKey);
    const sensitive =
      inheritedSensitive ||
      (parentKey !== undefined &&
        (isSensitiveKey(parentKey) || key === 'headers'));

    if (typeof value === 'string') {
      if (sensitive) {
        report(value);
        report(value.trim());
      }
      if (key === 'authorization') {
        const separator = value.indexOf(' ');
        if (separator > 0 && separator < value.length - 1) {
          report(value.slice(separator + 1));
        }
      }
      if (key === 'cookie') {
        for (const pair of value.split(';')) {
          const trimmed = pair.trim();
          report(trimmed);
          const separator = trimmed.indexOf('=');
          if (separator >= 0) report(trimmed.slice(separator + 1));
        }
      }
      if (key === 'endpoint') reportUrlSecrets(value, report);
      if (looksLikePostgresUrl(value)) {
        reportUrlSecrets(value, report, { alwaysSensitive: true });
      }
      return;
    }
    if (typeof value === 'number') {
      if (sensitive && Number.isFinite(value)) report(String(value));
      return;
    }
    if (value === null || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);

    for (const childKey of Object.keys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, childKey);
      if (descriptor !== undefined && 'value' in descriptor) {
        visit(descriptor.value, childKey, sensitive);
      }
    }
  };

  visit(config, undefined, false);
}

const projectUrlForDisplay = (
  value: string,
  protocols: readonly string[],
  fallback: string
): string => {
  const parsed = parseUrl(value);
  if (parsed === undefined || !protocols.includes(parsed.protocol)) {
    return fallback;
  }
  parsed.username = '';
  parsed.password = '';
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString();
};

/** Return an endpoint URL that is safe to include in events and errors. */
export const endpointForDisplay = (endpoint: string): string =>
  projectUrlForDisplay(
    endpoint,
    ['http:', 'https:'],
    '<invalid HTTP endpoint>'
  );

/** Return a database name or sanitized PostgreSQL URL for diagnostics. */
export const databaseForDisplay = (database: string): string =>
  looksLikePostgresUrl(database)
    ? projectUrlForDisplay(
        database,
        ['postgres:', 'postgresql:'],
        '<PostgreSQL connection>'
      )
    : database;
