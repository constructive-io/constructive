import { loadCsv, type CsvSeedMap } from 'pgsql-seed';

import { SeedAdapter, SeedContext } from './types';

export function csv(tables: CsvSeedMap): SeedAdapter {
  return {
    async seed(ctx: SeedContext) {
      for (const [table, filePath] of Object.entries(tables)) {
        await loadCsv(ctx.pg, table, filePath);
      }
    }
  };
}
