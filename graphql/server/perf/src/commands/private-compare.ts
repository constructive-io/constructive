import { normalizeDurationAlias, runShellLegacyScript } from './legacy';
import type { CommandContext } from '../types';

export async function privateCompare(ctx: CommandContext): Promise<void> {
  await runShellLegacyScript(ctx, 'run-comparison.sh', normalizeDurationAlias(ctx.args));
}
