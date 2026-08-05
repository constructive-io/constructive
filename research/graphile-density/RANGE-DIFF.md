# Old PR stack to local research stack

The old commits and current-main implementations are different enough that `git range-diff` correctly reports delete/add pairs rather than pretending they are textual rebases. The semantic mapping below comes from that result plus per-file review.

## Commands and raw correspondence

```text
git range-diff \
  ed31ed2aa63fcd2d42acec6f27e672dd300a3959..6786cc1f77bc5a6b9412b0d5ba4cbb3031de76d1 \
  a10ea246fcc45b025713024e131fafb908171149..7ef0502666d71d33bd7275bd27588698a205f3ee

1: ad54f1fbd < -: --------- tenant-isolation/correctness fixes
2: c96a87c84 < -: --------- whole-lockfile normalization
3: cdf155e84 < -: --------- @pgsql/quotes conversion
4: 6786cc1f7 < -: --------- description punctuation cleanup
-: --------- > 1: 7ef050266 current-main plugin scope/quoting implementation
```

```text
git range-diff \
  cdf155e84370153b6f5db9a5e7061efd8b9c0329..de35e09d67702b6ce3b4ed77e743e449fdc5ea2f \
  7ef0502666d71d33bd7275bd27588698a205f3ee..848bfe2e7

1: 161c067c6 < -: --------- old cache/governor
2: b8d0c20a2 < -: --------- old introspection text filter
3: 269b23c2f < -: --------- blueprint rewrite core
4: b3d0021b8 < -: --------- blueprint pooling integration
5: de35e09d6 < -: --------- old cperf/scale validation
-: --------- > 1: de92be5a9 runtime boundary
-: --------- > 2: 5fd90ee2b hardened cache governor
-: --------- > 3: f41e480d5 parameterized scoped introspection
-: --------- > 4: 848bfe2e7 refreshed cperf and final audit hardening
```

## Semantic disposition

| Old work | Local replacement | Per-file conclusion |
|---|---|---|
| #1330 | `7ef050266` | Reapplied quoting and tenant/build scoping in the current i18n, LLM/RAG, search/BM25, and cache APIs. The current `graphile-meta` WeakMap/build boundary supersedes its old global-cache edits. The lockfile rewrite and punctuation-only cleanup were intentionally omitted. |
| #1331 | `de92be5a9` + `5fd90ee2b` | Split identity/security from memory policy. Pool/build identities, runtime credentials, GUC initialization, and checkout reset live below the hardened governor rather than being implicit cache-key behavior. |
| #1332 | `f41e480d5` plus the top-branch closure regression | Replaced query-string substitution with `{ text, values }`, an explicit service mode, required-schema assertions, and dependency closure. A partition fixture then removed unsafe parent-to-unrelated-child expansion. |
| #1333/#1334 | none | Intentionally absent. No SQL rewrite seam or blueprint-sharing flag exists in the local stack. Dedicated instances compile against their actual physical schemas. |
| #1335 | `848bfe2e7` | Rebuilt around complete tenants and all surfaces, four fresh-process arms, hostile canaries, mandatory telemetry, paired density scoring, and immutable artifacts. Old blueprint figures remain labeled historical. |

This is a reconstruction on `origin/main`, not a claim that old patches replayed cleanly. Review should compare the behavior and trust boundaries above, then use the focused files listed in `PLUGIN-SQL-AUDIT.md`, `UPSTREAM-REVIEW.md`, and `REPORT.md`.
