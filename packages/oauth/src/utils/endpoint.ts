import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

import { errors } from '@constructive-io/errors';

const DNS_VALIDATION_EXEMPT_HOSTS = new Set([
  'accounts.google.com',
  'oauth2.googleapis.com',
  'openidconnect.googleapis.com',
  'github.com',
  'api.github.com',
  'www.facebook.com',
  'graph.facebook.com',
  'www.linkedin.com',
  'api.linkedin.com',
]);

function normalizeHostname(hostname: string): string {
  return hostname.replace(/^\[|\]$/g, '').toLowerCase();
}

function isNonPublicIpv4(address: string): boolean {
  const octets = address.split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet)))
    return true;
  const [a, b, c] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function isNonPublicIp(address: string): boolean {
  const normalized = normalizeHostname(address);
  if (isIP(normalized) === 4) return isNonPublicIpv4(normalized);
  if (isIP(normalized) !== 6) return false;

  const lower = normalized.toLowerCase();
  const mappedIpv4 = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mappedIpv4) return isNonPublicIpv4(mappedIpv4);
  return (
    lower === '::' ||
    lower === '::1' ||
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    /^fe[89ab]/.test(lower) ||
    lower.startsWith('ff') ||
    lower.startsWith('2001:db8:')
  );
}

/** Validate the provider-owned endpoint shape without exposing its value. */
export function assertSafeOAuthEndpoint(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch (cause) {
    throw errors.IDENTITY_PROVIDER_NOT_CONFIGURED(undefined, undefined, cause);
  }
  const hostname = normalizeHostname(url.hostname);
  if (
    url.protocol !== 'https:' ||
    !hostname ||
    url.username ||
    url.password ||
    url.hash ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    (isIP(hostname) > 0 && isNonPublicIp(hostname))
  ) {
    throw errors.IDENTITY_PROVIDER_NOT_CONFIGURED({});
  }
  return url;
}

/**
 * Resolve non-standard provider hosts before server-side requests and reject
 * any address that reaches a loopback, private, link-local, or reserved range.
 */
export async function assertSafeOAuthFetchEndpoint(value: string): Promise<void> {
  const url = assertSafeOAuthEndpoint(value);
  const hostname = normalizeHostname(url.hostname);
  if (
    isIP(hostname) > 0 ||
    DNS_VALIDATION_EXEMPT_HOSTS.has(hostname)
  ) {
    return;
  }

  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch (cause) {
    throw errors.IDENTITY_PROVIDER_NOT_CONFIGURED({}, undefined, cause);
  }
  if (
    addresses.length === 0 ||
    addresses.some(({ address }) => isNonPublicIp(address))
  ) {
    throw errors.IDENTITY_PROVIDER_NOT_CONFIGURED({});
  }
}
