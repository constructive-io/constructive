import type { Pool } from 'pg';

import { createBillingClient } from '../billing-client';
import { quoteQualifiedSqlIdentifier, quoteSqlIdentifier } from '../sql-identifiers';
import { agentChatLoader } from '../loaders/agent-chat';
import { authSettingsLoader } from '../loaders/auth-settings';
import { rlsLoader } from '../loaders/rls';
import type { LoaderContext } from '../loaders/types';

const context = (
  routingQuery: jest.Mock,
  tenantQuery: jest.Mock
): LoaderContext => ({
  routingPool: { query: routingQuery } as unknown as Pool,
  routingPoolIdentity: 'routing-a',
  tenantPool: { query: tenantQuery } as unknown as Pool,
  tenantPoolIdentity: 'tenant-a',
  databaseId: '11111111-1111-4111-8111-111111111111',
  apiId: '22222222-2222-4222-8222-222222222222',
  dbname: 'tenant_a'
});

describe('security-sensitive metadata SQL', () => {
  afterEach(() => {
    agentChatLoader.invalidate();
    authSettingsLoader.invalidate();
    rlsLoader.invalidate();
  });

  it('quotes arbitrary PostgreSQL identifiers and rejects truncation/NUL cases', () => {
    expect(quoteQualifiedSqlIdentifier('tenant-a', 'table"name'))
      .toBe('"tenant-a"."table""name"');
    expect(() => quoteSqlIdentifier('')).toThrow('Invalid SQL identifier');
    expect(() => quoteSqlIdentifier('bad\0name')).toThrow('Invalid SQL identifier');
    expect(() => quoteSqlIdentifier('a'.repeat(64))).toThrow('Invalid SQL identifier');
  });

  it('constrains RLS schemas and functions to the requested database and schema', async () => {
    const routingQuery = jest.fn().mockResolvedValue({ rows: [{
      authenticate_schema: 'auth_private',
      role_schema: 'auth_public',
      authenticate: 'authenticate',
      authenticate_strict: 'authenticate_strict',
      current_role: 'current_role',
      current_role_id: 'current_role_id',
      current_user_agent: 'current_user_agent',
      current_ip_address: 'current_ip_address'
    }] });
    await rlsLoader.resolve(context(routingQuery, jest.fn()));

    const [sql, values] = routingQuery.mock.calls[0];
    expect(values).toEqual(['11111111-1111-4111-8111-111111111111']);
    expect(sql).toContain('auth_fn.database_id = rs.database_id');
    expect(sql).toContain('auth_fn.schema_id = rs.authenticate_schema_id');
    expect(sql).toContain('role_fn.schema_id = rs.role_schema_id');
  });

  it('rejects an RLS row whose referenced metadata did not resolve exactly', async () => {
    const routingQuery = jest.fn().mockResolvedValue({ rows: [{
      authenticate_schema: null,
      role_schema: 'auth_public',
      authenticate: null,
      authenticate_strict: null,
      current_role: 'current_role',
      current_role_id: 'current_role_id',
      current_user_agent: 'current_user_agent',
      current_ip_address: 'current_ip_address'
    }] });

    await expect(rlsLoader.resolve(context(routingQuery, jest.fn())))
      .rejects.toThrow('Incomplete or cross-database RLS module configuration');
  });

  it('scopes tenant module discovery and safely quotes discovered identifiers', async () => {
    const tenantQuery = jest.fn()
      .mockResolvedValueOnce({
        rows: [{ schema_name: 'session-private', table_name: 'auth"settings' }]
      })
      .mockResolvedValueOnce({ rows: [{
        cookie_secure: true,
        cookie_samesite: 'lax',
        cookie_domain: null,
        cookie_httponly: true,
        cookie_max_age: null,
        cookie_path: '/',
        remember_me_duration: null,
        enable_captcha: false,
        captcha_site_key: null
      }] });
    await authSettingsLoader.resolve(context(jest.fn(), tenantQuery));

    expect(tenantQuery.mock.calls[0][0]).toContain('WHERE sm.database_id = $1');
    expect(tenantQuery.mock.calls[0][1]).toEqual([
      '11111111-1111-4111-8111-111111111111'
    ]);
    expect(tenantQuery.mock.calls[1][0])
      .toContain('FROM "session-private"."auth""settings"');
  });

  it('scopes agent chat discovery to the exact logical database', async () => {
    const tenantQuery = jest.fn().mockResolvedValue({ rows: [{
      schema_name: 'agent_public',
      thread_table_name: 'threads',
      message_table_name: 'messages',
      task_table_name: 'tasks'
    }] });
    await agentChatLoader.resolve(context(jest.fn(), tenantQuery));

    expect(tenantQuery.mock.calls[0][0]).toContain('WHERE acm.database_id = $1');
    expect(tenantQuery.mock.calls[0][1]).toEqual([
      '11111111-1111-4111-8111-111111111111'
    ]);
  });

  it('fails a configured billing quota check closed and quotes its function', async () => {
    const query = jest.fn().mockRejectedValue(new Error('billing unavailable'));
    const withPgClient = jest.fn(async (callback) => callback({ query }));
    const billing = createBillingClient(
      withPgClient as never,
      '33333333-3333-4333-8333-333333333333',
      {
        publicSchema: 'billing-public',
        privateSchema: 'billing"private',
        recordUsageFunction: 'record_usage',
        checkBillingQuotaFunction: 'check"quota'
      },
      null
    );

    await expect(billing.checkQuota('tokens')).resolves.toBe(false);
    expect(query.mock.calls[0][0])
      .toContain('SELECT "billing""private"."check""quota"(');
  });
});
