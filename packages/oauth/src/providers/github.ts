import { OAuthProviderConfig, OAuthProfile } from '../types';

interface GitHubProfile {
  id: number;
  login: string;
  name?: string;
  email?: string;
  avatar_url?: string;
}

export interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

export const githubProvider: OAuthProviderConfig = {
  id: 'github',
  name: 'GitHub',
  kind: 'oauth2',
  authorizationUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  userInfoUrl: 'https://api.github.com/user',
  scopes: ['user:email', 'read:user'],
  tokenRequestContentType: 'json',
  mapProfile: (data: unknown): OAuthProfile => {
    const profile = data as GitHubProfile;
    return {
      provider: 'github',
      providerId: String(profile.id),
      email: profile.email || null,
      name: profile.name || profile.login || null,
      picture: profile.avatar_url || null,
      emailVerified: null, // GitHub requires separate /user/emails API call
      raw: data,
    };
  },
};

export const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails';

export function selectGitHubEmail(
  emails: GitHubEmail[],
  preferredEmail?: string | null
): GitHubEmail | null {
  if (preferredEmail) {
    const preferred = emails.find((e) => e.email === preferredEmail);
    if (preferred) return preferred;
  }

  const primary = emails.find((e) => e.primary && e.verified);
  if (primary) return primary;
  const verified = emails.find((e) => e.verified);
  if (verified) return verified;
  const primaryUnverified = emails.find((e) => e.primary);
  if (primaryUnverified) return primaryUnverified;
  return emails[0] || null;
}

export function extractPrimaryEmail(emails: GitHubEmail[]): string | null {
  return selectGitHubEmail(emails)?.email || null;
}
