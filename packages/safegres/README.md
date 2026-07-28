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

## What it checks

| Code | Severity | Category | Check |
| --- | --- | --- | --- |
| A1 | critical | flags | RLS enabled but **0 policies** (effectively deny-all) |
| A2 | high | flags | Grants exist on a table with **RLS disabled** |
| A3 | medium | flags | RLS enabled but **`FORCE ROW LEVEL SECURITY` not set** (table owner bypass) |
| A4 | high | coverage | INSERT / UPDATE / DELETE grant with **no covering policy** for that verb |
| A5 | medium | coverage | SELECT grant with **no policy** (silent empty result) |
| A6 | info | coverage | UPDATE has `USING` but **no `WITH CHECK`** (row-smuggling surface) |
| A7 | high | anti-pattern | Trivially-permissive policy (`USING (true)` / `WITH CHECK (true)`) |
| P1 | high | anti-pattern | Policy body calls a **VOLATILE function** (per-row evaluation) |
| P5 | high | anti-pattern | Policy body references **`session_user`** / `current_user` / `pg_has_role(...)` |

Coverage is aggregated `(table, role) → { hasUsing, hasWithCheck }` across every applicable permissive policy (FOR ALL + PUBLIC-role policies considered). Roles with `BYPASSRLS` are suppressed.

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
  extends: 'safegres:multi-tenant',
  rules: { A6: 'low' }
});
```

### Presets

| Preset | Behavior |
| --- | --- |
| `safegres:recommended` | Every rule at its default severity (the no-config behavior) |
| `safegres:strict` | Coverage gaps escalated (A4 critical, A5 high), `failOn: high` |
| `safegres:multi-tenant` | Cross-tenant leak surfaces (A2, A4, A7, P5) critical |
| `safegres:minimal` | Structural flags only (A1–A3) — fast CI smoke check |

CLI: `--config <path>`, `--preset <name>`, `--rule CODE=off|severity` (repeatable).

### Scoring

Every report includes a config-driven score (0–100 + grade): weighted deductions per finding severity (critical 25, high 10, medium 4, low 1, info 0 by default), capped per rule, with any critical finding flooring the grade at C. Tune via `scoring.weights`, `scoring.perRuleWeights`, `scoring.maxDeductionPerRule`, `scoring.gradeBands`, `scoring.floorOnCritical`. Gate CI with `--fail-on-score <n>` / `--fail-on-grade <g>` or `failOn` in config.

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


