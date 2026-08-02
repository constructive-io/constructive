# Call graph — trust boundaries (`--call-graph`)

RLS findings tell you what the *tables* allow. The call graph tells you what the *functions*
reach: starting from the exposed entry points (functions the API roles can `EXECUTE`), safegres
statically walks each body and lists every **trust boundary** on the way — unscored, because a
public `SECURITY DEFINER` calling private functions is the intended pattern (that's how `sign_in`
works). The output is a deterministic checklist for human review, not a grade.

| Code | Boundary |
| --- | --- |
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

Bodies are analyzed for `sql` and `plpgsql` functions (via the PL/pgSQL parser); overloads collapse
into one node per `schema.name`; unqualified calls resolve to every user function with that name (a
conservative over-approximation). JSON output (`--format json`) carries the full graph — nodes,
edges, and checklist — sorted stably so it can be snapshotted and diffed in CI.

## Baseline diffing (CI gate for new trust boundaries)

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

The baseline stores only boundary *identity* (`code` + entry + function + table), so message
rewording and path changes between safegres versions never invalidate it. A boundary that
disappears is reported as resolved; re-run `--write-baseline` to accept either direction. The diff
is also carried in JSON output (`callGraphDiff`).
