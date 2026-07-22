import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

import { Change, Tag } from '../files/types';
import { parsePlanFile } from '../files/plan/parser';
import { mergeSqlStatements } from '../packaging/package';
import { resolveWithPlan } from '../resolution/resolve';
import { writeMinimalModule, writeMinimalWorkspace } from '../workspace/minimal';
import { mergeChunkScript } from './module';
import { rebundlePlan } from './rebundle';
import {
  CrossChunkDepMode,
  RebundlePackage,
  RebundleWorkspaceOptions,
  RebundleWorkspaceResult,
} from './types';

/**
 * Materialize a rebundled workspace: emit each chunk as its own tiny module
 * (one merged change) under `packages/<chunk>/`, carrying cross-chunk deps via
 * the control-file `requires` (and optionally a plan cross-reference).
 *
 * This is the "modular workspace" carve — the same monolith sliced into
 * independently publishable module forks (e.g. a users module, an admin module).
 * The emitted directory is a real, discoverable pgpm workspace: it reuses
 * `writeMinimalWorkspace`/`writeMinimalModule` (the minimal deployable file set
 * pgpm recognizes — `pgpm.json`, `pgpm.plan`, `<name>.control`, `Makefile`,
 * `package.json`), `rebundlePlan` for the chunk model, and `mergeChunkScript`
 * for the per-chunk merge.
 */
export async function rebundleWorkspace(
  sourceDir: string,
  options: RebundleWorkspaceOptions
): Promise<RebundleWorkspaceResult> {
  const {
    outputDir,
    overwrite = false,
    pretty = true,
    functionDelimiter = '$EOFCODE$',
    crossChunkDepMode = 'control-only',
    ...strategy
  } = options;

  if (existsSync(outputDir) && readdirSync(outputDir).length > 0 && !overwrite) {
    throw new Error(`Output directory is not empty: ${outputDir}. Pass overwrite: true to replace.`);
  }

  const plan = rebundlePlan(sourceDir, strategy);

  // Remap tags onto their sealing chunk (each tag anchored a chunk boundary).
  const parsed = parsePlanFile(join(sourceDir, 'pgpm.plan'));
  const sourceTags: Tag[] = parsed.data?.tags ?? [];
  const memberToChunk = new Map<string, string>();
  for (const chunk of plan.chunks) {
    for (const member of chunk.deploy) memberToChunk.set(member, chunk.name);
  }
  const remappedTags: Tag[] = sourceTags.map(tag => ({
    ...tag,
    change: memberToChunk.get(tag.change) ?? tag.change,
  }));

  writeMinimalWorkspace(outputDir, { packages: ['packages/*'] });

  const byDeployOrder = [...plan.chunks].sort(
    (a, b) => plan.deployOrder.indexOf(a.name) - plan.deployOrder.indexOf(b.name)
  );

  const packages: RebundlePackage[] = [];

  for (const chunk of byDeployOrder) {
    const pkgRel = join('packages', chunk.name);
    const pkgDir = join(outputDir, pkgRel);

    const scripts: Record<string, { deploy: string; revert: string; verify: string }> = {
      [chunk.name]: {
        deploy: await mergeChunkScript(sourceDir, chunk, 'deploy', { pretty, functionDelimiter }),
        revert: await mergeChunkScript(sourceDir, chunk, 'revert', { pretty, functionDelimiter }),
        verify: await mergeChunkScript(sourceDir, chunk, 'verify', { pretty, functionDelimiter }),
      },
    };

    // Control `requires` always carries the module-level dependency; in
    // 'change' mode the plan additionally records the fine-grained cross-ref.
    const deps = chunk.dependencies;
    const planChange: Change = {
      name: chunk.name,
      dependencies: planChangeDeps(deps, crossChunkDepMode),
    };

    writeMinimalModule(pkgDir, {
      name: chunk.name,
      changes: [planChange],
      scripts,
      tags: remappedTags.filter(t => t.change === chunk.name),
      requires: deps,
      overwrite: true,
    });

    packages.push({ name: chunk.name, dir: pkgRel, dependencies: [...deps] });
  }

  const invariant = { ok: await checkWorkspaceInvariant(sourceDir, outputDir, packages, { pretty, functionDelimiter }) };

  return { ...plan, outputDir, packages, crossChunkDepMode, invariant };
}

/**
 * In 'change' mode, express each cross-chunk dep as a plan cross-reference
 * (`<dep>:<dep>`, since each chunk-module has a single change named after it);
 * in 'control-only' mode the plan carries no deps — the control `requires`
 * governs ordering.
 */
function planChangeDeps(deps: string[], mode: CrossChunkDepMode): string[] {
  if (mode === 'control-only') return [];
  return deps.map(dep => `${dep}:${dep}`);
}

/**
 * Byte-identical gate for a workspace: concatenate every package's deploy
 * script in workspace deploy order, merge it, and compare against the merged
 * original module deploy output. Both go through the same `mergeSqlStatements`
 * pipeline, so equality proves the carve preserved the deployed statements and
 * their order.
 */
async function checkWorkspaceInvariant(
  sourceDir: string,
  outputDir: string,
  packages: RebundlePackage[],
  opts: { pretty: boolean; functionDelimiter: string }
): Promise<boolean> {
  const concatenated = packages
    .map(p => readFileSync(join(outputDir, p.dir, 'deploy', `${p.name}.sql`), 'utf-8'))
    .join('\n');

  const workspaceMerged = await mergeSqlStatements(concatenated, {
    stripTransactions: true,
    pretty: opts.pretty,
    functionDelimiter: opts.functionDelimiter,
  });
  const sourceMerged = await mergeSqlStatements(resolveWithPlan(sourceDir, 'deploy'), {
    stripTransactions: true,
    pretty: opts.pretty,
    functionDelimiter: opts.functionDelimiter,
  });

  return workspaceMerged.sql === sourceMerged.sql;
}
