import type { TableMeta } from './types';

/**
 * Per-build table metadata, keyed by the PostGraphile `build` object.
 *
 * The server constructs multiple PostGraphile schemas concurrently in a single
 * process, so the `init` and `GraphQLObjectType_fields` hooks of different
 * builds interleave. Keying the collected metadata on the build object (instead
 * of a single shared array) guarantees each schema's `_meta` field serves its
 * OWN tables and never bleeds another concurrent build's data.
 *
 * A WeakMap is used (rather than a property on the build) because graphile-build
 * freezes the build object before the `init` hook runs, so it cannot be mutated
 * with an own property. The WeakMap also lets entries be garbage-collected once
 * a build is discarded.
 */
const tablesMetaByBuild = new WeakMap<object, TableMeta[]>();

export function setTablesMetaForBuild(build: object, tablesMeta: TableMeta[]): void {
  tablesMetaByBuild.set(build, tablesMeta);
}

export function getTablesMetaForBuild(build: object): TableMeta[] {
  return tablesMetaByBuild.get(build) ?? [];
}

/**
 * Flat "last build wins" mirror of the most recently collected table metadata.
 *
 * Retained ONLY for out-of-process codegen consumers — graphile-schema's
 * `buildIntrospectionJSON` and graphql/codegen's `DatabaseSchemaSource` — which
 * read this (re-exported as `_cachedTablesMeta`) as a side-effect AFTER a single
 * `buildSchemaSDL()` call and have no reference to the `build` object. Those
 * paths build one schema at a time, so last-write-wins is safe for them.
 *
 * Do NOT read this from the concurrent schema-serving path (the `_meta` field):
 * use getTablesMetaForBuild(build) instead, or concurrent builds will bleed.
 */
export let cachedTablesMeta: TableMeta[] = [];

export function getCachedTablesMeta(): TableMeta[] {
  return cachedTablesMeta;
}

export function setCachedTablesMeta(tablesMeta: TableMeta[]): void {
  cachedTablesMeta = tablesMeta;
}
