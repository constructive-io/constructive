/**
 * `@constructive-io/site-deploy` — deploy a static build as an immutable
 * Constructive release.
 *
 * ```ts
 * const result = await deploySite({
 *   api,
 *   siteId,
 *   databaseId,
 *   bucketKey: 'site-docs',
 *   source: './dist',
 *   publish: true,
 * });
 * ```
 *
 * The server owns versioning: writing the manifest commits it into the site's
 * merkle store, so `result.commitId` is the release id you publish, roll back
 * to, or point a preview ref at.
 */

export { contentTypeFor, DEFAULT_CONTENT_TYPE } from './content-type';
export { deploySite, publishCommit } from './deploy';
export { deployNames } from './documents';
export type { HashedFile } from './manifest';
export { buildManifest, CAS_KEY_PATTERN, CAS_PREFIX, casKey, hashBytes, manifestsEqual, normalizePath } from './manifest';
export type {
  DeployErrorCode,
  DeployFile,
  DeployProgress,
  DeploySiteOptions,
  DeploySiteResult,
  DeploySource,
  GraphQLExecutor,
  ManifestEntry,
  PutObject,
  ReleaseManifest,
  SiteDeployNames,
} from './types';
export { DeployError } from './types';
export { walkDirectory } from './walk';
