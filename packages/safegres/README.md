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
| P1 | high | neutral | anti-pattern | Policy body calls a **VOLATILE function** (per-row evaluation) |
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
| `safegres:constructive` | Auto-resolves exposure from the routing plane; R1/R2 watch `anonymous`; leak surfaces (A2, P5) critical; A3 off (API roles never own tables) |
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


