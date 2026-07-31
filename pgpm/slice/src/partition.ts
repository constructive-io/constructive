import { parsePlanFile } from '@pgpmjs/ast/files/plan/parser';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { AstEdges, buildAstEdges } from './closure';
import { objectKey } from './object-graph';
import { extractSqlFacts, SqlObjectRef } from './refs';
import { buildDependencyGraph } from './slice';
import { DependencyGraph } from './types';

/**
 * A change is *per-tenant* when it must be materialized once per instance
 * (its objects are duplicated across tenants), and *shared* when it can be
 * deployed a single time and reused. The partition is derived purely from the
 * reference graph: any change that (transitively) reaches a per-tenant seed is
 * itself per-tenant; everything else is provably tenant-independent.
 */
export interface PartitionResult {
  /** Changes that must be transpiled per tenant (a seed, or a dependent of one). */
  perTenant: Set<string>;
  /** Changes safe to deploy once and share across all instances. */
  shared: Set<string>;
  /**
   * For each per-tenant change, the shared changes it depends on. This is the
   * cross-boundary edge set: a per-tenant module `requires` the shared module
   * that owns these changes. Shared changes never depend on per-tenant ones by
   * construction, so the boundary is one-directional.
   */
  sharedDependencies: Map<string, Set<string>>;
  /** Conditions that make the partition potentially unsound (see below). */
  warnings: PartitionWarning[];
}

export interface PartitionWarning {
  /**
   * - `dynamic-sql`: a change classified as shared runs `EXECUTE`, so its true
   *   references are invisible to the parser — it *might* touch per-tenant data
   *   and be unsafe to share. The partition cannot prove otherwise.
   * - `unresolved-reference`: a reference no change in the plan produces (an
   *   installed module / extension); informational, not a soundness problem.
   * - `unknown-seed`: a requested seed change is not in the plan.
   */
  kind: 'dynamic-sql' | 'unresolved-reference' | 'unknown-seed';
  change: string;
  detail: string;
}

/** The dependency edges of a change: declared plan `requires` + AST-discovered. */
function dependenciesOf(change: string, graph: DependencyGraph, astEdges: AstEdges): Set<string> {
  const deps = new Set<string>();
  for (const dep of graph.edges.get(change) ?? []) {
    if (graph.nodes.has(dep)) deps.add(dep);
  }
  for (const dep of astEdges.edges.get(change)?.keys() ?? []) deps.add(dep);
  return deps;
}

export interface PartitionInput {
  graph: DependencyGraph;
  astEdges: AstEdges;
  /** Change names whose objects are duplicated per tenant. */
  seeds: Iterable<string>;
}

/**
 * Pure partition core: classify every change in the graph as per-tenant or
 * shared by propagating "per-tenant-ness" from the seeds along dependency
 * edges (a change that depends on a per-tenant change is itself per-tenant).
 *
 * Deterministic and I/O-free — the on-disk entry point is
 * {@link partitionModule}.
 */
export function partitionChanges(input: PartitionInput): PartitionResult {
  const { graph, astEdges } = input;
  const warnings: PartitionWarning[] = [];

  // dependents[x] = every change that depends on x (reverse of dependenciesOf).
  const dependents = new Map<string, Set<string>>();
  for (const change of graph.nodes.keys()) {
    for (const dep of dependenciesOf(change, graph, astEdges)) {
      (dependents.get(dep) ?? dependents.set(dep, new Set()).get(dep)!).add(change);
    }
  }

  // Propagate per-tenant status from the seeds up through their dependents.
  const perTenant = new Set<string>();
  const queue: string[] = [];
  for (const seed of input.seeds) {
    if (!graph.nodes.has(seed)) {
      warnings.push({ kind: 'unknown-seed', change: seed, detail: 'seed change is not in the plan' });
      continue;
    }
    if (!perTenant.has(seed)) {
      perTenant.add(seed);
      queue.push(seed);
    }
  }
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const dependent of dependents.get(current) ?? []) {
      if (perTenant.has(dependent)) continue;
      perTenant.add(dependent);
      queue.push(dependent);
    }
  }

  const shared = new Set<string>();
  for (const change of graph.nodes.keys()) {
    if (!perTenant.has(change)) shared.add(change);
  }

  const sharedDependencies = new Map<string, Set<string>>();
  for (const change of perTenant) {
    const sharedDeps = new Set<string>();
    for (const dep of dependenciesOf(change, graph, astEdges)) {
      if (shared.has(dep)) sharedDeps.add(dep);
    }
    if (sharedDeps.size > 0) sharedDependencies.set(change, sharedDeps);
  }

  // A shared change that runs dynamic SQL could secretly reference per-tenant
  // data the parser can't see — flag it so callers don't share it blindly.
  for (const change of astEdges.dynamicSqlChanges) {
    if (shared.has(change)) {
      warnings.push({
        kind: 'dynamic-sql',
        change,
        detail: 'shared change executes dynamic SQL; hidden references cannot be proven tenant-independent'
      });
    }
  }
  for (const { change, ref } of astEdges.unresolvedReferences) {
    warnings.push({ kind: 'unresolved-reference', change, detail: `references ${ref}, produced by no change in the plan` });
  }

  return { perTenant, shared, sharedDependencies, warnings };
}

export interface PartitionModuleOptions {
  /** Module root containing `pgpm.plan` and `deploy/`. */
  moduleDir: string;
  /** Objects that are inherently per-tenant (e.g. a tenant-owned table). */
  seedObjects: SqlObjectRef[];
  /** Plan path override (defaults to `<moduleDir>/pgpm.plan`). */
  planPath?: string;
}

export interface PartitionModuleResult extends PartitionResult {
  /** The change that produces each seed object, in resolution order. */
  seedChanges: string[];
}

/**
 * On-disk entry point: parse a module's plan + deploy SQL, resolve the given
 * per-tenant seed *objects* to the changes that create them, and partition the
 * module into shared vs per-tenant changes.
 *
 * `loadModule()` from `plpgsql-parser` must have been awaited first (the SQL
 * fact extraction is synchronous over the WASM parser).
 */
export function partitionModule(options: PartitionModuleOptions): PartitionModuleResult {
  const planPath = options.planPath ?? join(options.moduleDir, 'pgpm.plan');
  const parsed = parsePlanFile(planPath);
  if (!parsed.data) {
    const msg = parsed.errors?.map(e => `Line ${e.line}: ${e.message}`).join('\n') || 'Unknown error';
    throw new Error(`Failed to parse plan file: ${msg}`);
  }
  const graph = buildDependencyGraph(parsed.data);

  // Producer index in plan order: first change creating an object wins.
  const producerByObject = new Map<string, string>();
  for (const change of parsed.data.changes) {
    const deployPath = join(options.moduleDir, 'deploy', `${change.name}.sql`);
    if (!existsSync(deployPath)) continue;
    const facts = extractSqlFacts(readFileSync(deployPath, 'utf-8'));
    for (const c of facts.creates) {
      const key = objectKey(c);
      if (!producerByObject.has(key)) producerByObject.set(key, change.name);
    }
  }

  const seedChanges: string[] = [];
  const unresolvedSeeds: PartitionWarning[] = [];
  for (const obj of options.seedObjects) {
    const producer = producerByObject.get(objectKey(obj));
    if (!producer) {
      unresolvedSeeds.push({
        kind: 'unknown-seed',
        change: obj.schema ? `${obj.schema}.${obj.name}` : obj.name,
        detail: 'no change in the module creates this seed object'
      });
      continue;
    }
    if (!seedChanges.includes(producer)) seedChanges.push(producer);
  }

  const astEdges = buildAstEdges(graph, options.moduleDir);
  const result = partitionChanges({ graph, astEdges, seeds: seedChanges });
  return { ...result, seedChanges, warnings: [...unresolvedSeeds, ...result.warnings] };
}
