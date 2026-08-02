import { renderMarkdown } from '../src/report/markdown';
import { renderPretty } from '../src/report/pretty';
import { matchPlane, selectView } from '../src/report/view';
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

function plane(over: Partial<PlaneReport> = {}): PlaneReport {
  const findings = [finding({ schema: 'app_private', table: 'ledger' })];
  return {
    name: 'direct:app',
    kind: 'role',
    primary: false,
    source: 'config',
    schemas: ['app_private'],
    roles: ['app_user'],
    exposedTables: 4,
    reachedVia: 'grant',
    score: computeScore(findings, undefined, { exposedTables: 4, exposureKnown: true }),
    summary: summarize(findings),
    ...over
  };
}

function makeReport(over: Partial<Report> = {}): Report {
  const findings = over.findings ?? [
    finding(),
    finding({ schema: 'app_private', table: 'ledger', exposed: false })
  ];
  const score = computeScore(findings, undefined, { exposedTables: 10, exposureKnown: true });
  return {
    version: '1.0.0',
    generatedAt: '2026-01-01T00:00:00.000Z',
    summary: summarize(findings),
    findings,
    score,
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
      plane()
    ],
    ...over
  };
}

describe('matchPlane', () => {
  it('matches names and globs', () => {
    expect(matchPlane('direct:app', 'direct:app')).toBe(true);
    expect(matchPlane('direct:*', 'direct:app')).toBe(true);
    expect(matchPlane('*', 'anything')).toBe(true);
    expect(matchPlane('direct:*', 'api')).toBe(false);
    // a glob is not a regex: the dot is literal
    expect(matchPlane('a.b', 'axb')).toBe(false);
  });
});

describe('selectView', () => {
  it('lists secondary planes but keeps them out of the headline scores', () => {
    const view = selectView(makeReport());
    expect(view.scores.map((s) => s.id)).toEqual(['security']);
    expect(view.planes.map((p) => p.name)).toEqual(['direct:app']);
    expect(view.expandedPlanes).toHaveLength(0);
    expect(view.has('planes')).toBe(true);
  });

  it('adds a score for each expanded plane', () => {
    const view = selectView(makeReport(), { planes: ['direct:*'] });
    expect(view.scores.map((s) => s.id)).toEqual(['security', 'plane:direct:app']);
    expect(view.expandedPlanes.map((p) => p.name)).toEqual(['direct:app']);
  });

  it('honors the dimension and section selection', () => {
    const view = selectView(makeReport(), { dimensions: [], sections: ['scores'] });
    expect(view.scores).toHaveLength(0);
    expect(view.has('planes')).toBe(false);
    expect(view.has('scores')).toBe(true);
  });

  it('exposedOnly hides internal advisories without editing the report', () => {
    const report = makeReport();
    const view = selectView(report, { exposedOnly: true });
    expect(view.security.internal).toHaveLength(0);
    expect(report.findings).toHaveLength(2);
  });

  it('summary detail suppresses the findings section', () => {
    expect(selectView(makeReport(), { detail: 'summary' }).has('findings')).toBe(false);
  });
});

describe('renderers read the view', () => {
  it('pretty summarizes planes in one advisory line each', () => {
    const out = renderPretty(makeReport(), { color: false });
    expect(out).toContain('other access planes — advisory, not part of the score above:');
    expect(out).toMatch(/direct:app \[role\] \(app_user\):/);
    expect(out).toContain('--plane <name>');
  });

  it('pretty expands the plane asked for', () => {
    const out = renderPretty(makeReport(), { color: false, planes: ['direct:app'] });
    expect(out).toContain('plane direct:app:');
    expect(out).toMatch(/top deductions: A2/);
  });

  it('markdown renders the planes table', () => {
    const out = renderMarkdown(makeReport());
    expect(out).toContain('### Other access planes');
    expect(out).toContain('| `direct:app` | role | `app_user` (via grant) | 4 |');
  });

  it('markdown says why a plane was not graded', () => {
    const report = makeReport();
    report.planes![1] = plane({ skipped: 'app_admin bypasses row-level security' });
    const out = renderMarkdown(report);
    expect(out).toContain('not graded — app_admin bypasses row-level security');
  });
});
