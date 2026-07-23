---
name: pgpm-migration-bundle
description: The portable, content-addressed PGPM migration bundle artifact and the pgpm module AST it is built from. Use when asked to "export a migration bundle", "ship a schema between databases", "transpile migrations into a new namespace", "verify a migration artifact", "understand MigrationBundle / PgpmModuleAst", "read/write a pgpm module as an AST", "content-address a migration", or when working with `pgpm/bundle/*`, `pgpm/ast/*`, or `pgpm/traverse/*`.
compatibility: "@pgpmjs/ast, @pgpmjs/bundle, @pgpmjs/traverse, @pgpmjs/core >= 7.1.0, Node.js 22+"
metadata:
  author: constructive-io
  version: "1.1.0"
---

# PGPM Migration Bundle

A **migration bundle** is a portable, content-addressed artifact that fully describes a
PGPM migration — the change plan, the deploy/revert/verify SQL, and a tamper-evident
fingerprint — as a single serializable value. It is the "shipping container" that lets a
database's structure and security fixtures move between databases (control plane → data
plane), be transpiled into a new namespace, diffed, cached, and verified end to end.

It is a thin **transport/artifact layer on top of** the existing PGPM file tooling — it
does **not** re-implement plan/header/control parsing. The moment a bundle needs to
deploy, it goes back through the same core path (`materializeBundle` → `readModule` /
`PgpmMigrate`).

## Package layout

```
@pgpmjs/ast       (pgpm/ast)      — pure leaf: files/* parsers+writers, module AST
                                    (readModule/writeModule/serialize*), hashString
@pgpmjs/traverse  (pgpm/traverse) — structural walkers over deploy/revert/verify slots
                                    (forEachScript/mapScripts/zipScripts)
@pgpmjs/bundle    (pgpm/bundle)   — the artifact layer: create/io/verify/transpile/diff/
                                    reconcile, moduleFromBundle/materializeBundle
@pgpmjs/core      (pgpm/core)     — deploy engine (PgpmMigrate) + `applyBundle` glue
                                    (stays in core to avoid a bundle→core cycle);
                                    re-exports ast for compatibility
```

## Three ways to understand it

- **CEO:** Pick up a database's structure and security rules, seal them in a
  tamper-evident box, ship it anywhere, and be certain what arrives is exactly what was
  sent. The shipping container for databases — the unit behind spinning up, forking, and
  moving environments in minutes instead of weeks.
- **Product:** A portable, versioned artifact for a migration — "a Docker image, but for
  schema + security fixtures." One fingerprinted file, giving *integrity* (proof it wasn't
  altered in transit), *identity/caching* (two migrations are the same iff their
  fingerprints match), and *provenance* (where it came from). It is the unit the
  export / apply / transpile / fork features pass around.
- **Engineer:** `MigrationBundle` is a JSON-serializable snapshot of a pgpm module's AST
  (`{ manifest, plan, control, changes[] }`, each change carrying raw deploy/revert/verify
  SQL), built by composing the existing parsers (`readModule`) then flattening
  (`createBundle`) — pure, no I/O. Integrity is a shallow Merkle tree; `createdWith` /
  `provenance` are excluded from the digest so lineage never perturbs content addressing.

## The two layers

### 1. `PgpmModuleAst` — the module AST (`@pgpmjs/ast`, `pgpm/ast/src/module/`)

The typed, in-memory representation of a pgpm module. `readModule` **composes the existing
low-level tooling** (`parsePlanFile`, `parseControlFile`, `parsePgpmHeader`, `readScript`)
— it re-implements no parsing. Every leaf retains its byte-exact source, so `writeModule`
reproduces the module losslessly.

```ts
import { readModule, writeModule, serializePlan, serializeScript, verifyModuleRoundTrip }
  from '@pgpmjs/ast/module';   // also re-exported from '@pgpmjs/core'

const mod = readModule('/path/to/module');   // dir  -> PgpmModuleAst  (parse)
writeModule(mod, { outDir: '/out' });         // AST  -> dir           (deparse; lossless)
writeModule(mod, { outDir: '/out', fromRaw: false }); // re-serialize structured model
const issues = verifyModuleRoundTrip('/path/to/module'); // [] means byte-exact round-trip
```

- `changes` follow `pgpm.plan` order; each eagerly parses deploy/revert/verify (missing = `null`).
- SQL bodies stay **text** — the literal SQL AST (pgsql-parser / pgsql-deparser) is a
  separate layer callers apply during transpile.

### 2. `MigrationBundle` — the artifact (`@pgpmjs/bundle`, `pgpm/bundle/src/`)

A content-addressed, serializable snapshot of the AST.

```ts
interface MigrationBundle {
  manifest: BundleManifest;                 // formatVersion, name, changeCount,
                                            // deployOrder, digest, provenance?
  plan: string;                             // pgpm.plan, byte-exact
  control: { fileName: string; content: string } | null;
  changes: BundleChange[];                  // in deploy order
}
// BundleChange: { name, dependencies[], deploy|revert|verify: BundleScript|null, digest }
// BundleScript: { kind, sql, digest }      // digest = sha256(sql)
```

## Integrity model — a shallow Merkle tree

```
bundleDigest  = H( plan ‖ control ‖ [changeDigest_1 … changeDigest_n] )   (order-sensitive)
  changeDigest = H( name ‖ deployDigest ‖ revertDigest ‖ verifyDigest )   (missing = empty slot)
    scriptDigest = H( sql bytes )
```

- Leaves are individual deploy/revert/verify SQL blobs; per-change nodes; root is the
  manifest digest. A one-byte change flips its leaf → its change node → the root, and
  `verifyBundle` localizes **which** script/change mismatched.
- **Order is significant** (deploy order is part of the root) because for migrations
  sequence *is* semantics.
- `createdWith` (tool id) and `provenance` (lineage: source metaschema rev, namespace
  mapping, profile) live in the manifest but are **excluded** from the digest — the same
  intent hashes identically regardless of tool version, while lineage is still carried for
  audit.

## API reference (merged surface)

| Function | Purpose |
|----------|---------|
| `bundleFromModule(dir, opts?)` | `readModule` → `createBundle` from a directory |
| `createBundle(moduleAst, opts?)` | Build a bundle from an AST — pure, no I/O |
| `writeBundleFile(bundle, path)` / `readBundleFile(path)` | JSON artifact on the wire |
| `moduleFromBundle(bundle, dir?)` | Bundle → `PgpmModuleAst` in memory (inverse of `createBundle`) |
| `materializeBundle(bundle, outDir)` | Bundle → real deployable pgpm module (= `moduleFromBundle` → `writeModule`) |
| `verifyBundle(bundle): BundleIssue[]` | Recompute all digests; localize any mismatch |
| `transpileBundle(bundle, opts?)` | Rewrite into a new namespace; fresh digests + lineage |
| `computeChangeDigest` / `computeBundleDigest` | The digest primitives |
| `BUNDLE_FORMAT_VERSION`, `BUNDLE_FILE_NAME` | Format constants |

`CreateBundleOptions`: `{ createdWith?, provenance? }` (both excluded from the digest).

### `transpileBundle` — namespace transpiler

Rewrites a bundle into a new namespace, producing a fresh content-addressed bundle. Pure
and deterministic. Composes the existing rename primitives for the mechanical work and
**defers SQL-body rewriting to the caller** (core stays parser-agnostic, exactly like
`rebundle`'s `categoryOf`):

```ts
transpileBundle(bundle, {
  renameChange: (name) => name.replace('schemas/app/', 'schemas/tenant/'),
  // AST-level remap (schema names, FQ refs, RLS/FK targets, fn bodies) — caller supplies,
  // e.g. via constructive-db transform-schemas (pgsql-parser / pgsql-deparser):
  // Real driver: constructive-db transform-schemas `makeSchemaTranspiler({ schemaMap })`
  // returns { renameChange, transformScript } from one schema map:
  transformScript: (sql, ctx) => rewriteNamespace(sql, ctx),
  transformControl: (content) => content,     // control `requires` are extension deps, left alone by default
});
```

- Plan change-lines + dependency refs and each script's `-- Deploy` / `-- requires:`
  header are rewritten for you; only SQL statement bodies are the caller's concern.
- `renameChange` is validated as a bijection over touched changes (no collisions, no
  rename onto an untouched existing change).
- Records `provenance.sourceBundleDigest` for lineage.

## Common recipes

```ts
// Export a module to a portable artifact
const bundle = bundleFromModule('/path/to/module', { provenance: { sourceRev: 'abc123' } });
writeBundleFile(bundle, 'pgpm-bundle.json');

// Receive + verify integrity before trusting it
const received = readBundleFile('pgpm-bundle.json');
const issues = verifyBundle(received);
if (issues.length) throw new Error(`bundle integrity: ${issues.map(i => i.kind).join(', ')}`);

// Materialize back to a deployable module (then deploy via PgpmMigrate as usual)
materializeBundle(received, '/tmp/deployable-module');
```

## Design rules / gotchas

- **Additive & reuse-first.** The bundle layer never duplicates plan/header/control
  parsing — it composes `readModule`. If you need to write a module back, prefer
  `writeModule` / `serializePlan` / `serializeScript`.
- **Digests exclude `createdWith`/`provenance`** — never fold tool version or lineage into
  a content digest.
- **SQL bodies are text at this layer.** Do not parse/deparse SQL inside `pgpm/core`;
  supply a `transformScript` from the caller (e.g. constructive-db `transform-schemas`).
- **Deploy order is part of the identity** — reordering changes changes the bundle digest.
- Deterministic & pure: `createBundle` / `transpileBundle` / `verifyBundle` / `diff` do no
  I/O and no clock reads, so identical inputs always hash identically.

## Where this fits (cloud functions)

The bundle is the substrate for the schema-plane cloud functions: `exportMigrationBundle`
(3), `applyMigrationBundle` (4), `transpileMigrationBundle` (18), `applyTranspiledMigrationBundle`
(19), and feeds drift/reconcile (9). Additional bundle operations — `applyBundle`
(dry-run / integrity+namespace gate / atomic / timeout over `PgpmMigrate`), `diffBundles`,
and `reconcilePlan` — extend this same artifact; check `pgpm/bundle/src/` (and
`pgpm/core/src/bundle/apply.ts` for `applyBundle`) for the currently exported surface.
