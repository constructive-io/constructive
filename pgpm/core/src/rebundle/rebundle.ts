import { readFileSync } from 'fs';
import { join } from 'path';

import { getChanges } from '../files/plan/parser';
import { resolveWithPlan } from '../resolution/resolve';
import {
  buildDependencyGraph,
  buildPackageDependencies,
  computeDeployOrder,
  detectPackageCycle,
  extractPackageFromPath,
} from '../slice/slice';
import { parsePlanFile } from '../files/plan/parser';
import { DependencyGraph, SliceWarning } from '../slice/types';
import { Chunk, RebundleResult, RebundleStrategy } from './types';

/**
 * Derive the boundary key for a change under the given strategy.
 * Consecutive changes sharing a key may be merged into the same chunk.
 */
function boundaryKey(changeName: string, strategy: RebundleStrategy): string {
  if (strategy.boundary === 'none') return '';
  const depth = strategy.depth ?? 1;
  const prefix = strategy.prefixToStrip ?? 'schemas';
  return extractPackageFromPath(changeName, depth, prefix);
}

/**
 * Assign changes to chunks by walking the source plan in order and greedily
 * accumulating consecutive changes that share a boundary key, sealing a chunk
 * when the key changes, the size cap is reached, or a member carries a tag
 * (tags mark points you can `deploy --to @tag`, so they must stay chunk seams).
 *
 * Because chunks are contiguous runs of the plan, member and chunk order both
 * follow the source, which is what guarantees byte-identical output.
 */
function assignChunks(
  orderedChanges: string[],
  graph: DependencyGraph,
  strategy: RebundleStrategy
): { name: string; members: string[] }[] {
  const chunks: { name: string; members: string[]; key: string }[] = [];
  const seen = new Map<string, number>();
  const maxSize = strategy.maxChunkSize && strategy.maxChunkSize > 0 ? strategy.maxChunkSize : Infinity;

  let current: { name: string; members: string[]; key: string } | null = null;

  const seal = (): void => {
    current = null;
  };

  for (const change of orderedChanges) {
    const key = boundaryKey(change, strategy);
    const changeHasTag = (graph.tags.get(change)?.length ?? 0) > 0;

    if (
      current &&
      current.key === key &&
      current.members.length < maxSize
    ) {
      current.members.push(change);
    } else {
      // Deterministic, collision-free chunk name: boundary key (or 'chunk'),
      // suffixed with an ordinal when the same key splits across size caps.
      const base = key || 'chunk';
      const ordinal = (seen.get(base) ?? 0) + 1;
      seen.set(base, ordinal);
      const name = ordinal === 1 ? base : `${base}~${ordinal}`;
      current = { name, members: [change], key };
      chunks.push(current);
    }

    // A member that is a tag anchor seals the chunk after inclusion.
    if (changeHasTag) seal();
  }

  return chunks.map(({ name, members }) => ({ name, members }));
}

/**
 * Compute a rebundle plan for a pgpm module directory.
 *
 * Uses the existing plan parser, dependency graph, and package-dependency /
 * deploy-order primitives from the slicer — chunks are treated exactly like
 * packages for dependency and ordering purposes. No plan re-parsing or path
 * logic is reinvented here.
 */
export function rebundlePlan(moduleDir: string, strategy: RebundleStrategy = {}): RebundleResult {
  const planPath = join(moduleDir, 'pgpm.plan');
  const planResult = parsePlanFile(planPath);
  if (!planResult.data) {
    const msg = planResult.errors?.map(e => `Line ${e.line}: ${e.message}`).join('\n') || 'Unknown error';
    throw new Error(`Failed to parse plan file: ${msg}`);
  }

  const graph = buildDependencyGraph(planResult.data);
  const orderedChanges = planResult.data.changes.map(c => c.name);

  const warnings: SliceWarning[] = [];

  const rawChunks = assignChunks(orderedChanges, graph, strategy);

  // Reverse lookup change -> chunk, reusing slice's package-dep machinery.
  const assignments = new Map<string, Set<string>>();
  const changeToChunk = new Map<string, string>();
  for (const chunk of rawChunks) {
    assignments.set(chunk.name, new Set(chunk.members));
    for (const member of chunk.members) changeToChunk.set(member, chunk.name);
  }

  const chunkDeps = buildPackageDependencies(graph, assignments);

  const cycle = detectPackageCycle(chunkDeps);
  if (cycle) {
    warnings.push({
      type: 'cycle_detected',
      message: `Chunk cycle detected: ${cycle.join(' -> ')}`,
      suggestedAction: 'Widen the boundary or raise maxChunkSize so cyclic changes share a chunk',
    });
  }

  const deployOrder = computeDeployOrder(chunkDeps);

  // Because chunks are contiguous runs of the source plan, the greedy creation
  // order is already a valid deploy order. If the dependency-derived order
  // disagrees, the boundary split a back-edge — surface it rather than silently
  // reordering (that would break byte-identical output).
  const creationOrder = rawChunks.map(c => c.name);
  const orderMatches =
    deployOrder.length === creationOrder.length &&
    deployOrder.every((name, i) => name === creationOrder[i]);
  if (!orderMatches) {
    warnings.push({
      type: 'heavy_cross_deps',
      message: 'Chunk deploy order differs from source order; a boundary split a dependency edge',
      suggestedAction: 'Adjust the boundary/maxChunkSize so dependent changes stay contiguous',
    });
  }

  const chunkByName = new Map(rawChunks.map(c => [c.name, c.members]));

  const chunks: Chunk[] = creationOrder.map(name => {
    const members = chunkByName.get(name)!;
    return {
      name,
      deploy: members,
      verify: members,
      revert: [...members].reverse(),
      dependencies: [...(chunkDeps.get(name) ?? new Set())].sort(),
    };
  });

  return {
    chunks,
    deployOrder: creationOrder,
    warnings,
    sourceChanges: planResult.data.changes,
  };
}

/**
 * Assemble the merged SQL for one chunk in the given direction by concatenating
 * its member script files — the same file-concatenation `resolveWithPlan` uses,
 * just scoped to the chunk. Members are already correctly ordered per direction.
 */
export function assembleChunkSql(
  moduleDir: string,
  chunk: Chunk,
  scriptType: 'deploy' | 'revert' | 'verify' = 'deploy'
): string {
  const members = scriptType === 'revert' ? chunk.revert : scriptType === 'verify' ? chunk.verify : chunk.deploy;
  const parts: string[] = [];
  for (const change of members) {
    parts.push(readFileSync(join(moduleDir, scriptType, `${change}.sql`), 'utf-8'));
  }
  return parts.join('\n');
}

/**
 * Byte-identical gate: assembling all chunks in deploy order must reproduce the
 * module's original resolved output in every direction the engine cares about
 * (deploy topological, verify in deploy order, revert reversed). This is the
 * invariant that makes any granularity-dial position safe.
 */
export function verifyRebundleInvariant(
  moduleDir: string,
  result: RebundleResult
): { ok: boolean; mismatches: ('deploy' | 'revert' | 'verify')[] } {
  const mismatches: ('deploy' | 'revert' | 'verify')[] = [];

  const assembled = (scriptType: 'deploy' | 'revert' | 'verify'): string => {
    const chunks = scriptType === 'revert' ? [...result.chunks].reverse() : result.chunks;
    return chunks.map(chunk => assembleChunkSql(moduleDir, chunk, scriptType)).join('\n');
  };

  // deploy / revert have canonical resolvers; verify concatenates in deploy order.
  const originalVerify = getChanges(join(moduleDir, 'pgpm.plan'))
    .map(change => readFileSync(join(moduleDir, 'verify', `${change}.sql`), 'utf-8'))
    .join('\n');

  if (assembled('deploy') !== resolveWithPlan(moduleDir, 'deploy')) mismatches.push('deploy');
  if (assembled('revert') !== resolveWithPlan(moduleDir, 'revert')) mismatches.push('revert');
  if (assembled('verify') !== originalVerify) mismatches.push('verify');

  return { ok: mismatches.length === 0, mismatches };
}
