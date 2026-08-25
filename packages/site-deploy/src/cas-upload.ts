/**
 * Content-addressed bulk upload.
 *
 * The generic pieces come from `@constructive-io/upload-client` (a presigned
 * PUT); what is added here is the part a static release needs: many files in
 * one round trip, explicit `cas/sha256/<hash>` keys, and skipping every file
 * the server already has. That skip is the whole incremental-deploy win — a
 * one-file change re-uploads one file however large the site is.
 */

import { putToPresignedUrl } from '@constructive-io/upload-client';

import { buildBulkUploadMutation } from './documents';
import type { HashedFile } from './manifest';
import { CAS_KEY_PATTERN } from './manifest';
import type { GraphQLExecutor, PutObject } from './types';
import { DeployError } from './types';

/** One entry of the bulk mutation's payload. */
interface BulkFilePayload {
  uploadUrl: string | null;
  fileId: string;
  key: string;
  deduplicated: boolean;
}

export interface UploadCasOptions {
  /** Executor for the storage target. */
  storage: GraphQLExecutor;
  /** Bulk upload mutation field name, e.g. `uploadFiles`. */
  mutation: string;
  /** Bucket key of the site's bucket. */
  bucketKey: string;
  /** Files per mutation call. */
  batchSize: number;
  /** Parallel PUTs. */
  concurrency: number;
  /** Retries per PUT. */
  retries: number;
  putObject?: PutObject;
  signal?: AbortSignal;
  onUploaded?: (file: HashedFile) => void;
}

export interface UploadCasResult {
  uploaded: number;
  skipped: number;
  bytesUploaded: number;
}

/** The bytes the server does not have yet, as told by the bulk mutation. */
export interface CasDiff {
  /** Files whose bytes must be PUT, paired with their presigned URL. */
  missing: { file: HashedFile; uploadUrl: string }[];
  /** Files the server already had. */
  deduplicated: HashedFile[];
}

/**
 * Register every file and learn which bytes are missing.
 *
 * Batched because the server caps files per call; one failed batch fails the
 * whole diff rather than leaving a half-registered release.
 */
export async function diffCas(
  files: HashedFile[],
  options: UploadCasOptions,
): Promise<CasDiff> {
  const mutation = buildBulkUploadMutation(options.mutation);
  const missing: CasDiff['missing'] = [];
  const deduplicated: HashedFile[] = [];

  for (let offset = 0; offset < files.length; offset += options.batchSize) {
    throwIfAborted(options.signal);
    const batch = files.slice(offset, offset + options.batchSize);
    const data = await options.storage(mutation, {
      input: {
        bucketKey: options.bucketKey,
        files: batch.map((file) => ({
          contentHash: file.hash,
          contentType: file.contentType,
          size: file.size,
          filename: file.path.slice(file.path.lastIndexOf('/') + 1),
          key: file.key,
        })),
      },
    });

    const payload = (data[options.mutation] ?? null) as { files?: BulkFilePayload[] } | null;
    const results = payload?.files;
    if (!results || results.length !== batch.length) {
      throw new DeployError(
        'UPLOAD_FAILED',
        `${options.mutation} returned ${results?.length ?? 0} results for ${batch.length} files`,
      );
    }

    results.forEach((result, index) => {
      const file = batch[index];
      // The server does not enforce the CAS key form yet, so a mismatch here
      // would publish a manifest pointing at bytes nobody can serve.
      if (result.key !== file.key || !CAS_KEY_PATTERN.test(result.key)) {
        throw new DeployError(
          'KEY_MISMATCH',
          `Expected key "${file.key}" for "${file.path}", server returned "${result.key}"`,
        );
      }
      if (result.deduplicated) {
        deduplicated.push(file);
        return;
      }
      if (!result.uploadUrl) {
        throw new DeployError(
          'UPLOAD_FAILED',
          `No upload URL for "${file.path}" and deduplicated=false`,
        );
      }
      missing.push({ file, uploadUrl: result.uploadUrl });
    });
  }

  return { missing, deduplicated };
}

/**
 * PUT the missing bytes.
 *
 * Any file that cannot be uploaded after its retries aborts the deploy: a
 * manifest written over a partial upload is a site with holes in it.
 */
export async function uploadMissing(
  diff: CasDiff,
  options: UploadCasOptions,
): Promise<UploadCasResult> {
  const put = options.putObject ?? defaultPut;
  let bytesUploaded = 0;
  let next = 0;

  const worker = async (): Promise<void> => {
    for (;;) {
      throwIfAborted(options.signal);
      const index = next++;
      if (index >= diff.missing.length) return;
      const { file, uploadUrl } = diff.missing[index];
      await withRetries(
        () => put(uploadUrl, file.bytes, file.contentType, options.signal),
        options.retries,
        file.path,
        options.signal,
      );
      bytesUploaded += file.size;
      options.onUploaded?.(file);
    }
  };

  const workers = Math.max(1, Math.min(options.concurrency, diff.missing.length));
  await Promise.all(Array.from({ length: workers }, worker));

  return {
    uploaded: diff.missing.length,
    skipped: diff.deduplicated.length,
    bytesUploaded,
  };
}

const defaultPut: PutObject = async (url, body, contentType, signal) => {
  // A fresh copy: putToPresignedUrl takes a BodyInit, and a Uint8Array view
  // over a pooled Buffer would send the whole pool.
  const buffer = body.slice().buffer as ArrayBuffer;
  await putToPresignedUrl(url, buffer, contentType, signal);
};

async function withRetries(
  attempt: () => Promise<void>,
  retries: number,
  path: string,
  signal?: AbortSignal,
): Promise<void> {
  let lastError: unknown;
  for (let tries = 0; tries <= retries; tries++) {
    throwIfAborted(signal);
    try {
      await attempt();
      return;
    } catch (err) {
      lastError = err;
      if (tries === retries) break;
      await delay(2 ** tries * 250);
    }
  }
  throw new DeployError(
    'UPLOAD_FAILED',
    `Upload of "${path}" failed after ${retries + 1} attempt(s): ${errorMessage(lastError)}`,
    lastError,
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DeployError('ABORTED', 'Deploy was cancelled');
  }
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
