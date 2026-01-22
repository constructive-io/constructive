import { OAuthProviderConfig, OAuthProfile } from '../types';

interface LinkedInProfile {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

export const linkedinProvider: OAuthProviderConfig = {
  id: 'linkedin',
  name: 'LinkedIn',
  authorizationUrl: 'https://www.linkedin.com/oauth/v2/authorization',
  tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
  userInfoUrl: 'https://api.linkedin.com/v2/userinfo',
  scopes: ['openid', 'profile', 'email'],
  tokenRequestContentType: 'form',
  mapProfile: (data: unknown): OAuthProfile => {
    const profile = data as LinkedInProfile;
    return {
      provider: 'linkedin',
      providerId: profile.sub,
      email: profile.email || null,
      name: profile.name || null,
      picture: profile.picture || null,
      raw: data,
    };
  },
};
