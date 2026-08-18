import type { StorageModuleConfig } from './types';

/**
 * The statuses in which a files row stands for bytes a reader can actually GET.
 * A `requested` row is a claim, not an object — its presigned PUT may never have
 * run — and `rejected`/`expired` are settled failures.
 */
export const LIVE_FILE_STATUSES = ['uploaded', 'processed'];

/**
 * The `status` column, when the module has one, for splicing into a select list.
 */
export function statusSelectFragment(storageConfig: StorageModuleConfig): string {
  return storageConfig.hasConfirmUpload ? ', status' : '';
}

/**
 * Whether an existing row may be handed back as a dedup hit.
 *
 * Modules without the confirm-upload lifecycle have no `status` column, so there
 * is nothing to read and every row is presumed live, as before.
 */
export function isLiveFileRow(
  storageConfig: StorageModuleConfig,
  row: { status?: string }
): boolean {
  if (!storageConfig.hasConfirmUpload) return true;
  return LIVE_FILE_STATUSES.includes(row.status as string);
}
