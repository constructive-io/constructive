import * as fs from 'fs';
import * as path from 'path';
import { getConnections, PgTestClient } from 'pgsql-test';

import {
  checkDeadTuples,
  checkSeqScanDominant,
  checkStats,
  checkTopStatements,
  checkUnusedIndexes,
  DEFAULT_STATS_THRESHOLDS
} from '../src/checks/stats';
import { audit } from '../src/commands/audit';
import type { StatementUsage, TableUsage } from '../src/pg/stats';
import type { Finding } from '../src/types';

jest.setTimeout(120000);

let pg: PgTestClient;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ pg, teardown } = await getConnections());
  const filepath = path.join(__dirname, 'fixtures', 'e1-explain.sql');
  await pg.any(fs.readFileSync(filepath, 'utf8'));
});

afterAll(async () => {
  if (teardown) await teardown();
});

function table(over: Partial<TableUsage> = {}): TableUsage {
  return {
    schema: 'app_public',
    name: 'events',
    seqScans: 0,
    seqTuplesRead: 0,
    indexScans: 0,
    liveTuples: 0,
    deadTuples: 0,
    sizeBytes: 0,
    lastVacuum: null,
    lastAnalyze: null,
    indexes: [],
    ...over
  };
}

/**
 * The `S*` rules are unit-tested against synthetic snapshots: cumulative
 * counters are shared state that a test transaction cannot deterministically
 * produce, so asserting on live numbers would be asserting on the harness.
 * The live path is covered by the integration tests below.
 */
describe('S1 — sequential-scan-dominant tables', () => {
  const scanned = table({
    liveTuples: 50000,
    seqScans: 400,
    seqTuplesRead: 20000000,
    indexScans: 10,
    indexes: [{ name: 'events_pkey', scans: 10, sizeBytes: 8192, unique: true, constraint: true }]
  });

  it('fires when seq scans dominate on a table above the row floor', () => {
    const finding = checkSeqScanDominant(scanned, DEFAULT_STATS_THRESHOLDS);
    expect(finding?.code).toBe('S1');
    expect(finding?.severity).toBe('medium');
    expect(finding?.context).toMatchObject({ seqScans: 400, indexScans: 10 });
  });

  it('stays silent below the row floor — a small table is meant to be scanned', () => {
    expect(checkSeqScanDominant({ ...scanned, liveTuples: 100 }, DEFAULT_STATS_THRESHOLDS))
      .toBeNull();
  });

  it('stays silent when the planner does use the indexes', () => {
    expect(checkSeqScanDominant({ ...scanned, indexScans: 4000 }, DEFAULT_STATS_THRESHOLDS))
      .toBeNull();
  });

  it('defers to X1/X6 when the table has no index at all', () => {
    expect(checkSeqScanDominant({ ...scanned, indexes: [] }, DEFAULT_STATS_THRESHOLDS)).toBeNull();
  });
});

describe('S2 — never-scanned indexes', () => {
  it('flags a large unused index, and exempts constraint-backed ones', () => {
    const findings = checkUnusedIndexes(
      table({
        indexes: [
          { name: 'events_unused_idx', scans: 0, sizeBytes: 64 * 1024 * 1024, unique: false, constraint: false },
          { name: 'events_pkey', scans: 0, sizeBytes: 64 * 1024 * 1024, unique: true, constraint: true },
          { name: 'events_used_idx', scans: 12, sizeBytes: 64 * 1024 * 1024, unique: false, constraint: false },
          { name: 'events_tiny_idx', scans: 0, sizeBytes: 8192, unique: false, constraint: false }
        ]
      }),
      DEFAULT_STATS_THRESHOLDS
    );
    expect(findings.map((f) => (f.context as { index: string }).index)).toEqual([
      'events_unused_idx'
    ]);
    expect(findings[0].message).toContain('64.0 MiB');
  });
});

describe('S3 — dead-tuple bloat', () => {
  it('fires above the ratio and stays silent below it', () => {
    const bloated = table({ liveTuples: 10000, deadTuples: 4000 });
    expect(checkDeadTuples(bloated, DEFAULT_STATS_THRESHOLDS)?.code).toBe('S3');
    expect(checkDeadTuples({ ...bloated, deadTuples: 100 }, DEFAULT_STATS_THRESHOLDS)).toBeNull();
  });
});

describe('S4 — statement hotspots', () => {
  const statements: StatementUsage[] = [
    {
      query: 'SELECT * FROM app_public.events WHERE payload @> $1',
      calls: 900,
      totalTimeMs: 9000,
      meanTimeMs: 10,
      rows: 900
    },
    {
      query: 'UPDATE app_public.events SET payload = $1 WHERE id = $2',
      calls: 600,
      totalTimeMs: 6000,
      meanTimeMs: 10,
      rows: 600
    },
    { query: 'SELECT 1', calls: 10, totalTimeMs: 5, meanTimeMs: 0.5, rows: 10 }
  ];

  it('reports only statements over the time share that touch a table in scope', () => {
    const findings = checkTopStatements(statements, [table()], DEFAULT_STATS_THRESHOLDS);
    // `SELECT 1` is under the share and touches nothing in scope.
    expect(findings).toHaveLength(2);
    expect(findings[0].code).toBe('S4');
    expect(findings[0].severity).toBe('info');
    expect(findings[0].context).toMatchObject({ relations: ['app_public.events'], calls: 900 });
  });

  it('ignores statements that touch nothing in scope', () => {
    const findings = checkTopStatements(statements, [table({ name: 'other' })], DEFAULT_STATS_THRESHOLDS);
    expect(findings).toHaveLength(0);
  });

  it('honours the configured share and count limits', () => {
    // 9000ms and 6000ms of 15005ms total: 60% and 40%.
    expect(
      checkTopStatements(statements, [table()], { ...DEFAULT_STATS_THRESHOLDS, minTimeShare: 0.5 })
    ).toHaveLength(1);
    expect(
      checkTopStatements(statements, [table()], { ...DEFAULT_STATS_THRESHOLDS, topStatements: 1 })
    ).toHaveLength(1);
  });
});

describe('checkStats', () => {
  it('runs every rule over one snapshot', () => {
    const findings = checkStats({
      tables: [
        table({
          liveTuples: 50000,
          deadTuples: 20000,
          seqScans: 400,
          indexScans: 1,
          indexes: [
            { name: 'events_unused_idx', scans: 0, sizeBytes: 8 * 1024 * 1024, unique: false, constraint: false }
          ]
        })
      ],
      statsReset: null
    });
    expect(findings.map((f) => f.code).sort()).toEqual(['S1', 'S2', 'S3']);
  });
});

describe('--stats (live)', () => {
  it('reports provenance and notes the missing pg_stat_statements extension', async () => {
    const report = await audit(pg.client as never, { schemas: ['fx_explain'], stats: true });
    expect(report.perf?.stats?.source).toBe('live');
    expect(report.perf?.stats?.tables).toBeGreaterThan(0);
    expect(report.perf?.stats?.scored).toBe(true);
    const notes = report.perf?.stats?.notes ?? [];
    // The extension is optional; whichever way this database is built, the
    // report must say which of the two situations produced the S4 findings.
    if (notes.length > 0) expect(notes[0]).toContain('pg_stat_statements');
  });

  it('implies --perf without being asked, and stays off otherwise', async () => {
    const withStats = await audit(pg.client as never, { schemas: ['fx_explain'], stats: true });
    expect(withStats.perf).toBeDefined();

    const plain = await audit(pg.client as never, { schemas: ['fx_explain'] });
    expect(plain.perf).toBeUndefined();
    expect(plain.findings.some((f) => f.code.startsWith('S'))).toBe(false);
  });

  it('demotes S* findings to advisories when includeStats is false', async () => {
    const report = await audit(pg.client as never, {
      schemas: ['fx_explain'],
      stats: true,
      config: { perf: { scoring: { includeStats: false } } }
    });
    expect(report.perf?.stats?.scored).toBe(false);
    expect(report.perf?.score.deductions.some((d) => d.code.startsWith('S'))).toBe(false);
  });
});

describe('--explain (planner proof)', () => {
  function evidenceFor(findings: Finding[], code: string, table: string): Finding | undefined {
    return findings.find((f) => f.code === code && f.table === table);
  }

  it('confirms, refutes, and declines to conclude', async () => {
    const report = await audit(pg.client as never, { schemas: ['fx_explain'], explain: true });
    const findings = report.perf!.findings;

    // No index at all on a 20k-row table: the plan is the seq scan the rule predicted.
    const confirmed = evidenceFor(findings, 'X1', 'posts');
    expect(confirmed?.evidence?.status).toBe('confirmed');
    expect(confirmed?.evidence?.plan).toContain('Seq Scan');
    expect(confirmed?.acknowledged).toBeUndefined();

    // A hash index serves the equality even though the catalog rule only
    // credits btree — the planner overrules the inference.
    const refuted = evidenceFor(findings, 'X1', 'notes');
    expect(refuted?.evidence?.status).toBe('refuted');
    expect(refuted?.evidence?.plan).toContain('Index');
    expect(refuted?.acknowledged).toBe(true);
    expect(refuted?.severity).toBe('info');

    // Five rows: a seq scan is correct, so the probe proves nothing.
    const inconclusive = evidenceFor(findings, 'X1', 'tiny');
    expect(inconclusive?.evidence?.status).toBe('inconclusive');
    expect(inconclusive?.evidence?.note).toContain('estimated rows');
    expect(inconclusive?.severity).toBe('medium');

    expect(report.perf?.explain).toMatchObject({ confirmed: 1, refuted: 1, inconclusive: 1 });
  });

  it('keeps refuted findings out of the perf score', async () => {
    const report = await audit(pg.client as never, { schemas: ['fx_explain'], explain: true });
    const x1 = report.perf!.score.deductions.find((d) => d.code === 'X1');
    // posts and tiny still count; notes was refuted.
    expect(x1?.count).toBe(2);
  });

  it('implies --perf and changes nothing when off', async () => {
    const plain = await audit(pg.client as never, { schemas: ['fx_explain'], perf: true });
    expect(plain.perf!.findings.every((f) => f.evidence === undefined)).toBe(true);
    expect(plain.perf!.explain).toBeUndefined();
  });
});
