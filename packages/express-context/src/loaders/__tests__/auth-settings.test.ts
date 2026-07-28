import type { Pool } from 'pg';

import { authSettingsLoader } from '../auth-settings';
import type { LoaderContext } from '../types';

function createContext(
  query: jest.Mock,
  databaseId = 'hub-database-id'
): LoaderContext {
  const tenantPool = { query } as unknown as Pool;

  return {
    routingPool: { query: jest.fn() } as unknown as Pool,
    tenantPool,
    databaseId,
    dbname: 'constructive'
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
            table_name: 'app_settings_auth'
          }
        ]
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
            oauth_error_redirect_path: '/auth/error'
          }
        ]
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
      oauthErrorRedirectPath: '/auth/error'
    });
  });

  it('returns undefined when the sessions module is not provisioned', async () => {
    const query = jest.fn().mockResolvedValueOnce({ rows: [] });

    await expect(
      authSettingsLoader.resolve(createContext(query, 'unprovisioned-db'))
    ).resolves.toBeUndefined();
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('sm.database_id = $1'),
      ['unprovisioned-db']
    );
  });

  it('fails clearly when resolved table metadata is incomplete', async () => {
    const query = jest.fn().mockResolvedValueOnce({
      rows: [{ schema_name: null, table_name: 'app_settings_auth' }]
    });

    await expect(
      authSettingsLoader.resolve(createContext(query, 'invalid-metadata-db'))
    ).rejects.toThrow(
      'invalid auth settings table metadata for database invalid-metadata-db'
    );
    expect(query).toHaveBeenCalledTimes(1);
  });
});
