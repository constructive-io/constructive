import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { objectKey } from './object-graph';
import { extractSqlFacts } from './refs';
import {
  ClosureAutoInclude,
  ClosureReport,
  DependencyGraph,
  PatternStrategy
} from './types';

function refLabel(schema: string | null, name: string): string {
  return schema ? `${schema}.${name}` : name;
}

/**
 * AST-discovered dependency edges between plan changes.
 */
export interface AstEdges {
  /** change -> (dependency change -> the referenced object that links them) */
  edges: Map<string, Map<string, string>>;
  /** Changes whose PL/pgSQL bodies execute dynamic SQL (edges incomplete). */
  dynamicSqlChanges: string[];
  /** Schema-qualified references no change in the plan produces. */
  unresolvedReferences: { change: string; ref: string }[];
}

/**
 * Parse each change's deploy SQL and derive dependency edges from the
 * schema-qualified objects it references, mapped back to the plan change that
 * creates each object. Only edges between plan-known changes are produced —
 * references to objects created outside the plan (installed modules,
 * extensions) are reported as unresolved instead.
 */
export function buildAstEdges(graph: DependencyGraph, moduleDir: string): AstEdges {
  const facts = new Map<string, ReturnType<typeof extractSqlFacts>>();

  for (const changeName of graph.nodes.keys()) {
    const deployPath = join(moduleDir, 'deploy', `${changeName}.sql`);
    if (!existsSync(deployPath)) continue;
    facts.set(changeName, extractSqlFacts(readFileSync(deployPath, 'utf-8')));
  }

  // Producer index in plan order: first change creating an object wins.
  const producerByObject = new Map<string, string>();
  for (const change of graph.plan.changes) {
    const f = facts.get(change.name);
    if (!f) continue;
    for (const c of f.creates) {
      const key = objectKey(c);
      if (!producerByObject.has(key)) producerByObject.set(key, change.name);
    }
  }

  const edges = new Map<string, Map<string, string>>();
  const dynamicSqlChanges: string[] = [];
  const unresolvedReferences: { change: string; ref: string }[] = [];

  for (const [changeName, f] of facts) {
    if (f.dynamicSql) dynamicSqlChanges.push(changeName);
    for (const r of f.references) {
      const producer = producerByObject.get(objectKey(r));
      if (!producer) {
        unresolvedReferences.push({ change: changeName, ref: refLabel(r.schema, r.name) });
        continue;
      }
      if (producer === changeName) continue;
      if (!edges.has(changeName)) edges.set(changeName, new Map());
      const deps = edges.get(changeName)!;
      if (!deps.has(producer)) deps.set(producer, refLabel(r.schema, r.name));
    }
  }

  return { edges, dynamicSqlChanges, unresolvedReferences };
}

/**
 * Expand the packages of closure-enabled pattern slices to cover the
 * transitive dependency closure of their seed changes.
 *
 * The closure follows declared plan `requires` edges plus AST-discovered
 * edges. Only changes currently assigned to the default package are pulled in
 * — a dependency that another explicit slice claimed stays where it is and
 * remains an ordinary cross-package dependency. Mutates `assignments` in
 * place and returns a report of every auto-included change and why.
 */
export function expandClosures(
  assignments: Map<string, Set<string>>,
  graph: DependencyGraph,
  astEdges: AstEdges,
  strategy: PatternStrategy,
  defaultPackage: string
): ClosureReport {
  const autoIncluded: ClosureAutoInclude[] = [];
  const defaultChanges = assignments.get(defaultPackage) ?? new Set<string>();

  for (const slice of strategy.slices) {
    if (!slice.closure) continue;
    const pkgChanges = assignments.get(slice.packageName);
    if (!pkgChanges || pkgChanges.size === 0) continue;

    const queue = [...pkgChanges];
    const seen = new Set(queue);

    while (queue.length > 0) {
      const current = queue.shift()!;

      const pull = (dep: string, reason: 'requires' | 'ast', ref?: string): void => {
        if (seen.has(dep)) return;
        seen.add(dep);
        if (pkgChanges.has(dep)) {
          queue.push(dep);
          return;
        }
        // A dependency claimed by another explicit slice stays where it is
        // and remains an ordinary cross-package dependency.
        if (!defaultChanges.has(dep)) return;
        defaultChanges.delete(dep);
        pkgChanges.add(dep);
        queue.push(dep);
        autoIncluded.push({
          change: dep,
          package: slice.packageName,
          requiredBy: current,
          reason,
          ...(ref ? { ref } : {})
        });
      };

      for (const dep of graph.edges.get(current) ?? []) {
        if (graph.nodes.has(dep)) pull(dep, 'requires');
      }
      for (const [dep, ref] of astEdges.edges.get(current) ?? []) {
        pull(dep, 'ast', ref);
      }
    }
  }

  return {
    autoIncluded,
    dynamicSqlChanges: astEdges.dynamicSqlChanges,
    unresolvedReferences: astEdges.unresolvedReferences
  };
}
