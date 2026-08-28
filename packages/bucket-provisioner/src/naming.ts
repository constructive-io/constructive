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
 * Readable budgets for a name minted from a bucket's own identity.
 *
 * Each component gets its own budget rather than sharing one prefix budget, so
 * a long scope cannot eat the database label (or the label the key) — every
 * component keeps the room it was given, and the digest below covers whatever
 * truncation drops.
 */
const SCOPE_BUDGET = 12;
/**
 * How many characters of the owning database's id the readable head carries:
 * the first group of a UUID, enough to recognise a tenant in a bucket listing.
 */
const DATABASE_LABEL_LENGTH = 8;
const IDENTITY_KEY_BUDGET =
  MAX_BUCKET_NAME_LENGTH -
  IDENTITY_DIGEST_LENGTH -
  SCOPE_BUDGET -
  DATABASE_LABEL_LENGTH -
  3;

/** What a physical bucket name is derived from: the bucket row's own identity. */
export interface PhysicalBucketIdentity {
  /** The scope the bucket row lives at (`platform`, `database`, an entity scope). */
  scope: string;
  /** The database that owns the bucket row. */
  databaseId: string;
  /** The bucket's logical key, as declared on the row. */
  bucketKey: string;
}

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

/** A readable component: sanitized, truncated to its own budget, hyphen-free at the edges. */
function readableComponent(value: string, budget: number): string {
  return sanitizeBucketNameComponent(value).slice(0, budget).replace(/-+$/, '');
}

/**
 * Assemble a bounded, S3-legal name from readable components and the untruncated
 * identity they were derived from.
 *
 * The digest is taken over the identity rather than over what survived
 * truncation, so two buckets whose components agree only past their budgets
 * still get distinct names. Nothing here reads the clock or a counter, so a
 * given identity always mints the same name.
 */
function assembleBucketName(
  readable: readonly string[],
  identity: string,
  describeIdentity: string
): string {
  const digest = createHash('sha256')
    .update(identity)
    .digest('hex')
    .slice(0, IDENTITY_DIGEST_LENGTH);

  const name = [...readable, digest].filter((part) => part.length > 0).join('-');

  // The digest alone already satisfies both bounds, so this is only reachable
  // when every readable component sanitizes away to nothing.
  if (name.length < MIN_BUCKET_NAME_LENGTH || name.length > MAX_BUCKET_NAME_LENGTH) {
    throw new Error(
      `[bucket-provisioner] Cannot mint a legal S3 bucket name for ${describeIdentity}: got "${name}"`,
    );
  }

  return name;
}

/**
 * The physical name a bucket gets from its own identity:
 * `{scope}-{database label}-{bucketKey}-{digest}`
 * (e.g. `database-028752cb-buildlogs-3f9c1a2b7e04`).
 *
 * This is the policy for a platform-provisioned bucket, and it takes no prefix
 * because there is no global bucket namespace to prefix into: a bucket belongs
 * to one database at one scope, and that is what its name should say. Callers
 * derive names from here rather than composing a prefix of their own, so the
 * policy can change in one place — and an already-provisioned bucket never
 * consults it at all, since the row's recorded `physical_name` is authoritative.
 *
 * The scope is part of the digested identity untruncated, so two scopes of one
 * database that declare the same bucket key stay distinct even when their
 * readable labels truncate to the same thing.
 */
export function physicalBucketName(identity: PhysicalBucketIdentity): string {
  const { scope, databaseId, bucketKey } = identity;
  return assembleBucketName(
    [
      readableComponent(scope, SCOPE_BUDGET),
      readableComponent(databaseId, DATABASE_LABEL_LENGTH),
      readableComponent(bucketKey, IDENTITY_KEY_BUDGET),
    ],
    `${scope}/${databaseId}/${bucketKey}`,
    `key "${bucketKey}" at scope "${scope}"`,
  );
}

/**
 * The prefixed physical-bucket naming policy:
 * `{prefix}-{bucketKey}-{digest}` (e.g. `myapp-public-3f9c1a2b7e04`).
 *
 * For a deployment that names its own bucket namespace — a single-app
 * installation, or the presigned-upload (lazy) path meeting a bucket an app
 * configured. A platform-provisioned bucket uses {@link physicalBucketName}
 * instead, whose components come from the bucket row rather than from
 * deployment config.
 */
export function mintPhysicalBucketName(prefix: string, databaseId: string, bucketKey: string): string {
  return assembleBucketName(
    [
      readableComponent(prefix, PREFIX_BUDGET),
      readableComponent(bucketKey, BUCKET_KEY_BUDGET),
    ],
    `${prefix}/${databaseId}/${bucketKey}`,
    `key "${bucketKey}"`,
  );
}
