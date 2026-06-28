import path from 'node:path';
import { getStringFlag, parseArgs, parseCsv, stripFlags } from '../lib/args';
import { defaultRunDir } from '../lib/run-dir';
import { e2eMatrix } from './e2e-matrix';
import type { CommandContext } from '../types';

export async function sweep(ctx: CommandContext): Promise<void> {
  const parsed = parseArgs(ctx.args);
  const kValues = parseCsv(getStringFlag(parsed.flags, '--k-values'), ['3', '7'])
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (kValues.length === 0) {
    throw new Error('No valid values found in --k-values');
  }

  const baseRunDir = path.resolve(getStringFlag(parsed.flags, '--run-dir', defaultRunDir('e2e-sweep')) || defaultRunDir('e2e-sweep'));
  const forwardedArgs = stripFlags(ctx.args, ['--k-values', '--k', '--run-dir']);

  for (const k of [...new Set(kValues)]) {
    await e2eMatrix({
      ...ctx,
      args: [...forwardedArgs, '--k', String(k), '--run-dir', path.join(baseRunDir, `k-${k}`)],
    });
  }
}
