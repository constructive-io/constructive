---
name: safegres
description: Postgres Row-Level Security scanner. Audits a live PostgreSQL database for RLS gaps, grant/policy coverage, and risky policy patterns; produces a config-driven 0–100 score scoped to the exposed API surface, plus an unscored function call-graph audit of trust boundaries (SECURITY DEFINER hops, RLS-bypass paths, auth-context mutations). Use when asked to "audit RLS", "run safegres", "scan the database for security issues", "check row-level security", "score the schema's security", "audit the function call graph", "find SECURITY DEFINER risks", "set up the security audit in CI", "declare the exposure surface", "declare public-read tables", or when configuring `.safegresrc`/`safegres.config.*` or the safegres CI workflow. safegres is the scanner — it does NOT generate policies or manage security-node types.
compatibility: safegres CLI, PostgreSQL 14+, Node.js 22+, confstash, pgsql-test (optional, pgpm mode)
metadata:
  author: constructive-io
  version: "1.0.0"
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
| P1 | high | neutral | Policy body calls a **VOLATILE** function |
| P5 | high | fail-open | Policy body references `session_user`/`current_user`/`pg_has_role` |
| R1 | critical | fail-open | An **untrusted role** holds a write privilege |
| R2 | high | fail-open | Permissive write policy applies to untrusted role or PUBLIC |
| R3 | medium | fail-open | RLS table has grants **TO PUBLIC** |
| W1 | medium | meta | No exposure surface configured — DB assumed reachable, score capped |

**Direction is the key idea:** `fail-open` = real exposure (untrusted side reaches more than intended). `fail-closed` = denied at runtime (hygiene/availability, not a leak) — contributes **0** to the score by default. R1/R2 are no-ops until you configure a role list; `safegres:constructive` sets them for `anonymous`.

## Configuration (confstash)

Config is discovered by walking up from cwd: `safegres.config.{ts,js,mjs,cjs}`, `.safegresrc{,.json,.yaml,.yml,.js}`, `safegres.json`, or a `"safegres"` key in `package.json`. Precedence: **CLI override > project config > preset > built-in defaults**.

```jsonc
// .safegresrc.json
{
  "extends": "safegres:recommended",
  "exposure": { "schemas": ["app_public"], "roles": ["anonymous", "authenticated"] },
  "public": { "read": ["app_public.plans*", "app_public.event_types"] },
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

### Presets

| Preset | Behavior |
| --- | --- |
| `safegres:recommended` | Every rule at its default severity (no-config behavior) |
| `safegres:strict` | Everything escalated; fail-closed counts 25%; `failOn: high` |
| `safegres:constructive` | Auto-resolves exposure from the routing plane; R1/R2 watch `anonymous`; A2/P5 critical; A3 off |
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
safegres audit --format json       # machine-readable
safegres audit --exposed-only      # hide internal advisories
safegres doctor                    # config/parser/connection/catalog + exposure + stale public.read checks
safegres print-config              # resolved effective config
safegres print-config --explain    # per-key provenance (which layer set each value)
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
```

## CI integration

Report-only first, gate after a week of stable scores. In this monorepo's DB repos the pattern is: start Postgres → install `pgpm` + `safegres` → deploy the schema → `safegres audit` → write to `$GITHUB_STEP_SUMMARY`. Commit `.safegresrc.json` (`{ "extends": "safegres:constructive" }`) as the source of truth so local and CI agree. Add `--fail-on-grade B` only once the baseline is stable.

## Guardrails

- safegres **scans**, it does not generate or modify policies. If asked to "fix" a finding, change the source policy generation (blueprint/security nodes / pgpm migrations), never a generated SQL file.
- Never raise the score by renaming schemas or by blanket-disabling rules — declare exposure/public intent or fix the leak.
- Keep internal findings visible as advisories unless the user explicitly wants `--exposed-only`.
- Preserve the distinction between intentional public-read, authenticated enumeration, PUBLIC/untrusted writes, and non-exposed internal findings.
- The published npm version must include the exposure-aware implementation for CI to report the intended score — verify before trusting a CI number.

## References

- Package README: `packages/safegres/README.md` (authoritative rule/scoring detail).
- Planning: constructive-planning issues #1282 (config), #1286 (exposure + call-graph), #1287 (safegres-everywhere / CI / pgpm autodetect).
