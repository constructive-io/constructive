import { OAuthProfile,OAuthProviderConfig } from '../types';

function requireRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new TypeError('Invalid Google profile');
  return value as Record<string, unknown>;
}

function requireString(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.trim() !== value
  )
    throw new TypeError('Invalid Google profile');
  return value;
}

function optionalString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || (value && value.trim() !== value))
    throw new TypeError('Invalid Google profile');
  return value || null;
}

function optionalBoolean(value: unknown): boolean | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'boolean') throw new TypeError('Invalid Google profile');
  return value;
}

export const googleProvider: OAuthProviderConfig = {
  id: 'google',
  name: 'Google',
  authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
  scopes: ['openid', 'email', 'profile'],
  tokenEndpointAuthMethod: 'client_secret_post',
  tokenRequestContentType: 'form',
  mapProfile: (data: unknown): OAuthProfile => {
    const profile = requireRecord(data);
    return {
      provider: 'google',
      providerId: requireString(profile.sub),
      email: optionalString(profile.email),
      emailVerified: optionalBoolean(profile.email_verified),
      name: optionalString(profile.name),
      picture: optionalString(profile.picture),
    };
  },
};
