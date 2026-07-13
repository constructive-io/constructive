import { getGraphQLEnvVars, getNodeEnv } from '../src/env';

describe('moved Constructive environment variables', () => {
  it('parses server, CDN, jobs, and SMTP with the existing semantics', () => {
    const result = getGraphQLEnvVars({
      PORT: '4321',
      SERVER_HOST: '0.0.0.0',
      SERVER_TRUST_PROXY: 'true',
      SERVER_ORIGIN: 'https://example.test',
      SERVER_STRICT_AUTH: 'false',
      BUCKET_PROVIDER: 'gcs',
      BUCKET_NAME: 'assets',
      AWS_REGION: 'eu-west-1',
      AWS_ACCESS_KEY: 'primary-access',
      AWS_ACCESS_KEY_ID: 'alias-access',
      AWS_SECRET_KEY: 'primary-secret',
      AWS_SECRET_ACCESS_KEY: 'alias-secret',
      CDN_ENDPOINT: 'https://storage.example.test',
      CDN_PUBLIC_URL_PREFIX: 'https://cdn.example.test',
      JOBS_SCHEMA: 'custom_jobs',
      JOBS_SUPPORT_ANY: 'false',
      JOBS_SUPPORTED: 'alpha, beta',
      INTERNAL_GATEWAY_URL: 'http://gateway.internal:8080',
      INTERNAL_JOBS_CALLBACK_URL: 'http://callback.internal:12345',
      INTERNAL_JOBS_CALLBACK_PORT: '23456',
      SMTP_HOST: 'smtp.example.test',
      SMTP_PORT: '465',
      SMTP_SECURE: 'true',
      SMTP_USER: 'mailer',
      SMTP_PASS: 'password',
      SMTP_FROM: 'from@example.test',
      SMTP_REPLY_TO: 'reply@example.test',
      SMTP_REQUIRE_TLS: 'true',
      SMTP_TLS_REJECT_UNAUTHORIZED: 'false',
      SMTP_POOL: 'true',
      SMTP_MAX_CONNECTIONS: '4',
      SMTP_MAX_MESSAGES: '50',
      SMTP_NAME: 'mailer.example.test',
      SMTP_LOGGER: 'true',
      SMTP_DEBUG: 'false',
    });

    expect(result.server).toEqual({
      port: 4321,
      host: '0.0.0.0',
      trustProxy: true,
      origin: 'https://example.test',
      strictAuth: false,
    });
    expect(result.cdn).toEqual({
      provider: 'gcs',
      bucketName: 'assets',
      awsRegion: 'eu-west-1',
      awsAccessKey: 'primary-access',
      awsSecretKey: 'primary-secret',
      endpoint: 'https://storage.example.test',
      publicUrlPrefix: 'https://cdn.example.test',
    });
    expect(result.jobs).toEqual({
      schema: { schema: 'custom_jobs' },
      worker: { supportAny: false, supported: ['alpha', 'beta'] },
      scheduler: { supportAny: false, supported: ['alpha', 'beta'] },
      gateway: {
        gatewayUrl: 'http://gateway.internal:8080',
        callbackUrl: 'http://callback.internal:12345',
        callbackPort: 23456,
      },
    });
    expect(result.smtp).toEqual({
      host: 'smtp.example.test',
      port: 465,
      secure: true,
      user: 'mailer',
      pass: 'password',
      from: 'from@example.test',
      replyTo: 'reply@example.test',
      requireTLS: true,
      tlsRejectUnauthorized: false,
      pool: true,
      maxConnections: 4,
      maxMessages: 50,
      name: 'mailer.example.test',
      logger: true,
      debug: false,
    });
  });

  it('keeps the existing AWS alias fallback order', () => {
    expect(
      getGraphQLEnvVars({
        AWS_ACCESS_KEY_ID: 'alias-access',
        AWS_SECRET_ACCESS_KEY: 'alias-secret',
      }).cdn
    ).toEqual({
      awsAccessKey: 'alias-access',
      awsSecretKey: 'alias-secret',
    });
  });
});

describe('getNodeEnv', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  it.each([
    ['production', 'production'],
    ['test', 'test'],
    ['development', 'development'],
    ['other', 'development'],
  ])('maps %s to %s', (value, expected) => {
    process.env.NODE_ENV = value;
    expect(getNodeEnv()).toBe(expected);
  });
});
