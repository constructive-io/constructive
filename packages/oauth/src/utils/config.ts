import { createOAuthError } from '../types';

export function requireProviderConfigString(
  value: string | null | undefined,
  field: string,
  providerId: string
): string {
  if (!value) {
    throw createOAuthError(
      `Provider ${providerId} missing required config: ${field}`,
      'PROVIDER_CONFIG_INVALID',
      providerId
    );
  }
  return value;
}
