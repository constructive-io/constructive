# PGPM Migration Slicing Specification

## Overview

This document specifies an algorithm and approach for "slicing" a large PGPM plan file into multiple folder-based subpackages. The goal is to take a monolithic migration set (potentially thousands of changes) and partition it into modular, maintainable packages while preserving correctness and deployment order.

## Problem Statement

### Current State
- A single PGPM module with one `pgpm.plan` file containing N changes
- Changes have dependencies forming a DAG (Directed Acyclic Graph)
- All migrations run in linear order defined by the plan
- Large projects become unwieldy with thousands of files in one package

### Desired State
- Multiple PGPM packages (e.g., `core/`, `auth/`, `rls/`, `graphql/`)
- Each package has its own `pgpm.plan` and `.control` file
- Cross-package dependencies expressed via `package:change` or `package:@tag` syntax
- Workspace-level manifest describing package relationships
- Deployment order preserved across the entire system

## Data Structures

### Input: Single Plan File

```
%syntax-version=1.0.0
%project=myapp
%uri=myapp

schemas/public 2024-01-01T00:00:00Z author <email> # create public schema
extensions/uuid-ossp [schemas/public] 2024-01-01T00:00:01Z author <email>
schemas/auth/tables/users [extensions/uuid-ossp] 2024-01-01T00:00:02Z author <email>
schemas/auth/tables/sessions [schemas/auth/tables/users] 2024-01-01T00:00:03Z author <email>
schemas/auth/functions/authenticate [schemas/auth/tables/users schemas/auth/tables/sessions] 2024-01-01T00:00:04Z author <email>
schemas/graphql/tables/queries [schemas/auth/tables/users] 2024-01-01T00:00:05Z author <email>
schemas/rls/policies/user_access [schemas/auth/tables/users schemas/graphql/tables/queries] 2024-01-01T00:00:06Z author <email>
@v1.0.0 2024-01-01T00:00:07Z author <email> # initial release
```

### Output: Multiple Packages

```
workspace/
├── pgpm.json                    # Workspace manifest
├── packages/
│   ├── core/
│   │   ├── pgpm.plan
│   │   ├── core.control
│   │   ├── deploy/
│   │   │   ├── schemas/public.sql
│   │   │   └── extensions/uuid-ossp.sql
│   │   ├── revert/
│   │   └── verify/
│   ├── auth/
│   │   ├── pgpm.plan            # deps: [core:@v1.0.0]
│   │   ├── auth.control         # requires: core
│   │   ├── deploy/
│   │   │   └── schemas/auth/...
│   │   ├── revert/
│   │   └── verify/
│   ├── graphql/
│   │   ├── pgpm.plan            # deps: [auth:@v1.0.0]
│   │   └── ...
│   └── rls/
│       ├── pgpm.plan            # deps: [auth:@v1.0.0, graphql:@v1.0.0]
│       └── ...
```

### Core Types (TypeScript)

```typescript
interface SlicingConfig {
  /** Source plan file path */
  sourcePlan: string;
  
  /** Output directory for packages */
  outputDir: string;
  
  /** Grouping strategy */
  strategy: GroupingStrategy;
  
  /** Optional explicit mapping overrides */
  explicitMapping?: Record<string, string>;
  
  /** Package for changes that don't match any group */
  defaultPackage?: string;
  
  /** Whether to use tags for cross-package deps */
  useTagsForCrossPackageDeps?: boolean;
  
  /** Minimum changes per package (merge smaller groups) */
  minChangesPerPackage?: number;
}

type GroupingStrategy = 
  | { type: 'folder'; depth: number; prefixToStrip?: string }
  | { type: 'schema'; schemaExtractor: (changeName: string) => string }
  | { type: 'explicit'; mapping: Record<string, string> }
  | { type: 'community'; maxPackages?: number }
  | { type: 'custom'; grouper: (change: Change) => string };

interface SlicingResult {
  /** Generated packages */
  packages: PackageOutput[];
  
  /** Workspace manifest */
  workspace: WorkspaceManifest;
  
  /** Warnings/issues encountered */
  warnings: SlicingWarning[];
  
  /** Statistics */
  stats: SlicingStats;
}

interface PackageOutput {
  name: string;
  planContent: string;
  controlContent: string;
  changes: Change[];
  internalDeps: string[];
  externalDeps: string[];
}

interface WorkspaceManifest {
  packages: string[];
  deployOrder: string[];
  dependencies: Record<string, string[]>;
}

interface SlicingWarning {
  type: 'heavy_cross_deps' | 'cycle_detected' | 'orphan_change' | 'merge_required';
  message: string;
  affectedChanges?: string[];
  suggestedAction?: string;
}

interface SlicingStats {
  totalChanges: number;
  packagesCreated: number;
  internalEdges: number;
  crossPackageEdges: number;
  crossPackageRatio: number;
}
```

## Algorithm

### Phase 1: Parse and Build Dependency Graph

```typescript
function buildDependencyGraph(planPath: string): DependencyGraph {
  const planResult = parsePlanFile(planPath);
  if (!planResult.data) {
    throw new Error(`Failed to parse plan: ${planResult.errors}`);
  }
  
  const { changes, tags } = planResult.data;
  const graph: DependencyGraph = {
    nodes: new Map(),
    edges: new Map(),
    reverseEdges: new Map(),
    tags: new Map()
  };
  
  // Add all changes as nodes
  for (const change of changes) {
    graph.nodes.set(change.name, change);
    graph.edges.set(change.name, new Set(change.dependencies));
    
    // Build reverse edges for dependency analysis
    for (const dep of change.dependencies) {
      if (!graph.reverseEdges.has(dep)) {
        graph.reverseEdges.set(dep, new Set());
      }
      graph.reverseEdges.get(dep)!.add(change.name);
    }
  }
  
  // Index tags by change
  for (const tag of tags) {
    if (!graph.tags.has(tag.change)) {
      graph.tags.set(tag.change, []);
    }
    graph.tags.get(tag.change)!.push(tag);
  }
  
  // Validate DAG (detect cycles)
  validateDAG(graph);
  
  return graph;
}

function validateDAG(graph: DependencyGraph): void {
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
      dfs(dep, [...path, node]);
    }
    visiting.delete(node);
    visited.add(node);
  }
  
  for (const node of graph.nodes.keys()) {
    dfs(node, []);
  }
}
```

### Phase 2: Assign Changes to Packages

```typescript
function assignChangesToPackages(
  graph: DependencyGraph,
  config: SlicingConfig
): Map<string, Set<string>> {
  const assignments = new Map<string, Set<string>>();
  
  // Apply grouping strategy
  for (const [changeName, change] of graph.nodes) {
    let packageName: string;
    
    // Check explicit mapping first
    if (config.explicitMapping?.[changeName]) {
      packageName = config.explicitMapping[changeName];
    } else {
      packageName = applyGroupingStrategy(changeName, change, config.strategy);
    }
    
    // Fallback to default package
    if (!packageName) {
      packageName = config.defaultPackage || 'core';
    }
    
    if (!assignments.has(packageName)) {
      assignments.set(packageName, new Set());
    }
    assignments.get(packageName)!.add(changeName);
  }
  
  // Merge small packages if configured
  if (config.minChangesPerPackage) {
    mergeSmallPackages(assignments, config.minChangesPerPackage);
  }
  
  return assignments;
}

function applyGroupingStrategy(
  changeName: string,
  change: Change,
  strategy: GroupingStrategy
): string {
  switch (strategy.type) {
    case 'folder': {
      // Extract package from folder path
      // e.g., "schemas/auth/tables/users" with depth=2 -> "auth"
      const parts = changeName.split('/');
      const prefix = strategy.prefixToStrip || 'schemas';
      
      // Strip prefix if present
      let startIdx = 0;
      if (parts[0] === prefix) {
        startIdx = 1;
      }
      
      // Handle special folders
      if (parts[0] === 'extensions' || parts[0] === 'migrate') {
        return 'core';
      }
      
      // Get package name at specified depth
      if (parts.length > startIdx) {
        return parts[startIdx];
      }
      return 'core';
    }
    
    case 'schema': {
      return strategy.schemaExtractor(changeName);
    }
    
    case 'explicit': {
      return strategy.mapping[changeName] || 'core';
    }
    
    case 'community': {
      // Community detection would be applied separately
      // This is a placeholder for the algorithm
      return 'core';
    }
    
    case 'custom': {
      return strategy.grouper(change);
    }
  }
}
```

### Phase 3: Validate Partition

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: SlicingWarning[];
  packageDependencies: Map<string, Set<string>>;
}

function validatePartition(
  graph: DependencyGraph,
  assignments: Map<string, Set<string>>
): ValidationResult {
  const errors: string[] = [];
  const warnings: SlicingWarning[] = [];
  const packageDeps = new Map<string, Set<string>>();
  
  // Build reverse lookup: change -> package
  const changeToPackage = new Map<string, string>();
  for (const [pkg, changes] of assignments) {
    for (const change of changes) {
      changeToPackage.set(change, pkg);
    }
  }
  
  // Check each change's dependencies
  for (const [changeName, deps] of graph.edges) {
    const myPackage = changeToPackage.get(changeName)!;
    
    for (const dep of deps) {
      const depPackage = changeToPackage.get(dep);
      
      if (!depPackage) {
        // External dependency (from another workspace module)
        continue;
      }
      
      if (depPackage !== myPackage) {
        // Cross-package dependency
        if (!packageDeps.has(myPackage)) {
          packageDeps.set(myPackage, new Set());
        }
        packageDeps.get(myPackage)!.add(depPackage);
      }
    }
  }
  
  // Check for cycles in package dependency graph
  const pkgCycle = detectPackageCycle(packageDeps);
  if (pkgCycle) {
    errors.push(`Package cycle detected: ${pkgCycle.join(' -> ')}`);
  }
  
  // Warn about heavy cross-package dependencies
  for (const [pkg, changes] of assignments) {
    let crossDeps = 0;
    let totalDeps = 0;
    
    for (const change of changes) {
      const deps = graph.edges.get(change) || new Set();
      for (const dep of deps) {
        totalDeps++;
        const depPkg = changeToPackage.get(dep);
        if (depPkg && depPkg !== pkg) {
          crossDeps++;
        }
      }
    }
    
    const ratio = totalDeps > 0 ? crossDeps / totalDeps : 0;
    if (ratio > 0.5) {
      warnings.push({
        type: 'heavy_cross_deps',
        message: `Package "${pkg}" has ${Math.round(ratio * 100)}% cross-package dependencies`,
        suggestedAction: 'Consider merging with dependent packages or reorganizing'
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    packageDependencies: packageDeps
  };
}

function detectPackageCycle(deps: Map<string, Set<string>>): string[] | null {
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
```

### Phase 4: Resolve Package Cycles (if needed)

```typescript
function resolvePackageCycles(
  graph: DependencyGraph,
  assignments: Map<string, Set<string>>,
  validation: ValidationResult
): Map<string, Set<string>> {
  if (validation.valid) {
    return assignments;
  }
  
  // Strategy: Merge packages that form cycles
  const newAssignments = new Map(assignments);
  
  // Find strongly connected components in package graph
  const sccs = findSCCs(validation.packageDependencies);
  
  for (const scc of sccs) {
    if (scc.length > 1) {
      // Merge all packages in SCC into one
      const mergedName = scc.sort().join('_');
      const mergedChanges = new Set<string>();
      
      for (const pkg of scc) {
        const changes = newAssignments.get(pkg);
        if (changes) {
          for (const change of changes) {
            mergedChanges.add(change);
          }
          newAssignments.delete(pkg);
        }
      }
      
      newAssignments.set(mergedName, mergedChanges);
    }
  }
  
  return newAssignments;
}
```

### Phase 5: Generate Package Order

```typescript
function computeDeployOrder(
  packageDeps: Map<string, Set<string>>
): string[] {
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
```

### Phase 6: Generate Output

```typescript
function generatePackageOutput(
  graph: DependencyGraph,
  assignments: Map<string, Set<string>>,
  packageDeps: Map<string, Set<string>>,
  config: SlicingConfig
): SlicingResult {
  const packages: PackageOutput[] = [];
  const warnings: SlicingWarning[] = [];
  
  // Build reverse lookup
  const changeToPackage = new Map<string, string>();
  for (const [pkg, changes] of assignments) {
    for (const change of changes) {
      changeToPackage.set(change, pkg);
    }
  }
  
  // Compute deploy order
  const deployOrder = computeDeployOrder(packageDeps);
  
  // Generate each package
  for (const pkgName of deployOrder) {
    const changes = assignments.get(pkgName);
    if (!changes) continue;
    
    const pkgOutput = generateSinglePackage(
      pkgName,
      changes,
      graph,
      changeToPackage,
      packageDeps.get(pkgName) || new Set(),
      config
    );
    
    packages.push(pkgOutput);
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
  
  return {
    packages,
    workspace: {
      packages: deployOrder,
      deployOrder,
      dependencies: Object.fromEntries(
        [...packageDeps.entries()].map(([k, v]) => [k, [...v]])
      )
    },
    warnings,
    stats: {
      totalChanges: graph.nodes.size,
      packagesCreated: packages.length,
      internalEdges,
      crossPackageEdges,
      crossPackageRatio: crossPackageEdges / (internalEdges + crossPackageEdges)
    }
  };
}

function generateSinglePackage(
  pkgName: string,
  changes: Set<string>,
  graph: DependencyGraph,
  changeToPackage: Map<string, string>,
  pkgDeps: Set<string>,
  config: SlicingConfig
): PackageOutput {
  // Sort changes in topological order within package
  const sortedChanges = topologicalSortWithinPackage(changes, graph);
  
  // Build plan entries
  const planEntries: Change[] = [];
  const externalDeps: string[] = [];
  
  for (const changeName of sortedChanges) {
    const originalChange = graph.nodes.get(changeName)!;
    const deps = graph.edges.get(changeName) || new Set();
    
    const newDeps: string[] = [];
    
    for (const dep of deps) {
      const depPkg = changeToPackage.get(dep);
      
      if (!depPkg) {
        // External dependency (from installed module)
        newDeps.push(dep);
        if (!externalDeps.includes(dep)) {
          externalDeps.push(dep);
        }
      } else if (depPkg === pkgName) {
        // Internal dependency - keep as-is
        newDeps.push(dep);
      } else {
        // Cross-package dependency
        if (config.useTagsForCrossPackageDeps) {
          // Find latest tag in the dependency package
          const depPkgChanges = [...(graph.nodes.keys())]
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
  
  // Generate plan content
  const planContent = generatePlanContent(pkgName, planEntries);
  
  // Generate control file content
  const controlContent = generateControlContent(pkgName, pkgDeps);
  
  return {
    name: pkgName,
    planContent,
    controlContent,
    changes: planEntries,
    internalDeps: sortedChanges.filter(c => changes.has(c)),
    externalDeps
  };
}

function topologicalSortWithinPackage(
  changes: Set<string>,
  graph: DependencyGraph
): string[] {
  const result: string[] = [];
  const visited = new Set<string>();
  
  function visit(change: string): void {
    if (visited.has(change)) return;
    if (!changes.has(change)) return; // Skip changes not in this package
    
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

function generatePlanContent(pkgName: string, entries: Change[]): string {
  let content = `%syntax-version=1.0.0\n`;
  content += `%project=${pkgName}\n`;
  content += `%uri=${pkgName}\n\n`;
  
  for (const entry of entries) {
    let line = entry.name;
    
    if (entry.dependencies.length > 0) {
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
  }
  
  return content;
}

function generateControlContent(pkgName: string, deps: Set<string>): string {
  let content = `# ${pkgName} extension\n`;
  content += `comment = '${pkgName} module'\n`;
  content += `default_version = '0.0.1'\n`;
  content += `relocatable = false\n`;
  
  if (deps.size > 0) {
    content += `requires = '${[...deps].sort().join(', ')}'\n`;
  }
  
  return content;
}
```

## Correctness Conditions

### 1. Completeness
Every change from the original plan must appear in exactly one output package.

```typescript
function verifyCompleteness(
  original: Set<string>,
  packages: PackageOutput[]
): boolean {
  const allOutputChanges = new Set<string>();
  
  for (const pkg of packages) {
    for (const change of pkg.changes) {
      if (allOutputChanges.has(change.name)) {
        throw new Error(`Duplicate change: ${change.name}`);
      }
      allOutputChanges.add(change.name);
    }
  }
  
  for (const change of original) {
    if (!allOutputChanges.has(change)) {
      throw new Error(`Missing change: ${change}`);
    }
  }
  
  return true;
}
```

### 2. Dependency Satisfaction
For each change C with dependency D:
- D is in the same package AND appears before C in the plan, OR
- D is in another package that is declared as a dependency

```typescript
function verifyDependencies(
  packages: PackageOutput[],
  workspace: WorkspaceManifest
): boolean {
  const changeLocation = new Map<string, string>();
  const changeOrder = new Map<string, number>();
  
  // Build location and order maps
  for (const pkg of packages) {
    let order = 0;
    for (const change of pkg.changes) {
      changeLocation.set(change.name, pkg.name);
      changeOrder.set(`${pkg.name}:${change.name}`, order++);
    }
  }
  
  // Verify each dependency
  for (const pkg of packages) {
    for (const change of pkg.changes) {
      for (const dep of change.dependencies) {
        // Parse dependency
        const [depPkg, depChange] = dep.includes(':') 
          ? dep.split(':') 
          : [pkg.name, dep];
        
        // Skip tag references (they're validated separately)
        if (depChange.startsWith('@')) continue;
        
        if (depPkg === pkg.name) {
          // Internal dependency - must appear before
          const myOrder = changeOrder.get(`${pkg.name}:${change.name}`)!;
          const depOrder = changeOrder.get(`${pkg.name}:${depChange}`);
          
          if (depOrder === undefined || depOrder >= myOrder) {
            throw new Error(
              `Invalid order: ${change.name} depends on ${depChange} but it appears later`
            );
          }
        } else {
          // Cross-package dependency - package must be declared
          const pkgDeps = workspace.dependencies[pkg.name] || [];
          if (!pkgDeps.includes(depPkg)) {
            throw new Error(
              `Undeclared package dependency: ${pkg.name} -> ${depPkg}`
            );
          }
        }
      }
    }
  }
  
  return true;
}
```

### 3. Package Acyclicity
The package dependency graph must be a DAG.

### 4. Order Preservation
Within each package, the topological order of changes must be maintained.

## Edge Cases and Handling

### 1. Cycles Across Folders (Mutual Dependencies)

**Problem**: Changes in folder A depend on changes in folder B, and vice versa.

**Detection**:
```typescript
function detectCrossGroupCycles(
  graph: DependencyGraph,
  assignments: Map<string, Set<string>>
): string[][] {
  // Build package-level graph and find SCCs
  const pkgGraph = buildPackageGraph(graph, assignments);
  return findSCCs(pkgGraph);
}
```

**Resolution**:
- Merge the cyclically-dependent packages into one
- Warn the user about the merge
- Suggest reorganization

### 2. Heavy Cross-Package Dependencies

**Problem**: A package has more than 50% of its dependencies pointing to other packages.

**Detection**: Calculate cross-package dependency ratio during validation.

**Resolution**:
- Warn the user
- Suggest merging with the most-depended-upon package
- Provide statistics to help decision-making

### 3. Shared Objects (Types/Functions Used Everywhere)

**Problem**: Some objects (like utility functions, common types) are used by many packages.

**Detection**:
```typescript
function findHighFanoutChanges(
  graph: DependencyGraph,
  threshold: number = 5
): string[] {
  const fanout: string[] = [];
  
  for (const [change, dependents] of graph.reverseEdges) {
    if (dependents.size >= threshold) {
      fanout.push(change);
    }
  }
  
  return fanout;
}
```

**Resolution**:
- Place high-fanout changes in a "core" package
- Core package has no dependencies on other packages
- All other packages depend on core

### 4. Boundary Objects (Extensions, Schemas)

**Problem**: PostgreSQL extensions and schema definitions are foundational.

**Detection**: Check for `extensions/` prefix or schema creation patterns.

**Resolution**:
- Always place in "core" package
- Process these first in the grouping phase

### 5. Renames/Reorganization Without Breaking History

**Problem**: Moving changes between packages shouldn't break existing deployments.

**Resolution**:
- Track original change names in metadata
- Generate migration scripts for existing deployments
- Use tags to mark stable points before reorganization

### 6. When to Refuse Splitting

**Conditions**:
- More than 70% of edges are cross-package
- Package cycle cannot be resolved without merging all packages
- Resulting packages would have fewer than N changes each

**Action**:
- Return error with explanation
- Suggest alternative strategies
- Offer to proceed with warnings

## Heuristics for Grouping

### 1. Folder-Based (Primary)

```typescript
function folderBasedGrouping(changeName: string, depth: number = 1): string {
  const parts = changeName.split('/');
  
  // Handle special prefixes
  if (parts[0] === 'schemas' && parts.length > 1) {
    return parts[1]; // e.g., "schemas/auth/..." -> "auth"
  }
  
  if (parts[0] === 'extensions' || parts[0] === 'migrate') {
    return 'core';
  }
  
  // Default: use first segment
  return parts[0] || 'core';
}
```

### 2. Schema-Based

```typescript
function schemaBasedGrouping(changeName: string, sqlContent: string): string {
  // Extract schema from SQL content
  const schemaMatch = sqlContent.match(/CREATE\s+(?:TABLE|FUNCTION|TYPE)\s+(\w+)\./i);
  if (schemaMatch) {
    return schemaMatch[1];
  }
  
  // Fallback to folder-based
  return folderBasedGrouping(changeName);
}
```

### 3. Dependency Community Detection

```typescript
function communityBasedGrouping(
  graph: DependencyGraph,
  maxCommunities: number = 10
): Map<string, string> {
  // Louvain algorithm for community detection
  // Returns mapping of change -> community ID
  
  // Initialize: each node in its own community
  const communities = new Map<string, number>();
  let communityId = 0;
  for (const node of graph.nodes.keys()) {
    communities.set(node, communityId++);
  }
  
  // Iteratively optimize modularity
  let improved = true;
  while (improved) {
    improved = false;
    
    for (const node of graph.nodes.keys()) {
      const currentCommunity = communities.get(node)!;
      let bestCommunity = currentCommunity;
      let bestGain = 0;
      
      // Try moving to neighbor communities
      const neighbors = new Set<number>();
      const deps = graph.edges.get(node) || new Set();
      const reverseDeps = graph.reverseEdges.get(node) || new Set();
      
      for (const dep of [...deps, ...reverseDeps]) {
        neighbors.add(communities.get(dep)!);
      }
      
      for (const targetCommunity of neighbors) {
        const gain = calculateModularityGain(
          graph, communities, node, currentCommunity, targetCommunity
        );
        
        if (gain > bestGain) {
          bestGain = gain;
          bestCommunity = targetCommunity;
        }
      }
      
      if (bestCommunity !== currentCommunity) {
        communities.set(node, bestCommunity);
        improved = true;
      }
    }
  }
  
  // Convert to package names
  const result = new Map<string, string>();
  const communityNames = new Map<number, string>();
  
  for (const [node, comm] of communities) {
    if (!communityNames.has(comm)) {
      communityNames.set(comm, `pkg_${communityNames.size}`);
    }
    result.set(node, communityNames.get(comm)!);
  }
  
  return result;
}
```

### 4. Core-First Layering

```typescript
function coreFirstLayering(graph: DependencyGraph): Map<string, string> {
  const result = new Map<string, string>();
  const layers: string[][] = [];
  const assigned = new Set<string>();
  
  // Layer 0: nodes with no dependencies (roots)
  const layer0: string[] = [];
  for (const [node, deps] of graph.edges) {
    if (deps.size === 0) {
      layer0.push(node);
      assigned.add(node);
    }
  }
  layers.push(layer0);
  
  // Build subsequent layers
  while (assigned.size < graph.nodes.size) {
    const nextLayer: string[] = [];
    
    for (const [node, deps] of graph.edges) {
      if (assigned.has(node)) continue;
      
      // Check if all deps are assigned
      let allDepsAssigned = true;
      for (const dep of deps) {
        if (!assigned.has(dep)) {
          allDepsAssigned = false;
          break;
        }
      }
      
      if (allDepsAssigned) {
        nextLayer.push(node);
      }
    }
    
    for (const node of nextLayer) {
      assigned.add(node);
    }
    
    if (nextLayer.length > 0) {
      layers.push(nextLayer);
    }
  }
  
  // Assign packages based on layers
  // Layer 0-1: core
  // Layer 2+: based on folder structure
  for (let i = 0; i < layers.length; i++) {
    for (const node of layers[i]) {
      if (i <= 1) {
        result.set(node, 'core');
      } else {
        result.set(node, folderBasedGrouping(node));
      }
    }
  }
  
  return result;
}
```

## Complexity Analysis

| Operation | Time Complexity | Space Complexity |
|-----------|-----------------|------------------|
| Parse plan file | O(N) | O(N) |
| Build dependency graph | O(N + E) | O(N + E) |
| Validate DAG | O(N + E) | O(N) |
| Assign to packages | O(N) | O(N) |
| Validate partition | O(N + E) | O(N) |
| Detect package cycles | O(P + PE) | O(P) |
| Compute deploy order | O(P + PE) | O(P) |
| Generate output | O(N + E) | O(N + E) |
| Community detection | O(N log N) | O(N) |

Where:
- N = number of changes
- E = number of dependency edges
- P = number of packages
- PE = number of package-level edges

**Total**: O(N log N + E) for community detection, O(N + E) otherwise.

## Determinism and Stability

To ensure consistent outputs across runs:

1. **Sort changes alphabetically** within each package before processing
2. **Sort packages alphabetically** when generating workspace manifest
3. **Use stable sorting** for topological sort (prefer alphabetical order for ties)
4. **Deterministic timestamps**: Use original timestamps from source plan

```typescript
function stableTopologicalSort(
  changes: Set<string>,
  graph: DependencyGraph
): string[] {
  const result: string[] = [];
  const inDegree = new Map<string, number>();
  const queue: string[] = [];
  
  // Initialize in-degrees
  for (const change of changes) {
    inDegree.set(change, 0);
  }
  
  for (const change of changes) {
    const deps = graph.edges.get(change) || new Set();
    for (const dep of deps) {
      if (changes.has(dep)) {
        inDegree.set(change, inDegree.get(change)! + 1);
      }
    }
  }
  
  // Find initial nodes with in-degree 0
  for (const [change, degree] of inDegree) {
    if (degree === 0) {
      queue.push(change);
    }
  }
  
  // Sort queue alphabetically for determinism
  queue.sort();
  
  while (queue.length > 0) {
    const change = queue.shift()!;
    result.push(change);
    
    // Find dependents within this package
    const dependents = graph.reverseEdges.get(change) || new Set();
    const newZeros: string[] = [];
    
    for (const dependent of dependents) {
      if (!changes.has(dependent)) continue;
      
      const newDegree = inDegree.get(dependent)! - 1;
      inDegree.set(dependent, newDegree);
      
      if (newDegree === 0) {
        newZeros.push(dependent);
      }
    }
    
    // Sort and add to queue for determinism
    newZeros.sort();
    queue.push(...newZeros);
  }
  
  return result;
}
```

## Illustrative Example

### Input: 10 Changes

```
%project=myapp

schemas/public 2024-01-01T00:00:00Z
extensions/uuid [schemas/public] 2024-01-01T00:00:01Z
schemas/auth/types/user_role [schemas/public] 2024-01-01T00:00:02Z
schemas/auth/tables/users [extensions/uuid schemas/auth/types/user_role] 2024-01-01T00:00:03Z
schemas/auth/tables/sessions [schemas/auth/tables/users] 2024-01-01T00:00:04Z
schemas/auth/functions/login [schemas/auth/tables/users schemas/auth/tables/sessions] 2024-01-01T00:00:05Z
schemas/api/tables/requests [schemas/auth/tables/users] 2024-01-01T00:00:06Z
schemas/api/functions/handle [schemas/api/tables/requests] 2024-01-01T00:00:07Z
schemas/rls/policies/user_data [schemas/auth/tables/users schemas/api/tables/requests] 2024-01-01T00:00:08Z
@v1.0.0 2024-01-01T00:00:09Z
```

### Grouping (folder-based, depth=1)

| Change | Package |
|--------|---------|
| schemas/public | core |
| extensions/uuid | core |
| schemas/auth/types/user_role | auth |
| schemas/auth/tables/users | auth |
| schemas/auth/tables/sessions | auth |
| schemas/auth/functions/login | auth |
| schemas/api/tables/requests | api |
| schemas/api/functions/handle | api |
| schemas/rls/policies/user_data | rls |

### Package Dependencies

```
core: []
auth: [core]
api: [core, auth]
rls: [auth, api]
```

### Output: 4 Packages

**core/pgpm.plan**:
```
%project=core
%uri=core

schemas/public 2024-01-01T00:00:00Z
extensions/uuid [schemas/public] 2024-01-01T00:00:01Z
@v1.0.0 2024-01-01T00:00:09Z
```

**auth/pgpm.plan**:
```
%project=auth
%uri=auth

schemas/auth/types/user_role [core:@v1.0.0] 2024-01-01T00:00:02Z
schemas/auth/tables/users [core:extensions/uuid schemas/auth/types/user_role] 2024-01-01T00:00:03Z
schemas/auth/tables/sessions [schemas/auth/tables/users] 2024-01-01T00:00:04Z
schemas/auth/functions/login [schemas/auth/tables/users schemas/auth/tables/sessions] 2024-01-01T00:00:05Z
@v1.0.0 2024-01-01T00:00:09Z
```

**api/pgpm.plan**:
```
%project=api
%uri=api

schemas/api/tables/requests [auth:schemas/auth/tables/users] 2024-01-01T00:00:06Z
schemas/api/functions/handle [schemas/api/tables/requests] 2024-01-01T00:00:07Z
@v1.0.0 2024-01-01T00:00:09Z
```

**rls/pgpm.plan**:
```
%project=rls
%uri=rls

schemas/rls/policies/user_data [auth:schemas/auth/tables/users api:schemas/api/tables/requests] 2024-01-01T00:00:08Z
@v1.0.0 2024-01-01T00:00:09Z
```

### Workspace Manifest (pgpm.json)

```json
{
  "packages": ["packages/*"],
  "slicing": {
    "deployOrder": ["core", "auth", "api", "rls"],
    "dependencies": {
      "core": [],
      "auth": ["core"],
      "api": ["core", "auth"],
      "rls": ["auth", "api"]
    }
  }
}
```

### Statistics

```
Total changes: 9
Packages created: 4
Internal edges: 5
Cross-package edges: 4
Cross-package ratio: 44%
```

## CLI Interface Proposal

```bash
# Basic usage
pgpm export --slice --strategy folder

# With options
pgpm export --slice \
  --strategy folder \
  --depth 2 \
  --output ./packages \
  --use-tags \
  --min-changes 5

# Community detection
pgpm export --slice \
  --strategy community \
  --max-packages 10

# Explicit mapping
pgpm export --slice \
  --strategy explicit \
  --mapping ./slice-config.json

# Dry run (show what would be created)
pgpm export --slice --dry-run

# Validate existing slicing
pgpm slice validate
```

## Integration with Existing PGPM

### New Files

1. `pgpm/core/src/slice/index.ts` - Main slicing logic
2. `pgpm/core/src/slice/strategies.ts` - Grouping strategies
3. `pgpm/core/src/slice/validation.ts` - Validation functions
4. `pgpm/core/src/slice/output.ts` - Output generation
5. `pgpm/cli/src/commands/slice.ts` - CLI command

### Modified Files

1. `pgpm/core/src/export/export-migrations.ts` - Add `--slice` option
2. `pgpm/types/src/pgpm.ts` - Add `SlicingConfig` to workspace config

### Reused Components

- `parsePlanFile()` from `files/plan/parser.ts`
- `writePlanFile()` from `files/plan/writer.ts`
- `PgpmPackage` class for module creation
- `resolveDependencies()` for validation

## Future Enhancements

1. **Interactive mode**: Let users adjust groupings before generating
2. **Visualization**: Generate dependency graph visualization
3. **Incremental slicing**: Add new changes to existing sliced packages
4. **Merge packages**: Combine packages that have grown too interdependent
5. **Split packages**: Further divide packages that have grown too large
6. **Migration path**: Generate scripts to migrate existing deployments
