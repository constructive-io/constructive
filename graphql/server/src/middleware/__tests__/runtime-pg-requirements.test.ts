import {
  assertRuntimePgCredentials,
  InvalidRuntimePgConfigurationError,
  MissingRuntimePgCredentialsError,
  shouldValidateRuntimeRoleSafety,
  usesUnsafeDevelopmentRuntimePgFallback
} from '../runtime-pg-requirements';

describe('GraphQL runtime PostgreSQL requirements', () => {
  it('preserves an explicitly named stock-mode fallback only outside production', () => {
    const options = {
      graphile: { introspectionMode: 'stock' }
    } as const;
    expect(usesUnsafeDevelopmentRuntimePgFallback(options, 'development')).toBe(true);
    expect(usesUnsafeDevelopmentRuntimePgFallback(options, 'test')).toBe(true);
    expect(usesUnsafeDevelopmentRuntimePgFallback(options, 'production')).toBe(false);
    expect(() => assertRuntimePgCredentials(options, 'development')).not.toThrow();
  });

  it('rejects production stock mode without an explicit runtime login', () => {
    expect(() => assertRuntimePgCredentials({
      graphile: { introspectionMode: 'stock' }
    }, 'production')).toThrow(MissingRuntimePgCredentialsError);
  });

  it.each([
    undefined,
    {},
    { user: 'runtime' },
    { password: 'secret' },
    { user: '  ', password: 'secret' },
    { user: 'runtime', password: '' },
    { user: 42, password: 'secret' },
    { user: 'runtime', password: async () => 'secret' }
  ])('rejects scoped mode without a complete explicit runtime login: %p', (runtimePg) => {
    expect(() => assertRuntimePgCredentials({
      graphile: { introspectionMode: 'scoped-required' },
      runtimePg: runtimePg as never
    }, 'test')).toThrow(MissingRuntimePgCredentialsError);
  });

  it('rejects an incomplete explicitly supplied login even in stock development', () => {
    expect(() => assertRuntimePgCredentials({
      graphile: { introspectionMode: 'stock' },
      runtimePg: { user: 'runtime' }
    }, 'development')).toThrow(MissingRuntimePgCredentialsError);
  });

  it('accepts a static login in stock development compatibility mode', () => {
    const stock = {
      graphile: { introspectionMode: 'stock' as const },
      runtimePg: { user: 'runtime', password: 'secret' }
    };
    expect(() => assertRuntimePgCredentials(stock, 'development')).not.toThrow();
    expect(shouldValidateRuntimeRoleSafety(stock, 'development')).toBe(true);
  });

  it('requires a resolver or one exact static route in scoped/production modes', () => {
    expect(() => assertRuntimePgCredentials({
      graphile: { introspectionMode: 'scoped-required' },
      runtimePg: { user: 'runtime', password: 'secret' }
    }, 'test')).toThrow(InvalidRuntimePgConfigurationError);

    expect(() => assertRuntimePgCredentials({
      graphile: { introspectionMode: 'scoped-required' },
      runtimePg: {
        database: 'tenant_a',
        user: 'runtime',
        password: 'secret'
      },
      runtimePgStaticIdentity: {
        databaseId: 'database-a',
        databaseName: 'tenant_a',
        apiId: 'api-a',
        schemas: ['tenant_a_public'],
        roles: ['anonymous', 'authenticated']
      }
    }, 'test')).not.toThrow();

    expect(() => assertRuntimePgCredentials({
      graphile: { introspectionMode: 'scoped-required' },
      runtimePgResolver: async () => ({
        database: 'tenant_a',
        user: 'runtime',
        password: 'secret'
      })
    }, 'test')).not.toThrow();
  });

  it('always enables role safety in production, even for stock mode', () => {
    expect(shouldValidateRuntimeRoleSafety({
      graphile: { introspectionMode: 'stock' },
      runtimePgResolver: () => ({
        database: 'tenant_a',
        user: 'runtime',
        password: 'secret'
      })
    }, 'production')).toBe(true);
  });

  it('rejects ambiguous static and resolver credentials', () => {
    expect(() => assertRuntimePgCredentials({
      runtimePg: { user: 'runtime', password: 'secret' },
      runtimePgResolver: () => ({
        database: 'tenant_a',
        user: 'other',
        password: 'other-secret'
      })
    }, 'development')).toThrow(InvalidRuntimePgConfigurationError);
  });
});
