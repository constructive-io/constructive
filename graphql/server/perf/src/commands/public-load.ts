import { runNodeLegacyScript } from './legacy';
import type { CommandContext } from '../types';

export async function publicLoad(ctx: CommandContext): Promise<void> {
  await runNodeLegacyScript(ctx, 'phase2-load.mjs');
}
