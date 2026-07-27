/**
 * pgpm migration bundles: the portable, content-addressed artifact layer.
 *
 * A {@link MigrationBundle} is a deterministic snapshot of a pgpm module — plan,
 * control, ordered changes, and per-change/whole-bundle sha256 digests — with an
 * optional provenance manifest. It is the substrate for the `exportMigrationBundle`
 * / `applyMigrationBundle` / `transpileMigrationBundle` cloud functions: build one
 * from a module AST, transport or transform it, verify its digests, then
 * materialize it back into a deployable module.
 */
// Pure artifact layer moved to @pgpmjs/bundle; re-exported here so existing
// `@pgpmjs/core` consumers keep importing the whole bundle surface unchanged.
export * from '@pgpmjs/bundle';
// applyBundle stays in core: it drives PgpmMigrate (the deploy engine).
export * from './apply';
// applyEnvelope: schema apply + data/fixtures part replay for a BundleEnvelope.
export * from './apply-envelope';
