/**
 * Registry-derived storage plane discovery.
 *
 * A storage plane is a `@storageFiles` table and the `@storageBuckets` table it
 * writes into. The pairing fact is the files table's foreign key to the buckets
 * table — a relation the Graphile registry already carries — so it is read from
 * `pgRegistry.pgRelations`, never derived from table names. Physical naming
 * (`app_files`/`app_buckets` vs unprefixed `files`/`buckets`) is a rendering
 * choice and carries no meaning here.
 *
 * A `@storageFiles` codec that cannot be paired through a real FK relation is a
 * provisioning bug, and discovery throws at schema build rather than silently
 * emitting a schema with no upload surface for that plane.
 */

/** The attributes shape shared by pg codecs. */
export interface StorageCodecAttributes {
  [attributeName: string]: unknown;
}

/**
 * The slice of a Graphile pg codec that storage discovery reads. Structural on
 * purpose: callers pass real codecs from `build.input.pgRegistry`, and this
 * package stays free of graphile-build peer dependencies.
 */
export interface StorageCodec {
  name: string;
  attributes?: StorageCodecAttributes;
  extensions?: {
    pg?: { schemaName?: string; name?: string };
    tags?: { storageFiles?: unknown; storageBuckets?: unknown; [tag: string]: unknown };
  };
}

/** The slice of a registry relation entry that storage discovery reads. */
export interface StorageCodecRelation {
  isReferencee?: boolean;
  localAttributes: readonly string[];
  remoteAttributes: readonly string[];
  remoteResource?: { codec?: StorageCodec };
}

/** The slice of `build.input.pgRegistry` that storage discovery reads. */
export interface StoragePgRegistry {
  pgCodecs: Record<string, StorageCodec>;
  pgRelations: Record<string, Record<string, StorageCodecRelation>>;
}

/**
 * A discovered storage plane: the files codec, the buckets codec its FK names,
 * and the facts a plugin needs to shape the plane's GraphQL surface.
 */
export interface StoragePlanePair {
  filesCodec: StorageCodec;
  bucketsCodec: StorageCodec;
  /** Registry name of the FK relation on the files codec (e.g. `bucketsByMyBucketId`). */
  relationName: string;
  /** FK attribute(s) on the files table referencing the buckets table (e.g. `['bucket_id']`). */
  fkAttributes: string[];
  /**
   * Whether the plane is entity-keyed: the buckets table carries an `owner_id`
   * attribute (a registry fact — never inferred from the plane's scope name).
   */
  hasOwnerId: boolean;
}

function hasTag(codec: StorageCodec, tag: 'storageFiles' | 'storageBuckets'): boolean {
  return !!codec.attributes && !!codec.extensions?.tags?.[tag];
}

function codecSqlName(codec: StorageCodec): string {
  const schema = codec.extensions?.pg?.schemaName;
  const table = codec.extensions?.pg?.name ?? codec.name;
  return schema ? `${schema}.${table}` : table;
}

/**
 * Pair one `@storageFiles` codec with its `@storageBuckets` codec through the
 * registry's FK relations.
 *
 * Reads the codec's forward relations (`isReferencee` false — the files table
 * holds the FK) and keeps those whose remote codec is tagged `@storageBuckets`.
 * Exactly one such relation must exist; zero or several is a malformed plane
 * and throws.
 */
export function pairStoragePlane(
  filesCodec: StorageCodec,
  pgRegistry: StoragePgRegistry,
): StoragePlanePair {
  const relations = pgRegistry.pgRelations[filesCodec.name] ?? {};

  const bucketRelations = Object.entries(relations).filter(
    ([, relation]) =>
      !relation.isReferencee &&
      relation.remoteResource?.codec &&
      hasTag(relation.remoteResource.codec, 'storageBuckets'),
  );

  if (bucketRelations.length === 0) {
    throw new Error(
      `STORAGE_PLANE_UNPAIRED: @storageFiles table ${codecSqlName(filesCodec)} has no ` +
      `foreign key to a @storageBuckets table in the registry. A files table must ` +
      `reference its buckets table; check the storage module's generated FK and the ` +
      `@storageBuckets smart tag on the buckets table.`,
    );
  }

  if (bucketRelations.length > 1) {
    const targets = bucketRelations
      .map(([, relation]) => codecSqlName(relation.remoteResource!.codec!))
      .join(', ');
    throw new Error(
      `STORAGE_PLANE_AMBIGUOUS: @storageFiles table ${codecSqlName(filesCodec)} has ` +
      `foreign keys to ${bucketRelations.length} @storageBuckets tables (${targets}); ` +
      `a files table must reference exactly one buckets table.`,
    );
  }

  const [relationName, relation] = bucketRelations[0];
  const bucketsCodec = relation.remoteResource!.codec!;

  return {
    filesCodec,
    bucketsCodec,
    relationName,
    fkAttributes: [...relation.localAttributes],
    hasOwnerId: !!bucketsCodec.attributes?.owner_id,
  };
}

/**
 * Discover every storage plane in the registry.
 *
 * Pairs each `@storageFiles` codec through {@link pairStoragePlane}, then
 * verifies no `@storageBuckets` codec was left unpaired — a buckets table with
 * no files table referencing it is the same provisioning bug from the other
 * side, and throws rather than being silently ignored.
 */
export function discoverStoragePlanes(pgRegistry: StoragePgRegistry): StoragePlanePair[] {
  const codecs = Object.values(pgRegistry.pgCodecs);
  const filesCodecs = codecs.filter((codec) => hasTag(codec, 'storageFiles'));
  const bucketsCodecs = codecs.filter((codec) => hasTag(codec, 'storageBuckets'));

  const pairs = filesCodecs.map((filesCodec) => pairStoragePlane(filesCodec, pgRegistry));

  const pairedBuckets = new Set(pairs.map((pair) => pair.bucketsCodec));
  const orphanBuckets = bucketsCodecs.filter((codec) => !pairedBuckets.has(codec));
  if (orphanBuckets.length > 0) {
    const names = orphanBuckets.map(codecSqlName).join(', ');
    throw new Error(
      `STORAGE_PLANE_UNPAIRED: @storageBuckets table(s) ${names} are referenced by no ` +
      `@storageFiles table. Every buckets table must be the FK target of exactly one ` +
      `files table; check the storage module's generated FK and the @storageFiles ` +
      `smart tag on the files table.`,
    );
  }

  return pairs;
}
