# safegres

<p align="center" width="100%">
  <img src="https://raw.githubusercontent.com/Safegres/brand/refs/heads/main/safegres.svg" alt="safegres" width="120" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/safegres"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=packages%2Fsafegres%2Fpackage.json"/></a>
</p>

Pure-Postgres Row-Level Security auditor. No app framework required. Drop it on any PostgreSQL database and get a structured report on grants, RLS enforcement, policy coverage, and risky SQL policy patterns.

safegres audits Row-Level Security from inside Postgres. It checks whether tables with grants are protected by RLS, whether policies actually cover the granted operations, and whether policy bodies contain risky patterns like permissive `true` checks, volatile functions, or role/session-based bypass logic.

```bash
npm install -g safegres

# Standard libpq env vars (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE)
export PGHOST=localhost PGUSER=postgres PGPASSWORD=password PGDATABASE=mydb
safegres audit
```

Per-field overrides (`--host`, `--port`, `--user`, `--password`, `--database`) and a full `--connection <url>` flag are also supported. See `safegres audit --help`.

### Output & verbosity

Pretty output prints the exposure line, score, and the exposed findings. Internal (non-exposed) advisories are collapsed to a one-line count by default so a large database's report stays readable.

- `--summary`, `-q` — print only the exposure line, score/grade, and severity counts (no per-finding lines). Ideal for CI job summaries.
- `--verbose` — expand the internal advisories instead of collapsing them to a count.
- `--exposed-only` — drop internal findings entirely.
- `--format json` / `--format json-pretty` — machine-readable output (always carries every finding).
- `--format markdown` — the same report as GitHub-flavoured markdown, for a job summary or a PR comment (see [CI](#ci)).
- `--format sarif` — SARIF 2.1.0 for GitHub code scanning (see [CI](#ci)).

### CI

A plain audit is one command and one gate; `--format markdown` writes the report where a reviewer will actually see it:

```yaml
- name: Audit RLS
  run: |
    npx safegres audit --format markdown >> "$GITHUB_STEP_SUMMARY"
    npx safegres audit --fail-on-grade B --summary
  env:
    PGHOST: localhost
    PGUSER: postgres
    PGPASSWORD: postgres
```

Scores lead, then the severity counts, then a table per dimension; internal (non-exposed) advisories and accepted baseline debt fold into `<details>` so the summary stays skimmable. To post it as a PR comment instead, pipe it to `gh pr comment --body-file -`. The same renderer is available to library callers as `renderMarkdown(report)`.

#### What changed (`--compare`)

A report says what the database *is*; on a pull request the only question is what the branch *did* to it. `--compare` diffs this run against a previous one and renders the movement — a Δ column in the score table, the severity counts that moved, and every rule whose finding count changed:

```bash
safegres audit --perf --compare main-report.json --compare-ref main --format markdown
```

```
| Dimension   | Score      | Grade | Δ vs main                                | Top deductions   |
| Security    | **99.3**   | **A+**| 🟢 ▲ +1.2 (from 98.1)                    | `A3` −4 (×2)     |
| Performance | **72.4**   | **C** | 🔴 ▼ −2.6 (from 75.0) · B → C · 40 → 46 findings | `X1` −18 (×46) |
```

Colour tracks *direction*, never severity: 🟢 is a better score or fewer findings, 🔴 the reverse, ⚪ no movement. A rule the previous run never reported — one added by a newer safegres, or a dimension that run didn't scan — renders as `⚪ not measured before` rather than a red increase from zero, so upgrading the scanner doesn't read as a regression.

The previous run is a file, not something safegres remembers: a scanner has no memory and shouldn't acquire one, so CI decides what "previous" means (the report artifact from the base branch, a committed scoreboard, last night's nightly) and hands it over. Any earlier `--format json` output works as input. When keeping whole reports is too much, `--write-snapshot <file>` writes just the aggregates the comparison reads — scores, grades, severity counts, per-rule counts — and `--compare` accepts either. `--compare-ref` labels the previous run in the output.

Library callers get the same thing as `compareReports(previous, report)`, with `toSnapshot` / `parseSnapshot` / `serializeSnapshot` for the file side; the result is carried in JSON output as `comparison`.

#### Code scanning (SARIF)

`--format sarif` emits SARIF 2.1.0, so findings become GitHub code-scanning alerts — Security tab, inline PR annotations, dismissals that stick:

```yaml
- run: npx safegres audit --perf --format sarif --sarif-sources ./deploy > safegres.sarif
- uses: github/codeql-action/upload-sarif@v3
  with: { sarif_file: safegres.sarif }
```

An alert needs a file and a line, but safegres reads the catalog — a live database has no source location. `--sarif-sources <dir>` scans that directory's `.sql` for the `CREATE TABLE` / `CREATE POLICY` that defines each object, so a finding on `app_public.widgets` points at the migration that created it (policy findings resolve to the `CREATE POLICY` line). Findings that don't resolve are still emitted, without a location — GitHub drops those, other SARIF consumers keep them.

Results are fingerprinted by finding *identity* (code + relation + policy + subject, the same key the [perf baseline](#perf-baseline-the-ratchet) uses), never by message text, so rewording a rule in a later release doesn't close and reopen every alert. Perf rules are tagged `performance`, security rules `security`.

## What it checks

| Code | Severity | Direction | Category | Check |
| --- | --- | --- | --- | --- |
| A1 | low | fail-closed | flags | RLS enabled but **0 policies** (deny-all — confirm the lock is intended) |
| A2 | high | fail-open | flags | Grants exist on a table with **RLS disabled** |
| A3 | low | fail-open | flags | RLS enabled but **`FORCE ROW LEVEL SECURITY` not set** (table owner bypass) |
| A4 | low | fail-closed | coverage | INSERT / UPDATE / DELETE grant with **no covering policy** — writes are denied at runtime |
| A5 | low | fail-closed | coverage | SELECT grant with **no policy** — queries silently return 0 rows |
| A6 | info | fail-closed | coverage | UPDATE has `USING` but **no `WITH CHECK`** (row-smuggling surface) |
| A7 | critical | fail-open | anti-pattern | Trivially-permissive **WRITE** policy (INSERT/UPDATE/DELETE/ALL with literal `true`) |
| A8 | low | fail-open | anti-pattern | Trivially-permissive **SELECT** policy (`USING (true)` — confirm public-read is intended) |
| P1 | high | neutral | anti-pattern | Policy body calls a **VOLATILE function** (per-row evaluation) — *scored on the [perf axis](#performance-dimension---perf)* |
| P5 | high | fail-open | anti-pattern | Policy body references **`session_user`** / `current_user` / `pg_has_role(...)` |
| R1 | critical | fail-open | anti-pattern | An **untrusted role** (options: `{ roles: [...] }`) holds a write privilege |
| R2 | high | fail-open | anti-pattern | A permissive write policy applies to an untrusted role or PUBLIC |
| R3 | medium | fail-open | anti-pattern | An RLS table has grants **TO PUBLIC** (includes all current/future roles) |
| W1 | medium | — | meta | No exposure surface configured — whole database assumed reachable, score capped |

**Direction matters**: `fail-open` findings are actual exposure (the untrusted side can reach more than intended). `fail-closed` findings are denied at runtime — an availability/hygiene concern, not a leak — and contribute **nothing to the score** by default (tune with `scoring.failClosedWeight`).

Coverage is aggregated `(table, role) → { hasUsing, hasWithCheck }` across every applicable permissive policy (FOR ALL + PUBLIC-role policies considered). Roles with `BYPASSRLS` are suppressed.

R1/R2 are no-ops until a role list is configured — e.g. `"R1": ["critical", { "roles": ["anonymous"] }]` — so they cost nothing on databases without an untrusted-role model. The `safegres:constructive` preset configures them for `anonymous`.

## Exposure surface

A database-wide score is meaningless if most of the database isn't reachable through the app's APIs. Declare (or auto-resolve) the **exposure surface** and safegres partitions findings:

- **Exposed** findings (on API-reachable schemas) drive the score.
- **Internal** findings are reported as unscored *internal advisories* (hide entirely with `--exposed-only`).
- **No exposure configured** → a `W1` warning is emitted and the score is capped at 80/B (`scoring.unknownExposureCap`).

```jsonc
{
  "exposure": {
    "schemas": ["app_public", "app_hidden"]      // static surface
    // or, on a Constructive database:
    // "resolver": "constructive"                 // introspects routing_public.apis → api_schemas
  }
}
```

CLI: `--exposure-schemas <csv>`, `--exposed-only`. The `safegres:constructive` preset sets `exposure.resolver: "constructive"` so the surface is discovered automatically from the routing plane (including API roles from `role_name`/`anon_role`).

## Extension objects

An extension's tables are the `node_modules` of a database: they live in the same catalog, scan like anything else, and are not yours to alter — `ALTER TABLE` on one breaks `pg_dump` and upgrades. safegres skips relations an extension owns (`pg_depend.deptype = 'e'`), and their partitions, by default.

Ownership alone is not enough. An extension that creates objects *at runtime* never registers them as dependencies: on one Constructive database only 2 of `pg_partman`'s 32 relations were owned, leaving 30 template tables looking like unsecured application tables (30 of the report's 39 criticals). Naming the extension skips its schema wholesale:

```jsonc
{
  "extensions": {
    "ignore": ["pg_partman"],   // skip everything in the extension's schema
    "skipOwned": true           // default; false audits extension-owned relations too
  }
}
```

CLI: `--ignore-extensions <csv>`, `--audit-extension-owned`. Unknown or uninstalled names are ignored, so one config works across environments. The `safegres:constructive` preset ships `ignore: ["pg_partman"]`.

## Declared public surface

Some open reads are deliberate — pricing tables, reference data, a public user directory. Declare them and safegres treats them as intent instead of findings:

```jsonc
{
  "public": {
    "read": [
      "app_public.plans*",        // schema.table globs
      "app_public.event_types",
      "app_public.users"          // deliberate public directory
    ]
  }
}
```

- An open SELECT policy (`USING (true)` — rule A8) on a declared table is **acknowledged**: reported as info, excluded from the score.
- An open read on any *undeclared* table stays a scored finding — even in a `*_public`-named schema. Naming is never treated as intent; the config declaration is.
- `safegres doctor` warns about stale `public.read` patterns that no longer match any table.

## Performance dimension (`--perf`)

A slow database is a different problem from an unsafe one, so safegres scores them separately: `safegres perf` (or `safegres audit --perf`) adds `report.perf` with its own findings, summary, and 0-100 score. It is **off by default** — a plain `audit` behaves exactly as before, and no perf finding ever touches the security score.

| Code | Severity | Category | Check |
| --- | --- | --- | --- |
| X1 | medium | index | **Foreign key with no covering index** — joins and cascading deletes seq-scan the child table |
| X2 | medium | index | **RLS policy filters on an unindexed column** — the security qual seq-scans on every query against the table |
| X3 | medium | index | **Policy casts or wraps its own column** (`tenant_id::text = …`, `lower(email) = …`) with no matching expression index |
| X4 | low | index | **Policy calls a non-LEAKPROOF function** — the qual can't be pushed below joins or subquery scans |
| X5 | low | index | **Redundant index** — an exact duplicate of, or a leading-column prefix of, another index |
| X6 | low | index | **No primary key** and no usable replica identity — rows cannot be addressed by updates, deletes, or logical replication |
| X7 | medium | index | **Search column with no index the search can use** — a `tsvector` without GIN/GiST, a `vector` without HNSW/IVFFlat |
| X8 | info | index | **Sort-shaped column leads no index** (`timestamptz`/`date`) — ordering or cursor-paginating a connection by it sorts the whole table |
| X9 | medium | index | **Policy calls a STABLE function per row** — the call isn't wrapped in a scalar sub-select, so the planner can't hoist it into an InitPlan |
| P1 | high | anti-pattern | Policy body calls a **VOLATILE function** — re-evaluated per row |
| P1b | medium | anti-pattern | Policy body calls a **STABLE function** in a per-row position |

Every check is pure catalog + AST analysis: deterministic, workload-free, and safe to run against an empty CI database. An index covers a foreign key only when its *leading* columns are the FK's columns and it covers every row — partial and expression indexes don't count, because the planner can't use them for the referential-integrity lookup. Constraint-backed, unique, partial, and expression indexes are never reported as redundant.

X7 exists because the column type *is* the API declaration: `graphile-search` exposes a full-text filter for every `tsvector` column and a similarity search for every `vector` column, purely from the codec — so an unindexed one is a first-class API field backed by a sequential scan plus a per-row match or distance computation. BM25 and pg_trgm are deliberately not checked: those adapters are discovered *from* their indexes, so a missing index means the feature was never exposed. X8 is the one heuristic in the set — any column is orderable over a connection, but timestamps are what feeds are actually sorted and keyset-paginated by — so it defaults to `info`, contributes 0 to the score, and is meant to be read, not gated on (`perf.rules: { "X8": "off" }` to silence it). Trailing-position and partial indexes don't count for either rule: neither can serve the sort or the search on its own.

### Access paths: the evidence behind X1

X1 is right about the mechanics — a `DELETE` on the parent really does scan the child — but it assumes the child is a relation somebody traverses. On a provisioning-config table, one whose keys are written once at setup and never looked rows up by, the index it asks for is a write on every insert in exchange for speeding up a scan of one row. Acting on X1 across such a schema makes the database measurably worse while the grade goes up.

The tempting gate, `pg_class.reltuples`, doesn't work here: safegres grades an ephemeral CI database that has never held data, so every row estimate is 0 at exactly the moment it grades. And row count is the wrong question anyway — a huge append-only log nobody joins on wants no FK index, while a tiny lookup table every request hits does. The property that matters is whether anything reads the key, which is structural, so it survives an empty database.

So safegres collects **signals** about every foreign key, each pointing one way and saying why, and reports them on the finding (`context.pathSignals`) and in aggregate (`report.perf.paths`):

| Signal | Direction | Fires when |
| --- | --- | --- |
| `policy-read` | read | an RLS policy predicate names one of the key's columns |
| `view-read` | read | a view or materialized view names one of them |
| `write-once-pointer` | shape | every column of the key has a constant default (`uuid_nil()`, a literal) |
| `config-record` | shape | the table carries two or more write-once pointers (`perf.paths.minPointers`) |
| `behavior-hidden` | declared | a PostGraphile `@behavior` on the constraint denies `list`, `connection` *and* `single`, or the table denies `select` |

A **read** signal is decisive — the database itself traverses the column, so the key is a query path and X1 applies as written. That is what keeps the tenant key out of trouble with no special case: `database_id` appears in essentially every policy. A **shape** signal is not: a `NOT NULL` key defaulting to the nil UUID looks like a slot a provisioner fills in, but a generated API can expose a reverse relation over any foreign key regardless of how its default is written, and if it does, the index is wanted after all.

So by default the shape **changes nothing** — no finding is removed, no severity moves, no score shifts. What it does is tell you where to look, and `perf.paths.onWriteOncePointer` decides what X1 does about it:

- `report` (default) — the finding stands, with the signals attached to it;
- `demote` — write-once-shaped keys drop to `info`, so they are read rather than gated on and contribute nothing to the score;
- `suppress` — no finding. Only defensible once you know the generated API does not expose these relations; a shape is not a proof.

A **declared** signal is the third kind, and it is the one that answers the question the other two only circle: whether the generated API contains the field at all. PostGraphile v5 behaviors are written as an `@behavior` smart tag in the object's comment, so safegres reads them from `pg_description` — no running Graphile instance, no project-specific metadata tables, and the declaration means the same thing in an empty CI database as in production, which is exactly what `reltuples` and `idx_scan` do not.

Only an **explicit denial** counts. Presets grant most behaviors by default, so the absence of `+list` says nothing at all, and a scanner that read silence as denial would recommend dropping an index a live API is using. All three of `list`, `connection` and `single` must be denied — a relation still reachable as a single record is still reachable — and later fragments win, so `-* +list` is a grant. A `read` signal outranks the declaration either way: RLS and views traverse a key whatever the API exposes.

`behavior-hidden` is currently **reported only** — it appears in `context.pathSignals`, in `report.perf.paths.declaredHidden`, and nowhere in the score. Note also what it does *not* claim: the referential-integrity scan on a parent `DELETE` runs whatever the API exposes, so a hidden relation is not the same thing as an unwanted index. `perf.paths.infer: false` skips the collection entirely.

X2–X4 and X9 are the checks a generic index linter can't make, because they read the policy predicate. RLS quals are evaluated *before* user quals, on every candidate row, for every caller — so an unindexed or cast-wrapped policy column is a whole-table tax rather than a slow query. X2 requires the policy column to be the *leading* column of some index (a trailing position can't serve the qual alone); X3 looks for an expression index matching the exact wrapped shape; X4 skips built-ins, whose leakproofness is a property of the server rather than a schema choice.

X9 is the one that costs the most and looks the most innocent. `STABLE` promises a function's result won't change within the statement; it does **not** make the planner evaluate it once. Measured on 200k rows with a policy function that counts its own invocations:

| Policy qual | Calls | Time |
| --- | --- | --- |
| `other_id = current_principal_id()` (Filter) | 200,000 | 424 ms |
| `other_id = (SELECT current_principal_id())` (InitPlan) | 1 | 22 ms |

The honest caveat: the penalty is **plan-dependent**. When the planner can turn the qual into an index condition it evaluates the function once per scan even unwrapped — so the same policy costs one call on an indexed column and 200,000 on a Filter (unindexed column, a join, an OR branch, a plan change after `ANALYZE`). Wrapping removes the dependence: `(SELECT f())` references no column, so it is hoisted into an **InitPlan** and evaluated once per query whatever plan is chosen, and the result is a constant the index can be probed with. X9 is structural, not a name list — it fires on any non-IMMUTABLE call whose arguments reference no column of the row and that isn't already inside an uncorrelated scalar sub-select, so a GUC-reading helper added next year is caught without configuration. `current_setting()` itself is STABLE and is flagged too: removing the wrapper function doesn't avoid the per-row call. VOLATILE calls are deliberately excluded — per-row evaluation is their defined behaviour, and hoisting one would change semantics (that's P1's job). Being inside an `EXISTS` sub-select is not a defence: that subquery is correlated with the outer row, so it runs per row and takes the call with it.

```bash
safegres perf --database mydb
safegres audit --database mydb --perf --fail-on-perf-grade B
```

```jsonc
{
  "perf": {
    "enabled": true,
    "rules": { "X6": "off" },          // perf-dimension codes only
    "ignore": ["app_public.audit_*"],  // declared-intentional perf debt
    "paths": { "onWriteOncePointer": "report" }, // signals are reported, not acted on (default)
    "scoring": { "densityK": 0.17 }
  },
  "failOn": { "perfGrade": "B" }
}
```

Tables matched by `perf.ignore` are acknowledged — reported as info, excluded from the perf score — the same way `public.read` works for open reads. Perf findings live in `report.findings` alongside the security ones (so `--fail-on <severity>` still sees them), but only they feed `report.perf.score`, and only security findings feed `report.score`.

### Perf baseline (the ratchet)

An established schema will not reach a clean perf report in one pass — but it can refuse to get worse. Commit today's findings as accepted debt, then gate CI on findings that are *not* in the baseline:

```bash
safegres audit --write-perf-baseline .safegres-perf.json          # snapshot (implies --perf)
safegres audit --perf-baseline .safegres-perf.json                # diff: new vs accepted vs fixed
safegres audit --perf-baseline .safegres-perf.json --fail-on-new-perf   # gate: exit 1 on new debt
```

```
performance vs baseline:

1 new perf finding since the baseline:
  [medium] X1 app_public.comments — foreign key with no covering index
  (14 accepted, 2 fixed)
```

Entries are identified by `code` + relation + policy + subject (the constraint, index, expression, column, or function the finding is about), so rewording a message or retuning a severity between safegres versions never invalidates a committed baseline, and two findings of the same code on the same table stay distinct. Findings that disappear are reported as fixed — re-run `--write-perf-baseline` to lock the win in and stop them regressing silently. The diff is also carried in JSON output as `perf.diff`, and available to library callers as `diffPerf(findings, baseline)`.

### Runtime statistics (`--stats`)

The `X*` rules read the schema; the `S*` rules read what the workload actually did to it. They come from `pg_stat_user_tables`, `pg_stat_user_indexes` and — when the extension is installed — `pg_stat_statements`, so they only mean something against a database that has served representative traffic. Opt in with `--stats` (which implies `--perf`):

| Code | Severity | Check |
| --- | --- | --- |
| S1 | medium | **Sequential-scan-dominant table** — seq scans outnumber index scans 10:1 on a table with indexes and ≥ 1000 live rows |
| S2 | low | **Index the planner has never chosen** (`idx_scan = 0`) and larger than 1 MiB — pure write cost, unless it's there for a rare report |
| S3 | low | **Dead-tuple bloat** — dead tuples ≥ 20% of live rows; autovacuum is not keeping up |
| S4 | info | **Statement hotspot** — a statement taking ≥ 5% of sampled execution time whose relations are in scope |

Every threshold is a floor, and every floor is configurable, because a counter is only evidence if there is enough of it:

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

`S*` findings are **scored** on the perf axis — asking for `--stats` is the opt-in — but `perf.scoring.includeStats: false` demotes them to advisories if you want the grade to stay purely deterministic. The report carries its own provenance in `perf.stats`: how many tables were read, when the counters were last reset (the window the numbers describe), whether they were scored, and a note when `pg_stat_statements` isn't installed. Absent statistics are never an error; the audit just says so.

### Planner proof (`--explain`)

The `X*` rules *infer* from the catalog that nothing can serve a query shape. `--explain` asks the database instead: for each probeable finding it plans the query the finding is a claim about with `EXPLAIN (GENERIC_PLAN, FORMAT JSON)` — nothing is executed, and parameters stay parameters, so no value has to be invented for a column — and attaches the plan as `finding.evidence`.

The interesting outcome is disagreement. A finding whose probe plans as an index scan is **refuted**: some index the catalog rules didn't credit (a hash index on an FK column, say) does serve it, so the finding is acknowledged, reported as info, and dropped from the perf score. The reverse is deliberately not symmetrical — an empty or unanalyzed table always seq-scans, so a seq scan **confirms** a finding only above a planner row estimate of 1000 (`perf.explain.minRows`); below that the probe is `inconclusive` and the finding is left exactly as the static rule made it.

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

Probes exist for X1, X2, X7 and X8 — the rules that name a query shape. X5, X6, `P*` and `S*` are claims about the schema or the workload rather than a plan, so nothing is planned speculatively on their behalf. `GENERIC_PLAN` requires PostgreSQL 16+; on older servers the audit reports `perf.explain.unavailable` and leaves the findings untouched.

## Call graph (`--call-graph`)

RLS findings tell you what the *tables* allow. The call graph tells you what the *functions* reach: starting from the exposed entry points (functions the API roles can `EXECUTE`), safegres statically walks each body and lists every **trust boundary** on the way — unscored, because a public `SECURITY DEFINER` calling private functions is the intended pattern (that's how `sign_in` works). The output is a deterministic checklist for human review:

| Code | Boundary |
|------|----------|
| CF1 | `SECURITY DEFINER` without a pinned `search_path` (CWE-426) — provable misconfiguration, fix these |
| CF2 | `SECURITY DEFINER` executable by `anonymous`/PUBLIC — widest blast radius, confirm intent |
| CG2 | RLS-bypass path — a DEFINER's owner owns (or bypasses RLS on) a table it touches, so RLS does not protect that table on this path |
| CG3 | Auth-context mutation — a reachable function writes `jwt.claims.*` / `role` |
| CG1 | Trust hop — execution crosses into a `SECURITY DEFINER` (you are trusting its author's authorization logic) |
| CG4 | Internal reach — a non-exposed table is reached from a public entry via a DEFINER path |
| CG5 | Opaque node — dynamic SQL (`EXECUTE`) or an unparseable body; static analysis ends here, audit manually |

```bash
safegres audit --database mydb --call-graph
```

```
call graph — trust boundaries reachable from the exposed surface (unscored; human review)
  2 entry point(s) → 4 reachable function(s)  |  3 trust hop(s)  1 RLS-bypass  1 auth-context  1 internal-reach  1 opaque

CG2 — RLS-bypass paths (RLS does not protect the table on this path) (1)
  • fx_cg_private.verify_password → fx_cg_private.users
      RLS on fx_cg_private.users does not apply on this path — fx_cg_private.verify_password is SECURITY DEFINER running as postgres (BYPASSRLS/superuser)
      via: fx_cg_public.sign_in → fx_cg_private.verify_password
```

Bodies are analyzed for `sql` and `plpgsql` functions (via the PL/pgSQL parser); overloads collapse into one node per `schema.name`; unqualified calls resolve to every user function with that name (a conservative over-approximation). JSON output (`--format json`) carries the full graph — nodes, edges, and checklist — sorted stably so it can be snapshotted and diffed in CI.

### Baseline diffing (CI gate for new trust boundaries)

Snapshot the checklist once, commit it, and let CI report anything **new**:

```bash
safegres audit --write-baseline .safegres-callgraph.json   # snapshot (implies --call-graph)
safegres audit --baseline .safegres-callgraph.json         # diff: report new/resolved boundaries
safegres audit --baseline .safegres-callgraph.json --fail-on-new-boundaries   # gate: exit 1 on new
```

```
baseline: 1 NEW trust boundary — review and re-baseline to accept:
  + [CF2] app_public.new_fn
        SECURITY DEFINER executable by PUBLIC, anonymous — widest blast radius; confirm this is intended
```

The baseline stores only boundary *identity* (`code` + entry + function + table), so message rewording and path changes between safegres versions never invalidate it. A boundary that disappears is reported as resolved; re-run `--write-baseline` to accept either direction. The diff is also carried in JSON output (`callGraphDiff`).

## Configuration

safegres is configurable like a linter. Config is discovered by walking up from the current directory: `safegres.config.{ts,js,mjs,cjs}`, `.safegresrc{,.json,.yaml,.yml,.js}`, `safegres.json`, or a `"safegres"` key in package.json (via [confstash](https://github.com/constructive-io/dev-utils/tree/main/packages/confstash)).

```jsonc
// .safegresrc.json
{
  "extends": "safegres:recommended",
  "excludeSchemas": ["archive"],
  "rules": {
    "A3": "off",            // disable a rule
    "A5": "high",           // retune a severity
    "P*": "medium"          // prefix wildcards
  },
  "overrides": [
    { "tables": ["public.audit_*"], "rules": { "A2": "off" } }
  ],
  "scoring": { "weights": { "medium": 2 } },
  "failOn": { "severity": "high", "grade": "B" }
}
```

Or typed:

```ts
// safegres.config.ts
import { defineConfig } from 'confstash';

export default defineConfig({
  extends: 'safegres:constructive',
  rules: { A6: 'low' }
});
```

### Presets

| Preset | Behavior |
| --- | --- |
| `safegres:recommended` | Every rule at its default severity (the no-config behavior) |
| `safegres:strict` | Everything escalated; fail-closed findings count 25% toward the score, `failOn: high` |
| `safegres:constructive` | Auto-resolves exposure from the routing plane; R1/R2 watch `anonymous`; leak surfaces (A2, P5) critical; A3 off (API roles never own tables); `pg_partman`'s schema ignored |
| `safegres:minimal` | Structural flags only (A1–A3) — fast CI smoke check |

CLI: `--config <path>`, `--preset <name>`, `--rule CODE=off|severity` (repeatable).

### Scoring

Every report includes a config-driven score (0–100 + grade). The default **density** model normalizes by the exposed surface so large schemas don't saturate to 0/F:

```
score = 100 · exp(−k · riskPoints / exposedTables)
```

where `riskPoints` is the severity-weighted sum (critical 25, high 10, medium 4, low 1, info 0) of *exposed, fail-open* findings, and `k` defaults to 0.17 (≈ one critical per 10 exposed tables lands at a C). Non-exposed findings score 0; fail-closed findings score 0 unless `scoring.failClosedWeight` is raised; unknown exposure caps the score (`scoring.unknownExposureCap`, default 80). Any exposed critical floors the grade at C (`scoring.floorOnCritical`). The legacy flat-deduction model is available via `scoring.model: "weighted"`. Tune via `scoring.weights`, `scoring.perRuleWeights`, `scoring.densityK`, `scoring.gradeBands`. Gate CI with `--fail-on-score <n>` / `--fail-on-grade <g>` or `failOn` in config.

### Other commands

```bash
safegres doctor        # diagnose config, parser, connection, catalog access, blind spots
safegres print-config  # show the resolved effective config (--explain for per-key provenance)
```

## Library use

```ts
import { Client } from 'pg';
import { getPgEnvOptions } from 'pg-env';
import { audit, renderPretty } from 'safegres';

const client = new Client(getPgEnvOptions());
await client.connect();

const report = await audit(client, {
  excludeSchemas: ['my_private_schema']
});

console.log(renderPretty(report));
console.log(`${report.findings.length} findings`);
```

## pgpm projects

For pgpm workspaces, safegres can deploy the workspace into an ephemeral test
database and audit it — no running database or connection flags required
(needs the optional peer dependency `pgsql-test`):

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

Both discover the project's safegres config (`safegres.config.js`,
`.safegresrc*`, …) by walking up from the workspace directory. pgpm projects
usually don't have Constructive routing metadata, so declare the exposed
surface statically:

```json
{
  "extends": "safegres:recommended",
  "exposure": { "schemas": ["app_public"] }
}
```


