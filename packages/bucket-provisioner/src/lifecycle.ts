/**
 * Lifecycle rule builders.
 *
 * Generates S3 lifecycle configurations for automatic object expiration.
 * Primarily used for temp buckets where uploads should be cleaned up
 * after a configurable period.
 */

import type { LifecycleRule } from './types';

/**
 * Build a lifecycle rule for temp bucket cleanup.
 *
 * Temp buckets hold staging uploads (files with status='pending' that
 * were never confirmed). This rule automatically deletes objects after
 * a set number of days, preventing storage cost accumulation from
 * abandoned uploads.
 *
 * @param expirationDays - Days after which objects expire (default: 1)
 * @param prefix - Key prefix to target (default: "" = entire bucket)
 */
export function buildTempCleanupRule(
  expirationDays: number = 1,
  prefix: string = '',
): LifecycleRule {
  return {
    id: 'temp-cleanup',
    prefix,
    expirationDays,
    enabled: true,
  };
}

/**
 * Build a lifecycle rule for incomplete multipart upload cleanup.
 *
 * Incomplete multipart uploads consume storage but serve no purpose.
 * This rule aborts them after a set number of days.
 *
 * @param expirationDays - Days after which incomplete uploads are aborted (default: 1)
 */
export function buildAbortIncompleteMultipartRule(
  expirationDays: number = 1,
): LifecycleRule {
  return {
    id: 'abort-incomplete-multipart',
    prefix: '',
    expirationDays,
    enabled: true,
  };
}
