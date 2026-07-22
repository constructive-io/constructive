import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import { Change, Tag } from '../files/types';
import { parsePlanFile } from '../files/plan/parser';
import { mergeSqlStatements, packageModule } from '../packaging/package';
import { generatePlanContent } from '../slice/slice';
import { assembleChunkSql, rebundlePlan } from './rebundle';
import { Chunk, RebundleModuleOptions, RebundleModuleResult } from './types';

export const SCRIPT_DIRS = ['deploy', 'revert', 'verify'] as const;
export type ScriptDir = (typeof SCRIPT_DIRS)[number];

/**
 * Wrap a merged chunk body in a single transaction. Deploy/revert commit;
 * verify rolls back (a verify script must leave no trace). The individual
 * member files' own BEGIN/COMMIT were stripped during the merge, so each
 * rebundled chunk deploys as exactly one transaction.
 */
function wrapTransaction(body: string, scriptType: ScriptDir): string {
  const trimmed = body.trim();
  const tail = scriptType === 'verify' ? 'ROLLBACK;' : 'COMMIT;';
  return `BEGIN;\n\n${trimmed}\n\n${tail}\n`;
}

/**
 * Merge one chunk's member scripts (in the correct order per direction) into a
 * single deparsed, single-transaction migration string. Shared by the
 * single-module (`rebundleModule`) and workspace (`rebundleWorkspace`) emitters.
 */
export async function mergeChunkScript(
  sourceDir: string,
  chunk: Chunk,
  scriptType: ScriptDir,
  opts: { pretty?: boolean; functionDelimiter?: string } = {}
): Promise<string> {
  const merged = await mergeSqlStatements(assembleChunkSql(sourceDir, chunk, scriptType), {
    stripTransactions: true,
    pretty: opts.pretty ?? true,
    functionDelimiter: opts.functionDelimiter ?? '$EOFCODE$',
  });
  return wrapTransaction(merged.sql, scriptType);
}

/**
 * Copy any top-level files (control, Makefile, package.json, README, ...) from
 * the source module, excluding the plan and the per-change script directories
 * which are regenerated. The rebundled module stays the same extension — same
 * name, same control `requires` — only its internal change set collapses.
 */
function copyModuleMetadata(sourceDir: string, outputDir: string): void {
  for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    if (entry.isDirectory()) continue;
    if (entry.name === 'pgpm.plan') continue;
    copyFileSync(join(sourceDir, entry.name), join(outputDir, entry.name));
  }
}

/**
 * Materialize a rebundled module: merge each chunk's member scripts into a
 * single deparsed migration (reusing `packageModule`'s merge engine), write the
 * chunk-quotient plan, and verify the result is byte-identical when packaged.
 *
 * Reuses existing plumbing throughout — `rebundlePlan` for the chunk model,
 * `mergeSqlStatements`/`packageModule` for statement merging and the gate,
 * `generatePlanContent` for the chunk plan, and the source control/Makefile
 * verbatim.
 */
export async function rebundleModule(
  sourceDir: string,
  options: RebundleModuleOptions
): Promise<RebundleModuleResult> {
  const { outputDir, overwrite = false, pretty = true, functionDelimiter = '$EOFCODE$', ...strategy } = options;

  if (existsSync(outputDir) && readdirSync(outputDir).length > 0 && !overwrite) {
    throw new Error(`Output directory is not empty: ${outputDir}. Pass overwrite: true to replace.`);
  }

  const plan = rebundlePlan(sourceDir, strategy);

  // Tags anchor on the last member of the chunk that sealed at them; remap each
  // to its chunk name so `deploy --to @tag` still lands on a real change.
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

  mkdirSync(outputDir, { recursive: true });
  for (const dir of SCRIPT_DIRS) mkdirSync(join(outputDir, dir), { recursive: true });
  copyModuleMetadata(sourceDir, outputDir);

  const written: RebundleModuleResult['written'] = [];

  for (const chunk of plan.chunks) {
    const paths = { chunk: chunk.name } as RebundleModuleResult['written'][number];
    for (const dir of SCRIPT_DIRS) {
      const merged = await mergeSqlStatements(assembleChunkSql(sourceDir, chunk, dir), {
        stripTransactions: true,
        pretty,
        functionDelimiter,
      });
      const rel = join(dir, `${chunk.name}.sql`);
      writeFileSync(join(outputDir, rel), wrapTransaction(merged.sql, dir));
      paths[dir] = rel;
    }
    written.push(paths);
  }

  // Chunk-quotient plan: one change per chunk, deps are earlier chunk names.
  const planEntries: Change[] = plan.chunks.map(chunk => ({
    name: chunk.name,
    dependencies: chunk.dependencies,
  }));
  writeFileSync(
    join(outputDir, 'pgpm.plan'),
    generatePlanContent(plan.project, planEntries, remappedTags)
  );

  // Byte-identical gate: packaging the source and the rebundled module must
  // produce the same consolidated extension SQL.
  const sourcePkg = await packageModule(sourceDir, { pretty, functionDelimiter });
  const outputPkg = await packageModule(outputDir, { pretty, functionDelimiter });
  const invariant = {
    ok: sourcePkg.sql === outputPkg.sql,
    sourceDiff: !!sourcePkg.diff,
    outputDiff: !!outputPkg.diff,
  };

  return { ...plan, outputDir, written, invariant };
}
