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

<p align="center"><strong>Safe <em>and</em> fast Postgres. Graded.</strong></p>

safegres is a static analyzer for a live PostgreSQL database. It reads the system catalog and
parses every policy predicate and function body into an AST, then answers two questions the
catalog already contains the answers to — *who can actually reach this row*, and *what does
checking that cost per row* — and scores them on **two independent axes**.

Two scores, never mixed. Hardening a table can't show up as a performance regression; adding an
index can't show up as a security win. That is the whole design: the trade you make between them
becomes visible instead of netting out to a single number.

```bash
npm i -D safegres
npx safegres doctor          # connection, catalog visibility, and what's missing
npx safegres audit --perf    # two scores, from the catalog
```

Standard libpq environment (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`), a full
`--connection <url>`, or per-field flags. No agent, no traffic, no application framework, nothing
executed and nothing written — safe to point at a production replica.

*No database handy? See [CI](#ci-in-one-job): one service container plus the migration command you
already have.*

## What you get

```
safegres 1.16.1  (2026-02-14T09:31:07.884Z)

exposure: 2 schema(s) via config  — 41/318 tables exposed

score: 91.4 (A)  — model: density
  top deductions: A2 −10 (×1)  R3 −4 (×1)
  by rule: A2 B (+8.4)  R3 A (+3.5)
  unscored: A4 (×3)  A6 (×7)  — zero-weight, fixing these cannot move the score

perf score: 78.1 (C)  — model: density
  top deductions: X2 −12 (×3)  X1 −8 (×2)  X9 −4 (×1)
  by rule: X2 C (+11.2)  X1 D (+7.6)  X9 B (+3.8)

summary: 0 critical  1 high  4 medium  3 low  7 info

[HIGH] A2  app_public.webhook_deliveries
    Roles [authenticated] have grants on app_public.webhook_deliveries but RLS is disabled
[MED ] X2  app_public.posts  (posts_tenant)
    Policy "posts_tenant" on app_public.posts filters by tenant_id, which is not the
    leading column of any index
```

Also available as `--format json`, `json-pretty`, `markdown` (job summaries and PR comments) and
`sarif` (GitHub code scanning).

## How it works

Three analyses over three different representations. None of them run your queries.

**1. The catalog, as a relation.** `pg_class`, `pg_namespace`, `pg_policy`, `pg_roles`,
`pg_auth_members`, `pg_index` and `aclexplode()` are joined into one snapshot per relation:
grants, RLS flags, policies with their expressions, indexes, ownership.

**2. Policy predicates, as ASTs.** Every `USING` / `WITH CHECK` expression is parsed with
[`pgsql-parser`](https://github.com/launchql/pgsql-parser) (libpg_query — the *actual* PostgreSQL
grammar, not a regex) and traversed. That is what makes the interesting rules possible: a literal
`true` in a write policy (A7), a cast wrapping the policy's own column so no plain index can serve
it (X3), a non-`IMMUTABLE` call whose arguments reference no column of the row and which sits
outside an uncorrelated scalar sub-select — i.e. a per-row call the planner will not hoist into an
InitPlan (X9). Structural detection, not a list of known function names: a GUC-reading helper
somebody adds next year is caught without configuration.

**3. Effective access, as a lattice.** ACL rows are not access. A privilege also arrives via
`GRANT … TO PUBLIC` and via role inheritance (`pg_auth_members`, INHERIT-following), and it is
only *reachable* if the role also holds `USAGE` on the schema. safegres computes the effective
cell each `(relation, role, privilege)` triple lands in, with `pg_has_role` membership semantics,
and reports the ones that are inconsistent in either direction:

| grant | RLS | policy | verdict |
| --- | --- | --- | --- |
| yes | on | yes | normal — policy-mediated access |
| yes | on | no | dead grant (L1 indirect; A4/A5 direct) |
| yes | off | — | unmediated (A2 table-level; L5 per untrusted role, indirect) |
| no | — | yes | dead policy (L2) |

The same closure answers the direct question — *what can role X actually reach?* — as
`report.roleAccess`, with provenance (`direct`, `PUBLIC`, `member of <role>`) per relation.

Two optional analyses go further: `--explain` plans each finding's query shape with
`EXPLAIN (GENERIC_PLAN)` and lets the planner **refute** the tool's own static claim; `--call-graph`
computes the transitive closure of function calls from the exposed entry points and enumerates the
trust boundaries on the way.

## What it checks

29 rules across two dimensions. The prefix letter is a family, **not** the dimension: `P1`/`P1b`
are performance, `P5` is security.

### Security (18 rules)

| Code | Severity | Direction | Check |
| --- | --- | --- | --- |
| A1 | low | fail-closed | RLS enabled but **0 policies** (deny-all — confirm the lock is intended) |
| A2 | high | fail-open | Grants exist on a table with **RLS disabled** |
| A3 | low | fail-open | RLS enabled but **`FORCE ROW LEVEL SECURITY` not set** (table-owner bypass) |
| A4 | low | fail-closed | INSERT/UPDATE/DELETE grant with **no covering policy** — writes denied at runtime |
| A5 | low | fail-closed | SELECT grant with **no policy** — queries silently return 0 rows |
| A6 | info | fail-closed | UPDATE has `USING` but **no `WITH CHECK`** (row-smuggling surface) |
| A7 | critical | fail-open | Trivially-permissive **write** policy (literal `true`) |
| A8 | low | fail-open | Trivially-permissive **SELECT** policy (`USING (true)`) |
| P5 | high | fail-open | Policy references **`session_user`** / `current_user` / `pg_has_role(...)` |
| R1 | critical | fail-open | An **untrusted role** holds a write privilege † |
| R2 | high | fail-open | A permissive write policy applies to an untrusted role or PUBLIC † |
| R3 | medium | fail-open | An RLS table has grants **TO PUBLIC** |
| L1 | low | fail-closed | **Dead indirect grant** — arrives via PUBLIC/inheritance, no policy admits it |
| L2 | low | fail-closed | **Dead policy** — applies to a role holding no corresponding grant |
| L3 | low | fail-closed | **Unreachable grant** — object privilege without schema `USAGE` |
| L4 | info | neutral | **Dead schema `USAGE`** — reaches no relation and no function |
| L5 | info | fail-open | An untrusted role reaches an **RLS-off table** via PUBLIC/inheritance † |
| W1 | medium | — | **No exposure surface configured** — whole database assumed reachable, score capped |

† R1/R2/L5 are no-ops until you name the untrusted roles:
`"R1": ["critical", { "roles": ["anonymous"] }]`. They cost nothing on databases without an
untrusted-role model; the `safegres:constructive` preset configures them for `anonymous`.

**Direction is the load-bearing idea.** `fail-open` findings are exposure — the untrusted side
reaches more than intended. `fail-closed` findings are *denied by Postgres at runtime*: an
availability and hygiene concern, not a leak. They contribute **zero** to the score by default
(`scoring.failClosedWeight`). safegres does not cry wolf about a grant the database already refuses.

### Performance (11 rules, `--perf`)

| Code | Severity | Check |
| --- | --- | --- |
| X1 | medium | **Foreign key with no covering index** — joins and cascading deletes seq-scan the child |
| X2 | medium | **RLS policy filters on a column that leads no index** — the security qual seq-scans, for every caller |
| X3 | medium | **Policy casts or wraps its own column** (`tenant_id::text = …`) with no matching expression index |
| X4 | low | **Policy calls a non-LEAKPROOF function** — the qual can't be pushed below joins or subquery scans |
| X5 | low | **Redundant index** — exact duplicate of, or leading-column prefix of, another |
| X6 | low | **No primary key** and no usable replica identity |
| X7 | medium | **Search column with no index the search can use** — `tsvector` without GIN/GiST, `vector` without HNSW/IVFFlat |
| X8 | info | **Sort-shaped column leads no index** (`timestamptz`/`date`) — heuristic, scores 0 |
| X9 | medium | **Policy calls a STABLE function per row** — not wrapped in a scalar sub-select, so no InitPlan |
| P1 | high | Policy body calls a **VOLATILE function** — re-evaluated per row |
| P1b | medium | Policy body calls a **STABLE function** in a per-row position |

X2/X3/X4/X9 are the checks a generic index linter structurally cannot make, because they require
the policy predicate's AST. RLS quals are evaluated **before** user quals, on every candidate row,
for every caller — so an unindexed or cast-wrapped policy column is a whole-table tax rather than
one slow query. This is where the two dimensions physically intersect, and why they belong in one
tool.

X9, measured on 200k rows with a policy function that counts its own invocations:

| Policy qual | Calls | Time |
| --- | --- | --- |
| `other_id = current_principal_id()` (Filter) | 200,000 | 424 ms |
| `other_id = (SELECT current_principal_id())` (InitPlan) | 1 | 22 ms |

Four more rules (`S1`–`S4`) read runtime counters rather than the schema and are opt-in with
`--stats`. Full rationale for every rule, including the access-path signals behind X1 and the
plan-dependence caveat on X9: **[docs/rules.md](https://github.com/constructive-io/constructive/blob/main/packages/safegres/docs/rules.md)**.

## Exposure surface

A database-wide score is meaningless if most of the database isn't reachable. Declare the
**exposure surface** and safegres partitions every finding:

- **Exposed** findings (on API-reachable schemas) drive the score.
- **Internal** findings are reported as unscored advisories (`--exposed-only` hides them).
- **No exposure configured** → `W1`, and the score is capped at 80/B (`scoring.unknownExposureCap`).

```jsonc
{
  "exposure": {
    "schemas": ["app_public", "app_hidden"]   // static surface
    // or, on a Constructive database:
    // "resolver": "constructive"             // introspects routing_public.apis → api_schemas
  }
}
```

The score improves by being **explicit** (declaring exposure and intent) or by **fixing** a leak —
never by renaming. A `*_public` schema name is not a declaration; the config is.
CLI: `--exposure-schemas <csv>`, `--exposed-only`.

Two related declarations, both of which mark findings *acknowledged* (reported as info, excluded
from the score): `public.read` for deliberately open reads (pricing tables, a public directory)
and `perf.ignore` for accepted performance debt. Extension-owned relations are skipped by default,
and an extension that creates objects at runtime can be skipped wholesale with
`extensions.ignore` — see [docs/rules.md](https://github.com/constructive-io/constructive/blob/main/packages/safegres/docs/rules.md#extension-objects).

### Planes: the other ways in

An API is one way into a database, not the only one. Declare the others as **planes** and each
gets its own grade — while the headline score stays exactly what it was:

```jsonc
{
  "exposure": {
    "schemas": ["app_public"],
    "planes": [
      { "name": "direct:reporting", "kind": "role", "roles": ["reporting"] },
      { "name": "internal", "kind": "schema", "schemas": ["app_private"] }
    ]
  }
}
```

```
score  87  (B)   security      ← still the declared API surface, unchanged
other access planes — advisory, not part of the score above:
  direct:reporting [role] (reporting): 41 (F)  — 12 relation(s), reached via grant
  internal [schema] (app_private): 63 (D)  — 9 relation(s)
```

A role plane is resolved through the same effective-access lattice the `L*` rules use — direct
grants, `PUBLIC`, and role inheritance — so it answers the question a reviewer actually asks: *if
this connection string leaks, what does it reach?* Roles with `BYPASSRLS` or superuser are
reported as not graded rather than given a meaningless F.

Secondary planes never move the headline and never touch finding identity, so adding one cannot
invalidate a baseline. They gate nothing unless you ask — `failOn.planes` takes a name or glob:

```jsonc
{ "failOn": { "grade": "B", "planes": { "direct:*": { "grade": "D" } } } }
```

`--plane direct:reporting` (or `--plane '*'`) expands one in the terminal and markdown output;
`--format json` always carries them all in `report.planes`.

### Adapters

Where the exposed surface comes from is an interface, not a hard-coded integration. An adapter is
an object — no plugin resolution, nothing load-bearing about a package name:

```ts
// safegres.config.ts
import type { SafegresConfig } from 'safegres';
import { constructiveAdapter } from 'safegres/adapters';

import { myGatewayAdapter } from './my-gateway-adapter';

const config: SafegresConfig = {
  exposure: { adapters: [constructiveAdapter, myGatewayAdapter] }
};
export default config;
```

```ts
interface ExposureAdapter {
  name: string;
  detect(exec: QueryExecutor): Promise<boolean>;      // is this stack present?
  resolve(exec: QueryExecutor): Promise<PlaneInput[]>; // one or more planes
}
```

Built-ins ship for `constructive`, `postgrest`, `supabase`, `hasura` and `graphile` — each reading
the signal its stack actually leaves in the catalog (see [Configuration](#configuration)), and
each emitting a primary `api` plane plus whatever secondary planes it can prove: one `api:<name>`
per API for Constructive, a `direct:<authenticator>` role plane for PostgREST, `app_private` as an
internal plane for graphile-starter. JSON configs may name a built-in
(`"adapters": ["supabase"]`); anything else is an error rather than a silent no-op — a typo'd
adapter would otherwise present as an unexposed database. The old `"resolver": "constructive"`
still works.

## CI in one job

One service container, your existing migration command, one audit:

```yaml
jobs:
  database-audit:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: postgres }
        options: --health-cmd pg_isready --health-interval 5s --health-retries 10
        ports: ['5432:5432']
    env:
      PGHOST: localhost
      PGUSER: postgres
      PGPASSWORD: postgres
      PGDATABASE: app_audit
    steps:
      - uses: actions/checkout@v4
      # …install deps, then apply your schema with whatever already builds it:
      #   rails db:schema:load · manage.py migrate · prisma migrate deploy
      #   drizzle-kit push · sqitch deploy · pgpm deploy · psql -f schema.sql
      - run: npx safegres audit --perf --format markdown >> "$GITHUB_STEP_SUMMARY"
      - run: |
          npx safegres audit --perf --summary \
            --fail-on-grade B \
            --perf-baseline ci/safegres-perf-baseline.json --fail-on-new-perf
```

Scores lead the markdown, then severity counts, then a table per dimension; internal advisories
and accepted baseline debt fold into `<details>`. Pipe it to `gh pr comment --body-file -` to post
it on the pull request instead. Library callers get the same renderer as `renderMarkdown(report)`.

`--format sarif` turns findings into GitHub code-scanning alerts, and `--compare` renders the
delta against a previous run's JSON. Both in **[docs/reporting.md](https://github.com/constructive-io/constructive/blob/main/packages/safegres/docs/reporting.md)**.

## The ratchet

An established schema will not be clean on the first run — but it can refuse to get worse. Commit
today's performance findings as accepted debt and gate on what is *not* in the baseline:

```bash
safegres audit --write-perf-baseline ci/safegres-perf-baseline.json   # snapshot (implies --perf)
safegres audit --perf-baseline ci/safegres-perf-baseline.json         # diff: new / accepted / fixed
safegres audit --perf-baseline ci/safegres-perf-baseline.json --fail-on-new-perf   # gate
```

```
performance vs baseline:

1 new perf finding since the baseline:
  [medium] X1 app_public.comments — foreign key with no covering index
  (14 accepted, 2 fixed)
```

Entries are keyed by finding *identity* — `code` + relation + policy + subject (the constraint,
index, expression, column or function it is about) — never by message text, so rewording a rule or
retuning a severity in a later release cannot invalidate a committed baseline. Findings that
disappear are reported as fixed; re-baseline to lock the win in.

On an established schema this is the enforceable gate, and a perf *grade* gate is not: a score
dominated by inherited debt either fails forever or means nothing. Security has no baseline —
gate it on a grade you can hold today and raise it as the score climbs.

The same mechanism exists for call-graph trust boundaries (`--write-baseline`, `--baseline`,
`--fail-on-new-boundaries`).

## Configuration

Configured like a linter. Discovered by walking up from the current directory:
`safegres.config.{ts,js,mjs,cjs}`, `.safegresrc{,.json,.yaml,.yml,.js}`, `safegres.json`, or a
`"safegres"` key in `package.json` (via
[confstash](https://github.com/constructive-io/dev-utils/tree/main/packages/confstash)).
Precedence: **CLI > project config > preset > built-in defaults**.

```jsonc
// .safegresrc.json
{
  "extends": "safegres:recommended",
  "exposure": { "schemas": ["app_public"], "roles": ["anonymous", "authenticated"] },
  "public": { "read": ["app_public.plans*", "app_public.event_types"] },
  "extensions": { "ignore": ["pg_partman"] },
  "rules": {
    "A3": "info",         // demote — still reported, contributes nothing
    "A5": "high",         // retune a severity
    "A7": "off",          // disable outright
    "P*": "medium"        // prefix wildcard (exact codes win)
  },
  "overrides": [
    { "tables": ["app_public.audit_*"], "rules": { "A2": "off" } }
  ],
  "perf": { "enabled": true, "ignore": ["app_public.audit_*"], "rules": { "X6": "off" } },
  "scoring": { "densityK": 0.17, "unknownExposureCap": 80 },
  "failOn": { "grade": "B", "perfGrade": "B" }
}
```

A typed `safegres.config.ts` with `defineConfig` from `confstash` works identically.

Presets come in three kinds, and they compose. A **stack** preset knows how your framework
declares exposure and what its role names mean; a **posture** preset says how harshly to read
what it finds; both are just partial configs, so `extends` takes an array:

```jsonc
{ "extends": ["safegres:supabase", "safegres:multi-tenant"] }
```

| Stack | Resolves exposure from | Treats as untrusted |
| --- | --- | --- |
| `safegres:constructive` | `routing_public.apis` → `api_schemas` → `metaschema_public.schema` | `anonymous` |
| `safegres:postgrest` | `pgrst.db_schemas` in `pg_db_role_setting` | `pgrst.db_anon_role` |
| `safegres:supabase` | the GUCs if self-hosted, else Supabase's fixed surface | `anon`, `authenticated` |
| `safegres:hasura` | tracked tables in `hdb_catalog` | `anonymous`, `public` |
| `safegres:graphile` | the `graphile-starter` layout (`app_public` + `app_hidden`) | `<app>_visitor` |

Each reads a real catalog signal — not a schema name. Two carry a caveat worth knowing:

- **`graphile`** — PostGraphile's schema list is a process argument that leaves no trace in the
  database, so this preset resolves the starter layout by convention. Naming it *is* the
  declaration that the convention holds; when it doesn't, `exposure.schemas` still wins.
- **`supabase`** — Supabase configures PostgREST outside the database, so the GUCs are usually
  absent. Its adapter falls back to the platform's fixed surface, but only after proving it is
  looking at Supabase (`auth.users` plus the `anon`/`authenticated`/`service_role` trio). The
  fallback lives in that adapter alone: plain `postgrest` never guesses, and an unconfigured
  PostgREST resolves nothing — reported as unknown exposure, not as a surface.

Untrusted roles are usually *resolved*, not named. `pgrst.db_anon_role` and graphile's
`<app>_visitor` are per-deployment, so those presets point the rules at the surface instead of
guessing a name:

```jsonc
{ "rules": { "R1": ["critical", { "rolesFrom": "exposure" }] } }
```

`rolesFrom: "exposure"` hands R1/R2/L5 whatever roles the adapter resolved, and unions with any
explicit `roles`. Rules that ask for neither stay inert — resolved roles never leak into a rule
that didn't opt in.

| Posture | Behavior |
| --- | --- |
| `safegres:recommended` | Every rule at its default severity (the no-config behavior) |
| `safegres:strict` | Everything escalated; fail-closed counts 25%; `failOn: high` |
| `safegres:multi-tenant` | Row-visibility rules (A1/A2, L1–L3, L5) escalated — in a shared-table database an RLS gap is a cross-tenant read; one critical floors the grade at D |
| `safegres:oltp` | Perf axis first: the policy-shape rules that turn an index scan into a per-row function call (X2–X4, X9) escalated; `failOn: perfGrade C` |
| `safegres:minimal` | Structural flags only (A1–A3) — fast smoke check |

Presets **retune**, they don't delete: a rule that doesn't apply to a stack is demoted to `info`
(zero weight, so the score is unchanged) rather than switched off, so it stays in the report and
stays re-tunable. `minimal` is the deliberate exception — being a smoke check is its whole job.

CLI: `--config <path>`, `--preset <name>`, `--rule CODE=off|severity` (repeatable).

## Scoring

Each dimension is scored independently by the same function over disjoint finding sets. The
default **density** model normalizes by the exposed surface, so a large schema doesn't saturate
to 0/F:

```
score = 100 · exp(−k · riskPoints / exposedTables)
```

`riskPoints` is the severity-weighted sum (critical 25, high 10, medium 4, low 1, info 0) of
*exposed, fail-open, non-acknowledged* findings; `k` defaults to 0.17 (≈ one critical per ten
exposed tables lands at a C). Non-exposed findings score 0; fail-closed findings score 0 unless
`scoring.failClosedWeight` is raised; unknown exposure caps the score; any exposed critical floors
the grade at C (`scoring.floorOnCritical`). Grades: A+ 97 · A 90 · B 80 · C 65 · D 50 · F below.
The legacy flat-deduction model is `scoring.model: "weighted"`.

Every report carries its own arithmetic: per-rule points, grade, and the **payoff** — how far the
score would move if that rule's findings went away. Gate with `--fail-on <severity>`,
`--fail-on-score <n>`, `--fail-on-grade <g>` and their `--fail-on-perf-*` counterparts.

## Commands

```bash
safegres audit          # audit the connected database (default command)
safegres perf           # audit + the performance dimension (= audit --perf)
safegres doctor         # diagnose config, parser, connection, catalog visibility, exposure
safegres print-config   # the resolved effective config (--explain for per-key provenance)
```

| Group | Flags |
| --- | --- |
| Connection | `--connection <url>`, `--host`, `--port`, `--user`, `--password`, `--database`, `--pgpm [dir]` |
| Config | `--config <path>`, `--preset <name>`, `--rule CODE=sev` |
| Exposure | `--exposure-schemas <csv>`, `--exposed-only` |
| Scope | `--schemas`, `--exclude-schemas`, `--roles`, `--exclude-roles`, `--ignore-extensions`, `--audit-extension-owned` |
| Performance | `--perf`, `--stats`, `--explain`, `--perf-baseline <f>`, `--write-perf-baseline <f>`, `--fail-on-new-perf` |
| Reporting | `--format pretty\|json\|json-pretty\|markdown\|sarif`, `--sarif-sources <dir>`, `--summary`/`-q`, `--verbose`, `--compare <f>`, `--compare-ref <label>`, `--write-snapshot <f>` |
| Call graph | `--call-graph`, `--baseline <f>`, `--write-baseline <f>`, `--fail-on-new-boundaries` |
| Gating | `--fail-on <severity>`, `--fail-on-score <n>`, `--fail-on-grade <g>`, `--fail-on-perf-score`, `--fail-on-perf-grade` |
| Misc | `--skip-ast`, `--no-color`, `--help`, `--version` |

## Going further

- **[docs/rules.md](https://github.com/constructive-io/constructive/blob/main/packages/safegres/docs/rules.md)** — every rule's rationale: the lattice semantics, the access-path
  signals behind X1, the X7/X8/X9 arguments, extension objects.
- **[docs/reporting.md](https://github.com/constructive-io/constructive/blob/main/packages/safegres/docs/reporting.md)** — SARIF and code scanning, `--compare` deltas and snapshots.
- **[docs/advanced.md](https://github.com/constructive-io/constructive/blob/main/packages/safegres/docs/advanced.md)** — runtime statistics (`--stats`), planner proof
  (`--explain`), library use, pgpm workspaces.
- **[docs/call-graph.md](https://github.com/constructive-io/constructive/blob/main/packages/safegres/docs/call-graph.md)** — the trust-boundary checklist (`--call-graph`) and
  its baseline.

## Library use

```ts
import { Client } from 'pg';
import { getPgEnvOptions } from 'pg-env';
import { audit, renderPretty } from 'safegres';

const client = new Client(getPgEnvOptions());
await client.connect();

const report = await audit(client, { perf: true });
console.log(renderPretty(report));
console.log(report.score.grade, report.perf?.score.grade);
```

## Requirements

- **PostgreSQL 14+.** `--explain` needs **16+** (`GENERIC_PLAN`); on older servers it reports
  `perf.explain.unavailable` and leaves findings untouched.
- **A connection.** No extension is required. `pg_stat_statements` is optional and only powers S4;
  its absence is a note in the report, never an error.
- **Catalog visibility.** Any role can run the audit, but a role that is neither superuser nor
  `BYPASSRLS` may not see every policy and grant — `safegres doctor` says so explicitly. For a
  score you can gate on, connect as the owner (in CI, that is the default anyway).
- **`--stats` describes a workload**, so it is meaningless against a freshly provisioned CI
  database. The `X*` and `A*`/`L*`/`R*` rules are deterministic and work fine on an empty one.
- safegres **reads**. It never creates, alters, or drops anything, and `--explain` plans without
  executing.
