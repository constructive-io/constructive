import { OAuthProviderConfig, OAuthProfile } from '../types';

interface FacebookProfile {
  id: string;
  name?: string;
  email?: string;
  picture?: {
    data?: {
      url?: string;
    };
  };
}

const FACEBOOK_API_VERSION = 'v18.0';

export const facebookProvider: OAuthProviderConfig = {
  id: 'facebook',
  name: 'Facebook',
  authorizationUrl: `https://www.facebook.com/${FACEBOOK_API_VERSION}/dialog/oauth`,
  tokenUrl: `https://graph.facebook.com/${FACEBOOK_API_VERSION}/oauth/access_token`,
  userInfoUrl: `https://graph.facebook.com/me?fields=id,name,email,picture`,
  scopes: ['email', 'public_profile'],
  tokenRequestContentType: 'form',
  mapProfile: (data: unknown): OAuthProfile => {
    const profile = data as FacebookProfile;
    return {
      provider: 'facebook',
      providerId: profile.id,
      email: profile.email || null,
      name: profile.name || null,
      picture: profile.picture?.data?.url || null,
      raw: data,
    };
  },
};
