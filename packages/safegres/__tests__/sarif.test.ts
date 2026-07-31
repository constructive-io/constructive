import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { buildSourceIndex, renderSarif } from '../src/report/sarif';
import { computeScore } from '../src/score/score';
import type { Finding, Report } from '../src/types';
import { summarize } from '../src/types';

function finding(over: Partial<Finding> = {}): Finding {
  return {
    code: 'A2',
    severity: 'high',
    category: 'flags',
    direction: 'fail-open',
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

function parse(findings: Finding[], options?: Parameters<typeof renderSarif>[1]) {
  return JSON.parse(renderSarif(makeReport(findings), options));
}

describe('renderSarif', () => {
  it('emits a valid-shaped SARIF 2.1.0 run', () => {
    const sarif = parse([finding()]);
    expect(sarif.version).toBe('2.1.0');
    expect(sarif.$schema).toContain('sarif-schema-2.1.0');
    expect(sarif.runs).toHaveLength(1);
    expect(sarif.runs[0].tool.driver.name).toBe('safegres');
    expect(sarif.runs[0].tool.driver.semanticVersion).toBe('1.0.0');
  });

  it('declares only the rules it emitted, with GitHub severity metadata', () => {
    const sarif = parse([finding(), finding({ code: 'A1', severity: 'low', direction: 'fail-closed' })]);
    const rules = sarif.runs[0].tool.driver.rules;
    expect(rules.map((r: { id: string }) => r.id).sort()).toEqual(['A1', 'A2']);
    const a2 = rules.find((r: { id: string }) => r.id === 'A2');
    expect(a2.defaultConfiguration.level).toBe('error');
    expect(a2.properties['security-severity']).toBe('7.0');
    expect(a2.properties.tags).toContain('security');
    expect(a2.shortDescription.text).toContain('RLS disabled');
  });

  it('tags perf rules as performance so they are separable from security alerts', () => {
    const sarif = parse([
      finding({ code: 'X1', severity: 'medium', category: 'index', dimension: 'perf', direction: 'neutral' })
    ]);
    const rule = sarif.runs[0].tool.driver.rules[0];
    expect(rule.properties.tags).toContain('performance');
    expect(sarif.runs[0].results[0].properties.dimension).toBe('perf');
  });

  it('maps severities onto SARIF levels', () => {
    const sarif = parse([
      finding({ code: 'A7', severity: 'critical' }),
      finding({ code: 'R3', severity: 'medium' }),
      finding({ code: 'A6', severity: 'info' })
    ]);
    expect(sarif.runs[0].results.map((r: { level: string }) => r.level)).toEqual(['error', 'warning', 'note']);
  });

  it('fingerprints results by identity, not message text', () => {
    const before = parse([finding()]).runs[0].results[0].partialFingerprints;
    const after = parse([finding({ message: 'completely reworded in a later release' })])
      .runs[0].results[0].partialFingerprints;
    expect(after).toEqual(before);
    expect(before.safegresFindingKey).toContain('A2|app_public|widgets');
  });

  it('carries both scores as run properties', () => {
    const report = makeReport([finding()]);
    const perfFinding = finding({ code: 'X1', dimension: 'perf', severity: 'medium', category: 'index' });
    report.perf = {
      findings: [perfFinding],
      summary: summarize([perfFinding]),
      score: computeScore([perfFinding], undefined, { exposedTables: 10, exposureKnown: true })
    };
    const sarif = JSON.parse(renderSarif(report));
    expect(sarif.runs[0].properties.grade).toBeDefined();
    expect(sarif.runs[0].properties.perfGrade).toBeDefined();
  });

  it('emits an empty location list when nothing resolves', () => {
    const sarif = parse([finding()]);
    expect(sarif.runs[0].results[0].locations).toEqual([]);
    expect(sarif.runs[0].results[0].message.text).toBe(
      'app_public.widgets: grants exist on a table with RLS disabled'
    );
  });
});

describe('buildSourceIndex', () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'safegres-sarif-'));
    mkdirSync(join(dir, 'deploy'), { recursive: true });
    mkdirSync(join(dir, 'node_modules'), { recursive: true });
    writeFileSync(
      join(dir, 'deploy', 'widgets.sql'),
      [
        '-- Deploy widgets',
        'BEGIN;',
        'CREATE TABLE app_public.widgets (',
        '  id uuid primary key',
        ');',
        'ALTER TABLE app_public.widgets ENABLE ROW LEVEL SECURITY;',
        'CREATE POLICY widgets_select ON app_public.widgets FOR SELECT USING (true);',
        'COMMIT;'
      ].join('\n')
    );
    writeFileSync(
      join(dir, 'deploy', 'quoted.sql'),
      'CREATE TABLE IF NOT EXISTS "Mixed"."Case" (id int);\n'
    );
    // must be ignored
    writeFileSync(join(dir, 'node_modules', 'other.sql'), 'CREATE TABLE app_public.widgets (id int);\n');
    writeFileSync(join(dir, 'deploy', 'notes.md'), 'CREATE TABLE app_public.decoy (id int);\n');
  });

  it('indexes tables and policies with POSIX-relative paths', () => {
    const index = buildSourceIndex(dir);
    expect(index.get('app_public.widgets')).toEqual({ file: 'deploy/widgets.sql', line: 3 });
    expect(index.get('app_public.widgets:widgets_select')).toEqual({ file: 'deploy/widgets.sql', line: 7 });
  });

  it('skips node_modules and non-SQL files', () => {
    const index = buildSourceIndex(dir);
    expect(index.get('app_public.widgets')?.file).toBe('deploy/widgets.sql');
    expect(index.has('app_public.decoy')).toBe(false);
  });

  it('preserves quoted identifiers and folds unquoted ones', () => {
    const index = buildSourceIndex(dir);
    expect(index.has('Mixed.Case')).toBe(true);
  });

  it('points results at the policy line when the finding names a policy', () => {
    const sources = buildSourceIndex(dir);
    const sarif = parse(
      [
        finding({ code: 'A8', severity: 'low', category: 'anti-pattern', policy: 'widgets_select' }),
        finding()
      ],
      { sources }
    );
    const [policyResult, tableResult] = sarif.runs[0].results;
    expect(policyResult.locations[0].physicalLocation).toEqual({
      artifactLocation: { uri: 'deploy/widgets.sql' },
      region: { startLine: 7 }
    });
    expect(tableResult.locations[0].physicalLocation.region.startLine).toBe(3);
  });
});
