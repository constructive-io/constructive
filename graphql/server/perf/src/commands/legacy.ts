import path from 'node:path';
import { mapAliases } from '../lib/args';
import { runProcess } from '../lib/process';
import type { CommandContext } from '../types';

export async function runNodeLegacyScript(
  ctx: CommandContext,
  scriptName: string,
  args = ctx.args,
): Promise<void> {
  await runProcess(process.execPath, [path.join(ctx.paths.perfDir, scriptName), ...args], {
    cwd: ctx.paths.repoRoot,
    env: process.env,
    dryRun: ctx.dryRun,
    label: scriptName,
  });
}

export async function runShellLegacyScript(
  ctx: CommandContext,
  scriptName: string,
  args = ctx.args,
): Promise<void> {
  await runProcess('bash', [path.join(ctx.paths.perfDir, scriptName), ...args], {
    cwd: ctx.paths.repoRoot,
    env: process.env,
    dryRun: ctx.dryRun,
    label: scriptName,
  });
}

export function normalizeDurationAlias(args: string[]): string[] {
  return mapAliases(args, {
    '--duration-seconds': '--duration',
    '--idle-seconds': '--idle',
    '--server-port': '--port',
  });
}
