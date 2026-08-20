import type { GeneratedFile } from '../codegen';

export type { GeneratedFile };

export const GENERATED_FILES_MANIFEST = '.constructive-codegen-manifest.json';
export const MANIFEST_VERSION = 1 as const;
export const GENERATOR_NAME = '@constructive-io/graphql-codegen' as const;

export interface ManifestFileEntry {
  sha256: string;
}

export interface GeneratedFilesManifest {
  version: typeof MANIFEST_VERSION;
  generator: typeof GENERATOR_NAME;
  files: Record<string, ManifestFileEntry>;
}

export type FileChangeAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'unchanged'
  | 'conflict';

export interface FileChange {
  /** POSIX path relative to the output directory. */
  path: string;
  absolutePath: string;
  action: FileChangeAction;
  previousHash?: string;
  generatedHash?: string;
  reason?:
    | 'new-generated-file'
    | 'generated-content-changed'
    | 'generated-file-removed'
    | 'generated-content-unchanged'
    | 'modified-generated-file'
    | 'unowned-existing-file'
    | 'legacy-generated-file'
    | 'retained-owned-file'
    | 'ownership-manifest';
}

export interface GenerationPlan {
  version: 1;
  outputDir: string;
  manifestPath: string;
  fingerprint: string;
  changes: FileChange[];
}

/** Result of planning or writing files. */
export interface WriteResult {
  success: boolean;
  filesWritten?: string[];
  filesRemoved?: string[];
  errors?: string[];
  /** Non-fatal cleanup or recovery information. */
  warnings?: string[];
  /** Retained transaction directory when rollback or cleanup was incomplete. */
  recoveryPath?: string;
  rollbackErrors?: string[];
  plan?: GenerationPlan;
  planFingerprint?: string;
}

export interface WriteOptions {
  /** Show progress output (default: true). */
  showProgress?: boolean;
  /** Format TypeScript files with oxfmt before planning (default: true). */
  formatFiles?: boolean;
  /** Remove previously owned files absent from the current file set. */
  pruneStaleFiles?: boolean;
  /** Compute and return the complete plan without mutating the filesystem. */
  dryRun?: boolean;
  /** Permit replacing or deleting owned files changed since generation. */
  overwriteModifiedGenerated?: boolean;
  /** Required confirmation paired with overwriteModifiedGenerated. */
  confirmOverwrite?: boolean;
  /** Known legacy generated paths that predate the ownership manifest. */
  adoptUnownedPaths?: string[];
  /** Delete the ownership manifest when the desired owned file set is empty. */
  removeManifestWhenEmpty?: boolean;
}

export interface GeneratedFileWriteJob {
  files: GeneratedFile[];
  outputDir: string;
  options?: Omit<WriteOptions, 'dryRun'>;
}

export interface WriteBatchResult {
  success: boolean;
  results: WriteResult[];
  errors?: string[];
}

export interface WriteBatchOptions extends Pick<
  WriteOptions,
  'dryRun' | 'showProgress'
> {
  /** Cancellation is honored until the coordinated commit begins. */
  signal?: AbortSignal;
}

export interface PreparedFile {
  relativePath: string;
  absolutePath: string;
  content: string;
  hash: string;
}

export interface PreparedPlan {
  publicPlan: GenerationPlan;
  desiredFiles: Map<string, PreparedFile>;
  manifestContent?: string;
  manifestChanged: boolean;
  removeOutputDirWhenEmpty: boolean;
}
