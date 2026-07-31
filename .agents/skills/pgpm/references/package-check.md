# Package check: verify committed artifacts are in sync with `deploy/`

`pgpm package --check` is a **read-only, no-DB** integrity check. It proves
that each module's committed build artifact (`sql/<name>--<version>.bundle.tar.gz`)
still matches the SQL in that module's `deploy/`, and fails fast when someone
edited SQL without re-running `pgpm package`. Consult this when wiring a CI
gate for pgpm workspaces, or when asked "how do we stop stale bundles from
being merged".

It is the verification half of the packaging story:

- `pgpm package` — **build** the artifacts (`sql/<name>--<version>.sql` +
  `sql/<name>--<version>.bundle.tar.gz`). See `references/publishing.md`.
- `pgpm package --check` — **verify** those committed artifacts (this file).
- `pgpm deploy --fast` / `--bundled` — **consume** the verified bundle. See
  `references/deploy-lifecycle.md`.
- Artifact internals (digests, AST) — the `pgpm-migration-bundle` skill.

## Commands

```bash
pgpm package --check                      # verify only the modules that changed
pgpm package --check --since origin/main  # diff HEAD vs a branch, ref, or tag
pgpm package --check --all                # verify every module in the workspace
pgpm package --check --dependents         # also re-check modules that require a changed one
pgpm package --check --no-fail-fast       # list every drifted module instead of stopping at the first
```

Exits non-zero and names each drifted module, e.g.:

```text
✖ my-second: committed bundle does not match deploy/ — run `pgpm package`
1 module(s) out of sync. Run `pgpm package` in each and commit the artifacts.
```

## How it decides what to check

Change detection layers cheapest-source-first, then maps files to modules
through the workspace graph:

1. **Base ref** — explicit `--since <ref>` wins; otherwise the PR base in CI
   (`origin/$GITHUB_BASE_REF`); otherwise working-tree only.
2. **Changed files** — union of `git diff --name-only <base>...HEAD`
   (three-dot, so branches/refs/tags all work) and `git status --porcelain`
   (uncommitted + untracked). It shells out to the `git` binary — no
   `simple-git`/Octokit dependency.
3. **Files → modules** — each changed path is attributed to its owning module
   (longest-matching module directory). Only those modules are checked.
   `--all` skips detection; `--dependents` walks the reverse `requires` graph.

> A module's artifact reflects **only its own** `deploy/` (`resolveWithPlan`
> never inlines required modules), so a dependency change cannot drift a
> dependent's artifact. `--dependents` is therefore off by default — enable it
> only for extra-paranoid checks.

## What it verifies per module

For each targeted module (`checkModuleArtifact` in
`pgpm/core/src/packaging/check.ts`):

1. `resolveBundleArtifactPath` — artifact exists → else `missing-artifact`.
2. `readBundleArtifact` — archive is readable → else `unreadable-artifact`.
3. `verifyBundle` — internal digests are self-consistent → else `integrity`.
4. `bundleMatchesModule` — the artifact's stored per-change sha256 + plan bytes
   still match the current `deploy/` → else `out-of-sync`.

No SQL is parsed or executed and no database is touched — it is read + sha256
only, so it is cheap enough to gate every PR.

## CI usage

Drop the one-liner into a PR workflow (works in any pgpm workspace with zero
config — it auto-detects the PR base):

```yaml
- name: Verify pgpm bundles are in sync
  run: pgpm package --check --since origin/${{ github.base_ref }}
```

Fail-fast is the default, so the job stops at the first stale bundle. Use
`--no-fail-fast` when you want the full list in one run.

## Programmatic API

```ts
import { checkPackages } from '@pgpmjs/core';

const result = await checkPackages({ since: 'origin/main' });
if (result.drifted.length) process.exit(1);
// result: { targeted, checked, drifted, base, changedModules }
```
