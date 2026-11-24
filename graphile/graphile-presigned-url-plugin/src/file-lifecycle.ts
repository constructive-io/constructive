/**
 * Confirmed bytes remain downloadable after their file is superseded.
 */
const DOWNLOADABLE_FILE_STATUSES = ['uploaded', 'processed', 'superseded'];

export function isDownloadableFileRow(row: { status?: string | null }): boolean {
  return DOWNLOADABLE_FILE_STATUSES.includes(row.status as string);
}
