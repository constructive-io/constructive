# @pgpmjs/bundle

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@pgpmjs/bundle"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=pgpm%2Fbundle%2Fpackage.json"/></a>
</p>

The pgpm **migration bundle** — the portable, content-addressed artifact layer on top
of `@pgpmjs/ast`. A `MigrationBundle` is a deterministic snapshot of a pgpm module (plan,
control, ordered changes, per-change/whole-bundle sha256 digests) plus optional
provenance: the "shipping container" for a database migration.

- `createBundle` / `bundleFromModule` — build a bundle from a module AST.
- `writeBundleFile` / `readBundleFile` — JSON serialization on the wire.
- `materializeBundle` — expand a bundle back into a deployable module directory.
- `verifyBundle` — recompute digests and localize any tamper/mismatch.
- `transpileBundle` — produce a namespaced bundle (caller supplies the SQL AST rewrite).
- `diffBundles` / `reconcilePlan` — structural diff and ordered revert/deploy plan.

This package is pure (no database, no deploy engine). The deployment glue —
`applyBundle`, which drives `PgpmMigrate` — lives in `@pgpmjs/core`. See the
`pgpm-migration-bundle` skill for the full model.
