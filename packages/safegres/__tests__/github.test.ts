import {
  COMMENT_MARKER,
  renderAnnotations,
  renderGithubComment,
  renderGithubSummary,
  scoreBadge
} from '../src/report/github';
import { computeScore } from '../src/score/score';
import type { Finding, PlaneReport, Report } from '../src/types';
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
  const findings = over.findings ?? [finding()];
  const score = computeScore(findings, undefined, { exposedTables: 10, exposureKnown: true });
  const secondary: PlaneReport = {
    name: 'direct:app',
    kind: 'role',
    primary: false,
    source: 'config',
    schemas: ['app_private'],
    roles: ['app_user'],
    exposedTables: 3,
    score: computeScore(findings, undefined, { exposedTables: 3, exposureKnown: true }),
    summary: summarize(findings)
  };
  return {
    version: '1.0.0',
    generatedAt: '2026-01-01T00:00:00.000Z',
    summary: summarize(findings),
    findings,
    score,
    exposure: {
      known: true,
      source: 'config',
      plane: 'api',
      schemas: ['app_public'],
      exposedTables: 10,
      totalTables: 12
    },
    planes: [
      {
        name: 'api',
        kind: 'api',
        primary: true,
        source: 'config',
        schemas: ['app_public'],
        exposedTables: 10,
        score,
        summary: summarize(findings)
      },
      secondary
    ],
    ...over
  };
}

describe('scoreBadge', () => {
  it('renders a shields.io image colored by grade', () => {
    const score = computeScore([], undefined, { exposedTables: 10, exposureKnown: true });
    expect(scoreBadge('Security', score, true)).toContain('img.shields.io/badge/Security-');
    expect(scoreBadge('Security', score, true)).toContain('brightgreen');
  });

  it('falls back to a colored dot when badges are off', () => {
    const score = computeScore([], undefined, { exposedTables: 10, exposureKnown: true });
    expect(scoreBadge('Security', score, false)).toMatch(/^🟢 \*\*Security 100 \(A\+\)\*\*$/);
  });
});

describe('renderGithubSummary', () => {
  it('leads with badges for the configured scores', () => {
    const out = renderGithubSummary(makeReport());
    expect(out.split('\n')[0]).toContain('img.shields.io/badge/Security-');
    expect(out).toContain('## safegres');
  });

  it('badges a secondary plane when the config asks for it', () => {
    const out = renderGithubSummary(makeReport(), {
      config: { summary: ['security', 'planes:direct:*'] }
    });
    expect(out.split('\n')[0]).toContain('badge/direct%3Aapp-');
  });
});

describe('renderGithubComment', () => {
  it('is sticky and carries scores without the finding tables', () => {
    const out = renderGithubComment(makeReport());
    expect(out.startsWith(COMMENT_MARKER)).toBe(true);
    expect(out).toContain('Exposure (config): **10/12** tables reachable.');
    expect(out).not.toContain('### Security findings');
  });

  it('reports the delta when the run was compared', () => {
    const report = makeReport();
    report.comparison = {
      previous: { ref: 'main' },
      summary: {
        critical: { before: 0, after: 0, delta: 0 },
        high: { before: 2, after: 1, delta: -1 },
        medium: { before: 0, after: 0, delta: 0 },
        low: { before: 0, after: 0, delta: 0 },
        info: { before: 0, after: 0, delta: 0 }
      },
      rules: [],
      security: {
        before: 80,
        after: 90,
        delta: 10,
        gradeBefore: 'B',
        gradeAfter: 'A',
        findingsBefore: 2,
        findingsAfter: 1
      },
      unchanged: false
    };
    const out = renderGithubComment(report);
    expect(out).toContain('**Changes since main**');
    expect(out).toContain('- security: 🟢 ▲ +10.0 (80 → 90, B → A)');
  });

  it('lists the planes when asked', () => {
    const out = renderGithubComment(makeReport(), {
      config: { comment: { sections: ['planes'] } }
    });
    expect(out).toContain('| `direct:app` | role | 3 |');
  });
});

describe('renderAnnotations', () => {
  it('annotates only what failed a gate by default', () => {
    const report = makeReport();
    expect(renderAnnotations(report)).toEqual([]);
    expect(renderAnnotations(report, { gateFailures: report.findings })).toEqual([
      '::error title=A2 app_public.widgets::grants exist on a table with RLS disabled'
    ]);
  });

  it('annotates everything exposed in "all" mode, and nothing in "none"', () => {
    const report = makeReport({
      findings: [finding(), finding({ code: 'A3', severity: 'low', exposed: false })]
    });
    expect(renderAnnotations(report, { config: { annotations: 'all' } })).toHaveLength(1);
    expect(renderAnnotations(report, { config: { annotations: 'none' } })).toEqual([]);
  });
});
