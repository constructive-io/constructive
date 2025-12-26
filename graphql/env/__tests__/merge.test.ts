import { getEnvOptions } from '../src/merge';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { applyEnvFixture, loadEnvFixture, restoreEnv } from '../../../pgpm/env/__tests__/test-utils';

const writeConfig = (dir: string, config: Record<string, unknown>): void => {
  fs.writeFileSync(path.join(dir, 'pgpm.json'), JSON.stringify(config, null, 2));
};

const fixturesDir = path.join(__dirname, '..', '__fixtures__');

describe('getEnvOptions', () => {
  let envSnapshot: Record<string, string | undefined>;
  let tempDir = '';

  beforeEach(() => {
    envSnapshot = {};
  });

  afterEach(() => {
    restoreEnv(envSnapshot);
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

    const fixtureEnv = loadEnvFixture(fixturesDir, 'env.base.json');
    envSnapshot = { ...envSnapshot, ...applyEnvFixture(fixtureEnv) };

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

    const fixtureEnv = loadEnvFixture(fixturesDir, 'env.dedupe.json');
    envSnapshot = { ...envSnapshot, ...applyEnvFixture(fixtureEnv) };

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
