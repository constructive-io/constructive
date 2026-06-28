import { runMigratedTsScript } from './legacy';
import type { CommandContext } from '../types';

export async function publicPreflight(ctx: CommandContext): Promise<void> {
  await runMigratedTsScript(ctx, 'phase1-preflight.ts');
}
