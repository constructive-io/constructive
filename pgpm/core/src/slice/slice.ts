import { Change, Tag, ExtendedPlanFile } from '../files/types';
import { parsePlanFile } from '../files/plan/parser';
import {
  SliceConfig,
  SliceResult,
  DependencyGraph,
  PackageOutput,
  WorkspaceManifest,
  SliceWarning,
  SliceStats,
  GroupingStrategy,
  PatternStrategy
} from './types';
import { minimatch } from 'minimatch';

/**
 * Build a dependency graph from a parsed plan file
 */
export function buildDependencyGraph(plan: ExtendedPlanFile): DependencyGraph {
  const graph: DependencyGraph = {
    nodes: new Map(),
    edges: new Map(),
    reverseEdges: new Map(),
    tags: new Map(),
    plan
  };

  // Add all changes as nodes
  for (const change of plan.changes) {
    graph.nodes.set(change.name, change);
    graph.edges.set(change.name, new Set(change.dependencies || []));

    // Build reverse edges for dependency analysis
    for (const dep of change.dependencies || []) {
      if (!graph.reverseEdges.has(dep)) {
        graph.reverseEdges.set(dep, new Set());
      }
      graph.reverseEdges.get(dep)!.add(change.name);
    }
  }

  // Index tags by change
  for (const tag of plan.tags || []) {
    if (!graph.tags.has(tag.change)) {
      graph.tags.set(tag.change, []);
    }
    graph.tags.get(tag.change)!.push(tag);
  }

  return graph;
}

/**
 * Validate that the dependency graph is a DAG (no cycles)
 */
export function validateDAG(graph: DependencyGraph): void {
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function dfs(node: string, path: string[]): void {
    if (visiting.has(node)) {
      throw new Error(`Cycle detected: ${[...path, node].join(' -> ')}`);
    }
    if (visited.has(node)) return;

    visiting.add(node);
    const deps = graph.edges.get(node) || new Set();
    for (const dep of deps) {
      // Only follow internal dependencies
      if (graph.nodes.has(dep)) {
        dfs(dep, [...path, node]);
      }
    }
    visiting.delete(node);
    visited.add(node);
  }

  for (const node of graph.nodes.keys()) {
    dfs(node, []);
  }
}

/**
 * Extract package name from a change path using folder-based strategy
 */
export function extractPackageFromPath(
  changeName: string,
  depth: number = 1,
  prefixToStrip: string = 'schemas'
): string {
  const parts = changeName.split('/');

  // Handle special folders that should go to core
  if (parts[0] === 'extensions' || parts[0] === 'migrate') {
    return 'core';
  }

  // Strip prefix if present
  let startIdx = 0;
  if (parts[0] === prefixToStrip) {
    startIdx = 1;
  }

  // Get package name at specified depth
  if (parts.length > startIdx) {
    // For depth > 1, join multiple segments
    const endIdx = Math.min(startIdx + depth, parts.length - 1);
    if (endIdx > startIdx) {
      return parts.slice(startIdx, endIdx).join('/');
    }
    return parts[startIdx];
  }

  return 'core';
}

/**
 * Find the matching package for a change using pattern-based strategy.
 * Returns the first matching slice's package name, or undefined if no match.
 */
export function findMatchingPattern(
  changeName: string,
  strategy: PatternStrategy
): string | undefined {
  for (const slice of strategy.slices) {
    for (const pattern of slice.patterns) {
      if (minimatch(changeName, pattern, { dot: true })) {
        return slice.packageName;
      }
    }
  }
  return undefined;
}

/**
 * Assign changes to packages based on grouping strategy
 */
export function assignChangesToPackages(
  graph: DependencyGraph,
  strategy: GroupingStrategy,
  defaultPackage: string = 'core'
): Map<string, Set<string>> {
  const assignments = new Map<string, Set<string>>();

  for (const [changeName] of graph.nodes) {
    let packageName: string;

    switch (strategy.type) {
      case 'folder': {
        const depth = strategy.depth ?? 1;
        const prefix = strategy.prefixToStrip ?? 'schemas';
        packageName = extractPackageFromPath(changeName, depth, prefix);
        break;
      }
      case 'pattern': {
        const matched = findMatchingPattern(changeName, strategy);
        packageName = matched || defaultPackage;
        break;
      }
      case 'explicit': {
        packageName = strategy.mapping[changeName] || defaultPackage;
        break;
      }
      default:
        packageName = defaultPackage;
    }

    // Fallback to default package
    if (!packageName) {
      packageName = defaultPackage;
    }

    if (!assignments.has(packageName)) {
      assignments.set(packageName, new Set());
    }
    assignments.get(packageName)!.add(changeName);
  }

  return assignments;
}

/**
 * Merge small packages into larger ones
 */
export function mergeSmallPackages(
  assignments: Map<string, Set<string>>,
  minChanges: number,
  defaultPackage: string = 'core'
): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();

  // Ensure default package exists
  if (!result.has(defaultPackage)) {
    result.set(defaultPackage, new Set());
  }

  for (const [pkg, changes] of assignments) {
    if (changes.size < minChanges && pkg !== defaultPackage) {
      // Merge into default package
      const defaultChanges = result.get(defaultPackage)!;
      for (const change of changes) {
        defaultChanges.add(change);
      }
    } else {
      result.set(pkg, new Set(changes));
    }
  }

  // Remove empty default package if it exists
  if (result.get(defaultPackage)?.size === 0) {
    result.delete(defaultPackage);
  }

  return result;
}

/**
 * Build package-level dependency graph
 */
export function buildPackageDependencies(
  graph: DependencyGraph,
  assignments: Map<string, Set<string>>
): Map<string, Set<string>> {
  const packageDeps = new Map<string, Set<string>>();

  // Build reverse lookup: change -> package
  const changeToPackage = new Map<string, string>();
  for (const [pkg, changes] of assignments) {
    packageDeps.set(pkg, new Set());
    for (const change of changes) {
      changeToPackage.set(change, pkg);
    }
  }

  // Check each change's dependencies
  for (const [changeName, deps] of graph.edges) {
    const myPackage = changeToPackage.get(changeName);
    if (!myPackage) continue;

    for (const dep of deps) {
      const depPackage = changeToPackage.get(dep);

      if (depPackage && depPackage !== myPackage) {
        // Cross-package dependency
        packageDeps.get(myPackage)!.add(depPackage);
      }
    }
  }

  return packageDeps;
}

/**
 * Detect cycles in package dependency graph
 */
export function detectPackageCycle(deps: Map<string, Set<string>>): string[] | null {
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function dfs(pkg: string, path: string[]): string[] | null {
    if (visiting.has(pkg)) {
      return [...path, pkg];
    }
    if (visited.has(pkg)) return null;

    visiting.add(pkg);
    const pkgDeps = deps.get(pkg) || new Set();
    for (const dep of pkgDeps) {
      const cycle = dfs(dep, [...path, pkg]);
      if (cycle) return cycle;
    }
    visiting.delete(pkg);
    visited.add(pkg);
    return null;
  }

  for (const pkg of deps.keys()) {
    const cycle = dfs(pkg, []);
    if (cycle) return cycle;
  }
  return null;
}

/**
 * Compute deployment order for packages (topological sort)
 */
export function computeDeployOrder(packageDeps: Map<string, Set<string>>): string[] {
  const order: string[] = [];
  const visited = new Set<string>();
  const allPackages = new Set<string>();

  // Collect all packages
  for (const pkg of packageDeps.keys()) {
    allPackages.add(pkg);
  }
  for (const deps of packageDeps.values()) {
    for (const dep of deps) {
      allPackages.add(dep);
    }
  }

  function visit(pkg: string): void {
    if (visited.has(pkg)) return;
    visited.add(pkg);

    const deps = packageDeps.get(pkg) || new Set();
    for (const dep of deps) {
      visit(dep);
    }

    order.push(pkg);
  }

  // Visit all packages (sorted for determinism)
  for (const pkg of [...allPackages].sort()) {
    visit(pkg);
  }

  return order;
}

/**
 * Topological sort of changes within a package
 */
export function topologicalSortWithinPackage(
  changes: Set<string>,
  graph: DependencyGraph
): string[] {
  const result: string[] = [];
  const visited = new Set<string>();

  function visit(change: string): void {
    if (visited.has(change)) return;
    if (!changes.has(change)) return;

    visited.add(change);

    const deps = graph.edges.get(change) || new Set();
    for (const dep of deps) {
      if (changes.has(dep)) {
        visit(dep);
      }
    }

    result.push(change);
  }

  // Visit in alphabetical order for determinism
  for (const change of [...changes].sort()) {
    visit(change);
  }

  return result;
}

/**
 * Generate plan file content for a package
 */
export function generatePlanContent(
  pkgName: string,
  entries: Change[],
  tags: Tag[] = []
): string {
  let content = `%syntax-version=1.0.0\n`;
  content += `%project=${pkgName}\n`;
  content += `%uri=${pkgName}\n\n`;

  for (const entry of entries) {
    let line = entry.name;

    if (entry.dependencies && entry.dependencies.length > 0) {
      line += ` [${entry.dependencies.join(' ')}]`;
    }

    if (entry.timestamp) {
      line += ` ${entry.timestamp}`;
      if (entry.planner) {
        line += ` ${entry.planner}`;
        if (entry.email) {
          line += ` <${entry.email}>`;
        }
      }
    }

    if (entry.comment) {
      line += ` # ${entry.comment}`;
    }

    content += line + '\n';

    // Add tags associated with this change
    const changeTags = tags.filter(t => t.change === entry.name);
    for (const tag of changeTags) {
      let tagLine = `@${tag.name}`;
      if (tag.timestamp) {
        tagLine += ` ${tag.timestamp}`;
        if (tag.planner) {
          tagLine += ` ${tag.planner}`;
          if (tag.email) {
            tagLine += ` <${tag.email}>`;
          }
        }
      }
      if (tag.comment) {
        tagLine += ` # ${tag.comment}`;
      }
      content += tagLine + '\n';
    }
  }

  return content;
}

/**
 * Generate control file content for a package
 */
export function generateControlContent(
  pkgName: string,
  deps: Set<string>
): string {
  let content = `# ${pkgName} extension\n`;
  content += `comment = '${pkgName} module'\n`;
  content += `default_version = '0.0.1'\n`;
  content += `relocatable = false\n`;

  if (deps.size > 0) {
    content += `requires = '${[...deps].sort().join(', ')}'\n`;
  }

  return content;
}

/**
 * Generate a single package output
 */
export function generateSinglePackage(
  pkgName: string,
  changes: Set<string>,
  graph: DependencyGraph,
  changeToPackage: Map<string, string>,
  pkgDeps: Set<string>,
  useTagsForCrossPackageDeps: boolean = false
): PackageOutput {
  // Sort changes in topological order within package
  const sortedChanges = topologicalSortWithinPackage(changes, graph);

  // Build plan entries with updated dependencies
  const planEntries: Change[] = [];

  for (const changeName of sortedChanges) {
    const originalChange = graph.nodes.get(changeName)!;
    const deps = graph.edges.get(changeName) || new Set();

    const newDeps: string[] = [];

    for (const dep of deps) {
      const depPkg = changeToPackage.get(dep);

      if (!depPkg) {
        // External dependency (from installed module) - keep as-is
        newDeps.push(dep);
      } else if (depPkg === pkgName) {
        // Internal dependency - keep as-is
        newDeps.push(dep);
      } else {
        // Cross-package dependency
        if (useTagsForCrossPackageDeps) {
          // Find latest tag in the dependency package
          const depPkgChanges = [...graph.nodes.keys()]
            .filter(c => changeToPackage.get(c) === depPkg);
          const lastChange = depPkgChanges[depPkgChanges.length - 1];
          const tags = graph.tags.get(lastChange);

          if (tags && tags.length > 0) {
            const latestTag = tags[tags.length - 1];
            newDeps.push(`${depPkg}:@${latestTag.name}`);
          } else {
            newDeps.push(`${depPkg}:${dep}`);
          }
        } else {
          newDeps.push(`${depPkg}:${dep}`);
        }
      }
    }

    planEntries.push({
      name: changeName,
      dependencies: newDeps,
      timestamp: originalChange.timestamp,
      planner: originalChange.planner,
      email: originalChange.email,
      comment: originalChange.comment
    });
  }

  // Collect tags for this package
  const packageTags: Tag[] = [];
  for (const changeName of sortedChanges) {
    const changeTags = graph.tags.get(changeName) || [];
    packageTags.push(...changeTags);
  }

  // Generate plan content
  const planContent = generatePlanContent(pkgName, planEntries, packageTags);

  // Generate control file content
  const controlContent = generateControlContent(pkgName, pkgDeps);

  return {
    name: pkgName,
    planContent,
    controlContent,
    changes: planEntries,
    packageDependencies: [...pkgDeps]
  };
}

/**
 * Main slicing function
 */
export function slicePlan(config: SliceConfig): SliceResult {
  // Parse the source plan file
  const planResult = parsePlanFile(config.sourcePlan);
  if (!planResult.data) {
    const errorMessages = planResult.errors?.map(e => `Line ${e.line}: ${e.message}`).join('\n') || 'Unknown error';
    throw new Error(`Failed to parse plan file: ${errorMessages}`);
  }

  const plan = planResult.data;
  const warnings: SliceWarning[] = [];

  // Build dependency graph
  const graph = buildDependencyGraph(plan);

  // Validate DAG
  try {
    validateDAG(graph);
  } catch (error) {
    throw new Error(`Invalid plan file: ${(error as Error).message}`);
  }

  // Assign changes to packages
  let assignments = assignChangesToPackages(
    graph,
    config.strategy,
    config.defaultPackage || 'core'
  );

  // Merge small packages if configured
  if (config.minChangesPerPackage && config.minChangesPerPackage > 1) {
    assignments = mergeSmallPackages(
      assignments,
      config.minChangesPerPackage,
      config.defaultPackage || 'core'
    );
  }

  // Build package dependencies
  const packageDeps = buildPackageDependencies(graph, assignments);

  // Check for package cycles
  const cycle = detectPackageCycle(packageDeps);
  if (cycle) {
    warnings.push({
      type: 'cycle_detected',
      message: `Package cycle detected: ${cycle.join(' -> ')}`,
      suggestedAction: 'Consider merging these packages or reorganizing dependencies'
    });
    // For now, we'll proceed but warn - in production we might want to auto-merge
  }

  // Build reverse lookup
  const changeToPackage = new Map<string, string>();
  for (const [pkg, changes] of assignments) {
    for (const change of changes) {
      changeToPackage.set(change, pkg);
    }
  }

  // Compute deploy order
  const deployOrder = computeDeployOrder(packageDeps);

  // Generate packages
  const packages: PackageOutput[] = [];

  for (const pkgName of deployOrder) {
    const changes = assignments.get(pkgName);
    if (!changes || changes.size === 0) continue;

    const pkgOutput = generateSinglePackage(
      pkgName,
      changes,
      graph,
      changeToPackage,
      packageDeps.get(pkgName) || new Set(),
      config.useTagsForCrossPackageDeps || false
    );

    packages.push(pkgOutput);

    // Check for heavy cross-package dependencies
    let crossDeps = 0;
    let totalDeps = 0;

    for (const change of changes) {
      const deps = graph.edges.get(change) || new Set();
      for (const dep of deps) {
        totalDeps++;
        const depPkg = changeToPackage.get(dep);
        if (depPkg && depPkg !== pkgName) {
          crossDeps++;
        }
      }
    }

    const ratio = totalDeps > 0 ? crossDeps / totalDeps : 0;
    if (ratio > 0.5) {
      warnings.push({
        type: 'heavy_cross_deps',
        message: `Package "${pkgName}" has ${Math.round(ratio * 100)}% cross-package dependencies`,
        suggestedAction: 'Consider merging with dependent packages or reorganizing'
      });
    }
  }

  // Calculate stats
  let internalEdges = 0;
  let crossPackageEdges = 0;

  for (const [change, deps] of graph.edges) {
    const myPkg = changeToPackage.get(change);
    for (const dep of deps) {
      const depPkg = changeToPackage.get(dep);
      if (depPkg === myPkg) {
        internalEdges++;
      } else if (depPkg) {
        crossPackageEdges++;
      }
    }
  }

  const totalEdges = internalEdges + crossPackageEdges;

  return {
    packages,
    workspace: {
      packages: deployOrder,
      deployOrder,
      dependencies: Object.fromEntries(
        [...packageDeps.entries()].map(([k, v]) => [k, [...v].sort()])
      )
    },
    warnings,
    stats: {
      totalChanges: graph.nodes.size,
      packagesCreated: packages.length,
      internalEdges,
      crossPackageEdges,
      crossPackageRatio: totalEdges > 0 ? crossPackageEdges / totalEdges : 0
    }
  };
}
