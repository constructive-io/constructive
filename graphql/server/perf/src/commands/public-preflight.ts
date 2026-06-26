import { runNodeLegacyScript } from './legacy';
import type { CommandContext } from '../types';

export async function publicPreflight(ctx: CommandContext): Promise<void> {
  await runNodeLegacyScript(ctx, 'phase1-preflight.mjs');
}
