import { writeFileSync, unlinkSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { env, str, port, bool } from '../src';

describe('env', () => {
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
});
