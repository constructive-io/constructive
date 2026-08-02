import { getConnections, PgTestClient } from 'pgsql-test';

import { audit } from '../src/commands/audit';
import { constructive, recommended } from '../src/config/presets';
import type { Finding } from '../src/types';

jest.setTimeout(120000);

let pg: PgTestClient;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ pg, teardown } = await getConnections());
  await pg.any('CREATE SCHEMA fx_lint');
  await pg.any('CREATE TABLE fx_lint.widgets (id int primary key)');

  // C1: pins search_path — a house-rule violation. Body kept trivial so only
  // C1 fires on it.
  await pg.any(`
    CREATE FUNCTION fx_lint.pinned() RETURNS int
    LANGUAGE sql
    SET search_path = public
    AS $$ SELECT 1 $$;
  `);

  // C3: an unqualified relation reference (relies on search_path).
  await pg.any(`
    CREATE FUNCTION fx_lint.unqualified() RETURNS bigint
    LANGUAGE plpgsql
    AS $$
    DECLARE n bigint;
    BEGIN
      SELECT count(*) INTO n FROM widgets;
      RETURN n;
    END;
    $$;
  `);

  // C4 active: dynamic SQL with no waiver.
  await pg.any(`
    CREATE FUNCTION fx_lint.dyn_unwaived() RETURNS void
    LANGUAGE plpgsql
    AS $$
    BEGIN
      EXECUTE 'SELECT 1';
    END;
    $$;
  `);

  // C4 waived: dynamic SQL with a reasoned inline waiver — preserved as an
  // acknowledged (accepted-risk) finding rather than dropped.
  await pg.any(`
    CREATE FUNCTION fx_lint.dyn_waived() RETURNS void
    LANGUAGE plpgsql
    AS $$
    BEGIN
      -- safegres-disable-next-line no-dynamic-sql -- lookup-only: static probe
      EXECUTE 'SELECT 1';
    END;
    $$;
  `);

  // Clean: fully-qualified, no search_path, no dynamic SQL.
  await pg.any(`
    CREATE FUNCTION fx_lint.clean() RETURNS bigint
    LANGUAGE plpgsql
    AS $$
    DECLARE n bigint;
    BEGIN
      SELECT count(*) INTO n FROM fx_lint.widgets;
      RETURN n;
    END;
    $$;
  `);
});

afterAll(async () => {
  if (teardown) await teardown();
});

function forFn(findings: Finding[], code: string, fn: string): Finding | undefined {
  return findings.find(
    (f) => f.code === code && (f.context as { function?: string }).function?.startsWith(`fx_lint.${fn}(`)
  );
}

async function lintAudit(): Promise<Finding[]> {
  const report = await audit(pg.client as never, {
    schemas: ['fx_lint'],
    config: { rules: { C1: 'high', C2: 'medium', C3: 'low', C4: 'high' } }
  });
  return report.findings.filter((f) => f.schema === 'fx_lint');
}

describe('audit: convention linter wiring (C*)', () => {
  it('flags a function that sets search_path (C1)', async () => {
    const c1 = forFn(await lintAudit(), 'C1', 'pinned');
    expect(c1).toBeDefined();
    expect(c1?.category).toBe('convention');
    expect(c1?.severity).toBe('high');
    expect(c1?.acknowledged).toBeFalsy();
  });

  it('flags an unqualified relation reference (C3)', async () => {
    const c3 = forFn(await lintAudit(), 'C3', 'unqualified');
    expect(c3).toBeDefined();
    expect(c3?.severity).toBe('low');
  });

  it('flags dynamic SQL as active when it is not waived (C4)', async () => {
    const c4 = forFn(await lintAudit(), 'C4', 'dyn_unwaived');
    expect(c4).toBeDefined();
    expect(c4?.acknowledged).toBeFalsy();
  });

  it('keeps a reasoned dynamic-SQL waiver as an acknowledged finding (C4)', async () => {
    const c4 = forFn(await lintAudit(), 'C4', 'dyn_waived');
    expect(c4).toBeDefined();
    expect(c4?.acknowledged).toBe(true);
    const ctx = c4?.context as { suppressed?: boolean; reason?: string };
    expect(ctx.suppressed).toBe(true);
    expect(ctx.reason).toContain('lookup-only');
  });

  it('does not flag a clean, fully-qualified function', async () => {
    const findings = await lintAudit();
    const onClean = findings.filter(
      (f) => (f.context as { function?: string }).function?.startsWith('fx_lint.clean(')
    );
    expect(onClean).toEqual([]);
  });

  it('runs the linter under the constructive preset but not under recommended', () => {
    // recommended carries `C*` off; constructive turns them on.
    expect(recommended.rules!['C*']).toBe('off');
    expect(constructive.rules!.C1).toBe('high');
    expect(constructive.rules!.C4).toBe('high');
  });
});
