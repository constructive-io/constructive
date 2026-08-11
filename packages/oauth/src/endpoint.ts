import { isIP } from 'net';

import { ProviderAdapterError, type ValidatedEndpoint } from './types';

const isUnsafeIpv4 = (hostname: string): boolean => {
  const octets = hostname.split('.').map(Number);
  if (octets.length !== 4 || octets.some(value => !Number.isInteger(value))) {
    return true;
  }
  const [a, b] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
};

const isUnsafeIpv6 = (hostname: string): boolean => {
  const value = hostname.toLowerCase();
  return (
    value === '::' ||
    value === '::1' ||
    value.startsWith('fc') ||
    value.startsWith('fd') ||
    /^fe[89ab]/.test(value) ||
    value.startsWith('ff')
  );
};

const isUnsafeHostname = (hostname: string): boolean => {
  const normalized = hostname
    .toLowerCase()
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .replace(/\.$/, '');
  if (normalized === 'localhost' || normalized.endsWith('.localhost')) {
    return true;
  }
  const family = isIP(normalized);
  return family === 4
    ? isUnsafeIpv4(normalized)
    : family === 6
      ? isUnsafeIpv6(normalized)
      : false;
};

const canonicalEndpoint = (value: string): string => {
  let url: URL;
  try {
    url = new URL(value);
  } catch (cause) {
    throw new ProviderAdapterError(
      'INVALID_CONFIGURATION',
      'The Provider endpoint is not a valid URL.',
      { cause }
    );
  }

  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    isUnsafeHostname(url.hostname)
  ) {
    throw new ProviderAdapterError(
      'INVALID_CONFIGURATION',
      'The Provider endpoint is not an approved HTTPS URL.'
    );
  }
  return url.toString();
};

/** Validate one configured endpoint against a concrete adapter's exact list. */
export const validateProviderEndpoint = (
  value: string | null | undefined,
  allowed: readonly string[]
): ValidatedEndpoint => {
  if (!value) {
    throw new ProviderAdapterError(
      'INVALID_CONFIGURATION',
      'A required Provider endpoint is not configured.'
    );
  }
  const endpoint = canonicalEndpoint(value);
  const allowlist = allowed.map(canonicalEndpoint);
  if (!allowlist.includes(endpoint)) {
    throw new ProviderAdapterError(
      'INVALID_CONFIGURATION',
      'The configured Provider endpoint is not supported.'
    );
  }
  return endpoint as ValidatedEndpoint;
};
