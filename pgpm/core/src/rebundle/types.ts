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
