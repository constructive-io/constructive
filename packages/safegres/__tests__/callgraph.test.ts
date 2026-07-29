import * as fs from 'fs';
import * as path from 'path';
import { getConnections, PgTestClient } from 'pgsql-test';

import { buildCallGraph, type CallGraphReport } from '../src/callgraph/graph';
import { audit } from '../src/commands/audit';
import { introspectFunctions } from '../src/pg/functions';
import { introspectTables } from '../src/pg/introspect';

jest.setTimeout(120000);

let pg: PgTestClient;
let teardown: () => Promise<void>;
let cg: CallGraphReport;

beforeAll(async () => {
  ({ pg, teardown } = await getConnections());
  const sql = fs.readFileSync(path.join(__dirname, 'fixtures', 'callgraph.sql'), 'utf8');
  await pg.any(sql);

  const functions = await introspectFunctions(pg.client as never, {
    schemas: ['fx_cg_public', 'fx_cg_private']
  });
  const tables = await introspectTables(pg.client as never, {
    schemas: ['fx_cg_public', 'fx_cg_private']
  });
  cg = await buildCallGraph({
    functions,
    tables,
    exposedSchemas: ['fx_cg_public'],
    apiRoles: ['anonymous', 'authenticated']
  });
});

afterAll(async () => {
  if (teardown) await teardown();
});

describe('buildCallGraph', () => {
  it('finds only the API-granted functions in exposed schemas as entry points', () => {
    expect(cg.entries.map((e) => e.fn)).toEqual([
      'fx_cg_public.sign_in',
      'fx_cg_public.widget_report'
    ]);
    // Private helpers are reachable but never entries.
    expect(cg.stats.entryPoints).toBe(2);
    expect(cg.stats.reachableFunctions).toBeGreaterThanOrEqual(4);
  });

  it('flags trust hops (CG1) when execution crosses into SECURITY DEFINER', () => {
    const hops = cg.checklist.filter((i) => i.code === 'CG1').map((i) => i.fn);
    expect(hops).toContain('fx_cg_public.sign_in'); // the entry itself is DEFINER
    expect(hops).toContain('fx_cg_private.verify_password');
    expect(hops).toContain('fx_cg_private.issue_token');
  });

  it('flags RLS-bypass paths (CG2) when a DEFINER owner bypasses the table RLS', () => {
    const bypass = cg.checklist.find((i) => i.code === 'CG2');
    expect(bypass?.fn).toBe('fx_cg_private.verify_password');
    expect(bypass?.table).toBe('fx_cg_private.users');
    expect(bypass?.path[0]).toBe('fx_cg_public.sign_in');
  });

  it('flags auth-context mutations (CG3)', () => {
    const auth = cg.checklist.find((i) => i.code === 'CG3');
    expect(auth?.fn).toBe('fx_cg_private.issue_token');
    expect(auth?.message).toContain('jwt.claims.user_email');
  });

  it('flags internal tables reached via DEFINER paths (CG4)', () => {
    const reach = cg.checklist.find((i) => i.code === 'CG4');
    expect(reach?.table).toBe('fx_cg_private.users');
  });

  it('flags dynamic SQL as opaque (CG5) instead of silently dropping it', () => {
    const opaque = cg.checklist.find((i) => i.code === 'CG5');
    expect(opaque?.fn).toBe('fx_cg_public.run_report');
    expect(opaque?.message).toContain('dynamic SQL');
    expect(opaque?.path).toEqual(['fx_cg_public.widget_report', 'fx_cg_public.run_report']);
  });

  it('flags DEFINERs without a pinned search_path (CF1) but not pinned ones', () => {
    const cf1 = cg.checklist.filter((i) => i.code === 'CF1').map((i) => i.fn);
    expect(cf1).toContain('fx_cg_private.verify_password');
    expect(cf1).not.toContain('fx_cg_public.sign_in');
    expect(cf1).not.toContain('fx_cg_private.issue_token');
  });

  it('flags DEFINER entry points executable by anonymous (CF2)', () => {
    const cf2 = cg.checklist.filter((i) => i.code === 'CF2').map((i) => i.fn);
    expect(cf2).toContain('fx_cg_public.sign_in');
  });
});

describe('audit --call-graph integration', () => {
  it('attaches an unscored callGraph section to the report', async () => {
    const report = await audit(pg.client as never, {
      schemas: ['fx_cg_public', 'fx_cg_private'],
      exposure: { schemas: ['fx_cg_public'], roles: ['anonymous', 'authenticated'] },
      callGraph: true
    });
    expect(report.callGraph?.stats.entryPoints).toBe(2);
    expect(report.callGraph?.stats.trustHops).toBeGreaterThanOrEqual(3);

    // The call graph never affects the score: same score without it.
    const plain = await audit(pg.client as never, {
      schemas: ['fx_cg_public', 'fx_cg_private'],
      exposure: { schemas: ['fx_cg_public'], roles: ['anonymous', 'authenticated'] }
    });
    expect(report.score?.value).toBe(plain.score?.value);
    expect(plain.callGraph).toBeUndefined();
  });
});
