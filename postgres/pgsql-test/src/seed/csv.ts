// Re-export from pg-seed for backwards compatibility
export {
  exportCsv as exportTableToCsv,
  loadCsv as copyCsvIntoTable,
  loadCsvMap,
  type CsvSeedMap
} from 'pg-seed';

import { loadCsv, type CsvSeedMap } from 'pg-seed';

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
