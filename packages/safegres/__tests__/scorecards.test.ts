import { computeScore } from '../src/score/score';
import {
  computeScorecards,
  RESERVED_SCORECARDS,
  selectFindings
} from '../src/score/scorecards';
import type { Finding } from '../src/types';

function finding(over: Partial<Finding> = {}): Finding {
  return {
    code: 'A2',
    severity: 'high',
    category: 'flags',
    direction: 'fail-open',
    exposed: true,
    schema: 'app_public',
    table: 'widgets',
    message: 'test',
    ...over
  };
}

const context = { exposedTables: 100, totalTables: 200, exposureKnown: true };

function cards(findings: Finding[], config = {}) {
  const headline = computeScore(findings, {}, context);
  const report = computeScorecards(
    findings,
    headline,
    { ...RESERVED_SCORECARDS, ...config },
    context
  );
  return Object.fromEntries(report.map((c) => [c.name, c]));
}

describe('scorecards', () => {
  it('always carries default and raw, whatever the config says', () => {
    const byName = cards([finding()]);
    expect(Object.keys(byName)).toEqual(['default', 'raw']);
    expect(byName.default.reserved).toBe(true);
    expect(byName.raw.reserved).toBe(true);
  });

  it('default is the headline verbatim — a scorecard block cannot move the badge', () => {
    const findings = [finding(), finding({ code: 'A5', severity: 'critical' })];
    const headline = computeScore(findings, {}, context);
    const byName = cards(findings, {
      // A card that would love the headline to be a 100.
      default: { weights: { critical: 0, high: 0 } }
    });
    expect(byName.default.score).toEqual(headline);
    expect(byName.default.score.value).toBeLessThan(100);
  });

  it('raw ignores exposure, acknowledgement and preset severities', () => {
    const findings = [
      // Everything the headline discounts, one of each.
      finding({ code: 'A2', exposed: false }),
      finding({ code: 'A5', acknowledged: true }),
      // A preset quieted A3 to info; the registry declares it `low`.
      finding({ code: 'A3', severity: 'info' }),
      finding({ code: 'A4', direction: 'fail-closed' })
    ];
    const byName = cards(findings);

    expect(byName.default.score.value).toBe(100);
    expect(byName.raw.findings).toBe(4);
    expect(byName.raw.score.value).toBeLessThan(100);
    expect(byName.raw.score.deductions.find((d) => d.code === 'A3')?.points).toBeGreaterThan(0);
  });

  it('grades a team question: one rule set, its own weighting and gate', () => {
    const findings = [
      ...Array.from({ length: 12 }, (_, i) => finding({ code: 'C4', severity: 'low', table: `t${i}` })),
      finding({ code: 'A2', severity: 'critical' })
    ];
    const byName = cards(findings, {
      'sql-conventions': {
        description: 'House style.',
        select: { rules: ['C*'] },
        weights: { low: 8 },
        floorOnCritical: false
      }
    });

    const card = byName['sql-conventions'];
    expect(card.findings).toBe(12);
    expect(card.description).toBe('House style.');
    // The critical is somebody else's problem: this card grades C* only.
    expect(card.score.deductions.map((d) => d.code)).toEqual(['C4']);
    expect(card.score.value).toBeLessThan(byName.default.score.value);
  });

  it('selects by role, wherever the finding recorded it', () => {
    const findings = [
      finding({ code: 'R1', role: 'anonymous' }),
      finding({ code: 'L19', context: { role: 'anonymous', function: 'p.f' } }),
      finding({ code: 'L1', context: { roles: ['authenticated', 'anonymous'] } }),
      finding({ code: 'A2', role: 'authenticated' })
    ];
    expect(selectFindings(findings, { roles: ['anonymous'] }).map((f) => f.code))
      .toEqual(['R1', 'L19', 'L1']);
  });

  it('narrows on planes, schemas, direction and severity', () => {
    const findings = [
      finding({ code: 'A2', planes: ['api'], schema: 'app_public' }),
      finding({ code: 'A5', planes: ['direct:app'], schema: 'app_public' }),
      finding({ code: 'A4', planes: ['api'], schema: 'private', direction: 'fail-closed' }),
      finding({ code: 'A6', planes: ['api'], schema: 'app_public', severity: 'low' })
    ];
    expect(selectFindings(findings, { planes: ['api'] }).map((f) => f.code))
      .toEqual(['A2', 'A4', 'A6']);
    expect(selectFindings(findings, { schemas: ['private'] }).map((f) => f.code)).toEqual(['A4']);
    expect(selectFindings(findings, { direction: 'fail-closed' }).map((f) => f.code)).toEqual(['A4']);
    expect(selectFindings(findings, { minSeverity: 'high' }).map((f) => f.code))
      .toEqual(['A2', 'A5', 'A4']);
  });

  it('excludes after including, so a wildcard can carve out one rule', () => {
    const findings = ['C1', 'C2', 'C3', 'C4', 'A2'].map((code) => finding({ code }));
    expect(selectFindings(findings, { rules: ['C*'], exclude: ['C3'] }).map((f) => f.code))
      .toEqual(['C1', 'C2', 'C4']);
  });

  it('never mutates the findings it re-severities', () => {
    const original = finding({ code: 'A3', severity: 'info' });
    const [selected] = selectFindings([original], { severities: 'declared' });
    expect(original.severity).toBe('info');
    expect(selected.severity).not.toBe('info');
  });

  it('normalizes an exposure-ignoring card by every relation, not just the exposed ones', () => {
    const findings = Array.from({ length: 40 }, (_, i) =>
      finding({ code: 'A2', exposed: false, table: `t${i}` }));
    const byName = cards(findings, {
      wide: { select: { exposure: 'all', denominator: 'all' } },
      narrow: { select: { exposure: 'all' } }
    });
    // Same numerator, denominator twice the size: dividing the wider set by
    // the narrower surface would penalize a card for asking a wider question.
    expect(byName.wide.score.value).toBeGreaterThan(byName.narrow.score.value);
    expect(byName.wide.score.exposedTables).toBe(200);
  });

  it('can grade both dimensions in one number when a team wants one', () => {
    const findings = [
      finding({ code: 'A2', dimension: 'security' }),
      finding({ code: 'X1', dimension: 'perf', category: 'index' })
    ];
    expect(selectFindings(findings, {}).map((f) => f.code)).toEqual(['A2']);
    expect(selectFindings(findings, { dimension: 'perf' }).map((f) => f.code)).toEqual(['X1']);
    expect(selectFindings(findings, { dimension: 'all' }).map((f) => f.code)).toEqual(['A2', 'X1']);
  });
});
