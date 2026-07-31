import { pgCache } from 'pg-cache';
import { getConnections, PgTestClient } from 'pgsql-test';

import { buildIntrospectionJSON } from '../src/build-introspection';
import { buildSchemaArtifacts } from '../src/build-schema';

jest.setTimeout(60000);

let pg: PgTestClient;
let teardown: () => Promise<void>;
let database: string;

beforeAll(async () => {
  ({ pg, teardown } = await getConnections());
  database = pg.config.database;

  await pg.query(`
    CREATE SCHEMA schema_a;
    CREATE TABLE schema_a.alpha_items (
      id serial PRIMARY KEY,
      title text NOT NULL
    );

    CREATE SCHEMA schema_b;
    CREATE TABLE schema_b.beta_widgets (
      id serial PRIMARY KEY,
      label text NOT NULL
    );
  `);
});

afterAll(async () => {
  // Release the pg-cache pool created by buildSchemaArtifacts before the
  // ephemeral database is dropped.
  pgCache.delete(database);
  await pgCache.waitForDisposals();
  await teardown();
});

function tableNames(tables: { tableName: string }[]): string[] {
  return tables.map((t) => t.tableName).sort();
}

describe('buildSchemaArtifacts', () => {
  it('returns SDL and tablesMeta from the same schema build', async () => {
    const a = await buildSchemaArtifacts({ database, schemas: ['schema_a'] });
    expect(a.sdl).toContain('AlphaItem');
    expect(a.sdl).not.toContain('BetaWidget');
    expect(tableNames(a.tablesMeta)).toEqual(['alpha_items']);

    const b = await buildSchemaArtifacts({ database, schemas: ['schema_b'] });
    expect(b.sdl).toContain('BetaWidget');
    expect(tableNames(b.tablesMeta)).toEqual(['beta_widgets']);

    // The earlier result must be unaffected by the later build.
    expect(tableNames(a.tablesMeta)).toEqual(['alpha_items']);
  });

  it('keeps results correlated under a forced A write -> B write -> A read schedule', async () => {
    // Deterministically reproduce the unsafe ordering from the legacy split
    // contract: caller A finishes collecting metadata (legacy global written),
    // caller B builds fully (legacy global overwritten), then caller A resumes
    // and returns. The correlated artifact API must still return A's metadata.
    let releaseA!: () => void;
    const gateA = new Promise<void>((resolve) => {
      releaseA = resolve;
    });
    let signalACollected!: () => void;
    const aCollected = new Promise<void>((resolve) => {
      signalACollected = resolve;
    });

    const pendingA = buildSchemaArtifacts({
      database,
      schemas: ['schema_a'],
      _onMetaCollected: async () => {
        signalACollected();
        await gateA;
      }
    });

    await aCollected;
    const b = await buildSchemaArtifacts({ database, schemas: ['schema_b'] });
    releaseA();
    const a = await pendingA;

    expect(tableNames(a.tablesMeta)).toEqual(['alpha_items']);
    expect(a.sdl).toContain('AlphaItem');
    expect(tableNames(b.tablesMeta)).toEqual(['beta_widgets']);
    expect(b.sdl).toContain('BetaWidget');
  });

  it('keeps concurrent uncoordinated builds correlated', async () => {
    const [a, b] = await Promise.all([
      buildSchemaArtifacts({ database, schemas: ['schema_a'] }),
      buildSchemaArtifacts({ database, schemas: ['schema_b'] })
    ]);

    expect(tableNames(a.tablesMeta)).toEqual(['alpha_items']);
    expect(tableNames(b.tablesMeta)).toEqual(['beta_widgets']);
  });

  it('returns explicit empty metadata when the meta plugin is disabled', async () => {
    const artifacts = await buildSchemaArtifacts({
      database,
      schemas: ['schema_a'],
      graphile: { disablePlugins: ['MetaSchemaPlugin'] }
    });

    expect(artifacts.sdl).toContain('AlphaItem');
    expect(artifacts.sdl).not.toContain('_meta');
    expect(artifacts.tablesMeta).toEqual([]);
  });
});

describe('buildIntrospectionJSON', () => {
  it('returns metadata correlated to its own build', async () => {
    let releaseA!: () => void;
    const gateA = new Promise<void>((resolve) => {
      releaseA = resolve;
    });
    let signalACollected!: () => void;
    const aCollected = new Promise<void>((resolve) => {
      signalACollected = resolve;
    });

    const pendingA = buildIntrospectionJSON({
      database,
      schemas: ['schema_a'],
      _onMetaCollected: async () => {
        signalACollected();
        await gateA;
      }
    });

    await aCollected;
    const b = await buildIntrospectionJSON({ database, schemas: ['schema_b'] });
    releaseA();
    const a = await pendingA;

    expect(tableNames(a)).toEqual(['alpha_items']);
    expect(tableNames(b)).toEqual(['beta_widgets']);
  });
});
