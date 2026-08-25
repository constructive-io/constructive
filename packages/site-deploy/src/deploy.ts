/**
 * The deploy pipeline.
 *
 * Everything below the manifest is server-owned: writing the release row fires
 * the trigger that commits the manifest into the site's own merkle store, so
 * the commit id this returns *is* the release — history, time travel and
 * rollback are then pointer moves, not client bookkeeping.
 *
 * Ordering is the contract: bytes land before the manifest names them, and the
 * manifest lands before anything points at it. A failure anywhere leaves the
 * live site exactly as it was.
 */

import { diffCas, errorMessage, throwIfAborted, uploadMissing } from './cas-upload';
import {
  buildCreateReleaseMutation,
  buildProvisionPreviewMutation,
  buildPublishMutation,
  buildReleaseQuery,
  buildSetPreviewMutation,
  buildUpdateReleaseMutation,
  deployNames,
} from './documents';
import type { HashedFile } from './manifest';
import { buildManifest, hashFile, manifestsEqual } from './manifest';
import type {
  DeployFile,
  DeploySiteOptions,
  DeploySiteResult,
  DeploySource,
  GraphQLExecutor,
  ReleaseManifest,
  SiteDeployNames,
} from './types';
import { DeployError } from './types';
import { walkDirectory } from './walk';

/** Preview ref names become hostname labels, so they must be one. */
const PREVIEW_NAME_PATTERN = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

/** The existing release row of a site, if it has one. */
interface ExistingRelease {
  id: string;
  commitId: string | null;
  storeId: string | null;
  manifest: ReleaseManifest | null;
}

/**
 * Deploy a build as an immutable release.
 *
 * Hashes every file, uploads only the bytes the server does not already have,
 * writes one manifest — and optionally publishes it or points a preview ref at
 * it.
 */
export async function deploySite(options: DeploySiteOptions): Promise<DeploySiteResult> {
  const {
    api,
    storage = options.api,
    siteId,
    databaseId,
    bucketKey,
    scope = 'database',
    publish = false,
    preview,
    previewApex,
    concurrency = 8,
    batchSize = 100,
    retries = 2,
    skipIfUnchanged = false,
    dryRun = false,
    signal,
    onProgress,
  } = options;

  const names: SiteDeployNames = { ...deployNames(scope), ...options.names };
  if (preview !== undefined && !PREVIEW_NAME_PATTERN.test(preview)) {
    throw new DeployError(
      'INVALID_PREVIEW_NAME',
      `Preview name must be a lowercase DNS label: "${preview}"`,
    );
  }

  // 1. Hash the build. Content addressing means this is also the diff key.
  const files: HashedFile[] = [];
  let index = 0;
  for await (const file of iterateSource(options.source, options.ignore)) {
    throwIfAborted(signal);
    if (options.ignore?.(file.path)) continue;
    const hashed = hashFile(file, options.contentTypes);
    files.push(hashed);
    onProgress?.({
      type: 'hashed',
      path: hashed.path,
      hash: hashed.hash,
      size: hashed.size,
      index: index++,
    });
  }
  const manifest = buildManifest(files);

  // 2. The release row is UNIQUE per site, so the first deploy creates it and
  //    every later one patches it — the caller should not have to know which.
  const existing = await fetchExistingRelease(api, names, siteId);

  if (
    skipIfUnchanged &&
    existing?.commitId &&
    existing.storeId &&
    existing.manifest &&
    manifestsEqual(existing.manifest, manifest)
  ) {
    onProgress?.({ type: 'unchanged', commitId: existing.commitId });
    return {
      commitId: existing.commitId,
      storeId: existing.storeId,
      releaseId: existing.id,
      manifest,
      files: manifest.file_count,
      uploaded: 0,
      skipped: manifest.file_count,
      bytesUploaded: 0,
      published: false,
      previewUrl: null,
      unchanged: true,
    };
  }

  // 3. Register the bytes and learn which ones are missing.
  const uploadOptions = {
    storage,
    mutation: names.bulkUploadMutation,
    bucketKey,
    batchSize,
    concurrency,
    retries,
    putObject: options.putObject,
    signal,
  };
  const diff = await diffCas(files, uploadOptions);
  onProgress?.({
    type: 'diffed',
    files: manifest.file_count,
    toUpload: diff.missing.length,
    skipped: diff.deduplicated.length,
    bytesToUpload: diff.missing.reduce((sum, entry) => sum + entry.file.size, 0),
  });

  if (dryRun) {
    return {
      commitId: existing?.commitId ?? '',
      storeId: existing?.storeId ?? '',
      releaseId: existing?.id ?? '',
      manifest,
      files: manifest.file_count,
      uploaded: 0,
      skipped: diff.deduplicated.length,
      bytesUploaded: 0,
      published: false,
      previewUrl: null,
      unchanged: false,
    };
  }

  // 4. Upload. Any failure here throws, so the manifest is never written over
  //    bytes that are not there.
  let done = 0;
  const uploadResult = await uploadMissing(diff, {
    ...uploadOptions,
    onUploaded: (file) => {
      done += 1;
      onProgress?.({
        type: 'uploaded',
        path: file.path,
        key: file.key,
        size: file.size,
        done,
        total: diff.missing.length,
      });
    },
  });

  // 5. Write the manifest — this is the commit.
  const release = existing
    ? await updateRelease(api, names, existing.id, manifest)
    : await createRelease(api, names, siteId, databaseId, manifest);
  onProgress?.({
    type: 'manifest',
    commitId: release.commitId,
    storeId: release.storeId,
    created: !existing,
  });

  const result: DeploySiteResult = {
    commitId: release.commitId,
    storeId: release.storeId,
    releaseId: release.id,
    manifest,
    files: manifest.file_count,
    uploaded: uploadResult.uploaded,
    skipped: uploadResult.skipped,
    bytesUploaded: uploadResult.bytesUploaded,
    published: false,
    previewUrl: null,
    unchanged: false,
  };

  // 6. Point things at the commit. Separate steps: a failure here leaves a
  //    complete, retryable release rather than a half-published site.
  if (preview !== undefined) {
    result.previewUrl = await pointPreview(api, names, {
      siteId,
      name: preview,
      commitId: release.commitId,
      apex: previewApex,
    });
    onProgress?.({
      type: 'preview',
      name: preview,
      commitId: release.commitId,
      url: result.previewUrl,
    });
  }

  if (publish) {
    await publishCommit(api, names, siteId, release.commitId);
    result.published = true;
    onProgress?.({ type: 'published', commitId: release.commitId });
  }

  return result;
}

/** Move `site.activeCommitId` — the go-live and the rollback are one thing. */
export async function publishCommit(
  api: GraphQLExecutor,
  names: SiteDeployNames,
  siteId: string,
  commitId: string,
): Promise<void> {
  try {
    await api(buildPublishMutation(names), {
      input: { id: siteId, [names.sitePatchField]: { activeCommitId: commitId } },
    });
  } catch (err) {
    throw new DeployError(
      'PUBLISH_FAILED',
      `Release ${commitId} was written but publishing it failed: ${errorMessage(err)}`,
      err,
    );
  }
}

async function* iterateSource(
  source: DeploySource,
  ignore?: (path: string) => boolean,
): AsyncGenerator<DeployFile> {
  if (typeof source === 'string') {
    yield* walkDirectory(source, ignore);
    return;
  }
  if (Symbol.asyncIterator in source) {
    yield* source as AsyncIterable<DeployFile>;
    return;
  }
  yield* source as Iterable<DeployFile>;
}

async function fetchExistingRelease(
  api: GraphQLExecutor,
  names: SiteDeployNames,
  siteId: string,
): Promise<ExistingRelease | null> {
  const data = await api(buildReleaseQuery(names), { siteId });
  const connection = data[names.releasesQuery] as { nodes?: ExistingRelease[] } | null;
  return connection?.nodes?.[0] ?? null;
}

interface WrittenRelease {
  id: string;
  commitId: string;
  storeId: string;
}

async function createRelease(
  api: GraphQLExecutor,
  names: SiteDeployNames,
  siteId: string,
  databaseId: string | undefined,
  manifest: ReleaseManifest,
): Promise<WrittenRelease> {
  if (!databaseId) {
    throw new DeployError(
      'MISSING_DATABASE_ID',
      `Site ${siteId} has no release yet, so databaseId is required to create one`,
    );
  }
  const data = await api(buildCreateReleaseMutation(names), {
    input: {
      [names.releaseInputField]: { siteId, databaseId, manifest },
    },
  });
  return readWrittenRelease(data, names);
}

async function updateRelease(
  api: GraphQLExecutor,
  names: SiteDeployNames,
  releaseId: string,
  manifest: ReleaseManifest,
): Promise<WrittenRelease> {
  const data = await api(buildUpdateReleaseMutation(names), {
    input: {
      id: releaseId,
      [names.releasePatchField]: { manifest },
    },
  });
  return readWrittenRelease(data, names);
}

/**
 * Read back the versioning the trigger stamped on the row.
 *
 * A release without a commit is not a release: it cannot be published, rolled
 * back to, or previewed, so a missing id is a hard failure rather than a
 * result with empty strings in it.
 */
function readWrittenRelease(
  data: Record<string, unknown>,
  names: SiteDeployNames,
): WrittenRelease {
  const mutation = (data[names.createRelease] ?? data[names.updateRelease]) as
    | Record<string, unknown>
    | undefined;
  const row = mutation?.[names.releasePayloadField] as
    | { id?: string; commitId?: string; storeId?: string }
    | undefined;
  if (!row?.id || !row.commitId || !row.storeId) {
    throw new DeployError(
      'RELEASE_NOT_VERSIONED',
      'Release row came back without a commitId/storeId — the manifest was not committed',
    );
  }
  return { id: row.id, commitId: row.commitId, storeId: row.storeId };
}

async function pointPreview(
  api: GraphQLExecutor,
  names: SiteDeployNames,
  args: { siteId: string; name: string; commitId: string; apex?: string },
): Promise<string | null> {
  try {
    // With an apex, provision so the hostname and its route exist (idempotent
    // and it moves the ref too); without one, just move the ref.
    if (args.apex) {
      const data = await api(buildProvisionPreviewMutation(names), {
        input: {
          siteId: args.siteId,
          name: args.name,
          commitId: args.commitId,
          apex: args.apex,
        },
      });
      const payload = data[names.provisionPreview] as
        | { result?: { domain?: { hostname?: string } | null } | null }
        | null;
      const hostname = payload?.result?.domain?.hostname;
      return hostname ? `https://${hostname}` : null;
    }
    await api(buildSetPreviewMutation(names), {
      input: {
        targetSiteId: args.siteId,
        targetName: args.name,
        targetCommitId: args.commitId,
      },
    });
    return null;
  } catch (err) {
    throw new DeployError(
      'PREVIEW_FAILED',
      `Release ${args.commitId} was written but preview "${args.name}" could not be pointed at it: ${errorMessage(err)}`,
      err,
    );
  }
}
