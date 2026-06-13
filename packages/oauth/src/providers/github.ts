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
      emailVerified: false, // GitHub requires separate /user/emails call for verification status
      name: profile.name || profile.login || null,
      picture: profile.avatar_url || null,
      raw: data,
    };
  },
};

export const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails';

export interface ExtractedEmail {
  email: string;
  verified: boolean;
}

export function extractPrimaryEmail(emails: GitHubEmail[]): ExtractedEmail | null {
  const primary = emails.find((e) => e.primary && e.verified);
  if (primary) return { email: primary.email, verified: true };
  const verified = emails.find((e) => e.verified);
  if (verified) return { email: verified.email, verified: true };
  if (emails[0]) return { email: emails[0].email, verified: emails[0].verified };
  return null;
}
