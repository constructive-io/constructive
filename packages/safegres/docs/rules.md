# Rules — the reasoning behind each check

Reference for every rule safegres implements. The [README](../README.md) has the summary tables;
this document is the argument for each family: what the rule is claiming, what evidence it is
claiming it from, and where the claim stops being safe.

- [The grant/RLS/policy lattice (L rules)](#the-grantrlspolicy-lattice-l-rules)
- [Coverage semantics](#coverage-semantics)
- [Extension objects](#extension-objects)
- [Declared public surface](#declared-public-surface)
- [Access paths: the evidence behind X1](#access-paths-the-evidence-behind-x1)
- [Policy-aware index rules: X2, X3, X4](#policy-aware-index-rules-x2-x3-x4)
- [X9 — the InitPlan rule](#x9--the-initplan-rule)
- [X7 and X8 — search and sort shapes](#x7-and-x8--search-and-sort-shapes)
- [Runtime statistics (S rules)](#runtime-statistics-s-rules)

## The grant/RLS/policy lattice (L rules)

The A/R rules read grants exactly as the catalog stores them, which misses the two ways access
actually arrives without an ACL row naming the role: `GRANT ... TO PUBLIC` (applies to every role)
and role inheritance (`pg_auth_members`, INHERIT-following). The L rules evaluate the *effective*
cell each `(relation, role, privilege)` triple lands in:

| grant | RLS | policy | verdict |
| --- | --- | --- | --- |
| yes | on | yes | normal — policy-mediated access |
| yes | on | no | dead grant (L1 indirect; A4/A5 direct) |
| yes | off | — | unmediated (A2 table-level; L5 per untrusted role, indirect) |
| no | — | yes | dead policy (L2) |

plus schema composition: an object grant is unreachable without `USAGE` on its schema (L3), and
`USAGE` that reaches no relation and no function is dead surface (L4).

L6 composes the lattice with [API reach](../README.md#api-reach--the-relations-the-api-can-actually-name):
an API-edge role holding privileges on a relation the generated API cannot address. It is not a
leak — the role would have to connect directly to use the grant — which is exactly why such grants
survive for years. Two conditions gate it, both deliberately conservative: an adapter must have
*proved* the relation unaddressable (silence in the behavior tags is never denial), and no RLS
policy predicate anywhere may reference the relation. The second is the important one: a policy
can subquery a table under the querying role, so the grant is load-bearing however invisible it is
to the API, and a naive recommendation to revoke it would break authorization at runtime.

Restrictive-only policies never count as coverage. `BYPASSRLS` and superuser roles are exempt from
policy checks — they are not subject to RLS, so a "missing policy" finding for them would be
noise. Policies are matched with `pg_has_role` semantics: a policy `TO authenticated` covers a
member of `authenticated`.

When untrusted roles are configured (via the L5/R1 options), the report also carries `roleAccess`
— the direct answer to "what can role X access?": every relation the role effectively reaches,
with provenance (`direct`, `PUBLIC`, `member of <role>`) and whether RLS mediates the access.
Rendered as a "Role access" section in pretty and markdown output.

## Coverage semantics

Coverage is aggregated `(table, role) → { hasUsing, hasWithCheck }` across every applicable
permissive policy, including `FOR ALL` policies and policies targeting `PUBLIC`. A4/A5 fire when a
granted operation has no permissive policy supplying the clause that operation needs — which is a
*fail-closed* condition: Postgres denies the operation at runtime (writes error, selects return
zero rows). It is a bug, but it is not a leak, which is why it contributes nothing to the score by
default.

A6 is the asymmetric case: `UPDATE` with `USING` but no `WITH CHECK` lets a row be updated into a
state outside the role's visible set — the row is smuggled out of the policy's view rather than
read from outside it.

## Extension objects

An extension's tables are the `node_modules` of a database: they live in the same catalog, scan
like anything else, and are not yours to alter — `ALTER TABLE` on one breaks `pg_dump` and
upgrades. safegres skips relations an extension owns (`pg_depend.deptype = 'e'`), and their
partitions, by default.

Ownership alone is not enough. An extension that creates objects *at runtime* never registers them
as dependencies: on one Constructive database only 2 of `pg_partman`'s 32 relations were owned,
leaving 30 template tables looking like unsecured application tables — 30 of that report's 39
criticals. Naming the extension skips its schema wholesale:

```jsonc
{
  "extensions": {
    "ignore": ["pg_partman"],   // skip everything in the extension's schema
    "skipOwned": true           // default; false audits extension-owned relations too
  }
}
```

CLI: `--ignore-extensions <csv>`, `--audit-extension-owned`. Unknown or uninstalled names are
ignored, so one config works across environments. The `safegres:constructive` preset ships
`ignore: ["pg_partman"]`.

## Declared public surface

Some open reads are deliberate — pricing tables, reference data, a public user directory. Declare
them and safegres treats them as intent instead of findings:

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

- An open SELECT policy (`USING (true)` — rule A8) on a declared table is **acknowledged**:
  reported as info, excluded from the score.
- An open read on any *undeclared* table stays a scored finding — even in a `*_public`-named
  schema. Naming is never treated as intent; the config declaration is.
- `safegres doctor` warns about stale `public.read` patterns that no longer match any table.

## Access paths: the evidence behind X1

X1 is right about the mechanics — a `DELETE` on the parent really does scan the child — but it
assumes the child is a relation somebody traverses. On a provisioning-config table, one whose keys
are written once at setup and never looked rows up by, the index it asks for is a write on every
insert in exchange for speeding up a scan of one row. Acting on X1 across such a schema makes the
database measurably worse while the grade goes up.

The tempting gate, `pg_class.reltuples`, doesn't work here: safegres grades an ephemeral CI
database that has never held data, so every row estimate is 0 at exactly the moment it grades. And
row count is the wrong question anyway — a huge append-only log nobody joins on wants no FK index,
while a tiny lookup table every request hits does. The property that matters is whether anything
reads the key, which is structural, so it survives an empty database.

So safegres collects **signals** about every foreign key, each pointing one way and saying why, and
reports them on the finding (`context.pathSignals`) and in aggregate (`report.perf.paths`):

| Signal | Direction | Fires when |
| --- | --- | --- |
| `policy-read` | read | an RLS policy predicate names one of the key's columns |
| `view-read` | read | a view or materialized view names one of them |
| `write-once-pointer` | shape | every column of the key has a constant default (`uuid_nil()`, a literal) |
| `config-record` | shape | the table carries two or more write-once pointers (`perf.paths.minPointers`) |

A **read** signal is decisive — the database itself traverses the column, so the key is a query
path and X1 applies as written. That is what keeps the tenant key out of trouble with no special
case: `database_id` appears in essentially every policy. A **shape** signal is not: a `NOT NULL`
key defaulting to the nil UUID looks like a slot a provisioner fills in, but a generated API can
expose a reverse relation over any foreign key regardless of how its default is written, and if it
does, the index is wanted after all.

So by default the shape **changes nothing** — no finding is removed, no severity moves, no score
shifts. What it does is tell you where to look, and `perf.paths.onWriteOncePointer` decides what X1
does about it:

- `report` (default) — the finding stands, with the signals attached to it;
- `demote` — write-once-shaped keys drop to `info`, so they are read rather than gated on and
  contribute nothing to the score;
- `suppress` — no finding. Only defensible once you know the generated API does not expose these
  relations; a shape is not a proof.

The signal that *would* settle it is the one that isn't here yet: whether the generated API surface
still contains the field. It slots in as another signal, and only then does "nothing can reach this
key" become a conclusion anything should act on. `perf.paths.infer: false` skips the collection
entirely.

An index covers a foreign key only when its *leading* columns are the FK's columns and it covers
every row — partial and expression indexes don't count, because the planner can't use them for the
referential-integrity lookup. Constraint-backed, unique, partial, and expression indexes are never
reported as redundant (X5).

## Policy-aware index rules: X2, X3, X4

These are the checks a generic index linter can't make, because they read the policy predicate.
RLS quals are evaluated *before* user quals, on every candidate row, for every caller — so an
unindexed or cast-wrapped policy column is a whole-table tax rather than a slow query.

- **X2** requires the policy column to be the *leading* column of some index; a trailing position
  can't serve the qual alone.
- **X3** looks for an expression index matching the exact wrapped shape (`lower(email)`,
  `tenant_id::text`). Without one, the cast defeats the plain index on the column.
- **X4** flags a non-LEAKPROOF function in the qual, which prevents the planner from pushing the
  qual below joins or subquery scans. Built-ins are skipped: their leakproofness is a property of
  the server, not of a schema choice.

## X9 — the InitPlan rule

X9 is the one that costs the most and looks the most innocent. `STABLE` promises a function's
result won't change within the statement; it does **not** make the planner evaluate it once.
Measured on 200k rows with a policy function that counts its own invocations:

| Policy qual | Calls | Time |
| --- | --- | --- |
| `other_id = current_principal_id()` (Filter) | 200,000 | 424 ms |
| `other_id = (SELECT current_principal_id())` (InitPlan) | 1 | 22 ms |

The honest caveat: the penalty is **plan-dependent**. When the planner can turn the qual into an
index condition it evaluates the function once per scan even unwrapped — so the same policy costs
one call on an indexed column and 200,000 on a Filter (unindexed column, a join, an OR branch, a
plan change after `ANALYZE`). Wrapping removes the dependence: `(SELECT f())` references no column,
so it is hoisted into an **InitPlan** and evaluated once per query whatever plan is chosen, and the
result is a constant the index can be probed with.

X9 is structural, not a name list — it fires on any non-IMMUTABLE call whose arguments reference no
column of the row and that isn't already inside an uncorrelated scalar sub-select, so a GUC-reading
helper added next year is caught without configuration. `current_setting()` itself is STABLE and is
flagged too: removing the wrapper function doesn't avoid the per-row call. VOLATILE calls are
deliberately excluded — per-row evaluation is their defined behaviour, and hoisting one would change
semantics (that's P1's job). Being inside an `EXISTS` sub-select is not a defence: that subquery is
correlated with the outer row, so it runs per row and takes the call with it.

## X7 and X8 — search and sort shapes

X7 exists because the column type *is* the API declaration on a generated API:
[`graphile-search`](../../../graphile/graphile-search) exposes a full-text filter for every
`tsvector` column and a similarity search for every `vector` column, purely from the codec — so an
unindexed one is a first-class API field backed by a sequential scan plus a per-row match or
distance computation. On a hand-written API the same reasoning applies wherever anything searches
the column. BM25 and pg_trgm are deliberately not checked: those adapters are discovered *from*
their indexes, so a missing index means the feature was never exposed.

X8 is the one heuristic in the set — any column is orderable, but timestamps are what feeds are
actually sorted and keyset-paginated by — so it defaults to `info`, contributes 0 to the score, and
is meant to be read, not gated on (`perf.rules: { "X8": "off" }` to silence it). Trailing-position
and partial indexes don't count for either rule: neither can serve the sort or the search on its
own.

## Runtime statistics (S rules)

The `X*` rules read the schema; the `S*` rules read what the workload actually did to it. They come
from `pg_stat_user_tables`, `pg_stat_user_indexes` and — when the extension is installed —
`pg_stat_statements`, so they only mean something against a database that has served representative
traffic. See [advanced.md](./advanced.md#runtime-statistics---stats) for thresholds and provenance.
