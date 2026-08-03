import * as fs from 'fs';
import * as path from 'path';
import { getConnections, PgTestClient } from 'pgsql-test';

import { audit } from '../src/commands/audit';
import type { Finding } from '../src/types';

jest.setTimeout(120000);

let pg: PgTestClient;
let teardown: () => Promise<void>;

async function applyFixture(name: string): Promise<void> {
  const filepath = path.join(__dirname, 'fixtures', name);
  const sql = fs.readFileSync(filepath, 'utf8');
  await pg.any(sql);
}

function findingsFor(findings: Finding[], schema: string): Finding[] {
  return findings.filter((f) => f.schema === schema);
}

function codes(findings: Finding[]): string[] {
  return findings.map((f) => f.code).sort();
}

beforeAll(async () => {
  ({ pg, teardown } = await getConnections());
});

afterAll(async () => {
  if (teardown) await teardown();
});

describe('audit — Script A', () => {
  it('A1: flags RLS enabled with zero policies', async () => {
    await applyFixture('a1-rls-enabled-no-policies.sql');
    const report = await audit(pg.client as never, { schemas: ['fx_a1'] });
    const found = findingsFor(report.findings, 'fx_a1');
    expect(codes(found)).toEqual(expect.arrayContaining(['A1']));
    const a1 = found.find((f) => f.code === 'A1');
    expect(a1?.severity).toBe('low');
    expect(a1?.direction).toBe('fail-closed');
  });

  it('A2: flags grants on table with RLS disabled', async () => {
    await applyFixture('a2-grants-no-rls.sql');
    const report = await audit(pg.client as never, { schemas: ['fx_a2'] });
    const found = findingsFor(report.findings, 'fx_a2');
    const a2 = found.find((f) => f.code === 'A2');
    expect(a2).toBeDefined();
    expect(a2?.severity).toBe('high');
    expect((a2?.context as { roles?: string[] } | undefined)?.roles).toContain('fx_a2_reader');
  });

  it('A3: flags RLS enabled but not forced', async () => {
    await applyFixture('a3-rls-not-forced.sql');
    const report = await audit(pg.client as never, { schemas: ['fx_a3'] });
    const found = findingsFor(report.findings, 'fx_a3');
    expect(codes(found)).toEqual(expect.arrayContaining(['A3']));
  });

  it('A4: flags INSERT grant with no matching policy', async () => {
    await applyFixture('a4-insert-grant-no-policy.sql');
    const report = await audit(pg.client as never, { schemas: ['fx_a4'] });
    const found = findingsFor(report.findings, 'fx_a4');
    const a4 = found.find((f) => f.code === 'A4');
    expect(a4).toBeDefined();
    expect(a4?.role).toBe('fx_a4_writer');
    expect(a4?.privilege).toBe('INSERT');
    // SELECT is covered so A5 shouldn't fire for SELECT
    expect(found.find((f) => f.code === 'A5' && f.privilege === 'SELECT')).toBeUndefined();
  });

  it('A6: flags UPDATE coverage missing WITH CHECK for role', async () => {
    await applyFixture('a6-update-no-with-check.sql');
    const report = await audit(pg.client as never, { schemas: ['fx_a6'] });
    const found = findingsFor(report.findings, 'fx_a6');
    const a6 = found.find((f) => f.code === 'A6');
    expect(a6).toBeDefined();
    expect(a6?.severity).toBe('info');
    expect(a6?.role).toBe('fx_a6_editor');
    expect(a6?.privilege).toBe('UPDATE');
  });

  it('A8: flags SELECT-only permissive policy with body = literal true (public read)', async () => {
    await applyFixture('a7-trivially-permissive.sql');
    const report = await audit(pg.client as never, { schemas: ['fx_a7'] });
    const found = findingsFor(report.findings, 'fx_a7');
    const a8 = found.find((f) => f.code === 'A8');
    expect(a8).toBeDefined();
    expect(a8?.severity).toBe('low');
    expect(a8?.policy).toBe('fx_a7_open');
    expect((a8?.context as { clauses?: string[] } | undefined)?.clauses).toEqual(['USING']);
    // SELECT-only literal-true is A8, never A7
    expect(found.find((f) => f.code === 'A7')).toBeUndefined();
  });

  it('public.read: declared open read is acknowledged (info) and unscored', async () => {
    // fx_a7 fixture (open SELECT policy) was applied by the A8 test above.
    const exposure = { schemas: ['fx_a7'] };
    const undeclared = await audit(pg.client as never, {
      schemas: ['fx_a7'],
      config: { exposure }
    });
    const declared = await audit(pg.client as never, {
      schemas: ['fx_a7'],
      config: { exposure, public: { read: ['fx_a7.*'] } }
    });

    const a8 = declared.findings.find((f) => f.code === 'A8' && f.schema === 'fx_a7');
    expect(a8).toBeDefined();
    expect(a8?.acknowledged).toBe(true);
    expect(a8?.severity).toBe('info');
    expect(a8?.message).toContain('declared public read');

    const undeclaredA8 = undeclared.findings.find((f) => f.code === 'A8' && f.schema === 'fx_a7');
    expect(undeclaredA8?.acknowledged).toBeUndefined();
    expect(undeclaredA8?.severity).toBe('low');
    expect(declared.score!.value).toBeGreaterThan(undeclared.score!.value);
  });

  it('A7: flags trivially-permissive WRITE policy as critical (fail-open)', async () => {
    await applyFixture('a7-write-permissive.sql');
    const report = await audit(pg.client as never, { schemas: ['fx_a7w'] });
    const found = findingsFor(report.findings, 'fx_a7w');
    const a7 = found.find((f) => f.code === 'A7');
    expect(a7).toBeDefined();
    expect(a7?.severity).toBe('critical');
    expect(a7?.direction).toBe('fail-open');
    expect(a7?.policy).toBe('fx_a7w_open_write');
  });

  it('P1: flags policy using VOLATILE function', async () => {
    await applyFixture('p1-volatile-func.sql');
    const report = await audit(pg.client as never, { schemas: ['fx_p1'] });
    const found = findingsFor(report.findings, 'fx_p1');
    const p1 = found.find((f) => f.code === 'P1');
    expect(p1).toBeDefined();
    expect(p1?.severity).toBe('high');
    expect((p1?.context as { function?: string } | undefined)?.function).toBe('fx_p1.slow_auth_lookup');
  });

  it('P5: flags current_user reference in policy', async () => {
    await applyFixture('p5-session-user.sql');
    const report = await audit(pg.client as never, { schemas: ['fx_p5'] });
    const found = findingsFor(report.findings, 'fx_p5');
    const p5 = found.find((f) => f.code === 'P5');
    expect(p5).toBeDefined();
    expect(p5?.severity).toBe('high');
  });

  it('carries scorecards without narrowing the findings they score', async () => {
    // Over the fixtures already applied above: an `A*` card must not become
    // the whole report just because it is the card being read.
    const report = await audit(pg.client as never, {
      schemas: ['fx_a2', 'fx_p5'],
      config: {
        scorecards: {
          'flags-only': { select: { rules: ['A*'], exposure: 'all' } }
        }
      }
    });

    const names = (report.scorecards ?? []).map((c) => c.name);
    expect(names).toEqual(['default', 'raw', 'flags-only']);

    const card = report.scorecards!.find((c) => c.name === 'flags-only')!;
    expect(card.findings).toBeGreaterThan(0);
    expect(card.score.deductions.every((d) => d.code.startsWith('A'))).toBe(true);

    // The selector grades a slice; the report still carries everything.
    expect(report.findings.length).toBeGreaterThanOrEqual(card.findings);
    expect(report.findings.some((f) => !f.code.startsWith('A'))).toBe(true);
  });

  it('clean table produces no findings', async () => {
    await applyFixture('clean-table.sql');
    const report = await audit(pg.client as never, { schemas: ['fx_clean'] });
    const found = findingsFor(report.findings, 'fx_clean');
    expect(found).toEqual([]);
  });
});
