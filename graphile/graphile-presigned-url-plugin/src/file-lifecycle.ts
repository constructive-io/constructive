/**
 * The statuses in which a files row stands for bytes a reader can actually GET.
 * A `requested` row is a claim, not an object — its presigned PUT may never have
 * run — and `rejected`/`expired` are settled failures.
 */
export const LIVE_FILE_STATUSES = ['uploaded', 'processed'];

/**
 * Whether a row is live: a dedup hit, and a row `downloadUrl` signs a URL for,
 * only once the bytes it names are in S3.
 *
 * The row is written before the PUT; the confirm-upload job moves it out of
 * `requested` only after inspecting the object, so its status is the answer.
 */
export function isLiveFileRow(row: { status?: string | null }): boolean {
  return LIVE_FILE_STATUSES.includes(row.status as string);
}
