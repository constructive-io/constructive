import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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
  parseEnvList,
  parseEnvNumber,
  port,
  required,
  str,
  url,
  withDefault} from '../src';
import { dotenv, parseDotenv } from '../src/dotenv';

describe('env', () => {
  const ORIGINAL_ENV = { ...process.env };

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

    it('parseEnvList splits, trims and drops empty entries', () => {
      expect(parseEnvList('a,b,c')).toEqual(['a', 'b', 'c']);
      expect(parseEnvList(' a , b ,, c ')).toEqual(['a', 'b', 'c']);
      expect(parseEnvList('solo')).toEqual(['solo']);
      expect(parseEnvList(',')).toEqual([]);
      expect(parseEnvList('')).toBeUndefined();
      expect(parseEnvList(undefined)).toBeUndefined();
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

  describe('dotenv', () => {
    let dir: string;

    beforeEach(() => {
      dir = mkdtempSync(path.join(os.tmpdir(), '12factor-env-'));
    });

    afterEach(() => {
      rmSync(dir, { recursive: true, force: true });
    });

    it('parses dotenv source with parseDotenv', () => {
      const parsed = parseDotenv('A=1\n# comment\nB="two words"\n');
      expect(parsed).toEqual({ A: '1', B: 'two words' });
    });

    it('merges .env values under the environment (environment wins)', () => {
      writeFileSync(path.join(dir, '.env'), 'FROM_FILE=file\nSHARED=file\n');
      const merged = dotenv({ cwd: dir, environment: { SHARED: 'env', FROM_ENV: 'env' } });
      expect(merged).toEqual({ FROM_FILE: 'file', SHARED: 'env', FROM_ENV: 'env' });
    });

    it('lets file values win when override is true', () => {
      writeFileSync(path.join(dir, '.env'), 'SHARED=file\n');
      const merged = dotenv({ cwd: dir, environment: { SHARED: 'env' }, override: true });
      expect(merged.SHARED).toBe('file');
    });

    it('returns the environment unchanged when the file is missing', () => {
      const merged = dotenv({ cwd: dir, environment: { ONLY: 'env' } });
      expect(merged).toEqual({ ONLY: 'env' });
    });

    it('resolves an explicit path over cwd/file', () => {
      const custom = path.join(dir, 'custom.env');
      writeFileSync(custom, 'CUSTOM=yes\n');
      const merged = dotenv({ path: custom, cwd: '/nonexistent', environment: {} });
      expect(merged).toEqual({ CUSTOM: 'yes' });
    });

    it('resolves a custom file name under cwd', () => {
      writeFileSync(path.join(dir, '.env.local'), 'LOCAL=yes\n');
      const merged = dotenv({ cwd: dir, file: '.env.local', environment: {} });
      expect(merged).toEqual({ LOCAL: 'yes' });
    });

    it('never mutates process.env or the provided environment', () => {
      writeFileSync(path.join(dir, '.env'), 'DOTENV_MUTATION_CHECK=file\n');
      const provided = { KEEP: 'env' };
      dotenv({ cwd: dir, environment: provided });
      dotenv({ cwd: dir });
      expect(provided).toEqual({ KEEP: 'env' });
      expect(process.env.DOTENV_MUTATION_CHECK).toBeUndefined();
    });

    it('is not reachable from the main entry, which stays browser-safe', () => {
      const main = require('../src') as Record<string, unknown>;
      expect(main.dotenv).toBeUndefined();
      expect(main.parseDotenv).toBeUndefined();

      // The main entry is bundled into browsers/Electron renderers/Next client
      // components; a node builtin import there breaks those bundles.
      const source = readFileSync(path.join(__dirname, '../src/index.ts'), 'utf8');
      expect(source).not.toMatch(/from '(node:|fs|path)/);
    });

    it('composes with env() for validation', () => {
      writeFileSync(path.join(dir, '.env'), 'DATABASE_URL=postgres://localhost/dev\n');
      const config = env(
        dotenv({ cwd: dir, environment: {} }),
        { DATABASE_URL: str() }
      );
      expect(config.DATABASE_URL).toBe('postgres://localhost/dev');
    });
  });
});
