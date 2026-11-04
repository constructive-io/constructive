import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { getGraphQLEnvVars } from '../src/env';
import { getEnvOptions } from '../src/merge';

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

  it('defaults to the upstream Graphile preset configuration', () => {
    const result = getEnvOptions({}, process.cwd(), {});

    expect(result.graphile).toEqual({
      schema: [],
      extends: [],
      preset: {},
      cache: {
        max: 50,
        ttl: 31622400000
      }
    });
  });

  it('forwards Graphile preset gather configuration with runtime precedence', () => {
    tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'graphql-env-introspection-')
    );
    writeConfig(tempDir, {
      graphile: {
        preset: {
          gather: {
            pgScopedIntrospection: { main: true }
          }
        }
      }
    });

    const configured = getEnvOptions({}, tempDir, {});
    expect(configured.graphile?.preset?.gather).toEqual({
      pgScopedIntrospection: { main: true }
    });

    const overridden = getEnvOptions(
      {
        graphile: {
          preset: {
            gather: {
              pgScopedIntrospection: { main: false }
            }
          }
        }
      },
      tempDir,
      {}
    );
    expect(overridden.graphile?.preset?.gather).toEqual({
      pgScopedIntrospection: { main: false }
    });
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

  it('parses Graphile cache admission environment variables into typed options', () => {
    const result = getGraphQLEnvVars({
      GRAPHILE_CACHE_MAX: '500',
      GRAPHILE_CACHE_TTL_MS: '60000',
      GRAPHILE_CACHE_HEAP_MAX_BYTES: '536870912',
      GRAPHILE_CACHE_BUILD_RESERVE_BYTES: '67108864'
    });

    expect(result.graphile?.cache).toEqual({
      max: 500,
      ttl: 60000,
      heapMaxBytes: 536870912,
      buildReserveBytes: 67108864
    });
  });

  it.each([
    ['blank', ''],
    ['NaN', 'NaN'],
    ['Infinity', 'Infinity'],
    ['fractional', '1.5'],
    ['trailing text', '12items'],
    ['outside safe integer range', '9007199254740992']
  ])('rejects a %s GRAPHILE_CACHE_MAX value', (_label, value) => {
    expect(() => getGraphQLEnvVars({ GRAPHILE_CACHE_MAX: value })).toThrow(
      /GRAPHILE_CACHE_MAX/
    );
  });

  it.each([
    ['blank', ''],
    ['NaN', 'NaN'],
    ['Infinity', 'Infinity'],
    ['fractional', '1.5'],
    ['trailing text', '12items'],
    ['outside safe integer range', '9007199254740992']
  ])('rejects a %s GRAPHILE_CACHE_TTL_MS value', (_label, value) => {
    expect(() => getGraphQLEnvVars({ GRAPHILE_CACHE_TTL_MS: value })).toThrow(
      /GRAPHILE_CACHE_TTL_MS/
    );
  });

  it('preserves file cache options when cache environment variables are absent', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphql-env-graphile-cache-'));
    writeConfig(tempDir, {
      graphile: {
        cache: {
          max: 120,
          heapMaxBytes: 536870912,
          buildReserveBytes: 67108864
        }
      }
    });

    const result = getEnvOptions({}, tempDir, {});

    expect(result.graphile?.cache).toEqual({
      max: 120,
      ttl: 31622400000,
      heapMaxBytes: 536870912,
      buildReserveBytes: 67108864
    });
  });

  it('merges Graphile cache config, environment, and runtime overrides in priority order', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphql-env-graphile-cache-priority-'));
    writeConfig(tempDir, {
      graphile: {
        cache: {
          max: 120,
          heapMaxBytes: 536870912,
          buildReserveBytes: 67108864
        }
      }
    });

    const result = getEnvOptions(
      { graphile: { cache: { max: 400 } } },
      tempDir,
      { GRAPHILE_CACHE_MAX: '200' }
    );

    expect(result.graphile?.cache).toEqual({
      max: 400,
      ttl: 31622400000,
      heapMaxBytes: 536870912,
      buildReserveBytes: 67108864
    });
  });

  it('parses explicit Graphile build environment variables without injecting defaults', () => {
    const result = getGraphQLEnvVars({
      GRAPHILE_BUILD_QUEUE_MAX: '0',
      GRAPHILE_BUILD_WATCHDOG_MS: '300000',
      GRAPHILE_BUILD_SHUTDOWN_TIMEOUT_MS: '30000'
    });

    expect(result.graphile?.build).toEqual({
      queueMax: 0,
      watchdogMs: 300000,
      shutdownTimeoutMs: 30000
    });
    expect(getGraphQLEnvVars({}).graphile?.build).toBeUndefined();
  });

  it('accepts Node timer delays through the signed 32-bit millisecond limit', () => {
    const result = getGraphQLEnvVars({
      GRAPHILE_BUILD_WATCHDOG_MS: '2147483647',
      GRAPHILE_BUILD_SHUTDOWN_TIMEOUT_MS: '2147483647'
    });

    expect(result.graphile?.build).toEqual({
      watchdogMs: 2147483647,
      shutdownTimeoutMs: 2147483647
    });
  });

  it('preserves configured Graphile build settings when environment values are absent', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphql-env-graphile-build-'));
    writeConfig(tempDir, {
      graphile: {
        build: {
          queueMax: 8,
          watchdogMs: 240000,
          shutdownTimeoutMs: 45000
        }
      }
    });

    const result = getEnvOptions({}, tempDir, {});

    expect(result.graphile?.build).toEqual({
      queueMax: 8,
      watchdogMs: 240000,
      shutdownTimeoutMs: 45000
    });
  });

  it('merges Graphile build config, environment, and runtime overrides in priority order', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphql-env-graphile-build-priority-'));
    writeConfig(tempDir, {
      graphile: {
        build: {
          queueMax: 8,
          watchdogMs: 240000,
          shutdownTimeoutMs: 45000
        }
      }
    });

    const result = getEnvOptions(
      { graphile: { build: { watchdogMs: 120000 } } },
      tempDir,
      {
        GRAPHILE_BUILD_QUEUE_MAX: '12',
        GRAPHILE_BUILD_WATCHDOG_MS: '180000'
      }
    );

    expect(result.graphile?.build).toEqual({
      queueMax: 12,
      watchdogMs: 120000,
      shutdownTimeoutMs: 45000
    });
  });

  it.each([
    ['queue max negative', 'GRAPHILE_BUILD_QUEUE_MAX', '-1'],
    ['queue max fractional', 'GRAPHILE_BUILD_QUEUE_MAX', '1.5'],
    ['queue max above safe integer range', 'GRAPHILE_BUILD_QUEUE_MAX', '9007199254740992'],
    ['blank watchdog', 'GRAPHILE_BUILD_WATCHDOG_MS', ''],
    ['zero watchdog', 'GRAPHILE_BUILD_WATCHDOG_MS', '0'],
    ['watchdog timer overflow', 'GRAPHILE_BUILD_WATCHDOG_MS', '2147483648'],
    ['fractional shutdown timeout', 'GRAPHILE_BUILD_SHUTDOWN_TIMEOUT_MS', '10.5'],
    ['shutdown timer overflow', 'GRAPHILE_BUILD_SHUTDOWN_TIMEOUT_MS', '2147483648']
  ])('rejects malformed Graphile build environment value (%s)', (_label, name, value) => {
    expect(() => getGraphQLEnvVars({ [name]: value })).toThrow(new RegExp(name));
  });

  it.each([
    ['negative queue max', { queueMax: -1 }],
    ['fractional queue max', { queueMax: 1.5 }],
    ['unsafe queue max', { queueMax: 9007199254740992 }],
    ['zero watchdog', { watchdogMs: 0 }],
    ['watchdog timer overflow', { watchdogMs: 2147483648 }],
    ['shutdown timer overflow', { shutdownTimeoutMs: 2147483648 }]
  ])('rejects invalid final Graphile build config (%s)', (_label, build) => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphql-env-graphile-build-invalid-'));
    writeConfig(tempDir, { graphile: { build } });

    expect(() => getEnvOptions({}, tempDir, {})).toThrow(/graphile\.build/);
  });

  it('validates explicit Graphile build runtime overrides', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphql-env-graphile-build-runtime-'));

    expect(() =>
      getEnvOptions({ graphile: { build: { queueMax: 1.5 } } }, tempDir, {})
    ).toThrow(/graphile\.build\.queueMax/);
  });

  it('uses injected environment defaults while runtime cache options override environment values', () => {
    const development = getEnvOptions(
      { graphile: { cache: { max: 20, ttl: 20 } } },
      process.cwd(),
      {
        NODE_ENV: 'development',
        GRAPHILE_CACHE_MAX: '10',
        GRAPHILE_CACHE_TTL_MS: '10'
      }
    );
    expect(development.graphile?.cache).toEqual({
      max: 20,
      ttl: 20
    });

    const production = getEnvOptions({}, process.cwd(), { NODE_ENV: 'production' });
    expect(production.graphile?.cache).toEqual({
      max: 50,
      ttl: 31622400000
    });
  });

  it.each([
    ['zero max', { graphile: { cache: { max: 0 } } }],
    ['zero ttl', { graphile: { cache: { ttl: 0 } } }],
    ['fractional heap limit', { graphile: { cache: { heapMaxBytes: 1.5 } } }],
    ['negative reserve', { graphile: { cache: { buildReserveBytes: -1 } } }],
    [
      'reserve equal to the explicit heap limit',
      { graphile: { cache: { heapMaxBytes: 100, buildReserveBytes: 100 } } }
    ]
  ])('rejects invalid final Graphile cache options (%s)', (_label, config) => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphql-env-graphile-cache-invalid-'));
    writeConfig(tempDir, config);

    expect(() => getEnvOptions({}, tempDir, {})).toThrow(/graphile\.cache/);
  });

  it('rejects explicit null cache numeric fields instead of replacing them with defaults', () => {
    expect(() =>
      getEnvOptions({
        graphile: {
          cache: { max: null as unknown as number }
        }
      })
    ).toThrow(/graphile\.cache\.max/);

    expect(() =>
      getEnvOptions({
        graphile: {
          cache: { ttl: null as unknown as number }
        }
      })
    ).toThrow(/graphile\.cache\.ttl/);
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
