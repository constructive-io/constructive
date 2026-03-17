const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1']);

const parseBooleanEnv = (value: string | undefined, fallback: boolean): boolean => {
  if (value == null) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const normalizeHost = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('[')) {
    const closingIndex = trimmed.indexOf(']');
    return closingIndex === -1 ? trimmed : trimmed.slice(0, closingIndex + 1);
  }

  const colonCount = trimmed.split(':').length - 1;
  if (colonCount === 1) {
    return trimmed.split(':')[0] || null;
  }

  return trimmed;
};

const normalizeAddress = (value: string | null | undefined): string | null => {
  const normalized = normalizeHost(value);
  if (!normalized) {
    return null;
  }

  return normalized.startsWith('::ffff:') ? normalized.slice(7) : normalized;
};

export const isDevelopmentObservabilityMode = (): boolean => process.env.NODE_ENV === 'development';

export const isLoopbackHost = (value: string | null | undefined): boolean => {
  const normalized = normalizeHost(value);
  return normalized != null && LOOPBACK_HOSTS.has(normalized);
};

export const isLoopbackAddress = (value: string | null | undefined): boolean => {
  const normalized = normalizeAddress(value);
  return normalized != null && LOOPBACK_ADDRESSES.has(normalized);
};

export const isGraphqlObservabilityRequested = (): boolean =>
  parseBooleanEnv(process.env.GRAPHQL_OBSERVABILITY_ENABLED, false);

export const isGraphqlObservabilityEnabled = (serverHost?: string | null): boolean =>
  isDevelopmentObservabilityMode() &&
  isGraphqlObservabilityRequested() &&
  isLoopbackHost(serverHost);

export const isGraphqlDebugSamplerEnabled = (serverHost?: string | null): boolean =>
  isGraphqlObservabilityEnabled(serverHost) &&
  parseBooleanEnv(process.env.GRAPHQL_DEBUG_SAMPLER_ENABLED, true);
