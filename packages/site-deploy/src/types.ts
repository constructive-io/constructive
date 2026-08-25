/**
 * Types for the site deploy pipeline.
 *
 * A deploy is bytes plus one manifest: every file's bytes live in the site's
 * bucket at `cas/sha256/<hash>`, and one `siteRelease` row maps logical paths
 * to those hashes. Writing that row commits it into the site's own merkle
 * store, so the returned commit id *is* the release id.
 */

/**
 * Executes a GraphQL document and returns its `data`, throwing on GraphQL
 * errors. The only integration point with a GraphQL client — works with the
 * generated SDK, urql, Apollo or plain fetch.
 */
export type GraphQLExecutor = (
  query: string,
  variables: Record<string, unknown>,
) => Promise<Record<string, unknown>>;

/** One file of a build, as the caller hands it over. */
export interface DeployFile {
  /** Logical path served by the site, POSIX-relative (`assets/app.js`). */
  path: string;
  /** The file's bytes. */
  bytes: Uint8Array;
  /** MIME type; inferred from the extension when omitted. */
  contentType?: string;
}

/** A build to deploy: a directory path (Node) or the files themselves. */
export type DeploySource =
  | string
  | Iterable<DeployFile>
  | AsyncIterable<DeployFile>;

/** One manifest entry: where the bytes are and how to serve them. */
export interface ManifestEntry {
  /** SHA-256 of the bytes, hex — the CAS address and the served ETag. */
  hash: string;
  content_type: string;
  size: number;
}

/** The release manifest, exactly as the gateway reads it. */
export interface ReleaseManifest {
  files: Record<string, ManifestEntry>;
  file_count: number;
  total_bytes: number;
}

/**
 * GraphQL field names of one scope's deploy surface.
 *
 * Every name is generated per scope: unprefixed for the tenant (`database`)
 * scope, `platform`-prefixed for the self-hosted lane. Override individual
 * names when a plane's inflection differs.
 */
export interface SiteDeployNames {
  /** Bulk presigned-upload mutation, e.g. `uploadFiles`. */
  bulkUploadMutation: string;
  /** Site release collection query, e.g. `siteReleases`. */
  releasesQuery: string;
  /** Create mutation for the release row, e.g. `createSiteRelease`. */
  createRelease: string;
  /** Input field holding the new row, e.g. `siteRelease`. */
  releaseInputField: string;
  /** Update mutation for the release row, e.g. `updateSiteRelease`. */
  updateRelease: string;
  /** Patch field on the update input, e.g. `siteReleasePatch`. */
  releasePatchField: string;
  /** Payload field holding the row, e.g. `siteRelease`. */
  releasePayloadField: string;
  /** Site update mutation, e.g. `updateSite`. */
  updateSite: string;
  /** Patch field on the site update input, e.g. `sitePatch`. */
  sitePatchField: string;
  /** Payload field holding the site, e.g. `site`. */
  sitePayloadField: string;
  /** Preview provisioning mutation, e.g. `provisionSitePreview`. */
  provisionPreview: string;
  /** Preview ref move mutation, e.g. `setSitePreview`. */
  setPreview: string;
}

/** Progress events, in the order a deploy emits them. */
export type DeployProgress =
  | { type: 'hashed'; path: string; hash: string; size: number; index: number }
  | {
      type: 'diffed';
      files: number;
      toUpload: number;
      skipped: number;
      bytesToUpload: number;
    }
  | { type: 'uploaded'; path: string; key: string; size: number; done: number; total: number }
  | { type: 'manifest'; commitId: string; storeId: string; created: boolean }
  | { type: 'unchanged'; commitId: string }
  | { type: 'published'; commitId: string }
  | { type: 'preview'; name: string; commitId: string; url: string | null };

/** PUT bytes to a presigned URL. Injectable so tests need no network. */
export type PutObject = (
  url: string,
  body: Uint8Array,
  contentType: string,
  signal?: AbortSignal,
) => Promise<void>;

export interface DeploySiteOptions {
  /** Executor for the tenant API target (releases, sites, previews). */
  api: GraphQLExecutor;
  /** Executor for the storage target. Defaults to `api`. */
  storage?: GraphQLExecutor;
  /** The site to deploy to. */
  siteId: string;
  /**
   * Database that owns the release row. Required on the first deploy of a
   * site at `database` scope, where the column is NOT NULL.
   */
  databaseId?: string;
  /** Bucket key of the site's bucket (`allow_custom_keys` must be on). */
  bucketKey: string;
  /** The build: a directory path, or the files themselves. */
  source: DeploySource;
  /** Which generated surface to talk to. Defaults to `database`. */
  scope?: 'database' | 'platform';
  /** Override individual generated field names. */
  names?: Partial<SiteDeployNames>;
  /** Move `site.activeCommitId` to the new release when it lands. */
  publish?: boolean;
  /** Also point `preview/<name>` at the new release. */
  preview?: string;
  /** Apex for a newly provisioned preview hostname. */
  previewApex?: string;
  /** Parallel PUTs. Defaults to 8. */
  concurrency?: number;
  /** Files per upload mutation. Defaults to 100 (the server's batch cap). */
  batchSize?: number;
  /** Retries per PUT on a network/5xx failure. Defaults to 2. */
  retries?: number;
  /** Return the live release untouched when the tree already matches it. */
  skipIfUnchanged?: boolean;
  /** Hash and diff only: upload nothing, write no manifest. */
  dryRun?: boolean;
  /** Skip paths — receives the logical path. */
  ignore?: (path: string) => boolean;
  /** Extra or overriding extension → MIME mappings (keys without the dot). */
  contentTypes?: Record<string, string>;
  /** Progress callback. */
  onProgress?: (event: DeployProgress) => void;
  /** Cancellation. */
  signal?: AbortSignal;
  /** PUT implementation. Defaults to a presigned fetch PUT. */
  putObject?: PutObject;
}

export interface DeploySiteResult {
  /** The release commit — the immutable id of this deploy. */
  commitId: string;
  /** Merkle store holding the site's release history. */
  storeId: string;
  /** The `siteRelease` row id. */
  releaseId: string;
  /** The manifest that was committed. */
  manifest: ReleaseManifest;
  /** Files in the manifest. */
  files: number;
  /** Files whose bytes were PUT. */
  uploaded: number;
  /** Files the server already had. */
  skipped: number;
  /** Bytes actually PUT. */
  bytesUploaded: number;
  /** Whether `site.activeCommitId` now points at this release. */
  published: boolean;
  /** Preview hostname, when a preview was provisioned with an apex. */
  previewUrl: string | null;
  /** True when `skipIfUnchanged` matched and nothing was written. */
  unchanged: boolean;
}

export type DeployErrorCode =
  | 'ABORTED'
  | 'EMPTY_SOURCE'
  | 'GRAPHQL_ERROR'
  | 'INVALID_PATH'
  | 'INVALID_PREVIEW_NAME'
  | 'KEY_MISMATCH'
  | 'MISSING_DATABASE_ID'
  | 'PREVIEW_FAILED'
  | 'PUBLISH_FAILED'
  | 'RELEASE_NOT_VERSIONED'
  | 'UPLOAD_FAILED';

/**
 * A deploy failure. Never swallowed and never partially reported: if this
 * throws before the manifest write, production is untouched.
 */
export class DeployError extends Error {
  readonly code: DeployErrorCode;
  readonly cause?: unknown;

  constructor(code: DeployErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'DeployError';
    this.code = code;
    this.cause = cause;
  }
}
