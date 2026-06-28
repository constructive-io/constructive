import { runMigratedTsScript } from './legacy';
import type { CommandContext } from '../types';

export async function publicLoad(ctx: CommandContext): Promise<void> {
  await runMigratedTsScript(ctx, 'phase2-load.ts');
}
