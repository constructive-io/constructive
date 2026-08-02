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

## Features

* 🛡️ **Complete RLS Auditing** – Grants, RLS enforcement, policy coverage and policy behavior, across every schema and role in the database
* 🎯 **Operation-Level Coverage** – Every granted `SELECT`/`INSERT`/`UPDATE`/`DELETE` checked against the policies that actually cover it, per role
* 🔍 **Risky Policy Detection** – Permissive checks, volatile and session-dependent predicates, definer escalation and role bypass, found in the parsed AST rather than by regex
* ⚡ **Performance on Its Own Axis** – Policy predicates that no index can serve, per-row function calls, missing foreign-key indexes — scored separately, so hardening never reads as a regression
* 🧭 **Exposure Planes** – The declared API surface is the headline grade; direct-connection and per-role planes are graded beside it, so "what can an anonymous caller reach?" is a number
* 📊 **Security Scoring & Grades** – Scores, grades, severity counts and per-rule deductions with the payoff of fixing each one
* 🐘 **Pure PostgreSQL Analysis** – Reads the catalog and parses SQL; no agent, no traffic, no ORM, no application changes, nothing executed
* ⚙️ **Built for CI** – Summaries, Markdown, JSON and SARIF, GitHub job summaries, annotations and a sticky PR comment, with configurable failure thresholds
* Δ **Change-Aware Audits** – Compare two reports to show exactly what a branch introduced, fixed or worsened; baselines accept inherited debt and gate only what's new
* 🧪 **Graded Against a Corpus** – `safegres eval` scores the auditor itself on fixtures with known answers, sealed against config that could game the number
* 📦 **CLI and Library APIs** – Run it from the command line, or import the analysis, report and renderers into your own tooling

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

34 rules across two dimensions, plus a source-level convention linter. The prefix letter is a
family, **not** the dimension: `P1`/`P1b` are performance, `P5` is security.

### Security (19 rules)

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
| L6 | info | neutral | **Unaddressable grant** — an API role holds privileges on a relation its API cannot name ‡ |
| L8 | info | fail-open | **DEFINER view bypass** — an untrusted role reads a base relation, and named columns of it, as the view's owner † |
| L9 | info | fail-open | **DEFINER view write** — an auto-updatable definer view writes a base relation as its owner † |
| L10 | info | fail-open | **Rewrite-rule bypass** — a rule on a view writes a relation as the view's owner, `security_invoker` notwithstanding † |
| L11 | info | fail-open | **Materialized-view snapshot** — stored rows serve an untrusted role what the base relation's grants and policies would not † |
| L12 | info | fail-open | **Non-barrier filtering view** — a view is an untrusted role's only path to a relation, but its row filter is not a boundary † |
| L13 | info | fail-open | **Column-level grant** — an untrusted role reaches a relation through `pg_attribute.attacl`, which no relation ACL shows † |
| L14 | info | neutral | **Unaudited base relation** — a definer view reads a relation in a schema the audit never introspected † |
| L15 | info | neutral | **Unreadable view body** — an untrusted role reads a definer view whose definition the analysis could not follow † |
| L16 | info | fail-open | **Sequence privilege** — an untrusted role can advance or read a sequence, which no policy filters † |
| L17 | info | fail-open | **Foreign-table grant** — an untrusted role reaches a relation that cannot carry RLS at all † |
| W1 | medium | — | **No exposure surface configured** — whole database assumed reachable, score capped |

† R1/R2/L5 are no-ops until you name the untrusted roles:
`"R1": ["critical", { "roles": ["anonymous"] }]`. They cost nothing on databases without an
untrusted-role model; the `safegres:constructive` preset configures them for `anonymous`.

‡ L6 needs an adapter that can compute [API reach](#api-reach--the-relations-the-api-can-actually-name);
without one nothing is unaddressable and it never fires.

**Direction is the load-bearing idea.** `fail-open` findings are exposure — the untrusted side
reaches more than intended. `fail-closed` findings are *denied by Postgres at runtime*: an
availability and hygiene concern, not a leak. They contribute **zero** to the score by default
(`scoring.failClosedWeight`). safegres does not cry wolf about a grant the database already refuses.

### Convention (source-level lint, 4 rules — `safegres:constructive`)

House-style rules that read function **definitions** (`pg_get_functiondef`), not the catalog. They
are pure `source → findings` — no `pg` dependency in the lint module — and are **off outside the
`safegres:constructive` preset**, which enables them. A function on a non-exposed schema costs
nothing, like every other rule.

| Code | Severity | Direction | Check |
| --- | --- | --- | --- |
| C1 | high | fail-open | Function **sets `search_path`** (house rule: never set it — fully-qualify instead) |
| C2 | medium | neutral | Function uses a **`#variable_conflict`** directive |
| C3 | low | neutral | Function has an **unqualified relation reference** (relies on `search_path`) |
| C4 | high | fail-open | Function uses **dynamic SQL** (`EXECUTE` / `EXECUTE … USING` / `FOR … IN EXECUTE`) |

C3 ships at `low` (adoption severity — ratchet to error once the tree is clean). C4 cannot be
statically proven read-only, so every dynamic-SQL site is flagged and must be **waived inline with a
categorized reason** (`lookup-only`, `codegen`); a reasonless waiver does not suppress it.

**Inline suppressions** (ESLint/Prettier style), written as SQL comments inside the body:

```sql
-- safegres-disable-next-line no-dynamic-sql -- lookup-only: building an IN-list of integers
EXECUTE format('SELECT ... WHERE id = ANY(%L)', ids);

EXECUTE 'REFRESH MATERIALIZED VIEW app.mv';  -- safegres-disable-line no-dynamic-sql -- codegen: fixed DDL

-- safegres-disable no-dynamic-sql -- lookup-only: this whole block probes the catalog
...
-- safegres-enable no-dynamic-sql

-- safegres-disable-file no-set-search-path -- vendored extension shim
```

A directive with no rule id applies to every convention rule. Waived findings are **not dropped** —
they surface as `acknowledged` (accepted-risk) findings carrying their reason, off the score.

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
  reach?(exec: QueryExecutor, ctx: ReachContext): Promise<ApiReach>; // optional precision
}
```

Built-ins ship for `constructive`, `postgrest`, `supabase`, `hasura` and `graphile` — each reading
the signal its stack actually leaves in the catalog (see [Configuration](#configuration)), and
each emitting a primary `api` plane plus whatever secondary planes it can prove: one `api:<name>`
per API for Constructive, a `direct:<authenticator>` role plane for PostgREST, `app_private` as an
internal plane for graphile-starter. `postgraphile` is the exception: it contributes no plane at
all and only supplies [reach](#api-reach--the-relations-the-api-can-actually-name). JSON configs may name a built-in
(`"adapters": ["supabase"]`); anything else is an error rather than a silent no-op — a typo'd
adapter would otherwise present as an unexposed database. The old `"resolver": "constructive"`
still works.

### API reach — the relations the API can actually name

A plane made of schemas answers *is this relation in the API's schemas?*, which over-counts: a
generated API exposes fields, and a schema routinely holds relations it deliberately does not
surface — join tables, denormalized shadows, machine-only back-pointers. `reach()` is where an
adapter narrows a plane from its schemas to its **relations**. The built-in `postgraphile` adapter
reads the `@behavior` / `@forwardBehavior` / `@backwardBehavior` smart tags to do it, and both
`graphile` and `constructive` delegate to it — those two answer *which schemas are served*, which
is a different question from *what the served schemas expose*:

```jsonc
{ "exposure": { "schemas": ["app_public"], "adapters": ["postgraphile"] } }
```

Three properties keep it from quietly deleting findings:

- **Only an explicit denial counts.** Presets grant most behaviors by default, so the *absence* of
  `+list` says nothing. Silence is never read as denial.
- **Unreachable means unreachable by every route.** A relation with no root entry is still
  addressable by traversing a relation field from one that has, so reach is graph traversal over
  foreign keys, not a per-table test. Hiding one reverse relation is one missing path, not proof.
- **A role plane is never narrowed.** The API not exposing a table says nothing about a role
  holding a direct connection. Behavior only ever refines `api`/`schema` planes.

Anything subtracted is listed in `report.exposure.unaddressable` rather than silently dropped, and
`"reach": false` turns the whole thing off. Where an API-edge role still holds privileges on a
relation its own API cannot name, **L6** reports the grant — unless some RLS policy predicate
references the relation, since a grant a policy subqueries under the querying role is load-bearing
however invisible it is to the API.

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

Everything a job repeats every run belongs in the config file instead, so the job is one word. A
repository whose schema is a pgpm workspace does not need a database at all — `source.pgpm`
deploys it into an ephemeral one:

```jsonc
// .safegresrc.json — paths are relative to this file
{
  "extends": "safegres:constructive",
  "source":  { "pgpm": "application/app" },
  "perf":    { "enabled": true, "baseline": "ci/perf-baseline.json", "failOnNew": true },
  "outputs": { "dir": "safegres-reports" },
  "failOn":  { "grade": "B" }
}
```

```yaml
      - run: npx safegres audit   # or: "audit": "safegres lint" in package.json
```

`outputs.dir` writes `safegres.json`, `safegres.md` and `safegres.sarif` into one directory — name
an individual file (`outputs.json`) only when the name matters. Directories are created as needed,
and a flag still wins over the file for a one-off run (`safegres audit --out reports`). Naming a
connection wins too, so the same config audits a database you already have:
`safegres audit --database staging`.

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

## Sealed runs

Every knob above is deliberate when a team declares its intent in CI, and is the cheapest possible
cheat when a *score* is the thing being evaluated — of an agent's migration, of a template, of a
submission. Turning off the rule and re-baselining the debt both raise the number without touching
the database.

So every report carries the ruler it was measured with:

```jsonc
"provenance": {
  "version": "1.17.0",
  "fingerprint": "sha256:8f14e45fceea167a…",   // over the *resolved* rules, overrides,
  "sealed": true,                              // scoring weights, exposure and ignores
  "preset": "strict"
}
```

`--sealed` grades under a built-in preset alone: no config-file discovery, and `--config`,
`--rule`, `--exposure-schemas` and every baseline flag are *refused* rather than ignored — a run
that silently dropped a flag would report a number for rules nobody chose. A harness pins the
answer it expects:

```bash
safegres audit --sealed --preset strict --verify-fingerprint sha256:8f14e45fceea167a… --format json
```

The fingerprint covers the resolved rule set rather than the config text, so it is invariant to how
a posture was spelled (preset vs. explicit rules, key order) and sensitive to anything that changes
it — including the safegres version, because a rule's meaning can change without its configuration
changing. Reports whose fingerprints differ are not comparable, and `--verify-fingerprint` exits
non-zero rather than let one be read as if it were.

None of this constrains ordinary use: an unsealed run still gets a fingerprint, and `sealed: false`
is simply the honest statement that local configuration participated.

## The evaluation corpus

A sealed score says the ruler did not move. It does not say the ruler is right. That is what the
corpus in [`corpus/`](corpus/README.md) is for: small schemas, each with one deliberate flaw and a
written-down answer — the findings a correct audit must produce, the false positives it must not,
and the one-sentence fix. Many come in pairs: 18 cases pin what must *not* fire, and six of those
are the earlier case with its flaw fixed — an answer key consisting entirely of silence and a score
of 100, because a rule that survives its own fix is worse than a rule that never existed.

`safegres eval` is the whole loop in one command: it deploys each case into the connected
database, audits it under a sealed preset, grades the report against the answer key, drops the
case's schemas again, and exits non-zero if any case fails.

```console
$ safegres eval --database scratch
  PASS  01-anon-write-grant              security 1.2 (F )  R1
  PASS  17-foreign-key-without-index     perf    71.2 (C )  X1
  FAIL  18-policy-column-unindexed       perf     100 (A+)  missed X2

41/42 cases passed · recall 98% · precision 100%
```

| Flag | |
| --- | --- |
| `--preset <name>` | the preset every case is graded under (default `recommended`) |
| `--corpus <dir>` | your own corpus of `<id>/{case.json,schema.sql}` |
| `--case <id>` | run one case, or an id prefix — comma-separated |
| `--list` | print the corpus without touching a database |
| `--json` | the `EvalReport`: per-case recall, precision, score, fingerprint |
| `--keep` | leave the case schemas behind, to poke at one by hand |

A config file may set `eval.corpus`, `eval.preset` and `eval.cases` — *what* to run. It cannot
retune the rules for a run: cases are always graded by the named preset alone, or the corpus would
be grading itself. The same loop is a library call (`runEval`), and its pieces are public:

```ts
import { audit, gradeCase, loadConfig, loadCorpus } from 'safegres';

const { config } = loadConfig({ sealed: true, preset: 'recommended' });
for (const c of loadCorpus()) {
  await client.query(c.sql);
  const { missed, falsePositives } = gradeCase(await audit(client, { config, ...c }), c);
}
```

Cases are data — `schema.sql` plus a `case.json` answer key — so a harness that never runs safegres
can still use them. Three uses: safegres's own regression suite, worked examples short enough to
read, and an agent evaluation — hand the agent a case, ask for a fix, and require the expected
findings to be *gone* with the dimension back at 100 rather than merely a better number.

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
{ "rules": { "R1": ["critical", { "rolesFrom": "anon" }] } }
```

An adapter resolves two role sets, because "at the API edge" and "reachable without credentials"
are different questions:

| `rolesFrom` | Roles | Use when |
| --- | --- | --- |
| `anon` | Only what an unauthenticated caller arrives as — `apis.anon_role`, `pgrst.db_anon_role`, Supabase's `anon`, graphile's visitor | Almost always. A signed-in role holding a write grant is the product; the anon role holding one is the bug. |
| `exposure` | Every role at the edge, signed-in ones included | A surface where no role should be writing directly. |

Both union with any explicit `roles`, so a preset can name a platform default *and* pick up a
custom one. Rules that ask for neither stay inert — resolved roles never leak into a rule that
didn't opt in. `report.exposure.anonRoles` carries the anonymous subset, and the pretty renderer
marks it inline (`api roles: authenticated, anonymous (anon)`).

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

`extends` also takes a **path**, which is how a repository with more than one audit job keeps one
copy of its rules. The gated PR job and the nightly advisory run against a deployed database
differ by their gates and their baseline, not by their 19-entry `public.read` list:

```jsonc
// ci/nightly/.safegresrc.json
{ "extends": "../../safegres.base.json",
  "perf":    { "baseline": "ci/nightly/perf.json" },
  "failOn":  { "grade": "D" } }
```

A path in an inherited file resolves against **the file that wrote it**, so a base file's
`"baseline": "ci/perf.json"` keeps meaning the base file's `ci/`, whichever job inherits it —
the same rule as a discovered config, applied per key. Objects merge per key and arrays replace,
except `overrides`, which is a list of scoped exceptions and so unions across the chain:
inheriting a config can't silently drop the exceptions that came with it. `--sealed` reaches none
of this — it does no discovery at all, so there is no file to extend from.

The file is **validated on load**, against a schema derived from the same declaration the editor
completes against — an unknown key is an error naming the key it thinks you meant, not a silent
no-op, because `"failon": { "grade": "B" }` otherwise reads as a passing build rather than as a
typo. Point an editor at the schema for completion and inline documentation:

```jsonc
{ "$schema": "https://raw.githubusercontent.com/constructive-io/constructive/main/packages/safegres/schema/safegres.schema.json" }
```

It also ships in the package (`safegres/schema/safegres.schema.json`), and
`safegres print-config --schema` writes it to stdout for an offline copy.

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
safegres lint           # alias for audit, for a package.json script
safegres perf           # audit + the performance dimension (= audit --perf)
safegres doctor         # diagnose config, parser, connection, catalog visibility, exposure
safegres eval           # grade the auditor against a corpus with known answers
safegres print-config   # the resolved effective config (--explain for per-key provenance)
```

| Group | Flags |
| --- | --- |
| Connection | `--connection <url>`, `--host`, `--port`, `--user`, `--password`, `--database`, `--pgpm [dir]` |
| Config | `--config <path>`, `--preset <name>`, `--rule CODE=sev` |
| Exposure | `--exposure-schemas <csv>`, `--exposed-only` |
| Scope | `--schemas`, `--exclude-schemas`, `--roles`, `--exclude-roles`, `--ignore-extensions`, `--audit-extension-owned` |
| Performance | `--perf`, `--stats`, `--explain`, `--perf-baseline <f>`, `--write-perf-baseline <f>`, `--fail-on-new-perf` |
| Reporting | `--format pretty\|json\|json-pretty\|markdown\|sarif`, `--out <dir>`, `--sarif-sources <dir>`, `--summary`/`-q`, `--verbose`, `--compare <f>`, `--compare-ref <label>`, `--write-snapshot <f>` |
| Call graph | `--call-graph`, `--baseline <f>`, `--write-baseline <f>`, `--fail-on-new-boundaries` |
| Gating | `--fail-on <severity>`, `--fail-on-score <n>`, `--fail-on-grade <g>`, `--fail-on-perf-score`, `--fail-on-perf-grade`, `--report-only` |
| Misc | `--skip-ast`, `--no-color`, `--help`, `--version` |

The paths among those — `--pgpm`, the two baselines, and every `--write-*` — have config-file
equivalents (`source.pgpm`, `perf.baseline`, `callGraph.baseline`, `outputs.dir`/`outputs.*`), so CI can carry
them in version control rather than in a command line.

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
