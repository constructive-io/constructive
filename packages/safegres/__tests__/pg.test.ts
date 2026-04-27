import * as fs from 'fs';
import * as path from 'path';

import { getConnections, PgTestClient } from 'pgsql-test';

import { auditPg } from '../src/commands/pg';
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

describe('auditPg — Script A', () => {
  it('A1: flags RLS enabled with zero policies', async () => {
    await applyFixture('a1-rls-enabled-no-policies.sql');
    const report = await auditPg(pg.client as never, { schemas: ['fx_a1'] });
    const found = findingsFor(report.findings, 'fx_a1');
    expect(codes(found)).toEqual(expect.arrayContaining(['A1']));
    expect(found.find((f) => f.code === 'A1')?.severity).toBe('critical');
  });

  it('A2: flags grants on table with RLS disabled', async () => {
    await applyFixture('a2-grants-no-rls.sql');
    const report = await auditPg(pg.client as never, { schemas: ['fx_a2'] });
    const found = findingsFor(report.findings, 'fx_a2');
    const a2 = found.find((f) => f.code === 'A2');
    expect(a2).toBeDefined();
    expect(a2?.severity).toBe('high');
    expect((a2?.context as { roles?: string[] } | undefined)?.roles).toContain('fx_a2_reader');
  });

  it('A3: flags RLS enabled but not forced', async () => {
    await applyFixture('a3-rls-not-forced.sql');
    const report = await auditPg(pg.client as never, { schemas: ['fx_a3'] });
    const found = findingsFor(report.findings, 'fx_a3');
    expect(codes(found)).toEqual(expect.arrayContaining(['A3']));
  });

  it('A4: flags INSERT grant with no matching policy', async () => {
    await applyFixture('a4-insert-grant-no-policy.sql');
    const report = await auditPg(pg.client as never, { schemas: ['fx_a4'] });
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
    const report = await auditPg(pg.client as never, { schemas: ['fx_a6'] });
    const found = findingsFor(report.findings, 'fx_a6');
    const a6 = found.find((f) => f.code === 'A6');
    expect(a6).toBeDefined();
    expect(a6?.severity).toBe('info');
    expect(a6?.role).toBe('fx_a6_editor');
    expect(a6?.privilege).toBe('UPDATE');
  });

  it('A7: flags permissive policy with body = literal true (fail-open)', async () => {
    await applyFixture('a7-trivially-permissive.sql');
    const report = await auditPg(pg.client as never, { schemas: ['fx_a7'] });
    const found = findingsFor(report.findings, 'fx_a7');
    const a7 = found.find((f) => f.code === 'A7');
    expect(a7).toBeDefined();
    expect(a7?.severity).toBe('high');
    expect(a7?.policy).toBe('fx_a7_open');
    expect((a7?.context as { clauses?: string[] } | undefined)?.clauses).toEqual(['USING']);
  });

  it('P1: flags policy using VOLATILE function', async () => {
    await applyFixture('p1-volatile-func.sql');
    const report = await auditPg(pg.client as never, { schemas: ['fx_p1'] });
    const found = findingsFor(report.findings, 'fx_p1');
    const p1 = found.find((f) => f.code === 'P1');
    expect(p1).toBeDefined();
    expect(p1?.severity).toBe('high');
    expect((p1?.context as { function?: string } | undefined)?.function).toBe('fx_p1.slow_auth_lookup');
  });

  it('P5: flags current_user reference in policy', async () => {
    await applyFixture('p5-session-user.sql');
    const report = await auditPg(pg.client as never, { schemas: ['fx_p5'] });
    const found = findingsFor(report.findings, 'fx_p5');
    const p5 = found.find((f) => f.code === 'P5');
    expect(p5).toBeDefined();
    expect(p5?.severity).toBe('high');
  });

  it('clean table produces no findings', async () => {
    await applyFixture('clean-table.sql');
    const report = await auditPg(pg.client as never, { schemas: ['fx_clean'] });
    const found = findingsFor(report.findings, 'fx_clean');
    expect(found).toEqual([]);
  });
});
