/**
 * @pgpmjs/bundle: the portable, content-addressed migration artifact layer.
 *
 * A {@link MigrationBundle} is a deterministic snapshot of a pgpm module — plan,
 * control, ordered changes, and per-change/whole-bundle sha256 digests — with an
 * optional provenance manifest. It is the substrate for the `exportMigrationBundle`
 * / `applyMigrationBundle` / `transpileMigrationBundle` cloud functions: build one
 * from a module AST, transport or transform it, verify its digests, then
 * materialize it back into a deployable module.
 *
 * Pure layer (no database, no deploy engine). The deployment glue — `applyBundle`,
 * which drives `PgpmMigrate` — lives in `@pgpmjs/core`.
 */
export * from './create';
export * from './diff';
export * from './envelope';
export * from './io';
export * from './reconcile';
export * from './transpile';
export * from './types';
export * from './verify';
