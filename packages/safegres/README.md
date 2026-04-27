<p align="center">
  <img src="https://raw.githubusercontent.com/Safegres/brand/refs/heads/main/safegres.svg" alt="safegres" width="120" />
</p>

# safegres

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


