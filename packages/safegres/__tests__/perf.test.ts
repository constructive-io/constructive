import * as fs from 'fs';
import * as path from 'path';
import { getConnections, PgTestClient } from 'pgsql-test';

import { audit } from '../src/commands/audit';
import { ConfigValidationError, resolveRules } from '../src/config/resolve';
import type { Finding } from '../src/types';

jest.setTimeout(120000);

let pg: PgTestClient;
let teardown: () => Promise<void>;

async function applyFixture(name: string): Promise<void> {
  const filepath = path.join(__dirname, 'fixtures', name);
  await pg.any(fs.readFileSync(filepath, 'utf8'));
}

function tablesFor(findings: Finding[], code: string): string[] {
  return findings.filter((f) => f.code === code).map((f) => `${f.schema}.${f.table}`).sort();
}

beforeAll(async () => {
  ({ pg, teardown } = await getConnections());
});

afterAll(async () => {
  if (teardown) await teardown();
});

describe('perf dimension', () => {
  it('is off by default — no X rules, no perf report', async () => {
    await applyFixture('x1-fk-no-index.sql');
    const report = await audit(pg.client as never, { schemas: ['fx_x1'] });
    expect(report.perf).toBeUndefined();
    expect(report.findings.filter((f) => f.code.startsWith('X'))).toHaveLength(0);
  });

  it('X1: flags foreign keys with no covering index', async () => {
    const report = await audit(pg.client as never, { schemas: ['fx_x1'], perf: true });
    expect(tablesFor(report.perf!.findings, 'X1')).toEqual(['fx_x1.pairs', 'fx_x1.posts']);

    const posts = report.perf!.findings.find((f) => f.code === 'X1' && f.table === 'posts');
    expect(posts?.severity).toBe('medium');
    expect(posts?.dimension).toBe('perf');
    expect(posts?.context).toMatchObject({ columns: ['author_id'] });
  });

  it('X5: flags duplicate and prefix indexes, not unique/partial/expression ones', async () => {
    await applyFixture('x5-redundant-index.sql');
    const report = await audit(pg.client as never, { schemas: ['fx_x5'], perf: true });
    const names = report.perf!.findings
      .filter((f) => f.code === 'X5')
      .map((f) => (f.context as { index: string }).index)
      .sort();
    expect(names).toEqual([
      'widgets_tenant_a_idx',
      'widgets_tenant_b_idx',
      'widgets_tenant_idx'
    ]);
    const duplicate = report.perf!.findings.find(
      (f) => f.code === 'X5' && (f.context as { index: string }).index === 'widgets_tenant_b_idx'
    );
    expect(duplicate?.context).toMatchObject({ coveredBy: 'widgets_tenant_a_idx', duplicate: true });
  });

  it('X6: flags tables with no primary key and no replica identity', async () => {
    await applyFixture('x6-no-primary-key.sql');
    const report = await audit(pg.client as never, { schemas: ['fx_x6'], perf: true });
    expect(tablesFor(report.perf!.findings, 'X6')).toEqual(['fx_x6.events']);
  });

  it('scores perf separately from security and keeps both in report.findings', async () => {
    const report = await audit(pg.client as never, { schemas: ['fx_x1', 'fx_x5', 'fx_x6'], perf: true });
    expect(report.perf!.score.value).toBeLessThan(100);
    expect(report.perf!.score.deductions.map((d) => d.code)).toEqual(
      expect.arrayContaining(['X1'])
    );
    // The security score never sees perf findings.
    expect(report.score!.deductions.some((d) => d.code.startsWith('X'))).toBe(false);
    expect(report.findings.some((f) => f.code === 'X1')).toBe(true);
    expect(report.perf!.findings.every((f) => f.dimension === 'perf')).toBe(true);
  });

  it('perf.ignore acknowledges declared perf debt', async () => {
    const report = await audit(pg.client as never, {
      schemas: ['fx_x1'],
      perf: true,
      config: { perf: { ignore: ['fx_x1.*'] } }
    });
    const x1 = report.perf!.findings.filter((f) => f.code === 'X1');
    expect(x1.length).toBeGreaterThan(0);
    expect(x1.every((f) => f.acknowledged && f.severity === 'info')).toBe(true);
    // Nothing left to deduct (the score itself is still capped by the unknown
    // exposure surface these fixtures run without).
    expect(report.perf!.score.deductions).toHaveLength(0);
  });

  it('perf.rules retunes perf rules only', async () => {
    const report = await audit(pg.client as never, {
      schemas: ['fx_x1'],
      perf: true,
      config: { perf: { rules: { X1: 'off' } } }
    });
    expect(report.perf!.findings.filter((f) => f.code === 'X1')).toHaveLength(0);

    expect(() => resolveRules({ perf: { rules: { A2: 'off' } } })).toThrow(ConfigValidationError);
  });
});

describe('P1/P1b re-homed to the perf dimension', () => {
  it('keeps P1 out of the security score', async () => {
    await applyFixture('p1-volatile-func.sql');
    const report = await audit(pg.client as never, { schemas: ['fx_p1'], perf: true });
    const p1 = report.findings.find((f) => f.code === 'P1');
    expect(p1?.dimension).toBe('perf');
    expect(report.perf!.findings).toContain(p1);
    expect(report.score!.deductions.some((d) => d.code === 'P1')).toBe(false);
  });
});
