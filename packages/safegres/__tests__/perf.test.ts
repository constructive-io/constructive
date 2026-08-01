import * as fs from 'fs';
import * as path from 'path';
import { getConnections, PgTestClient } from 'pgsql-test';

import { audit } from '../src/commands/audit';
import { ConfigValidationError, resolveRules } from '../src/config/resolve';
import { diffPerf, toBaselineFinding, toPerfBaseline } from '../src/perf/baseline';
import type { Finding } from '../src/types';

jest.setTimeout(120000);

let pg: PgTestClient;
let teardown: () => Promise<void>;

async function applyFixture(name: string): Promise<void> {
  const filepath = path.join(__dirname, 'fixtures', name);
  await pg.any(fs.readFileSync(filepath, 'utf8'));
}

function tablesFor(findings: Finding[], code: string): string[] {
  return findings.filter((f) => f.code === code).map((f) => `${f.schema}.${f.table}`).sort();
}

beforeAll(async () => {
  ({ pg, teardown } = await getConnections());
});

afterAll(async () => {
  if (teardown) await teardown();
});

describe('perf dimension', () => {
  it('is off by default — no X rules, no perf report', async () => {
    await applyFixture('x1-fk-no-index.sql');
    const report = await audit(pg.client as never, { schemas: ['fx_x1'] });
    expect(report.perf).toBeUndefined();
    expect(report.findings.filter((f) => f.code.startsWith('X'))).toHaveLength(0);
  });

  it('X1: flags foreign keys with no covering index', async () => {
    const report = await audit(pg.client as never, { schemas: ['fx_x1'], perf: true });
    expect(tablesFor(report.perf!.findings, 'X1')).toEqual(['fx_x1.pairs', 'fx_x1.posts']);

    const posts = report.perf!.findings.find((f) => f.code === 'X1' && f.table === 'posts');
    expect(posts?.severity).toBe('medium');
    expect(posts?.dimension).toBe('perf');
    expect(posts?.context).toMatchObject({ columns: ['author_id'] });
  });

  describe('X1 access-path signals', () => {
    function x1Constraints(findings: Finding[]): string[] {
      return findings
        .filter((f) => f.code === 'X1')
        .map((f) => (f.context as { constraint: string }).constraint)
        .sort();
    }

    function x1For(findings: Finding[], constraint: string): Finding | undefined {
      return findings.find(
        (f) => f.code === 'X1' && (f.context as { constraint: string }).constraint === constraint
      );
    }

    it('reports the shape without acting on it: every key still raises X1', async () => {
      await applyFixture('x1-cold-paths.sql');
      const report = await audit(pg.client as never, { schemas: ['fx_cold'], perf: true });

      // A shape is not proof that nothing queries the relation — a generated
      // API can expose a reverse relation over any of these keys — so the
      // default changes no finding and no severity.
      expect(x1Constraints(report.perf!.findings).filter((c) => c.startsWith('agent_module')))
        .toEqual([
          'agent_module_database_id_fkey',
          'agent_module_field_table_id_fkey',
          'agent_module_message_table_id_fkey',
          'agent_module_thread_table_id_fkey'
        ]);
      expect(x1For(report.perf!.findings, 'agent_module_thread_table_id_fkey')?.severity)
        .toBe('medium');
    });

    it('attaches the signals that fired to each finding', async () => {
      const report = await audit(pg.client as never, { schemas: ['fx_cold'], perf: true });
      const findings = report.perf!.findings;

      // A write-once pointer on a config record: shape only.
      expect(x1For(findings, 'agent_module_thread_table_id_fkey')?.context)
        .toMatchObject({ pathSignals: ['write-once-pointer', 'config-record'] });
      // The tenant key of the same table: an RLS policy filters on it.
      expect(x1For(findings, 'agent_module_database_id_fkey')?.context)
        .toMatchObject({ pathSignals: ['policy-read'] });
      // A view reads these, which is a read signal wherever they sit.
      expect(x1For(findings, 'read_module_primary_view_table_id_fkey')?.context)
        .toMatchObject({ pathSignals: ['view-read'] });
      // A real relationship table: no constant defaults, nothing to say.
      expect(x1For(findings, 'grants_actor_id_fkey')?.context)
        .toMatchObject({ pathSignals: [] });
      // One pointer is below the config-record threshold, so the shape does
      // not hold at the table level and the key is not write-once-shaped.
      expect(x1For(findings, 'one_pointer_thread_table_id_fkey')?.context)
        .toMatchObject({ pathSignals: ['write-once-pointer'] });
    });

    it('demotes write-once-shaped keys to info when asked', async () => {
      const report = await audit(pg.client as never, {
        schemas: ['fx_cold'],
        perf: true,
        config: { perf: { paths: { onWriteOncePointer: 'demote' } } }
      });
      const findings = report.perf!.findings;
      expect(x1For(findings, 'agent_module_thread_table_id_fkey')?.severity).toBe('info');
      // The tenant key is read by a policy, so it keeps its severity.
      expect(x1For(findings, 'agent_module_database_id_fkey')?.severity).toBe('medium');
    });

    it('suppresses write-once-shaped keys when asked, but never a read one', async () => {
      const report = await audit(pg.client as never, {
        schemas: ['fx_cold'],
        perf: true,
        config: { perf: { paths: { onWriteOncePointer: 'suppress' } } }
      });
      expect(x1Constraints(report.perf!.findings).filter((c) => c.startsWith('agent_module')))
        .toEqual(['agent_module_database_id_fkey']);
    });

    it('collects no signals at all when inference is off', async () => {
      const report = await audit(pg.client as never, {
        schemas: ['fx_cold'],
        perf: true,
        config: { perf: { paths: { infer: false, onWriteOncePointer: 'suppress' } } }
      });
      expect(report.perf!.paths).toBeUndefined();
      expect(x1Constraints(report.perf!.findings).filter((c) => c.startsWith('agent_module')))
        .toHaveLength(4);
    });

    it('reports the signal counts and what X1 did with them', async () => {
      const report = await audit(pg.client as never, { schemas: ['fx_cold'], perf: true });
      expect(report.perf!.paths).toEqual({
        total: 11,
        read: 4,
        declaredHidden: 0,
        writeOnceShaped: 3,
        tables: 1,
        onWriteOncePointer: 'report'
      });
    });

    describe('declared surface (PostGraphile behaviors)', () => {
      function signalsFor(findings: Finding[], constraint: string): string[] {
        const finding = x1For(findings, constraint);
        return ((finding?.context as { pathSignals?: string[] })?.pathSignals ?? []);
      }

      it('reads an explicit denial off the constraint comment', async () => {
        await applyFixture('paths-behaviors.sql');
        const report = await audit(pg.client as never, { schemas: ['fx_bhv'], perf: true });
        const findings = report.perf!.findings;

        expect(signalsFor(findings, 'hidden_module_hidden_owner_id_fkey'))
          .toEqual(['behavior-hidden']);
        // The tag survives a description on the following lines.
        expect(signalsFor(findings, 'hidden_module_table_id_fkey')).toEqual(['behavior-hidden']);
        // A table nothing can select has no API path through any of its keys.
        expect(signalsFor(findings, 'internal_log_log_owner_id_fkey'))
          .toEqual(['behavior-hidden']);
      });

      it('treats a partial denial, a retraction and silence alike: no signal', async () => {
        const report = await audit(pg.client as never, { schemas: ['fx_bhv'], perf: true });
        const findings = report.perf!.findings;

        // Still reachable as a single record.
        expect(signalsFor(findings, 'partial_module_partial_owner_id_fkey')).toEqual([]);
        // `-* +list +connection +single` denies nothing that matters here.
        expect(signalsFor(findings, 'partial_module_table_id_fkey')).toEqual([]);
        // No behavior at all is the preset default, which usually exposes it.
        expect(signalsFor(findings, 'posts_author_id_fkey')).toEqual([]);
      });

      it('lets a read outrank the declaration: RLS traverses the key regardless', async () => {
        const report = await audit(pg.client as never, { schemas: ['fx_bhv'], perf: true });
        const finding = x1For(report.perf!.findings, 'tenant_scoped_tenant_owner_id_fkey');
        expect((finding?.context as { pathSignals: string[] }).pathSignals)
          .toEqual(['policy-read', 'behavior-hidden']);
        expect((finding?.context as { pathAssessment: string }).pathAssessment).toBe('read');
      });

      it('changes no finding and no severity — the signal is reported only', async () => {
        const report = await audit(pg.client as never, { schemas: ['fx_bhv'], perf: true });
        const findings = report.perf!.findings;

        expect(x1For(findings, 'hidden_module_hidden_owner_id_fkey')?.severity).toBe('medium');
        // Four keys are declared hidden; the fifth denial loses to a policy read.
        expect(report.perf!.paths).toMatchObject({ total: 7, read: 1, declaredHidden: 3 });
      });
    });

    it('raises the config-record threshold on request', async () => {
      const report = await audit(pg.client as never, {
        schemas: ['fx_cold'],
        perf: true,
        config: { perf: { paths: { minPointers: 3, onWriteOncePointer: 'suppress' } } }
      });
      // agent_module has two write-once pointers, so a threshold of three
      // stops the config-record signal firing and X1 returns for all four keys.
      expect(x1Constraints(report.perf!.findings).filter((c) => c.startsWith('agent_module')))
        .toHaveLength(4);
    });
  });

  it('X5: flags duplicate and prefix indexes, not unique/partial/expression ones', async () => {
    await applyFixture('x5-redundant-index.sql');
    const report = await audit(pg.client as never, { schemas: ['fx_x5'], perf: true });
    const names = report.perf!.findings
      .filter((f) => f.code === 'X5')
      .map((f) => (f.context as { index: string }).index)
      .sort();
    expect(names).toEqual([
      'widgets_tenant_a_idx',
      'widgets_tenant_b_idx',
      'widgets_tenant_idx'
    ]);
    const duplicate = report.perf!.findings.find(
      (f) => f.code === 'X5' && (f.context as { index: string }).index === 'widgets_tenant_b_idx'
    );
    expect(duplicate?.context).toMatchObject({ coveredBy: 'widgets_tenant_a_idx', duplicate: true });
  });

  it('X6: flags tables with no primary key and no replica identity', async () => {
    await applyFixture('x6-no-primary-key.sql');
    const report = await audit(pg.client as never, { schemas: ['fx_x6'], perf: true });
    expect(tablesFor(report.perf!.findings, 'X6')).toEqual(['fx_x6.events']);
  });

  it('scores perf separately from security and keeps both in report.findings', async () => {
    const report = await audit(pg.client as never, { schemas: ['fx_x1', 'fx_x5', 'fx_x6'], perf: true });
    expect(report.perf!.score.value).toBeLessThan(100);
    expect(report.perf!.score.deductions.map((d) => d.code)).toEqual(
      expect.arrayContaining(['X1'])
    );
    // The security score never sees perf findings.
    expect(report.score!.deductions.some((d) => d.code.startsWith('X'))).toBe(false);
    expect(report.findings.some((f) => f.code === 'X1')).toBe(true);
    expect(report.perf!.findings.every((f) => f.dimension === 'perf')).toBe(true);
  });

  it('perf.ignore acknowledges declared perf debt', async () => {
    const report = await audit(pg.client as never, {
      schemas: ['fx_x1'],
      perf: true,
      config: { perf: { ignore: ['fx_x1.*'] } }
    });
    const x1 = report.perf!.findings.filter((f) => f.code === 'X1');
    expect(x1.length).toBeGreaterThan(0);
    expect(x1.every((f) => f.acknowledged && f.severity === 'info')).toBe(true);
    // Nothing left to deduct (the score itself is still capped by the unknown
    // exposure surface these fixtures run without).
    expect(report.perf!.score.deductions).toHaveLength(0);
  });

  it('perf.rules retunes perf rules only', async () => {
    const report = await audit(pg.client as never, {
      schemas: ['fx_x1'],
      perf: true,
      config: { perf: { rules: { X1: 'off' } } }
    });
    expect(report.perf!.findings.filter((f) => f.code === 'X1')).toHaveLength(0);

    expect(() => resolveRules({ perf: { rules: { A2: 'off' } } })).toThrow(ConfigValidationError);
  });
});

describe('policy-aware perf rules', () => {
  beforeAll(async () => {
    await applyFixture('x2-policy-index.sql');
  });

  it('X2: flags policy columns that lead no index', async () => {
    const report = await audit(pg.client as never, { schemas: ['fx_x2'], perf: true });
    expect(tablesFor(report.perf!.findings, 'X2')).toEqual([
      'fx_x2.documents',
      'fx_x2.receipts'
    ]);
    const documents = report.perf!.findings.find((f) => f.code === 'X2' && f.table === 'documents');
    expect(documents?.policy).toBe('documents_tenant');
    expect(documents?.context).toMatchObject({ column: 'tenant_id', clause: 'USING' });
  });

  it('X2: is not raised when the policy column leads an index', async () => {
    const report = await audit(pg.client as never, { schemas: ['fx_x2'], perf: true });
    expect(tablesFor(report.perf!.findings, 'X2')).not.toContain('fx_x2.invoices');
  });

  it('X3: flags casts/functions on policy columns without a matching expression index', async () => {
    const report = await audit(pg.client as never, { schemas: ['fx_x2'], perf: true });
    expect(tablesFor(report.perf!.findings, 'X3')).toEqual(['fx_x2.accounts']);
    const accounts = report.perf!.findings.find((f) => f.code === 'X3');
    expect(accounts?.context).toMatchObject({ column: 'tenant_id', expression: 'tenant_id::text' });
  });

  it('X4: flags non-LEAKPROOF policy functions, not LEAKPROOF ones', async () => {
    const report = await audit(pg.client as never, { schemas: ['fx_x2'], perf: true });
    const x4 = report.perf!.findings.filter((f) => f.code === 'X4');
    const functions = x4.map((f) => (f.context as { function: string }).function).sort();
    expect(functions).toContain('fx_x2.is_member');
    expect(functions).not.toContain('fx_x2.is_admin');
  });

  it('X2/X3/X4 stay off when perf is disabled', async () => {
    const report = await audit(pg.client as never, { schemas: ['fx_x2'] });
    expect(report.findings.filter((f) => ['X2', 'X3', 'X4'].includes(f.code))).toHaveLength(0);
  });
});

describe('X9 — per-row policy calls that the planner could hoist', () => {
  it('flags unwrapped STABLE calls and spares wrapped ones', async () => {
    await applyFixture('x9-initplan.sql');
    const report = await audit(pg.client as never, { schemas: ['fx_x9'], perf: true });
    const x9 = report.perf!.findings.filter((f) => f.code === 'X9');

    expect(tablesFor(x9, 'X9')).toEqual([
      // Correlated subquery: runs per outer row, so the call inside it does too.
      'fx_x9.bare',
      'fx_x9.correlated',
      // current_setting() is STABLE — dropping the wrapper doesn't fix anything.
      'fx_x9.raw_guc',
      'fx_x9.writes'
    ]);

    const bare = x9.find((f) => f.table === 'bare');
    expect(bare?.severity).toBe('medium');
    expect(bare?.dimension).toBe('perf');
    expect(bare?.context).toMatchObject({ function: 'fx_x9.current_tenant', clause: 'USING' });
    expect(bare?.hint).toContain('(SELECT fx_x9.current_tenant())');

    expect(x9.find((f) => f.table === 'writes')?.context).toMatchObject({ clause: 'WITH CHECK' });
  });

  it('ignores row-dependent, volatile and immutable calls', async () => {
    const report = await audit(pg.client as never, { schemas: ['fx_x9'], perf: true });
    const tables = tablesFor(report.perf!.findings, 'X9');
    // Argument references a column — nothing to hoist.
    expect(tables).not.toContain('fx_x9.row_dependent');
    // VOLATILE is per-row by definition; IMMUTABLE is folded at plan time.
    expect(tables).not.toContain('fx_x9.other_volatility');
    // Already an InitPlan.
    expect(tables).not.toContain('fx_x9.hoisted');
  });

  it('stays off when perf is disabled', async () => {
    const report = await audit(pg.client as never, { schemas: ['fx_x9'] });
    expect(report.findings.filter((f) => f.code === 'X9')).toHaveLength(0);
  });
});

describe('P1/P1b re-homed to the perf dimension', () => {
  it('keeps P1 out of the security score', async () => {
    await applyFixture('p1-volatile-func.sql');
    const report = await audit(pg.client as never, { schemas: ['fx_p1'], perf: true });
    const p1 = report.findings.find((f) => f.code === 'P1');
    expect(p1?.dimension).toBe('perf');
    expect(report.perf!.findings).toContain(p1);
    expect(report.score!.deductions.some((d) => d.code === 'P1')).toBe(false);
  });
});

describe('perf baseline ratchet', () => {
  it('accepts committed debt and flags only what is new', async () => {
    const report = await audit(pg.client as never, { schemas: ['fx_x1'], perf: true });
    const findings = report.perf!.findings;
    expect(findings.length).toBeGreaterThan(1);

    const full = toPerfBaseline(findings);
    expect(diffPerf(findings, full).added).toHaveLength(0);
    expect(diffPerf(findings, full).accepted).toHaveLength(findings.length);

    // A baseline missing one entry is what "someone added new debt" looks like.
    const partial = { ...full, findings: full.findings.slice(1) };
    const diff = diffPerf(findings, partial);
    expect(diff.added).toHaveLength(1);
    expect(toBaselineFinding(diff.added[0])).toEqual(full.findings[0]);
  });
});

describe('X7/X8: search and sort index coverage', () => {
  beforeAll(async () => {
    await applyFixture('x7-search-sort.sql');
  });

  it('X7: flags tsvector columns with no GIN/GiST index', async () => {
    const report = await audit(pg.client as never, { schemas: ['fx_x7'], perf: true });
    expect(tablesFor(report.perf!.findings, 'X7')).toEqual(['fx_x7.articles']);
    const x7 = report.perf!.findings.find((f) => f.code === 'X7');
    expect(x7?.severity).toBe('medium');
    expect(x7?.context).toMatchObject({ column: 'search_doc', type: 'tsvector' });
  });

  it('X8: flags sort-shaped columns that lead no index', async () => {
    const report = await audit(pg.client as never, { schemas: ['fx_x7'], perf: true });
    const columns = report.perf!.findings
      .filter((f) => f.code === 'X8')
      .map((f) => `${f.table}.${(f.context as { column: string }).column}`)
      .sort();
    // articles.created_at leads an index; notes.created_at is only in trailing
    // position, and notes.updated_at leads a *partial* index.
    expect(columns).toEqual([
      'articles.updated_at',
      'notes.created_at',
      'notes.updated_at'
    ]);
    expect(report.perf!.findings.find((f) => f.code === 'X8')?.severity).toBe('info');
  });

  it('X8 is advisory — info findings never move the perf score', async () => {
    const report = await audit(pg.client as never, { schemas: ['fx_x7'], perf: true });
    const x8 = report.perf!.score.deductions.find((d) => d.code === 'X8')!;
    // reported, so the count is visible, but explicitly worth nothing
    expect(x8.unscored).toBe(true);
    expect(x8.points).toBe(0);
    expect(x8.potential).toBe(0);
  });

  it('X7/X8 stay off when perf is disabled', async () => {
    const report = await audit(pg.client as never, { schemas: ['fx_x7'] });
    expect(report.findings.filter((f) => ['X7', 'X8'].includes(f.code))).toHaveLength(0);
  });
});
