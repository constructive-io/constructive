import { mkdirSync, rmSync,unlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import {
  bool,
  boolish,
  devDefault,
  env,
  getNodeEnv,
  getStrictEnvMode,
  host,
  isDevelopment,
  isProduction,
  isTest,
  parseEnvBoolean,
  parseEnvNumber,
  port,
  required,
  str,
  url,
  withDefault} from '../src';

describe('env', () => {
  const ORIGINAL_ENV = { ...process.env };
  const testDir = join(tmpdir(), 'env-test-' + process.pid);

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    try {
      rmSync(testDir, { recursive: true });
    } catch {
      // ignore cleanup errors
    }
  });

  afterEach(() => {
    // Remove any env var added during the test
    for (const key of Object.keys(process.env)) {
      if (!(key in ORIGINAL_ENV)) {
        delete process.env[key];
      }
    }
    // Restore original values
    Object.assign(process.env, ORIGINAL_ENV);
  });

  describe('_FILE secret detection', () => {
    it('should discover secrets via _FILE suffix pattern in original env', () => {
      const secretPath = join(testDir, 'api-secret');
      writeFileSync(secretPath, 'super-secret-value');

      try {
        // API_KEY_FILE is in env but API_KEY is not in vars
        // This tests the fix: secretEnv should use inputEnv, not varEnv
        const result = env(
          {
            API_KEY_FILE: secretPath,
            PORT: '3000'
          },
          { API_KEY: str() },
          { PORT: port() }
        );

        expect(result.API_KEY).toBe('super-secret-value');
        expect(result.PORT).toBe(3000);
      } finally {
        unlinkSync(secretPath);
      }
    });
  });

  describe('access to vars', () => {
    it('should allow accessing vars without ReferenceError', () => {
      const result = env(
        {
          MAILGUN_KEY: 'test-key',
          MAILGUN_DOMAIN: 'mg.example.com'
        },
        { MAILGUN_KEY: str() },
        { MAILGUN_DOMAIN: str() }
      );

      expect(result.MAILGUN_KEY).toBe('test-key');
      expect(result.MAILGUN_DOMAIN).toBe('mg.example.com');
    });
  });

  describe('precedence', () => {
    it('should prefer file secret over plain env when both exist', () => {
      const secretPath = join(testDir, 'api-key-secret');
      writeFileSync(secretPath, 'from-file');

      try {
        const result = env(
          {
            API_KEY: 'from-env',
            API_KEY_FILE: secretPath
          },
          { API_KEY: str() },
          {}
        );

        expect(result.API_KEY).toBe('from-file');
      } finally {
        unlinkSync(secretPath);
      }
    });

    it('should use plain env when no file secret exists', () => {
      const result = env(
        { API_KEY: 'from-env' },
        { API_KEY: str() },
        {}
      );

      expect(result.API_KEY).toBe('from-env');
    });
  });

  describe('Kubernetes secretKeyRef style', () => {
    it('should allow secret set directly in env (no file)', () => {
      const result = env(
        {
          DATABASE_PASSWORD: 'k8s-secret-value',
          DATABASE_HOST: 'localhost'
        },
        { DATABASE_PASSWORD: str() },
        { DATABASE_HOST: str() }
      );

      expect(result.DATABASE_PASSWORD).toBe('k8s-secret-value');
      expect(result.DATABASE_HOST).toBe('localhost');
    });
  });

  describe('validation', () => {
    it('should throw for missing required secret', () => {
      expect(() => {
        env(
          { PORT: '3000' },
          { API_KEY: str() },
          { PORT: port() }
        );
      }).toThrow(/API_KEY/);
    });

    it('should use default values for optional vars', () => {
      const result = env(
        { API_KEY: 'test-key' },
        { API_KEY: str() },
        {
          PORT: port({ default: 8080 }),
          DEBUG: bool({ default: false })
        }
      );

      expect(result.API_KEY).toBe('test-key');
      expect(result.PORT).toBe(8080);
      expect(result.DEBUG).toBe(false);
    });
  });

  describe('ENV_SECRETS_PATH resolution', () => {
    it('A5: should read secrets from ENV_SECRETS_PATH directory', () => {
      // Write file named 'API_KEY' (not API_KEY_FILE) to temp dir
      const secretPath = join(testDir, 'API_KEY');
      writeFileSync(secretPath, 'secret-from-path');

      // Set ENV_SECRETS_PATH - now works without module reload thanks to lazy getSecretsPath()
      process.env.ENV_SECRETS_PATH = testDir;

      try {
        const result = env(
          {}, // No API_KEY_FILE, no API_KEY in env
          { API_KEY: str() },
          {}
        );
        expect(result.API_KEY).toBe('secret-from-path');
      } finally {
        unlinkSync(secretPath);
      }
    });
  });

  describe('fallback behavior', () => {
    it('B1: _FILE present but file missing + env secret present → fallback', () => {
      const result = env(
        {
          API_KEY: 'fallback-value',
          API_KEY_FILE: '/nonexistent/path'
        },
        { API_KEY: str() },
        {}
      );
      expect(result.API_KEY).toBe('fallback-value');
    });

    it('B2: _FILE present but file missing + env secret missing → throw', () => {
      expect(() => {
        env(
          { API_KEY_FILE: '/nonexistent/path' },
          { API_KEY: str() },
          {}
        );
      }).toThrow(/API_KEY/);
    });
  });

  describe('validation errors', () => {
    it('B3: Invalid optional var format (host validator) → throw', () => {
      expect(() => {
        env(
          {
            API_KEY: 'test-key',
            MAILGUN_DOMAIN: 'not a valid host!!!'
          },
          { API_KEY: str() },
          { MAILGUN_DOMAIN: host() }
        );
      }).toThrow(/MAILGUN_DOMAIN/);
    });

    it('B4: Invalid required secret format (port validator) → throw', () => {
      expect(() => {
        env(
          { DB_PORT: 'not-a-number' },
          { DB_PORT: port() },
          {}
        );
      }).toThrow(/DB_PORT/);
    });
  });

  describe('getNodeEnv (house semantics)', () => {
    it('unset NODE_ENV → development', () => {
      expect(getNodeEnv({})).toBe('development');
      expect(getNodeEnv({ NODE_ENV: '' })).toBe('development');
    });

    it('explicit production → production', () => {
      expect(getNodeEnv({ NODE_ENV: 'production' })).toBe('production');
      expect(getNodeEnv({ NODE_ENV: 'PRODUCTION' })).toBe('production');
    });

    it('explicit test/testing → test', () => {
      expect(getNodeEnv({ NODE_ENV: 'test' })).toBe('test');
      expect(getNodeEnv({ NODE_ENV: 'testing' })).toBe('test');
    });

    it('GitHub Actions → test', () => {
      expect(getNodeEnv({ GITHUB_ACTIONS: 'true' })).toBe('test');
    });

    it('predicates agree with getNodeEnv', () => {
      expect(isProduction({ NODE_ENV: 'production' })).toBe(true);
      expect(isProduction({})).toBe(false);
      expect(isTest({ NODE_ENV: 'test' })).toBe(true);
      expect(isDevelopment({})).toBe(true);
    });
  });

  describe('fallback classes', () => {
    it('withDefault: uses fallback when unset, in every environment', () => {
      const dev = env({}, {}, { JOBS_SCHEMA: withDefault(str, 'app_jobs') });
      expect(dev.JOBS_SCHEMA).toBe('app_jobs');

      const prod = env(
        { NODE_ENV: 'production' },
        {},
        { JOBS_SCHEMA: withDefault(str, 'app_jobs') }
      );
      expect(prod.JOBS_SCHEMA).toBe('app_jobs');
    });

    it('withDefault: env value overrides the fallback', () => {
      const result = env(
        { JOBS_SCHEMA: 'custom_jobs' },
        {},
        { JOBS_SCHEMA: withDefault(str, 'app_jobs') }
      );
      expect(result.JOBS_SCHEMA).toBe('custom_jobs');
    });

    it('devDefault: uses fallback in development (NODE_ENV unset)', () => {
      const result = env(
        {},
        {},
        { SYNC_GATEWAY_BASE_DOMAIN: devDefault(str, 'sync.localhost') }
      );
      expect(result.SYNC_GATEWAY_BASE_DOMAIN).toBe('sync.localhost');
    });

    it('devDefault: uses fallback in test', () => {
      const result = env(
        { NODE_ENV: 'test' },
        {},
        { SYNC_GATEWAY_BASE_DOMAIN: devDefault(str, 'sync.localhost') }
      );
      expect(result.SYNC_GATEWAY_BASE_DOMAIN).toBe('sync.localhost');
    });

    it('devDefault: THROWS in production when absent', () => {
      expect(() => {
        env(
          { NODE_ENV: 'production' },
          {},
          { SYNC_GATEWAY_BASE_DOMAIN: devDefault(str, 'sync.localhost') }
        );
      }).toThrow(/SYNC_GATEWAY_BASE_DOMAIN/);
    });

    it('devDefault: env value satisfies the requirement in production', () => {
      const result = env(
        { NODE_ENV: 'production', SYNC_GATEWAY_BASE_DOMAIN: 'sync.example.com' },
        {},
        { SYNC_GATEWAY_BASE_DOMAIN: devDefault(str, 'sync.localhost') }
      );
      expect(result.SYNC_GATEWAY_BASE_DOMAIN).toBe('sync.example.com');
    });

    it('required: throws when absent in development', () => {
      expect(() => {
        env({}, {}, { K8S_API_URL: required(url) });
      }).toThrow(/K8S_API_URL/);
    });

    it('required: throws when absent in production', () => {
      expect(() => {
        env({ NODE_ENV: 'production' }, {}, { K8S_API_URL: required(url) });
      }).toThrow(/K8S_API_URL/);
    });

    it('required(url): rejects empty string, accepts a real url', () => {
      expect(() => {
        env({ K8S_API_URL: '' }, {}, { K8S_API_URL: required(url) });
      }).toThrow(/K8S_API_URL/);

      const result = env(
        { K8S_API_URL: 'https://k8s.example.com' },
        {},
        { K8S_API_URL: required(url) }
      );
      expect(result.K8S_API_URL).toBe('https://k8s.example.com');
    });
  });

  describe('lenient coercion', () => {
    it('parseEnvBoolean accepts true/1/yes case-insensitively', () => {
      expect(parseEnvBoolean('true')).toBe(true);
      expect(parseEnvBoolean('TRUE')).toBe(true);
      expect(parseEnvBoolean('1')).toBe(true);
      expect(parseEnvBoolean('Yes')).toBe(true);
      expect(parseEnvBoolean('false')).toBe(false);
      expect(parseEnvBoolean('no')).toBe(false);
      expect(parseEnvBoolean(undefined)).toBeUndefined();
      expect(parseEnvBoolean('')).toBeUndefined();
    });

    it('parseEnvNumber parses finite numbers only', () => {
      expect(parseEnvNumber('42')).toBe(42);
      expect(parseEnvNumber('3.14')).toBe(3.14);
      expect(parseEnvNumber('nan')).toBeUndefined();
      expect(parseEnvNumber('')).toBeUndefined();
      expect(parseEnvNumber(undefined)).toBeUndefined();
    });

    it('boolish validator accepts TRUE/yes that envalid bool rejects', () => {
      const result = env(
        { FEATURE_ENABLED: 'TRUE' },
        {},
        { FEATURE_ENABLED: boolish() }
      );
      expect(result.FEATURE_ENABLED).toBe(true);
    });

    it('boolish composes with withDefault (validator runs on typed default)', () => {
      const result = env({}, {}, { FEATURE_ENABLED: withDefault(boolish, false) });
      expect(result.FEATURE_ENABLED).toBe(false);
    });
  });

  describe('no mutation of caller env', () => {
    it('does not add NODE_ENV to the passed-in object', () => {
      const input: Record<string, string | undefined> = { JOBS_SCHEMA: 'app_jobs' };
      env(input, {}, { JOBS_SCHEMA: withDefault(str, 'app_jobs') });
      expect('NODE_ENV' in input).toBe(false);
    });
  });

  describe('getStrictEnvMode', () => {
    it('defaults to warn when STRICT_ENV is unset', () => {
      expect(getStrictEnvMode({})).toBe('warn');
    });

    it('is warn for any value other than throw', () => {
      expect(getStrictEnvMode({ STRICT_ENV: 'warn' })).toBe('warn');
      expect(getStrictEnvMode({ STRICT_ENV: 'anything' })).toBe('warn');
      expect(getStrictEnvMode({ STRICT_ENV: '' })).toBe('warn');
    });

    it('is throw only for STRICT_ENV=throw (case-insensitive)', () => {
      expect(getStrictEnvMode({ STRICT_ENV: 'throw' })).toBe('throw');
      expect(getStrictEnvMode({ STRICT_ENV: 'THROW' })).toBe('throw');
    });
  });
});
