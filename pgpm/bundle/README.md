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

## The bundle envelope

The **bundle envelope** is how you ship a database the way you ship a product: the
whole thing — its structure (a `MigrationBundle`), its row data, its fixtures — as one
sealed, versioned, tamper-evident package. Like a shipping container: standardized,
stackable, verifiable at every port. The bundle is the schema; the envelope is the
whole shipment.

```ts
import { bundleFromModule, createEnvelope, verifyEnvelope, materializeEnvelope } from '@pgpmjs/bundle';

const envelope = createEnvelope({
  version: '1.0.0',                        // caller-assigned artifact version
  schema: bundleFromModule(moduleDir),     // required: the MigrationBundle
  data: [{ name: 'source-plane-data', deploy, revert, verify }],   // e.g. from @pgpmjs/export
  fixtures: [{ name: 'seed-roles', deploy }],
  provenance: { sourceDatabase, sliceSpec }  // lineage; recorded but excluded from the digest
});

verifyEnvelope(envelope);                  // { issues: [], schemaIssues: [] }
materializeEnvelope(envelope, outDir);     // deterministic, tar-friendly directory layout
```

- **Manifest** — identity (`name`, `version`), a contents inventory with per-part
  sha256 digests, and source lineage (`provenance`).
- **Merkle content digest** — the envelope digest covers the ordered part digests; the
  schema part's digest is the bundle's own manifest digest, so the chain extends down
  through every change and script. Flip one byte anywhere and `verifyEnvelope`
  localizes it.
- **Payload-agnostic parts** — each data/fixtures part is a named deploy/revert/verify
  SQL triplet produced by the caller (e.g. the `@pgpmjs/export` data-dump builders);
  the envelope never generates SQL, it digests, ships, and verifies it.
- **Serialization** — one JSON artifact (`writeEnvelopeFile` / `readEnvelopeFile`) or a
  deterministic directory (`materializeEnvelope` / `envelopeFromDirectory`):

  ```
  envelope.json                 # manifest only
  schema/pgpm-bundle.json       # the schema MigrationBundle artifact
  data/<name>/{deploy,revert,verify}.sql
  fixtures/<name>/{deploy,revert,verify}.sql
  ```

This package is pure (no database, no deploy engine). The deployment glue —
`applyBundle` and `applyEnvelope`, which drive `PgpmMigrate` — lives in
`@pgpmjs/core`. See the `pgpm-migration-bundle` skill for the full model.
