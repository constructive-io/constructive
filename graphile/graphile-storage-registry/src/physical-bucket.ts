/**
 * Record the authoritative physical bucket coordinate on a bucket row.
 *
 * The caller supplies the query runner so each storage lane can preserve its
 * own database-client and claims behavior.
 */
export async function recordPhysicalName(
  query: (query: { text: string; values: unknown[] }) => Promise<unknown>,
  bucketsQualifiedName: string,
  bucketId: string,
  physicalName: string,
): Promise<void> {
  await query({
    text: `UPDATE ${bucketsQualifiedName}
           SET physical_name = $1
           WHERE id = $2 AND physical_name IS NULL`,
    values: [physicalName, bucketId],
  });
}
