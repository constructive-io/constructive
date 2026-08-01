import {
  compareReports,
  formatDelta,
  parseSnapshot,
  serializeSnapshot,
  toSnapshot
} from '../src/report/compare';
import { renderMarkdown } from '../src/report/markdown';
import { renderPretty } from '../src/report/pretty';
import { computeScore } from '../src/score/score';
import type { Finding, Report } from '../src/types';
import { summarize } from '../src/types';

function finding(over: Partial<Finding> = {}): Finding {
  return {
    code: 'A2',
    severity: 'high',
    category: 'flags',
    exposed: true,
    schema: 'app_public',
    table: 'widgets',
    message: 'grants exist on a table with RLS disabled',
    ...over
  };
}

function perfFinding(over: Partial<Finding> = {}): Finding {
  return finding({
    code: 'X1',
    severity: 'medium',
    category: 'index',
    dimension: 'perf',
    table: 'posts',
    message: 'foreign key posts_author_id_fkey has no covering index',
    ...over
  });
}

function makeReport(security: Finding[], perf: Finding[] = []): Report {
  const findings = [...security, ...perf];
  return {
    version: '1.0.0',
    generatedAt: '2026-01-01T00:00:00.000Z',
    summary: summarize(findings),
    findings,
    score: computeScore(security, undefined, { exposedTables: 10, exposureKnown: true }),
    ...(perf.length > 0 && {
      perf: {
        findings: perf,
        summary: summarize(perf),
        score: computeScore(perf, undefined, { exposedTables: 10, exposureKnown: true })
      }
    })
  };
}

describe('toSnapshot / parseSnapshot', () => {
  it('keeps the aggregates and drops the findings', () => {
    const snapshot = toSnapshot(makeReport([finding()], [perfFinding()]), { ref: 'main' });
    expect(snapshot.ref).toBe('main');
    expect(snapshot.security?.findings).toBe(1);
    expect(snapshot.security?.rules).toEqual({ A2: 1 });
    expect(snapshot.perf?.rules).toEqual({ X1: 1 });
    expect(JSON.stringify(snapshot)).not.toContain('has no covering index');
  });

  it('reads a full report as well as a snapshot, so CI can pass either', () => {
    const report = makeReport([finding()], [perfFinding()]);
    const fromReport = parseSnapshot(JSON.stringify(report));
    const fromSnapshot = parseSnapshot(serializeSnapshot(toSnapshot(report)));
    expect(fromSnapshot).toEqual(fromReport);
  });

  it('rejects JSON that is not a report', () => {
    expect(() => parseSnapshot('{"hello":"world"}')).toThrow(/not a safegres report/);
  });
});

describe('compareReports', () => {
  it('reports an improvement as a positive delta', () => {
    const before = toSnapshot(makeReport([finding(), finding({ table: 'orders' })]), {
      ref: 'main'
    });
    const after = makeReport([finding()]);
    const cmp = compareReports(before, after);

    expect(cmp.previous.ref).toBe('main');
    expect(cmp.security?.delta).toBeGreaterThan(0);
    expect(cmp.security?.findingsBefore).toBe(2);
    expect(cmp.security?.findingsAfter).toBe(1);
    expect(cmp.summary.high).toEqual({ before: 2, after: 1, delta: -1 });
    expect(cmp.rules).toEqual([
      { code: 'A2', dimension: 'security', before: 2, after: 1, delta: -1 }
    ]);
    expect(cmp.unchanged).toBe(false);
  });

  it('reports a regression as a negative delta and sorts it first', () => {
    const before = toSnapshot(makeReport([finding()], [perfFinding()]));
    const after = makeReport([finding()], [perfFinding(), perfFinding({ table: 'comments' })]);
    const cmp = compareReports(before, after);

    expect(cmp.perf?.delta).toBeLessThan(0);
    expect(cmp.rules[0]).toMatchObject({ code: 'X1', delta: 1, dimension: 'perf' });
  });

  it('notices a rule that appeared or disappeared entirely', () => {
    const before = toSnapshot(makeReport([finding()]));
    const after = makeReport([finding({ code: 'A5' })]);
    const cmp = compareReports(before, after);

    expect(cmp.rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'A5', before: 0, after: 1 }),
        expect.objectContaining({ code: 'A2', before: 1, after: 0 })
      ])
    );
  });

  it('is unchanged when nothing moved', () => {
    const report = makeReport([finding()], [perfFinding()]);
    const cmp = compareReports(toSnapshot(report), report);
    expect(cmp.unchanged).toBe(true);
    expect(cmp.security?.delta).toBe(0);
    expect(cmp.rules).toHaveLength(0);
  });

  it('tolerates a previous run that had no perf dimension', () => {
    const before = toSnapshot(makeReport([finding()]));
    const cmp = compareReports(before, makeReport([finding()], [perfFinding()]));
    expect(cmp.perf).toBeUndefined();
    expect(cmp.rules).toEqual([
      { code: 'X1', dimension: 'perf', before: 0, after: 1, delta: 1 }
    ]);
  });
});

describe('formatDelta', () => {
  it('uses a real minus sign and keeps zero unsigned', () => {
    expect(formatDelta(2.34, 1)).toBe('+2.3');
    expect(formatDelta(-2.34, 1)).toBe('−2.3');
    expect(formatDelta(0)).toBe('0');
  });
});

describe('rendering a comparison', () => {
  const previous = toSnapshot(
    makeReport([finding(), finding({ table: 'orders' })], [perfFinding()]),
    { ref: 'main' }
  );
  const report = makeReport([finding()], [perfFinding(), perfFinding({ table: 'comments' })]);
  report.comparison = compareReports(previous, report);

  it('adds a delta column to the score table without dropping a cell', () => {
    const out = renderMarkdown(report, { summary: true });
    expect(out).toContain('Δ vs main');
    const rows = out.split('\n').filter((l) => l.startsWith('| Security |') || l.startsWith('| Performance |'));
    expect(rows).toHaveLength(2);
    for (const row of rows) expect(row.split('|')).toHaveLength(7);
    expect(rows[0]).toContain('🟢 ▲');
    expect(rows[1]).toContain('🔴 ▼');
  });

  it('shows the grade transition and the per-rule movement', () => {
    const out = renderMarkdown(report, { summary: true });
    expect(out).toContain('Changes since main');
    expect(out).toMatch(/\| `X1` \| perf \| 1 \| 2 \| 🔴 ▲ \+1 \|/);
    expect(out).toMatch(/\| `A2` \| security \| 2 \| 1 \| 🟢 ▼ −1 \|/);
  });

  it('says so plainly when nothing changed', () => {
    const unchanged = makeReport([finding()]);
    unchanged.comparison = compareReports(toSnapshot(unchanged, { ref: 'main' }), unchanged);
    const out = renderMarkdown(unchanged, { summary: true });
    expect(out).toContain('No change since main');
    expect(out).not.toContain('Changes since');
  });

  it('renders without a comparison exactly as before', () => {
    const plain = makeReport([finding()]);
    expect(renderMarkdown(plain, { summary: true })).toContain(
      '| Dimension | Score | Grade | Top deductions |'
    );
  });

  it('puts the delta under the score in the terminal renderer', () => {
    const out = renderPretty(report, { color: false, summary: true });
    expect(out).toMatch(/Δ vs main: ▲ \+[\d.]+ \(from [\d.]+/);
    expect(out).toMatch(/Δ vs main: ▼ −[\d.]+/);
    expect(out).toContain('findings 1 → 2');
  });
});
