import * as fs from 'fs';
import * as path from 'path';
import { getConnections, PgTestClient } from 'pgsql-test';

import { audit } from '../src/commands/audit';
import { definePlanes, resolveAdapters } from '../src/exposure/adapters';
import { resolveExposure, resolvePlanes } from '../src/pg/exposure';

jest.setTimeout(120000);

let pg: PgTestClient;
let teardown: () => Promise<void>;

const SCHEMAS = ['fx_pl_api', 'fx_pl_internal'];

beforeAll(async () => {
  ({ pg, teardown } = await getConnections());
  const sql = fs.readFileSync(path.join(__dirname, 'fixtures', 'planes.sql'), 'utf8');
  await pg.any(sql);
});

afterAll(async () => {
  if (teardown) await teardown();
});

describe('exposure planes', () => {
  it('leaves the headline score exactly where it was when planes are added', async () => {
    const withoutPlanes = await audit(pg.client as never, {
      schemas: SCHEMAS,
      exposure: { schemas: ['fx_pl_api'] }
    });
    const withPlanes = await audit(pg.client as never, {
      schemas: SCHEMAS,
      exposure: {
        schemas: ['fx_pl_api'],
        planes: [{ name: 'direct:reporting', kind: 'role', roles: ['fx_pl_reporting'] }]
      }
    });

    expect(withPlanes.score!.value).toBe(withoutPlanes.score!.value);
    expect(withPlanes.score!.grade).toBe(withoutPlanes.score!.grade);
    expect(withoutPlanes.planes).toBeUndefined();
    expect(withPlanes.planes![0]).toMatchObject({ primary: true, name: 'api' });
    expect(withPlanes.planes![0].score.value).toBe(withoutPlanes.score!.value);
  });

  it('grades a role plane against what the role actually reaches', async () => {
    const report = await audit(pg.client as never, {
      schemas: SCHEMAS,
      exposure: {
        schemas: ['fx_pl_api'],
        planes: [{ name: 'direct:reporting', kind: 'role', roles: ['fx_pl_reporting'] }]
      }
    });

    const plane = report.planes!.find((p) => p.name === 'direct:reporting')!;
    expect(plane).toMatchObject({ kind: 'role', primary: false, reachedVia: 'grant' });
    expect(plane.schemas).toEqual(['fx_pl_internal']);
    expect(plane.exposedTables).toBe(1);

    // The internal A2 is off the API surface but squarely on the role's.
    const a2 = report.findings.find((f) => f.code === 'A2' && f.schema === 'fx_pl_internal')!;
    expect(a2.exposed).toBe(false);
    expect(a2.planes).toContain('direct:reporting');
    expect(a2.planes).not.toContain('api');
    expect(plane.score.deductions.some((d) => d.code === 'A2')).toBe(true);

    // …and the primary score still knows nothing about it.
    expect(report.score!.deductions.some((d) => d.code === 'A2')).toBe(false);
  });

  it('refuses to grade a plane for a role that bypasses RLS', async () => {
    const report = await audit(pg.client as never, {
      schemas: SCHEMAS,
      exposure: {
        schemas: ['fx_pl_api'],
        planes: [{ name: 'direct:admin', kind: 'role', roles: ['fx_pl_admin'] }]
      }
    });
    const plane = report.planes!.find((p) => p.name === 'direct:admin')!;
    expect(plane.skipped).toMatch(/bypasses row-level security/);
    expect(plane.exposedTables).toBe(0);
  });

  it('grades a schema plane by membership', async () => {
    const report = await audit(pg.client as never, {
      schemas: SCHEMAS,
      exposure: {
        schemas: ['fx_pl_api'],
        planes: [{ name: 'internal', kind: 'schema', schemas: ['fx_pl_internal'] }]
      }
    });
    const plane = report.planes!.find((p) => p.name === 'internal')!;
    expect(plane).toMatchObject({ kind: 'schema', exposedTables: 1, source: 'config' });
    expect(plane.score.value).toBeLessThan(report.score!.value);
  });

  it('plane membership is not part of a finding\'s identity', async () => {
    const bare = await audit(pg.client as never, {
      schemas: SCHEMAS,
      exposure: { schemas: ['fx_pl_api'] }
    });
    const planed = await audit(pg.client as never, {
      schemas: SCHEMAS,
      exposure: {
        schemas: ['fx_pl_api'],
        planes: [{ name: 'internal', kind: 'schema', schemas: ['fx_pl_internal'] }]
      }
    });
    const key = (f: { code: string; schema?: string; table?: string; policy?: string }) =>
      [f.code, f.schema, f.table, f.policy].join('|');
    expect(planed.findings.map(key)).toEqual(bare.findings.map(key));
  });

  it('rejects two planes claiming the headline', async () => {
    const exposure = await resolveExposure(pg.client as never, { schemas: ['fx_pl_api'] });
    await expect(
      resolvePlanes(
        pg.client as never,
        {
          schemas: ['fx_pl_api'],
          planes: [
            { name: 'a', primary: true, schemas: ['fx_pl_api'] },
            { name: 'b', primary: true, schemas: ['fx_pl_internal'] }
          ]
        },
        exposure
      )
    ).rejects.toThrow(/more than one exposure plane declares/);
  });
});

describe('exposure adapters', () => {
  it('resolves planes from an adapter passed as a value', async () => {
    const adapter = definePlanes('gateway', [
      { name: 'api', kind: 'api', primary: true, schemas: ['fx_pl_api'], roles: ['fx_pl_anon'] },
      { name: 'internal', kind: 'schema', schemas: ['fx_pl_internal'] }
    ]);
    const exposure = await resolveExposure(pg.client as never, { adapters: [adapter] });
    expect(exposure).toMatchObject({ known: true, source: 'gateway', schemas: ['fx_pl_api'] });

    const planes = await resolvePlanes(pg.client as never, { adapters: [adapter] }, exposure);
    expect(planes.map((p) => p.name)).toEqual(['api', 'internal']);
  });

  it('resolves the built-in by name and rejects anything else', () => {
    expect(resolveAdapters(['constructive'])[0].name).toBe('constructive');
    expect(() => resolveAdapters(['safegres-plugin-mystery'])).toThrow(/unknown exposure adapter/);
  });

  it('falls through to the static surface when the adapter is not present', async () => {
    const exposure = await resolveExposure(pg.client as never, {
      resolver: 'constructive',
      schemas: ['fx_pl_api']
    });
    expect(exposure).toMatchObject({ known: true, source: 'config' });
  });
});
