// Re-export from pgsql-seed for backwards compatibility
export { deployPgpm, loadPgpm } from 'pgsql-seed';

import { deployPgpm } from 'pgsql-seed';

import { SeedAdapter, SeedContext } from './types';

export function pgpm(cwd?: string, cache: boolean = false): SeedAdapter {
  return {
    async seed(ctx: SeedContext) {
      await deployPgpm(ctx.config, cwd ?? ctx.connect.cwd, cache);
    }
  };
}
