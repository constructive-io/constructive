import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { getConnections, PgTestClient } from 'pgsql-test';

import { audit } from '../src/commands/audit';
import { loadConfig } from '../src/config/loader';
import type { Finding } from '../src/types';

jest.setTimeout(120000);

let pg: PgTestClient;
let teardown: () => Promise<void>;

const SCHEMAS = ['fx_ext', 'fx_ext_runtime'];

function tables(findings: Finding[]): string[] {
  return [...new Set(findings.map((f) => `${f.schema}.${f.table}`))].sort();
}

beforeAll(async () => {
  ({ pg, teardown } = await getConnections());
  await pg.any(fs.readFileSync(path.join(__dirname, 'fixtures', 'ext-owned.sql'), 'utf8'));
});

afterAll(async () => {
  if (teardown) await teardown();
});

describe('extension-owned relations', () => {
  it('skips them by default, keeps application tables in the same schema', async () => {
    const report = await audit(pg.client as never, { schemas: SCHEMAS, perf: true });
    const found = tables(report.findings);

    expect(found).toContain('fx_ext.app_widget');
    expect(found).not.toContain('fx_ext.ext_widget');
  });

  it('skips partitions of an extension-owned parent at any depth', async () => {
    const report = await audit(pg.client as never, { schemas: SCHEMAS, perf: true, stats: true });
    const found = tables(report.findings);

    expect(found).not.toContain('fx_ext.ext_events');
    expect(found).not.toContain('fx_ext.ext_events_p1');
    expect(found).not.toContain('fx_ext.ext_events_p1a');
  });

  it('audits them when asked — the extension author is the audience', async () => {
    const report = await audit(pg.client as never, {
      schemas: SCHEMAS,
      perf: true,
      extensions: { skipOwned: false }
    });
    const found = tables(report.findings);

    expect(found).toContain('fx_ext.ext_widget');
    expect(found).toContain('fx_ext.app_widget');
  });

  it('perf and runtime-stats rules see the same surface as the security scan', async () => {
    const report = await audit(pg.client as never, { schemas: SCHEMAS, perf: true, stats: true });
    const perfTables = tables(report.findings.filter((f) => f.code.startsWith('X')));

    expect(perfTables).toContain('fx_ext.app_widget');
    expect(perfTables).not.toContain('fx_ext.ext_widget');

    const statsTables = (report.perf?.stats?.tables ?? 0) > 0;
    expect(statsTables).toBe(true);
    expect(tables(report.findings.filter((f) => f.code.startsWith('S'))))
      .not.toContain('fx_ext.ext_widget');
  });

  it('ignores a named extension\'s whole schema, for objects it creates unregistered', async () => {
    const audited = await audit(pg.client as never, { schemas: SCHEMAS, perf: true });
    expect(tables(audited.findings)).toContain('fx_ext_runtime.runtime_child');

    const ignored = await audit(pg.client as never, {
      schemas: SCHEMAS,
      perf: true,
      extensions: { ignore: ['pg_trgm'] }
    });
    expect(tables(ignored.findings)).not.toContain('fx_ext_runtime.runtime_child');
  });

  it('ignores unknown extension names rather than failing', async () => {
    const report = await audit(pg.client as never, {
      schemas: SCHEMAS,
      perf: true,
      extensions: { ignore: ['not_installed_anywhere'] }
    });
    expect(tables(report.findings)).toContain('fx_ext.app_widget');
  });

  it('applies the same exclusions to routines, which the convention linter reads', async () => {
    // The linter reads function bodies, and an extension's bodies are not the
    // application's to fix. Before this, `extensions.ignore` filtered
    // relations only, so partman's 300-odd functions arrived as house-style
    // violations against a house that did not write them.
    const fns = (findings: Finding[]) =>
      [...new Set(
        findings
          .filter((f) => f.category === 'convention')
          .map((f) => (f.context as { function?: string }).function?.replace(/\(.*$/, ''))
      )];

    const report = await audit(pg.client as never, {
      schemas: SCHEMAS,
      extensions: { ignore: ['pg_trgm'] },
      config: { rules: { C1: 'high', C4: 'high' } }
    });
    const found = fns(report.findings);

    expect(found).toContain('fx_ext.app_helper');
    expect(found).not.toContain('fx_ext.ext_helper');       // extension-owned
    expect(found).not.toContain('fx_ext_runtime.runtime_helper'); // ignored schema

    // Ask for them and they arrive: the extension author is the audience.
    const audited = await audit(pg.client as never, {
      schemas: SCHEMAS,
      extensions: { skipOwned: false },
      config: { rules: { C1: 'high', C4: 'high' } }
    });
    expect(fns(audited.findings)).toContain('fx_ext.ext_helper');
  });

  it('the constructive preset ships pg_partman in the ignore list', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'safegres-'));
    const { config } = loadConfig({ cwd, preset: 'constructive' });
    expect(config.extensions?.ignore).toContain('pg_partman');
  });

  it('a config retuning skipOwned keeps the preset ignore list', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'safegres-'));
    const { config } = loadConfig({
      cwd,
      preset: 'constructive',
      overrides: { extensions: { skipOwned: false } }
    });
    expect(config.extensions?.skipOwned).toBe(false);
    expect(config.extensions?.ignore).toContain('pg_partman');
  });
});
