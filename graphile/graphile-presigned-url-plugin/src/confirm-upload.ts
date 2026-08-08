/**
 * The byte-validating half of the presigned lane's confirmation.
 *
 * A presigned upload's bytes never pass through the server: the client PUTs them
 * straight to S3, so at the moment the files row is written the only statements
 * about the file are the client's own. `requested` is exactly that state — a
 * claim — and the row must not reach `uploaded` until the bytes behind it have
 * been looked at, because every downstream processing step (image versions,
 * extraction, embeddings) fires on `uploaded` and would otherwise be handed
 * whatever the client chose to upload.
 *
 * So confirmation answers three questions in order, and each has a distinct
 * outcome on the row:
 *
 *   1. did the bytes arrive?          no  → `expired`  (the client walked away)
 *   2. are they the file they claim?   no  → `rejected` (and the object deleted)
 *   3. otherwise                           → `uploaded`
 *
 * The bytes are read with a ranged GET of the leading bytes, not downloaded: a
 * magic-byte signature is in the first few dozen bytes, so this costs the same
 * for a 2GB video as for an icon.
 *
 * This module is the decision, not the transition. The worker that owns the
 * `storage:confirm_upload` job applies it by calling the generated
 * `<files>_confirm_uploaded` / `_reject_file` / `_expire_file` functions — the
 * verdict is returned rather than executed so that the same rule can be applied
 * by any transport, and tested without a database.
 */

import { detectFromBuffer } from 'mime-bytes';
import { checkTypeAgreement } from 'mime-bytes';

import { readObjectPrefix } from './s3-signer';
import type { S3Config } from './types';

/**
 * How many leading bytes to read. Signatures are far shorter than this; the
 * margin covers formats whose signature sits at an offset (e.g. the `ftyp` box
 * of an MP4) and gives charset detection enough text to work with.
 */
export const CONFIRM_PREFIX_BYTES = 4096;

export interface ConfirmUploadInput {
  s3: S3Config;
  /** The object key the presigned PUT was signed for. */
  key: string;
  /** The MIME type the client declared when the row was created. */
  declaredMime: string;
  /** The filename recorded on the files row, if any. */
  filename?: string | null;
}

export type ConfirmUploadVerdict =
  | { outcome: 'uploaded'; detectedMime: string | null }
  | { outcome: 'rejected'; reason: string; detectedMime: string | null }
  | { outcome: 'expired'; reason: string };

/**
 * Decide what should happen to a `requested` files row, from its object's bytes.
 *
 * A missing object is `expired` rather than `rejected`: nothing was uploaded, so
 * there is nothing to reject, and the row's own retry/expiry budget governs how
 * long the client has left. An empty object, by contrast, *was* written and is
 * not a file.
 */
export async function confirmUploadedBytes(input: ConfirmUploadInput): Promise<ConfirmUploadVerdict> {
  const { s3, key, declaredMime, filename } = input;

  const prefix = await readObjectPrefix(s3, key, CONFIRM_PREFIX_BYTES);

  if (prefix === null) {
    return { outcome: 'expired', reason: `no object at key ${key}: the upload never arrived` };
  }
  if (prefix.length === 0) {
    return {
      outcome: 'rejected',
      reason: `object at key ${key} is empty; an upload must carry at least one byte`,
      detectedMime: null,
    };
  }

  const detected = await detectFromBuffer(prefix);
  const detectedMime = detected?.mimeType ?? null;

  const agreement = checkTypeAgreement({ filename, declaredMime, detectedMime });
  if (!agreement.ok) {
    return { outcome: 'rejected', reason: agreement.violation.message, detectedMime };
  }

  return { outcome: 'uploaded', detectedMime };
}
