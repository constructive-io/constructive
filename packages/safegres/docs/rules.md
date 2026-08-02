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
`USAGE` that reaches no relation and no function is dead surface (L4). Views count as relations
for L4: a role whose only reachable object is a view holds `USAGE` the API depends on — and by L8
that view may be its entire read path — so counting tables alone would recommend revoking a
load-bearing grant.

L6 composes the lattice with [API reach](../README.md#api-reach--the-relations-the-api-can-actually-name):
an API-edge role holding privileges on a relation the generated API cannot address. It is not a
leak — the role would have to connect directly to use the grant — which is exactly why such grants
survive for years. Two conditions gate it, both deliberately conservative: an adapter must have
*proved* the relation unaddressable (silence in the behavior tags is never denial), and no RLS
policy predicate anywhere may reference the relation. The second is the important one: a policy
can subquery a table under the querying role, so the grant is load-bearing however invisible it is
to the API, and a naive recommendation to revoke it would break authorization at runtime.

L8 is the first rule whose evidence is a SQL body rather than the catalog. A view that was not
created `WITH (security_invoker = true)` executes as its **owner**, so a role holding nothing but
SELECT on the view reads the view's base relations under the owner's privileges — tables no ACL
row names it on, and, when the owner owns the table or holds `BYPASSRLS`, without the row filter
the table's policies would have applied. No amount of catalog closure can see that edge: it exists
only inside the view definition, which is why the reach cells it produces carry `proof: 'ast'`
rather than `proof: 'catalog'`, and why the effective role on them is the view's owner.

Three things gate it, and all three are refusals to guess. A body safegres cannot read — dynamic
SQL, an unparseable definition, a chain of views deeper than it will follow — suppresses the view
entirely, because an unread body is *unknown*, not empty. A reference it cannot pin to exactly one
relation resolves to nothing rather than to a plausible candidate. And the remedy is never a
revoke: the SELECT on the view is what the API serves, so L8 recommends `security_invoker = true`
or a different owner, and says so explicitly.

What escapes through a view is a *projection*, not a relation, and the catalog says exactly which
one: the rewriter records a `pg_depend` row per column the view body reads, so `SELECT *` arrives
already expanded, a column used only in a `WHERE` counts as read, and a nested view depends on the
inner view's columns rather than the table's. L8 carries that set into the finding — the message and
`context.columns` name the columns, not just the relation — and uses it for one refusal: when every
column that escapes is one the role could already read through its own column grants (L13's closure)
*and* the base relation has no RLS, the view launders nothing and L8 stays silent. With RLS on, the
projection is beside the point: the owner reads rows the caller's policies hide, so the finding
stands. An unknown column set is unknown, never narrow — a snapshot without dependency rows reports
as before.

L9 and L10 are the write half of the same question, and neither is answerable from the view body
alone. **L9** is auto-update: a simple view over one relation is updatable, so Postgres rewrites an
INSERT/UPDATE/DELETE on the view onto that relation, and on a definer view the rewritten command is
checked against the *owner*. The body says which relation; only `pg_relation_is_updatable` says the
write lands there at all. **L10** is rewrite rules: a rule other than the view's own `_RETURN` rule
is invisible to `pg_get_viewdef`, so `ON INSERT ... DO INSTEAD INSERT INTO audit` reaches a relation
the definition never names. Two properties of L10 are worth stating plainly, both verified against
Postgres 18 rather than inferred: rule actions are permission-checked against the owner of the
relation the rule is on, and `security_invoker` does **not** govern them — it governs the view's own
base relations. An invoker view with such a rule still writes as its owner.

Both inherit L8's refusals. An `INSTEAD OF` trigger sends the write into a function body whose
target is not proven here, a body that does not resolve to exactly one relation places no write, and
an unreadable rule action is unknown — all three suppress. `DO INSTEAD NOTHING`, the commonest rule
in the wild, reaches no relation and so reports nothing, which is the correct answer for the
read-only views it is used to build.

L11 and L12 are the last two things a *readable* view does that neither its owner nor its body
explains on its own. **L11** is materialization: a matview's rows were computed once, by whoever ran
`REFRESH`, and are then served verbatim — the base relations are never consulted at read time, so
their ACLs do not apply and their policies do not run. A matview can carry neither policies (RLS
attaches to tables) nor `security_invoker` (a view-only reloption), so there is no option on the
object that reinstates the filter; the finding fires both when the role holds no grant on the base
relation and when it holds one but is subject to policies the stored rows never passed. **L12** is
`security_barrier`: without it the planner may push the *caller's* qual below the view's own, so a
leaky operator or a `COST 0.0001` function is evaluated against the rows the view was written to
hide. They are not returned, but they are seen — enough to read them out through a notice, an error
or a timing difference. L12 is deliberately narrow: it needs the view to actually filter (an
explicit `WHERE`/`HAVING` — row-limiting through a join or a `LIMIT` is not how a boundary gets
written), to be a definer view, and to be the role's *only* path to the relation. A caller that can
read the base table directly loses nothing to a pushed-down qual.

Both inherit the same refusals, with one addition: a body safegres cannot parse is *unknown*, never
"does not filter", so it suppresses rather than clearing the view. And neither recommends a revoke —
the remedies are `security_barrier = true`, an RLS policy on the base relation (policy quals already
get barrier treatment), or not materializing rows that are not safe to hand out unconditionally.

**L13** is not about views at all — it is about a place the catalog keeps privileges that nothing in
this package used to read. `GRANT SELECT (email) ON t TO anon` writes `pg_attribute.attacl` and
leaves `pg_class.relacl` untouched, so a role whose entire access to a relation is column-scoped was
reported as reaching *nothing*: no A2, no R1, no L-series, and "0 relation(s) accessible" in the
role access report. The privilege is real, and a column grant restricts *which columns*, never which
rows — with RLS off it reads every row of the columns it names. Two consequences beyond the new
finding: L4 no longer calls a role's schema `USAGE` dead when its only reach into that schema is a
column grant (that was a recommend-a-revoke on a load-bearing grant), and L2 no longer calls a
policy dead when the grant it mediates is column-scoped. What L13 does *not* do yet is feed the
weighted rules: column-level SELECT for an anonymous role on an RLS-off table is the same exposure
A2 grades `high`, and promoting it there is a scoring change to make once the rule has been
validated against real schemas.

**L14** is the coverage half of L8, and the only rule here that reports an *absence of knowledge*.
Excluding a schema — by `excludeSchemas`, by naming only some in `schemas`, or because it is a
system catalog — is a statement about what gets *graded*, not about what is *reachable*. A definer
view in an audited schema whose body reads `information_schema`, an extension's tables, or a private
schema left out of the surface produced nothing at all: the base relation was not in the snapshot,
so every rule that grades a base relation dropped the edge and the view scanned clean. The resolver
now separates the two kinds of miss — a qualified reference into a schema the audit *did* read is
still an unresolved name (a CTE, an alias) and is still dropped, while a qualified reference into a
schema it never read is `external`: the reach is proven, its consequences are not.

The finding is `info`/`neutral` and stays there however the reach is graded later, because an
unknown is not a leak and scoring one would let an excluded schema move the number. It is exposure-
stamped by the *view*, not by the out-of-scope relation, or every instance would file itself as an
internal advisory and disappear from the report that matters. The remedy is to bring the schema into
scope or to satisfy yourself the projection is safe — never a revoke. Note the boundary the negative
corpus case pins: an out-of-scope *reference* is not a finding, only an out-of-scope *reach* is. An
invoker view over the same table confers nothing, so it reports nothing, which is what keeps every
view that touches a system catalog from becoming noise. L9–L12 take the conservative side of the
same distinction: an external relation has no owner, ACL or RLS to reason about, so it suppresses.

**L15** finishes the thought L14 started, on the other axis. Until now a body safegres could not read
was dropped whole: an unparseable definition, or one calling something that carries its query in a
*string* (`query_to_xml`, `dblink`), produced no `ViewReachInput` at all, so a definer view an
anonymous role reads scanned exactly as clean as a view that reads nothing. That is the one failure
mode conservatism must not have — silence that looks like a pass. Extraction now separates the two
kinds of blindness: a body that cannot be parsed is `opaque` and grades nothing, while a body that
parses but *executes SQL of its own* is `tainted` — the references it named are still proven and
still graded by L8–L14, and only what lies past the SQL-executing call is unknown. Either way the
view stays in the model, and a role holding SELECT on it produces a reach cell on the *view itself*
with `proof: 'opaque-tainted'` — which is the first producer that bit has ever had. No base-relation
rule grades that cell (it names no base relation to grade), so L15 exists to say the path was never
graded rather than let it pass silently.

It is `info`/`neutral` for the same reason L14 is: an unreadable body is not evidence of a leak, and
letting one move the score would reward opacity. The negative case is the load-bearing one — an
*invoker* view with the identical unreadable body reports nothing, because the body runs with the
caller's own privileges and confers nothing to be ungraded, which is what keeps every view calling a
SQL-executing function from becoming noise.

## Objects that are not tables (L16, L17)

The table snapshot reads `relkind IN ('r','p')` and the view snapshot reads views and matviews,
which left two kinds of relation carrying real privileges that no rule had ever looked at.

**L16 — sequences.** `USAGE` or `UPDATE` on a sequence is the right to call `nextval`/`setval`: an
untrusted role can consume the identifier space of whatever the sequence feeds, or reset the counter
so the next insert collides with an existing row. `SELECT` is the right to read `last_value`, which
is a live row-count estimate for the owning table and a standard way "how many customers do they
have" gets answered through an API that exposes no customers. None of it is row-filterable — RLS
does not apply to a sequence — so the protection on the table beside it says nothing about the
sequence. The no-revoke constraint has teeth here: a role holding `INSERT` on a table with a
`serial` column **must** hold `USAGE` on its backing sequence, so the finding carries the `OWNED BY`
link from `pg_depend` and the remedy leads with `GENERATED ... AS IDENTITY` (which needs no grant at
all) rather than with a `REVOKE` that breaks the write path. Where no such link exists the hint
still stops short of advising removal, because a `DEFAULT` can name a sequence without recording an
ownership dependency.

**L17 — foreign tables.** A foreign table cannot carry RLS at all: Postgres rejects
`ALTER FOREIGN TABLE ... ENABLE ROW LEVEL SECURITY` outright (verified on 18, and pinned by a live
test). That makes it strictly worse than the A2 shape it resembles — A2 reports "grants and no RLS"
and its remedy is to add a policy, which here is not an available move. The remedy is to expose the
relation through a view that carries the filter, or to push the filter to the remote side.

Both are `info` and score-neutral to start, like every new rule; the honest severity of an anonymous
role reading an unfiltered foreign table is not informational.

Restrictive-only policies never count as coverage. `BYPASSRLS` and superuser roles are exempt from
policy checks — they are not subject to RLS, so a "missing policy" finding for them would be
noise. Policies are matched with `pg_has_role` semantics: a policy `TO authenticated` covers a
member of `authenticated`.

When untrusted roles are configured (via the L5/R1 options), the report also carries `roleAccess`
— the direct answer to "what can role X access?": every relation the role effectively reaches,
with provenance (`direct`, `PUBLIC`, `member of <role>`) and whether RLS mediates the access.
Rendered as a "Role access" section in pretty and markdown output.

## Privilege through a function body (L19, L20)

L8–L12 covered the view half of "SQL bodies confer privilege". L19 and L20 are the function half,
and the larger one.

**L19 — `SECURITY DEFINER` functions.** A definer function executes as its owner, so every relation
its body touches is touched with the owner's privileges: tables the caller holds nothing on, and —
where the owner owns the table and RLS is not `FORCE`d, or the owner has `BYPASSRLS` — without the
row filter the policies would have applied. `EXECUTE` on the function is the only grant the caller
needs, and no ACL entry on the base relation names it. Verified on PostgreSQL 18: an anonymous role
with `EXECUTE` read every row of an RLS-protected table it had no grant on, while the invoker twin
of the same function was denied. Postgres also grants `EXECUTE` to `PUBLIC` by default, so this
reach routinely exists where nobody wrote a grant at all; the finding says so (`context.defaultAcl`)
rather than treating a default as a decision.

The walk is the view walk with the roles rewired. `extractFunctionAccess` returns the *privilege*
each reference exercises rather than a read/write bit, so an `INSERT` in a body is an `INSERT`
finding. Calls are followed: an inner definer re-owns the execution, an invoker callee keeps
whichever owner is already in force, recursion is cut at the first repeat, and a view read from a
body continues through L8's resolution so a definer function selecting from a definer view reaches
that view's bases too. Overloads collapse by `schema.name`, as they do in the call graph, because
the argument types a call binds are not in the reference.

Two shapes are deliberately *not* reach. An invoker function confers nothing — its body runs with
the caller's own privileges, which is exactly what the negative corpus case pins. And a trigger
function is never graded by L19 however wide its `EXECUTE` ACL: Postgres refuses to call one
directly, so the ACL is not a path. That is `returnsTrigger` on the snapshot, and it is what keeps
every definer trigger function in a schema from reporting itself twice.

**L20 — `INSTEAD OF` triggers.** This is the suppression L9 has carried since it shipped. A write
against a view carrying `INSTEAD OF` triggers never reaches a base relation: Postgres replaces it
with the trigger function's body, and that body is permission-checked against the **function's**
effective user. So the escalation exists only when the trigger function is `SECURITY DEFINER` — the
view's own owner and its `security_invoker` setting decide nothing here. Both halves were probed on
PG 18: the invoker trigger function was denied on the relation its body wrote, the definer one wrote
it as its owner. Both corpus cases invert the view's setting relative to the function's, so a rule
that read the view's attribute instead of the function's would fail them.

`ViewSnapshot.insteadOf` carries each trigger's target function and the events it fires on (decoded
from `tgtype`), which the introspection did not previously read at all. A trigger whose function is
outside the audited schemas, or whose body cannot be read, still suppresses: the write goes
*somewhere*, and guessing where is the one thing this analysis must not do.

Neither rule ever recommends a revoke. `EXECUTE` on the function is what the API serves, and the
grant on the view is what the write path serves; the defect is what the body does with the owner's
rights, so the remedies are to narrow the body, authorize the caller inside it, change the owner, or
make the function `SECURITY INVOKER`. Both ship `info` and score-neutral on the usual new-rule
posture — a definer function handing an anonymous role a table it holds nothing on is not an
informational fact, and the honest severity once proven is A2's.

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
