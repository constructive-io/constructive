import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { SeedAdapter, SeedContext } from './types.js';

export function sqlfile(files: string[], basePath?: string): SeedAdapter {
  return {
    async seed(ctx: SeedContext) {
      for (const file of files) {
        const filePath = basePath ? resolve(basePath, file) : file;
        const sql = readFileSync(filePath, 'utf-8');
        await ctx.client.query(sql);
      }
    }
  };
}

export function fn(
  seedFn: (ctx: SeedContext) => Promise<void> | void
): SeedAdapter {
  return {
    seed: seedFn
  };
}

export function compose(adapters: SeedAdapter[]): SeedAdapter {
  return {
    async seed(ctx: SeedContext) {
      for (const adapter of adapters) {
        await adapter.seed(ctx);
      }
    }
  };
}
