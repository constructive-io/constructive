import path from 'node:path';
import { getNumberFlag, getStringFlag, parseArgs } from '../lib/args';
import { withLocalhostNoProxy } from '../lib/config';
import { runProcess } from '../lib/process';
import type { CacheMode, CommandContext } from '../types';

export async function privateBenchmark(ctx: CommandContext): Promise<void> {
  const parsed = parseArgs(ctx.args);
  const mode = (getStringFlag(parsed.flags, '--mode', process.env.MODE || 'new') || 'new') as CacheMode;
  if (mode !== 'old' && mode !== 'new') {
    throw new Error(`Invalid --mode=${mode}; expected old|new`);
  }
  const k = getNumberFlag(parsed.flags, '--k', Number(process.env.K || 30));
  const duration = getNumberFlag(
    parsed.flags,
    '--duration-seconds',
    getNumberFlag(parsed.flags, '--duration', Number(process.env.DURATION || 300)),
  );
  const workers = getNumberFlag(parsed.flags, '--workers', Number(process.env.WORKERS || 8));
  const port = getNumberFlag(
    parsed.flags,
    '--server-port',
    getNumberFlag(parsed.flags, '--port', Number(process.env.SERVER_PORT || 3000)),
  );

  const env = withLocalhostNoProxy({
    ...process.env,
    MODE: mode,
    K: String(k),
    DURATION: String(duration),
    WORKERS: String(workers),
    SERVER_PORT: String(port),
  });

  await runProcess('npx', ['ts-node', path.join(ctx.paths.perfDir, 'e2e-benchmark.ts')], {
    cwd: ctx.paths.serverDir,
    env,
    dryRun: ctx.dryRun,
    label: 'private-benchmark',
  });
}
