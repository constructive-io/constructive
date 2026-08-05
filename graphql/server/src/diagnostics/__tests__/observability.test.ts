import {
  isDevelopmentObservabilityMode,
  isGraphqlDebugSamplerEnabled,
  isGraphqlObservabilityEnabled,
  isGraphqlObservabilityTokenValid,
  isLoopbackAddress,
  isLoopbackHost,
} from '../observability';

describe('observability helpers', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('recognizes loopback hosts and addresses', () => {
    expect(isLoopbackHost('localhost')).toBe(true);
    expect(isLoopbackHost('127.0.0.1:3000')).toBe(true);
    expect(isLoopbackHost('[::1]:3000')).toBe(true);
    expect(isLoopbackHost('0.0.0.0')).toBe(false);

    expect(isLoopbackAddress('127.0.0.1')).toBe(true);
    expect(isLoopbackAddress('::ffff:127.0.0.1')).toBe(true);
    expect(isLoopbackAddress('::1')).toBe(true);
    expect(isLoopbackAddress('10.0.0.1')).toBe(false);
  });

  it('enables observability only in development on a loopback host', () => {
    process.env.NODE_ENV = 'development';
    process.env.GRAPHQL_OBSERVABILITY_ENABLED = 'true';

    expect(isDevelopmentObservabilityMode()).toBe(true);
    expect(isGraphqlObservabilityEnabled('localhost')).toBe(true);
    expect(isGraphqlDebugSamplerEnabled('localhost')).toBe(true);
    expect(isGraphqlObservabilityEnabled('0.0.0.0')).toBe(false);
    expect(isGraphqlDebugSamplerEnabled('0.0.0.0')).toBe(false);
  });

  it('disables production observability without a strong token', () => {
    process.env.NODE_ENV = 'production';
    process.env.GRAPHQL_OBSERVABILITY_ENABLED = 'true';

    expect(isDevelopmentObservabilityMode()).toBe(false);
    expect(isGraphqlObservabilityEnabled('localhost')).toBe(false);
    expect(isGraphqlDebugSamplerEnabled('localhost')).toBe(false);

    process.env.GRAPHQL_OBSERVABILITY_TOKEN = 'too-short';
    expect(isGraphqlObservabilityEnabled('localhost')).toBe(false);
  });

  it('allows token-authenticated production observability only on loopback', () => {
    process.env.NODE_ENV = 'production';
    process.env.GRAPHQL_OBSERVABILITY_ENABLED = 'true';
    process.env.GRAPHQL_OBSERVABILITY_TOKEN = 'a'.repeat(64);

    expect(isGraphqlObservabilityEnabled('localhost')).toBe(true);
    expect(isGraphqlDebugSamplerEnabled('127.0.0.1')).toBe(true);
    expect(isGraphqlObservabilityEnabled('0.0.0.0')).toBe(false);
    expect(isGraphqlObservabilityTokenValid('a'.repeat(64))).toBe(true);
    expect(isGraphqlObservabilityTokenValid('b'.repeat(64))).toBe(false);
  });
});
