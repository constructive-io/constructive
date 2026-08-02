---
name: safegres
description: Postgres Row-Level Security scanner. Audits a live PostgreSQL database for RLS gaps, grant/policy coverage, and risky policy patterns; produces a config-driven 0–100 score scoped to the exposed API surface, plus an unscored function call-graph audit of trust boundaries (SECURITY DEFINER hops, RLS-bypass paths, auth-context mutations). Use when asked to "audit RLS", "run safegres", "scan the database for security issues", "check row-level security", "score the schema's security", "audit the function call graph", "find SECURITY DEFINER risks", "set up the security audit in CI", "declare the exposure surface", "declare public-read tables", "share one safegres config between CI jobs", "validate the safegres config", or when configuring `.safegresrc`/`safegres.config.*` or the safegres CI workflow. safegres is the scanner — it does NOT generate policies or manage security-node types.
compatibility: safegres CLI, PostgreSQL 14+, Node.js 22+, confstash, pgsql-test (optional, pgpm mode)
metadata:
  author: constructive-io
  version: "1.1.0"
---

# safegres — Postgres RLS Security Scanner

safegres is a **scanner**. Point it at a live PostgreSQL database and it reports on grants, RLS enforcement, policy coverage, and risky SQL policy patterns, then rolls the findings into a config-driven 0–100 score (with a letter grade) scoped to the API surface the app actually exposes.

**Package:** `safegres` ([npm](https://www.npmjs.com/package/safegres)) — source at `packages/safegres` in this monorepo.

> safegres is **not** the security-node registry and does **not** generate RLS policies. It reads an existing database and grades it. Policy generation lives in the Constructive blueprint/security-node layer; safegres audits whatever ends up deployed.

## When to Apply

Use this skill when asked to:
- **Audit / scan** a Postgres database for RLS and grant problems (`safegres audit`).
- **Score** a schema's security posture or explain why a score isn't 100.
- **Configure** the scanner: `.safegresrc*`, `safegres.config.*`, presets, rule tuning.
- **Declare the exposure surface** — which schemas/roles the APIs actually reach.
- **Declare intentional public reads** so deliberate open-read tables stop counting against the score.
- **Audit the function call graph** — what exposed functions transitively reach: SECURITY DEFINER hops, RLS-bypass paths, auth-context mutations, dynamic SQL (`safegres audit --call-graph`).
- **Wire safegres into CI** (per-push audit, grade gate) or a pgpm test.
- **Diagnose** the environment/config (`safegres doctor`, `safegres print-config`).
- **Calibrate or evaluate** — run the corpus of known-answer cases against a scratch database (`safegres eval`), as a regression check or as the harness scoring an agent's fix.

## Quick Start

```bash
npm install -g safegres

# Standard libpq env vars (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE)
export PGHOST=localhost PGUSER=postgres PGPASSWORD=password PGDATABASE=mydb
safegres audit
```

Per-field flags (`--host/--port/--user/--password/--database`) and `--connection <url>` also work. On a **Constructive** database, use the preset so the exposure surface auto-resolves:

```bash
safegres audit --preset constructive        # or commit `.safegresrc.json` (below)
```

## Mental Model — three questions

safegres answers three questions, and its config maps 1:1 to them:

1. **What's reachable?** → `exposure` — the schemas/roles the exposed APIs can touch. Everything else is an *internal advisory* that doesn't affect the score.
2. **What's intentional?** → `public.read` — open reads that are by design (reference/pricing tables, a public directory). Declared → acknowledged, unscored.
3. **How bad is the rest?** → `rules` + `scoring` — severity-weighted findings on the exposed surface, normalized by exposed-table count into a 0–100 density score.

The score only improves by being **explicit** (declaring exposure and intent) or by **fixing** real leaks — never by renaming schemas. Naming (`*_public`, `*_private`) is never treated as intent.

## What it checks (rule codes)

| Code | Sev | Direction | Check |
| --- | --- | --- | --- |
| A1 | low | fail-closed | RLS enabled but **0 policies** (deny-all — confirm intended) |
| A2 | high | fail-open | Grants on a table with **RLS disabled** |
| A3 | low | fail-open | RLS on but **not `FORCE`d** (table-owner bypass) |
| A4 | low | fail-closed | write grant with **no covering policy** — denied at runtime |
| A5 | low | fail-closed | SELECT grant with **no policy** — silently returns 0 rows |
| A6 | info | fail-closed | UPDATE has `USING` but **no `WITH CHECK`** |
| A7 | critical | fail-open | Trivially-permissive **WRITE** policy (`true`) |
| A8 | low | fail-open | Trivially-permissive **SELECT** policy (`USING (true)`) |
| P1 | high | neutral | Policy body calls a **VOLATILE** function (perf dimension) |
| P5 | high | fail-open | Policy body references `session_user`/`current_user`/`pg_has_role` |
| R1 | critical | fail-open | An **untrusted role** holds a write privilege |
| R2 | high | fail-open | Permissive write policy applies to untrusted role or PUBLIC |
| R3 | medium | fail-open | RLS table has grants **TO PUBLIC** |
| W1 | medium | meta | No exposure surface configured — DB assumed reachable, score capped |

Perf-dimension rules (only collected with `--perf`, scored on their own axis; `S*` additionally need `--stats`): **X1** FK with no covering index (medium), **X2** policy filters on a column that leads no index (medium), **X3** policy casts/wraps its own column with no matching expression index (medium), **X4** policy calls a non-LEAKPROOF function (low), **X5** redundant/duplicate index (low), **X6** no primary key and no usable replica identity (low), **X7** search column with no index the search can use — `tsvector` w/o GIN/GiST, `vector` w/o HNSW/IVFFlat (medium), **X8** sort-shaped `timestamptz`/`date` column leading no index (info, heuristic), **X9** policy calls a STABLE function per row because it is not wrapped in a scalar sub-select (medium), plus P1/P1b and the runtime-statistics rules **S1**-**S4**.

**Direction is the key idea:** `fail-open` = real exposure (untrusted side reaches more than intended). `fail-closed` = denied at runtime (hygiene/availability, not a leak) — contributes **0** to the score by default. R1/R2 are no-ops until you configure a role list; `safegres:constructive` sets them for `anonymous`.

## Configuration (confstash)

Config is discovered by walking up from cwd: `safegres.config.{ts,js,mjs,cjs}`, `.safegresrc{,.json,.yaml,.yml,.js}`, `safegres.json`, or a `"safegres"` key in `package.json`. Precedence: **CLI override > project config > preset > built-in defaults**.

```jsonc
// .safegresrc.json
{
  "extends": "safegres:recommended",
  "exposure": { "schemas": ["app_public"], "roles": ["anonymous", "authenticated"] },
  "public": { "read": ["app_public.plans*", "app_public.event_types"] },
  "extensions": { "ignore": ["pg_partman"] },   // skip the extension's schema
  "rules": {
    "A3": "off",         // disable
    "A5": "high",        // retune severity
    "P*": "medium"       // prefix wildcard (exact codes win)
  },
  "overrides": [
    { "tables": ["app_public.audit_*"], "rules": { "A2": "off" } }
  ],
  "scoring": { "densityK": 0.17, "unknownExposureCap": 80 },
  "failOn": { "grade": "B" }
}
```

Typed variant (`defineConfig` from `confstash`) works too — see the package README.

**`extends` takes a path, not just a preset.** `"extends": "../../safegres.base.json"` is how two CI jobs share one surface declaration and differ only in gates; a preset name, a relative/absolute path and an npm package are all accepted, lowest precedence first. Every *path-valued* key (`source.pgpm`, `perf.baseline`, `callGraph.baseline`, `outputs.*`, `eval.corpus`) resolves against **the file that declared it**, so a baseline named in a shared base means that file's directory whichever job inherited it. Objects merge per key and arrays replace, except `overrides` — a list of scoped exceptions, so it unions across the chain. `--sealed` does no discovery and therefore reaches no file-based inheritance at all.

**Unknown keys are an error, not a no-op** — `"failon": { "grade": "B" }` used to read as a passing build. The config shape is declared once in `src/config/schema.ts`, which generates both the committed `schema/safegres.schema.json` (regenerate with `pnpm schema`; a test fails if it drifts) and the load-time validator, so adding a config key means describing it there or the build fails. Point an editor at the schema for completion:

```jsonc
{ "$schema": "https://raw.githubusercontent.com/constructive-io/constructive/main/packages/safegres/schema/safegres.schema.json" }
```

## Performance dimension (`--perf`, off by default)

`safegres perf` / `safegres audit --perf` adds `report.perf` — its own findings, summary, and 0-100 score over index hygiene (X1/X5/X6/X7/X8), policy-aware index rules (X2/X3/X4/X9) and policy cost (P1/P1b). Security and perf scores are never mixed: `report.score` sees only security findings, `report.perf.score` only perf ones. All checks are catalog + policy-AST analysis, so they're deterministic against an empty CI database.

X7 is Constructive-specific: `graphile-search` exposes a full-text filter for every `tsvector` column and similarity search for every `vector` column *from the codec alone*, so an unindexed one is a live API field served by a seq scan. BM25/pg_trgm are intentionally not checked — those adapters are discovered from their indexes, so no index means the feature isn't exposed. X8 is the one heuristic (any column is orderable; timestamps are what feeds are actually sorted by), so it is `info`, scores 0, and is meant to be read rather than gated on.

X2/X3/X4/X9 read the policy predicate itself: RLS quals run before user quals on every candidate row, so an unindexed policy column (X2), a cast/function wrapping it (X3), or a non-LEAKPROOF call that blocks qual pushdown (X4) is a tax on every query against the table, not just one slow report.

X9 is the InitPlan rule. `STABLE` does not mean "evaluated once": measured on 200k rows, `USING (other_id = current_principal_id())` executed the function 200,000 times (424 ms) while `USING (other_id = (SELECT current_principal_id()))` executed it once (22 ms). The penalty is plan-dependent — an unwrapped call the planner turns into an index condition is evaluated once per scan, and the same policy costs 200k calls the moment the qual lands in a Filter (unindexed column, join, OR branch). Wrapping removes the dependence: the sub-select references no column, so it is hoisted into an InitPlan whatever plan is chosen, and the result is a constant the index can probe with. Detection is structural (non-IMMUTABLE + no column-referencing argument + not already inside an uncorrelated scalar sub-select), so it needs no list of known identity functions and catches a bare `current_setting()` too. VOLATILE calls are excluded on purpose (per-row is their contract; P1 covers them), and an `EXISTS` sub-select does not count as hoisted — it is correlated, so it runs per row.

```jsonc
{
  "perf": {
    "enabled": true,
    "rules": { "X6": "off" },          // perf codes only — naming a security rule is a config error
    "ignore": ["app_public.audit_*"],  // acknowledged: reported as info, off the perf score
    "scoring": { "densityK": 0.17 }
  },
  "failOn": { "perfGrade": "B" }       // CLI: --fail-on-perf-score / --fail-on-perf-grade
}
```

### Perf baseline (ratchet)

An existing schema won't be perf-clean on day one, so gate on *new* debt instead of total debt:

```bash
safegres audit --write-perf-baseline .safegres-perf.json          # snapshot accepted debt (implies --perf)
safegres audit --perf-baseline .safegres-perf.json --fail-on-new-perf   # exit 1 only on new findings
```

Entries are keyed by code + relation + policy + subject (constraint/index/expression/column/function), never by message text, so safegres upgrades don't invalidate a committed baseline. Fixed findings are reported so you can re-baseline and stop them regressing. Library: `toPerfBaseline(findings)` / `diffPerf(findings, baseline)` → `{ added, removed, accepted }`; also emitted as `report.perf.diff`. Prefer this over asserting a perf grade in a test — it fails on the change, not on inherited debt.

### Delta against a previous run (`--compare`)

The baseline answers "is there new debt?"; `--compare` answers "which way did the numbers move?" — a Δ column in the markdown score table (arrow, points, grade transition, finding count), the severity counts that changed, and every rule whose count changed. It reads a file, because safegres keeps no history: pass any earlier `--format json` report, or the smaller `--write-snapshot` output. `--compare-ref <label>` names the previous run in the report. Library: `compareReports(previous, report)` → `report.comparison`; `toSnapshot` / `parseSnapshot` / `serializeSnapshot` for the file. Purely descriptive — it never fails a build; that stays the baseline's job.

### Runtime statistics (`--stats`, implies `--perf`)

The `S*` rules read what the workload did, from `pg_stat_user_tables` / `pg_stat_user_indexes` / optional `pg_stat_statements`: **S1** seq-scan-dominant table (medium), **S2** index the planner has never chosen (low), **S3** dead-tuple bloat (low), **S4** statement hotspot on a table in scope (info). Only meaningful against a database that has served real traffic — never in a fresh CI database. Every threshold is a floor and configurable under `perf.stats` (`minRows`, `seqScanRatio`, `minIndexBytes`, `deadTupleRatio`, `minTimeShare`, `topStatements`). `S*` findings **are scored** on the perf axis (asking for `--stats` is the opt-in); `perf.scoring.includeStats: false` demotes them to advisories. `report.perf.stats` carries provenance: tables read, `statsReset` (the window the counters describe), whether they were scored, and a note when `pg_stat_statements` isn't installed — a missing extension is never an error.

### Planner proof (`--explain`, implies `--perf`)

Turns catalog inference into evidence: each probeable finding's query shape is planned with `EXPLAIN (GENERIC_PLAN, FORMAT JSON)` (nothing executed, parameters stay parameters) and the plan is attached as `finding.evidence`. A finding the planner serves with an index is **refuted** — acknowledged, demoted to info, dropped from the perf score (e.g. a hash index on an FK column, which X1 doesn't credit). A seq scan only **confirms** above `perf.explain.minRows` (default 1000), because an empty table always seq-scans; below that the probe is `inconclusive` and the finding is untouched. Probes exist for X1/X2/X7/X8 only — the rules that name a query shape. Requires PostgreSQL 16+; otherwise `report.perf.explain.unavailable` explains why nothing was probed.

### Presets

| Preset | Behavior |
| --- | --- |
| `safegres:recommended` | Every rule at its default severity (no-config behavior) |
| `safegres:strict` | Everything escalated; fail-closed counts 25%; `failOn: high` |
| `safegres:constructive` | Auto-resolves exposure from the routing plane; R1/R2 watch `anonymous`; A2/P5 critical; A3 off; `pg_partman` ignored |
| `safegres:minimal` | Structural flags only (A1–A3) — fast CI smoke check |

On Constructive, a project config is usually just:

```json
{ "extends": "safegres:constructive" }
```

## Exposure surface (first-class)

A database-wide score is meaningless when most of the DB isn't API-reachable. Declare (or auto-resolve) the surface:

- **Exposed** findings drive the score. **Internal** findings become unscored advisories (`--exposed-only` hides them).
- **No exposure configured** → `W1` + the score is capped (default 80/B) so the omission is visible with a one-key fix.
- **Constructive**: `exposure.resolver: "constructive"` introspects `routing_public.apis → api_schemas → metaschema_public.schema` (+ platform plane), discovering exposed schemas and API roles and excluding internal schemas like `db_migrate`/`partman`.
- **Generic pgpm / plain Postgres**: declare `exposure.schemas` statically — do NOT assume routing tables exist and never infer exposure from schema names.

CLI: `--exposure-schemas <csv>`, `--exposed-only`.

## Extension objects

Extension tables are a database's `node_modules` — present in the catalog, not yours to alter. Relations an extension **owns** (`pg_depend.deptype = 'e'`) and their partitions are skipped by default.

Ownership is not enough for extensions that create objects at runtime: on a Constructive database only 2 of `pg_partman`'s 32 relations were owned, so 30 template tables scanned as unsecured application tables and produced 30 of the 39 criticals. Name the extension to skip its schema wholesale: `"extensions": { "ignore": ["pg_partman"] }` (already in `safegres:constructive`). Unknown names are ignored, so the same config works everywhere.

CLI: `--ignore-extensions <csv>`, `--audit-extension-owned` (audit owned relations too, for auditing an extension itself).

## Declared public surface

Some open reads are deliberate. Declare them and they stop counting against the score:

```jsonc
{ "public": { "read": ["app_public.plans*", "app_public.users"] } }
```

- An open SELECT (`USING (true)`, rule A8) on a declared table is **acknowledged**: reported as `info`, excluded from the score.
- Open reads on **undeclared** tables stay scored — regardless of schema naming.
- `safegres doctor` warns about stale `public.read` patterns that match no table.

Use this to take an intentionally-public schema to 100/A+ while keeping A8 visible for anything you haven't blessed (e.g. a `users` directory you may want to scope later).

## Call-graph audit (`--call-graph`)

RLS findings tell you what the *tables* allow; the call graph tells you what the *functions* reach. Starting from the **exposed entry points** (functions the API roles can `EXECUTE`), safegres statically walks each SQL/PL/pgSQL body and emits a deterministic checklist of **trust boundaries** — unscored, because a public `SECURITY DEFINER` calling private helpers is the intended pattern (that's how `sign_in` works). The checklist defines what a human audit should even cover:

| Code | Boundary | Action |
| --- | --- | --- |
| CF1 | DEFINER without pinned `search_path` (CWE-426) | Provable misconfiguration — fix |
| CF2 | DEFINER executable by `anonymous`/PUBLIC | Provable — confirm intent |
| CG2 | RLS-bypass path — DEFINER's owner owns/bypasses RLS on a table it touches | Review: is RLS intentionally bypassed here? |
| CG3 | Auth-context mutation — writes `jwt.claims.*` / `role` | Review: trust-critical node |
| CG1 | Trust hop — execution crosses into a DEFINER | Review the boundary's authorization logic |
| CG4 | Non-exposed table reached from a public entry via a DEFINER path | Review: intentional private reach? |
| CG5 | Opaque node — dynamic SQL (`EXECUTE`) or unparseable body | Static analysis ends here — audit manually |

```bash
safegres audit --call-graph                  # checklist appended to the pretty report
safegres audit --call-graph --summary        # stats line only
safegres audit --call-graph --format json    # full graph: nodes, edges, checklist (stable sort — snapshot/diff-friendly)
```

Each item shows the reaching path (`via: entry → … → fn`). Semantics: it's a *static approximation* — dynamic SQL and unresolvable calls are flagged opaque rather than silently dropped, and a CG1/CG4 item is **not** a vulnerability, it's a boundary a human should sign off on.

## Scoring

Default **density** model (doesn't saturate on large schemas):

```
score = 100 · exp(−k · riskPoints / exposedTables)
```

`riskPoints` = severity-weighted sum (critical 25, high 10, medium 4, low 1, info 0) of *exposed, fail-open, non-acknowledged* findings; `k` defaults 0.17. Non-exposed → 0; fail-closed → 0 (raise `scoring.failClosedWeight`); acknowledged public reads → 0; unknown exposure caps at `unknownExposureCap`. Any exposed critical floors the grade at C (`floorOnCritical`). Legacy flat model: `scoring.model: "weighted"`. Gate CI with `--fail-on-score`/`--fail-on-grade` or `failOn`.

## Commands

```bash
safegres audit                     # audit the connected DB (default command)
safegres lint                      # alias for audit, for a package.json script
safegres perf                      # audit + index-hygiene dimension (= audit --perf)
safegres audit --perf --fail-on-perf-grade B
safegres audit --perf-baseline .safegres-perf.json --fail-on-new-perf   # ratchet: only new debt fails
safegres audit --stats             # + runtime-statistics rules S1-S4 (implies --perf)
safegres audit --explain           # + prove findings with EXPLAIN (implies --perf, PG16+)
safegres audit --format json       # machine-readable
safegres audit --format markdown >> "$GITHUB_STEP_SUMMARY"   # CI job summary / PR comment
safegres audit --compare main.json --compare-ref main         # + Δ vs a previous run's JSON
safegres audit --write-snapshot scoreboard.json               # aggregates only, for a later --compare
safegres audit --format sarif --sarif-sources ./deploy       # GitHub code scanning (upload-sarif)
safegres audit --exposed-only      # hide internal advisories
safegres doctor                    # config/parser/connection/catalog + exposure + stale public.read checks
safegres eval                      # grade the auditor itself against the shipped corpus
safegres eval --case 01 --json     # one case, machine-readable (recall/precision/fingerprint)
```

**Adding a rule means adding two corpus cases.** `corpus/cases/NN-<name>/{schema.sql,case.json}` — a positive whose `expect` names the finding, and a **negative**: the same schema with the flaw fixed, `expect: []` plus `forbid: ["<code>"]`. The negative is the stronger of the two, because `corpus.test.ts` additionally requires an unweighted case to score exactly **100** on its dimension: a rule that survives its own fix, or that taxes a correct schema, fails there rather than in front of a user. Keep each case to one flaw — anything incidental shows up as an extra finding and muddies the answer.

```bash
safegres print-config              # resolved effective config
safegres print-config --explain    # per-key provenance (which layer set each value)
safegres print-config --schema     # the config JSON Schema, for an editor
```

## Library use

```ts
import { Client } from 'pg';
import { getPgEnvOptions } from 'pg-env';
import { audit, renderPretty } from 'safegres';

const client = new Client(getPgEnvOptions());
await client.connect();
const report = await audit(client, { config: { extends: 'safegres:constructive' } });
console.log(renderPretty(report));
console.log(report.score);   // { value, grade, model, deductions, ... }

const perfReport = await audit(client, { perf: true });
console.log(perfReport.perf?.score);   // separate 0-100 perf axis (undefined unless perf is on)
```

## CI integration

Report-only first, gate after a week of stable scores. Never write a bespoke audit script: everything a job repeats belongs in `.safegresrc.json`, so the job is `safegres audit` (or a `"lint": "safegres lint"` package.json script). Paths in the file are relative to it.

```jsonc
{
  "extends": "safegres:constructive",
  "source":  { "pgpm": "application/app" },   // deploy into an ephemeral DB — no connection needed
  "callGraph": { "enabled": true },
  "perf":    { "enabled": true, "baseline": "ci/safegres-perf-baseline.json", "failOnNew": true },
  "outputs": { "dir": "safegres-reports" },   // safegres.json + .md + .sarif; or name files individually
  // paths resolve against the file that declared them, not against cwd
  "failOn":  { "grade": "B" }
}
```

Inside Actions the job summary, annotations and PR comment are emitted automatically (`report.github` configures them). Add `failOn.grade` only once the baseline is stable. A second job that needs the same surface but different gates extends this file rather than copying it — `{ "extends": "../../.safegresrc.json", "failOn": { "grade": "D" } }`.

## Guardrails

- safegres **scans**, it does not generate or modify policies. If asked to "fix" a finding, change the source policy generation (blueprint/security nodes / pgpm migrations), never a generated SQL file.
- Never raise the score by renaming schemas or by blanket-disabling rules — declare exposure/public intent or fix the leak.
- Keep internal findings visible as advisories unless the user explicitly wants `--exposed-only`.
- Preserve the distinction between intentional public-read, authenticated enumeration, PUBLIC/untrusted writes, and non-exposed internal findings.
- The published npm version must include the exposure-aware implementation for CI to report the intended score — verify before trusting a CI number.

## References

- Package README: `packages/safegres/README.md` (authoritative rule/scoring detail).
- Planning: constructive-planning issues #1282 (config), #1286 (exposure + call-graph), #1287 (safegres-everywhere / CI / pgpm autodetect).
