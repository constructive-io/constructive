import { runShellLegacyScript } from './legacy';
import type { CommandContext } from '../types';

export async function stress(ctx: CommandContext): Promise<void> {
  await runShellLegacyScript(ctx, 'run-stress-suite.sh');
}
