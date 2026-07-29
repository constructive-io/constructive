import { renderPretty } from '../src/report/pretty';
import type { Finding, Report } from '../src/types';
import { summarize } from '../src/types';

function makeReport(): Report {
  const findings: Finding[] = [
    {
      code: 'A2',
      severity: 'high',
      category: 'flags',
      exposed: true,
      schema: 'app_public',
      table: 'widgets',
      message: 'grants exist on a table with RLS disabled'
    },
    {
      code: 'A2',
      severity: 'high',
      category: 'flags',
      exposed: false,
      schema: 'db_migrate',
      table: 'sql_actions',
      message: 'grants exist on a table with RLS disabled'
    },
    {
      code: 'A2',
      severity: 'high',
      category: 'flags',
      exposed: false,
      schema: 'db_migrate',
      table: 'log',
      message: 'grants exist on a table with RLS disabled'
    }
  ];
  return {
    version: '1.0.0',
    generatedAt: '2026-01-01T00:00:00.000Z',
    summary: summarize(findings),
    findings
  };
}

describe('renderPretty verbosity', () => {
  it('collapses internal advisories to a count by default', () => {
    const out = renderPretty(makeReport(), { color: false });
    expect(out).toContain('app_public.widgets');
    expect(out).toContain('internal advisories (2)');
    expect(out).toContain('--verbose');
    // internal findings are not listed individually
    expect(out).not.toContain('db_migrate.sql_actions');
    expect(out).not.toContain('db_migrate.log');
  });

  it('--verbose expands the internal advisories', () => {
    const out = renderPretty(makeReport(), { color: false, verbose: true });
    expect(out).toContain('app_public.widgets');
    expect(out).toContain('db_migrate.sql_actions');
    expect(out).toContain('db_migrate.log');
    expect(out).not.toContain('--verbose to list');
  });

  it('--summary prints counts only, no findings', () => {
    const out = renderPretty(makeReport(), { color: false, summary: true });
    expect(out).toContain('summary:');
    expect(out).toContain('3 high');
    expect(out).not.toContain('app_public.widgets');
    expect(out).not.toContain('internal advisories');
  });
});
