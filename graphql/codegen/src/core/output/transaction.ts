import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  assertContainedPath,
  canonicalizeOutputDir,
  hashContent,
  removeEmptyParents,
} from './filesystem';
import {
  GENERATED_FILES_MANIFEST,
  type FileChange,
  type GenerationPlan,
  type PreparedPlan,
  type WriteBatchResult,
  type WriteResult,
} from './types';

interface CommittedChange {
  change: FileChange;
  backupCreated: boolean;
  targetWritten: boolean;
}

interface PlanTransaction {
  prepared: PreparedPlan;
  applicableChanges: FileChange[];
  transactionRoot: string;
  stagedRoot: string;
  backupRoot: string;
  committed: CommittedChange[];
  written: string[];
  removed: string[];
  manifestBackupCreated: boolean;
  manifestPublished: boolean;
}

export function conflictErrors(plan: GenerationPlan): string[] {
  return plan.changes
    .filter((change) => change.action === 'conflict')
    .map(
      (conflict) =>
        `${conflict.reason === 'unowned-existing-file' ? 'Refusing to overwrite unowned file' : 'Generated file was modified'}: ${conflict.absolutePath}`,
    );
}

function createPlanTransaction(prepared: PreparedPlan): PlanTransaction {
  const outputParent = path.dirname(prepared.publicPlan.outputDir);
  fs.mkdirSync(outputParent, { recursive: true });
  const transactionRoot = fs.mkdtempSync(
    path.join(
      outputParent,
      `.${path.basename(prepared.publicPlan.outputDir)}.codegen-transaction-`,
    ),
  );
  return {
    prepared,
    applicableChanges: prepared.publicPlan.changes.filter(
      (change) =>
        change.path !== GENERATED_FILES_MANIFEST &&
        (change.action === 'create' ||
          change.action === 'update' ||
          change.action === 'delete'),
    ),
    transactionRoot,
    stagedRoot: path.join(transactionRoot, 'staged'),
    backupRoot: path.join(transactionRoot, 'backup'),
    committed: [],
    written: [],
    removed: [],
    manifestBackupCreated: false,
    manifestPublished: false,
  };
}

function stagePlan(transaction: PlanTransaction): void {
  const { prepared, applicableChanges, stagedRoot } = transaction;
  for (const change of applicableChanges) {
    if (change.action === 'delete') continue;
    const desired = prepared.desiredFiles.get(change.path);
    if (!desired) {
      throw new Error(`Missing prepared content for ${change.path}`);
    }
    const stagedPath = path.join(stagedRoot, ...change.path.split('/'));
    fs.mkdirSync(path.dirname(stagedPath), { recursive: true });
    fs.writeFileSync(stagedPath, desired.content, 'utf8');
  }
  if (prepared.manifestChanged && prepared.manifestContent !== undefined) {
    const stagedManifestPath = path.join(stagedRoot, GENERATED_FILES_MANIFEST);
    fs.mkdirSync(path.dirname(stagedManifestPath), { recursive: true });
    fs.writeFileSync(stagedManifestPath, prepared.manifestContent, {
      encoding: 'utf8',
      mode: 0o600,
    });
  }
}

function readOptionalHash(filePath: string): string | undefined {
  try {
    return hashContent(fs.readFileSync(filePath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

function assertPlanStillCurrent(transaction: PlanTransaction): void {
  const { publicPlan } = transaction.prepared;
  const currentOutputDir = canonicalizeOutputDir(publicPlan.outputDir);
  if (currentOutputDir !== publicPlan.outputDir) {
    throw new Error(
      `Generated output path changed after planning: ${publicPlan.outputDir}`,
    );
  }

  for (const change of publicPlan.changes) {
    assertContainedPath(publicPlan.outputDir, change.absolutePath);
    const observedHash = readOptionalHash(change.absolutePath);
    if (observedHash !== change.previousHash) {
      throw new Error(
        `Generated output changed after planning: ${change.absolutePath}`,
      );
    }
  }
}

function commitPlanFiles(
  transaction: PlanTransaction,
  showProgress: boolean,
  progress: { current: number; total: number },
): void {
  const { prepared, applicableChanges, backupRoot, stagedRoot } = transaction;
  fs.mkdirSync(prepared.publicPlan.outputDir, { recursive: true });

  for (const change of applicableChanges) {
    progress.current += 1;
    if (
      showProgress &&
      (progress.current === 1 ||
        progress.current === progress.total ||
        progress.current % 100 === 0)
    ) {
      console.log(
        `Applying generated files: ${progress.current}/${progress.total}`,
      );
    }

    const targetPath = change.absolutePath;
    let backupCreated = false;
    if (fs.existsSync(targetPath)) {
      const backupPath = path.join(backupRoot, ...change.path.split('/'));
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
      fs.renameSync(targetPath, backupPath);
      backupCreated = true;
    }
    const committedChange: CommittedChange = {
      change,
      backupCreated,
      targetWritten: false,
    };
    transaction.committed.push(committedChange);

    if (change.action !== 'delete') {
      const stagedPath = path.join(stagedRoot, ...change.path.split('/'));
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.renameSync(stagedPath, targetPath);
      committedChange.targetWritten = true;
      transaction.written.push(targetPath);
    } else {
      transaction.removed.push(targetPath);
    }
  }
}

function publishPlanManifest(transaction: PlanTransaction): void {
  const { prepared, backupRoot, stagedRoot } = transaction;
  if (!prepared.manifestChanged) return;

  const manifestBackupPath = path.join(backupRoot, GENERATED_FILES_MANIFEST);
  if (fs.existsSync(prepared.publicPlan.manifestPath)) {
    fs.mkdirSync(path.dirname(manifestBackupPath), { recursive: true });
    fs.renameSync(prepared.publicPlan.manifestPath, manifestBackupPath);
    transaction.manifestBackupCreated = true;
  }

  if (prepared.manifestContent === undefined) return;
  const stagedManifestPath = path.join(stagedRoot, GENERATED_FILES_MANIFEST);
  fs.renameSync(stagedManifestPath, prepared.publicPlan.manifestPath);
  transaction.manifestPublished = true;
}

function rollbackTransaction(transaction: PlanTransaction): string[] {
  const errors: string[] = [];
  const attempt = (description: string, operation: () => void): void => {
    try {
      operation();
    } catch (error) {
      errors.push(
        `${description}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  };
  const { prepared, backupRoot } = transaction;

  if (transaction.manifestPublished) {
    attempt('remove partially published ownership manifest', () => {
      if (fs.existsSync(prepared.publicPlan.manifestPath)) {
        fs.rmSync(prepared.publicPlan.manifestPath, { force: true });
      }
    });
  }
  const manifestBackupPath = path.join(backupRoot, GENERATED_FILES_MANIFEST);
  if (transaction.manifestBackupCreated) {
    attempt('restore previous ownership manifest', () => {
      if (!fs.existsSync(manifestBackupPath)) {
        throw new Error(`Backup is missing: ${manifestBackupPath}`);
      }
      fs.mkdirSync(path.dirname(prepared.publicPlan.manifestPath), {
        recursive: true,
      });
      fs.renameSync(manifestBackupPath, prepared.publicPlan.manifestPath);
    });
  }

  for (const committedChange of [...transaction.committed].reverse()) {
    const { change, backupCreated, targetWritten } = committedChange;
    if (targetWritten) {
      attempt(`remove partially written file ${change.absolutePath}`, () => {
        if (fs.existsSync(change.absolutePath)) {
          fs.rmSync(change.absolutePath, { force: true });
        }
      });
    }
    const backupPath = path.join(backupRoot, ...change.path.split('/'));
    if (backupCreated) {
      attempt(`restore previous file ${change.absolutePath}`, () => {
        if (!fs.existsSync(backupPath)) {
          throw new Error(`Backup is missing: ${backupPath}`);
        }
        fs.mkdirSync(path.dirname(change.absolutePath), { recursive: true });
        fs.renameSync(backupPath, change.absolutePath);
      });
    } else {
      attempt(`remove empty directories for ${change.absolutePath}`, () => {
        removeEmptyParents(
          path.dirname(change.absolutePath),
          prepared.publicPlan.outputDir,
        );
      });
    }
  }

  return errors;
}

export function resultForPrepared(
  prepared: PreparedPlan,
  overrides: Partial<WriteResult>,
): WriteResult {
  return {
    success: true,
    filesWritten: [],
    filesRemoved: [],
    plan: prepared.publicPlan,
    planFingerprint: prepared.publicPlan.fingerprint,
    ...overrides,
  };
}

export async function applyPreparedPlans(
  preparedPlans: PreparedPlan[],
  showProgress: boolean,
): Promise<WriteBatchResult> {
  const allConflictErrors = preparedPlans.flatMap(({ publicPlan }) =>
    conflictErrors(publicPlan),
  );
  if (allConflictErrors.length > 0) {
    return {
      success: false,
      errors: allConflictErrors,
      results: preparedPlans.map((prepared) => {
        const errors = conflictErrors(prepared.publicPlan);
        return resultForPrepared(prepared, {
          success: errors.length === 0,
          ...(errors.length === 0 ? {} : { errors }),
        });
      }),
    };
  }

  const transactions: PlanTransaction[] = [];
  const total = preparedPlans.reduce(
    (count, prepared) =>
      count +
      prepared.publicPlan.changes.filter(
        (change) =>
          change.path !== GENERATED_FILES_MANIFEST &&
          (change.action === 'create' ||
            change.action === 'update' ||
            change.action === 'delete'),
      ).length,
    0,
  );
  const progress = { current: 0, total };

  try {
    for (const prepared of preparedPlans) {
      const hasWork =
        prepared.manifestChanged ||
        prepared.publicPlan.changes.some(
          (change) =>
            change.path !== GENERATED_FILES_MANIFEST &&
            (change.action === 'create' ||
              change.action === 'update' ||
              change.action === 'delete'),
        );
      if (!hasWork) continue;
      const transaction = createPlanTransaction(prepared);
      transactions.push(transaction);
      stagePlan(transaction);
    }

    for (const transaction of transactions) {
      assertPlanStillCurrent(transaction);
    }
    for (const transaction of transactions) {
      commitPlanFiles(transaction, showProgress, progress);
    }
    // Every ownership manifest is published after every content mutation.
    for (const transaction of transactions) {
      publishPlanManifest(transaction);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const rollbackByPlan = new Map<GenerationPlan, string[]>();
    for (const transaction of [...transactions].reverse()) {
      rollbackByPlan.set(
        transaction.prepared.publicPlan,
        rollbackTransaction(transaction),
      );
    }

    for (const transaction of transactions) {
      const rollbackErrors = rollbackByPlan.get(
        transaction.prepared.publicPlan,
      )!;
      if (rollbackErrors.length === 0) {
        try {
          fs.rmSync(transaction.transactionRoot, {
            recursive: true,
            force: true,
          });
        } catch (cleanupError) {
          rollbackErrors.push(
            `remove transaction directory: ${cleanupError instanceof Error ? cleanupError.message : 'Unknown error'}`,
          );
        }
      }
    }

    const errors = [`Failed to apply generated file plans: ${message}`];
    return {
      success: false,
      errors,
      results: preparedPlans.map((prepared) => {
        const transaction = transactions.find(
          (candidate) => candidate.prepared === prepared,
        );
        const rollbackErrors = rollbackByPlan.get(prepared.publicPlan) ?? [];
        return resultForPrepared(prepared, {
          success: false,
          errors,
          ...(rollbackErrors.length === 0
            ? {}
            : {
                rollbackErrors,
                recoveryPath: transaction?.transactionRoot,
              }),
        });
      }),
    };
  }

  // At this point every content change and ownership manifest is committed.
  // Cleanup cannot safely change that outcome: deleting one transaction's
  // backups and then rolling every root back would make earlier roots
  // unrestorable. Retain any transaction directory that cannot be removed and
  // report it as a warning instead.
  const cleanupWarningsByPlan = new Map<GenerationPlan, string[]>();
  for (const transaction of transactions) {
    for (const { change } of transaction.committed) {
      if (change.action === 'delete') {
        removeEmptyParents(
          path.dirname(change.absolutePath),
          transaction.prepared.publicPlan.outputDir,
        );
      }
    }

    try {
      fs.rmSync(transaction.transactionRoot, {
        recursive: true,
        force: true,
      });
    } catch (cleanupError) {
      cleanupWarningsByPlan.set(transaction.prepared.publicPlan, [
        `Generated files were committed, but the transaction directory could not be removed: ${
          cleanupError instanceof Error ? cleanupError.message : 'Unknown error'
        }`,
      ]);
    }

    if (transaction.prepared.removeOutputDirWhenEmpty) {
      try {
        fs.rmdirSync(transaction.prepared.publicPlan.outputDir);
      } catch {
        // Unowned files or directories keep the output root alive.
      }
    }
  }

  const byPlan = new Map(
    transactions.map((transaction) => [
      transaction.prepared.publicPlan,
      transaction,
    ]),
  );
  return {
    success: true,
    results: preparedPlans.map((prepared) => {
      const transaction = byPlan.get(prepared.publicPlan);
      const warnings = cleanupWarningsByPlan.get(prepared.publicPlan) ?? [];
      return resultForPrepared(prepared, {
        filesWritten: transaction?.written ?? [],
        filesRemoved: transaction?.removed ?? [],
        ...(warnings.length === 0
          ? {}
          : {
              warnings,
              recoveryPath: transaction?.transactionRoot,
            }),
      });
    }),
  };
}
