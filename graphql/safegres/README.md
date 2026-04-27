# safegres

Pure-PostgreSQL Row-Level-Security auditor. Zero application dependencies — drop it on any Postgres database and get a structured report of grants, RLS flags, policy coverage, and AST-level anti-patterns.

```bash
npm install -g safegres
safegres pg --connection postgresql://localhost/mydb
```

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
import { auditPg, renderPretty } from 'safegres';

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const report = await auditPg(client, {
  excludeSchemas: ['my_private_schema']
});

console.log(renderPretty(report));
console.log(`${report.findings.length} findings`);
```

## Authz* type re-exports

`safegres` re-exports the [`node-type-registry`](../node-type-registry) Authz* / Data* / Relation* / View* type registry so consumers building auditors on top of Constructive's type system can stay on a single dependency:

```ts
import { AuthzDirectOwner, type NodeTypeDefinition } from 'safegres';
```

## License

MIT.
