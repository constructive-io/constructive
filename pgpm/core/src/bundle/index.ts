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
export * from './apply';
export * from './create';
export * from './io';
export * from './transpile';
export * from './types';
export * from './verify';
