import {
  classifyAgainstLedger,
  emitLedgerBackfill,
  LedgerChangeRecord,
  PlanChangeRef
} from '../src/ledger';

const ref = (pkg: string, name: string, hashes: string[], dependencies: string[] = []): PlanChangeRef => ({
  package: pkg,
  name,
  hashes,
  dependencies
});

const row = (pkg: string, changeName: string, scriptHash: string): LedgerChangeRecord => ({
  package: pkg,
  changeName,
  scriptHash
});

describe('classifyAgainstLedger', () => {
  it('classifies identical, drifted, and pending plan entries', () => {
    const plan = [
      ref('app', 'schema', ['h1', 'a1']),
      ref('app', 'users', ['h2', 'a2']),
      ref('app', 'posts', ['h3', 'a3'])
    ];
    const ledger = [row('app', 'schema', 'h1'), row('app', 'users', 'other')];
    const { entries } = classifyAgainstLedger(plan, ledger);
    expect(entries).toEqual([
      { package: 'app', name: 'schema', status: 'deployed-identical', ledgerHash: 'h1' },
      { package: 'app', name: 'users', status: 'deployed-drifted', ledgerHash: 'other' },
      { package: 'app', name: 'posts', status: 'pending' }
    ]);
  });

  it('matches on any candidate hash (content or AST)', () => {
    const plan = [ref('app', 'schema', ['content-hash', 'ast-hash'])];
    const { entries } = classifyAgainstLedger(plan, [row('app', 'schema', 'ast-hash')]);
    expect(entries[0].status).toBe('deployed-identical');
  });

  it('reports ledger rows absent from the plan as orphaned', () => {
    const { orphaned } = classifyAgainstLedger(
      [ref('app', 'schema', ['h1'])],
      [row('app', 'schema', 'h1'), row('app', 'legacy', 'hx')]
    );
    expect(orphaned).toEqual([row('app', 'legacy', 'hx')]);
  });

  it('detects plan-order inversions in the deployed sequence', () => {
    const plan = [
      ref('app', 'first', ['h1']),
      ref('app', 'second', ['h2']),
      ref('app', 'third', ['h3'])
    ];
    // Deployed third before second: second is out of order relative to the plan.
    const ledger = [row('app', 'first', 'h1'), row('app', 'third', 'h3'), row('app', 'second', 'h2')];
    const { outOfOrder } = classifyAgainstLedger(plan, ledger);
    expect(outOfOrder).toEqual(['app:second']);
  });

  it('is empty-safe in both directions', () => {
    expect(classifyAgainstLedger([], [])).toEqual({ entries: [], orphaned: [], outOfOrder: [] });
    const { entries } = classifyAgainstLedger([ref('app', 'schema', ['h1'])], []);
    expect(entries[0].status).toBe('pending');
  });
});

describe('emitLedgerBackfill', () => {
  it('emits log-only pgpm_migrate.deploy calls in order, in a transaction', () => {
    const sql = emitLedgerBackfill([
      { package: 'app', changeName: 'schema', scriptHash: 'h1', requires: [] },
      { package: 'app', changeName: 'users', scriptHash: 'h2', requires: ['schema', 'base:init'] }
    ]);
    expect(sql).toContain('BEGIN;');
    expect(sql).toContain("CALL pgpm_migrate.deploy('app', 'schema', 'h1', NULL, '', TRUE);");
    expect(sql).toContain("CALL pgpm_migrate.deploy('app', 'users', 'h2', ARRAY['schema', 'base:init'], '', TRUE);");
    expect(sql.indexOf("'schema'")).toBeLessThan(sql.indexOf("'users'"));
    expect(sql).toContain('COMMIT;');
  });

  it('escapes single quotes in SQL literals', () => {
    const sql = emitLedgerBackfill([
      { package: 'app', changeName: "it's", scriptHash: 'h', requires: [] }
    ]);
    expect(sql).toContain("'it''s'");
  });

  it('can emit without a transaction wrapper', () => {
    const sql = emitLedgerBackfill(
      [{ package: 'app', changeName: 'schema', scriptHash: 'h1', requires: [] }],
      { transaction: false }
    );
    expect(sql).not.toContain('BEGIN;');
    expect(sql).not.toContain('COMMIT;');
  });
});
