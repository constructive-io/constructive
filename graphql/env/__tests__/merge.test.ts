import { getConstructiveEnvOptions, getEnvOptions } from '../src/merge';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

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

  it('is the exact alias of getConstructiveEnvOptions', () => {
    expect(getEnvOptions).toBe(getConstructiveEnvOptions);
  });

  it('merges pgpm defaults, graphql defaults, config, env, and overrides', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphql-env-'));
    writeConfig(tempDir, {
      pg: {
        host: 'config-host',
        database: 'config-db'
      },
      server: {
        host: 'config-server',
        port: 4000,
        origin: 'https://config-origin.test'
      },
      cdn: {
        bucketName: 'config-bucket',
        endpoint: 'http://config-storage:9000'
      },
      jobs: {
        schema: { schema: 'config_jobs' },
        worker: { hostname: 'config-worker' }
      },
      smtp: {
        host: 'config-smtp',
        from: 'config@example.test'
      },
      graphile: {
        schema: ['config_schema']
      },
      features: {
        simpleInflection: false
      },
      api: {
        enableServicesApi: false,
        isPublic: false,
        metaSchemas: ['config_meta']
      }
    });

    const testEnv: NodeJS.ProcessEnv = {
      PGHOST: 'env-host',
      PGUSER: 'env-user',
      PORT: '4500',
      SERVER_HOST: 'env-server',
      BUCKET_NAME: 'env-bucket',
      JOBS_SCHEMA: 'env_jobs',
      SMTP_HOST: 'env-smtp',
      GRAPHILE_SCHEMA: 'env_schema_a,env_schema_b',
      FEATURES_SIMPLE_INFLECTION: 'true',
      FEATURES_POSTGIS: 'false',
      API_ENABLE_SERVICES: 'true',
      API_IS_PUBLIC: 'true',
      API_EXPOSED_SCHEMAS: 'public,app',
      API_META_SCHEMAS: 'env_meta1,env_meta2',
      API_ANON_ROLE: 'env_anon',
      API_ROLE_NAME: 'env_role',
      API_DEFAULT_DATABASE_ID: 'env_db'
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
        cdn: {
          bucketName: 'override-bucket'
        },
        smtp: {
          port: 2525
        },
        graphile: {
          schema: ['override_schema']
        },
        features: {
          oppositeBaseNames: false
        },
        api: {
          enableServicesApi: false,
          defaultDatabaseId: 'override_db'
        }
      },
      tempDir,
      testEnv
    );

    expect(result).toMatchSnapshot();
    expect(result.server).toMatchObject({
      host: 'env-server',
      port: 5000,
      origin: 'https://config-origin.test'
    });
    expect(result.cdn).toMatchObject({
      bucketName: 'override-bucket',
      endpoint: 'http://config-storage:9000'
    });
    expect(result.jobs).toMatchObject({
      schema: { schema: 'env_jobs' },
      worker: { hostname: 'config-worker' }
    });
    expect(result.smtp).toMatchObject({
      host: 'env-smtp',
      port: 2525,
      from: 'config@example.test'
    });
  });

  it('replaces graphql array fields with later values (overrides win)', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphql-env-replace-'));
    writeConfig(tempDir, {
      graphile: {
        schema: ['config_schema', 'shared_schema']
      },
      api: {
        exposedSchemas: ['public', 'shared'],
        metaSchemas: ['metaschema_public', 'services_public', 'config_meta']
      },
      jobs: {
        worker: { supported: ['config-worker', 'shared'] },
        scheduler: { supported: ['config-scheduler', 'shared'] }
      }
    });

    const testEnv: NodeJS.ProcessEnv = {
      GRAPHILE_SCHEMA: 'shared_schema,env_schema',
      API_EXPOSED_SCHEMAS: 'shared,env_schema',
      API_META_SCHEMAS: 'services_public,env_meta',
      JOBS_SUPPORTED: 'shared,env-job'
    };

    const result = getEnvOptions(
      {
        graphile: {
          schema: ['override_schema', 'shared_schema']
        },
        api: {
          exposedSchemas: ['public', 'override_schema'],
          metaSchemas: ['env_meta', 'override_meta']
        },
        jobs: {
          worker: { supported: ['override-worker', 'shared'] },
          scheduler: { supported: ['override-scheduler', 'shared'] }
        }
      },
      tempDir,
      testEnv
    );

    // Arrays are replaced, not merged - overrides win completely
    expect(result.graphile?.schema).toEqual(['override_schema', 'shared_schema']);
    expect(result.api?.exposedSchemas).toEqual(['public', 'override_schema']);
    expect(result.api?.metaSchemas).toEqual(['env_meta', 'override_meta']);
    expect(result.jobs?.worker?.supported).toEqual([
      'override-worker',
      'shared'
    ]);
    expect(result.jobs?.scheduler?.supported).toEqual([
      'override-scheduler',
      'shared'
    ]);
  });

  it('preserves the moved Constructive defaults', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphql-env-defaults-'));

    const result = getConstructiveEnvOptions({}, tempDir, {});

    expect(result.server).toEqual({
      host: 'localhost',
      port: 3000,
      trustProxy: false,
      strictAuth: false
    });
    expect(result.cdn).toEqual({
      provider: 'minio',
      bucketName: 'test-bucket',
      awsRegion: 'us-east-1',
      awsAccessKey: 'minioadmin',
      awsSecretKey: 'minioadmin',
      endpoint: 'http://localhost:9000',
      publicUrlPrefix: 'http://localhost:9000'
    });
    expect(result.jobs).toEqual({
      schema: { schema: 'app_jobs' },
      worker: {
        schema: 'app_jobs',
        hostname: 'worker-0',
        supportAny: true,
        supported: [],
        pollInterval: 1000,
        gracefulShutdown: true
      },
      scheduler: {
        schema: 'app_jobs',
        hostname: 'scheduler-0',
        supportAny: true,
        supported: [],
        pollInterval: 1000,
        gracefulShutdown: true
      }
    });
    expect(result.smtp).toEqual({
      port: 587,
      secure: false,
      pool: false,
      logger: false,
      debug: false
    });
  });
});
