import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { loadConfig } from '../src/config/loader';
import { PRESETS } from '../src/config/presets';
import {
  allAstRulesDisabled,
  applyRulesToFindings,
  ConfigValidationError,
  matchTablePattern,
  resolveRules,
  rulesForTable
} from '../src/config/resolve';
import type { SafegresConfig } from '../src/config/types';
import { expandRuleSelector, RULES } from '../src/rules/registry';
import { computeScore, meetsGrade } from '../src/score/score';
import type { Finding } from '../src/types';

function finding(partial: Partial<Finding> & { code: string }): Finding {
  return {
    severity: 'high',
    category: 'flags',
    schema: 'public',
    table: 'users',
    message: 'test',
    ...partial
  } as Finding;
}

describe('rule registry', () => {
  it('expands prefix wildcards', () => {
    expect(expandRuleSelector('P*').sort()).toEqual(['P1', 'P1b', 'P5']);
    expect(expandRuleSelector('R*').sort()).toEqual(['R1', 'R2', 'R3']);
    expect(expandRuleSelector('*')).toHaveLength(RULES.length);
    expect(expandRuleSelector('A1')).toEqual(['A1']);
    expect(expandRuleSelector('ZZ')).toEqual([]);
  });
});

describe('resolveRules', () => {
  it('defaults every rule to enabled at its registry severity', () => {
    const { rules } = resolveRules({});
    expect(rules.get('A1')).toEqual({ enabled: true, severity: 'critical' });
    expect(rules.get('A6')).toEqual({ enabled: true, severity: 'info' });
  });

  it('applies off / severity / [severity, options] settings', () => {
    const { rules } = resolveRules({
      rules: { A3: 'off', A5: 'high', P1: ['critical', { allow: ['now'] }] }
    });
    expect(rules.get('A3')!.enabled).toBe(false);
    expect(rules.get('A5')).toEqual({ enabled: true, severity: 'high' });
    expect(rules.get('P1')).toEqual({
      enabled: true,
      severity: 'critical',
      options: { allow: ['now'] }
    });
  });

  it('lets exact codes win over wildcards regardless of key order', () => {
    const { rules } = resolveRules({ rules: { P1: 'critical', 'P*': 'off' } });
    expect(rules.get('P1')!.enabled).toBe(true);
    expect(rules.get('P1')!.severity).toBe('critical');
    expect(rules.get('P5')!.enabled).toBe(false);
  });

  it('rejects unknown rule codes and bad severities', () => {
    expect(() => resolveRules({ rules: { NOPE: 'high' } })).toThrow(ConfigValidationError);
    expect(() => resolveRules({ rules: { A1: 'catastrophic' as never } })).toThrow(
      ConfigValidationError
    );
    expect(() => resolveRules({ overrides: [{ tables: [], rules: {} }] })).toThrow(
      ConfigValidationError
    );
  });
});

describe('table overrides', () => {
  const config: SafegresConfig = {
    rules: { A3: 'off' },
    overrides: [
      { tables: ['public.audit_*'], rules: { A2: 'off' } },
      { tables: ['metrics.*'], rules: { A5: 'off', A3: 'low' } }
    ]
  };

  it('matches glob patterns against schema.table', () => {
    expect(matchTablePattern('public.audit_*', 'public.audit_log')).toBe(true);
    expect(matchTablePattern('public.audit_*', 'public.users')).toBe(false);
    expect(matchTablePattern('*.users', 'tenant_a.users')).toBe(true);
  });

  it('applies matching overrides on top of base rules', () => {
    const resolved = resolveRules(config);
    const base = rulesForTable(resolved, 'public', 'users');
    expect(base.get('A2')!.enabled).toBe(true);

    const auditLog = rulesForTable(resolved, 'public', 'audit_log');
    expect(auditLog.get('A2')!.enabled).toBe(false);
    expect(auditLog.get('A3')!.enabled).toBe(false); // base config still applies

    const metrics = rulesForTable(resolved, 'metrics', 'page_views');
    expect(metrics.get('A5')!.enabled).toBe(false);
    expect(metrics.get('A3')).toEqual({ enabled: true, severity: 'low' });
  });

  it('filters and restamps findings', () => {
    const resolved = resolveRules(config);
    const out = applyRulesToFindings(resolved, [
      finding({ code: 'A2', schema: 'public', table: 'audit_log' }),
      finding({ code: 'A2', schema: 'public', table: 'users' }),
      finding({ code: 'A3', schema: 'metrics', table: 'page_views', severity: 'medium' })
    ]);
    expect(out).toHaveLength(2);
    expect(out.find((f) => f.table === 'users')!.code).toBe('A2');
    expect(out.find((f) => f.code === 'A3')!.severity).toBe('low');
  });
});

describe('allAstRulesDisabled', () => {
  it('detects fully-disabled AST rules', () => {
    expect(allAstRulesDisabled(resolveRules({}))).toBe(false);
    expect(allAstRulesDisabled(resolveRules({ rules: { 'P*': 'off', A7: 'off' } }))).toBe(true);
  });

  it('stays enabled when an override re-enables an AST rule', () => {
    const resolved = resolveRules({
      rules: { 'P*': 'off', A7: 'off' },
      overrides: [{ tables: ['public.payments'], rules: { P5: 'critical' } }]
    });
    expect(allAstRulesDisabled(resolved)).toBe(false);
  });
});

describe('presets', () => {
  it('minimal disables everything except structural flags', () => {
    const { rules } = resolveRules(PRESETS['safegres:minimal']);
    expect(rules.get('A1')!.enabled).toBe(true);
    expect(rules.get('A4')!.enabled).toBe(false);
    expect(rules.get('P1')!.enabled).toBe(false);
  });

  it('constructive escalates leak-prone rules and watches anonymous', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'safegres-'));
    fs.writeFileSync(
      path.join(cwd, '.safegresrc.json'),
      JSON.stringify({ extends: 'safegres:constructive' })
    );
    const { config } = loadConfig({ cwd });
    const { rules } = resolveRules(config);
    expect(rules.get('A2')!.severity).toBe('critical');
    expect(rules.get('P5')!.severity).toBe('critical');
    expect(rules.get('R1')).toEqual({
      enabled: true,
      severity: 'critical',
      options: { roles: ['anonymous'] }
    });
    expect(rules.get('R2')!.options).toEqual({ roles: ['anonymous'] });
    expect(config.scoring?.floorOnCritical).toBe('C');
  });
});

describe('loadConfig', () => {
  it('returns defaults when no config file exists', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'safegres-'));
    const result = loadConfig({ cwd });
    expect(result.isEmpty).toBe(true);
    expect(resolveRules(result.config).rules.get('A1')!.enabled).toBe(true);
  });

  it('merges file config with extends over defaults', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'safegres-'));
    fs.writeFileSync(
      path.join(cwd, 'safegres.json'),
      JSON.stringify({ extends: 'safegres:strict', rules: { A6: 'off' } })
    );
    const { config, filepath } = loadConfig({ cwd });
    expect(filepath).toBe(path.join(cwd, 'safegres.json'));
    const { rules } = resolveRules(config);
    expect(rules.get('A4')!.severity).toBe('critical'); // from strict
    expect(rules.get('A6')!.enabled).toBe(false); // file wins
    expect(config.failOn?.severity).toBe('high');
  });

  it('applies a CLI preset below CLI rule overrides', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'safegres-'));
    const { config } = loadConfig({
      cwd,
      preset: 'strict',
      overrides: { rules: { A4: 'off' } }
    });
    const { rules } = resolveRules(config);
    expect(rules.get('A4')!.enabled).toBe(false); // CLI override wins
    expect(rules.get('A5')!.severity).toBe('high'); // from strict
  });

  it('rejects unknown presets', () => {
    expect(() => loadConfig({ preset: 'nope' })).toThrow(/Unknown preset/);
  });
});

describe('computeScore', () => {
  it('gives a perfect score with no findings', () => {
    const score = computeScore([]);
    expect(score.value).toBe(100);
    expect(score.grade).toBe('A+');
    expect(score.deductions).toEqual([]);
  });

  it('deducts by severity weight and floors the grade on criticals', () => {
    const score = computeScore([
      finding({ code: 'A1', severity: 'critical' }),
      finding({ code: 'A5', severity: 'medium' })
    ]);
    expect(score.value).toBe(100 - 25 - 4);
    expect(score.grade).toBe('C'); // 71 would be C anyway; floor also caps at C
    expect(score.deductions[0]).toEqual({ code: 'A1', count: 1, points: 25 });
  });

  it('caps per-rule deductions', () => {
    const findings = Array.from({ length: 20 }, () => finding({ code: 'A5', severity: 'medium' }));
    const score = computeScore(findings, { floorOnCritical: false });
    expect(score.value).toBe(60); // 20*4=80 capped at 40
    expect(score.deductions[0].points).toBe(40);
  });

  it('is config-driven: weights, per-rule weights, bands, floor', () => {
    const findings = [finding({ code: 'A3', severity: 'medium' })];
    expect(computeScore(findings, { weights: { medium: 0 } }).value).toBe(100);
    expect(
      computeScore(findings, { perRuleWeights: { A3: 50 }, maxDeductionPerRule: 100 }).value
    ).toBe(50);
    const relaxed = computeScore(findings, { gradeBands: { 'A+': 50 } });
    expect(relaxed.grade).toBe('A+');
  });

  it('compares grades', () => {
    expect(meetsGrade('A', 'B')).toBe(true);
    expect(meetsGrade('D', 'C')).toBe(false);
    expect(meetsGrade('B', 'B')).toBe(true);
  });
});
