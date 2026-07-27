import type { Pool } from 'pg';

import { authSettingsLoader } from '../auth-settings';
import type { LoaderContext } from '../types';

function createContext(query: jest.Mock): LoaderContext {
  const tenantPool = { query } as unknown as Pool;

  return {
    servicesPool: { query: jest.fn() } as unknown as Pool,
    tenantPool,
    databaseId: 'hub-database-id',
    dbname: 'constructive',
  };
}

describe('authSettingsLoader', () => {
  afterEach(() => {
    authSettingsLoader.invalidate();
  });

  it('discovers auth settings through the stable table id contract', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            schema_name: 'constructive_auth_private',
            table_name: 'app_settings_auth',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            allow_identity_sign_in: true,
            allow_identity_sign_up: true,
            cookie_secure: false,
            cookie_samesite: 'lax',
            cookie_domain: null,
            cookie_httponly: true,
            cookie_max_age: { days: 30 },
            cookie_path: '/',
            remember_me_duration: { days: 30 },
            enable_captcha: false,
            captcha_site_key: null,
            oauth_state_max_age: { minutes: 10 },
            oauth_require_verified_email: true,
            oauth_error_redirect_path: '/auth/error',
          },
        ],
      });

    const config = await authSettingsLoader.resolve(createContext(query));

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('sm.auth_settings_table_id'),
      ['hub-database-id']
    );
    expect(query.mock.calls[0][0]).toContain('metaschema.schema_and_table');
    expect(query.mock.calls[0][0]).not.toContain('sm.auth_settings_table_name');
    expect(query.mock.calls[0][0]).not.toContain('sm.auth_settings_table AS');
    expect(query.mock.calls[1][0]).toContain(
      'constructive_auth_private.app_settings_auth'
    );
    expect(config).toMatchObject({
      allowIdentitySignIn: true,
      allowIdentitySignUp: true,
      cookieSecure: false,
      cookieSamesite: 'lax',
      oauthRequireVerifiedEmail: true,
      oauthErrorRedirectPath: '/auth/error',
    });
  });
});
