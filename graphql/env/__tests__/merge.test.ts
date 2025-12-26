import { getEnvOptions } from '../src/merge';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const PGPM_ENV_KEYS = [
  'PGROOTDATABASE',
  'PGTEMPLATE',
  'DB_PREFIX',
  'DB_EXTENSIONS',
  'DB_CWD',
  'DB_CONNECTION_USER',
  'DB_CONNECTION_PASSWORD',
  'DB_CONNECTION_ROLE',
  'DB_CONNECTIONS_APP_USER',
  'DB_CONNECTIONS_APP_PASSWORD',
  'DB_CONNECTIONS_ADMIN_USER',
  'DB_CONNECTIONS_ADMIN_PASSWORD',
  'PORT',
  'SERVER_HOST',
  'SERVER_TRUST_PROXY',
  'SERVER_ORIGIN',
  'SERVER_STRICT_AUTH',
  'PGHOST',
  'PGPORT',
  'PGUSER',
  'PGPASSWORD',
  'PGDATABASE',
  'BUCKET_NAME',
  'AWS_REGION',
  'AWS_ACCESS_KEY',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_KEY',
  'AWS_SECRET_ACCESS_KEY',
  'MINIO_ENDPOINT',
  'DEPLOYMENT_USE_TX',
  'DEPLOYMENT_FAST',
  'DEPLOYMENT_USE_PLAN',
  'DEPLOYMENT_CACHE',
  'DEPLOYMENT_TO_CHANGE',
  'MIGRATIONS_CODEGEN_USE_TX',
  'JOBS_SCHEMA',
  'JOBS_SUPPORT_ANY',
  'JOBS_SUPPORTED',
  'INTERNAL_GATEWAY_URL',
  'INTERNAL_JOBS_CALLBACK_URL',
  'INTERNAL_JOBS_CALLBACK_PORT'
];

const GRAPHQL_ENV_KEYS = [
  'GRAPHILE_SCHEMA',
  'FEATURES_SIMPLE_INFLECTION',
  'FEATURES_OPPOSITE_BASE_NAMES',
  'FEATURES_POSTGIS',
  'API_ENABLE_META',
  'API_IS_PUBLIC',
  'API_EXPOSED_SCHEMAS',
  'API_META_SCHEMAS',
  'API_ANON_ROLE',
  'API_ROLE_NAME',
  'API_DEFAULT_DATABASE_ID'
];

const ENV_KEYS = [...PGPM_ENV_KEYS, ...GRAPHQL_ENV_KEYS];

const writeConfig = (dir: string, config: Record<string, unknown>): void => {
  fs.writeFileSync(path.join(dir, 'pgpm.json'), JSON.stringify(config, null, 2));
};

describe('getEnvOptions', () => {
  let envSnapshot: Record<string, string | undefined>;
  let tempDir = '';

  beforeEach(() => {
    envSnapshot = {};
    for (const key of ENV_KEYS) {
      envSnapshot[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const value = envSnapshot[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
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
        enableMetaApi: false,
        isPublic: false,
        metaSchemas: ['config_meta']
      }
    });

    Object.assign(process.env, {
      PGHOST: 'env-host',
      PGUSER: 'env-user',
      GRAPHILE_SCHEMA: 'env_schema_a,env_schema_b',
      FEATURES_SIMPLE_INFLECTION: 'true',
      FEATURES_POSTGIS: 'false',
      API_ENABLE_META: 'true',
      API_IS_PUBLIC: 'true',
      API_EXPOSED_SCHEMAS: 'public,app',
      API_META_SCHEMAS: 'env_meta1,env_meta2',
      API_ANON_ROLE: 'env_anon',
      API_ROLE_NAME: 'env_role',
      API_DEFAULT_DATABASE_ID: 'env_db'
    });

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
          enableMetaApi: false,
          defaultDatabaseId: 'override_db'
        }
      },
      tempDir
    );

    expect(result).toMatchSnapshot();
  });

  it('dedupes graphql array fields across config, env, and overrides', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphql-env-dedupe-'));
    writeConfig(tempDir, {
      graphile: {
        schema: ['config_schema', 'shared_schema']
      },
      api: {
        exposedSchemas: ['public', 'shared'],
        metaSchemas: ['collections_public', 'meta_public', 'config_meta']
      }
    });

    Object.assign(process.env, {
      GRAPHILE_SCHEMA: 'shared_schema,env_schema',
      API_EXPOSED_SCHEMAS: 'shared,env_schema',
      API_META_SCHEMAS: 'meta_public,env_meta'
    });

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
      tempDir
    );

    expect(result.graphile?.schema).toEqual([
      'config_schema',
      'shared_schema',
      'env_schema',
      'override_schema'
    ]);
    expect(result.api?.exposedSchemas).toEqual([
      'public',
      'shared',
      'env_schema',
      'override_schema'
    ]);
    expect(result.api?.metaSchemas).toEqual([
      'collections_public',
      'meta_public',
      'config_meta',
      'env_meta',
      'override_meta'
    ]);
  });
});
