/**
 * Server-side bucket resolution.
 *
 * Which bucket a write lands in belongs to the database, never to the client and
 * never to the server's environment: a client-chosen key means a different
 * bucket per tenant, and an env-level bucket name means storage that belongs to
 * no tenant at all. `function_resolution.resolve_default_bucket` is the one
 * place that answers it — a logical key when the field declares one, otherwise
 * the reserved default tag for the requested access ('default' / 'default-public').
 *
 * Zero matches and several matches both raise inside SQL, so there is nothing to
 * guess here: this module only carries the question in and the coordinate out.
 */

import { Logger } from '@pgpmjs/logger';

const log = new Logger('graphile-presigned-url:default-bucket');

/**
 * The resolved bucket coordinate.
 *
 * `physicalName` is the recorded S3 bucket name, or null when the logical
 * bucket has never been provisioned — the caller mints and records it then.
 */
export interface ResolvedBucketCoordinate {
  bucketId: string;
  resolvedKey: string;
  bucketType: 'public' | 'private' | 'temp';
  physicalName: string | null;
}

const RESOLVE_DEFAULT_BUCKET_QUERY = `
  SELECT bucket_id, resolved_key, bucket_type, physical_name
  FROM function_resolution.resolve_default_bucket($1, $2, $3, $4, $5)
`;

/**
 * Resolve the bucket a write should land in.
 *
 * @param scope - The storage module's scope ('app' for database-wide storage)
 * @param entityId - The owning entity row for an entity-scoped module, else null
 * @param publicAccess - Which reserved default tag to use when no key is named,
 *   and an assertion on the named bucket's type when one is
 * @param bucketKey - The field's declared logical key, or null for the default
 */
export async function resolveDefaultBucket(
  pgClient: { query: (opts: { text: string; values?: unknown[] }) => Promise<{ rows: unknown[] }> },
  databaseId: string,
  scope: string,
  entityId: string | null,
  publicAccess: boolean,
  bucketKey: string | null,
): Promise<ResolvedBucketCoordinate> {
  const result = await pgClient.query({
    text: RESOLVE_DEFAULT_BUCKET_QUERY,
    values: [databaseId, scope, entityId, publicAccess, bucketKey],
  });

  const row = result.rows[0] as {
    bucket_id: string;
    resolved_key: string;
    bucket_type: string;
    physical_name: string | null;
  } | undefined;

  if (!row) {
    // resolve_default_bucket raises on zero and on several matches, so an empty
    // result means the function did not run as declared rather than "no bucket".
    throw new Error(
      `STORAGE_DEFAULT_BUCKET_NO_ROW: resolve_default_bucket returned no row for ` +
      `database=${databaseId} scope=${scope} public=${publicAccess} key=${bucketKey ?? '<default tag>'}`,
    );
  }

  log.debug(
    `Resolved bucket ${row.resolved_key} (${row.bucket_type}) for database=${databaseId} scope=${scope}`,
  );

  return {
    bucketId: row.bucket_id,
    resolvedKey: row.resolved_key,
    bucketType: row.bucket_type as ResolvedBucketCoordinate['bucketType'],
    physicalName: row.physical_name,
  };
}
