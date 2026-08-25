/**
 * Safe output planning and application for generated files.
 *
 * Generation is deliberately split into a read-only planning phase and a
 * transactional apply phase. This module is the public orchestration facade;
 * path, manifest, planning, and transaction details live beside it.
 */
import { rethrowIfCancelled, throwIfAborted } from '../cancellation';
import { canonicalizeOutputDir } from './filesystem';
import { acquireOutputLocks } from './lock';
import { prepareGenerationPlan } from './planner';
import {
  applyPreparedPlans,
  conflictErrors,
  resultForPrepared,
} from './transaction';
import type {
  GeneratedFile,
  GeneratedFileWriteJob,
  PreparedPlan,
  WriteBatchOptions,
  WriteBatchResult,
  WriteOptions,
  WriteResult,
} from './types';

export { planGeneratedFiles } from './planner';
export {
  type FileChange,
  type FileChangeAction,
  GENERATED_FILES_MANIFEST,
  type GeneratedFile,
  type GeneratedFilesManifest,
  type GeneratedFileWriteJob,
  type GenerationPlan,
  type WriteBatchOptions,
  type WriteBatchResult,
  type WriteOptions,
  type WriteResult,
} from './types';

/**
 * Plan and optionally apply generated files.
 *
 * Dry runs execute the same formatting, ownership, conflict, and pruning
 * decisions as a real write, but never create the output or transaction dirs.
 */
export async function writeGeneratedFiles(
  files: GeneratedFile[],
  outputDir: string,
  _subdirs: string[],
  options: WriteOptions = {},
): Promise<WriteResult> {
  const { dryRun, ...jobOptions } = options;
  const batch = await writeGeneratedFileJobs(
    [
      {
        files,
        outputDir,
        options: jobOptions,
      },
    ],
    {
      dryRun,
      showProgress: options.showProgress,
    },
  );
  return (
    batch.results[0] ?? {
      success: false,
      errors: batch.errors ?? ['Failed to prepare generated files.'],
    }
  );
}

function mergeWriteJobs(
  jobs: GeneratedFileWriteJob[],
): GeneratedFileWriteJob[] {
  const grouped = new Map<string, GeneratedFileWriteJob>();
  for (const job of jobs) {
    const outputDir = canonicalizeOutputDir(job.outputDir);
    const current = grouped.get(outputDir);
    if (!current) {
      grouped.set(outputDir, {
        files: [...job.files],
        outputDir,
        options: {
          ...(job.options ?? {}),
          adoptUnownedPaths: [...(job.options?.adoptUnownedPaths ?? [])],
        },
      });
      continue;
    }

    current.files.push(...job.files);
    current.options = {
      ...current.options,
      ...job.options,
      pruneStaleFiles:
        current.options?.pruneStaleFiles === true ||
        job.options?.pruneStaleFiles === true,
      removeManifestWhenEmpty:
        current.options?.removeManifestWhenEmpty === true ||
        job.options?.removeManifestWhenEmpty === true,
      adoptUnownedPaths: [
        ...(current.options?.adoptUnownedPaths ?? []),
        ...(job.options?.adoptUnownedPaths ?? []),
      ],
    };
  }
  return [...grouped.values()];
}

/**
 * Plan all output roots before mutating any of them, then stage and commit them
 * as one recoverable operation. Output roots may live on different filesystems;
 * each root stages locally and every committed root is rolled back if a later
 * root fails.
 */
export async function writeGeneratedFileJobs(
  jobs: GeneratedFileWriteJob[],
  options: WriteBatchOptions = {},
): Promise<WriteBatchResult> {
  throwIfAborted(options.signal);
  const mergedJobs = mergeWriteJobs(jobs);
  const preparePlans = async (): Promise<PreparedPlan[]> =>
    Promise.all(
      mergedJobs.map((job) =>
        prepareGenerationPlan(job.files, job.outputDir, job.options ?? {}),
      ),
    );
  if (options.dryRun) {
    let preparedPlans: PreparedPlan[];
    try {
      preparedPlans = await preparePlans();
      throwIfAborted(options.signal);
    } catch (error) {
      rethrowIfCancelled(error, options.signal);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, results: [], errors: [message] };
    }
    const results = preparedPlans.map((prepared) => {
      const errors = conflictErrors(prepared.publicPlan);
      return resultForPrepared(prepared, {
        success: errors.length === 0,
        ...(errors.length === 0 ? {} : { errors }),
      });
    });
    const errors = results.flatMap((result) => result.errors ?? []);
    return {
      success: errors.length === 0,
      results,
      ...(errors.length === 0 ? {} : { errors }),
    };
  }

  let locks: Awaited<ReturnType<typeof acquireOutputLocks>> | undefined;
  try {
    locks = await acquireOutputLocks(
      mergedJobs.map((job) => job.outputDir),
      options.signal,
    );
    const preparedPlans = await preparePlans();
    throwIfAborted(options.signal);
    return applyPreparedPlans(preparedPlans, options.showProgress ?? true);
  } catch (error) {
    rethrowIfCancelled(error, options.signal);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, results: [], errors: [message] };
  } finally {
    await locks?.release();
  }
}
