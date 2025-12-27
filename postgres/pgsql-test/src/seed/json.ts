// Re-export from pgsql-seed for backwards compatibility
export {
  insertJson,
  insertJsonMap,
  type JsonSeedMap
} from 'pgsql-seed';

import { insertJsonMap, type JsonSeedMap } from 'pgsql-seed';

import { SeedAdapter, SeedContext } from './types';

export function json(data: JsonSeedMap): SeedAdapter {
  return {
    async seed(ctx: SeedContext) {
      await insertJsonMap(ctx.pg, data);
    }
  };
}
