/**
 * Dynamic storage-surface types.
 *
 * These mirror the `_meta` storage payload emitted by graphile-meta, which in
 * turn derives from the same registry facts (files→buckets FK pairing,
 * inflection) the presigned-url plugin emits the schema from. A client that
 * consumes these never guesses a GraphQL name.
 */

/** The GraphQL upload surface of a storage plane, as reported by `_meta`. */
export interface StorageUploadSurface {
  /** Root mutation field for single-file upload (e.g. `uploadAppFile`) */
  mutation: string;
  /** Input type of the single upload mutation (e.g. `UploadAppFileInput`) */
  inputType: string;
  /** Payload type of the single upload mutation */
  payloadType: string;
  /** Root mutation field for bulk upload */
  bulkMutation: string;
  /** Input type of the bulk upload mutation */
  bulkInputType: string;
  /** Payload type of the bulk upload mutation */
  bulkPayloadType: string;
  /** Per-file input type inside the bulk input */
  bulkFileInputType: string;
  /** Per-file payload type inside the bulk payload */
  bulkFilePayloadType: string;
  /** Whether the upload input requires `ownerId` (entity-keyed plane) */
  requiresOwnerId: boolean;
}

/** The pg identity of a `_meta` table entry backing a storage plane side. */
export interface StorageTableRef {
  /** Final GraphQL type name */
  name: string;
  /** PostgreSQL table name */
  tableName: string;
  /** PostgreSQL schema name */
  schemaName: string;
}

/** One storage plane: a paired files/buckets table and its GraphQL surface. */
export interface StorageSurface {
  /** GraphQL type name of the plane's files table */
  filesType: string;
  /** GraphQL type name of the plane's buckets table */
  bucketsType: string;
  /** The files table's `_meta` identity */
  filesTable: StorageTableRef;
  /** The buckets table's `_meta` identity (null when the buckets table is not exposed) */
  bucketsTable: StorageTableRef | null;
  /** Root query field for a single files row by primary key (from `_meta` query.one) */
  filesNodeField: string | null;
  /** Computed download-URL field on the files type */
  downloadUrlField: string | null;
  /** The plane's GraphQL upload surface */
  upload: StorageUploadSurface;
}

/**
 * Selects one storage plane by semantic coordinates. All provided fields must
 * match exactly; the lookup throws when nothing (or more than one plane)
 * matches.
 */
export interface StorageSurfaceSelector {
  /** PostgreSQL table name of the files table (e.g. `files`, `app_files`) */
  filesTable?: string;
  /** PostgreSQL schema name of the files table */
  schemaName?: string;
  /** GraphQL type name of the files table (e.g. `AppFile`) */
  filesType?: string;
}
