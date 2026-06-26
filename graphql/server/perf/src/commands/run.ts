import { runNodeLegacyScript } from './legacy';
import type { CommandContext } from '../types';

export async function run(ctx: CommandContext): Promise<void> {
  await runNodeLegacyScript(ctx, 'run-test-spec.mjs');
}
