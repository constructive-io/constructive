import { runNodeLegacyScript } from './legacy';
import type { CommandContext } from '../types';

export async function sweep(ctx: CommandContext): Promise<void> {
  await runNodeLegacyScript(ctx, 'run-k-sweep.mjs');
}
