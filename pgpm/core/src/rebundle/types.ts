import { Change } from '../files/types';
import { SliceWarning } from '../slice/types';

/**
 * Strategy for rebundling a module's changes into fewer, larger chunks.
 *
 * Rebundling walks the source plan in order and greedily accumulates
 * consecutive changes into a chunk until a boundary is hit. Because chunks
 * are contiguous runs of the source plan, the concatenated deploy/verify/
 * revert output is byte-identical to the original module — the granularity
 * dial never reorders statements, it only decides where the chunk seams fall.
 */
export interface RebundleStrategy {
  /**
   * How chunk boundaries are chosen:
   * - 'folder' (default): start a new chunk when the folder-derived key
   *   changes (uses the same path extraction as slice's folder strategy)
   * - 'none': one chunk for the whole module, subject only to `maxChunkSize`
   */
  boundary?: 'folder' | 'none';

  /** Depth in the change path used to derive the folder key (default: 1) */
  depth?: number;

  /** Path prefix stripped before deriving the folder key (default: 'schemas') */
  prefixToStrip?: string;

  /**
   * Maximum number of member changes per chunk. When reached, the current
   * chunk is sealed and a new one begins even if the boundary key is unchanged.
   * Undefined or 0 means unlimited.
   */
  maxChunkSize?: number;
}

/**
 * A single rebundled chunk: a contiguous run of source-plan changes that will
 * be merged into one migration. Member ordering is preserved in all three
 * directions the pgpm engine cares about.
 */
export interface Chunk {
  /** Deterministic chunk identifier */
  name: string;

  /** Member change names in deploy order (== source plan order) */
  deploy: string[];

  /** Member change names in verify order (same as deploy) */
  verify: string[];

  /** Member change names in revert order (reverse of deploy) */
  revert: string[];

  /** Other chunk names this chunk depends on (always earlier in deployOrder) */
  dependencies: string[];
}

/**
 * Result of computing a rebundle plan for a module.
 */
export interface RebundleResult {
  /** Chunks in deploy order */
  chunks: Chunk[];

  /** Chunk names in deploy order */
  deployOrder: string[];

  /** Warnings encountered while rebundling */
  warnings: SliceWarning[];

  /** The source changes (in plan order) that were rebundled */
  sourceChanges: Change[];

  /** The source module's project name (from the plan `%project` header) */
  project: string;
}

/**
 * Options for materializing a rebundled module to disk.
 */
export interface RebundleModuleOptions extends RebundleStrategy {
  /** Directory to write the rebundled module into */
  outputDir: string;

  /** Overwrite an existing, non-empty output directory (default: false) */
  overwrite?: boolean;

  /** Deparse pretty-printing (default: true) */
  pretty?: boolean;

  /** Function body delimiter used during deparse (default: '$EOFCODE$') */
  functionDelimiter?: string;
}

/**
 * How cross-chunk dependencies are represented when chunks are emitted as
 * separate modules in a workspace.
 *
 * - `change`: also record the fine-grained plan cross-reference (`dep:dep`) in
 *   addition to the control `requires`.
 * - `control-only`: carry the dependency solely via the control-file `requires`,
 *   dropping the per-change plan reference. Extension install ordering deploys
 *   all of the dependency before any of the dependent, which is strictly
 *   stronger than the fine edge — the right mode for publishing chunks as
 *   independent, versioned module forks.
 */
export type CrossChunkDepMode = 'change' | 'control-only';

/**
 * Options for materializing a rebundled workspace (one module per chunk).
 */
export interface RebundleWorkspaceOptions extends RebundleStrategy {
  /** Directory to write the workspace into (packages land in `packages/<chunk>/`) */
  outputDir: string;

  /** Overwrite an existing, non-empty output directory (default: false) */
  overwrite?: boolean;

  /** Deparse pretty-printing (default: true) */
  pretty?: boolean;

  /** Function body delimiter used during deparse (default: '$EOFCODE$') */
  functionDelimiter?: string;

  /** How cross-chunk deps are represented (default: 'control-only') */
  crossChunkDepMode?: CrossChunkDepMode;

  /**
   * When `true`, scaffold each emitted module (and the workspace root) from the
   * real `pgpm init` boilerplate template (`scaffoldTemplate`) before writing
   * the merged pgpm files on top — so the output carries the full developer
   * shell (README/LICENSE/jest/tests, workspace `pnpm-workspace.yaml`/`lerna.json`
   * /tsconfig/lint/CI) rather than the minimal deployable set.
   *
   * Defaults to `false` (the lightweight, network-free minimal writer). Setting
   * it `true` fetches the boilerplate repo (network), matching `pgpm init`.
   */
  initScaffold?: boolean;

  /** Template repo for `initScaffold` (defaults to the pgpm boilerplates repo) */
  templateRepo?: string;

  /** Branch/tag for the `initScaffold` template repo */
  templateBranch?: string;
}

/**
 * A single emitted chunk-module within a rebundled workspace.
 */
export interface RebundlePackage {
  /** Chunk/module name (also the extension name) */
  name: string;

  /** Package directory, relative to the workspace outputDir */
  dir: string;

  /** Names of other chunk-modules this one depends on */
  dependencies: string[];
}

/**
 * Result of materializing a rebundled workspace.
 */
export interface RebundleWorkspaceResult extends RebundleResult {
  /** Directory the workspace was written to */
  outputDir: string;

  /** The emitted chunk-modules, in deploy order */
  packages: RebundlePackage[];

  /** The dep representation used */
  crossChunkDepMode: CrossChunkDepMode;

  /**
   * Byte-identical gate: the merged concatenation of all package deploy scripts
   * (in workspace deploy order) equals the merged original module deploy output.
   */
  invariant: { ok: boolean };
}

/**
 * Result of materializing a rebundled module.
 */
export interface RebundleModuleResult extends RebundleResult {
  /** Directory the rebundled module was written to */
  outputDir: string;

  /** Per-chunk merged file paths, relative to outputDir */
  written: { chunk: string; deploy: string; revert: string; verify: string }[];

  /** Byte-identical gate result: packageModule(source) === packageModule(output) */
  invariant: { ok: boolean; sourceDiff: boolean; outputDiff: boolean };
}
