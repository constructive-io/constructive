import { OAuthClient, createOAuthClient } from '../src/oauth-client';
import { getProvider, getProviderIds } from '../src/providers';
import { generateState, verifyState } from '../src/utils/state';

describe('OAuthClient', () => {
  const config = {
    providers: {
      google: {
        clientId: 'test-google-client-id',
        clientSecret: 'test-google-client-secret',
      },
      github: {
        clientId: 'test-github-client-id',
        clientSecret: 'test-github-client-secret',
      },
    },
    baseUrl: 'https://api.example.com',
  };

  describe('getAuthorizationUrl', () => {
    it('should generate authorization URL for Google', () => {
      const client = createOAuthClient(config);
      const { url, state } = client.getAuthorizationUrl({ provider: 'google' });

      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('client_id=test-google-client-id');
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=openid+email+profile');
      expect(url).toContain(`state=${state}`);
      expect(state).toHaveLength(64);
    });

    it('should generate authorization URL for GitHub', () => {
      const client = createOAuthClient(config);
      const { url, state } = client.getAuthorizationUrl({ provider: 'github' });

      expect(url).toContain('https://github.com/login/oauth/authorize');
      expect(url).toContain('client_id=test-github-client-id');
      expect(url).toContain('scope=user%3Aemail+read%3Auser');
      expect(state).toHaveLength(64);
    });

    it('should use custom state when provided', () => {
      const client = createOAuthClient(config);
      const customState = 'my-custom-state-123';
      const { url, state } = client.getAuthorizationUrl({
        provider: 'google',
        state: customState,
      });

      expect(state).toBe(customState);
      expect(url).toContain(`state=${customState}`);
    });

    it('should use custom redirect URI when provided', () => {
      const client = createOAuthClient(config);
      const customRedirectUri = 'https://custom.example.com/callback';
      const { url } = client.getAuthorizationUrl({
        provider: 'google',
        redirectUri: customRedirectUri,
      });

      expect(url).toContain(`redirect_uri=${encodeURIComponent(customRedirectUri)}`);
    });

    it('should use custom scopes when provided', () => {
      const client = createOAuthClient(config);
      const { url } = client.getAuthorizationUrl({
        provider: 'google',
        scopes: ['email'],
      });

      expect(url).toContain('scope=email');
      expect(url).not.toContain('profile');
    });

    it('should throw error for unknown provider', () => {
      const client = createOAuthClient(config);

      expect(() => {
        client.getAuthorizationUrl({ provider: 'unknown' });
      }).toThrow('Unknown provider: unknown');
    });

    it('should throw error for unconfigured provider', () => {
      const client = createOAuthClient(config);

      expect(() => {
        client.getAuthorizationUrl({ provider: 'facebook' });
      }).toThrow('No credentials configured for provider: facebook');
    });
  });

  describe('getConfig', () => {
    it('should return config with defaults', () => {
      const client = createOAuthClient(config);
      const returnedConfig = client.getConfig();

      expect(returnedConfig.callbackPath).toBe('/auth/{provider}/callback');
      expect(returnedConfig.stateCookieName).toBe('oauth_state');
      expect(returnedConfig.stateCookieMaxAge).toBe(600);
    });

    it('should allow overriding defaults', () => {
      const client = createOAuthClient({
        ...config,
        callbackPath: '/custom/callback/{provider}',
        stateCookieName: 'custom_state',
        stateCookieMaxAge: 300,
      });
      const returnedConfig = client.getConfig();

      expect(returnedConfig.callbackPath).toBe('/custom/callback/{provider}');
      expect(returnedConfig.stateCookieName).toBe('custom_state');
      expect(returnedConfig.stateCookieMaxAge).toBe(300);
    });
  });
});

describe('providers', () => {
  it('should have all expected providers', () => {
    const ids = getProviderIds();
    expect(ids).toContain('google');
    expect(ids).toContain('github');
    expect(ids).toContain('facebook');
    expect(ids).toContain('linkedin');
  });

  it('should return provider config by id', () => {
    const google = getProvider('google');
    expect(google).toBeDefined();
    expect(google!.id).toBe('google');
    expect(google!.name).toBe('Google');
    expect(google!.authorizationUrl).toBe('https://accounts.google.com/o/oauth2/v2/auth');
  });

  it('should return undefined for unknown provider', () => {
    const unknown = getProvider('unknown');
    expect(unknown).toBeUndefined();
  });
});

describe('state utilities', () => {
  describe('generateState', () => {
    it('should generate random state of default length', () => {
      const state = generateState();
      expect(state).toHaveLength(64);
    });

    it('should generate random state of custom length', () => {
      const state = generateState(16);
      expect(state).toHaveLength(32);
    });

    it('should generate unique states', () => {
      const state1 = generateState();
      const state2 = generateState();
      expect(state1).not.toBe(state2);
    });
  });

  describe('verifyState', () => {
    it('should return true for matching states', () => {
      const state = generateState();
      expect(verifyState(state, state)).toBe(true);
    });

    it('should return false for non-matching states', () => {
      const state1 = generateState();
      const state2 = generateState();
      expect(verifyState(state1, state2)).toBe(false);
    });

    it('should return false for undefined expected state', () => {
      expect(verifyState(undefined, 'some-state')).toBe(false);
    });

    it('should return false for undefined actual state', () => {
      expect(verifyState('some-state', undefined)).toBe(false);
    });

    it('should return false for different length states', () => {
      expect(verifyState('short', 'much-longer-state')).toBe(false);
    });
  });
});

describe('provider profile mapping', () => {
  it('should map Google profile correctly', () => {
    const google = getProvider('google')!;
    const profile = google.mapProfile({
      sub: '123456789',
      email: 'test@gmail.com',
      name: 'Test User',
      picture: 'https://example.com/photo.jpg',
    });

    expect(profile.provider).toBe('google');
    expect(profile.providerId).toBe('123456789');
    expect(profile.email).toBe('test@gmail.com');
    expect(profile.name).toBe('Test User');
    expect(profile.picture).toBe('https://example.com/photo.jpg');
  });

  it('should map GitHub profile correctly', () => {
    const github = getProvider('github')!;
    const profile = github.mapProfile({
      id: 12345,
      login: 'testuser',
      name: 'Test User',
      email: 'test@github.com',
      avatar_url: 'https://avatars.githubusercontent.com/u/12345',
    });

    expect(profile.provider).toBe('github');
    expect(profile.providerId).toBe('12345');
    expect(profile.email).toBe('test@github.com');
    expect(profile.name).toBe('Test User');
    expect(profile.picture).toBe('https://avatars.githubusercontent.com/u/12345');
  });

  it('should map Facebook profile correctly', () => {
    const facebook = getProvider('facebook')!;
    const profile = facebook.mapProfile({
      id: '987654321',
      name: 'Test User',
      email: 'test@facebook.com',
      picture: { data: { url: 'https://example.com/fb-photo.jpg' } },
    });

    expect(profile.provider).toBe('facebook');
    expect(profile.providerId).toBe('987654321');
    expect(profile.email).toBe('test@facebook.com');
    expect(profile.name).toBe('Test User');
    expect(profile.picture).toBe('https://example.com/fb-photo.jpg');
  });

  it('should map LinkedIn profile correctly', () => {
    const linkedin = getProvider('linkedin')!;
    const profile = linkedin.mapProfile({
      sub: 'linkedin-123',
      email: 'test@linkedin.com',
      name: 'Test User',
      picture: 'https://example.com/li-photo.jpg',
    });

    expect(profile.provider).toBe('linkedin');
    expect(profile.providerId).toBe('linkedin-123');
    expect(profile.email).toBe('test@linkedin.com');
    expect(profile.name).toBe('Test User');
    expect(profile.picture).toBe('https://example.com/li-photo.jpg');
  });

  it('should handle missing optional fields', () => {
    const google = getProvider('google')!;
    const profile = google.mapProfile({
      sub: '123456789',
    });

    expect(profile.provider).toBe('google');
    expect(profile.providerId).toBe('123456789');
    expect(profile.email).toBeNull();
    expect(profile.name).toBeNull();
    expect(profile.picture).toBeNull();
  });
});
