import type { Pool } from 'pg';

import { authSettingsLoader } from '../loaders/auth-settings';
import { corsLoader } from '../loaders/cors';
import { databaseSettingsLoader } from '../loaders/database-settings';
import { pubkeyLoader } from '../loaders/pubkey';
import { rlsLoader } from '../loaders/rls';
import type { LoaderContext } from '../loaders/types';
import { webauthnLoader } from '../loaders/webauthn';

const loaderContext = (
  routingPool: Pool,
  tenantPool: Pool
): LoaderContext => ({
  routingPool,
  routingPoolIdentity: 'routing:security-test',
  routingSchema: 'routing_public',
  tenantPool,
  tenantPoolIdentity: 'tenant:security-test',
  databaseId: 'database-123',
  apiId: 'api-123',
  dbname: 'tenant_database'
});

describe('security-sensitive module freshness', () => {
  afterEach(() => {
    rlsLoader.invalidate();
    authSettingsLoader.invalidate();
    corsLoader.invalidate();
    databaseSettingsLoader.invalidate();
    pubkeyLoader.invalidate();
    webauthnLoader.invalidate();
  });

  it('reads RLS authentication routing authoritatively on every request', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce({ rows: [{
        authenticate: 'authenticate_v1',
        authenticate_strict: 'authenticate_strict_v1',
        authenticate_schema: 'auth_private',
        role_schema: 'auth_public',
        current_role: 'current_role',
        current_role_id: 'current_role_id',
        current_ip_address: 'current_ip_address',
        current_user_agent: 'current_user_agent'
      }] })
      .mockResolvedValueOnce({ rows: [{
        authenticate: 'authenticate_v2',
        authenticate_strict: 'authenticate_strict_v2',
        authenticate_schema: 'auth_private',
        role_schema: 'auth_public',
        current_role: 'current_role',
        current_role_id: 'current_role_id',
        current_ip_address: 'current_ip_address',
        current_user_agent: 'current_user_agent'
      }] });
    const routingPool = { query } as unknown as Pool;
    const ctx = loaderContext(routingPool, {} as Pool);

    await expect(rlsLoader.resolve(ctx)).resolves.toMatchObject({
      authenticate: 'authenticate_v1'
    });
    await expect(rlsLoader.resolve(ctx)).resolves.toMatchObject({
      authenticate: 'authenticate_v2'
    });

    expect(query).toHaveBeenCalledTimes(2);
    expect(rlsLoader.cacheSize).toBe(0);
  });

  it('reads cookie and CAPTCHA policy authoritatively on every request', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce({
        rows: [{ schema_name: 'sessions_private', table_name: 'auth_settings' }]
      })
      .mockResolvedValueOnce({ rows: [{
        cookie_secure: true,
        cookie_samesite: 'lax',
        cookie_domain: null,
        cookie_httponly: true,
        cookie_max_age: '3600',
        cookie_path: '/',
        remember_me_duration: '86400',
        enable_captcha: false,
        captcha_site_key: null
      }] })
      .mockResolvedValueOnce({
        rows: [{ schema_name: 'sessions_private', table_name: 'auth_settings' }]
      })
      .mockResolvedValueOnce({ rows: [{
        cookie_secure: true,
        cookie_samesite: 'strict',
        cookie_domain: null,
        cookie_httponly: true,
        cookie_max_age: '1800',
        cookie_path: '/',
        remember_me_duration: '43200',
        enable_captcha: true,
        captcha_site_key: 'site-key-v2'
      }] });
    const tenantPool = { query } as unknown as Pool;
    const ctx = loaderContext({} as Pool, tenantPool);

    await expect(authSettingsLoader.resolve(ctx)).resolves.toMatchObject({
      cookieSamesite: 'lax',
      enableCaptcha: false
    });
    await expect(authSettingsLoader.resolve(ctx)).resolves.toMatchObject({
      cookieSamesite: 'strict',
      enableCaptcha: true
    });

    expect(query).toHaveBeenCalledTimes(4);
    expect(authSettingsLoader.cacheSize).toBe(0);
  });

  it('does not retain revoked CORS policy', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce({ rows: [{ allowed_origins: ['https://old.example'] }] })
      .mockResolvedValueOnce({ rows: [{ allowed_origins: [] }] });
    const ctx = loaderContext({ query } as unknown as Pool, {} as Pool);

    await expect(corsLoader.resolve(ctx)).resolves.toEqual(['https://old.example']);
    await expect(corsLoader.resolve(ctx)).resolves.toEqual([]);

    expect(query).toHaveBeenCalledTimes(2);
    expect(corsLoader.cacheSize).toBe(0);
  });

  it('does not retain a revoked Graphile/realtime feature surface', async () => {
    const settings = (enabled: boolean) => ({
      resolved_enable_aggregates: enabled,
      resolved_enable_postgis: enabled,
      resolved_enable_search: enabled,
      resolved_enable_direct_uploads: enabled,
      resolved_enable_presigned_uploads: enabled,
      resolved_enable_many_to_many: enabled,
      resolved_enable_connection_filter: enabled,
      resolved_enable_ltree: enabled,
      resolved_enable_llm: enabled,
      resolved_enable_realtime: enabled,
      resolved_enable_bulk: enabled,
      resolved_enable_i18n: enabled
    });
    const query = jest.fn()
      .mockResolvedValueOnce({ rows: [settings(true)] })
      .mockResolvedValueOnce({ rows: [settings(false)] });
    const ctx = loaderContext({ query } as unknown as Pool, {} as Pool);

    await expect(databaseSettingsLoader.resolve(ctx)).resolves.toMatchObject({
      enableRealtime: true,
      enableSearch: true
    });
    await expect(databaseSettingsLoader.resolve(ctx)).resolves.toMatchObject({
      enableRealtime: false,
      enableSearch: false
    });

    expect(query).toHaveBeenCalledTimes(2);
    expect(databaseSettingsLoader.cacheSize).toBe(0);
  });

  it('rejects ambiguous or incomplete Graphile feature contracts', async () => {
    const settings = {
      resolved_enable_aggregates: false,
      resolved_enable_postgis: false,
      resolved_enable_search: false,
      resolved_enable_direct_uploads: false,
      resolved_enable_presigned_uploads: false,
      resolved_enable_many_to_many: false,
      resolved_enable_connection_filter: false,
      resolved_enable_ltree: false,
      resolved_enable_llm: false,
      resolved_enable_realtime: false,
      resolved_enable_bulk: false,
      resolved_enable_i18n: false
    };
    const ambiguous = loaderContext({
      query: jest.fn().mockResolvedValue({ rows: [settings, settings] })
    } as unknown as Pool, {} as Pool);
    const incomplete = loaderContext({
      query: jest.fn().mockResolvedValue({
        rows: [{ ...settings, resolved_enable_search: null }]
      })
    } as unknown as Pool, {} as Pool);

    await expect(databaseSettingsLoader.resolve(ambiguous))
      .rejects.toThrow('Ambiguous database feature configuration');
    await expect(databaseSettingsLoader.resolve(incomplete))
      .rejects.toThrow('Incomplete database feature configuration');
  });

  it('does not retain changed public-key or WebAuthn policy', async () => {
    const pubkeyQuery = jest.fn()
      .mockResolvedValueOnce({ rows: [{
        schema: 'auth_public',
        crypto_network: 'mainnet',
        sign_up_with_key: 'sign_up_v1',
        sign_in_request_challenge: 'request_v1',
        sign_in_record_failure: 'failure_v1',
        sign_in_with_challenge: 'sign_in_v1'
      }] })
      .mockResolvedValueOnce({ rows: [{
        schema: 'auth_public',
        crypto_network: 'mainnet',
        sign_up_with_key: 'sign_up_v2',
        sign_in_request_challenge: 'request_v2',
        sign_in_record_failure: 'failure_v2',
        sign_in_with_challenge: 'sign_in_v2'
      }] });
    const pubkeyContext = loaderContext(
      { query: pubkeyQuery } as unknown as Pool,
      {} as Pool
    );

    await expect(pubkeyLoader.resolve(pubkeyContext)).resolves.toMatchObject({
      signUpWithKey: 'sign_up_v1'
    });
    await expect(pubkeyLoader.resolve(pubkeyContext)).resolves.toMatchObject({
      signUpWithKey: 'sign_up_v2'
    });

    const webauthnQuery = jest.fn()
      .mockResolvedValueOnce({ rows: [{
        schema: 'auth_public',
        credentials_schema: 'auth_private',
        sessions_schema: 'sessions_private',
        session_secrets_schema: 'sessions_private',
        rp_id: 'old.example',
        rp_name: 'Old',
        origin_allowlist: ['https://old.example'],
        attestation_type: 'none',
        require_user_verification: false,
        resident_key: 'preferred',
        challenge_expiry_seconds: 300
      }] })
      .mockResolvedValueOnce({ rows: [{
        schema: 'auth_public',
        credentials_schema: 'auth_private',
        sessions_schema: 'sessions_private',
        session_secrets_schema: 'sessions_private',
        rp_id: 'new.example',
        rp_name: 'New',
        origin_allowlist: ['https://new.example'],
        attestation_type: 'direct',
        require_user_verification: true,
        resident_key: 'required',
        challenge_expiry_seconds: 60
      }] });
    const webauthnContext = loaderContext(
      { query: webauthnQuery } as unknown as Pool,
      {} as Pool
    );

    await expect(webauthnLoader.resolve(webauthnContext)).resolves.toMatchObject({
      rpId: 'old.example',
      requireUserVerification: false
    });
    await expect(webauthnLoader.resolve(webauthnContext)).resolves.toMatchObject({
      rpId: 'new.example',
      requireUserVerification: true
    });

    expect(pubkeyQuery).toHaveBeenCalledTimes(2);
    expect(webauthnQuery).toHaveBeenCalledTimes(2);
    expect(pubkeyLoader.cacheSize).toBe(0);
    expect(webauthnLoader.cacheSize).toBe(0);
  });
});
