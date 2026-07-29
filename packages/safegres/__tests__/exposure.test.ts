import * as fs from 'fs';
import * as path from 'path';
import { getConnections, PgTestClient } from 'pgsql-test';

import { audit } from '../src/commands/audit';
import { resolveExposure } from '../src/pg/exposure';

jest.setTimeout(120000);

let pg: PgTestClient;
let teardown: () => Promise<void>;

async function applyFixture(name: string): Promise<void> {
  const filepath = path.join(__dirname, 'fixtures', name);
  const sql = fs.readFileSync(filepath, 'utf8');
  await pg.any(sql);
}

beforeAll(async () => {
  ({ pg, teardown } = await getConnections());
  await applyFixture('a2-grants-no-rls.sql'); // fx_a2 — the "exposed" surface
  await applyFixture('a7-write-permissive.sql'); // fx_a7w — internal
});

afterAll(async () => {
  if (teardown) await teardown();
});

describe('resolveExposure', () => {
  it('returns unknown when nothing is configured', async () => {
    const exposure = await resolveExposure(pg.client as never, undefined);
    expect(exposure.known).toBe(false);
    expect(exposure.source).toBe('none');
  });

  it('resolves a static surface from config', async () => {
    const exposure = await resolveExposure(pg.client as never, { schemas: ['fx_a2'] });
    expect(exposure).toMatchObject({ known: true, source: 'config', schemas: ['fx_a2'] });
  });

  it('falls back to static config when the constructive routing plane is absent', async () => {
    const exposure = await resolveExposure(pg.client as never, {
      resolver: 'constructive',
      schemas: ['fx_a2']
    });
    expect(exposure).toMatchObject({ known: true, source: 'config', schemas: ['fx_a2'] });
  });
});

describe('audit with exposure', () => {
  it('emits W1 and caps the score when no exposure surface is configured', async () => {
    const report = await audit(pg.client as never, { schemas: ['fx_a2', 'fx_a7w'] });
    expect(report.exposure?.known).toBe(false);
    expect(report.findings.some((f) => f.code === 'W1')).toBe(true);
    expect(report.score?.value).toBeLessThanOrEqual(80);

    // a clean surface still can't exceed the unknown-exposure cap
    const clean = await audit(pg.client as never, { schemas: ['fx_does_not_exist'] });
    expect(clean.score?.value).toBe(80);
    expect(clean.score?.cappedByUnknownExposure).toBe(true);
  });

  it('partitions findings into exposed and internal, scoring only the exposed surface', async () => {
    const report = await audit(pg.client as never, {
      schemas: ['fx_a2', 'fx_a7w'],
      exposure: { schemas: ['fx_a2'] }
    });

    expect(report.exposure).toMatchObject({
      known: true,
      source: 'config',
      schemas: ['fx_a2'],
      exposedTables: 1,
      totalTables: 2
    });
    expect(report.findings.some((f) => f.code === 'W1')).toBe(false);

    const a2 = report.findings.find((f) => f.code === 'A2');
    expect(a2?.exposed).toBe(true);

    // the internal A7 critical must not appear in the score deductions or floor the grade
    const a7 = report.findings.find((f) => f.code === 'A7');
    expect(a7?.exposed).toBe(false);
    expect(report.score?.deductions.every((d) => d.code !== 'A7')).toBe(true);
    expect(report.score?.cappedByUnknownExposure).toBeUndefined();
  });

  it('the score improves when the leaky schema is not exposed', async () => {
    const internalLeak = await audit(pg.client as never, {
      schemas: ['fx_a2', 'fx_a7w'],
      exposure: { schemas: ['fx_a2'] }
    });
    const exposedLeak = await audit(pg.client as never, {
      schemas: ['fx_a2', 'fx_a7w'],
      exposure: { schemas: ['fx_a2', 'fx_a7w'] }
    });
    expect(internalLeak.score!.value).toBeGreaterThan(exposedLeak.score!.value);
  });
});
