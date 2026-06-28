import { getStringFlag, parseArgs, stripFlags } from '../lib/args';
import { publicLoad } from './public-load';
import { publicPreflight } from './public-preflight';
import type { CommandContext } from '../types';

export async function run(ctx: CommandContext): Promise<void> {
  const parsed = parseArgs(ctx.args);
  const phase = getStringFlag(parsed.flags, '--phase', 'all') || 'all';
  const args = stripFlags(ctx.args, ['--phase']);
  const nextCtx = { ...ctx, args };

  if (phase === 'phase1') {
    await publicPreflight(nextCtx);
    return;
  }

  if (phase === 'phase2') {
    await publicLoad(nextCtx);
    return;
  }

  if (phase !== 'all') {
    throw new Error(`Unknown --phase value: ${phase}`);
  }

  await publicPreflight(nextCtx);
  await publicLoad(nextCtx);
}
