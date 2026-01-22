import { OAuthProviderConfig, OAuthProfile } from '../types';

interface GitHubProfile {
  id: number;
  login: string;
  name?: string;
  email?: string;
  avatar_url?: string;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

export const githubProvider: OAuthProviderConfig = {
  id: 'github',
  name: 'GitHub',
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
      raw: data,
    };
  },
};

export const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails';

export function extractPrimaryEmail(emails: GitHubEmail[]): string | null {
  const primary = emails.find((e) => e.primary && e.verified);
  if (primary) return primary.email;
  const verified = emails.find((e) => e.verified);
  if (verified) return verified.email;
  return emails[0]?.email || null;
}
