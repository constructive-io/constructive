import { renderMarkdown } from '../src/report/markdown';
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

function makeReport(over: Partial<Report> = {}): Report {
  const findings = over.findings ?? [
    finding(),
    finding({ schema: 'db_migrate', table: 'log', exposed: false })
  ];
  return {
    version: '1.0.0',
    generatedAt: '2026-01-01T00:00:00.000Z',
    summary: summarize(findings),
    findings,
    score: computeScore(findings, undefined, { exposedTables: 10, exposureKnown: true }),
    ...over
  };
}

describe('renderMarkdown', () => {
  it('leads with a score table and severity counts', () => {
    const out = renderMarkdown(makeReport());
    expect(out).toContain('## safegres');
    expect(out).toMatch(/\| Dimension \| Score \| Grade \| Top deductions \|/);
    expect(out).toMatch(/\| Security \| \*\*[\d.]+\*\* \| \*\*[A-D+]+\*\* \|/);
    expect(out).toContain('| 🔴 critical | 🟠 high |');
  });

  it('renders findings as a table and collapses internal advisories', () => {
    const out = renderMarkdown(makeReport());
    expect(out).toContain('| 🟠 high | `A2` | app_public.widgets |');
    expect(out).toContain('<details><summary>1 internal advisory');
    // still present, but behind the fold
    expect(out).toContain('db_migrate.log');
  });

  it('--verbose lifts the internal advisories out of the fold', () => {
    const out = renderMarkdown(makeReport(), { verbose: true });
    expect(out).not.toContain('<details>');
    expect(out).toContain('db_migrate.log');
  });

  it('--summary stops after the counts', () => {
    const out = renderMarkdown(makeReport(), { summary: true });
    expect(out).toContain('| 🔴 critical |');
    expect(out).not.toContain('app_public.widgets');
  });

  it('warns when the exposure surface is unknown', () => {
    const out = renderMarkdown(
      makeReport({
        exposure: {
          known: false,
          source: 'none',
          schemas: [],
          exposedTables: 0,
          totalTables: 12
        }
      })
    );
    expect(out).toContain('> [!WARNING]');
    expect(out).toContain('score is capped');
  });

  it('keeps a message containing a pipe inside its cell', () => {
    const out = renderMarkdown(
      makeReport({ findings: [finding({ message: 'policy uses a | b\n  wrapped' })] })
    );
    expect(out).toContain('policy uses a \\| b wrapped');
    expect(out.split('\n').filter((l) => l.startsWith('| 🟠'))).toHaveLength(1);
  });

  it('renders the perf dimension, its provenance, and the baseline diff', () => {
    const perfFinding = finding({
      code: 'X1',
      severity: 'medium',
      category: 'index',
      dimension: 'perf',
      table: 'posts',
      message: 'foreign key posts_author_id_fkey has no covering index'
    });
    const report = makeReport({
      findings: [finding(), perfFinding],
      perf: {
        findings: [perfFinding],
        summary: summarize([perfFinding]),
        score: computeScore([perfFinding], undefined, { exposedTables: 10, exposureKnown: true }),
        stats: { source: 'live', tables: 4, statsReset: '2026-01-01T00:00:00.000Z', scored: true },
        explain: { probed: 3, confirmed: 1, refuted: 1, inconclusive: 1 },
        diff: { added: [perfFinding], removed: [], accepted: [] }
      }
    });
    const out = renderMarkdown(report);
    expect(out).toContain('| Performance | ');
    expect(out).toContain('### Performance findings');
    expect(out).toContain('| 🟡 medium | `X1` | app_public.posts |');
    // the security table must not carry the perf finding
    const securitySection = out.slice(
      out.indexOf('### Security findings'),
      out.indexOf('### Performance findings')
    );
    expect(securitySection).not.toContain('X1');
    expect(out).toContain('Runtime statistics: 4 tables, counters since 2026-01-01');
    expect(out).toContain('Planner proof: 1 confirmed, 1 refuted, 1 inconclusive of 3 probed');
    expect(out).toContain('**1 new** since the baseline');
  });

  it('says so when there is nothing to report', () => {
    const out = renderMarkdown(makeReport({ findings: [], score: undefined }));
    expect(out).toContain('No findings.');
  });
});
