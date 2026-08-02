# Advanced — runtime statistics, planner proof, library and pgpm use

- [Runtime statistics (`--stats`)](#runtime-statistics---stats)
- [Planner proof (`--explain`)](#planner-proof---explain)
- [Library use](#library-use)
- [pgpm projects](#pgpm-projects)

## Runtime statistics (`--stats`)

The `X*` rules read the schema; the `S*` rules read what the workload actually did to it. They come
from `pg_stat_user_tables`, `pg_stat_user_indexes` and — when the extension is installed —
`pg_stat_statements`, so they only mean something against a database that has served representative
traffic. Opt in with `--stats` (which implies `--perf`):

| Code | Severity | Check |
| --- | --- | --- |
| S1 | medium | **Sequential-scan-dominant table** — seq scans outnumber index scans 10:1 on a table with indexes and ≥ 1000 live rows |
| S2 | low | **Index the planner has never chosen** (`idx_scan = 0`) and larger than 1 MiB — pure write cost, unless it's there for a rare report |
| S3 | low | **Dead-tuple bloat** — dead tuples ≥ 20% of live rows; autovacuum is not keeping up |
| S4 | info | **Statement hotspot** — a statement taking ≥ 5% of sampled execution time whose relations are in scope |

Every threshold is a floor, and every floor is configurable, because a counter is only evidence if
there is enough of it:

```jsonc
{
  "perf": {
    "stats": {
      "minRows": 1000,          // S1/S3: below this a scan is the right plan
      "seqScanRatio": 10,       // S1: seq:idx scan ratio that counts as dominant
      "minIndexBytes": 1048576, // S2: ignore indexes too small to be worth dropping
      "deadTupleRatio": 0.2,    // S3
      "minTimeShare": 0.05,     // S4: share of total sampled time
      "topStatements": 5        // S4: cap
    },
    "scoring": { "includeStats": false }   // demote S* to advisories
  }
}
```

`S*` findings are **scored** on the perf axis — asking for `--stats` is the opt-in — but
`perf.scoring.includeStats: false` demotes them to advisories if you want the grade to stay purely
deterministic. The report carries its own provenance in `perf.stats`: how many tables were read,
when the counters were last reset (the window the numbers describe), whether they were scored, and
a note when `pg_stat_statements` isn't installed. Absent statistics are never an error; the audit
just says so.

Do not turn `--stats` on in a CI job that provisions a fresh database: the only workload those
counters describe is the migration that just ran.

## Planner proof (`--explain`)

The `X*` rules *infer* from the catalog that nothing can serve a query shape. `--explain` asks the
database instead: for each probeable finding it plans the query the finding is a claim about with
`EXPLAIN (GENERIC_PLAN, FORMAT JSON)` — nothing is executed, and parameters stay parameters, so no
value has to be invented for a column — and attaches the plan as `finding.evidence`.

The interesting outcome is disagreement. A finding whose probe plans as an index scan is
**refuted**: some index the catalog rules didn't credit (a hash index on an FK column, say) does
serve it, so the finding is acknowledged, reported as info, and dropped from the perf score. The
reverse is deliberately not symmetrical — an empty or unanalyzed table always seq-scans, so a seq
scan **confirms** a finding only above a planner row estimate of 1000 (`perf.explain.minRows`);
below that the probe is `inconclusive` and the finding is left exactly as the static rule made it.

```bash
safegres audit --perf --explain --database mydb
```

```
[medium] X1  app_public.posts
    foreign key posts_author_id_fkey has no covering index
    plan (confirmed): Seq Scan
[info] X1  app_public.notes
    foreign key notes_author_id_fkey has no covering index — refuted by EXPLAIN (the planner serves this shape with an index)
    plan (refuted): Bitmap Heap Scan → Bitmap Index Scan
  planner proof: 1 confirmed, 1 refuted, 1 inconclusive of 3 probed
```

Probes exist for X1, X2, X7 and X8 — the rules that name a query shape. X5, X6, `P*` and `S*` are
claims about the schema or the workload rather than a plan, so nothing is planned speculatively on
their behalf. `GENERIC_PLAN` requires PostgreSQL 16+; on older servers the audit reports
`perf.explain.unavailable` and leaves the findings untouched.

## Library use

```ts
import { Client } from 'pg';
import { getPgEnvOptions } from 'pg-env';
import { audit, renderPretty, renderMarkdown } from 'safegres';

const client = new Client(getPgEnvOptions());
await client.connect();

const report = await audit(client, {
  perf: true,
  excludeSchemas: ['my_private_schema'],
  config: { extends: 'safegres:recommended', exposure: { schemas: ['app_public'] } }
});

console.log(renderPretty(report));
console.log(report.score);        // { value, grade, model, deductions, ... }
console.log(report.perf?.score);  // the independent perf axis
```

Also exported: `renderJson`, `renderMarkdown`, `renderSarif`, `buildSourceIndex`,
`toPerfBaseline` / `parsePerfBaseline` / `serializePerfBaseline` / `diffPerf`,
`toSnapshot` / `parseSnapshot` / `serializeSnapshot` / `compareReports`.

## pgpm projects

For [pgpm](../../../pgpm/pgpm) workspaces, safegres can deploy the workspace into an ephemeral test
database and audit it — no running database or connection flags required (needs the optional peer
dependency `pgsql-test`):

```bash
safegres audit --pgpm            # nearest pgpm module/workspace from cwd
safegres audit --pgpm ./packages/my-db
```

Or as a jest test via the `safegres/pgpm-test` entrypoint:

```ts
import { auditPgpmWorkspace } from 'safegres/pgpm-test';

it('passes the security audit', async () => {
  const report = await auditPgpmWorkspace();
  expect(report.score.grade).toBe('A+');
});
```

Both discover the project's safegres config (`safegres.config.js`, `.safegresrc*`, …) by walking up
from the workspace directory. pgpm projects usually don't have Constructive routing metadata, so
declare the exposed surface statically:

```json
{
  "extends": "safegres:recommended",
  "exposure": { "schemas": ["app_public"] }
}
```

For every other project, the equivalent is a service container plus the migration command you
already have — see [CI in one job](../README.md#ci-in-one-job).
