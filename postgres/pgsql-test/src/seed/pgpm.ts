import { existsSync } from 'fs';
import { deployPgpm } from 'pgsql-seed';

import { SeedAdapter, SeedContext } from './types';

export function pgpm(cwd?: string, cache: boolean = false): SeedAdapter {
  return {
    async seed(ctx: SeedContext) {
      const dir = cwd ?? ctx.connect.cwd;
      if (cwd && !existsSync(cwd)) {
        throw new Error(
          `seed.pgpm: no pgpm module or workspace found at ${cwd} — if this is an ephemeral fixtures workspace, run \`pgpm install\` (e.g. \`pnpm fixtures:install\`) first.`
        );
      }
      await deployPgpm(ctx.config, dir, cache);
    }
  };
}
