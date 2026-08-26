import { createHash } from 'crypto';

/** S3's hard ceiling on a bucket name. */
const MAX_BUCKET_NAME_LENGTH = 63;
/** S3's floor, which a degenerate prefix/key could otherwise fall under. */
const MIN_BUCKET_NAME_LENGTH = 3;
/** Hex characters of the identity digest kept as the uniqueness tail. */
const IDENTITY_DIGEST_LENGTH = 12;
/** Readable budget: how much of the name the prefix and key may each occupy. */
const PREFIX_BUDGET = 20;
const BUCKET_KEY_BUDGET = 63 - IDENTITY_DIGEST_LENGTH - PREFIX_BUDGET - 3;

/**
 * Reduce a component to the S3 bucket-name alphabet: lowercase, `[a-z0-9-]`,
 * with runs of separators collapsed and no leading or trailing hyphen.
 *
 * Dots are legal in a bucket name but deliberately dropped — a dotted name
 * cannot be used with virtual-hosted-style HTTPS, because the wildcard
 * certificate does not match a further label.
 */
function sanitizeBucketNameComponent(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * The single physical-bucket naming policy:
 * `{prefix}-{bucketKey}-{digest}` (e.g. `myapp-public-3f9c1a2b7e04`).
 *
 * Both the presigned-upload (lazy) path and the bucket-provisioner (eager) path
 * derive names from this one function, so a bucket's physical name is identical
 * regardless of which path mints it.
 *
 * The name is bounded and S3-legal by construction: the prefix and key are
 * sanitized to `[a-z0-9-]` and truncated to a readable budget, and the tail is
 * a digest of the *untruncated* identity — so two buckets whose keys agree only
 * past the truncation point, or the same key in two databases, still get distinct
 * names. Names remain stable for a given (prefix, databaseId, bucketKey) because
 * nothing here reads the clock or a counter; and an already-provisioned bucket
 * never consults this function at all, since `platform_buckets.physical_name` is
 * authoritative once recorded.
 */
export function mintPhysicalBucketName(prefix: string, databaseId: string, bucketKey: string): string {
  const identity = `${prefix}/${databaseId}/${bucketKey}`;
  const digest = createHash('sha256').update(identity).digest('hex').slice(0, IDENTITY_DIGEST_LENGTH);

  const safePrefix = sanitizeBucketNameComponent(prefix).slice(0, PREFIX_BUDGET).replace(/-+$/, '');
  const safeKey = sanitizeBucketNameComponent(bucketKey).slice(0, BUCKET_KEY_BUDGET).replace(/-+$/, '');

  const name = [safePrefix, safeKey, digest].filter((part) => part.length > 0).join('-');

  // The digest alone already satisfies both bounds, so this is only reachable
  // when both readable components sanitize away to nothing.
  if (name.length < MIN_BUCKET_NAME_LENGTH || name.length > MAX_BUCKET_NAME_LENGTH) {
    throw new Error(
      `[bucket-provisioner] Cannot mint a legal S3 bucket name for key "${bucketKey}": got "${name}"`,
    );
  }

  return name;
}
