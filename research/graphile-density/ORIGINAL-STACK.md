# Original PR stack provenance

Fetched on 2026-07-31 after fetching `origin/main`. The local worktree base is `a10ea246fcc45b025713024e131fafb908171149`.

| PR | GitHub head | Logical base branch | Disposition |
|---|---|---|---|
| #1330 | `6786cc1f77bc5a6b9412b0d5ba4cbb3031de76d1` | `main` | Reimplemented selectively. Its four-commit PR history contains the plugin fixes, quoting migration, lockfile normalization, and a final description-only cleanup; comparing only its head against `cdf155e8` hides the earlier useful commits. |
| #1331 | `161c067c6616a5e121e6757b8921ff28e743179d` | `feat/scale-s1-plugin-fixes` | Hardened and separated from runtime identity work. |
| #1332 | `b8d0c20a20c8a5363e22d8f4285a73d86202b2b5` | `feat/scale-s2-cache-hardening` | SQL substitution implementation rejected and replaced. |
| #1333 | `269b23c2ff82b0b6295cb1822f5affddfbc511cb` | `feat/scale-s3-introspection-filter` | Rejected as a production design. |
| #1334 | `b3d0021b80896baaafaee04c16bd08da35ef2d26` | `feat/scale-s4-pooling-core` | Rejected as a production design. |
| #1335 | `de35e09d67702b6ce3b4ed77e743e449fdc5ea2f` | `feat/scale-s5-pooling-integration` | Harness concepts refreshed; old results retained only as historical claims. |

The old stack is not one simple linear range: #1330 ends one commit after `cdf155e8`, while #1331 also has `cdf155e8` as its parent and #1332–#1335 form the linear five-commit chain beginning at #1331. Review therefore uses two range-diffs: #1330's full PR range against local branch 1, and #1331–#1335 against local branches 2–5. Lockfile normalization is reviewed independently rather than replayed.

No branch or PR was pushed or modified.
