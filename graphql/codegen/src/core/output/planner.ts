import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  assertContainedPath,
  canonicalizeOutputDir,
  hashContent,
  normalizeRelativePath,
} from './filesystem';
import {
  createManifestContent,
  isLegacyGenerated,
  readManifest,
} from './manifest';
import {
  GENERATED_FILES_MANIFEST,
  type FileChange,
  type GeneratedFile,
  type GenerationPlan,
  type ManifestFileEntry,
  type PreparedFile,
  type PreparedPlan,
  type WriteOptions,
} from './types';

type OxfmtFormatFn = (
  fileName: string,
  sourceText: string,
  options?: Record<string, unknown>,
) => Promise<{ code: string; errors: unknown[] }>;

async function getOxfmtFormat(): Promise<OxfmtFormatFn | null> {
  try {
    const oxfmt = await import('oxfmt');
    return oxfmt.format;
  } catch {
    return null;
  }
}

async function formatFileContent(
  fileName: string,
  content: string,
  formatFn: OxfmtFormatFn,
): Promise<string> {
  try {
    const result = await formatFn(fileName, content, {
      singleQuote: true,
      trailingComma: 'es5',
      tabWidth: 2,
      semi: true,
    });
    return result.code;
  } catch {
    return content;
  }
}

function fingerprintChanges(
  changes: FileChange[],
  manifestContent: string | undefined,
): string {
  const canonical = changes
    .map((change) => ({
      path: change.path,
      action: change.action,
      previousHash: change.previousHash,
      generatedHash: change.generatedHash,
      reason: change.reason,
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
  return hashContent(
    JSON.stringify({
      changes: canonical,
      manifestHash:
        manifestContent === undefined ? null : hashContent(manifestContent),
    }),
  );
}

export async function prepareGenerationPlan(
  files: GeneratedFile[],
  outputDir: string,
  options: WriteOptions,
): Promise<PreparedPlan> {
  const {
    formatFiles = true,
    pruneStaleFiles = false,
    overwriteModifiedGenerated = false,
    confirmOverwrite = false,
    adoptUnownedPaths = [],
    removeManifestWhenEmpty = false,
  } = options;

  if (overwriteModifiedGenerated && !confirmOverwrite) {
    throw new Error(
      'overwriteModifiedGenerated requires explicit confirmOverwrite confirmation',
    );
  }

  const resolvedOutputDir = canonicalizeOutputDir(outputDir);
  const manifestPath = path.join(resolvedOutputDir, GENERATED_FILES_MANIFEST);
  assertContainedPath(resolvedOutputDir, manifestPath);
  const { manifest, content: previousManifestContent } =
    readManifest(manifestPath);
  const desiredFiles = new Map<string, PreparedFile>();
  const explicitlyAdoptedPaths = new Set(
    adoptUnownedPaths.map(normalizeRelativePath),
  );
  const formatFn = formatFiles ? await getOxfmtFormat() : null;

  for (const file of files) {
    const relativePath = normalizeRelativePath(file.path);
    if (desiredFiles.has(relativePath)) {
      throw new Error(`Duplicate generated file path: ${relativePath}`);
    }

    const content =
      formatFn && relativePath.endsWith('.ts')
        ? await formatFileContent(relativePath, file.content, formatFn)
        : file.content;
    desiredFiles.set(relativePath, {
      relativePath,
      absolutePath: path.join(resolvedOutputDir, ...relativePath.split('/')),
      content,
      hash: hashContent(content),
    });
    assertContainedPath(
      resolvedOutputDir,
      path.join(resolvedOutputDir, ...relativePath.split('/')),
    );
  }

  const changes: FileChange[] = [];
  const nextManifestFiles: Record<string, ManifestFileEntry> = {};

  for (const desired of desiredFiles.values()) {
    const previousEntry = manifest.files[desired.relativePath];
    let existing: Buffer | undefined;
    try {
      existing = fs.readFileSync(desired.absolutePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }

    if (!existing) {
      changes.push({
        path: desired.relativePath,
        absolutePath: desired.absolutePath,
        action: 'create',
        generatedHash: desired.hash,
        reason: 'new-generated-file',
      });
      nextManifestFiles[desired.relativePath] = { sha256: desired.hash };
      continue;
    }

    const existingHash = hashContent(existing);
    const isExplicitlyAdopted = explicitlyAdoptedPaths.has(
      desired.relativePath,
    );
    const isRecognizedLegacyFile = isLegacyGenerated(existing);
    if (!previousEntry && !isRecognizedLegacyFile && !isExplicitlyAdopted) {
      changes.push({
        path: desired.relativePath,
        absolutePath: desired.absolutePath,
        action: 'conflict',
        previousHash: existingHash,
        generatedHash: desired.hash,
        reason: 'unowned-existing-file',
      });
      continue;
    }

    if (existingHash === desired.hash) {
      changes.push({
        path: desired.relativePath,
        absolutePath: desired.absolutePath,
        action: 'unchanged',
        previousHash: existingHash,
        generatedHash: desired.hash,
        reason: 'generated-content-unchanged',
      });
      nextManifestFiles[desired.relativePath] = { sha256: desired.hash };
      continue;
    }

    const modifiedOwnedFile =
      !!previousEntry && existingHash !== previousEntry.sha256;
    const conflict = modifiedOwnedFile;

    if (conflict && !overwriteModifiedGenerated) {
      changes.push({
        path: desired.relativePath,
        absolutePath: desired.absolutePath,
        action: 'conflict',
        previousHash: existingHash,
        generatedHash: desired.hash,
        reason: modifiedOwnedFile
          ? 'modified-generated-file'
          : 'modified-generated-file',
      });
    } else {
      changes.push({
        path: desired.relativePath,
        absolutePath: desired.absolutePath,
        action: 'update',
        previousHash: existingHash,
        generatedHash: desired.hash,
        reason: modifiedOwnedFile
          ? 'modified-generated-file'
          : !previousEntry
            ? 'legacy-generated-file'
            : 'generated-content-changed',
      });
    }
    nextManifestFiles[desired.relativePath] = { sha256: desired.hash };
  }

  for (const [relativePath, previousEntry] of Object.entries(manifest.files)) {
    if (desiredFiles.has(relativePath)) continue;
    const absolutePath = path.join(
      resolvedOutputDir,
      ...relativePath.split('/'),
    );
    assertContainedPath(resolvedOutputDir, absolutePath);
    let existing: Buffer | undefined;
    try {
      existing = fs.readFileSync(absolutePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    if (!existing) continue;

    const existingHash = hashContent(existing);
    if (!pruneStaleFiles) {
      changes.push({
        path: relativePath,
        absolutePath,
        action: 'unchanged',
        previousHash: existingHash,
        reason: 'retained-owned-file',
      });
      nextManifestFiles[relativePath] = previousEntry;
      continue;
    }

    const modified = existingHash !== previousEntry.sha256;
    if (modified && !overwriteModifiedGenerated) {
      changes.push({
        path: relativePath,
        absolutePath,
        action: 'conflict',
        previousHash: existingHash,
        reason: 'modified-generated-file',
      });
      nextManifestFiles[relativePath] = previousEntry;
    } else {
      changes.push({
        path: relativePath,
        absolutePath,
        action: 'delete',
        previousHash: existingHash,
        reason: modified ? 'modified-generated-file' : 'generated-file-removed',
      });
    }
  }

  changes.sort((left, right) => left.path.localeCompare(right.path));
  const manifestContent =
    removeManifestWhenEmpty && Object.keys(nextManifestFiles).length === 0
      ? undefined
      : createManifestContent(nextManifestFiles);
  const manifestChanged = previousManifestContent !== manifestContent;
  changes.push({
    path: GENERATED_FILES_MANIFEST,
    absolutePath: manifestPath,
    action: manifestChanged
      ? manifestContent === undefined
        ? 'delete'
        : previousManifestContent === undefined
          ? 'create'
          : 'update'
      : 'unchanged',
    previousHash:
      previousManifestContent === undefined
        ? undefined
        : hashContent(previousManifestContent),
    generatedHash:
      manifestContent === undefined ? undefined : hashContent(manifestContent),
    reason: 'ownership-manifest',
  });

  const publicPlan: GenerationPlan = {
    version: 1,
    outputDir: resolvedOutputDir,
    manifestPath,
    fingerprint: fingerprintChanges(changes, manifestContent),
    changes,
  };

  return {
    publicPlan,
    desiredFiles,
    manifestContent,
    manifestChanged,
    removeOutputDirWhenEmpty: removeManifestWhenEmpty,
  };
}

/** Compute a complete generation plan without mutating the target filesystem. */
export async function planGeneratedFiles(
  files: GeneratedFile[],
  outputDir: string,
  options: Omit<WriteOptions, 'dryRun' | 'showProgress'> = {},
): Promise<GenerationPlan> {
  return (await prepareGenerationPlan(files, outputDir, options)).publicPlan;
}
