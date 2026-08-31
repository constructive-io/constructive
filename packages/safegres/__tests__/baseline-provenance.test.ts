/**
 * A delta is a claim about a change, and it is only checkable if the reader can
 * see which run it is against. These pin the one line that says so in each
 * renderer, and the note that replaces it when there is no baseline at all —
 * silence there reads as "nothing moved", which is how a delta measured against
 * a fortnight-old report went unnoticed for weeks.
 */

import { compareReports, describeBaseline, toSnapshot } from '../src/report/compare';
import { renderGithubComment, renderGithubSummary } from '../src/report/github';
import { renderMarkdown } from '../src/report/markdown';
import { renderPretty } from '../src/report/pretty';
import { computeScore } from '../src/score/score';
import type { Finding, Report } from '../src/types';
import { summarize } from '../src/types';

const PROVENANCE = {
  sha: 'af904c90d2d3f4a5b6c7d8e9f0',
  runId: '33373344814',
  runUrl: 'https://github.com/o/r/actions/runs/33373344814',
  age: '10.2 hours'
};

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

function makeReport(findings: Finding[]): Report {
  return {
    version: '1.0.0',
    generatedAt: '2026-01-01T00:00:00.000Z',
    summary: summarize(findings),
    findings,
    score: computeScore(findings, undefined, { exposedTables: 10, exposureKnown: true })
  };
}

/** A report with a delta against `main`, with and without provenance. */
function withComparison(provenance?: typeof PROVENANCE): Report {
  const previous = toSnapshot(makeReport([finding()]), {
    ref: 'main',
    ...(provenance && { provenance })
  });
  const report = makeReport([finding(), finding({ code: 'A5', severity: 'medium' })]);
  report.comparison = compareReports(previous, report);
  return report;
}

describe('describeBaseline', () => {
  it('names the ref, the commit, the run and the age', () => {
    expect(describeBaseline({ ref: 'main', provenance: PROVENANCE })).toBe(
      'main@af904c90d — [run 33373344814](https://github.com/o/r/actions/runs/33373344814), '
        + '10.2 hours old'
    );
  });

  it('drops the link where links do not render', () => {
    expect(describeBaseline({ ref: 'main', provenance: PROVENANCE }, { link: false })).toBe(
      'main@af904c90d — run 33373344814, 10.2 hours old'
    );
  });

  it('falls back to the report timestamp when the provider measured no age', () => {
    const described = describeBaseline(
      { ref: 'main', generatedAt: '2026-01-15T00:00:00.000Z' },
      { now: Date.parse('2026-01-15T12:00:00Z') }
    );
    expect(described).toBe('main — 12.0 hours old');
  });

  it('degrades to the bare ref, exactly as it read before', () => {
    expect(describeBaseline({ ref: 'main' })).toBe('main');
    expect(describeBaseline({})).toBe('the previous run');
  });
});

describe('provenance in the comparison', () => {
  it('travels from the snapshot into the comparison', () => {
    expect(withComparison(PROVENANCE).comparison?.previous.provenance).toEqual(PROVENANCE);
  });

  it('is absent when the caller supplied none', () => {
    expect(withComparison().comparison?.previous.provenance).toBeUndefined();
  });
});

describe('rendering the baseline', () => {
  it('heads the markdown delta with the run it is against', () => {
    const out = renderMarkdown(withComparison(PROVENANCE), { summary: true });
    expect(out).toContain(
      'Changes since main@af904c90d — [run 33373344814]'
        + '(https://github.com/o/r/actions/runs/33373344814), 10.2 hours old'
    );
  });

  it('names it in the PR comment too, so both agree', () => {
    const out = renderGithubComment(withComparison(PROVENANCE));
    expect(out).toContain('**Changes since main@af904c90d — [run 33373344814]');
  });

  it('names it in the job summary', () => {
    expect(renderGithubSummary(withComparison(PROVENANCE))).toContain('main@af904c90d');
  });

  it('shows the commit beside the terminal delta and the run below it', () => {
    const out = renderPretty(withComparison(PROVENANCE), { color: false, summary: true });
    expect(out).toContain('Δ vs main@af904c90d:');
    expect(out).toContain('baseline: main@af904c90d — run 33373344814, 10.2 hours old');
  });

  it('reads exactly as it used to when there is no provenance', () => {
    const out = renderMarkdown(withComparison(), { summary: true });
    expect(out).toContain('Changes since main');
    expect(out).not.toContain('run ');
  });
});

describe('rendering no baseline at all', () => {
  const REASON = 'no run within 2.0 days whose head is an ancestor of merge base 60f238e19';

  it('says why in markdown, and that the gates still apply', () => {
    const report = makeReport([finding()]);
    report.comparisonSkipped = REASON;
    const out = renderMarkdown(report, { summary: true });
    expect(out).toContain(`No delta baseline: ${REASON}.`);
    expect(out).toContain('absolute score and the perf baseline still gate this run');
  });

  it('says why in the PR comment', () => {
    const report = makeReport([finding()]);
    report.comparisonSkipped = REASON;
    expect(renderGithubComment(report)).toContain(`No delta baseline: ${REASON}`);
  });

  it('says why in the terminal', () => {
    const report = makeReport([finding()]);
    report.comparisonSkipped = REASON;
    expect(renderPretty(report, { color: false, summary: true })).toContain(
      `no delta baseline: ${REASON}`
    );
  });

  it('stays quiet when no comparison was ever asked for', () => {
    const out = renderMarkdown(makeReport([finding()]), { summary: true });
    expect(out).not.toContain('No delta baseline');
  });
});
