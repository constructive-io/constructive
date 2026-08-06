import { OAuthProfile,OAuthProviderConfig } from '../types';

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new TypeError('Invalid GitHub profile');
  return value as Record<string, unknown>;
}

function requireString(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.trim() !== value
  )
    throw new TypeError('Invalid GitHub profile');
  return value;
}

function optionalString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || (value && value.trim() !== value))
    throw new TypeError('Invalid GitHub profile');
  return value || null;
}

export const githubProvider: OAuthProviderConfig = {
  id: 'github',
  name: 'GitHub',
  authorizationUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  userInfoUrl: 'https://api.github.com/user',
  scopes: ['user:email', 'read:user'],
  tokenEndpointAuthMethod: 'client_secret_post',
  tokenRequestContentType: 'json',
  mapProfile: (data: unknown): OAuthProfile => {
    const profile = requireRecord(data);
    if (
      typeof profile.id !== 'number' ||
      !Number.isSafeInteger(profile.id) ||
      profile.id <= 0
    ) {
      throw new TypeError('Invalid GitHub profile');
    }
    const login = requireString(profile.login);
    return {
      provider: 'github',
      providerId: String(profile.id),
      email: optionalString(profile.email),
      emailVerified: null,
      name: optionalString(profile.name) ?? login,
      picture: optionalString(profile.avatar_url),
    };
  },
};

export const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails';

export function selectGitHubEmail(emails: unknown[]): GitHubEmail | null {
  const valid = emails.filter((entry): entry is GitHubEmail => {
    if (typeof entry !== 'object' || entry === null) return false;
    const candidate = entry as Record<string, unknown>;
    return (
      typeof candidate.email === 'string' &&
      Boolean(candidate.email.trim()) &&
      typeof candidate.primary === 'boolean' &&
      typeof candidate.verified === 'boolean'
    );
  });
  return (
    valid.find((email) => email.primary) ??
    valid.find((email) => email.verified) ??
    valid[0] ??
    null
  );
}
