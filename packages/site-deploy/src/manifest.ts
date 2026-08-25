/**
 * Manifest construction: the site-specific half of a deploy.
 *
 * The bytes of a build are content-addressed and say nothing about how the
 * site is served; the manifest is what turns a bag of hashes into a site, by
 * mapping each logical path to the hash, content type and size the edge
 * serves for it.
 */

import { sha256 } from '@decryption/hashes/sha2';
import { bytesToHex } from '@decryption/hashes/utils';

import { contentTypeFor } from './content-type';
import type { DeployFile, ManifestEntry, ReleaseManifest } from './types';
import { DeployError } from './types';

/** Prefix every file's bytes are stored under, in the site's own bucket. */
export const CAS_PREFIX = 'cas/sha256/';

/** The one legal shape of a CAS key. */
export const CAS_KEY_PATTERN = /^cas\/sha256\/[0-9a-f]{64}$/;

/** The content-addressed bucket key holding the bytes with this hash. */
export function casKey(hash: string): string {
  return `${CAS_PREFIX}${hash}`;
}

/** SHA-256 of some bytes, hex — the CAS address and the served ETag. */
export function hashBytes(bytes: Uint8Array): string {
  return bytesToHex(sha256(bytes));
}

/**
 * Normalize a logical path to the form the gateway looks up.
 *
 * Windows separators become `/` and a leading `./` or `/` is dropped, so the
 * same build deploys identically from any OS. Anything that would escape the
 * site root or collide with the CAS namespace is a hard error — a silently
 * dropped file is a silently broken site.
 */
export function normalizePath(path: string): string {
  const normalized = path.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '');
  if (!normalized) {
    throw new DeployError('INVALID_PATH', `Empty logical path (from "${path}")`);
  }
  if (normalized.split('/').some((segment) => segment === '..' || segment === '.')) {
    throw new DeployError(
      'INVALID_PATH',
      `Logical path must not contain "." or ".." segments: "${path}"`,
    );
  }
  if (normalized.startsWith(CAS_PREFIX)) {
    throw new DeployError(
      'INVALID_PATH',
      `Logical path must not start with "${CAS_PREFIX}" (that is the byte namespace): "${path}"`,
    );
  }
  return normalized;
}

/** A hashed file, ready to be uploaded and named in a manifest. */
export interface HashedFile {
  /** Normalized logical path. */
  path: string;
  /** Content-addressed bucket key for these bytes. */
  key: string;
  hash: string;
  contentType: string;
  size: number;
  bytes: Uint8Array;
}

/** Hash one file and resolve its content type. */
export function hashFile(
  file: DeployFile,
  contentTypes?: Record<string, string>,
): HashedFile {
  const path = normalizePath(file.path);
  const hash = hashBytes(file.bytes);
  return {
    path,
    key: casKey(hash),
    hash,
    contentType: file.contentType ?? contentTypeFor(path, contentTypes),
    size: file.bytes.byteLength,
    bytes: file.bytes,
  };
}

/**
 * Build the release manifest from hashed files.
 *
 * `file_count`/`total_bytes` are derived here rather than trusted from a
 * caller, so they can never disagree with `files`.
 */
export function buildManifest(files: Iterable<HashedFile>): ReleaseManifest {
  const entries: Record<string, ManifestEntry> = {};
  let totalBytes = 0;
  let count = 0;
  for (const file of files) {
    if (entries[file.path]) {
      throw new DeployError('INVALID_PATH', `Duplicate logical path: "${file.path}"`);
    }
    entries[file.path] = {
      hash: file.hash,
      content_type: file.contentType,
      size: file.size,
    };
    totalBytes += file.size;
    count += 1;
  }
  if (count === 0) {
    throw new DeployError('EMPTY_SOURCE', 'Refusing to release an empty manifest');
  }
  return { files: entries, file_count: count, total_bytes: totalBytes };
}

/** Whether two manifests would serve byte-identical sites. */
export function manifestsEqual(a: ReleaseManifest, b: ReleaseManifest): boolean {
  const aPaths = Object.keys(a.files);
  const bPaths = Object.keys(b.files);
  if (aPaths.length !== bPaths.length) return false;
  return aPaths.every((path) => {
    const left = a.files[path];
    const right = b.files[path];
    return (
      right !== undefined &&
      left.hash === right.hash &&
      left.content_type === right.content_type &&
      left.size === right.size
    );
  });
}
