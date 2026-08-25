import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import * as graphileSchema from 'graphile-schema';
import type { Pool } from 'pg';
import type { PgConfig } from 'pg-env';
import * as pgsqlClient from 'pgsql-client';
import * as pgsqlSeed from 'pgsql-seed';

import { runCodegenOperation } from '../../cli/handler';
import { generateMulti } from '../../core/generate';
import { resolvePgConfig } from '../../core/introspect';
import { DatabaseSchemaSource } from '../../core/introspect/source/database';
import { PgpmModuleSchemaSource } from '../../core/introspect/source/pgpm-module';

jest.mock('pgsql-client', () => ({
  ...jest.requireActual('pgsql-client'),
  createEphemeralDb: jest.fn(),
}));
jest.mock('pgsql-seed', () => ({
  ...jest.requireActual('pgsql-seed'),
  deployPgpm: jest.fn(),
}));

const PG_ENV_KEYS = [
  'PGHOST',
  'PGPORT',
  'PGUSER',
  'PGPASSWORD',
  'PGDATABASE',
] as const;

describe('database operation isolation', () => {
  let tempDir: string;
  let previousPgEnv: Record<string, string | undefined>;

  beforeEach(() => {
    jest.clearAllMocks();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codegen-db-isolation-'));
    previousPgEnv = Object.fromEntries(
      PG_ENV_KEYS.map((key) => [key, process.env[key]])
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
    for (const key of PG_ENV_KEYS) {
      const previous = previousPgEnv[key];
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    }
  });

  it('resolves only the supplied environment and lets config override it', () => {
    process.env.PGHOST = 'ambient-host';
    process.env.PGPORT = '1111';
    process.env.PGUSER = 'ambient-user';
    process.env.PGPASSWORD = 'ambient-password';
    process.env.PGDATABASE = 'ambient-database';

    const explicitEnv = {
      PGHOST: 'explicit-host',
      PGPORT: '2222',
      PGUSER: 'explicit-user',
      PGPASSWORD: 'explicit-password',
      PGDATABASE: 'explicit-database',
    };

    expect(resolvePgConfig({}, explicitEnv)).toEqual({
      host: 'explicit-host',
      port: 2222,
      user: 'explicit-user',
      password: 'explicit-password',
      database: 'explicit-database',
    });

    expect(
      resolvePgConfig(
        {
          host: 'config-host',
          port: 3333,
          user: 'config-user',
          password: 'config-password',
          database: 'config-database',
        },
        explicitEnv
      )
    ).toEqual({
      host: 'config-host',
      port: 3333,
      user: 'config-user',
      password: 'config-password',
      database: 'config-database',
    });
  });

  it('threads explicit env through runCodegenOperation to a direct source', async () => {
    process.env.PGHOST = 'ambient-host';
    const seen: PgConfig[] = [];
    jest
      .spyOn(DatabaseSchemaSource.prototype, 'fetch')
      .mockImplementation(async function (this: DatabaseSchemaSource) {
        seen.push(
          (this as unknown as { options: { pgConfig: PgConfig } }).options
            .pgConfig
        );
        throw new Error('stop after capturing database config');
      });

    await runCodegenOperation(
      {
        schemas: ['public'],
        orm: true,
        output: path.join(tempDir, 'generated'),
        dryRun: true,
      },
      {
        cwd: tempDir,
        env: {
          PGHOST: 'operation-host',
          PGPORT: '6543',
          PGUSER: 'operation-user',
          PGPASSWORD: 'operation-password',
          PGDATABASE: 'operation-database',
        },
        onProgress: () => undefined,
      }
    );

    expect(seen).toEqual([
      {
        host: 'operation-host',
        port: 6543,
        user: 'operation-user',
        password: 'operation-password',
        database: 'operation-database',
      },
    ]);
  });

  it('preserves file config precedence through a single PGPM source', async () => {
    const configPath = path.join(tempDir, 'graphql-codegen.config.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        db: {
          config: {
            host: 'config-host',
            port: 7654,
            user: 'config-user',
            password: 'config-password',
            database: 'config-database',
          },
          pgpm: { modulePath: './module' },
          schemas: ['public'],
        },
        output: './generated',
        orm: true,
        docs: false,
      })
    );

    const seen: PgConfig[] = [];
    jest
      .spyOn(PgpmModuleSchemaSource.prototype, 'fetch')
      .mockImplementation(async function (this: PgpmModuleSchemaSource) {
        seen.push(
          (this as unknown as { options: { pgConfig: PgConfig } }).options
            .pgConfig
        );
        throw new Error('stop after capturing PGPM config');
      });

    await runCodegenOperation(
      { config: configPath, dryRun: true },
      {
        cwd: tempDir,
        env: {
          PGHOST: 'env-host',
          PGPORT: '1111',
          PGUSER: 'env-user',
          PGPASSWORD: 'env-password',
          PGDATABASE: 'env-database',
        },
        onProgress: () => undefined,
      }
    );

    expect(seen).toEqual([
      {
        host: 'config-host',
        port: 7654,
        user: 'config-user',
        password: 'config-password',
        database: 'config-database',
      },
    ]);
  });

  it('uses one explicit base connection for a shared PGPM deployment', async () => {
    const teardown = jest.fn();
    const ephemeralConfig: PgConfig = {
      host: 'shared-host',
      port: 8765,
      user: 'shared-user',
      password: 'shared-password',
      database: 'ephemeral-shared',
    };
    const createEphemeral = jest
      .mocked(pgsqlClient.createEphemeralDb)
      .mockImplementation((options = {}) => ({
        name: ephemeralConfig.database,
        config: ephemeralConfig,
        admin: {} as never,
        teardown,
      }));
    const deploy = jest
      .mocked(pgsqlSeed.deployPgpm)
      .mockImplementation(async () => undefined as never);
    const seen: PgConfig[] = [];
    jest
      .spyOn(DatabaseSchemaSource.prototype, 'fetch')
      .mockImplementation(async function (this: DatabaseSchemaSource) {
        seen.push(
          (this as unknown as { options: { pgConfig: PgConfig } }).options
            .pgConfig
        );
        throw new Error('stop after capturing shared config');
      });

    const baseDb = {
      config: {
        host: 'config-host',
        port: 8765,
        user: 'config-user',
        password: 'config-password',
        database: 'config-database',
      },
      pgpm: { modulePath: './module' },
      schemas: ['public'],
    };
    const result = await generateMulti({
      configs: {
        first: {
          db: baseDb,
          output: path.join(tempDir, 'first'),
          orm: true,
          docs: false,
        },
        second: {
          db: baseDb,
          output: path.join(tempDir, 'second'),
          orm: true,
          docs: false,
        },
      },
      cwd: tempDir,
      env: {
        PGHOST: 'env-host',
        PGPORT: '1111',
        PGUSER: 'env-user',
        PGPASSWORD: 'env-password',
        PGDATABASE: 'env-database',
      },
      dryRun: true,
      onProgress: () => undefined,
    });

    expect(result.hasError).toBe(true);
    expect(createEphemeral).toHaveBeenCalledTimes(1);
    expect(createEphemeral).toHaveBeenCalledWith(
      expect.objectContaining({
        baseConfig: {
          host: 'config-host',
          port: 8765,
          user: 'config-user',
          password: 'config-password',
          database: 'config-database',
        },
      })
    );
    expect(deploy).toHaveBeenCalledTimes(1);
    expect(seen).toEqual([ephemeralConfig, ephemeralConfig]);
    expect(teardown).toHaveBeenCalledTimes(1);
  });

  it('injects distinct pools into concurrent builds and closes both', async () => {
    const pools: Array<Pool & { marker: string; end: jest.Mock }> = [];
    const poolFactory = jest.fn((config: PgConfig) => {
      const pool = {
        marker: config.database,
        end: jest.fn().mockResolvedValue(undefined),
      } as unknown as Pool & { marker: string; end: jest.Mock };
      pools.push(pool);
      return pool;
    });
    const build = jest
      .spyOn(graphileSchema, 'buildSchemaArtifacts')
      .mockImplementation(async ({ pool }) => {
        const marker = (pool as Pool & { marker: string }).marker;
        await Promise.resolve();
        return {
          sdl: 'type Query { hello: String }',
          tablesMeta: [
            {
              name: marker,
              schemaName: 'public',
              relations: { manyToMany: [] },
            },
          ] as never,
        };
      });

    const first = new DatabaseSchemaSource({
      pgConfig: resolvePgConfig({ database: 'first' }, {}),
      schemas: ['public'],
      poolFactory,
    });
    const second = new DatabaseSchemaSource({
      pgConfig: resolvePgConfig({ database: 'second' }, {}),
      schemas: ['public'],
      poolFactory,
    });

    const [firstResult, secondResult] = await Promise.all([
      first.fetch(),
      second.fetch(),
    ]);

    expect(pools).toHaveLength(2);
    expect(pools[0]).not.toBe(pools[1]);
    expect(build).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ pool: pools[0], schemas: ['public'] })
    );
    expect(build).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ pool: pools[1], schemas: ['public'] })
    );
    expect(firstResult.tablesMeta?.[0].name).toBe('first');
    expect(secondResult.tablesMeta?.[0].name).toBe('second');
    expect(pools[0].end).toHaveBeenCalledTimes(1);
    expect(pools[1].end).toHaveBeenCalledTimes(1);
  });
});
