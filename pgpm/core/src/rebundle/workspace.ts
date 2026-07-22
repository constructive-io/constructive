import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { Change, Tag } from '../files/types';
import { parsePlanFile } from '../files/plan/parser';
import { mergeSqlStatements } from '../packaging/package';
import { resolveWithPlan } from '../resolution/resolve';
import { generateControlContent, generatePlanContent } from '../slice/slice';
import { mergeChunkScript, SCRIPT_DIRS } from './module';
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
 * It reuses `rebundlePlan` for the chunk model, `mergeChunkScript` for the
 * per-chunk merge, and slice's `generatePlanContent`/`generateControlContent`
 * for plan and control emission.
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

  mkdirSync(join(outputDir, 'packages'), { recursive: true });

  const byDeployOrder = [...plan.chunks].sort(
    (a, b) => plan.deployOrder.indexOf(a.name) - plan.deployOrder.indexOf(b.name)
  );

  const packages: RebundlePackage[] = [];

  for (const chunk of byDeployOrder) {
    const pkgRel = join('packages', chunk.name);
    const pkgDir = join(outputDir, pkgRel);
    for (const dir of SCRIPT_DIRS) mkdirSync(join(pkgDir, dir), { recursive: true });

    for (const dir of SCRIPT_DIRS) {
      const script = await mergeChunkScript(sourceDir, chunk, dir, { pretty, functionDelimiter });
      writeFileSync(join(pkgDir, dir, `${chunk.name}.sql`), script);
    }

    // Control-file requires always carry the module-level dependency; in
    // 'change' mode the plan additionally records the fine-grained cross-ref.
    const deps = chunk.dependencies;
    writeFileSync(
      join(pkgDir, `${chunk.name}.control`),
      generateControlContent(chunk.name, new Set(deps))
    );

    const planChange: Change = {
      name: chunk.name,
      dependencies: planChangeDeps(deps, crossChunkDepMode),
    };
    const pkgTags = remappedTags.filter(t => t.change === chunk.name);
    writeFileSync(
      join(pkgDir, 'pgpm.plan'),
      generatePlanContent(chunk.name, [planChange], pkgTags)
    );

    writeFileSync(
      join(pkgDir, 'package.json'),
      JSON.stringify({ name: chunk.name, version: '0.0.1' }, null, 2) + '\n'
    );

    packages.push({ name: chunk.name, dir: pkgRel, dependencies: [...deps] });
  }

  writeWorkspaceManifest(outputDir, plan.project, packages, plan.deployOrder);

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

function writeWorkspaceManifest(
  outputDir: string,
  project: string,
  packages: RebundlePackage[],
  deployOrder: string[]
): void {
  const manifest = {
    project,
    packages: packages.map(p => p.dir),
    rebundle: {
      deployOrder,
      dependencies: Object.fromEntries(packages.map(p => [p.name, p.dependencies])),
    },
  };
  writeFileSync(join(outputDir, 'pgpm-workspace.json'), JSON.stringify(manifest, null, 2) + '\n');
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
