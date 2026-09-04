import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { getGraphQLEnvVars } from '../src/env';
import { getEnvOptions } from '../src/merge';
import { OAUTH_PROVIDER_REQUEST_TIMEOUT_MAX_MS } from '../src/oauth';

const writeConfig = (dir: string, config: Record<string, unknown>): void => {
  fs.writeFileSync(path.join(dir, 'pgpm.json'), JSON.stringify(config, null, 2));
};

describe('getEnvOptions', () => {
  let tempDir = '';

  afterEach(() => {
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = '';
    }
  });

  it('merges pgpm defaults, graphql defaults, config, env, and overrides', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphql-env-'));
    writeConfig(tempDir, {
      pg: {
        host: 'config-host',
        database: 'config-db'
      },
      server: {
        port: 4000
      },
      graphile: {
        schema: ['config_schema']
      },
      features: {
        simpleInflection: false
      },
      api: {
        isPublic: false,
        metaSchemas: ['config_meta']
      },
      sms: {
        provider: 'devsms',
        senderId: 'ConfigSender',
        requestTimeoutMs: 3000,
        dryRun: false,
        devsms: {
          baseUrl: 'http://config-devsms:4000'
        }
      }
    });

    const testEnv: NodeJS.ProcessEnv = {
      PGHOST: 'env-host',
      PGUSER: 'env-user',
      GRAPHILE_SCHEMA: 'env_schema_a,env_schema_b',
      FEATURES_SIMPLE_INFLECTION: 'true',
      FEATURES_POSTGIS: 'false',
      API_IS_PUBLIC: 'true',
      API_EXPOSED_SCHEMAS: 'public,app',
      API_META_SCHEMAS: 'env_meta1,env_meta2',
      API_ANON_ROLE: 'env_anon',
      API_ROLE_NAME: 'env_role',
      SMS_PROVIDER: 'devsms',
      SMS_SENDER_ID: 'EnvSender',
      SMS_REQUEST_TIMEOUT_MS: '4000',
      SEND_SMS_DRY_RUN: 'true',
      DEVSMS_BASE_URL: 'http://env-devsms:4000'
    };

    const result = getEnvOptions(
      {
        db: {
          cwd: '<CWD>'
        },
        pg: {
          host: 'override-host'
        },
        server: {
          port: 5000
        },
        graphile: {
          schema: ['override_schema']
        },
        features: {
          oppositeBaseNames: false
        },
        api: {
          isPublic: false
        },
        sms: {
          senderId: 'OverrideSender',
          requestTimeoutMs: 9000
        }
      },
      tempDir,
      testEnv
    );

    expect(result).toMatchSnapshot();
  });

  it('replaces graphql array fields with later values (overrides win)', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphql-env-replace-'));
    writeConfig(tempDir, {
      graphile: {
        schema: ['config_schema', 'shared_schema']
      },
      api: {
        exposedSchemas: ['public', 'shared'],
        metaSchemas: ['metaschema_public', 'constructive_routing_public', 'config_meta']
      }
    });

    const testEnv: NodeJS.ProcessEnv = {
      GRAPHILE_SCHEMA: 'shared_schema,env_schema',
      API_EXPOSED_SCHEMAS: 'shared,env_schema',
      API_META_SCHEMAS: 'constructive_routing_public,env_meta'
    };

    const result = getEnvOptions(
      {
        graphile: {
          schema: ['override_schema', 'shared_schema']
        },
        api: {
          exposedSchemas: ['public', 'override_schema'],
          metaSchemas: ['env_meta', 'override_meta']
        }
      },
      tempDir,
      testEnv
    );

    // Arrays are replaced, not merged - overrides win completely
    expect(result.graphile?.schema).toEqual(['override_schema', 'shared_schema']);
    expect(result.api?.exposedSchemas).toEqual(['public', 'override_schema']);
    expect(result.api?.metaSchemas).toEqual(['env_meta', 'override_meta']);
  });

  it('parses SMS environment variables into typed options', () => {
    const result = getGraphQLEnvVars({
      SMS_PROVIDER: 'devsms',
      SMS_SENDER_ID: 'LocalSender',
      SMS_REQUEST_TIMEOUT_MS: '2500',
      SEND_SMS_DRY_RUN: 'true',
      DEVSMS_BASE_URL: 'http://localhost:4000'
    });

    expect(result.sms).toEqual({
      provider: 'devsms',
      senderId: 'LocalSender',
      requestTimeoutMs: 2500,
      dryRun: true,
      devsms: {
        baseUrl: 'http://localhost:4000'
      }
    });
  });

  it('accepts custom SMS provider names', () => {
    const result = getGraphQLEnvVars({
      SMS_PROVIDER: 'custom-sms-gateway'
    });

    expect(result.sms?.provider).toBe('custom-sms-gateway');
  });

  it('honors config, env, and runtime override priority for SMS', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphql-env-sms-'));
    writeConfig(tempDir, {
      sms: {
        provider: 'devsms',
        senderId: 'ConfigSender',
        requestTimeoutMs: 3000,
        dryRun: false,
        devsms: {
          baseUrl: 'http://config-devsms:4000'
        }
      }
    });

    const result = getEnvOptions(
      {
        sms: {
          requestTimeoutMs: 9000
        }
      },
      tempDir,
      {
        SMS_SENDER_ID: 'EnvSender',
        SEND_SMS_DRY_RUN: 'true',
        DEVSMS_BASE_URL: 'http://env-devsms:4000'
      }
    );

    expect(result.sms).toEqual({
      provider: 'devsms',
      senderId: 'EnvSender',
      requestTimeoutMs: 9000,
      dryRun: true,
      devsms: {
        baseUrl: 'http://env-devsms:4000'
      }
    });
  });

  it('uses the injected env object instead of global process.env for SMS', () => {
    const previousSmsProvider = process.env.SMS_PROVIDER;
    process.env.SMS_PROVIDER = 'twilio';

    try {
      const result = getEnvOptions({}, process.cwd(), {
        SMS_PROVIDER: 'devsms'
      });

      expect(result.sms?.provider).toBe('devsms');
    } finally {
      if (previousSmsProvider === undefined) {
        delete process.env.SMS_PROVIDER;
      } else {
        process.env.SMS_PROVIDER = previousSmsProvider;
      }
    }
  });

  it('keeps SMS absent when it is not configured', () => {
    const result = getEnvOptions({}, process.cwd(), {});

    expect(result.sms).toBeUndefined();
  });

  it('defaults OAuth off with a ten-second Provider timeout', () => {
    expect(getEnvOptions({}, process.cwd(), {}).oauth).toEqual({
      enabled: false,
      providerRequestTimeoutMs: 10_000
    });
  });

  it('keeps absent OAuth environment variables out of partial overrides', () => {
    expect(getGraphQLEnvVars({})).not.toHaveProperty('oauth');
  });

  it('parses explicit OAuth environment overrides', () => {
    expect(
      getGraphQLEnvVars({
        OAUTH_ENABLED: 'true',
        OAUTH_PROVIDER_REQUEST_TIMEOUT_MS: '2500'
      }).oauth
    ).toEqual({
      enabled: true,
      providerRequestTimeoutMs: 2500
    });
  });

  it('preserves config OAuth enablement when environment overrides are absent', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphql-env-oauth-'));
    writeConfig(tempDir, {
      oauth: {
        enabled: true,
        providerRequestTimeoutMs: 8000
      }
    });

    expect(getEnvOptions({}, tempDir, {}).oauth).toEqual({
      enabled: true,
      providerRequestTimeoutMs: 8000
    });
  });

  it('honors config, env, and runtime priority for OAuth', () => {
    tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'graphql-env-oauth-priority-')
    );
    writeConfig(tempDir, {
      oauth: {
        enabled: false,
        providerRequestTimeoutMs: 5000
      }
    });

    const result = getEnvOptions(
      { oauth: { providerRequestTimeoutMs: 9000 } },
      tempDir,
      { OAUTH_ENABLED: 'true', OAUTH_PROVIDER_REQUEST_TIMEOUT_MS: '7000' }
    );

    expect(result.oauth).toEqual({
      enabled: true,
      providerRequestTimeoutMs: 9000
    });
  });

  it.each(['not-a-boolean', '', 'enabled'])(
    'rejects an explicitly malformed OAuth enabled value %p',
    value => {
      expect(() => getGraphQLEnvVars({ OAUTH_ENABLED: value })).toThrow(
        /OAUTH_ENABLED/
      );
    }
  );

  it.each([
    'not-a-number',
    '0',
    '-1',
    '1.5',
    String(OAUTH_PROVIDER_REQUEST_TIMEOUT_MAX_MS + 1)
  ])('rejects an invalid OAuth Provider timeout %p', value => {
    expect(() =>
      getEnvOptions({}, process.cwd(), {
        OAUTH_PROVIDER_REQUEST_TIMEOUT_MS: value
      })
    ).toThrow(/providerRequestTimeoutMs|OAUTH_PROVIDER_REQUEST_TIMEOUT_MS/);
  });

  it('rejects invalid OAuth config and runtime override types after merging', () => {
    tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'graphql-env-oauth-invalid-')
    );
    writeConfig(tempDir, { oauth: { enabled: 'yes' } });

    expect(() => getEnvOptions({}, tempDir, {})).toThrow(
      /oauth.enabled must be a boolean/
    );
    expect(() =>
      getEnvOptions(
        { oauth: { providerRequestTimeoutMs: 60_001 } },
        process.cwd(),
        {}
      )
    ).toThrow(/providerRequestTimeoutMs/);
  });

  it('omits an invalid SMS timeout from partial env overrides', () => {
    const result = getGraphQLEnvVars({
      SMS_REQUEST_TIMEOUT_MS: '5s'
    });

    expect(result.sms).toBeUndefined();
  });

  it('does not let absent or invalid SMS env values override config', () => {
    tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'graphql-env-sms-defaults-')
    );
    writeConfig(tempDir, {
      sms: {
        requestTimeoutMs: 3000,
        dryRun: true
      }
    });

    const result = getEnvOptions({}, tempDir, {
      SMS_REQUEST_TIMEOUT_MS: '5s'
    });

    expect(result.sms).toEqual({
      requestTimeoutMs: 3000,
      dryRun: true
    });
  });
});
