import { OAuthProviderConfig, OAuthProfile } from '../types';

interface GoogleProfile {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

export const googleProvider: OAuthProviderConfig = {
  id: 'google',
  name: 'Google',
  authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
  scopes: ['openid', 'email', 'profile'],
  tokenRequestContentType: 'form',
  mapProfile: (data: unknown): OAuthProfile => {
    const profile = data as GoogleProfile;
    return {
      provider: 'google',
      providerId: profile.sub,
      email: profile.email || null,
      name: profile.name || null,
      picture: profile.picture || null,
      raw: data,
    };
  },
};
