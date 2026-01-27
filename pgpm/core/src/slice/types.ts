import { Change, Tag, ExtendedPlanFile } from '../files/types';

/**
 * Configuration for slicing a plan into multiple packages
 */
export interface SliceConfig {
  /** Source plan file path */
  sourcePlan: string;

  /** Output directory for packages */
  outputDir: string;

  /** Grouping strategy */
  strategy: GroupingStrategy;

  /** Package for changes that don't match any group */
  defaultPackage?: string;

  /** Whether to use tags for cross-package deps */
  useTagsForCrossPackageDeps?: boolean;

  /** Minimum changes per package (merge smaller groups) */
  minChangesPerPackage?: number;

  /** Author for generated plan files */
  author?: string;
}

/**
 * Grouping strategy for slicing
 */
export type GroupingStrategy =
  | FolderStrategy
  | PatternStrategy
  | ExplicitStrategy;

export interface FolderStrategy {
  type: 'folder';
  /** Depth in path to extract package name (default: 1) */
  depth?: number;
  /** Prefix to strip from paths (default: 'schemas') */
  prefixToStrip?: string;
}

/**
 * Pattern-based strategy using glob patterns to match changes to packages.
 * Each slice defines a package name and an array of glob patterns.
 * Changes matching any pattern in a slice are assigned to that package.
 */
export interface PatternStrategy {
  type: 'pattern';
  /** Array of slice definitions with package names and patterns */
  slices: PatternSlice[];
}

/**
 * A single slice definition for pattern-based grouping
 */
export interface PatternSlice {
  /** Name of the output package */
  packageName: string;
  /** Glob patterns to match change paths (e.g., "schemas/auth/**") */
  patterns: string[];
}

export interface ExplicitStrategy {
  type: 'explicit';
  /** Mapping of change name to package name */
  mapping: Record<string, string>;
}

/**
 * Dependency graph representation
 */
export interface DependencyGraph {
  /** Map of change name to Change object */
  nodes: Map<string, Change>;
  /** Map of change name to its dependencies */
  edges: Map<string, Set<string>>;
  /** Map of change name to changes that depend on it */
  reverseEdges: Map<string, Set<string>>;
  /** Map of change name to its tags */
  tags: Map<string, Tag[]>;
  /** Original plan metadata */
  plan: ExtendedPlanFile;
}

/**
 * Result of slicing operation
 */
export interface SliceResult {
  /** Generated packages */
  packages: PackageOutput[];

  /** Workspace manifest */
  workspace: WorkspaceManifest;

  /** Warnings/issues encountered */
  warnings: SliceWarning[];

  /** Statistics */
  stats: SliceStats;
}

/**
 * Output for a single package
 */
export interface PackageOutput {
  /** Package name */
  name: string;

  /** Plan file content */
  planContent: string;

  /** Control file content */
  controlContent: string;

  /** Changes in this package */
  changes: Change[];

  /** Dependencies on other packages */
  packageDependencies: string[];
}

/**
 * Workspace manifest describing package relationships
 */
export interface WorkspaceManifest {
  /** List of package names */
  packages: string[];

  /** Order in which packages should be deployed */
  deployOrder: string[];

  /** Map of package name to its package dependencies */
  dependencies: Record<string, string[]>;
}

/**
 * Warning generated during slicing
 */
export interface SliceWarning {
  type: 'heavy_cross_deps' | 'cycle_detected' | 'orphan_change' | 'merge_required';
  message: string;
  affectedChanges?: string[];
  suggestedAction?: string;
}

/**
 * Statistics about the slicing operation
 */
export interface SliceStats {
  /** Total number of changes processed */
  totalChanges: number;

  /** Number of packages created */
  packagesCreated: number;

  /** Number of internal dependency edges */
  internalEdges: number;

  /** Number of cross-package dependency edges */
  crossPackageEdges: number;

  /** Ratio of cross-package to total edges */
  crossPackageRatio: number;
}
