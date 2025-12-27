// Re-export from pg-seed for backwards compatibility
export {
  insertJson,
  insertJsonMap,
  type JsonSeedMap
} from 'pg-seed';

import { insertJsonMap, type JsonSeedMap } from 'pg-seed';

import { SeedAdapter, SeedContext } from './types';

export function json(data: JsonSeedMap): SeedAdapter {
  return {
    async seed(ctx: SeedContext) {
      await insertJsonMap(ctx.pg, data);
    }
  };
}
